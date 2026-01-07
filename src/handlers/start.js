import logger from '../utils/logger.js';
import config from '../config.js';

/**
 * Handler: /start command
 * Introduces Pepper Pal with a friendly, helpful tone.
 */
export async function startHandler(ctx) {
  const firstName = ctx.from?.first_name || 'there';

  const message = `Hey ${firstName}! Welcome to Pepper Pal, your community assistant for Peppercoin on Chiliz Chain.

I can help you with:
- How Peppercoin works and how to get started
- Tokenomics and supply information
- Pepper Inc governance and staking
- Finding official resources and links
- Common questions about the community

Quick start:
/ask [your question] - Ask me anything about Peppercoin
/help - See all available commands

Example: /ask how do I buy PEPPER?

Official links:
- Website: peppercoin.com
- Telegram: t.me/officialpeppercoin
- Twitter: x.com/PepperChain

In group chats, mention me with @${config.botUsername} to get my attention.`;

  try {
    await ctx.reply(message);
    logger.info('Start command handled', {
      userId: ctx.from?.id,
      chatType: ctx.chat?.type,
    });
  } catch (err) {
    logger.error('Failed to send start message', { error: err.message });
  }
}

export default startHandler;
