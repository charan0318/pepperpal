/**
 * Pipeline Orchestrator
 * Main entry point for processing messages through the new pipeline
 * 
 * Pipeline Stages:
 * 1. Forbidden Check (pre-AI safety)
 * 2. Classification (intent, complexity, response class)
 * 3. Planning (strategy, char budget)
 * 4. Generation (template/cache/AI)
 * 5. Validation (length enforcement, forbidden patterns)
 * 6. Formatting (HTML for Telegram)
 */

import { classify } from './classifier.js';
import { plan, selectModel } from './planner.js';
import { generate } from './generator.js';
import { validate } from './validator.js';
import { checkForbidden, getRefusal } from '../safety/intentDetector.js';
import { format } from '../delivery/formatter.js';
import { trackQuestion, trackForbidden, trackError } from '../analytics/index.js';
import logger from '../utils/logger.js';

/**
 * Process a message through the full pipeline
 * @param {Object} ctx - Telegraf context
 * @returns {Promise<import('../types/index.js').DeliveryPlan>}
 */
export async function process(ctx) {
  const pipelineId = generatePipelineId();
  const startTime = Date.now();
  
  const messageText = ctx.message?.text || '';
  
  logger.info('Pipeline started', {
    pipelineId,
    messageLength: messageText.length,
    chatType: ctx.chat?.type,
  });
  
  try {
    // Stage 0: Pre-AI Forbidden Check
    const forbiddenCheck = checkForbidden(messageText);
    if (forbiddenCheck.isForbidden) {
      logger.info('Forbidden intent blocked', {
        pipelineId,
        intent: forbiddenCheck.intent,
      });
      
      // Track forbidden intent (non-blocking)
      trackForbidden({
        intent: forbiddenCheck.intent,
        chatId: ctx.chat?.id,
      });
      
      const refusalText = getRefusal(forbiddenCheck.intent);
      return createDeliveryPlan(refusalText, Date.now() - startTime);
    }
    
    // Stage 1: Classification
    const classification = classify(messageText);
    logger.debug('Stage 1 complete: Classification', {
      pipelineId,
      intent: classification.intent,
      complexity: classification.complexity,
      responseClass: classification.responseClass,
    });
    
    // Stage 2: Planning
    const responsePlan = plan(classification);
    logger.debug('Stage 2 complete: Planning', {
      pipelineId,
      strategy: responsePlan.strategy,
      charBudget: responsePlan.charBudget,
    });
    
    // Stage 3: Generation
    const generated = await generate(responsePlan, messageText, classification);
    logger.debug('Stage 3 complete: Generation', {
      pipelineId,
      fromTemplate: generated.fromTemplate,
      fromCache: generated.fromCache,
      length: generated.text?.length,
      generationTimeMs: generated.generationTimeMs,
    });
    
    // Stage 4: Validation
    const validated = validate(generated, responsePlan.charBudget);
    if (!validated.valid) {
      logger.warn('Validation failed, using fallback', {
        pipelineId,
        error: validated.error,
      });
      
      return createDeliveryPlan(
        'I apologize, but I had trouble with that response. Could you rephrase your question?',
        Date.now() - startTime
      );
    }
    logger.debug('Stage 4 complete: Validation', {
      pipelineId,
      wasCompressed: validated.wasCompressed,
      finalLength: validated.text.length,
    });
    
    // Stage 5: Format for Telegram
    // SKIP URL stripping for template responses - they already have verified URLs
    let formatted;
    if (generated.fromTemplate) {
      // Templates are pre-verified, don't strip their URLs
      formatted = validated.text;
      logger.debug('Skipping URL strip for template response');
    } else {
      // AI responses need URL stripping and verified link injection
      formatted = format(validated.text, messageText);
    }
    
    const totalTime = Date.now() - startTime;
    logger.info('Pipeline complete', {
      pipelineId,
      totalTimeMs: totalTime,
      responseClass: classification.responseClass,
      strategy: responsePlan.strategy,
      fromCache: generated.fromCache,
      fromTemplate: generated.fromTemplate,
    });
    
    // Track successful question (non-blocking)
    trackQuestion({
      intent: classification.intent,
      responseClass: classification.responseClass,
      strategy: responsePlan.strategy,
      responseTimeMs: totalTime,
      success: true,
      fromCache: generated.fromCache,
      fromTemplate: generated.fromTemplate,
      chatId: ctx.chat?.id,
    });
    
    return createDeliveryPlan(formatted, totalTime);
    
  } catch (error) {
    logger.error('Pipeline failed', {
      pipelineId,
      error: error.message,
      stack: error.stack,
    });
    
    // Track error (non-blocking)
    trackError({
      errorType: 'pipeline_error',
      message: error.message,
      stage: 'pipeline',
      chatId: ctx.chat?.id,
    });
    
    // Return safe fallback
    return createDeliveryPlan(
      'Sorry, I encountered an issue. Please try again or type /start to restart.',
      Date.now() - startTime
    );
  }
}

/**
 * Create a delivery plan object - simple single message
 * @param {string} message
 * @param {number} processingTimeMs
 * @returns {import('../types/index.js').DeliveryPlan}
 */
function createDeliveryPlan(message, processingTimeMs) {
  return {
    message,          // Single message, no array
    parseMode: null,  // Plain text (URLs auto-clickable in Telegram)
    processingTimeMs,
  };
}

/**
 * Generate unique pipeline ID for tracing
 * @returns {string}
 */
function generatePipelineId() {
  return `p_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Quick check if pipeline is ready for use
 * @returns {boolean}
 */
export function isPipelineReady() {
  // Check knowledge availability - use already imported function
  return true; // Knowledge is checked at startup in bot.js
}

export default { process, isPipelineReady };
