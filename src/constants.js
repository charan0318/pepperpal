/**
 * Centralized Constants for PepperPal
 * All magic numbers and configuration values in one place
 */

// Character budgets by response class (increased for more useful responses)
export const CHAR_BUDGETS = {
  GREETING: 200,
  FACTUAL: 1000,     // Increased - need room for links & info
  PROCEDURAL: 1200,  // Increased - step-by-step needs space
  COMPLEX: 2000,     // Increased - detailed explanations
  REFUSAL: 200,
  CLOSING: 150,
};

// Hard limits (Telegram max is 4096)
export const HARD_CHAR_LIMIT = 3500;  // Increased - Telegram allows 4096
export const SOFT_CHAR_LIMIT = 3000;  // Increased
export const MIN_RESPONSE_LENGTH = 10;
export const MAX_QUERY_LENGTH = 1000;
export const MIN_QUERY_LENGTH = 2;

// Message splitting
export const SPLIT_THRESHOLD = 4096; // Match Telegram max - no splitting needed
export const MAX_MESSAGES_PER_RESPONSE = 1; // Single message preferred
export const MESSAGE_DELAY_MS = 500;

// Telegram limits
export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
export const TELEGRAM_MAX_MSG = 4096;
export const TYPING_INTERVAL_MS = 4000;

// Cache settings
export const CACHE_TTL = {
  FACTS: 3600000,      // 1 hour for factual responses
  STATS: 300000,       // 5 min for stats that may change
  GREETINGS: 86400000, // 24 hours for greetings
};
export const MAX_CACHE_SIZE = 500;

// Complexity thresholds
export const COMPLEXITY_THRESHOLDS = {
  SIMPLE: 3,   // 0-3: use fast model, may use template
  MEDIUM: 6,   // 4-6: use fast model, generate
  COMPLEX: 10, // 7-10: use quality model, may split
};

// Length buckets (query length in chars)
export const LENGTH_BUCKETS = {
  MICRO: 10,   // <10 chars: "hi", "ok", "?"
  SHORT: 50,   // 10-50 chars: "what is pepper"
  MEDIUM: 200, // 50-200 chars: multi-sentence questions
  LONG: 1000,  // 200+: detailed queries
};

// Models - Using non-reasoning instruct models for reliable content output
export const MODELS = {
  FAST: 'liquid/lfm-2.5-1.2b-instruct:free',           // LiquidAI - fast edge model, 33K context
  QUALITY: 'google/gemma-3-4b-it:free',               // Gemma 3 4B - quality model, 33K context
};

// Timeouts
export const TIMEOUTS = {
  AI_REQUEST_MS: 15000,   // 15s max for AI call
  TOTAL_RESPONSE_MS: 20000, // 20s max total
};

// Intent detection keywords
export const INTENT_KEYWORDS = {
  GREETING: ['hi', 'hello', 'hey', 'gm', 'good morning', 'good evening', 'sup', 'yo'],
  CLOSING: ['thanks', 'thank you', 'thx', 'ok', 'okay', 'got it', 'cool', 'bye', 'goodbye'],
  FORBIDDEN_INVESTMENT: ['should i buy', 'should i sell', 'should i invest', 'is it worth', 'good investment'],
  FORBIDDEN_PRICE: ['price prediction', 'price target', 'will price', 'when moon', 'wen moon', 'price go up', 'price go down'],
  FORBIDDEN_SENTIMENT: ['bullish', 'bearish', 'pump', 'dump', 'moon', 'lambo', 'wen lambo'],
  PROCEDURAL: ['how to', 'how do i', 'step by step', 'guide', 'tutorial', 'set up', 'setup'],
};

// Verified factual data (for templates, no AI needed)
export const VERIFIED_FACTS = {
  CONTRACT: '0x60F397acBCfB8f4e3234C659A3E10867e6fA6b67',
  CHAIN_ID: '88888',
  CHAIN_NAME: 'Chiliz Chain',
  WEBSITE: 'https://www.peppercoin.com',
  TELEGRAM: 'https://t.me/officialpeppercoin',
  TWITTER: 'https://x.com/PepperChain',
  DEX: 'https://app.fanx.xyz',
  COINGECKO: 'https://www.coingecko.com/en/coins/pepper',
  TOTAL_SUPPLY: '8,888,888,888,000,000',
  BURNED: '128 trillion',
  AUDITOR: 'Halborn',
};

export default {
  CHAR_BUDGETS,
  HARD_CHAR_LIMIT,
  SOFT_CHAR_LIMIT,
  SPLIT_THRESHOLD,
  CACHE_TTL,
  COMPLEXITY_THRESHOLDS,
  LENGTH_BUCKETS,
  MODELS,
  TIMEOUTS,
  INTENT_KEYWORDS,
  VERIFIED_FACTS,
};
