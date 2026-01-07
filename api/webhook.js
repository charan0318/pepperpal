import { Telegraf } from 'telegraf';
import { validateConfig } from '../src/config.js';
import { createBot } from '../src/bot.js';
import { loadKnowledge } from '../src/knowledge/loader.js';
import logger from '../src/utils/logger.js';

/**
 * Pepper Pal — Vercel Webhook Handler
 * 
 * This serverless function handles Telegram webhook updates.
 * It initializes the bot on cold starts and processes incoming updates.
 */

// Singleton bot instance (persists across warm invocations)
let bot = null;
let isInitialized = false;

/**
 * Initialize bot once per serverless instance
 */
function initializeBot() {
  if (isInitialized) {
    return bot;
  }

  try {
    // Validate configuration
    validateConfig();

    // Load knowledge system
    const knowledgeResult = loadKnowledge();
    if (!knowledgeResult.success) {
      logger.warn('Knowledge system failed to load — bot will run in limited mode', {
        errors: knowledgeResult.errors,
      });
    } else {
      logger.info('Knowledge system ready', {
        version: knowledgeResult.version,
        lastUpdated: knowledgeResult.lastUpdated,
      });
    }

    // Create bot instance (without launching)
    bot = createBot();
    isInitialized = true;

    logger.info('Pepper Pal webhook handler initialized', {
      environment: 'production',
      mode: 'webhook',
    });

    return bot;
  } catch (err) {
    logger.error('Failed to initialize bot', { error: err.message, stack: err.stack });
    throw err;
  }
}

/**
 * Vercel serverless function handler
 */
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize bot if needed
    const botInstance = initializeBot();

    // Process the update
    await botInstance.handleUpdate(req.body);

    // Return success
    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('Webhook handler error', {
      error: err.message,
      stack: err.stack,
      body: req.body,
    });

    // Return success to Telegram even on error (prevents retries)
    return res.status(200).json({ ok: true });
  }
}
