/**
 * Type Definitions for PepperPal Pipeline
 * All internal objects used across pipeline stages
 */

/**
 * @typedef {'micro' | 'short' | 'medium' | 'long'} LengthBucket
 */

/**
 * @typedef {'greeting' | 'factual' | 'procedural' | 'forbidden' | 'adversarial' | 'closing'} IntentType
 */

/**
 * @typedef {'GREETING' | 'FACTUAL' | 'PROCEDURAL' | 'REFUSAL' | 'CLOSING'} ResponseClass
 */

/**
 * @typedef {'template' | 'generate' | 'cache'} ResponseStrategy
 */

/**
 * @typedef {Object} ClassificationResult
 * @property {IntentType} intent - Detected user intent
 * @property {number} complexity - Complexity score 0-10
 * @property {LengthBucket} lengthBucket - Query length category
 * @property {ResponseClass} responseClass - Assigned response class
 * @property {number} charBudget - Character budget for response
 * @property {string[]} keywords - Extracted keywords for knowledge matching
 */

/**
 * @typedef {Object} ResponsePlan
 * @property {ResponseStrategy} strategy - How to generate response
 * @property {number} charBudget - Character budget
 * @property {ResponseClass} responseClass - Response class
 * @property {boolean} shouldSplit - Whether response may need splitting
 * @property {string[]} knowledgeSections - Relevant knowledge sections to include
 */

/**
 * @typedef {Object} GeneratedResponse
 * @property {string} text - Generated response text
 * @property {number} tokensUsed - Tokens consumed
 * @property {boolean} fromCache - Whether served from cache
 * @property {boolean} fromTemplate - Whether from template pool
 * @property {number} generationTimeMs - Time to generate in ms
 */

/**
 * @typedef {Object} ValidatedResponse
 * @property {boolean} valid - Whether response passed validation
 * @property {string} text - Final validated text
 * @property {boolean} wasCompressed - Whether compression was applied
 * @property {string|null} error - Error message if invalid
 */

/**
 * @typedef {Object} DeliveryPlan
 * @property {string[]} messages - Array of messages to send
 * @property {number[]} delays - Delays between messages in ms
 * @property {Object|null} keyboard - Telegram inline keyboard markup
 * @property {string|null} parseMode - Telegram parse mode (null for plain text)
 */

/**
 * @typedef {Object} ForbiddenCheckResult
 * @property {boolean} isForbidden - Whether query is forbidden
 * @property {string|null} intent - Detected forbidden intent
 * @property {string|null} suggestedRedirect - Topic to redirect to
 */

/**
 * @typedef {Object} CacheEntry
 * @property {string} response - Cached response text
 * @property {number} timestamp - When cached
 * @property {number} ttl - Time to live in ms
 * @property {number} hits - Number of cache hits
 */

export default {};
