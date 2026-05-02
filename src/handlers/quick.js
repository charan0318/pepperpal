import logger from '../utils/logger.js';
import config from '../config.js';
import { VERIFIED_FACTS } from '../constants.js';

const CHAIN_ALIASES = {
  chiliz: 'chiliz',
  chz: 'chiliz',
  base: 'base',
  solana: 'solana',
  sol: 'solana',
};

function getChains() {
  return Object.values(VERIFIED_FACTS.CHAINS);
}

function normalizeChainKey(value) {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  return CHAIN_ALIASES[normalized] || null;
}

function getRequestedChain(text) {
  const rawArg = text?.split(/\s+/)[1];
  return normalizeChainKey(rawArg);
}

function formatContractLine(chain) {
  const contractLabel = chain.contractLabel || 'Contract';
  const contractValue = chain.contract || 'Pending verification';

  return chain.verified
    ? `${contractLabel}: \`${contractValue}\``
    : `${contractLabel}: ${contractValue}`;
}

function formatChainHeader(chain) {
  return chain.name;
}

function formatTradePairs(chain) {
  if (!chain.tradingPairs || chain.tradingPairs.length === 0) {
    return '• DEX listings: pending verification';
  }

  return chain.tradingPairs.map((pair) => `• Pair: ${pair}`).join('\n');
}

function formatDexes(chain) {
  if (!chain.dexes || chain.dexes.length === 0) {
    return '• DEX listings: pending verification';
  }

  return chain.dexes
    .map((dex) => `• ${dex.name}: ${dex.url}${chain.tradingPairs?.length ? ` (${chain.tradingPairs.join(', ')})` : ''}`)
    .join('\n');
}

function formatCexes(chain) {
  if (!chain.cexes || chain.cexes.length === 0) {
    return '• CEX listings: pending verification';
  }

  return chain.cexes.map((cex) => `• ${cex.name}: ${cex.url}`).join('\n');
}

function buildContractMessage(chainKey) {
  if (chainKey) {
    const chain = VERIFIED_FACTS.CHAINS[chainKey];
    return [
      `${formatChainHeader(chain)} Contract`,
      '',
      formatContractLine(chain),
      `Explorer: ${chain.explorer}`,
      `RPC: ${chain.rpcUrl}`,
      `Gas token: ${chain.gasToken}`,
    ].join('\n');
  }

  return [
    'PEPPER chain contracts:',
    '',
    ...getChains().map((chain) => [
      `${chain.name}:`,
      formatContractLine(chain),
      `Explorer: ${chain.explorer}`,
      `RPC: ${chain.rpcUrl}`,
      `Gas token: ${chain.gasToken}`,
      '',
    ].join('\n')),
  ].join('\n').trim();
}

function buildBuyMessage(chainKey) {
  if (chainKey) {
    const chain = VERIFIED_FACTS.CHAINS[chainKey];
    return [
      `How to trade PEPPER on ${chain.name}:`,
      '',
      `Gas token: ${chain.gasToken}`,
      formatDexes(chain),
      formatTradePairs(chain),
      '',
      'CEX listings:',
      formatCexes(VERIFIED_FACTS.CHAINS.chiliz),
      '',
      formatContractLine(chain),
    ].join('\n');
  }

  return [
    'How to Buy or Sell PEPPER:',
    '',
    ...getChains().map((chain) => [
      `${chain.name}:`,
      `Gas token: ${chain.gasToken}`,
      formatDexes(chain),
      formatTradePairs(chain),
      `Explorer: ${chain.explorer}`,
      '',
    ].join('\n')),
    'Centralized exchanges:',
    formatCexes(VERIFIED_FACTS.CHAINS.chiliz),
    '',
    formatContractLine(VERIFIED_FACTS.CHAINS.chiliz),
  ].join('\n').trim();
}

function buildExplorerMessage(chainKey) {
  if (chainKey) {
    const chain = VERIFIED_FACTS.CHAINS[chainKey];
    return [
      `${chain.name} Explorer`,
      chain.explorer,
      '',
      formatContractLine(chain),
    ].join('\n');
  }

  return [
    'PEPPER explorers:',
    '',
    ...getChains().map((chain) => `${chain.name}: ${chain.explorer}`),
  ].join('\n');
}

function buildChainMessage(chainKey) {
  if (chainKey) {
    const chain = VERIFIED_FACTS.CHAINS[chainKey];
    return [
      `${chain.name} Network Details`,
      '',
      `Chain ID: ${chain.chainId}`,
      `RPC: ${chain.rpcUrl}`,
      `Explorer: ${chain.explorer}`,
      `Gas token: ${chain.gasToken}`,
      formatContractLine(chain),
      `Bridge: ${chain.bridge}`,
    ].join('\n');
  }

  return [
    'Supported PEPPER chains:',
    '',
    ...getChains().map((chain) => [
      `${chain.name}:`,
      `Chain ID: ${chain.chainId}`,
      `RPC: ${chain.rpcUrl}`,
      `Explorer: ${chain.explorer}`,
      `Gas token: ${chain.gasToken}`,
      formatContractLine(chain),
      `Bridge: ${chain.bridge}`,
      '',
    ].join('\n')),
  ].join('\n').trim();
}

function buildBridgeMessage() {
  return [
    'PEPPER bridge status:',
    '',
    ...getChains().map((chain) => `${chain.name}: ${chain.bridge}`),
    '',
    'If you need a bridge workflow, share the official bridge link and I will wire it in.'
  ].join('\n');
}

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
    const chainKey = getRequestedChain(ctx.message?.text);
    await ctx.reply(
      buildContractMessage(chainKey),
      { parse_mode: 'Markdown' }
    );
    logger.info('Contract command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send contract', { error: err.message });
  }
}

export async function buyHandler(ctx) {
  try {
    const chainKey = getRequestedChain(ctx.message?.text);
    await ctx.reply(
      buildBuyMessage(chainKey),
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
    const chainKey = getRequestedChain(ctx.message?.text);
    await ctx.reply(
      buildExplorerMessage(chainKey),
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
    logger.info('Explorer command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send explorer link', { error: err.message });
  }
}

export async function chainHandler(ctx) {
  try {
    const chainKey = getRequestedChain(ctx.message?.text);
    await ctx.reply(
      buildChainMessage(chainKey),
      { parse_mode: 'Markdown', disable_web_page_preview: true }
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
      '🔍 Explorers: https://chiliscan.com | https://basescan.org | https://solscan.io\n' +
      '💱 DEX: FanX, Kewl, Diviswap\n\n' +
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
      '⚡ Networks: Chiliz Chain, Base, Solana\n' +
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
      '• Kewl: https://kewl.exchange/ (PEPPER/WCHZ)\n' +
      '• Diviswap: https://diviswap.io/ (PEPPER/WCHZ)\n\n' +
      'Base and Solana listings are pending verification.',
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
    logger.info('DEX command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send DEX info', { error: err.message });
  }
}

export async function bridgeHandler(ctx) {
  try {
    await ctx.reply(buildBridgeMessage(), { disable_web_page_preview: true });
    logger.info('Bridge command handled', { userId: ctx.from?.id });
  } catch (err) {
    logger.error('Failed to send bridge info', { error: err.message });
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
  bridgeHandler,
};
