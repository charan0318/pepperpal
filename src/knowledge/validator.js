import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

/**
 * Knowledge Validator
 * Validates knowledge files for integrity, size, and structure.
 * Fail-closed: Any validation failure means knowledge is unusable.
 */

// Maximum allowed size for knowledge file (500KB)
const MAX_KNOWLEDGE_SIZE_BYTES = 500 * 1024;

// Minimum content length (prevent empty files)
const MIN_CONTENT_LENGTH = 100;

// Required fields in version.json
const REQUIRED_VERSION_FIELDS = ['version', 'last_updated', 'source'];

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - List of validation errors
 */

/**
 * Validate the knowledge markdown file
 * @param {string} filePath - Absolute path to peppercoin.md
 * @returns {ValidationResult}
 */
export function validateKnowledgeFile(filePath) {
  const errors = [];

  // Check file exists
  if (!fs.existsSync(filePath)) {
    errors.push(`Knowledge file not found: ${filePath}`);
    return { valid: false, errors };
  }

  // Check file stats
  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch (err) {
    errors.push(`Cannot read file stats: ${err.message}`);
    return { valid: false, errors };
  }

  // Check file size (prevent overflow)
  if (stats.size > MAX_KNOWLEDGE_SIZE_BYTES) {
    errors.push(
      `Knowledge file too large: ${stats.size} bytes (max: ${MAX_KNOWLEDGE_SIZE_BYTES})`
    );
    return { valid: false, errors };
  }

  if (stats.size === 0) {
    errors.push('Knowledge file is empty');
    return { valid: false, errors };
  }

  // Read and validate content
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    errors.push(`Cannot read knowledge file: ${err.message}`);
    return { valid: false, errors };
  }

  // Check minimum content length
  const trimmedContent = content.trim();
  if (trimmedContent.length < MIN_CONTENT_LENGTH) {
    errors.push(
      `Knowledge content too short: ${trimmedContent.length} chars (min: ${MIN_CONTENT_LENGTH})`
    );
    return { valid: false, errors };
  }

  // Check for markdown structure (at least one heading)
  if (!trimmedContent.includes('#')) {
    errors.push('Knowledge file has no markdown headings');
    return { valid: false, errors };
  }

  logger.debug('Knowledge file validation passed', {
    path: filePath,
    size: stats.size,
    contentLength: trimmedContent.length,
  });

  return { valid: true, errors: [] };
}

/**
 * Validate the version.json file
 * @param {string} filePath - Absolute path to version.json
 * @returns {ValidationResult}
 */
export function validateVersionFile(filePath) {
  const errors = [];

  // Check file exists
  if (!fs.existsSync(filePath)) {
    errors.push(`Version file not found: ${filePath}`);
    return { valid: false, errors };
  }

  // Read and parse JSON
  let versionData;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    versionData = JSON.parse(content);
  } catch (err) {
    errors.push(`Invalid version.json: ${err.message}`);
    return { valid: false, errors };
  }

  // Check required fields
  for (const field of REQUIRED_VERSION_FIELDS) {
    if (!versionData[field]) {
      errors.push(`Missing required field in version.json: ${field}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validate date format (YYYY-MM-DD)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(versionData.last_updated)) {
    errors.push(
      `Invalid date format in version.json: ${versionData.last_updated} (expected YYYY-MM-DD)`
    );
    return { valid: false, errors };
  }

  logger.debug('Version file validation passed', {
    version: versionData.version,
    lastUpdated: versionData.last_updated,
  });

  return { valid: true, errors: [] };
}

/**
 * Validate all knowledge files
 * @param {string} knowledgeDir - Path to knowledge directory
 * @returns {ValidationResult}
 */
export function validateAllKnowledge(knowledgeDir) {
  const allErrors = [];

  const knowledgePath = path.join(knowledgeDir, 'peppercoin.md');
  const versionPath = path.join(knowledgeDir, 'version.json');

  // Validate knowledge file
  const knowledgeResult = validateKnowledgeFile(knowledgePath);
  if (!knowledgeResult.valid) {
    allErrors.push(...knowledgeResult.errors);
  }

  // Validate version file
  const versionResult = validateVersionFile(versionPath);
  if (!versionResult.valid) {
    allErrors.push(...versionResult.errors);
  }

  const isValid = allErrors.length === 0;

  if (!isValid) {
    logger.error('Knowledge validation failed', { errors: allErrors });
  }

  return { valid: isValid, errors: allErrors };
}

export default {
  validateKnowledgeFile,
  validateVersionFile,
  validateAllKnowledge,
  MAX_KNOWLEDGE_SIZE_BYTES,
  MIN_CONTENT_LENGTH,
};
