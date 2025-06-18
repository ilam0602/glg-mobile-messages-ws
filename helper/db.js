require('dotenv').config();
const snowflake = require('snowflake-sdk');

/**
 * Executes a SQL statement against Snowflake and returns the resulting rows.
 * @param {string} sqlStatement - The SQL query to execute.
 * @returns {Promise<Array<Object>>} A promise that resolves with the query result rows.
 */
async function snowflakeGetTable(sqlStatement) {
  const connection = snowflake.createConnection({
    account:   process.env.SNOWFLAKE_ACCOUNT,
    username:  process.env.SNOWFLAKE_USERNAME,
    password:  process.env.SNOWFLAKE_PASSWORD,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    role:      process.env.SNOWFLAKE_ROLE,
    database:  process.env.SNOWFLAKE_DATABASE || 'DATA_ALPS',
    schema:    process.env.SNOWFLAKE_SCHEMA   || 'DATA_VAULT',
  });

  return new Promise((resolve, reject) => {
    connection.connect((connectErr) => {
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
  const sqlStatement = `
    SELECT *
    FROM GUARDIAN_APP.DATA.TBL_AI_AGENT_DATA 
    WHERE CONTACT_ID = ${contactId}
  `;
  try {
    const rows = await snowflakeGetTable(sqlStatement);
    return { data: rows };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  snowflakeGetTable,
  getContactDetails,
};
