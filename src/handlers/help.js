import logger from '../utils/logger.js';
import config from '../config.js';

/**
 * Handler: /help command
 * Explains how to use Pepper Pal and lists available commands.
 */
export async function helpHandler(ctx) {
  const chatType = ctx.chat?.type;
  const isGroup = chatType === 'group' || chatType === 'supergroup';

  let message = `Pepper Pal - Help

Commands:
/start - Welcome message and overview
/help - This help message
/ask [question] - Ask about Peppercoin

Examples:
/ask What is Peppercoin?
/ask How do I buy PEPPER?
/ask What is Pepper Inc?
/ask How do I stake?`;

  if (isGroup) {
    message += `

In groups:
- Use /ask followed by your question
- Or mention @${config.botUsername} with your question`;
  }

  message += `

I can help with:
- Peppercoin basics and how it works
- Buying PEPPER and wallet setup
- Pepper Inc governance and staking
- Official links and resources
- Safety tips and scam prevention

I cannot help with:
- Price predictions or trading advice
- Investment decisions
- Wallet troubleshooting

Official Resources:
- Website: peppercoin.com
- Governance: peppercoin.com/pepper-inc
- Twitter: x.com/PepperChain
- Telegram: t.me/officialpeppercoin`;

  try {
    await ctx.reply(message);
    logger.info('Help command handled', {
      userId: ctx.from?.id,
      chatType: chatType,
    });
  } catch (err) {
    logger.error('Failed to send help message', { error: err.message });
  }
}

export default helpHandler;
