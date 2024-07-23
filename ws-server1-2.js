const { WebClient } = require("@slack/web-api");
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");

require("dotenv").config();

let conversation_id = null;
let archive_id = null;

const connected_clients = new Map();
const client_to_kore = new Map();

const slackClient = new WebClient(process.env.SLACK_TOKEN);
const active_channel_name = process.env.ACTIVE_CHANNEL_NAME;
const archive_channel_name = process.env.ARCHIVE_CHANNEL_NAME;
const koreBotWebhookUrl = process.env.KORE_BOT_WEBHOOK_URL;
const identity = process.env.IDENTITY;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function fetchData(url, options) {
  const fetch = (await import("node-fetch")).default;
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
}

async function getUID(ms_ts) {
  const result = await slackClient.conversations.replies({
    channel: conversation_id,
    ts: ms_ts,
  });
  const curr_messages = result.messages;
  for (let i = 0; i < curr_messages.length; i++) {
    if (curr_messages[i].text.includes("uid:")) {
      return curr_messages[i].text.substring(5, curr_messages[i].text.length);
    }
  }
  return "";
}

// Fetch channel ID
(async () => {
  try {
    const result = await slackClient.conversations.list();
    const channel = result.channels.find(
      (channel) => channel.name === active_channel_name
    );
    if (channel) {
      conversation_id = channel.id;
      console.log(`Found conversation ID: ${conversation_id}`);
    }
  } catch (e) {
    console.error(`Error fetching conversations: ${e}`);
  }
  try {
    const result = await slackClient.conversations.list();
    const channel = result.channels.find(
      (channel) => channel.name === archive_channel_name
    );
    if (channel) {
      archive_id = channel.id;
      console.log(`Found conversation ID: ${archive_id}`);
    }
  } catch (e) {
    console.error(`Error fetching conversations: ${e}`);
  }
})();

const wss = new WebSocket.Server({ port: 8765 });

