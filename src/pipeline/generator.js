/**
 * Response Generator
 * Generates responses based on ResponsePlan
 * Handles template, cache, and AI generation strategies
 */

import { MODELS, HARD_CHAR_LIMIT, CHAR_BUDGETS } from '../constants.js';
import { selectModel } from './planner.js';
import * as cache from '../cache/responseCache.js';
import { getRandomGreeting } from '../templates/greetings.js';
import { getRandomClosing } from '../templates/closings.js';
import { getRefusalTemplate, detectForbiddenType } from '../templates/refusals.js';
import { matchFactualTemplate } from '../templates/factual.js';
import { chatCompletion } from '../ai/openrouterClient.js';
import { getKnowledgeContent, isKnowledgeAvailable } from '../knowledge/loader.js';
import logger from '../utils/logger.js';

/**
 * Generate response based on plan
 * @param {import('../types/index.js').ResponsePlan} plan
 * @param {string} query - Original user query
 * @param {import('../types/index.js').ClassificationResult} classification
 * @returns {Promise<import('../types/index.js').GeneratedResponse>}
 */
export async function generate(plan, query, classification) {
  const startTime = Date.now();
  
  // Strategy: Template
  if (plan.strategy === 'template') {
    const templateResponse = generateFromTemplate(plan.responseClass, query);
    return {
      text: templateResponse,
      tokensUsed: 0,
      fromCache: false,
      fromTemplate: true,
      generationTimeMs: Date.now() - startTime,
    };
  }
  
  // Strategy: Cache (with fallback to generate)
  if (plan.strategy === 'cache') {
    // Try factual templates first
    const factualMatch = matchFactualTemplate(query);
    if (factualMatch) {
      return {
        text: factualMatch,
        tokensUsed: 0,
        fromCache: false,
        fromTemplate: true,
        generationTimeMs: Date.now() - startTime,
      };
    }
    
    // Try response cache
    const cached = cache.get(query);
    if (cached.hit) {
      return {
        text: cached.response,
        tokensUsed: 0,
        fromCache: true,
        fromTemplate: false,
        generationTimeMs: Date.now() - startTime,
      };
    }
    
    // Fall through to generate
  }
  
  // Strategy: Generate (AI call)
  const aiResponse = await generateFromAI(plan, query, classification);
  
  // Cache successful generations
  if (aiResponse.text && !aiResponse.text.includes('error')) {
    cache.set(query, aiResponse.text);
  }
  
  return {
    ...aiResponse,
    generationTimeMs: Date.now() - startTime,
  };
}

/**
 * Generate response from template pool
 * @param {string} responseClass
 * @param {string} query
 * @returns {string}
 */
function generateFromTemplate(responseClass, query) {
  switch (responseClass) {
    case 'GREETING':
      return getRandomGreeting();
    
    case 'CLOSING':
      return getRandomClosing();
    
    case 'REFUSAL':
      const forbiddenType = detectForbiddenType(query);
      return getRefusalTemplate(forbiddenType);
    
    default:
      // Shouldn't happen, but fallback
      return getRandomGreeting();
  }
}

/**
 * Generate response using AI
 * @param {import('../types/index.js').ResponsePlan} plan
 * @param {string} query
 * @param {import('../types/index.js').ClassificationResult} classification
 * @returns {Promise<import('../types/index.js').GeneratedResponse>}
 */
async function generateFromAI(plan, query, classification) {
  // Check knowledge availability
  if (!isKnowledgeAvailable()) {
    logger.warn('Knowledge unavailable for AI generation');
    return {
      text: 'I am temporarily unable to access my knowledge base. Please try again later.',
      tokensUsed: 0,
      fromCache: false,
      fromTemplate: false,
    };
  }
  
  // Get knowledge content (TODO: use chunker to get only relevant sections)
  const knowledge = getKnowledgeContent();
  
  // Build constrained prompt
  const systemPrompt = buildConstrainedPrompt(plan, classification);
  
  // Select model based on complexity
  const modelKey = selectModel(classification.complexity);
  const model = MODELS[modelKey];
  
  // Give AI enough tokens for complete responses
  // charBudget is in chars, tokens ≈ chars/4 for English
  // Use higher multiplier to prevent mid-sentence cutoffs
  const baseTokens = Math.ceil(plan.charBudget * 0.6);
  const maxTokens = Math.max(600, Math.min(baseTokens, 1500)); // 600-1500 range
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: `KNOWLEDGE:\n${knowledge}` },
    { role: 'user', content: query },
  ];
  
  logger.debug('Calling AI', {
    model,
    maxTokens,
    charBudget: plan.charBudget,
    complexity: classification.complexity,
  });
  
  try {
    const result = await chatCompletion(messages, { model, maxTokens });
    
    if (!result.success) {
      logger.error('AI generation failed', { error: result.error });
      return {
        text: 'I encountered an issue generating a response. Please try again.',
        tokensUsed: 0,
        fromCache: false,
        fromTemplate: false,
      };
    }
    
    return {
      text: result.content,
      tokensUsed: result.usage?.total_tokens || 0,
      fromCache: false,
      fromTemplate: false,
    };
    
  } catch (error) {
    logger.error('AI generation error', { error: error.message });
    return {
      text: 'I encountered an issue generating a response. Please try again.',
      tokensUsed: 0,
      fromCache: false,
      fromTemplate: false,
    };
  }
}

/**
 * Build system prompt with constraints
 * @param {import('../types/index.js').ResponsePlan} plan
 * @param {import('../types/index.js').ClassificationResult} classification
 * @returns {string}
 */
function buildConstrainedPrompt(plan, classification) {
  const charLimit = plan.charBudget;
  
  let prompt = `You are Pepper Pal, a friendly community assistant for Peppercoin ($PEPPER) on Chiliz Chain.

GUIDELINES:
- Aim for ${charLimit} characters, but prioritize completeness
- Use plain text - NO markdown, NO asterisks, NO formatting
- Be direct, helpful, and informative
- DO NOT include any URLs or links - the system will add verified links automatically
- DO NOT make up or invent any website addresses
- End with a forward path when appropriate

RESPONSE CLASS: ${plan.responseClass}
`;

  if (plan.responseClass === 'FACTUAL') {
    prompt += `
This is a factual question. Provide accurate, complete information.
Include contract address if relevant. DO NOT include URLs.
Give a thorough answer - users want useful information.`;
  }
  
  if (plan.responseClass === 'PROCEDURAL') {
    prompt += `
This is a how-to question. Provide clear, complete steps.
Include all necessary information to complete the task.
DO NOT include URLs - they will be added automatically.`;
  }

  if (plan.responseClass === 'COMPLEX') {
    prompt += `
This is a complex question requiring explanation.
Provide a thorough, informative response.
Include context and details. DO NOT include any URLs.`;
  }
  
  prompt += `

Plain text only. Be helpful and informative. NO URLs.`;

  return prompt;
}

export default { generate };
