/**
 * Notification service
 * 1. CUSTOMER — UltraMsg (product image + short clean confirmation)
 * 2. ADMIN    — CallMeBot (quick alert)
 *
 * Env vars (Railway):
 *   ULTRAMSG_INSTANCE = instance165688
 *   ULTRAMSG_TOKEN    = ttgymwtcpbitqvns
 *   CALLMEBOT_API_KEY = 2523881
 *   ADMIN_PHONE       = +201067143628
 */

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

// ── UltraMsg — sends image then text to customer ───────────────────────
async function sendCustomerWhatsApp(order) {
  const instanceId = process.env.ULTRAMSG_INSTANCE || 'instance165688';
  const token      = process.env.ULTRAMSG_TOKEN     || 'ttgymwtcpbitqvns';
  const base       = `https://api.ultramsg.com/${instanceId}`;
  const phone      = '+' + order.customer.phone.replace(/^\+/, '');

  // 1. Product image
  const productImage = order.items?.[0]?.image;
  if (productImage) {
    const imgParams = new URLSearchParams();
    imgParams.append('token',   token);
    imgParams.append('to',      phone);
    imgParams.append('image',   productImage);
    imgParams.append('caption', `${order.items[0].name} — Order #${order.orderNumber}`);

    const imgRes  = await fetch(`${base}/messages/image`, { method: 'POST', body: imgParams });
    const imgJson = await imgRes.json();
    if (imgJson.sent !== 'true') {
      console.warn('Warning: Product image not sent:', imgJson.message || 'unknown');
    }
  }

  // 2. Text confirmation
  const params = new URLSearchParams();
  params.append('token', token);
  params.append('to',    phone);
  params.append('body',  buildCustomerMessage(order));

  const res  = await fetch(`${base}/messages/chat`, { method: 'POST', body: params });
  const json = await res.json();

  if (json.sent === 'true') {
    console.log(`Customer WhatsApp sent to ${phone}`);
  } else {
    throw new Error(`UltraMsg error: ${json.message || JSON.stringify(json)}`);
  }
}

// ── CallMeBot — admin alert ────────────────────────────────────────────
async function sendAdminAlert(order) {
  const text  = encodeURIComponent(buildAdminMessage(order));
  const phone = encodeURIComponent(process.env.ADMIN_PHONE || '+201067143628');
  const key   = process.env.CALLMEBOT_API_KEY || '2523881';
  const url   = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${key}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`CallMeBot error: ${res.status}`);
  console.log('Admin alert sent');
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
      console.error(`${who} failed (order was saved):`, r.reason?.message || r.reason);
    }
  });
}