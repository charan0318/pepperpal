import { validateConfig } from './src/config.js';
import { createBot } from './src/bot.js';
import logger from './src/utils/logger.js';
import { loadKnowledge, isKnowledgeAvailable } from './src/knowledge/loader.js';

/**
 * Pepper Pal — Entry Point
 * Phase 1: Telegram bot skeleton with group safety and admin control
 * Phase 2: Static knowledge system integration
 */

async function main() {
  logger.info('Starting Pepper Pal...');

  // Validate configuration before starting
  try {
    validateConfig();
  } catch (err) {
    logger.error('Configuration error', { error: err.message });
    process.exit(1);
  }

  // Load knowledge system at startup
  logger.info('Loading knowledge system...');
  const knowledgeResult = loadKnowledge();

  if (!knowledgeResult.success) {
    logger.warn('Knowledge system failed to load — bot will run in limited mode', {
      errors: knowledgeResult.errors,
    });
    // Bot continues but will refuse knowledge-dependent queries
  } else {
    logger.info('Knowledge system ready', {
      version: knowledgeResult.version,
      lastUpdated: knowledgeResult.lastUpdated,
    });
  }

  // Create bot instance
  const bot = createBot();

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    bot.stop(signal);
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  // Launch the bot
  try {
    await bot.launch();
    logger.info('Pepper Pal is running', {
      mode: 'polling',
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    logger.error('Failed to start bot', { error: err.message });
    process.exit(1);
  }
}

main();
