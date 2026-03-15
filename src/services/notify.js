/**
 * Notification service — Evolution API (self-hosted)
 *
 * Env vars (Railway backend):
 *   EVOLUTION_URL      = https://evolution-api-production-f929.up.railway.app
 *   EVOLUTION_INSTANCE = MyPhone
 *   EVOLUTION_APIKEY   = lolo100@A
 *   CALLMEBOT_API_KEY  = 2523881
 *   ADMIN_PHONE        = +201067143628
 */

const EVO_URL      = process.env.EVOLUTION_URL      || 'https://evolution-api-production-f929.up.railway.app';
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || 'MyPhone';
const EVO_APIKEY   = process.env.EVOLUTION_APIKEY   || 'lolo100@A';

// ── Customer message ───────────────────────────────────────────────────
function buildCustomerMessage(order) {
  const isPickup    = order.deliveryMethod === 'pickup' ||
                      order.delivery?.address?.toLowerCase().includes('pickup');
  const hasFreeShip = order.shipping === 0;

  const itemLines = order.items.map(i =>
    `🛒 ${i.name} (Size: ${i.size})${i.qty > 1 ? ` × ${i.qty}` : ''} — ${(i.price * i.qty).toLocaleString()} EGP`
  ).join('\n');

  const shippingLine = isPickup
    ? `🏪 Shipping: *FREE (Pickup)* 🎉`
    : hasFreeShip
      ? `🚚 Shipping: *FREE* 🎉`
      : `🚚 Shipping: ${order.shipping} EGP`;

  const addressLine = isPickup
    ? `📍 *Store Pickup* — Khub, Shebin El Kom, Menofia`
    : `📍 ${order.delivery.city}, ${order.delivery.governorate}, Egypt`;

  return `🏪 *HAMEDO SPORT* — Order Confirmed! ✅

Hello *${order.customer.firstName}*! 👋
Your order *#${order.orderNumber}* is confirmed.

${itemLines}
${shippingLine}
💰 *Total: ${order.total?.toLocaleString()} EGP*

${addressLine}
📞 We'll call *${order.customer.phone}* to confirm soon.

━━━━━━━━━━━━━━━━━━━━━━
Thank you for choosing Hamedo Sport! 🎾
📸 instagram.com/hamedo.sport`;
}

// ── Admin alert ────────────────────────────────────────────────────────
function buildAdminMessage(order) {
  const isPickup = order.deliveryMethod === 'pickup' ||
                   order.delivery?.address?.toLowerCase().includes('pickup');
  return `🛒 *New Order!*
Order #: ${order.orderNumber}
Customer: ${order.customer.firstName} ${order.customer.lastName}
Phone: ${order.customer.phone}
Items: ${order.items.length}
Total: ${order.total} EGP
${isPickup ? '🏪 PICKUP — no delivery needed' : `📍 ${order.delivery.city}, ${order.delivery.governorate}`}`;
}

// ── Evolution API helper ───────────────────────────────────────────────
async function evoPost(endpoint, payload) {
  const res = await fetch(`${EVO_URL}/${endpoint}/${EVO_INSTANCE}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey':        EVO_APIKEY,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Evolution API error: ${JSON.stringify(json)}`);
  return json;
}

// ── Send customer WhatsApp (image + text) ─────────────────────────────
async function sendCustomerWhatsApp(order) {
  // Normalize phone — Evolution API wants number only, no +
  const number = order.customer.phone.replace(/^\+/, '');

  // 1. Product image (if available)
  const productImage = order.items?.[0]?.image;
  if (productImage) {
    await evoPost('message/sendMedia', {
      number,
      mediatype: 'image',
      media:     productImage,
      caption:   `${order.items[0].name} — Order #${order.orderNumber}`,
      delay:     500,
    }).catch(err => console.warn('Image send failed:', err.message));
  }

  // 2. Text confirmation
  await evoPost('message/sendText', {
    number,
    text:     buildCustomerMessage(order),
    delay:    1000,
    presence: 'composing',
  });

  console.log(`✅ Customer WhatsApp sent to ${number}`);
}

// ── Send admin alert (CallMeBot) ───────────────────────────────────────
async function sendAdminAlert(order) {
  const text  = encodeURIComponent(buildAdminMessage(order));
  const phone = encodeURIComponent(process.env.ADMIN_PHONE || '+201067143628');
  const key   = process.env.CALLMEBOT_API_KEY || '2523881';
  const url   = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${key}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`CallMeBot error: ${res.status}`);
  console.log('✅ Admin alert sent');
}

// ── Main export ────────────────────────────────────────────────────────
export async function notifyNewOrder(order) {
  const results = await Promise.allSettled([
    sendCustomerWhatsApp(order),
    sendAdminAlert(order),
  ]);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const who = i === 0 ? 'Customer WhatsApp' : 'Admin alert';
      console.error(`⚠️  ${who} failed (order was saved):`, r.reason?.message || r.reason);
    }
  });
}