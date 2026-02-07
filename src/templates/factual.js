/**
 * Factual Templates
 * Pre-built responses for common factual queries
 * Uses verified data only, no AI needed
 */

import { VERIFIED_FACTS } from '../constants.js';

/**
 * Factual templates for exact-match queries
 * Key is normalized query pattern, value is response
 */
export const FACTUAL_TEMPLATES = {
  // Contract address
  'contract': `The official PEPPER contract on Chiliz Chain is:\n${VERIFIED_FACTS.CONTRACT}\n\nAlways verify this before any transaction.`,
  
  'contract address': `The official PEPPER contract on Chiliz Chain is:\n${VERIFIED_FACTS.CONTRACT}\n\nAlways verify this before any transaction.`,
  
  'what is the contract': `The official PEPPER contract on Chiliz Chain is:\n${VERIFIED_FACTS.CONTRACT}`,
  
  // Chain ID
  'chain id': `Chiliz Chain ID is ${VERIFIED_FACTS.CHAIN_ID}. Use this when adding the network to your wallet.`,
  
  'what is the chain id': `Chiliz Chain ID is ${VERIFIED_FACTS.CHAIN_ID}. Use this when adding the network to your wallet.`,
  
  // Website
  'website': `Official website: ${VERIFIED_FACTS.WEBSITE}`,
  
  // Telegram
  'telegram': `Official Telegram: ${VERIFIED_FACTS.TELEGRAM}`,
  
  // Twitter
  'twitter': `Official Twitter: ${VERIFIED_FACTS.TWITTER}`,
  
  // Total supply
  'total supply': `PEPPER total supply is ${VERIFIED_FACTS.TOTAL_SUPPLY} (8.88 quadrillion).`,
  
  'what is the total supply': `PEPPER total supply is ${VERIFIED_FACTS.TOTAL_SUPPLY} (8.88 quadrillion).`,
  
  // Burned
  'burned': `Over ${VERIFIED_FACTS.BURNED} PEPPER has been permanently burned from the total supply.`,
  
  'how much has been burned': `Over ${VERIFIED_FACTS.BURNED} PEPPER has been permanently burned from the total supply.`,
  
  // Audit
  'audited': `Yes, the PEPPER contract is certified by ${VERIFIED_FACTS.AUDITOR}, a reputable blockchain security firm.`,
  
  'is the contract audited': `Yes, the PEPPER contract is certified by ${VERIFIED_FACTS.AUDITOR}, a reputable blockchain security firm.`,
  
  'is it audited': `Yes, the PEPPER contract is certified by ${VERIFIED_FACTS.AUDITOR}, a reputable blockchain security firm.`,
  
  // Exchanges
  'exchanges': `PEPPER is available on:\n- DEX: FanX Protocol (${VERIFIED_FACTS.DEX}), Kewl, Diviswap\n- CEX: MEXC, CoinEx, Bitrue, Cube, Paribu\n\nContract: ${VERIFIED_FACTS.CONTRACT}`,
  
  'where to buy': `Buy PEPPER on:\n- DEX: FanX (${VERIFIED_FACTS.DEX}), Kewl, Diviswap - PEPPER/WCHZ pair\n- CEX: MEXC, CoinEx, Bitrue, Cube, Paribu\n\nAlways verify the contract: ${VERIFIED_FACTS.CONTRACT}`,
  
  'where can i buy': `Buy PEPPER on:\n- DEX: FanX (${VERIFIED_FACTS.DEX}), Kewl, Diviswap - PEPPER/WCHZ pair\n- CEX: MEXC, CoinEx, Bitrue, Cube, Paribu\n\nAlways verify the contract: ${VERIFIED_FACTS.CONTRACT}`,

  // Links - CRITICAL: bypass AI completely to avoid hallucinated URLs
  'links': `Official Peppercoin Links:\n\n🌐 Website: ${VERIFIED_FACTS.WEBSITE}\n🐦 Twitter: ${VERIFIED_FACTS.TWITTER}\n💬 Telegram: ${VERIFIED_FACTS.TELEGRAM}\n📊 CoinGecko: ${VERIFIED_FACTS.COINGECKO}\n🏛️ Governance: ${VERIFIED_FACTS.WEBSITE}/pepper-inc\n💱 FanX DEX: ${VERIFIED_FACTS.DEX}\n🔍 Explorer: https://chiliscan.com\n\n📝 Contract: ${VERIFIED_FACTS.CONTRACT}`,

  'all links': `Official Peppercoin Links:\n\n🌐 Website: ${VERIFIED_FACTS.WEBSITE}\n🐦 Twitter: ${VERIFIED_FACTS.TWITTER}\n💬 Telegram: ${VERIFIED_FACTS.TELEGRAM}\n📊 CoinGecko: ${VERIFIED_FACTS.COINGECKO}\n🏛️ Governance: ${VERIFIED_FACTS.WEBSITE}/pepper-inc\n💱 FanX DEX: ${VERIFIED_FACTS.DEX}\n🔍 Explorer: https://chiliscan.com\n\n📝 Contract: ${VERIFIED_FACTS.CONTRACT}`,

  'all the links': `Official Peppercoin Links:\n\n🌐 Website: ${VERIFIED_FACTS.WEBSITE}\n🐦 Twitter: ${VERIFIED_FACTS.TWITTER}\n💬 Telegram: ${VERIFIED_FACTS.TELEGRAM}\n📊 CoinGecko: ${VERIFIED_FACTS.COINGECKO}\n🏛️ Governance: ${VERIFIED_FACTS.WEBSITE}/pepper-inc\n💱 FanX DEX: ${VERIFIED_FACTS.DEX}\n🔍 Explorer: https://chiliscan.com\n\n📝 Contract: ${VERIFIED_FACTS.CONTRACT}`,

  'official links': `Official Peppercoin Links:\n\n🌐 Website: ${VERIFIED_FACTS.WEBSITE}\n🐦 Twitter: ${VERIFIED_FACTS.TWITTER}\n💬 Telegram: ${VERIFIED_FACTS.TELEGRAM}\n📊 CoinGecko: ${VERIFIED_FACTS.COINGECKO}\n🏛️ Governance: ${VERIFIED_FACTS.WEBSITE}/pepper-inc\n💱 FanX DEX: ${VERIFIED_FACTS.DEX}\n🔍 Explorer: https://chiliscan.com\n\n📝 Contract: ${VERIFIED_FACTS.CONTRACT}`,

  'socials': `Peppercoin Socials:\n\n🐦 Twitter: ${VERIFIED_FACTS.TWITTER}\n💬 Telegram: ${VERIFIED_FACTS.TELEGRAM}\n🌐 Website: ${VERIFIED_FACTS.WEBSITE}`,

  'social links': `Peppercoin Socials:\n\n🐦 Twitter: ${VERIFIED_FACTS.TWITTER}\n💬 Telegram: ${VERIFIED_FACTS.TELEGRAM}\n🌐 Website: ${VERIFIED_FACTS.WEBSITE}`,
};

