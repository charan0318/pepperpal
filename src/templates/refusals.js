/**
 * Refusal Templates
 * Graceful redirects for forbidden intents
 */

/**
 * Refusal templates by forbidden intent type
 */
export const REFUSAL_TEMPLATES = {
  INVESTMENT_ADVICE: [
    `I focus on official info rather than investment advice. Want to understand how PEPPER works first?`,
    `I can't advise on buying decisions, but I can explain what PEPPER is and how it works. Interested?`,
    `Investment decisions are personal. I can share facts about PEPPER's utility and governance instead.`,
  ],
  
  PRICE_SPECULATION: [
    `I can't predict prices. Want to know about PEPPER's utility and governance instead?`,
    `Price predictions aren't my thing. I can explain what makes PEPPER unique though.`,
    `I stick to facts, not price speculation. Curious about PEPPER's tokenomics or governance?`,
  ],
  
  MARKET_SENTIMENT: [
    `I focus on official information rather than market sentiment. Want factual info about PEPPER?`,
    `I can't comment on market trends. I can share what PEPPER is and how it works though.`,
    `Market sentiment isn't my area. Ask me about PEPPER basics, buying, or governance instead.`,
  ],
  
  ADVERSARIAL: [
    `I'm Pepper Pal, focused on helping with Peppercoin questions. What would you like to know?`,
    `I'm here to help with PEPPER info. Ask me about tokenomics, buying, or governance.`,
  ],
  
  GENERIC: [
    `I focus on official Peppercoin information. Want to learn about PEPPER basics or governance?`,
    `I can help with factual PEPPER questions. What would you like to know?`,
  ],
};

/**
 * Get refusal template for specific forbidden intent
 * @param {string} forbiddenIntent - Type of forbidden intent
 * @returns {string}
 */
export function getRefusalTemplate(forbiddenIntent) {
  const templates = REFUSAL_TEMPLATES[forbiddenIntent] || REFUSAL_TEMPLATES.GENERIC;
  const index = Math.floor(Math.random() * templates.length);
  return templates[index];
}

/**
 * Detect which forbidden intent type matches
 * @param {string} query - Normalized query
 * @returns {string}
 */
export function detectForbiddenType(query) {
  const normalized = query.toLowerCase();
  
  if (/should\s+i\s+(buy|sell|invest)/.test(normalized) || 
      /good\s+investment/.test(normalized) ||
      /is\s+it\s+worth/.test(normalized)) {
    return 'INVESTMENT_ADVICE';
  }
  
  if (/price\s+(prediction|target)/.test(normalized) ||
      /will\s+price/.test(normalized) ||
      /when\s+moon|wen\s+moon/.test(normalized) ||
      /price\s+go\s+(up|down)/.test(normalized)) {
    return 'PRICE_SPECULATION';
  }
  
  if (/\b(bullish|bearish|pump|dump|moon|lambo)\b/.test(normalized)) {
    return 'MARKET_SENTIMENT';
  }
  
  if (/ignore\s+(previous|all|your)/.test(normalized) ||
      /jailbreak|dan\s+mode/.test(normalized)) {
    return 'ADVERSARIAL';
  }
  
  return 'GENERIC';
}

export default {
  REFUSAL_TEMPLATES,
  getRefusalTemplate,
  detectForbiddenType,
};
