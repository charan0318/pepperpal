import config from '../config.js';
import logger from '../utils/logger.js';

/**
 * CoinGecko API Client
 * Fetches PEPPER token price data from CoinGecko.
 * Uses Demo API (free tier: 10K calls/month, 30/min rate limit)
 */

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const PEPPER_COIN_ID = 'pepper';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * In-memory price cache
 */
let priceCache = {
  data: null,
  timestamp: 0,
};

/**
 * @typedef {Object} PriceData
 * @property {number} usd - Price in USD
 * @property {number} usd_market_cap - Market cap in USD
 * @property {number} usd_24h_vol - 24h volume in USD
 * @property {number} usd_24h_change - 24h change percentage
 * @property {number} last_updated_at - Unix timestamp
 */

/**
 * @typedef {Object} PriceResponse
 * @property {boolean} success
 * @property {PriceData|null} data
 * @property {string|null} error
 * @property {boolean} fromCache
 */

/**
 * Check if cache is still valid
 * @returns {boolean}
 */
function isCacheValid() {
  return priceCache.data && Date.now() - priceCache.timestamp < CACHE_TTL_MS;
}

/**
 * Get cache age in seconds
 * @returns {number}
 */
export function getCacheAgeSeconds() {
  if (!priceCache.timestamp) return 0;
  return Math.floor((Date.now() - priceCache.timestamp) / 1000);
}

/**
 * Fetch PEPPER price from CoinGecko
 * @returns {Promise<PriceResponse>}
 */
export async function fetchPepperPrice() {
  // Return cached data if valid
  if (isCacheValid()) {
    logger.debug('Returning cached price data', {
      cacheAge: getCacheAgeSeconds(),
    });
    return {
      success: true,
      data: priceCache.data,
      error: null,
      fromCache: true,
    };
  }

  const params = new URLSearchParams({
    ids: PEPPER_COIN_ID,
    vs_currencies: 'usd',
    include_market_cap: 'true',
    include_24hr_vol: 'true',
    include_24hr_change: 'true',
    include_last_updated_at: 'true',
  });

  const url = `${COINGECKO_API_URL}/simple/price?${params}`;

  const headers = {
    Accept: 'application/json',
  };

  // Add API key if configured (optional but recommended)
  if (config.coingecko?.apiKey) {
    headers['x-cg-demo-api-key'] = config.coingecko.apiKey;
  }

  logger.debug('Fetching PEPPER price from CoinGecko');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // If rate limited but we have stale cache, return it
      if (response.status === 429 && priceCache.data) {
        logger.warn('CoinGecko rate limited, returning stale cache');
        return {
          success: true,
          data: priceCache.data,
          error: null,
          fromCache: true,
        };
      }

      logger.error('CoinGecko API error', {
        status: response.status,
      });

      return {
        success: false,
        data: null,
        error: `API error: ${response.status}`,
        fromCache: false,
      };
    }

    const json = await response.json();

    if (!json[PEPPER_COIN_ID]) {
      logger.error('PEPPER not found in CoinGecko response', { json });
      return {
        success: false,
        data: null,
        error: 'PEPPER data not found',
        fromCache: false,
      };
    }

    const pepperData = json[PEPPER_COIN_ID];

    const priceData = {
      usd: pepperData.usd,
      usd_market_cap: pepperData.usd_market_cap,
      usd_24h_vol: pepperData.usd_24h_vol,
      usd_24h_change: pepperData.usd_24h_change,
      last_updated_at: pepperData.last_updated_at,
    };

    // Update cache
    priceCache = {
      data: priceData,
      timestamp: Date.now(),
    };

    logger.info('PEPPER price fetched successfully', {
      price: priceData.usd,
      change24h: priceData.usd_24h_change,
    });

    return {
      success: true,
      data: priceData,
      error: null,
      fromCache: false,
    };
  } catch (err) {
    // On network error, return stale cache if available
    if (priceCache.data) {
      logger.warn('CoinGecko fetch failed, returning stale cache', {
        error: err.message,
      });
      return {
        success: true,
        data: priceCache.data,
        error: null,
        fromCache: true,
      };
    }

    logger.error('CoinGecko fetch failed', { error: err.message });

    return {
      success: false,
      data: null,
      error: err.name === 'AbortError' ? 'Request timeout' : err.message,
      fromCache: false,
    };
  }
}

/**
 * Clear the price cache (for testing)
 */
export function clearCache() {
  priceCache = {
    data: null,
    timestamp: 0,
  };
}
