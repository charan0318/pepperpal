/**
 * Response Planner
 * Takes ClassificationResult and produces ResponsePlan
 * Determines strategy and whether to split
 */

import {
  CHAR_BUDGETS,
  COMPLEXITY_THRESHOLDS,
  SPLIT_THRESHOLD,
} from '../constants.js';
import logger from '../utils/logger.js';

/**
 * Create a response plan based on classification
 * @param {import('../types/index.js').ClassificationResult} classification
 * @returns {import('../types/index.js').ResponsePlan}
 */
export function plan(classification) {
  const { intent, complexity, responseClass, charBudget, keywords } = classification;
  
  // Determine strategy
  const strategy = determineStrategy(responseClass, complexity);
  
  // Determine if response may need splitting
  const shouldSplit = charBudget > SPLIT_THRESHOLD || complexity >= COMPLEXITY_THRESHOLDS.MEDIUM;
  
  // Determine which knowledge sections to load
  const knowledgeSections = selectKnowledgeSections(keywords, responseClass);
  
  const plan = {
    strategy,
    charBudget,
    responseClass,
    shouldSplit,
    knowledgeSections,
  };
  
  logger.debug('Response planned', {
    intent,
    complexity,
    ...plan,
  });
  
  return plan;
}

/**
 * Determine response generation strategy
 * @param {string} responseClass
 * @param {number} complexity
 * @returns {import('../types/index.js').ResponseStrategy}
 */
function determineStrategy(responseClass, complexity) {
  // Greetings and closings always use templates
  if (responseClass === 'GREETING' || responseClass === 'CLOSING') {
    return 'template';
  }
  
  // Refusals use templates
  if (responseClass === 'REFUSAL') {
    return 'template';
  }
  
  // Simple factual questions might be cached
  if (responseClass === 'FACTUAL' && complexity <= COMPLEXITY_THRESHOLDS.SIMPLE) {
    return 'cache'; // Will fall back to generate if not in cache
  }
  
  // Everything else generates
  return 'generate';
}

/**
 * Select relevant knowledge sections based on keywords
 * @param {string[]} keywords
 * @param {string} responseClass
 * @returns {string[]}
 */
function selectKnowledgeSections(keywords, responseClass) {
  // Map keywords to knowledge sections
  const sectionMapping = {
    // Token basics
    'pepper': ['what-is-peppercoin', 'quick-reference'],
    'peppercoin': ['what-is-peppercoin', 'quick-reference'],
    'token': ['what-is-peppercoin', 'tokenomics'],
    
    // Buying
    'buy': ['how-to-get-started', 'buying-and-trading'],
    'purchase': ['how-to-get-started', 'buying-and-trading'],
    'exchange': ['buying-and-trading', 'official-resources'],
    'dex': ['buying-and-trading'],
    'cex': ['buying-and-trading'],
    'fanx': ['buying-and-trading'],
    'mexc': ['buying-and-trading'],
    
    // Technical
    'contract': ['quick-reference', 'buying-and-trading'],
    'address': ['quick-reference', 'buying-and-trading'],
    'wallet': ['how-to-get-started', 'technical'],
    'metamask': ['how-to-get-started', 'technical'],
    'chiliz': ['what-is-peppercoin', 'technical'],
    'chain': ['technical', 'what-is-peppercoin'],
    
    // Governance
    'governance': ['pepper-inc-governance', 'governance-and-staking'],
    'vote': ['pepper-inc-governance', 'governance-and-staking'],
    'voting': ['pepper-inc-governance', 'governance-and-staking'],
    'staking': ['governance-and-staking'],
    'stake': ['governance-and-staking'],
    'treasury': ['pepper-inc-governance'],
    'inc': ['pepper-inc-governance'],
    
    // Tokenomics
    'supply': ['tokenomics'],
    'burn': ['tokenomics'],
    'tokenomics': ['tokenomics'],
    
    // Safety
    'scam': ['safety-and-security'],
    'safe': ['safety-and-security'],
    'security': ['safety-and-security'],
    'audit': ['safety-and-security', 'quick-reference'],
    
    // Community
    'telegram': ['official-resources', 'community-guidelines'],
    'twitter': ['official-resources'],
    'community': ['community-guidelines', 'community-programs'],
    'raid2earn': ['community-programs'],
  };
  
  const sections = new Set();
  
  for (const keyword of keywords) {
    const mapped = sectionMapping[keyword];
    if (mapped) {
      mapped.forEach(s => sections.add(s));
    }
  }
  
  // If no specific sections matched, include general sections
  if (sections.size === 0) {
    sections.add('what-is-peppercoin');
    sections.add('quick-reference');
  }
  
  // Limit to 3 sections to keep context small
  return [...sections].slice(0, 3);
}

/**
 * Get model to use based on complexity
 * @param {number} complexity
 * @returns {'FAST' | 'QUALITY'}
 */
export function selectModel(complexity) {
  if (complexity <= COMPLEXITY_THRESHOLDS.MEDIUM) {
    return 'FAST';
  }
  return 'QUALITY';
}

export default { plan, selectModel };
