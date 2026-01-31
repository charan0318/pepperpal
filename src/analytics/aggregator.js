/**
 * Analytics Aggregator
 * Aggregates raw events into hourly and daily summaries
 */

import { getClient, isEnabled, safeExecute } from './client.js';
import logger from '../utils/logger.js';

/**
 * Calculate percentile from an array of numbers
 * @param {number[]} arr - Sorted array of numbers
 * @param {number} p - Percentile (0-100)
 * @returns {number}
 */
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Aggregate events for a specific hour
 * @param {Date} hour - Hour to aggregate (will be truncated)
 * @returns {Promise<Object|null>}
 */
export async function aggregateHour(hour) {
  return await safeExecute(async () => {
    const client = getClient();
    if (!client) return null;
    
    // Truncate to hour
    const hourStart = new Date(hour);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
    
    // Fetch events for this hour
    const { data: events, error } = await client
      .from('metrics_events')
      .select('*')
      .gte('created_at', hourStart.toISOString())
      .lt('created_at', hourEnd.toISOString());
    
    if (error) {
      logger.error('Failed to fetch events for aggregation', { error: error.message });
      return null;
    }
    
    if (!events || events.length === 0) {
      logger.debug('No events to aggregate for hour', { hour: hourStart.toISOString() });
      return null;
    }
    
    // Calculate aggregates
    const questions = events.filter(e => e.event_type === 'question');
    const commands = events.filter(e => e.event_type === 'command');
    const errors = events.filter(e => e.event_type === 'error');
    const aiCalls = events.filter(e => e.event_type === 'ai_call');
    
    const responseTimes = questions
      .filter(q => q.response_time_ms > 0)
      .map(q => q.response_time_ms);
    
    const intents = {};
    questions.forEach(q => {
      const intent = q.intent || 'unknown';
      intents[intent] = (intents[intent] || 0) + 1;
    });
    
    const commandCounts = {};
    commands.forEach(c => {
      const cmd = c.intent || 'unknown';
      commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
    });
    
    const totalTokens = aiCalls.reduce((sum, c) => sum + (c.tokens_used || 0), 0);
    
    const aggregated = {
      hour: hourStart.toISOString(),
      questions_total: questions.length,
      questions_answered: questions.filter(q => q.success).length,
      questions_fallback: questions.filter(q => q.metadata?.strategy === 'fallback').length,
      errors_total: errors.length,
      avg_response_time_ms: responseTimes.length 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null,
      p95_response_time_ms: responseTimes.length ? percentile(responseTimes, 95) : null,
      tokens_total: totalTokens,
      intents,
      commands: commandCounts,
    };
    
    // Upsert into metrics_hourly
    const { error: upsertError } = await client
      .from('metrics_hourly')
      .upsert(aggregated, { onConflict: 'hour' });
    
    if (upsertError) {
      logger.error('Failed to upsert hourly aggregate', { error: upsertError.message });
      return null;
    }
    
    logger.info('Hourly aggregation complete', { 
      hour: hourStart.toISOString(),
      questions: aggregated.questions_total,
      errors: aggregated.errors_total,
    });
    
    return aggregated;
  });
}

/**
 * Aggregate hourly data into daily summary
 * @param {Date} date - Date to aggregate
 * @returns {Promise<Object|null>}
 */
