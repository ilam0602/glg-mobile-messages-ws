const {getMessageHistorySnowflake} = require('./snowflake.js');
const {getActiveChats} = require('./firebase.js')


async function needsNewSession(decodedToken) {
    console.log('in needs new session');
    const activeChats = await getActiveChats(decodedToken);
    if (activeChats.length === 0) {
        return [true,1]; // No active chats, new session needed
    }

    const mostRecentMessageID = activeChats[activeChats.length - 1];
    console.log('most recent message id: ' + mostRecentMessageID);
    const mostRecentMessage =  (await getMessageHistorySnowflake(mostRecentMessageID))[0];
    console.log('most recent message: ' + mostRecentMessage['timestamp'] + ' '+ mostRecentMessage['message']);
    
    if (!mostRecentMessage || !mostRecentMessage["timestamp"]) {
        console.log('no timestamp returning true');
        return [true, 1]; // If there's no timestamp, assume a new session is needed
    }

    const ts = new Date(mostRecentMessage["timestamp"]*1000); // Convert timestamp to Date object
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    console.log('timestamp111: ' + ts);
    console.log('five muntes ago: ' + fiveMinutesAgo);

    return [ts < fiveMinutesAgo, mostRecentMessageID]; // Returns true if ts is older than 5 minutes
}

function formatHistoryMessage(sender,message){
    return `HISTORY: ${sender}: ${message}`;

}

module.exports = {needsNewSession,formatHistoryMessage};