/**
 * Analytics Reporter
 * Generates reports for /analytics command and alerts
 */

import { getClient, isEnabled, safeExecute } from './client.js';
import logger from '../utils/logger.js';

/**
 * Get today's metrics summary
 * @returns {Promise<Object|null>}
 */
export async function getTodaySummary() {
  return await safeExecute(async () => {
    const client = getClient();
    if (!client) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    // Fetch today's events
    const { data: events, error } = await client
      .from('metrics_events')
      .select('*')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());
    
    if (error) {
      logger.error('Failed to fetch today events', { error: error.message });
      return null;
    }
    
    const questions = events?.filter(e => e.event_type === 'question') || [];
    const commands = events?.filter(e => e.event_type === 'command') || [];
    const errors = events?.filter(e => e.event_type === 'error') || [];
    const aiCalls = events?.filter(e => e.event_type === 'ai_call') || [];
    
    const responseTimes = questions
      .filter(q => q.response_time_ms > 0)
      .map(q => q.response_time_ms);
    
    const avgResponseTime = responseTimes.length
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    
    const uniqueChats = new Set(events?.map(e => e.chat_id).filter(Boolean)).size;
    const totalTokens = aiCalls.reduce((sum, c) => sum + (c.tokens_used || 0), 0);
    
    // Intent breakdown
    const intents = {};
    questions.forEach(q => {
      const intent = q.intent || 'unknown';
      intents[intent] = (intents[intent] || 0) + 1;
    });
    
    const successRate = questions.length > 0
      ? Math.round((questions.filter(q => q.success).length / questions.length) * 100)
      : 100;
    
    return {
      date: today.toISOString().split('T')[0],
      questions: questions.length,
      commands: commands.length,
      errors: errors.length,
      uniqueChats,
      avgResponseTimeMs: avgResponseTime,
      totalTokens,
      successRate,
      intents,
      estimatedCost: totalTokens * 0.0000001,
    };
  });
}

/**
 * Get weekly summary (last 7 days)
 * @returns {Promise<Object|null>}
 */
export async function getWeeklySummary() {
  return await safeExecute(async () => {
    const client = getClient();
    if (!client) return null;
    
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    
    // Fetch daily summaries
    const { data: dailyData, error } = await client
      .from('metrics_daily')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });
    
    if (error) {
      logger.error('Failed to fetch weekly data', { error: error.message });
      return null;
    }
    
    // Also include today's live data
    const todaySummary = await getTodaySummary();
    
    const days = dailyData || [];
    
    const totalQuestions = days.reduce((sum, d) => sum + (d.questions_total || 0), 0) + (todaySummary?.questions || 0);
    const totalTokens = days.reduce((sum, d) => sum + (d.total_tokens || 0), 0) + (todaySummary?.totalTokens || 0);
    const totalErrors = days.reduce((sum, d) => {
      const breakdown = d.error_breakdown || {};
      return sum + Object.values(breakdown).reduce((s, v) => s + v, 0);
    }, 0) + (todaySummary?.errors || 0);
    
    const avgSuccessRate = days.length > 0
      ? Math.round(days.reduce((sum, d) => sum + (d.success_rate || 0), 0) / days.length)
      : todaySummary?.successRate || 100;
    
    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      totalQuestions,
      totalErrors,
      totalTokens,
      avgSuccessRate,
      estimatedCost: totalTokens * 0.0000001,
      dailyBreakdown: [...days, todaySummary ? {
        date: todaySummary.date,
        questions_total: todaySummary.questions,
        success_rate: todaySummary.successRate,
      } : null].filter(Boolean),
    };
  });
}

/**
 * Get recent errors for troubleshooting
 * @param {number} limit - Max errors to return
 * @returns {Promise<Array|null>}
 */
export async function getRecentErrors(limit = 10) {
  return await safeExecute(async () => {
    const client = getClient();
    if (!client) return null;
    
    const { data, error } = await client
      .from('metrics_events')
      .select('*')
      .eq('event_type', 'error')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      logger.error('Failed to fetch recent errors', { error: error.message });
      return null;
    }
    
    return data?.map(e => ({
      type: e.intent,
      message: e.metadata?.message,
      stage: e.metadata?.stage,
      timestamp: e.created_at,
    })) || [];
  });
}

/**
 * Check if any alert thresholds are exceeded
 * @returns {Promise<Array>} Array of alert objects
 */
