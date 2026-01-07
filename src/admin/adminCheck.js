import config from '../config.js';
import logger from '../utils/logger.js';

/**
 * Check if a user is an admin
 * A user is considered admin if:
 * 1. They are in the ADMIN_USER_IDS allowlist (env-based), OR
 * 2. They are a Telegram admin/creator of the current group
 *
 * @param {object} ctx - Telegraf context
 * @returns {Promise<boolean>}
 */
export async function isAdmin(ctx) {
  const userId = ctx.from?.id;

  if (!userId) {
    return false;
  }

  // Check 1: Allowlist from environment
  if (config.adminUserIds.includes(userId)) {
    logger.debug('User is allowlisted admin', { userId });
    return true;
  }

  // Check 2: Telegram group admin status (only in groups)
  const chat = ctx.chat;
  if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
    try {
      const member = await ctx.telegram.getChatMember(chat.id, userId);
      const adminStatuses = ['administrator', 'creator'];

      if (adminStatuses.includes(member.status)) {
        logger.debug('User is Telegram group admin', {
          userId,
          chatId: chat.id,
          status: member.status,
        });
        return true;
      }
    } catch (err) {
      // Fail closed — if we can't check, assume not admin
      logger.warn('Failed to check Telegram admin status', {
        userId,
        error: err.message,
      });
      return false;
    }
  }

  return false;
}

/**
 * Middleware: Require admin access
 * Blocks non-admin users from proceeding
 */
export function requireAdmin() {
  return async (ctx, next) => {
    const admin = await isAdmin(ctx);

    if (!admin) {
      logger.info('Non-admin attempted admin action', {
        userId: ctx.from?.id,
        username: ctx.from?.username,
      });

      try {
        await ctx.reply('This action is restricted to administrators.');
      } catch (err) {
        logger.warn('Failed to send admin restriction message', {
          error: err.message,
        });
      }

      return; // Stop processing
    }

    return next();
  };
}

export default { isAdmin, requireAdmin };
