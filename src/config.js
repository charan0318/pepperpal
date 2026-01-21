import 'dotenv/config';

/**
 * Configuration loader for Pepper Pal
 * All configuration is loaded from environment variables
 */

const config = {
  // Telegram bot token (required)
  botToken: process.env.BOT_TOKEN,

  // Bot username without @ (required for mention detection)
  botUsername: (process.env.BOT_USERNAME || 'PepperPal').trim(),

  // Admin user IDs (comma-separated Telegram user IDs)
  // These users can control bot modes regardless of group admin status
  adminUserIds: process.env.ADMIN_USER_IDS
    ? process.env.ADMIN_USER_IDS.split(',').map((id) => parseInt(id.trim(), 10))
    : [],

  // Rate limiting
  rateLimit: {
    // Max messages per user within the window
    maxMessages: parseInt(process.env.RATE_LIMIT_MAX || '5', 10),
    // Time window in seconds
    windowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW || '60', 10),
  },

  // OpenRouter AI configuration
  openRouter: {
    // API key (required for AI features)
    apiKey: process.env.OPENROUTER_API_KEY,
    // Model to use (default: best free model - Xiaomi MiMo V2 Flash)
    model: process.env.OPENROUTER_MODEL || 'xiaomi/mimo-v2-flash:free',
    // Temperature (low for deterministic responses)
    temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE || '0.1'),
    // Max tokens for response
    maxTokens: parseInt(process.env.OPENROUTER_MAX_TOKENS || '500', 10),
    // Request timeout in milliseconds
    timeoutMs: parseInt(process.env.OPENROUTER_TIMEOUT_MS || '30000', 10),
  },

  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
};

/**
 * Validate required configuration
 * @throws {Error} if required config is missing
 */
export function validateConfig() {
  if (!config.botToken) {
    throw new Error('BOT_TOKEN environment variable is required');
  }

  if (!config.botUsername) {
    throw new Error('BOT_USERNAME environment variable is required');
  }
}

/**
 * Check if AI features are available
 * @returns {boolean}
 */
export function isAIConfigured() {
  return Boolean(config.openRouter.apiKey);
}

export default config;
