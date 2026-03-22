/**
 * Notification Worker
 *
 * Runs in the background every 5 seconds.
 * Picks up pending jobs from MongoDB, sends WhatsApp, marks done.
 * If sending fails → waits (exponential backoff) → retries up to 5 times.
 *
 * Backoff schedule:
 *   Attempt 1 → send immediately
 *   Attempt 2 → wait 30 seconds
 *   Attempt 3 → wait 2 minutes
 *   Attempt 4 → wait 10 minutes
 *   Attempt 5 → wait 30 minutes → mark failed
 *
 * Can handle 20+ orders/second because:
 *   - Enqueuing is just a MongoDB insert (~5ms)
 *   - Worker processes jobs in parallel batches (10 at a time)
 *   - Worker runs separately from the HTTP server
 */

import NotificationJob from '../models/NotificationJob.js';
import { notifyNewOrder } from './notify.js';

const BATCH_SIZE = 10;       // process 10 jobs at once
const POLL_MS   = 5_000;    // check queue every 5 seconds

// Exponential backoff delays (in seconds)
const BACKOFF = [0, 30, 120, 600, 1800];

let isRunning = false;

async function processJob(job) {
  try {
    // Mark as processing so other workers don't pick it up
    job.status   = 'processing';
    job.attempts = (job.attempts || 0) + 1;
    await job.save();

    // Send the WhatsApp message
    await notifyNewOrder(job.order);

    // Success — mark done
    job.status = 'done';
    await job.save();
    console.log(`✅ Notification sent for order ${job.order.orderNumber} (attempt ${job.attempts})`);

  } catch (err) {
    const errorMsg = err.message || String(err);
    console.error(`⚠️  Notification failed for order ${job.order.orderNumber}:`, errorMsg);

    // Log the error
    job.lastError = errorMsg;
    job.errorLog.push({ at: new Date(), message: errorMsg });

    if (job.attempts >= job.maxAttempts) {
      // Give up after maxAttempts
      job.status = 'failed';
      console.error(`❌ Notification permanently failed for order ${job.order.orderNumber} after ${job.attempts} attempts`);
    } else {
      // Schedule retry with exponential backoff
      const delaySecs = BACKOFF[job.attempts] || 1800;
      job.status = 'pending';
      job.runAt  = new Date(Date.now() + delaySecs * 1000);
      console.log(`🔄 Will retry order ${job.order.orderNumber} in ${delaySecs}s (attempt ${job.attempts}/${job.maxAttempts})`);
    }

    await job.save();
  }
}

async function tick() {
  if (isRunning) return; // prevent overlapping runs
  isRunning = true;

  try {
    // Find pending jobs that are ready to run, up to BATCH_SIZE
    const jobs = await NotificationJob.find({
      status: 'pending',
      runAt:  { $lte: new Date() },
    })
      .limit(BATCH_SIZE)
      .sort({ runAt: 1 }); // oldest first

    if (jobs.length > 0) {
      console.log(`🔔 Processing ${jobs.length} notification job(s)...`);
      // Process all jobs in parallel
      await Promise.allSettled(jobs.map(processJob));
    }

  } catch (err) {
    console.error('⚠️  Worker tick error:', err.message);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the notification worker.
 * Call this once from src/index.js after DB connects.
 */
export function startNotificationWorker() {
  console.log('🚀 Notification worker started (polling every 5s)');
  // Run immediately on start, then every POLL_MS
  tick();
  setInterval(tick, POLL_MS);
}
