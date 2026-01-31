/**
 * Analytics Event Tracker
 * Logs events to Supabase for metrics and analysis
 */

import { getClient, isEnabled, safeExecute } from './client.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Hash chat ID for privacy (one-way, consistent)
 * @param {string|number} chatId
 * @returns {string}
 */
function hashChatId(chatId) {
  if (!chatId) return 'unknown';
  return crypto.createHash('sha256')
    .update(String(chatId) + (process.env.BOT_TOKEN || 'salt'))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Track a question event through the pipeline
 * @param {Object} data
 * @param {string} data.intent - Classified intent
 * @param {string} data.responseClass - Response class (GREETING, FACTUAL, etc.)
 * @param {string} data.strategy - Generation strategy (template, cache, generate)
 * @param {number} data.responseTimeMs - Total response time in ms
 * @param {boolean} data.success - Whether response was successful
 * @param {boolean} data.fromCache - Whether served from cache
 * @param {boolean} data.fromTemplate - Whether from template
 * @param {string|number} data.chatId - Chat ID (will be hashed)
 * @returns {Promise<void>}
 */
export async function trackQuestion(data) {
  await safeExecute(async () => {
    const client = getClient();
    if (!client) return;
    
    const { error } = await client.from('metrics_events').insert({
      event_type: 'question',
      intent: data.intent || 'unknown',
      response_time_ms: data.responseTimeMs || 0,
      success: data.success !== false,
      chat_id: hashChatId(data.chatId),
      metadata: {
        responseClass: data.responseClass,
        strategy: data.strategy,
        fromCache: data.fromCache || false,
        fromTemplate: data.fromTemplate || false,
      },
    });
    
    if (error) {
      logger.debug('Failed to track question', { error: error.message });
    }
  });
}

/**
 * Track a command execution
 * @param {Object} data
 * @param {string} data.command - Command name (without /)
 * @param {string|number} data.chatId - Chat ID (will be hashed)
 * @returns {Promise<void>}
 */
export async function trackCommand(data) {
  await safeExecute(async () => {
    const client = getClient();
    if (!client) return;
    
    const { error } = await client.from('metrics_events').insert({
      event_type: 'command',
      intent: data.command,
      success: true,
      chat_id: hashChatId(data.chatId),
      metadata: {},
    });
    
    if (error) {
      logger.debug('Failed to track command', { error: error.message });
    }
  });
}

/**
 * Track an AI API call
 * @param {Object} data
 * @param {number} data.latencyMs - AI call latency
 * @param {number} data.tokensUsed - Total tokens consumed
 * @param {number} data.promptTokens - Prompt tokens
 * @param {number} data.completionTokens - Completion tokens
 * @param {boolean} data.success - Whether call succeeded
 * @param {string} data.model - Model used
 * @param {string} data.error - Error message if failed
 * @returns {Promise<void>}
 */
export async function trackAICall(data) {
  await safeExecute(async () => {
    const client = getClient();
    if (!client) return;
    
    const { error } = await client.from('metrics_events').insert({
      event_type: 'ai_call',
      response_time_ms: data.latencyMs || 0,
      tokens_used: data.tokensUsed || 0,
      success: data.success !== false,
      metadata: {
        model: data.model,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        error: data.error,
      },
    });
    
    if (error) {
      logger.debug('Failed to track AI call', { error: error.message });
    }
  });
}

/**
 * Track an error event
 * @param {Object} data
 * @param {string} data.errorType - Type of error (ai_error, validation_error, etc.)
 * @param {string} data.message - Error message
 * @param {string} data.stage - Pipeline stage where error occurred
 * @param {string|number} data.chatId - Chat ID (will be hashed)
 * @returns {Promise<void>}
 */
export async function trackError(data) {
  await safeExecute(async () => {
    const client = getClient();
    if (!client) return;
    
    const { error } = await client.from('metrics_events').insert({
      event_type: 'error',
      intent: data.errorType || 'unknown_error',
      success: false,
      chat_id: hashChatId(data.chatId),
      metadata: {
        message: data.message,
        stage: data.stage,
      },
    });
    
    if (error) {
      logger.debug('Failed to track error', { error: error.message });
    }
  });
}

/**
 * Track a forbidden intent block
 * @param {Object} data
 * @param {string} data.intent - Forbidden intent type
 * @param {string|number} data.chatId - Chat ID (will be hashed)
 * @returns {Promise<void>}
 */
export async function trackForbidden(data) {
  await safeExecute(async () => {
    const client = getClient();
    if (!client) return;
    
    const { error } = await client.from('metrics_events').insert({
      event_type: 'question',
      intent: 'forbidden_' + (data.intent || 'unknown'),
      success: true, // Successfully blocked
      chat_id: hashChatId(data.chatId),
      metadata: {
        blocked: true,
        forbiddenType: data.intent,
      },
    });
    
    if (error) {
      logger.debug('Failed to track forbidden', { error: error.message });
    }
  });
}

/**
 * Track rate limit hit
 * @param {string|number} chatId
 * @returns {Promise<void>}
 */
export async function trackRateLimit(chatId) {
  await safeExecute(async () => {
    const client = getClient();
    if (!client) return;
    
    const { error } = await client.from('metrics_events').insert({
      event_type: 'error',
      intent: 'rate_limit',
      success: false,
      chat_id: hashChatId(chatId),
      metadata: { reason: 'rate_limited' },
    });
    
    if (error) {
      logger.debug('Failed to track rate limit', { error: error.message });
    }
  });
}

/**
 * Track bot startup event
 * @returns {Promise<void>}
 */
export async function trackBotStart() {
  await safeExecute(async () => {
    const client = getClient();
    if (!client) return;
    
    const { error } = await client.from('metrics_events').insert({
      event_type: 'command',
      intent: 'bot_start',
      success: true,
      metadata: {
        version: process.env.npm_package_version || '2.0.0',
        nodeEnv: process.env.NODE_ENV || 'development',
      },
    });
    
    if (error) {
      logger.debug('Failed to track bot start', { error: error.message });
    }
  });
}

export default {
  trackQuestion,
  trackCommand,
  trackAICall,
  trackError,
  trackForbidden,
  trackRateLimit,
  trackBotStart,
};
