import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { validateAllKnowledge } from './validator.js';

/**
 * Knowledge Loader
 * Loads, validates, and caches knowledge in memory.
 * Fail-closed: If loading fails, knowledge is unavailable.
 */

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default knowledge directory (relative to this file)
const DEFAULT_KNOWLEDGE_DIR = __dirname;

/**
 * In-memory knowledge cache
 * @type {Object}
 */
let knowledgeCache = {
  loaded: false,
  valid: false,
  content: null,
  version: null,
  loadedAt: null,
  errors: [],
};

/**
 * Get the current knowledge state
 * @returns {Object} Current knowledge cache state
 */
export function getKnowledgeState() {
  return {
    loaded: knowledgeCache.loaded,
    valid: knowledgeCache.valid,
    version: knowledgeCache.version,
    loadedAt: knowledgeCache.loadedAt,
    hasErrors: knowledgeCache.errors.length > 0,
    errorCount: knowledgeCache.errors.length,
  };
}

/**
 * Check if knowledge is available and valid
 * @returns {boolean}
 */
export function isKnowledgeAvailable() {
  return knowledgeCache.loaded && knowledgeCache.valid;
}

/**
 * Get the knowledge content (internal use only)
 * @returns {string|null} Knowledge content or null if unavailable
 */
export function getKnowledgeContent() {
  if (!isKnowledgeAvailable()) {
    return null;
  }
  return knowledgeCache.content;
}

/**
 * Get the knowledge version info
 * @returns {Object|null} Version info or null if unavailable
 */
export function getKnowledgeVersion() {
  if (!isKnowledgeAvailable()) {
    return null;
  }
  return knowledgeCache.version;
}

/**
 * Load knowledge from files into memory
 * @param {string} [knowledgeDir] - Optional path to knowledge directory
 * @returns {Object} Load result with success status and errors
 */
export function loadKnowledge(knowledgeDir = DEFAULT_KNOWLEDGE_DIR) {
  logger.info('Loading knowledge...', { dir: knowledgeDir });

  // Reset cache state
  knowledgeCache = {
    loaded: false,
    valid: false,
    content: null,
    version: null,
    loadedAt: null,
    errors: [],
  };

  // Validate all knowledge files first
  const validationResult = validateAllKnowledge(knowledgeDir);

  if (!validationResult.valid) {
    knowledgeCache.errors = validationResult.errors;
    logger.error('Knowledge validation failed during load', {
      errors: validationResult.errors,
    });
    return {
      success: false,
      errors: validationResult.errors,
    };
  }

  // Load knowledge content
  const knowledgePath = path.join(knowledgeDir, 'peppercoin.md');
  const versionPath = path.join(knowledgeDir, 'version.json');

  try {
    // Load markdown content
    const content = fs.readFileSync(knowledgePath, 'utf-8');

    // Load version info
    const versionRaw = fs.readFileSync(versionPath, 'utf-8');
    const version = JSON.parse(versionRaw);

    // Update cache
    knowledgeCache = {
      loaded: true,
      valid: true,
      content: content.trim(),
      version: version,
      loadedAt: new Date().toISOString(),
      errors: [],
    };

    logger.info('Knowledge loaded successfully', {
      version: version.version,
      lastUpdated: version.last_updated,
      contentLength: content.length,
    });

    return {
      success: true,
      version: version.version,
      lastUpdated: version.last_updated,
    };
  } catch (err) {
    const error = `Failed to load knowledge: ${err.message}`;
    knowledgeCache.errors = [error];

    logger.error('Knowledge load failed', { error: err.message });

    return {
      success: false,
      errors: [error],
    };
  }
}

/**
 * Reload knowledge (used by admin refresh)
 * @param {string} [knowledgeDir] - Optional path to knowledge directory
 * @returns {Object} Reload result
 */
export function reloadKnowledge(knowledgeDir = DEFAULT_KNOWLEDGE_DIR) {
  logger.info('Reloading knowledge...');

  const previousState = getKnowledgeState();
  const result = loadKnowledge(knowledgeDir);

  if (result.success) {
    logger.info('Knowledge reloaded successfully', {
      previousVersion: previousState.version?.version,
      newVersion: result.version,
    });
  } else {
    logger.error('Knowledge reload failed', { errors: result.errors });
  }

  return result;
}

/**
 * Get safe message for when knowledge is unavailable
 * @returns {string}
 */
export function getKnowledgeUnavailableMessage() {
  return 'Pepper Pal is temporarily unable to access official information. Please try again later or contact a moderator.';
}

export default {
  loadKnowledge,
  reloadKnowledge,
  getKnowledgeState,
  getKnowledgeContent,
  getKnowledgeVersion,
  isKnowledgeAvailable,
  getKnowledgeUnavailableMessage,
};
