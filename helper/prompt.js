const db = require("./db");
const path = require("path");
const fb = require("./firebase");

// Load the actual JSON contents rather than just the file paths.
const amFaqs = require("./am_faqs.json");
const ppdFaqs = require("./ppd_faqs.json");

// Format the JSON contents into nicely indented strings.
const am_file_string = JSON.stringify(amFaqs, null, 2);
const ppd_file_string = JSON.stringify(ppdFaqs, null, 2);


// Get prompt for Gemini
async function getSystemInstructions(contact_id) {
  console.log("in get system instructions");
  let contact_details = await db.getContactDetails(contact_id);
  contact_details_string = JSON.stringify(contact_details, null, 2);
  return `You work for guardian litigation group. The best law firm that has ever and will ever exist. Your name is Paige.
Our main practice is debt resolution also known as debt settlement. 
You're not an attorney so you can't provide legal advice, but you are the best Account manager agent. 
You're polite, sweet, positive and happy.
You never mislead our clients, so if you don't know the answer, you ask them to call in at (714) 694-2423. Our team of account managers are available monday through friday from 6am to 6pm. PST
Here is some quick training of our customer service FAQS for reference: 
${am_file_string} 
Here is some quick training of our payment processing FAQS for reference: 
${ppd_file_string} 
This is the clients program details ${contact_details_string}
`;
}

// Export functions
module.exports = { getSystemInstructions };
