/**
 * Closing Templates
 * Zero-AI responses for thank you / closing intents
 */

/**
 * Pool of closing responses
 */
export const CLOSING_TEMPLATES = [
  `You're welcome! Feel free to ask if you have more questions about PEPPER.`,
  
  `Happy to help! Come back anytime you need info on Peppercoin.`,
  
  `Anytime! The PEPPER community is here for you.`,
  
  `Glad I could help! Good luck with your PEPPER journey.`,
  
  `No problem! Reach out if you need anything else.`,
];

/**
 * Get a random closing template
 * @returns {string}
 */
export function getRandomClosing() {
  const index = Math.floor(Math.random() * CLOSING_TEMPLATES.length);
  return CLOSING_TEMPLATES[index];
}

export default {
  CLOSING_TEMPLATES,
  getRandomClosing,
};
