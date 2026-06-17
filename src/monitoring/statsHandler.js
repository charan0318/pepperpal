import logger from '../utils/logger.js';
import { isAdmin } from '../admin/adminCheck.js';
import { getStatsString } from './stats.js';
import { isEnabled, getTodaySummary, getWeeklySummary } from '../analytics/index.js';

/**
 * Handler: /stats command (Admin Only)
 * Returns aggregate operational metrics.
 * Uses database analytics if available, falls back to in-memory stats.
 */
export async function statsHandler(ctx) {
  const userId = ctx.from?.id;

  // Check admin status
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

  // Use database analytics if available
  if (isEnabled()) {
    try {
      const today = await getTodaySummary();
      const weekly = await getWeeklySummary();
      
      if (today) {
        const message = `📊 Pepper Pal Stats (Database)\n\n` +
          `Today:\n` +
          `• Questions: ${today.questions}\n` +
          `• Commands: ${today.commands}\n` +
          `• Errors: ${today.errors}\n` +
          `• Success Rate: ${today.successRate}%\n` +
          `• Avg Response: ${today.avgResponseTimeMs}ms\n\n` +
          `Week:\n` +
          `• Questions: ${weekly?.totalQuestions || 0}\n` +
          `• Errors: ${weekly?.totalErrors || 0}\n` +
          `• Tokens: ${weekly?.totalTokens || 0}\n\n` +
          `Data persists across restarts.`;
        
        await ctx.reply(message);
        return;
      }
    } catch (err) {
      logger.warn('Database stats failed, falling back to in-memory', { error: err.message });
    }
  }

  // Fallback to in-memory stats
  const statsMessage = getStatsString();

  try {
    await ctx.reply(statsMessage);
    logger.info('Stats check performed', { adminId: userId });
  } catch (err) {
    logger.warn('Failed to send stats message', { error: err.message });
  }
}

export default statsHandler;
