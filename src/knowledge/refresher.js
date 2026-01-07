import logger from '../utils/logger.js';
import { isAdmin } from '../admin/adminCheck.js';
import {
  reloadKnowledge,
  getKnowledgeState,
  getKnowledgeVersion,
} from './loader.js';

/**
 * Handler: /refresh_knowledge command (Admin Only)
 * Reloads knowledge files and re-validates them.
 * Non-admins are blocked from using this command.
 */
export async function refreshKnowledgeHandler(ctx) {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;

  // Check admin status
  const admin = await isAdmin(ctx);

  if (!admin) {
    logger.info('Non-admin attempted knowledge refresh', { userId, username });

    try {
      await ctx.reply('This command is restricted to administrators.');
    } catch (err) {
      logger.warn('Failed to send admin restriction message', {
        error: err.message,
      });
    }
    return;
  }

  // Log admin action
  logger.info('Admin triggered knowledge refresh', { userId, username });

  // Get state before refresh
  const beforeState = getKnowledgeState();

  // Attempt reload
  const result = reloadKnowledge();

  // Build response message
  let message;

  if (result.success) {
    const version = getKnowledgeVersion();
    message = `✅ Knowledge refreshed successfully.

Version: ${version.version}
Last Updated: ${version.last_updated}
Source: ${version.source}
Loaded At: ${getKnowledgeState().loadedAt}`;

    logger.info('Knowledge refresh completed', {
      adminId: userId,
      version: version.version,
    });
  } else {
    message = `❌ Knowledge refresh failed.

Errors:
${result.errors.map((e) => `• ${e}`).join('\n')}

The bot will use previously loaded knowledge if available, or refuse to answer knowledge-dependent queries.`;

    logger.error('Knowledge refresh failed', {
      adminId: userId,
      errors: result.errors,
    });
  }

  try {
    await ctx.reply(message);
  } catch (err) {
    logger.warn('Failed to send refresh result message', {
      error: err.message,
    });
  }
}

/**
 * Handler: /knowledge_status command (Admin Only)
 * Shows current knowledge system status.
 */
export async function knowledgeStatusHandler(ctx) {
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

  const state = getKnowledgeState();
  const version = getKnowledgeVersion();

  let message;

  if (state.valid) {
    message = `📚 Knowledge System Status

Status: ✅ Loaded and Valid
Version: ${version?.version || 'Unknown'}
Last Updated: ${version?.last_updated || 'Unknown'}
Source: ${version?.source || 'Unknown'}
Loaded At: ${state.loadedAt || 'Unknown'}`;
  } else {
    message = `📚 Knowledge System Status

Status: ❌ Unavailable
Loaded: ${state.loaded ? 'Yes' : 'No'}
Valid: ${state.valid ? 'Yes' : 'No'}
Errors: ${state.errorCount}

Use /refresh_knowledge to attempt reload.`;
  }

  try {
    await ctx.reply(message);
  } catch (err) {
    logger.warn('Failed to send knowledge status message', {
      error: err.message,
    });
  }
}

export default { refreshKnowledgeHandler, knowledgeStatusHandler };
