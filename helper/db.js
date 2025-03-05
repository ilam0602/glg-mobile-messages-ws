// db.js

const snowflake = require('snowflake-sdk');
const fs = require('fs');
const path = require('path');

// Define the path to your configuration file.
const CONFIG_FILE = path.join(__dirname, '../config.json');

/**
 * Reads a JSON file and parses its content.
 * @param {string} jsonFile - The path to the JSON file.
 * @returns {Object} The parsed JSON data.
 */
function loadJson(jsonFile) {
  const fileData = fs.readFileSync(jsonFile, 'utf8');
  return JSON.parse(fileData);
}

/**
 * Executes a SQL statement against Snowflake and returns the resulting rows.
 * @param {string} sqlStatement - The SQL query to execute.
 * @param {string} [snowflakeInstance='encs'] - The key for which configuration to use.
 * @returns {Promise<Array<Object>>} A promise that resolves with the query result rows.
 */
async function snowflakeGetTable(sqlStatement, snowflakeInstance = 'encs') {
  // Convert instance to lowercase (to match configuration keys).
  const instance = snowflakeInstance.toLowerCase();
  const config = loadJson(CONFIG_FILE);

  // Create a Snowflake connection using credentials from the config file.
  const connection = snowflake.createConnection({
    account: config[`${instance}_snow_account`],
    username: config[`${instance}_snow_username`],
    password: config[`${instance}_snow_password`],
    warehouse: config[`${instance}_snow_warehouse`],
    role: config[`${instance}_snow_role`],
  });

  // Wrap the connection and query execution in a Promise.
  return new Promise((resolve, reject) => {
    connection.connect((connectErr, conn) => {
      if (connectErr) {
        return reject(connectErr);
      }
      connection.execute({
        sqlText: sqlStatement,
        complete: (err, stmt, rows) => {
          if (err) {
            return reject(err);
          }
          resolve(rows);
        },
      });
    });
  });
}

/**
 * Retrieves new contact details from Snowflake for a given contact ID.
 * @param {number|string} contactId - The contact ID to query.
 * @returns {Promise<Object>} A promise that resolves with an object containing the data.
 */
async function getContactDetails(contactId) {
  // Build the SQL statement.
  const sqlStatement = `
    SELECT *
    FROM DATA_ALPS.PUBLIC_ACCESS.VW_GEMINI_DATA
    WHERE CONTACT_ID = ${contactId}
  `;
  try {
    // Execute the query and retrieve rows.
    const rows = await snowflakeGetTable(sqlStatement, 'encs');
    // Return an object that wraps the data similar to the Python structure.
    return { data: rows };
  } catch (error) {
    throw error;
  }
}

// Export the functions so they can be used in other modules.
module.exports = {
  loadJson,
  snowflakeGetTable,
  getContactDetails,
};
