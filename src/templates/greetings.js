/**
 * Greeting Templates
 * Zero-AI responses for greeting intents
 */

import { VERIFIED_FACTS } from '../constants.js';

/**
 * Pool of greeting responses
 * Randomly selected to add variety
 */
export const GREETING_TEMPLATES = [
  `Hey there! I'm Pepper Pal, your guide to Peppercoin on Chiliz Chain. What would you like to know?`,
  
  `Hello! Welcome to the PEPPER community. Ask me about buying, governance, or getting started.`,
  
  `Hey! I'm here to help with all things Peppercoin. What can I help you with today?`,
  
  `Hi! I'm Pepper Pal. Curious about PEPPER? I can help with buying, staking, and more.`,
  
  `Welcome! I'm your Peppercoin assistant. Ask me anything about PEPPER on Chiliz Chain.`,
  
  `Hey! Ready to learn about PEPPER? I can explain the basics, help you buy, or guide you through governance.`,
  
  `Hi there! I'm Pepper Pal. Whether you're new or experienced, I'm here to help with Peppercoin questions.`,
  
  `Hello! Looking for info on Peppercoin? I've got you covered. What do you need?`,
];

/**
 * Get a random greeting template
 * @returns {string}
 */
export function getRandomGreeting() {
  const index = Math.floor(Math.random() * GREETING_TEMPLATES.length);
  return GREETING_TEMPLATES[index];
}

/**
 * Get greeting with specific focus based on context
 * @param {string} context - Optional context hint
 * @returns {string}
 */
export function getContextualGreeting(context) {
  // For now, return random. Can add context-aware selection later.
  return getRandomGreeting();
}

export default {
  GREETING_TEMPLATES,
  getRandomGreeting,
  getContextualGreeting,
};
