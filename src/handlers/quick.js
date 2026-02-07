import logger from '../utils/logger.js';
import config from '../config.js';

/**
 * Quick Commands - Static responses for instant information
 * These bypass AI processing for fast, direct answers
 */

export async function debugHandler(ctx) {
  try {
    await ctx.reply(`Bot Username: ${config.botUsername}\nChat Type: ${ctx.chat?.type}\nMessage: ${ctx.message?.text}`);
    logger.info('Debug command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send debug', { error: err.message });
  }
}

export async function websiteHandler(ctx) {
  try {
    await ctx.reply('https://www.peppercoin.com');
    logger.info('Website command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send website', { error: err.message });
  }
}

export async function contractHandler(ctx) {
  try {
    await ctx.reply(
      'PEPPER Contract Address:\n' +
      '`0x60F397acBCfB8f4e3234C659A3E10867e6fA6b67`\n\n' +
      'Network: Chiliz Chain (88888)',
      { parse_mode: 'Markdown' }
    );
    logger.info('Contract command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send contract', { error: err.message });
  }
}

export async function buyHandler(ctx) {
  try {
    await ctx.reply(
      'How to Buy PEPPER:\n\n' +
      '🟢 Decentralized:\n' +
      '• FanX DEX: https://app.fanx.xyz\n\n' +
      '• Diviswap: https://diviswap.io/\n\n' +
      '🟢 Centralized Exchanges:\n' +
      '• MEXC: https://www.mexc.com\n' +
      '• CoinEx: https://www.coinex.com\n' +
      '• Paribu: https://www.paribu.com\n\n' +
      'Contract: `0x60F397acBCfB8f4e3234C659A3E10867e6fA6b67`',
      { parse_mode: 'Markdown' }
    );
    logger.info('Buy command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send buy info', { error: err.message });
  }
}

export async function stakeHandler(ctx) {
  try {
    await ctx.reply(
      'Staking PEPPER:\n\n' +
      'Stake your PEPPER tokens to earn rewards and participate in governance.\n\n' +
      '📊 Current Stats:\n' +
      '• ~50% of circulating supply staked\n' +
      '• Community-driven governance\n\n' +
      'Learn more: https://www.peppercoin.com/pepper-inc'
    );
    logger.info('Stake command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send stake info', { error: err.message });
  }
}

export async function governanceHandler(ctx) {
  try {
    await ctx.reply(
      'Pepper Inc - Community Governance:\n\n' +
      'Stake PEPPER to vote on proposals and shape the future of Peppercoin.\n\n' +
      '🗳️ https://www.peppercoin.com/pepper-inc'
    );
    logger.info('Governance command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send governance info', { error: err.message });
  }
}

export async function twitterHandler(ctx) {
  try {
    await ctx.reply(' https://x.com/PepperChain');
    logger.info('Twitter command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send twitter link', { error: err.message });
  }
}

export async function telegramHandler(ctx) {
  try {
    await ctx.reply('https://t.me/officialpeppercoin');
    logger.info('Telegram command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send telegram link', { error: err.message });
  }
}

export async function coingeckoHandler(ctx) {
  try {
    await ctx.reply('https://www.coingecko.com/en/coins/pepper');
    logger.info('CoinGecko command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send coingecko link', { error: err.message });
  }
}

export async function explorerHandler(ctx) {
  try {
    await ctx.reply(
      'Chiliz Chain Explorer:\n' +
      'https://chiliscan.com\n\n' +
      'View PEPPER transactions and holder data.'
    );
    logger.info('Explorer command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send explorer link', { error: err.message });
  }
}

export async function chainHandler(ctx) {
  try {
    await ctx.reply(
      'Chiliz Chain Details:\n\n' +
      '• Chain ID: 88888\n' +
      '• RPC: https://rpc.chiliz.com\n' +
      '• Explorer: https://chiliscan.com\n' +
      '• Type: EVM-compatible\n\n' +
      'PEPPER lives on Chiliz Chain.'
    );
    logger.info('Chain command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send chain info', { error: err.message });
  }
}

export async function linksHandler(ctx) {
  try {
    await ctx.reply(
      'Official Peppercoin Links:\n\n' +
      '🌐 Website: https://www.peppercoin.com\n' +
      '🐦 Twitter: https://x.com/PepperChain\n' +
      '💬 Telegram: https://t.me/officialpeppercoin\n' +
      '🗳️ Governance: https://www.peppercoin.com/pepper-inc\n' +
      '🦎 CoinGecko: https://www.coingecko.com/en/coins/pepper\n' +
      '🔍 Explorer: https://chiliscan.com\n' +
      '💱 FanX DEX: https://app.fanx.xyz\n\n' +
      'Contract: `0x60F397acBCfB8f4e3234C659A3E10867e6fA6b67`',
      { parse_mode: 'Markdown' }
    );
    logger.info('Links command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send links', { error: err.message });
  }
}

export async function tokenomicsHandler(ctx) {
  try {
    await ctx.reply(
      'PEPPER Tokenomics:\n\n' +
      '📊 Max Supply: 8,888,888,888,000,000\n' +
      '🔥 Burning: No token burning\n' +
      '⚡ Network: Chiliz Chain (88888)\n' +
      '🔒 Security: Halborn audited\n\n' +
      '~50% of circulating supply is staked in Pepper Inc governance.'
    );
    logger.info('Tokenomics command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send tokenomics', { error: err.message });
  }
}

export async function cexHandler(ctx) {
  try {
    await ctx.reply(
      '🏛 Centralized Exchange Listings:\n\n' +
      '• MEXC: https://www.mexc.com/exchange/PEPPER_USDT\n' +
      '• CoinEx: https://www.coinex.com/en/exchange/PEPPER-USDT\n' +
      '• Bitrue: https://www.bitrue.com/trade/pepper_usdt/\n' +
      '• Cube: https://www.cube.exchange/en/trade/PEPPERUSDT\n' +
      '• Paribu: https://www.paribu.com/markets/pepper_tl',
      { disable_web_page_preview: true }
    );
    logger.info('CEX command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send CEX info', { error: err.message });
  }
}

export async function dexHandler(ctx) {
  try {
    await ctx.reply(
      '🔄 Decentralized Exchange Listings:\n\n' +
      '• FanX Protocol: https://app.fanx.xyz (PEPPER/WCHZ)\n' +
      '• Kewelin: https://kewelin.io/ (PEPPER/WCHZ)\n' +
      '• Diviswap: https://diviswap.io/ (PEPPER/WCHZ)\n\n' +
      'Contract: `0x60F397acBCfB8f4e3234C659A3E10867e6fA6b67`',
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
    logger.info('DEX command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send DEX info', { error: err.message });
  }
}

export default {
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
};
