import logger from '../utils/logger.js';
import config from '../config.js';
import { isAdmin } from '../admin/adminCheck.js';
import { getMode } from '../admin/modes.js';
import { getKnowledgeVersion, isKnowledgeAvailable } from '../knowledge/loader.js';
import { getSystemPromptVersion } from '../ai/systemPrompt.js';
import { isOpenRouterConfigured } from '../ai/openrouterClient.js';

/**
 * Handler: /health command (Admin Only)
 * Returns operational status of the bot.
 * No sensitive data exposed.
 */
export async function healthHandler(ctx) {
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

  // Gather health info
  const knowledgeVersion = getKnowledgeVersion();
  const now = new Date().toISOString();

  const status = {
    online: true,
    mode: getMode(),
    knowledge: {
      available: isKnowledgeAvailable(),
      version: knowledgeVersion?.version || 'N/A',
      lastUpdated: knowledgeVersion?.last_updated || 'N/A',
    },
    ai: {
      configured: isOpenRouterConfigured(),
      model: config.openRouter.model,
      systemPromptVersion: getSystemPromptVersion(),
    },
    timestamp: now,
  };

  // Format response
  const knowledgeStatus = status.knowledge.available ? '✅' : '❌';
  const aiStatus = status.ai.configured ? '✅' : '❌';

  const message = `🏥 Pepper Pal Health

Status: ✅ Online
Mode: ${status.mode}

Knowledge:
• Available: ${knowledgeStatus}
• Version: ${status.knowledge.version}
• Updated: ${status.knowledge.lastUpdated}

AI:
• Configured: ${aiStatus}
• Model: ${status.ai.model}
• Prompt Version: ${status.ai.systemPromptVersion}

Timestamp: ${status.timestamp}`;

  try {
    await ctx.reply(message);
    logger.info('Health check performed', { adminId: userId });
  } catch (err) {
    logger.warn('Failed to send health message', { error: err.message });
  }
}

export default healthHandler;
