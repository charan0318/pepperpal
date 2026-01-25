import { Telegraf } from 'telegraf';
import config from './config.js';
import logger from './utils/logger.js';

// Middleware
import { ignoreBots } from './middleware/ignoreBots.js';
import { mentionOnly } from './middleware/mentionOnly.js';
import { rateLimit } from './middleware/rateLimit.js';

// Admin
import { isAdmin } from './admin/adminCheck.js';
import { modeFilter, getMode, setMode, getValidModes } from './admin/modes.js';

// Handlers
import { startHandler } from './handlers/start.js';
import { helpHandler } from './handlers/help.js';
import { pipelineHandler, pipelineAskHandler } from './handlers/pipelineHandler.js';
import {
  debugHandler,
  websiteHandler,
  contractHandler,
  buyHandler,
  stakeHandler,
  governanceHandler,
  twitterHandler,
  telegramHandler,
  coingeckoHandler,
  explorerHandler,
  chainHandler,
  linksHandler,
  tokenomicsHandler,
  cexHandler,
  dexHandler,
} from './handlers/quick.js';

// Knowledge
import {
  refreshKnowledgeHandler,
  knowledgeStatusHandler,
} from './knowledge/refresher.js';

// Monitoring
import { healthHandler } from './monitoring/health.js';
import { statsHandler } from './monitoring/statsHandler.js';
import { recordCommand } from './monitoring/stats.js';

/**
 * Create and configure the Telegraf bot instance
 * @returns {Telegraf}
 */
export function createBot() {
  const bot = new Telegraf(config.botToken);

  // ============================================
  // MIDDLEWARE STACK (order matters!)
  // ============================================

  // 1. Ignore messages from bots (including self)
  bot.use(ignoreBots());

  // 2. Rate limiting (before any processing)
  bot.use(rateLimit());

  // 3. Mode-based filtering (silent/maintenance modes)
  bot.use(modeFilter());

  // 4. Mention-only filter for groups (after mode check)
  bot.use(mentionOnly());

  // 5. Record commands for stats
  bot.use((ctx, next) => {
    if (ctx.message?.text?.startsWith('/')) {
      recordCommand();
    }
    return next();
  });

  // ============================================
  // COMMANDS
  // ============================================

  // /start — Introduction
  bot.command('start', startHandler);

  // /help — Usage instructions
  bot.command('help', helpHandler);

  // /ask — AI-powered question answering
  bot.command('ask', pipelineAskHandler);

  // ============================================
  // QUICK COMMANDS (Static responses)
  // ============================================

  bot.command('debug', debugHandler);
  bot.command('website', websiteHandler);
  bot.command('contract', contractHandler);
  bot.command('buy', buyHandler);
  bot.command('stake', stakeHandler);
  bot.command('governance', governanceHandler);
  bot.command('twitter', twitterHandler);
  bot.command('x', twitterHandler); // Alias for /twitter
  bot.command('telegram', telegramHandler);
  bot.command('coingecko', coingeckoHandler);
  bot.command('explorer', explorerHandler);
  bot.command('chain', chainHandler);
  bot.command('links', linksHandler);
  bot.command('tokenomics', tokenomicsHandler);
  bot.command('cex', cexHandler);
  bot.command('dex', dexHandler);

  // ============================================
  // ADMIN COMMANDS
  // ============================================

  // /health — Admin-only health check (Phase 4)
  bot.command('health', healthHandler);

  // /stats — Admin-only stats (Phase 4)
  bot.command('stats', statsHandler);

  // /mode — Admin-only mode control
  bot.command('mode', async (ctx) => {
    const admin = await isAdmin(ctx);

    if (!admin) {
      try {
        await ctx.reply('This command is restricted to administrators.');
      } catch (err) {
        logger.warn('Failed to send admin restriction message', {
          error: err.message,
        });
      }
      return;
    }

    // Parse command: /mode [newMode]
    const args = ctx.message.text.split(/\s+/).slice(1);
    const newMode = args[0];

    if (!newMode) {
      // No argument — show current mode
      const currentMode = getMode();
      const validModes = getValidModes().join(', ');

      await ctx.reply(
        `Current mode: ${currentMode}\nAvailable modes: ${validModes}\n\nUsage: /mode <mode>`
      );
      return;
    }

    // Attempt to set new mode
    const success = setMode(newMode);

    if (success) {
      await ctx.reply(`Bot mode changed to: ${getMode()}`);
      logger.info('Admin changed bot mode', {
        adminId: ctx.from?.id,
        newMode: getMode(),
      });
    } else {
      const validModes = getValidModes().join(', ');
      await ctx.reply(
        `Invalid mode: ${newMode}\nAvailable modes: ${validModes}`
      );
    }
  });

  // /refresh_knowledge — Admin-only knowledge reload
  bot.command('refresh_knowledge', refreshKnowledgeHandler);

  // /knowledge_status — Admin-only knowledge status check
  bot.command('knowledge_status', knowledgeStatusHandler);

  // ============================================
  // REGISTER COMMANDS WITH TELEGRAM
  // ============================================

  bot.telegram.setMyCommands([
    { command: 'start', description: 'Welcome message' },
    { command: 'help', description: 'Show help and commands' },
    { command: 'ask', description: 'Ask a question about Peppercoin' },
    { command: 'website', description: 'Official website' },
    { command: 'contract', description: 'PEPPER contract address' },
    { command: 'buy', description: 'How to buy PEPPER' },
    { command: 'stake', description: 'Staking information' },
    { command: 'governance', description: 'Pepper Inc governance' },
    { command: 'twitter', description: 'Official Twitter/X' },
    { command: 'telegram', description: 'Official Telegram' },
    { command: 'coingecko', description: 'CoinGecko page' },
    { command: 'explorer', description: 'Chiliz Chain explorer' },
    { command: 'chain', description: 'Chiliz Chain details' },
    { command: 'links', description: 'All official links' },
    { command: 'tokenomics', description: 'Token supply and info' },
  ]).catch(err => {
    logger.error('Failed to set bot commands', { error: err.message });
  });

  // ============================================
  // MESSAGE HANDLER (must be last)
  // ============================================

  // Handle text messages that aren't commands
  bot.on('text', pipelineHandler);

  // ============================================
  // ERROR HANDLING
  // ============================================

  bot.catch((err, ctx) => {
    logger.error('Bot error', {
      error: err.message,
      stack: err.stack,
      updateType: ctx.updateType,
      chatId: ctx.chat?.id,
      userId: ctx.from?.id,
    });

    // Attempt to send a friendly error message
    // Fail silently if this also fails
    ctx
      .reply('Something went wrong. Please try again later.')
      .catch(() => {});
  });

  return bot;
}

export default createBot;