wss.on("connection", function connection(ws) {
  let ms_ts = null;
  let stored_messages = [];
  let userName = null;
  const bearerToken = jwt.sign(
    {
      sub: identity,
      iss: clientId,
      appId: clientId,
      iat: Math.floor(Date.now() / 1000) - 30, // Issued at time, 30 seconds ago
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // Expiry time, typically 1 hour
      jti: 1234,
    },
    clientSecret
  );
  async function onConnect(ws, token) {
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          new: true,
        },
        message: {
          type: "event",
          val: "ON_CONNECT",
        },
        from: {
          id: identity,
        },
        to: {
          id: "st-9553962c-19e6-5e9c-9a27-7001e994b776",
        },
      }),
    };

    try {
      const data = await fetchData(koreBotWebhookUrl, options);
      const responseMessage = data["data"][0]["val"];
      const sessionId = data["sessionId"];

      ws.send(`From Kore: ${responseMessage}`);

      const result = await slackClient.chat.postMessage({
        channel: conversation_id,
        text: `Kore Session ID: ${sessionId}`,
      });

      ms_ts = result.ts;

      connected_clients.set(ms_ts, ws);
      client_to_kore.set(ms_ts, true);

      ws.send(`Slack ms_ts: ${ms_ts},${sessionId}`);

      await slackClient.chat.postMessage({
        channel: conversation_id,
        thread_ts: ms_ts,
        text: `uid: ${token["uid"]}`,
      });
      await slackClient.chat.postMessage({
        channel: conversation_id,
        thread_ts: ms_ts,
        text: `Kore Bot: ${responseMessage}`,
      });
    } catch (error) {
      console.error("Error during WebSocket handling: ", error);
      // You can send a message back to the client through WebSocket if necessary
      ws.send(JSON.stringify({ error: "An error occurred." }));
    }
  }

  async function receiveMessages() {
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      if (ms_ts !== null) {
        try {
          const result = await slackClient.conversations.replies({
            channel: conversation_id,
            ts: ms_ts,
          });
          const curr_messages = result.messages
            .filter((msg) => msg.user !== "U070GNA54LB")
            .map((msg) => msg);



          if (stored_messages.length !== curr_messages.length) {
            curr_messages
              .slice(stored_messages.length)
              .forEach(async (message) => {
                //TODO SEND MESSAGE TO SPECIFIC CLIENT
                var info = await slackClient.users.info({user:message.user });
                const pfpUrl = info.user['profile']['image_72'];
                if (connected_clients.get(ms_ts) != null) {
                  connected_clients.get(ms_ts).send(`From Slack: ${message.text}`);
                  connected_clients.get(ms_ts).send(`PFP_URL: ${pfpUrl}`);
                }
                stored_messages.push(message);
              });
          }
        } catch (e) {
          console.error(`Error retrieving replies: ${e}`);
        }
      }
    }
  }
  async function sendMessageToSlack(messageText, ms_ts, conversation_id) {
    setTimeout(async () => {
      try {
        // console.log("userName =  ", userName);
        await slackClient.chat.postMessage({
          channel: conversation_id,
          thread_ts: ms_ts,
          // text: `${userName ? userName : 'User'}: ${messageText}`, // Use the converted string here
          text: `User: ${messageText}`, // Use the converted string here
        });
      } catch (e) {
        console.error(`Error posting message: ${e}`);
      }
    }, 500);
  }

  async function sendMessageToKore(message, ms_ts) {
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          type: "text",
          val: message,
        },
        from: {
          id: identity,
        },
        to: {
          id: "st-9553962c-19e6-5e9c-9a27-7001e994b776",
        },
      }),
    };

    try {
      const data = await fetchData(koreBotWebhookUrl, options);
      // console.log("data: ", data);
      // console.log("data[data]: ", data["data"]);
      // console.log("data[data][0][val][text]", data["data"][0]["val"]["text"]);
      let responseMessage =
        typeof data["data"][0]["val"] == "string"
          ? data["data"][0]["val"]
          : data["data"][0]["val"]["text"];

      ws.send(`From Kore: ${responseMessage}`);
      const transferMessage =
        "I'm sorry. I was unable to process your request. I will be transfering you to a live agent. One moment please.";
      if (responseMessage == transferMessage) {
        // console.log("transferring");
        client_to_kore.set(ms_ts, false);
      }
      await slackClient.chat.postMessage({
        channel: conversation_id,
        thread_ts: ms_ts,
        text: `Kore Bot: ${responseMessage}`,
      });
    } catch (error) {
      console.error("Error during WebSocket handling: ", error);
      // You can send a message back to the client through WebSocket if necessary
      ws.send(JSON.stringify({ error: "An error occurred." }));
    }
  }

  async function sendMessage(message, token) {
    const messageText = message.toString();
    // console.log("Received message: ", messageText);
    if (messageText.substring(0, 6) === "ms_ts:") {
      ms_ts = messageText.substring(6, messageText.length);
      connected_clients.set(ms_ts, ws);
      let uidMsTs = await getUID(ms_ts);
      if (uidMsTs != token["uid"]) {
        console.log("uid not matched1111 ms_ts: ", ms_ts);
        ms_ts = null;
        return;
      } else {
        console.log("uid matched ms_ts: ", ms_ts);
      }
      try {
        const result = await slackClient.conversations.replies({
          channel: conversation_id,
          ts: messageText.substring(6, messageText.length),
        });
        const curr_messages = result.messages.map((msg) => msg.text);
        const users = result.messages.map((msg) => msg.user);

        const transferMessage =
          "I'm sorry. I was unable to process your request. I will be transfering you to a live agent. One moment please.";
        var lastMesNotUser = '';
        var userLastMes = '';
        for (let i = 0; i < curr_messages.length; i++) {
          if (connected_clients.get(ms_ts) != null) {
            connected_clients.get(ms_ts).send(`HISTORY: ${curr_messages[i]}`);
          }
          if (curr_messages[i].includes(transferMessage)) {
            console.log("found transfer message");
            client_to_kore.set(ms_ts, false);
          }
          if(!curr_messages[i].includes("User:")){
            lastMesNotUser = curr_messages[i];
            userLastMes = users[i];
          }
        }
        var info = await slackClient.users.info({user: userLastMes});
        const pfpUrl = info.user['profile']['image_72'];

        if (connected_clients.get(ms_ts) != null) {
          connected_clients.get(ms_ts).send(`PFP_URL: ${pfpUrl}`);
          connected_clients.get(ms_ts).send(`HISTORY DONE:`);
        }
        const messages_to_store = result.messages
          .filter((msg) => msg.user !== "U070GNA54LB")
          .map((msg) => msg.text);

        messages_to_store.forEach((message) => {
          stored_messages.push(message);
        });
      } catch (e) {
        console.error(`Error retrieving replies: ${e}`);
      }
    } else if (messageText.substring(0, 11) == "new_thread:") {
      onConnect(ws, token);
    } else if (messageText == "archive:") {
      console.log("closing ticket now: ", ms_ts);
      const result = await slackClient.conversations.replies({
        channel: conversation_id,
        ts: ms_ts,
      });
      const curr_messages = result.messages;
      let ts_delete = [];
      for (let i = 0; i < curr_messages.length; i++) {
        ts_delete.push(curr_messages[i].ts);
      }

      //delete messages on slack channel

      // for (let i = ts_delete.length-1; i >=0; i--) {
      //   await slackClient.chat.delete({
      //     channel: conversation_id,
      //     ts: ts_delete[i],
      //   });
      // }
    } else {
      if (client_to_kore.get(ms_ts) == false) {
        sendMessageToSlack(messageText, ms_ts, conversation_id);
      } else {
        sendMessageToSlack(messageText, ms_ts, conversation_id);
        sendMessageToKore(messageText, ms_ts);
      }
    }
  }

  receiveMessages();
  ws.on("message", async function incoming(message) {
    message = JSON.parse(message);
    // Convert Buffer to string
    token = message["token"];
    const decodedToken = await admin.auth().verifyIdToken(token);

    sendMessage(message["message"], decodedToken);
  });

  ws.on("close", function close() {
    // console.log(connected_clients)
    console.log("Client disconnected");
    connected_clients.delete(ms_ts);
    // console.log(connected_clients);
    ms_ts = null;
    stored_messages = [];
  });
});
