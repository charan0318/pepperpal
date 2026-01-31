/**
 * Supabase Analytics Client
 * Handles connection to Supabase for metrics storage
 */

import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';
import config from '../config.js';

let supabaseClient = null;
let analyticsEnabled = false;

/**
 * Initialize Supabase client
 * @returns {Object|null} Supabase client or null if not configured
 */
export function initAnalytics() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    logger.warn('Analytics disabled: SUPABASE_URL or SUPABASE_ANON_KEY not set');
    analyticsEnabled = false;
    return null;
  }
  
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    analyticsEnabled = process.env.ANALYTICS_ENABLED !== 'false';
    
    if (analyticsEnabled) {
      logger.info('Analytics initialized', { url: supabaseUrl.substring(0, 30) + '...' });
    } else {
      logger.info('Analytics client ready but disabled via ANALYTICS_ENABLED=false');
    }
    
    return supabaseClient;
  } catch (error) {
    logger.error('Failed to initialize analytics', { error: error.message });
    analyticsEnabled = false;
    return null;
  }
}

/**
 * Get the Supabase client
 * @returns {Object|null}
 */
export function getClient() {
  return supabaseClient;
}

/**
 * Check if analytics is enabled and ready
 * @returns {boolean}
 */
export function isEnabled() {
  return analyticsEnabled && supabaseClient !== null;
}

/**
 * Gracefully handle analytics errors without breaking the bot
 * @param {Function} fn - Async function to execute
 * @returns {Promise<any>}
 */
export async function safeExecute(fn) {
  if (!isEnabled()) {
    return null;
  }
  
  try {
    return await fn();
  } catch (error) {
    logger.error('Analytics error (non-blocking)', { error: error.message });
    return null;
  }
}

export default {
  initAnalytics,
  getClient,
  isEnabled,
  safeExecute,
};
