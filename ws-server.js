const WebSocket = require("ws");
const { startNewChat, sendMessageToGemini } = require("./helper/chat.js");
const { needsNewSession,formatHistoryMessage } = require("./helper/general.js");
const { verifyIdToken, createAddNewChatKey,getContactId } = require("./helper/firebase.js");
const {
  getMessageHistorySnowflake,
  addMessageToSnowflake,
  connectToSnowflake,
} = require("./helper/snowflake.js");
const {genai} = require('./helper/gemini.js');
const snowflake = require('snowflake-sdk');

require("dotenv").config();

const connected_clients = new Map();

const sf_connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: 'DATA_ALPS',
  schema: 'DATA_VAULT',
  role: process.env.SNOWFLAKE_ROLE,
});


const wss = new WebSocket.Server({ port: 8082 });

var sessions = new Map();

wss.on("connection", function connection(ws) {
  var newSessionNeeded = false;
  let sid = null;
  console.log("client connected");

  ws.on("message", async function incoming(message) {
    message = JSON.parse(message);
    token = message["token"];
    const decodedToken = await verifyIdToken(token);

    handleMessage(message["message"], decodedToken);
  });

  ws.on("close", function close() {
    console.log("Client disconnected");
    connected_clients.delete(sid);
    sid = null;
    //TODO CLEAN UP SESSIONS 
  });

  async function startChat(ws, decodedToken) {
    try {
      newSessionNeeded = await needsNewSession(decodedToken);
      if (newSessionNeeded) {
        // Start a new session
        await startNewSession(ws, decodedToken);
      }
      else{
        print('continuing session');
      }
    } catch (error) {
      console.error("Error in onConnect:", error);
      ws.send(JSON.stringify({ error: "An error occurred in onConnect." }));
    }
  }

  async function startNewSession(ws, decodedToken) {
    try {
      //create new session from gemini
      let contact_id = await getContactId(decodedToken);
      let newSession = await startNewChat(genai, contact_id);

      //set sessions map with uid as key and session as value
      sessions.set(decodedToken.uid, newSession.startChat(decodedToken));

      //generate new chat key and add to firebase
      sid = await createAddNewChatKey(decodedToken);
      console.log('sid: ' + sid);
      //set 
      connected_clients.set(sid, ws);

      await connected_clients.get(sid).send(`Slack ms_ts: ${(Date.now()/1000).toFixed(0)}, ${sid}`);
    } catch (error) {
      console.error("Error during WebSocket handling: ", error);
      ws.send(JSON.stringify({ error: "An error occurred." + error }));
    }
  }

  async function handleMessage(message, decodedToken) {
    const messageText = message.toString();
    // console.log("Received message: ", messageText);
    const sidSub = "sid:";
    //handle sending history
    if (messageText.substring(0, sidSub.length) === sidSub) {
      //extract sid
      sid = messageText.substring(sidSub.length, messageText.length);
      connected_clients.set(sid, ws);
      try {
        //get message history from snow flake
        const messageHistory = await getMessageHistorySnowflake(sid,sf_connection);
        //send message history to client
        connected_clients.get(sid).send(
          `HISTORY: Kore Session ID: ${sid}`);
        connected_clients.get(sid).send(
          `HISTORY: DATE: ${messageHistory[0]['timestamp']}`);
        
        for(let i = 0 ; i < messageHistory.length; i++){
          console.log(messageHistory[i]);
          message = formatHistoryMessage(messageHistory[i]['sender'],messageHistory[i]['message']);
          connected_clients.get(sid).send(message);
        }
        connected_clients.get(sid).send('HISTORY DONE:');
      } catch (e) {
        console.error(`Error retrieving replies: ${e}`);
      }
    //start chat
    } else if (messageText.substring(0, 11) == "start_chat:") {
      await startChat(ws, decodedToken);
      await sleep(250);
      const introMessage = 'Hello, My name is Paige. How can I help you today?';
      //send intro message to snowflake
      addMessageToSnowflake(introMessage,sid,decodedToken,false,sf_connection)
      connected_clients.get(sid).send('From Slack: ' + introMessage);

    } else {
      //add user message to snowflake
      addMessageToSnowflake(message,sid,decodedToken,true,sf_connection)
      //send message to gemini
      const response = await sendMessageToGemini(
        sessions.get(decodedToken.uid),
        messageText
      );
      //add bot message to snowflake
      addMessageToSnowflake(response,sid,decodedToken,false,sf_connection)

      // console.log('response: ' + response);

      //send bot response to client
      connected_clients.get(sid).send('From Slack: ' + response);
    }
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}