/**
 * Simple logger for Pepper Pal
 * Outputs structured logs with timestamps
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel =
  LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Format a log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} [data] - Optional structured data
 * @returns {string}
 */
function formatLog(level, message, data) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level}] ${message}`;

  if (data && Object.keys(data).length > 0) {
    return `${base} ${JSON.stringify(data)}`;
  }

  return base;
}

const logger = {
  debug(message, data) {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.log(formatLog('DEBUG', message, data));
    }
  },

  info(message, data) {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(formatLog('INFO', message, data));
    }
  },

  warn(message, data) {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(formatLog('WARN', message, data));
    }
  },

  error(message, data) {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error(formatLog('ERROR', message, data));
    }
  },
};

export default logger;
