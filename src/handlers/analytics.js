/**
 * Analytics Command Handler
 * Admin-only command to view bot analytics and metrics
 */

import { isAdmin } from '../admin/adminCheck.js';
import logger from '../utils/logger.js';
import {
  isEnabled,
  getTodaySummary,
  getWeeklySummary,
  getRecentErrors,
  checkAlerts,
  formatTelegramSummary,
  formatWeeklySummary,
} from '../analytics/index.js';

/**
 * Handle /analytics command
 * Usage:
 *   /analytics        - Today's summary
 *   /analytics week   - Weekly summary
 *   /analytics errors - Recent errors
 *   /analytics alerts - Check for alerts
 */
export async function analyticsHandler(ctx) {
  // Admin check
  const admin = await isAdmin(ctx);
  if (!admin) {
    try {
      await ctx.reply('This command is restricted to administrators.');
    } catch (err) {
      logger.warn('Failed to send admin restriction message', {
        error: err.message,
      });
    }
    return;
  }

  // Check if analytics is enabled
  if (!isEnabled()) {
    await ctx.reply(
      '📊 Analytics is not configured.\n\n' +
      'To enable analytics:\n' +
      '1. Set up a Supabase project\n' +
      '2. Add SUPABASE_URL and SUPABASE_ANON_KEY to env\n' +
      '3. Set ANALYTICS_ENABLED=true'
    );
    return;
  }

  // Parse subcommand
  const args = ctx.message.text.split(/\s+/).slice(1);
  const subcommand = args[0]?.toLowerCase();

  try {
    switch (subcommand) {
      case 'week':
      case 'weekly': {
        await ctx.reply('⏳ Generating weekly report...');
        const weeklyData = await getWeeklySummary();
        const weeklyReport = formatWeeklySummary(weeklyData);
        await ctx.reply(weeklyReport, { parse_mode: 'Markdown' });
        break;
      }

      case 'errors': {
        const errors = await getRecentErrors(10);
        if (!errors || errors.length === 0) {
          await ctx.reply('✅ No recent errors in the last 24 hours!');
        } else {
          let report = '🚨 *Recent Errors (last 24h)*\n\n';
          errors.forEach((err, i) => {
            const time = new Date(err.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
            report += `${i + 1}. \`${time}\` - ${err.error_type || 'unknown'}\n`;
            if (err.error_message) {
              report += `   _${err.error_message.slice(0, 50)}..._\n`;
            }
          });
          await ctx.reply(report, { parse_mode: 'Markdown' });
        }
        break;
      }

      case 'alerts':
      case 'alert': {
        const alerts = await checkAlerts();
        if (alerts.length === 0) {
          await ctx.reply('✅ No active alerts. Everything looks healthy!');
        } else {
          let report = '⚠️ *Active Alerts*\n\n';
          alerts.forEach((alert, i) => {
            report += `${i + 1}. ${alert}\n`;
          });
          await ctx.reply(report, { parse_mode: 'Markdown' });
        }
        break;
      }

      case 'help': {
        await ctx.reply(
          '📊 *Analytics Commands*\n\n' +
          '`/analytics` - Today\'s summary\n' +
          '`/analytics week` - Weekly summary\n' +
          '`/analytics errors` - Recent errors\n' +
          '`/analytics alerts` - Check for alerts\n' +
          '`/analytics help` - This message',
          { parse_mode: 'Markdown' }
        );
        break;
      }

      default: {
        // Default: Today's summary
        await ctx.reply('⏳ Gathering today\'s metrics...');
        const todayData = await getTodaySummary();
        const todayReport = formatTelegramSummary(todayData);
        await ctx.reply(todayReport, { parse_mode: 'Markdown' });
        break;
      }
    }

    logger.debug('Analytics command executed', {
      adminId: ctx.from?.id,
      subcommand: subcommand || 'today',
    });
  } catch (err) {
    logger.error('Analytics command failed', {
      error: err.message,
      stack: err.stack,
      subcommand,
    });

    await ctx.reply(
      '❌ Failed to fetch analytics data.\n' +
      'Please check the logs or try again later.'
    );
  }
}

export default analyticsHandler;
