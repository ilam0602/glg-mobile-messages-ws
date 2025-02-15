const admin = require("firebase-admin");

require("dotenv").config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Generates a unique key that is not present in the active chats list.
 * @param {Array<string>} activeChats - List of existing active chat keys.
 * @returns {string} A unique key.
 */
async function generateKey(activeChats) {
  const { nanoid } = await import('nanoid');
  let newKey;
  do {
    newKey = nanoid(); // Generate a UUID (universally unique identifier)
  } while (activeChats.includes(newKey)); // Keep generating until it's unique
  return newKey;
}

/**
 * Creates a new chat key and adds it to the user's active chats.
 * @param {Object} token - The user's auth token.
 */
async function createAddNewChatKey(token) {
  try {
    const activeChats = await getActiveChats(token) || []; // Fetch active chats or use an empty array
    const newChatKey = await generateKey(activeChats);
    
    await addChatKey(token, newChatKey); // Add the key to Firestore
    console.log("Generated and added new chat key:", newChatKey);
    return newChatKey;
  } catch (error) {
    console.error("Error generating chat key:", error);
    return '';
  }
}

/**
 * Fetches the active chats for a given user from Firestore.
 * @param {Object} token - The user's auth token.
 * @returns {Promise<Array<string>>} A promise resolving to a list of active chat keys.
 */
async function getActiveChats(token) {
  try {
    // Verify the token and extract the uid
    const uid = token.uid;

    // Access the Firestore document in 'users_test' collection with the matching uid
    const userDoc = await admin
      .firestore()
      .collection("users_test")
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      console.log("No such document!");
      return [];
    } else {
      const userData = userDoc.data();
      return userData["active-chats"] || []; // Ensure it's always an array
    }
  } catch (error) {
    console.error("Error fetching active chats:", error);
    throw error;
  }
}
/**
 * Fetches the contact_id for a given user from Firestore.
 * @param {Object} token - The user's auth token.
 * @returns {Promise<string|null>} A promise resolving to the contact_id or null if not found.
 */
async function getContactId(token) {
  try {
    // Verify the token and extract the uid
    const uid = token.uid;

    // Access the Firestore document in 'users_test' collection with the matching uid
    const userDoc = await admin
      .firestore()
      .collection("users_test")
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      console.log("No such document!");
      return null; // Return null if no document exists
    } else {
      const userData = userDoc.data();
      return userData["contact_id"] || null; // Ensure it always returns a valid value or null
    }
  } catch (error) {
    console.error("Error fetching contact_id:", error);
    throw error;
  }
}

module.exports = { getContactId };


/**
 * Adds a new chat key to the user's active chats in Firestore.
 * @param {Object} token - The user's auth token.
 * @param {string} chatKey - The new chat key to add.
 * @returns {Promise<void>} A promise resolving when the operation is complete.
 */
async function addChatKey(token, chatKey) {
  try {
    const uid = token.uid;
    const userRef = admin.firestore().collection("users_test").doc(uid);

    // Use Firestore arrayUnion to append the key without duplicates
    await userRef.update({
      "active-chats": admin.firestore.FieldValue.arrayUnion(chatKey)
    });

    console.log(`Chat key ${chatKey} added to active-chats for user ${uid}`);
  } catch (error) {
    console.error("Error adding chat key:", error);
    throw error;
  }
}

/**
 * Verifies an ID token with Firebase Auth.
 * @param {string} token - The Firebase authentication token.
 * @returns {Promise<Object>} A promise resolving to the decoded token.
 */
function verifyIdToken(token) {
  return admin.auth().verifyIdToken(token);
}

module.exports = { getActiveChats, createAddNewChatKey, verifyIdToken,getContactId };
