const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Define the path to your configuration file.
const CONFIG_FILE = path.join(__dirname, "../config.json");

/**
 * Reads a JSON file and parses its content.
 * @param {string} jsonFile - The path to the JSON file.
 * @returns {Object} The parsed JSON data.
 */
function loadJson(jsonFile) {
  const fileData = fs.readFileSync(jsonFile, "utf8");
  return JSON.parse(fileData);
}

// Load credentials
const creds = loadJson(CONFIG_FILE);

// Configure the Google Generative AI SDK
const genai = new GoogleGenerativeAI(creds["gemini_api_key"]);

module.exports = {
  loadJson,
  genai,
};
