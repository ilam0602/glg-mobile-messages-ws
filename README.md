
# WebSocket Server for Flutter Mobile App

This is a WebSocket server that integrates with Slack, Firebase, and Kore Bot to facilitate communication between a Flutter mobile app and various services. The server uses Firebase for authentication, Firestore for user data storage, and Slack for messaging.

## Prerequisites

- Node.js
- NPM (Node Package Manager)
- Firebase project with Firestore and Authentication set up
- Slack workspace and bot token
- Kore Bot API credentials

## Setup

### 1. Clone the Repository

```sh
git clone <repository-url>
cd <repository-directory>
```

### 2. Install Dependencies

```sh
npm install
```

### 3. Environment Variables
Fill in .env.Sample and rename to .env

### 4. Running the Application

```sh
node ws-server.js
```

The server will be available at `ws://localhost:8765`.

## File Structure

```
.
├── ws-server.js
├── package.json
├── package-lock.json
├── .env.Sample
└── README.md
```

## Key Functions

### `fetchData(url, options)`

General function to fetch data from a URL.

### `getUID(ms_ts)`

Gets UID from Slack conversation for authentication.

### `onConnect(ws, token)`

Handles the on connect event with Kore Bot.

### `receiveMessages()`

Receives messages from Slack and forwards them to the WebSocket client.

### `sendMessageToSlack(messageText, ms_ts, conversation_id)`

Sends a message to Slack.

### `sendMessageToKore(message, ms_ts)`

Sends a message to Kore Bot.

### `sendMessage(message, token)`

Handles sending a message to the appropriate destination (Slack or Kore Bot) based on the current state.

## WebSocket Event Handling

- **Connection:** Initializes a new WebSocket connection and sets up necessary variables.
- **Message:** Handles incoming messages from the WebSocket client, verifies Firebase tokens, and routes messages to Slack and/or Kore Bot.
- **Close:** Cleans up when a WebSocket client disconnects.


## Notes

- Ensure the Firebase and Slack API keys are correctly set in the `.env` file.

## License

This project is licensed under the MIT License.

## Contact

If you have any questions, feel free to contact the project maintainer.
