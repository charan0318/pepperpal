import config from '../config.js';
import logger from '../utils/logger.js';
import { trackAICall } from '../analytics/index.js';

/**
 * OpenRouter API Client
 * Handles communication with OpenRouter for LLM requests.
 * Single model, low temperature, stateless execution.
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * @typedef {Object} ChatMessage
 * @property {'system'|'user'|'assistant'} role
 * @property {string} content
 */

/**
 * @typedef {Object} OpenRouterResponse
 * @property {boolean} success
 * @property {string|null} content - The AI response content
 * @property {string|null} error - Error message if failed
 * @property {Object|null} usage - Token usage stats
 */

/**
 * Make a chat completion request to OpenRouter
 * @param {ChatMessage[]} messages - Array of messages
 * @param {Object} [options] - Optional overrides
 * @param {string} [options.model] - Override model
 * @param {number} [options.maxTokens] - Override max tokens
 * @param {number} [options.temperature] - Override temperature
 * @returns {Promise<OpenRouterResponse>}
 */
export async function chatCompletion(messages, options = {}) {
  const { apiKey, model: defaultModel, temperature: defaultTemp, maxTokens: defaultMaxTokens, timeoutMs } = config.openRouter;

  // Allow option overrides
  const model = options.model || defaultModel;
  const temperature = options.temperature ?? defaultTemp;
  const maxTokens = options.maxTokens || defaultMaxTokens;

  if (!apiKey) {
    logger.error('OpenRouter API key not configured');
    return {
      success: false,
      content: null,
      error: 'AI service not configured',
      usage: null,
    };
  }

  const requestBody = {
    model: model,
    messages: messages,
    temperature: temperature,
    max_tokens: maxTokens,
    // Prevent the model from going off-topic
    top_p: 0.9,
    // Disable reasoning mode for reasoning models - we want direct content output
    // This prevents models from using all tokens for "thinking" and leaving content empty
    reasoning: {
      effort: 'none',
    },
  };

  logger.debug('OpenRouter request', {
    model: model,
    messageCount: messages.length,
    temperature: temperature,
  });

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const requestStartTime = Date.now();

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/peppercoin/pepper-pal',
        'X-Title': 'Pepper Pal',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('OpenRouter API error', {
        status: response.status,
        body: errorBody,
      });

      return {
        success: false,
        content: null,
        error: `API error: ${response.status}`,
        usage: null,
      };
    }

    const data = await response.json();

    // Extract the response content
    const choice = data.choices?.[0];
    let content = choice?.message?.content;

    // Some reasoning models put content in reasoning field when content is empty
    // Check if we got cut off during reasoning (finish_reason: "length")
    if (!content && choice?.finish_reason === 'length') {
      // Model ran out of tokens during reasoning - this is a problem
      logger.warn('Model ran out of tokens during reasoning', {
        model: model,
        reasoning: choice?.message?.reasoning?.substring(0, 100),
      });
      return {
        success: false,
        content: null,
        error: 'Model ran out of tokens - try a simpler question',
        usage: data.usage || null,
      };
    }

    if (!content) {
      logger.warn('OpenRouter returned empty response', { data });
      return {
        success: false,
        content: null,
        error: 'Empty response from AI',
        usage: data.usage || null,
      };
    }

    logger.debug('OpenRouter response received', {
      contentLength: content.length,
      usage: data.usage,
      finishReason: choice.finish_reason,
    });

    // Track successful AI call (non-blocking)
    trackAICall({
      latencyMs: Date.now() - requestStartTime,
      tokensUsed: data.usage?.total_tokens || 0,
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      success: true,
      model: model,
    });

    return {
      success: true,
      content: content.trim(),
      error: null,
      usage: data.usage || null,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    
    // Track failed AI call (non-blocking)
    trackAICall({
      latencyMs: Date.now() - requestStartTime,
      tokensUsed: 0,
      success: false,
      model: model,
      error: err.name === 'AbortError' ? 'timeout' : err.message,
    });

    if (err.name === 'AbortError') {
      logger.error('OpenRouter request timed out', { timeoutMs });
      return {
        success: false,
        content: null,
        error: 'Request timed out',
        usage: null,
      };
    }

    logger.error('OpenRouter request failed', { error: err.message });
    return {
      success: false,
      content: null,
      error: err.message,
      usage: null,
    };
  }
}

/**
 * Check if OpenRouter is configured and ready
 * @returns {boolean}
 */
export function isOpenRouterConfigured() {
  return Boolean(config.openRouter.apiKey);
}

export default {
  chatCompletion,
  isOpenRouterConfigured,
};
