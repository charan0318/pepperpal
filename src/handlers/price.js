import logger from '../utils/logger.js';
import { fetchPepperPrice } from '../api/coingeckoClient.js';

/**
 * Format a number as currency with appropriate precision
 * @param {number} value
 * @param {number} decimals
 * @returns {string}
 */
function formatPrice(value) {
  if (!value && value !== 0) return 'N/A';

  // For very small numbers, show more decimals
  if (value < 0.0001) {
    return `$${value.toFixed(12)}`;
  }
  if (value < 1) {
    return `$${value.toFixed(8)}`;
  }
  return `$${value.toFixed(4)}`;
}

/**
 * Format large numbers with K, M, B suffixes
 * @param {number} value
 * @returns {string}
 */
function formatLargeNumber(value) {
  if (!value && value !== 0) return 'N/A';

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Format large supply numbers with commas.
 * @param {number} value
 * @returns {string}
 */
function formatSupply(value) {
  if (!value && value !== 0) return 'N/A';

  return Number(value).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
}

/**
 * Format percentage change with sign
 * @param {number} change
 * @returns {string}
 */
function formatChange(change) {
  if (!change && change !== 0) return 'N/A';

  const sign = change >= 0 ? '+' : '';
  const emoji = change >= 0 ? '📈' : '📉';
  return `${sign}${change.toFixed(2)}% ${emoji}`;
}

/**
 * Format timestamp as HH:MM:SS UTC
 * @param {number} unixTimestamp - Unix timestamp in seconds
 * @returns {string}
 */
function formatTimestamp(unixTimestamp) {
  if (!unixTimestamp) return 'N/A';
  const date = new Date(unixTimestamp * 1000);
  return date.toISOString().slice(11, 19) + ' UTC';
}

/**
 * Handler: /price command
 * Shows live PEPPER token price from CoinGecko
 */
export async function priceHandler(ctx) {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  logger.info('Price command received', { userId, chatId });

  try {
    // Send "typing" indicator for better UX
    await ctx.sendChatAction('typing');

    const result = await fetchPepperPrice();

    if (!result.success || !result.data) {
      await ctx.reply(
        'PEPPER Price 🌶️\n\n' +
          'Price data temporarily unavailable.\n\n' +
          'View on CoinGecko: https://www.coingecko.com/en/coins/pepper'
      );
      logger.warn('Price fetch failed', { error: result.error, userId });
      return;
    }

    const { data, fromCache } = result;
    const timestamp = formatTimestamp(data.last_updated_at);

    // Build response message with emojis as suffixes (using HTML for hyperlink)
    const message =
      'PEPPER Price 🌶️\n\n' +
      `${formatPrice(data.usd)} 💰\n` +
      `24h Change: ${formatChange(data.usd_24h_change)}\n` +
      `7d Change: ${formatChange(data.usd_7d_change)}\n` +
      `30d Change: ${formatChange(data.usd_30d_change)}\n` +
      `Market Cap: ${formatLargeNumber(data.usd_market_cap)} 💎\n` +
      `24h Volume: ${formatLargeNumber(data.usd_24h_vol)} 📊\n\n` +
      `Circulating Supply: ${formatSupply(data.circulating_supply)} PEPPER\n\n` +
      `Use /buy to know where to buy PEPPER.\n\n` +
      `<a href="https://www.coingecko.com/en/coins/pepper">CoinGecko</a> • Updated: ${timestamp}`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    logger.info('Price command handled', {
      userId,
      price: data.usd,
      fromCache,
    });
  } catch (err) {
    logger.error('Price command error', { error: err.message, userId });

    try {
      await ctx.reply(
        'PEPPER Price 🌶️\n\n' +
          'Something went wrong. Please try again.\n\n' +
          'View on CoinGecko: https://www.coingecko.com/en/coins/pepper'
      );
    } catch (replyErr) {
      logger.error('Failed to send error message', { error: replyErr.message });
    }
  }
}

export default priceHandler;
