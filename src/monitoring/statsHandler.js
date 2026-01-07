import logger from '../utils/logger.js';
import { isAdmin } from '../admin/adminCheck.js';
import { getStatsString } from './stats.js';

/**
 * Handler: /stats command (Admin Only)
 * Returns aggregate operational metrics.
 * No user-level data, aggregates only.
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

  // Get formatted stats
  const statsMessage = getStatsString();

  try {
    await ctx.reply(statsMessage);
    logger.info('Stats check performed', { adminId: userId });
  } catch (err) {
    logger.warn('Failed to send stats message', { error: err.message });
  }
}

export default statsHandler;
