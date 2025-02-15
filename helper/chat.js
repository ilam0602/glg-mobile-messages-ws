const { getSystemInstructions } = require("./prompt.js");

function startNewChat(genai, contact_id) {
  return genai.getGenerativeModel({
    model: "gemini-1.5-flash-002",
    systemInstruction: getSystemInstructions(contact_id),
  });
}

/**
 * Handles the response by extracting the text from its parts.
 * @param {Object} response - The response object.
 * @returns {string} Extracted text or string representation of the response.
 */
function handleResponse(response) {
  try {
    if (response && response.response) {
      // Ensure response is structured correctly
      if (typeof response.response.text === "function") {
        return response.response.text(); // ✅ Extract text correctly
      }

      if (Array.isArray(response.response.candidates)) {
        for (const candidate of response.response.candidates) {
          if (candidate.content && Array.isArray(candidate.content.parts)) {
            for (const part of candidate.content.parts) {
              if (part.text !== undefined) {
                return part.text;
              }
            }
          }
        }
      }
    }

    return String(response); // Default fallback
  } catch (error) {
    console.error("Error in handleResponse:", error);
    return "Error processing response.";
  }
}

async function sendMessageToGemini(session, message) {
  const response = await session.sendMessage(message);

  return handleResponse(response);
}

module.exports = {
  startNewChat,
  sendMessageToGemini,
};