/**
 * Try to match query to factual template
 * @param {string} query - Normalized query
 * @returns {string|null} Template response or null if no match
 */
export function matchFactualTemplate(query) {
  const normalized = query.toLowerCase().trim();
  
  // Direct match first
  if (FACTUAL_TEMPLATES[normalized]) {
    return FACTUAL_TEMPLATES[normalized];
  }
  
  // Word-boundary partial match (prevent "contract creation" matching "contract")
  // Only match if the key appears as a complete phrase, not as part of a longer word/phrase
  for (const [key, response] of Object.entries(FACTUAL_TEMPLATES)) {
    // Keys that are safe for partial matching (won't cause false positives)
    const safePartialKeys = [
      'links', 'all links', 'all the links', 'official links', 'socials', 'social links',
      'where to buy', 'where can i buy',
      'contract address', 'what is the contract', 'chain id', 'what is the chain id',
      'website', 'telegram', 'twitter', 'total supply', 'what is the total supply',
      'burned', 'how much has been burned', 'audited', 'is the contract audited', 'is it audited',
      'exchanges'
    ];
    
    if (safePartialKeys.includes(key)) {
      // Use word boundary matching for safe keys
      const regex = new RegExp(`\\b${key.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(normalized)) {
        return response;
      }
    }
  }
  
  return null;
}

/**
 * Check if query likely has a factual template
 * @param {string} query
 * @returns {boolean}
 */
export function hasFactualTemplate(query) {
  return matchFactualTemplate(query) !== null;
}

export default {
  FACTUAL_TEMPLATES,
  matchFactualTemplate,
  hasFactualTemplate,
};
