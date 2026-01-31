/**
 * Vercel Cron Endpoint for Analytics Aggregation
 * 
 * Schedule: Runs every hour (configured in vercel.json)
 * Purpose: Aggregates raw metrics events into hourly/daily summaries
 * 
 * Security: Protected by CRON_SECRET environment variable
 */

import { runAggregation, isEnabled } from '../src/analytics/index.js';

export const config = {
  maxDuration: 60, // Allow up to 60 seconds for aggregation
};

export default async function handler(req, res) {
  // Verify this is a legitimate cron request
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, verify the request
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('Unauthorized cron request attempted');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if analytics is enabled
  if (!isEnabled()) {
    return res.status(200).json({
      success: true,
      message: 'Analytics not enabled, skipping aggregation',
    });
  }

  try {
    console.log('Starting scheduled aggregation...');
    const startTime = Date.now();

    const result = await runAggregation();

    const duration = Date.now() - startTime;
    console.log(`Aggregation completed in ${duration}ms`, result);

    return res.status(200).json({
      success: true,
      duration: `${duration}ms`,
      ...result,
    });
  } catch (err) {
    console.error('Aggregation failed:', err.message, err.stack);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
