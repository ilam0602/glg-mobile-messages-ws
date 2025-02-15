const {getMessageHistorySnowflake} = require('./snowflake.js');
const {getActiveChats} = require('./firebase.js')


async function needsNewSession(decodedToken) {
    const activeChats = await getActiveChats(decodedToken);
    if (activeChats.length === 0) {
        return true; // No active chats, new session needed
    }

    const mostRecentMessageID = activeChats[activeChats.length - 1];
    const mostRecentMessage = getMessageHistorySnowflake(mostRecentMessageID);
    
    if (!mostRecentMessage || !mostRecentMessage["timestamp"]) {
        return true; // If there's no timestamp, assume a new session is needed
    }

    const ts = new Date(mostRecentMessage["timestamp"]); // Convert timestamp to Date object
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    return ts < fiveMinutesAgo; // Returns true if ts is older than 5 minutes
}

function formatHistoryMessage(sender,message){
    return `HISTORY: ${sender}: ${message}`;

}

module.exports = {needsNewSession,formatHistoryMessage};