/**
 * Analytics Module
 * Re-exports all analytics functionality
 */

export { initAnalytics, getClient, isEnabled, safeExecute } from './client.js';
export { 
  trackQuestion, 
  trackCommand, 
  trackAICall, 
  trackError, 
  trackForbidden,
  trackRateLimit,
  trackBotStart,
} from './tracker.js';
export { aggregateHour, aggregateDay, runAggregation } from './aggregator.js';
export { 
  getTodaySummary, 
  getWeeklySummary, 
  getRecentErrors, 
  checkAlerts,
  formatTelegramSummary,
  formatWeeklySummary,
} from './reporter.js';
