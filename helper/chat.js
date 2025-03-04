const { getSystemInstructions } = require("./prompt.js");

function startNewChat(genai, contact_id) {
  const systemInstruction = getSystemInstructions(contact_id);
  console.log("system instructions:" + systemInstruction);
  return genai.getGenerativeModel({
    model: "gemini-1.5-flash-002",
    systemInstruction: systemInstruction,
  });
}
async function continueChat(genai, contact_id, session_id, history) {
  // Format the conversation history.
  // We assume that messages where sender is "User" are user messages
  // and the rest are from the bot.
  const formattedHistory = history
    .map((msg) => {
      const senderLabel = msg.sender === "User" ? "User" : "Bot";
      return `${senderLabel}: ${msg.message}`;
    })
    .join("\n");

  // Combine the base system instruction with the conversation history.
  // You may want to add a header like "Conversation History:" to separate context.
  const prompt = await getSystemInstructions(contact_id);
  const systemInstruction = `${prompt}
  
Conversation History:
${formattedHistory}`;

  console.log("system instructions:" + systemInstruction);

  // Call getGenerativeModel with the new system instruction.
  // Optionally, if your model supports passing a session id,
  // you could include it as an additional parameter.
  return genai.getGenerativeModel({
    model: "gemini-1.5-flash-002",
    systemInstruction: systemInstruction,
    // If applicable, include session id (this depends on your API design)
    sessionId: session_id,
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
  continueChat,
};