export async function checkAlerts() {
  return await safeExecute(async () => {
    const client = getClient();
    if (!client) return [];
    
    const alerts = [];
    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
    
    // Check error rate in last 10 minutes
    const { data: recentErrors } = await client
      .from('metrics_events')
      .select('id')
      .eq('event_type', 'error')
      .gte('created_at', tenMinAgo.toISOString());
    
    if (recentErrors && recentErrors.length >= 5) {
      alerts.push({
        type: 'error_spike',
        severity: 'warning',
        message: `⚠️ ${recentErrors.length} errors in last 10 minutes`,
      });
    }
    
    // Check for consecutive AI failures
    const { data: recentAICalls } = await client
      .from('metrics_events')
      .select('success')
      .eq('event_type', 'ai_call')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentAICalls && recentAICalls.length >= 3) {
      const consecutiveFailures = recentAICalls.slice(0, 3).every(c => !c.success);
      if (consecutiveFailures) {
        alerts.push({
          type: 'ai_failures',
          severity: 'critical',
          message: '🔴 3 consecutive AI failures - provider may be down',
        });
      }
    }
    
    // Check response time degradation
    const { data: recentQuestions } = await client
      .from('metrics_events')
      .select('response_time_ms')
      .eq('event_type', 'question')
      .gte('created_at', tenMinAgo.toISOString())
      .not('response_time_ms', 'is', null);
    
    if (recentQuestions && recentQuestions.length >= 5) {
      const avgTime = recentQuestions.reduce((sum, q) => sum + q.response_time_ms, 0) / recentQuestions.length;
      if (avgTime > 5000) {
        alerts.push({
          type: 'slow_responses',
          severity: 'warning',
          message: `🐢 Average response time ${Math.round(avgTime / 1000)}s (>5s threshold)`,
        });
      }
    }
    
    return alerts;
  }) || [];
}

/**
 * Format summary for Telegram message
 * @param {Object} summary - Summary object from getTodaySummary
 * @returns {string}
 */
export function formatTelegramSummary(summary) {
  if (!summary) {
    return '❌ Analytics data unavailable';
  }
  
  const lines = [
    `📊 *PepperPal Analytics*`,
    `📅 ${summary.date}`,
    ``,
    `📨 Questions: ${summary.questions}`,
    `⚡ Commands: ${summary.commands}`,
    `❌ Errors: ${summary.errors}`,
    `👥 Unique chats: ${summary.uniqueChats}`,
    ``,
    `⏱️ Avg response: ${summary.avgResponseTimeMs}ms`,
    `✅ Success rate: ${summary.successRate}%`,
    `🎯 Tokens used: ${summary.totalTokens.toLocaleString()}`,
    `💰 Est. cost: $${summary.estimatedCost.toFixed(6)}`,
  ];
  
  if (summary.intents && Object.keys(summary.intents).length > 0) {
    lines.push(``, `📋 *Top Intents:*`);
    const sorted = Object.entries(summary.intents)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    sorted.forEach(([intent, count]) => {
      lines.push(`  • ${intent}: ${count}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Format weekly summary for Telegram
 * @param {Object} weekly - Weekly summary object
 * @returns {string}
 */
export function formatWeeklySummary(weekly) {
  if (!weekly) {
    return '❌ Weekly analytics data unavailable';
  }
  
  const lines = [
    `📊 *PepperPal Weekly Report*`,
    `📅 ${weekly.period}`,
    ``,
    `📨 Total questions: ${weekly.totalQuestions}`,
    `❌ Total errors: ${weekly.totalErrors}`,
    `✅ Avg success rate: ${weekly.avgSuccessRate}%`,
    `🎯 Total tokens: ${weekly.totalTokens.toLocaleString()}`,
    `💰 Est. cost: $${weekly.estimatedCost.toFixed(4)}`,
    ``,
    `📈 *Daily Breakdown:*`,
  ];
  
  weekly.dailyBreakdown?.slice(-7).forEach(day => {
    if (day) {
      lines.push(`  ${day.date}: ${day.questions_total || 0} q, ${day.success_rate || 100}%`);
    }
  });
  
  return lines.join('\n');
}

export default {
  getTodaySummary,
  getWeeklySummary,
  getRecentErrors,
  checkAlerts,
  formatTelegramSummary,
  formatWeeklySummary,
};
