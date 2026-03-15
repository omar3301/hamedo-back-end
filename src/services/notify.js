/**
 * Notification service — sends WhatsApp message to admin on new orders.
 *
 * Setup (choose one):
 * ─────────────────────────────────────────────────────────────────
 * Option A — Twilio WhatsApp:
 *   npm install twilio
 *   .env: TWILIO_SID=... TWILIO_TOKEN=... TWILIO_WHATSAPP=whatsapp:+14155238886
 *         ADMIN_PHONE=whatsapp:+201XXXXXXXXX
 *
 * Option B — CallMeBot (free, no account needed):
 *   .env: CALLMEBOT_API_KEY=...  (get from https://www.callmebot.com/blog/free-api-whatsapp-messages/)
 *         ADMIN_PHONE=+201XXXXXXXXX
 * ─────────────────────────────────────────────────────────────────
 */

const buildMessage = (order) =>
  `🛒 New Order!\n` +
  `Order #: ${order.orderNumber}\n` +
  `Customer: ${order.customer.firstName} ${order.customer.lastName}\n` +
  `Phone: ${order.customer.phone}\n` +
  `Items: ${order.items.length}\n` +
  `Total: ${order.total} EGP\n` +
  `City: ${order.delivery.city}, ${order.delivery.governorate}`;


// ── Option A — Twilio ───────────────────────────────────────────────────
async function notifyViaTwilio(order) {
  const twilio = (await import('twilio')).default;
  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP,
    to:   process.env.ADMIN_PHONE,
    body: buildMessage(order),
  });
}


// ── Option B — CallMeBot (free WhatsApp API) ────────────────────────────
async function notifyViaCallMeBot(order) {
  const text = encodeURIComponent(buildMessage(order));
  const phone = encodeURIComponent(process.env.ADMIN_PHONE);
  const key   = process.env.CALLMEBOT_API_KEY;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CallMeBot error: ${res.status}`);
}


// ── Main export — auto-selects based on env vars ────────────────────────
export async function notifyNewOrder(order) {
  try {
    if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
      await notifyViaTwilio(order);
    } else if (process.env.CALLMEBOT_API_KEY && process.env.ADMIN_PHONE) {
      await notifyViaCallMeBot(order);
    } else {
      // No notification configured — log to console only
      console.log('📦 New order (no WhatsApp configured):', order.orderNumber);
    }
  } catch (err) {
    // Never crash the order flow because of a notification failure
    console.error('⚠️  Notification failed (order was saved):', err.message);
  }
}
