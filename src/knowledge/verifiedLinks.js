/**
 * Verified Links Registry
 * ONLY these links are safe to use - NEVER trust AI-generated URLs
 */

// All verified official links
export const VERIFIED_LINKS = {
  // Primary
  website: 'https://www.peppercoin.com',
  governance: 'https://www.peppercoin.com/pepper-inc',
  pepperInc: 'https://www.peppercoin.com/pepper-inc',
  staking: 'https://www.peppercoin.com/pepper-inc',
  
  // Social
  twitter: 'https://x.com/PepperChain',
  x: 'https://x.com/PepperChain',
  telegram: 'https://t.me/officialpeppercoin',
  tg: 'https://t.me/officialpeppercoin',
  
  // Trading
  coingecko: 'https://www.coingecko.com/en/coins/pepper',
  cg: 'https://www.coingecko.com/en/coins/pepper',
  fanx: 'https://app.fanx.xyz',
  dex: 'https://app.fanx.xyz',
  
  // Chiliz Ecosystem
  chiliz: 'https://www.chiliz.com',
  explorer: 'https://chiliscan.com',
  chiliscan: 'https://chiliscan.com',
};

// Keywords that trigger specific links
export const LINK_TRIGGERS = {
  website: ['website', 'site', 'homepage', 'main page', 'official site', 'home', 'all links', 'all the links', 'links'],
  twitter: ['twitter', 'x.com', 'tweet', 'x account', 'social', 'all links', 'all the links', 'links'],
  telegram: ['telegram', 'tg', 'chat', 'group', 'community chat', 'all links', 'all the links', 'links'],
  coingecko: ['coingecko', 'cg', 'coin gecko', 'price', 'chart', 'market cap', 'all links', 'all the links', 'links'],
  governance: ['governance', 'pepper inc', 'pepperinc', 'vote', 'voting', 'stake', 'staking', 'dao', 'all links', 'all the links', 'links'],
  fanx: ['fanx', 'dex', 'swap', 'trade', 'buy', 'exchange', 'buy pepper', 'all links', 'all the links', 'links'],
  explorer: ['explorer', 'chiliscan', 'scan', 'contract', 'verify', 'block', 'all links', 'all the links', 'links'],
  chiliz: ['chiliz chain', 'chiliz', 'chz', 'network'],
};

/**
 * Detect which links are relevant based on query
 * @param {string} query - User's question
 * @returns {Object[]} Array of {key, url, label} for relevant links
 */
export function detectRelevantLinks(query) {
  const lowerQuery = query.toLowerCase();
  const relevant = [];
  const seen = new Set();
  
  for (const [key, triggers] of Object.entries(LINK_TRIGGERS)) {
    for (const trigger of triggers) {
      if (lowerQuery.includes(trigger)) {
        const url = VERIFIED_LINKS[key];
        if (url && !seen.has(url)) {
          seen.add(url);
          relevant.push({
            key,
            url,
            label: getLinkLabel(key),
          });
        }
        break; // Only add each link type once
      }
    }
  }
  
  return relevant;
}

/**
 * Get human-readable label for a link
 */
function getLinkLabel(key) {
  const labels = {
    website: 'Official Website',
    twitter: 'Twitter/X',
    telegram: 'Telegram',
    coingecko: 'CoinGecko',
    governance: 'Pepper Inc (Governance)',
    fanx: 'FanX DEX',
    explorer: 'Chiliscan Explorer',
    chiliz: 'Chiliz Chain',
  };
  return labels[key] || key;
}

/**
 * Strip ALL URLs from text (AI-generated URLs are not trustworthy)
 * @param {string} text
 * @returns {string}
 */
export function stripAllUrls(text) {
  // Remove URL patterns - be aggressive but don't break legitimate text
  return text
    // Full URLs (most reliable patterns)
    .replace(/https?:\/\/[^\s<>]+/gi, '')
    .replace(/www\.[a-zA-Z0-9][^\s<>]*/gi, '')
    // Domain patterns (peppercoin.com, app.fanx.xyz, etc) - must have TLD
    .replace(/[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.(com|org|net|io|xyz|me|co|chain|tv|gg|app)[^\s]*/gi, '')
    .replace(/[a-zA-Z0-9_-]+\.(com|org|net|io|xyz|me|co|chain|tv|gg|app)[^\s]*/gi, '')
    // Orphan subdomains ONLY when followed by nothing useful (leftover from stripped URLs)
    // Match "app. " or "www. " at end of sentence or followed by newline
    .replace(/\b(app|www|t|m|api|docs)\.(\s*$|\s*\n)/gim, '$2')
    // @ handles that look like social media (only if followed by platform name or end)
    .replace(/@[a-zA-Z0-9_]+\s*(Telegram|Twitter|X|on\s+X)?\s*(?=\n|$|\.)/gi, '')
    // Clean up leftover artifacts
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/:\s*$/gm, '')
    // Only collapse multiple spaces (not newlines)
    .replace(/[ \t]{2,}/g, ' ')
    // Clean up lines that are now just numbers or bullets
    .replace(/^\d+\.\s*$/gm, '')
    .replace(/^•\s*$/gm, '')
    // Clean empty lines at start/end
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')
    .trim();
}

/**
 * Append verified links to response
 * @param {string} text - Cleaned text (URLs already stripped)
 * @param {Object[]} links - Array of verified links to append
 * @returns {string}
 */
export function appendVerifiedLinks(text, links) {
  if (!links || links.length === 0) return text;
  
  let result = text.trim();
  
  // Add a newline separator
  result += '\n\n';
  
  // Add each link on its own line
  for (const link of links) {
    result += `${link.label}: ${link.url}\n`;
  }
  
  return result.trim();
}

export default {
  VERIFIED_LINKS,
  LINK_TRIGGERS,
  detectRelevantLinks,
  stripAllUrls,
  appendVerifiedLinks,
};
