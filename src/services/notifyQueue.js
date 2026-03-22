/**
 * Notification Queue
 *
 * Instead of sending WhatsApp directly in the order request:
 *   1. Save a job to MongoDB (takes ~5ms)
 *   2. Return success to customer immediately
 *   3. Background worker picks up the job and sends WhatsApp
 *
 * This means:
 *   - Order never fails because of WhatsApp
 *   - Can handle 100+ orders/second (MongoDB write is instant)
 *   - Failed messages are retried automatically up to 5 times
 */

import NotificationJob from '../models/NotificationJob.js';

/**
 * Add a notification job to the queue.
 * Called right after saving the order — non-blocking.
 * @param {Object} order - the saved order document
 */
export async function enqueueNotification(order) {
  try {
    await NotificationJob.create({
      order: {
        orderNumber:    order.orderNumber,
        customer:       order.customer,
        delivery:       order.delivery,
        items:          order.items,
        subtotal:       order.subtotal,
        shipping:       order.shipping,
        total:          order.total,
        deliveryMethod: order.deliveryMethod || 'standard',
      },
      status:   'pending',
      runAt:    new Date(), // run immediately
    });
    // Note: we don't await a response — fire and forget into the queue
    console.log(`📬 Notification queued for order ${order.orderNumber}`);
  } catch (err) {
    // Queue failure should NEVER affect the order
    console.error('⚠️  Failed to enqueue notification (order was saved):', err.message);
  }
}
