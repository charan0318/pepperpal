import logger from '../utils/logger.js';
import { getSystemPrompt, getSystemPromptVersion } from './systemPrompt.js';
import { chatCompletion, isOpenRouterConfigured } from './openrouterClient.js';
import {
  validateResponse,
  sanitizeForTelegram,
  getSafeFallbackMessage,
} from './validator.js';
import {
  isKnowledgeAvailable,
  getKnowledgeContent,
  getKnowledgeUnavailableMessage,
} from '../knowledge/loader.js';
import { recordAIError, recordValidationFailure } from '../monitoring/stats.js';

/**
 * AI Responder Pipeline
 * Orchestrates the flow from user question to validated AI response.
 * Knowledge-bound, stateless, fail-closed.
 */

/**
 * @typedef {Object} AIResponse
 * @property {boolean} success - Whether a response was generated
 * @property {string} message - The response message to send
 * @property {string|null} error - Internal error message (not for users)
 */

/**
 * Generate an AI response to a user question
 * @param {string} userQuestion - The user's question
 * @returns {Promise<AIResponse>}
 */
export async function generateResponse(userQuestion) {
  // Pre-flight checks
  if (!userQuestion || typeof userQuestion !== 'string') {
    return {
      success: false,
      message: 'Please provide a question after the /ask command.',
      error: 'Empty question',
    };
  }

  const trimmedQuestion = userQuestion.trim();

  if (trimmedQuestion.length < 2) {
    return {
      success: false,
      message: 'Please provide a question.',
      error: 'Question too short',
    };
  }

  if (trimmedQuestion.length > 1000) {
    return {
      success: false,
      message: 'Your question is too long. Please keep it under 1000 characters.',
      error: 'Question too long',
    };
  }

  // Check if AI is configured
  if (!isOpenRouterConfigured()) {
    logger.error('AI response requested but OpenRouter not configured');
    return {
      success: false,
      message: 'Pepper Pal is currently unable to answer questions. Please try again later.',
      error: 'OpenRouter not configured',
    };
  }

  // Check if knowledge is available (CRITICAL - never call AI without knowledge)
  if (!isKnowledgeAvailable()) {
    logger.warn('AI response requested but knowledge unavailable');
    return {
      success: false,
      message: getKnowledgeUnavailableMessage(),
      error: 'Knowledge unavailable',
    };
  }

  // Load knowledge content
  const knowledgeContent = getKnowledgeContent();

  if (!knowledgeContent) {
    logger.error('Knowledge reported available but content is null');
    return {
      success: false,
      message: getKnowledgeUnavailableMessage(),
      error: 'Knowledge content null',
    };
  }

  // Build the message array for the AI
  const systemPrompt = getSystemPrompt();

  const messages = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'system',
      content: `## OFFICIAL PEPPERCOIN KNOWLEDGE (Use ONLY this information to answer)\n\n${knowledgeContent}`,
    },
    {
      role: 'user',
      content: trimmedQuestion,
    },
  ];

  logger.info('Generating AI response', {
    questionLength: trimmedQuestion.length,
    systemPromptVersion: getSystemPromptVersion(),
  });

  // Call OpenRouter
  const aiResult = await chatCompletion(messages);

  if (!aiResult.success) {
    recordAIError();
    logger.error('AI generation failed', { error: aiResult.error });
    return {
      success: false,
      message: 'Pepper Pal encountered an issue. Please try again later.',
      error: aiResult.error,
    };
  }

  // Validate the response
  const validation = validateResponse(aiResult.content);

  if (!validation.valid) {
    recordValidationFailure();
    logger.warn('AI response failed validation', {
      reason: validation.reason,
      responsePreview: aiResult.content?.substring(0, 100),
    });
    return {
      success: false,
      message: getSafeFallbackMessage(validation.reason),
      error: `Validation failed: ${validation.reason}`,
    };
  }

  // Sanitize for Telegram
  const finalResponse = sanitizeForTelegram(validation.response);

  logger.info('AI response generated successfully', {
    responseLength: finalResponse.length,
    usage: aiResult.usage,
  });

  return {
    success: true,
    message: finalResponse,
    error: null,
  };
}

/**
 * Check if AI responder is ready to handle requests
 * @returns {Object} Readiness status
 */
export function getResponderStatus() {
  return {
    aiConfigured: isOpenRouterConfigured(),
    knowledgeAvailable: isKnowledgeAvailable(),
    systemPromptVersion: getSystemPromptVersion(),
    ready: isOpenRouterConfigured() && isKnowledgeAvailable(),
  };
}

export default {
  generateResponse,
  getResponderStatus,
};
