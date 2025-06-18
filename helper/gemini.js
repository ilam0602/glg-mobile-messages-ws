require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Instantiate the Google Generative AI SDK using your environment variable.
 */
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = {
  genai,
};