export async function aggregateDay(date) {
  return await safeExecute(async () => {
    const client = getClient();
    if (!client) return null;
    
    // Get date boundaries
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    // Fetch hourly aggregates for this day
    const { data: hourlyData, error } = await client
      .from('metrics_hourly')
      .select('*')
      .gte('hour', dayStart.toISOString())
      .lt('hour', dayEnd.toISOString());
    
    if (error) {
      logger.error('Failed to fetch hourly data for daily aggregation', { error: error.message });
      return null;
    }
    
    if (!hourlyData || hourlyData.length === 0) {
      logger.debug('No hourly data to aggregate for day', { date: dayStart.toISOString() });
      return null;
    }
    
    // Fetch unique chat count from raw events
    const { data: uniqueChats, error: chatError } = await client
      .from('metrics_events')
      .select('chat_id')
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
      .not('chat_id', 'is', null);
    
    const uniqueChatCount = chatError ? 0 : new Set(uniqueChats?.map(c => c.chat_id)).size;
    
    // Aggregate hourly data
    const questionsTotal = hourlyData.reduce((sum, h) => sum + (h.questions_total || 0), 0);
    const questionsAnswered = hourlyData.reduce((sum, h) => sum + (h.questions_answered || 0), 0);
    const errorsTotal = hourlyData.reduce((sum, h) => sum + (h.errors_total || 0), 0);
    const tokensTotal = hourlyData.reduce((sum, h) => sum + (h.tokens_total || 0), 0);
    
    // Weighted average response time
    const responseTimes = hourlyData
      .filter(h => h.avg_response_time_ms && h.questions_total > 0)
      .map(h => ({ time: h.avg_response_time_ms, count: h.questions_total }));
    
    const totalWeight = responseTimes.reduce((sum, r) => sum + r.count, 0);
    const avgResponseTime = totalWeight > 0
      ? Math.round(responseTimes.reduce((sum, r) => sum + r.time * r.count, 0) / totalWeight)
      : null;
    
    // Max p95 as daily p95 approximation
    const p95ResponseTime = Math.max(...hourlyData.map(h => h.p95_response_time_ms || 0)) || null;
    
    // Merge intents
    const topIntents = {};
    hourlyData.forEach(h => {
      if (h.intents) {
        Object.entries(h.intents).forEach(([intent, count]) => {
          topIntents[intent] = (topIntents[intent] || 0) + count;
        });
      }
    });
    
    // Merge commands
    const commandsBreakdown = {};
    hourlyData.forEach(h => {
      if (h.commands) {
        Object.entries(h.commands).forEach(([cmd, count]) => {
          commandsBreakdown[cmd] = (commandsBreakdown[cmd] || 0) + count;
        });
      }
    });
    
    // Error breakdown from raw events
    const { data: errorEvents } = await client
      .from('metrics_events')
      .select('intent')
      .eq('event_type', 'error')
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString());
    
    const errorBreakdown = {};
    errorEvents?.forEach(e => {
      const type = e.intent || 'unknown';
      errorBreakdown[type] = (errorBreakdown[type] || 0) + 1;
    });
    
    // Estimate cost (rough approximation based on common model pricing)
    // Assuming ~$0.0001 per 1K tokens for free/cheap models
    const estimatedCost = tokensTotal * 0.0000001;
    
    const successRate = questionsTotal > 0 
      ? Math.round((questionsAnswered / questionsTotal) * 10000) / 100
      : null;
    
    const dailySummary = {
      date: dayStart.toISOString().split('T')[0],
      questions_total: questionsTotal,
      unique_chats: uniqueChatCount,
      success_rate: successRate,
      avg_response_time_ms: avgResponseTime,
      p95_response_time_ms: p95ResponseTime,
      total_tokens: tokensTotal,
      estimated_cost_usd: estimatedCost,
      top_intents: topIntents,
      error_breakdown: errorBreakdown,
      commands_breakdown: commandsBreakdown,
    };
    
    // Upsert into metrics_daily
    const { error: upsertError } = await client
      .from('metrics_daily')
      .upsert(dailySummary, { onConflict: 'date' });
    
    if (upsertError) {
      logger.error('Failed to upsert daily summary', { error: upsertError.message });
      return null;
    }
    
    logger.info('Daily aggregation complete', {
      date: dailySummary.date,
      questions: questionsTotal,
      uniqueChats: uniqueChatCount,
      successRate,
    });
    
    return dailySummary;
  });
}

/**
 * Run aggregation for the previous hour and day (if needed)
 * Called by Vercel Cron
 * @returns {Promise<Object>}
 */
export async function runAggregation() {
  const now = new Date();
  
  // Aggregate previous hour
  const prevHour = new Date(now.getTime() - 60 * 60 * 1000);
  const hourlyResult = await aggregateHour(prevHour);
  
  // If it's the first hour of the day, aggregate previous day
  let dailyResult = null;
  if (now.getHours() === 0) {
    const prevDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    dailyResult = await aggregateDay(prevDay);
  }
  
  return {
    hourly: hourlyResult,
    daily: dailyResult,
    timestamp: now.toISOString(),
  };
}

export default {
  aggregateHour,
  aggregateDay,
  runAggregation,
};
