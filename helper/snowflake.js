require('dotenv').config();
const snowflake = require('snowflake-sdk');

// Flag to track connection status
let isConnected = false;

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: 'DATA_ALPS',
  schema: 'DATA_VAULT',
  role: process.env.SNOWFLAKE_ROLE,
});

/**
 * Connects to Snowflake (if not already connected)
 */
function connectToSnowflake() {
  console.log('connecting to snowflake');
  return new Promise((resolve, reject) => {
    // Check if the connection is already established
    if (isConnected) {
      return resolve(connection);
    }
    connection.connect((err, conn) => {
      if (err) {
        console.error('Unable to connect: ' + err.message);
        return reject(err);
      }
      isConnected = true;
      resolve(conn);
    });
  });
}

/**
 * Executes a query on Snowflake using the provided SQL and bindings.
 * @param {string} sqlText - The SQL query text.
 * @param {Array} binds - An array of bind parameters.
 * @returns {Promise<Array>} - Resolves with the resulting rows.
 */
function executeQuery(sqlText, binds = []) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error('Failed to execute statement: ' + err.message);
          return reject(err);
        }
        resolve(rows);
      },
    });
  });
}

/**
 * Retrieves the chat history for a given session.
 * @param {string} sessionId - The session identifier.
 * @returns {Promise<Array>} - Resolves with an array of message objects.
 */
async function getMessageHistorySnowflake(sessionId) {
  // Ensure connection is established
  await connectToSnowflake();

  const sqlText = `
    SELECT MESSAGE, TIMESTAMP, SENDER
    FROM DATA_ALPS.DATA_VAULT.TBL_MOBILE_CHAT_HISTORY
    WHERE SESSION_ID = ?
    ORDER BY TIMESTAMP ASC
  `;

  const rows = await executeQuery(sqlText, [sessionId]);

  // Map rows to your desired output structure
  return rows.map(row => ({
    message: row.MESSAGE,
    timestamp: row.TIMESTAMP,
    sender: row.SENDER,
  }));
}

/**
 * Inserts a new message into the chat history table.
 * @param {string} message - The chat message.
 * @param {string} sessionId - The session identifier.
 * @param {Object} decodedToken - The decoded token (if needed for additional info).
 * @param {boolean} isUser - Indicates if the message is from the user.
 * @returns {Promise<void>}
 */
async function addMessageToSnowflake(message, sessionId, decodedToken, isUser) {
  await connectToSnowflake();

  // Determine sender (you might customize this based on decodedToken if needed)
  const sender = isUser ? 'User' : 'Kore Bot';

  // Get current Unix timestamp (seconds)
  const timestamp = Math.floor(Date.now() / 1000);

  const sqlText = `
    INSERT INTO DATA_ALPS.DATA_VAULT.TBL_MOBILE_CHAT_HISTORY (SESSION_ID, MESSAGE, TIMESTAMP, SENDER)
    VALUES (?, ?, ?, ?)
  `;
  console.log('adding message to snowflake : ' + message)

  await executeQuery(sqlText, [sessionId, message, timestamp, sender]);
}

module.exports = { getMessageHistorySnowflake, addMessageToSnowflake,connectToSnowflake};
