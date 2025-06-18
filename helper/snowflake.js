require("dotenv").config();
const snowflake = require("snowflake-sdk");
const {
  getContactId,
} = require("./firebase.js");
const { get } = require("request");

/**
 * Creates a new Snowflake connection using your environment variables.
 */
function createNewConnection() {
  return snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: "DATA_ALPS",
    schema: "DATA_VAULT",
    role: process.env.SNOWFLAKE_ROLE,
  });
}

/**
 * Connects to Snowflake, executes the given SQL query with bind parameters,
 * and then destroys the connection.
 *
 * @param {string} sqlText - The SQL query to execute.
 * @param {Array} binds - An array of bind parameters.
 * @returns {Promise<Array>} - Resolves with the resulting rows.
 */
function connectAndExecute(sqlText, binds = []) {
  return new Promise((resolve, reject) => {
    const connection = createNewConnection();

    connection.connect((err) => {
      if (err) {
        console.error("Unable to connect: " + err.message);
        return reject(err);
      }
      connection.execute({
        sqlText,
        binds,
        complete: (err, stmt, rows) => {
          // Clean up the connection regardless of success or failure
          connection.destroy();

          if (err) {
            console.error("Failed to execute statement: " + err.message);
            return reject(err);
          }
          resolve(rows);
        },
      });
    });
  });
}

/**
 * Retrieves the chat history for a given session from Snowflake.
 *
 * @param {string} sessionId - The session identifier.
 * @returns {Promise<Array>} - Resolves with an array of message objects.
 */
async function getMessageHistorySnowflake(sessionId,token) {
  const sqlText = `
    SELECT MESSAGE, TIMESTAMP, SENDER, CONTACT_ID
    FROM DATA_ALPS.DATA_VAULT.TBL_MOBILE_CHAT_HISTORY
    WHERE SESSION_ID = ?
    ORDER BY TIMESTAMP ASC
  `;
  const rows = await connectAndExecute(sqlText, [sessionId]);
  console.log(`in get message history token: ${token}`);
  const contactIdFb = await getContactId(token);
  const contactIdSf = rows[0]['CONTACT_ID'];
  if(contactIdFb != contactIdSf){
    console.log(`contact id mismatch ${contactIdFb} != ${contactIdSf}`);
    return null;
  }
  return rows.map((row) => ({
    message: row.MESSAGE,
    timestamp: row.TIMESTAMP,
    sender: row.SENDER,
  }));
}

/**
 * Inserts a new message into the chat history table in Snowflake.
 *
 * @param {string} message - The chat message.
 * @param {string} sessionId - The session identifier.
 * @param {Object} decodedToken - The decoded token (for additional info if needed).
 * @param {boolean} isUser - Indicates whether the message is from the user.
 * @returns {Promise<void>}
 */
async function addMessageToSnowflake(message, sessionId, decodedToken, isUser,contact_id) {
  // Determine sender based on the message source
  const sender = isUser ? "User" : "Kore Bot";
  const timestamp = Math.floor(Date.now() / 1000);

  const sqlText = `
    INSERT INTO DATA_ALPS.DATA_VAULT.TBL_MOBILE_CHAT_HISTORY (SESSION_ID, MESSAGE, TIMESTAMP, SENDER, CONTACT_ID)
    VALUES (?, ?, ?, ?, ?)
  `;
  console.log("adding message to snowflake: " + message);
  await connectAndExecute(sqlText, [sessionId, message, timestamp, sender,contact_id]);
}

module.exports = { getMessageHistorySnowflake, addMessageToSnowflake };