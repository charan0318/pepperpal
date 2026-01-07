/**
 * Stats Tracker
 * Tracks aggregate operational metrics for monitoring.
 * No user-level data, no message content, aggregates only.
 */

/**
 * In-memory stats storage
 * Resets on bot restart (intentionally ephemeral)
 */
const stats = {
  // Startup timestamp
  startedAt: new Date().toISOString(),

  // Question handling
  questionsReceived: 0,
  questionsAnswered: 0,
  questionsFallback: 0,

  // Errors
  aiErrors: 0,
  validationFailures: 0,
  sanitizationFailures: 0,

  // Rate limiting
  rateLimitHits: 0,
  duplicateQueries: 0,

  // Commands
  commandsProcessed: 0,
};

/**
 * Increment a stat counter
 * @param {keyof typeof stats} key - The stat to increment
 * @param {number} [amount=1] - Amount to increment by
 */
export function increment(key, amount = 1) {
  if (key in stats && typeof stats[key] === 'number') {
    stats[key] += amount;
  }
}

/**
 * Record a question received
 */
export function recordQuestion() {
  stats.questionsReceived++;
}

/**
 * Record a successful answer
 */
export function recordAnswer() {
  stats.questionsAnswered++;
}

/**
 * Record a fallback response
 */
export function recordFallback() {
  stats.questionsFallback++;
}

/**
 * Record an AI error
 */
export function recordAIError() {
  stats.aiErrors++;
}

/**
 * Record a validation failure
 */
export function recordValidationFailure() {
  stats.validationFailures++;
}

/**
 * Record a sanitization failure
 */
export function recordSanitizationFailure() {
  stats.sanitizationFailures++;
}

/**
 * Record a rate limit hit
 */
export function recordRateLimitHit() {
  stats.rateLimitHits++;
}

/**
 * Record a duplicate query
 */
export function recordDuplicate() {
  stats.duplicateQueries++;
}

/**
 * Record a command processed
 */
export function recordCommand() {
  stats.commandsProcessed++;
}

/**
 * Get all stats (for admin /stats command)
 * @returns {Object}
 */
export function getStats() {
  const now = new Date();
  const started = new Date(stats.startedAt);
  const uptimeMs = now - started;
  const uptimeMinutes = Math.floor(uptimeMs / 60000);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeDays = Math.floor(uptimeHours / 24);

  let uptimeStr;
  if (uptimeDays > 0) {
    uptimeStr = `${uptimeDays}d ${uptimeHours % 24}h`;
  } else if (uptimeHours > 0) {
    uptimeStr = `${uptimeHours}h ${uptimeMinutes % 60}m`;
  } else {
    uptimeStr = `${uptimeMinutes}m`;
  }

  return {
    uptime: uptimeStr,
    startedAt: stats.startedAt,

    questions: {
      received: stats.questionsReceived,
      answered: stats.questionsAnswered,
      fallback: stats.questionsFallback,
    },

    errors: {
      ai: stats.aiErrors,
      validation: stats.validationFailures,
      sanitization: stats.sanitizationFailures,
    },

    safety: {
      rateLimitHits: stats.rateLimitHits,
      duplicates: stats.duplicateQueries,
    },

    commands: stats.commandsProcessed,
  };
}

/**
 * Get stats as formatted string for Telegram
 * @returns {string}
 */
export function getStatsString() {
  const s = getStats();

  return `📊 Pepper Pal Stats

Uptime: ${s.uptime}
Started: ${s.startedAt}

Questions:
• Received: ${s.questions.received}
• Answered: ${s.questions.answered}
• Fallback: ${s.questions.fallback}

Errors:
• AI errors: ${s.errors.ai}
• Validation failures: ${s.errors.validation}
• Sanitization failures: ${s.errors.sanitization}

Safety:
• Rate limit hits: ${s.safety.rateLimitHits}
• Duplicate queries: ${s.safety.duplicates}

Commands processed: ${s.commands}`;
}

/**
 * Reset stats (for testing only)
 */
export function resetStats() {
  stats.startedAt = new Date().toISOString();
  stats.questionsReceived = 0;
  stats.questionsAnswered = 0;
  stats.questionsFallback = 0;
  stats.aiErrors = 0;
  stats.validationFailures = 0;
  stats.sanitizationFailures = 0;
  stats.rateLimitHits = 0;
  stats.duplicateQueries = 0;
  stats.commandsProcessed = 0;
}

export default {
  increment,
  recordQuestion,
  recordAnswer,
  recordFallback,
  recordAIError,
  recordValidationFailure,
  recordSanitizationFailure,
  recordRateLimitHit,
  recordDuplicate,
  recordCommand,
  getStats,
  getStatsString,
  resetStats,
};
