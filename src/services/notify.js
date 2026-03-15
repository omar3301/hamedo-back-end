/**
 * Notification service — two messages on every order:
 *
 * 1. CUSTOMER message (UltraMsg) — beautiful styled confirmation with product image
 * 2. ADMIN message (CallMeBot) — quick alert to admin phone
 *
 * Required env vars (set in Railway):
 *   ULTRAMSG_INSTANCE  = instance165688
 *   ULTRAMSG_TOKEN     = ttgymwtcpbitqvns
 *   CALLMEBOT_API_KEY  = 2523881
 *   ADMIN_PHONE        = +201067143628
 */

// ── Customer message builder ───────────────────────────────────────────
function buildCustomerMessage(order) {
  const isPickup   = order.deliveryMethod === 'pickup' ||
                     order.delivery?.address?.toLowerCase().includes('pickup') ||
                     order.delivery?.address?.toLowerCase().includes('store');
  const hasFreeShip = order.shipping === 0;

  // Items list
  const itemLines = order.items.map(i =>
    `  - ${i.name} (Size: ${i.size})${i.qty > 1 ? ` × ${i.qty}` : ''} — ${(i.price * i.qty).toLocaleString()} EGP`
  ).join('\n');

  // Delivery section
  const deliveryLine = isPickup
    ? `📍 *Store Pickup* — Khub, Shebin El Kom, Menofia`
    : `📍 *${order.delivery.address}${order.delivery.apt ? ', ' + order.delivery.apt : ''}, ${order.delivery.city}, ${order.delivery.governorate}, Egypt*`;

  const shippingLine = isPickup
    ? `  - Shipping: *FREE (Pickup)* 🎉`
    : hasFreeShip
      ? `  - Shipping: *FREE* 🎉`
      : `  - Shipping: ${order.shipping} EGP`;

  return (
`*🏪 HAMEDO SPORT*
━━━━━━━━━━━━━━━━━━━━━━
✅ *Order Confirmed!*
━━━━━━━━━━━━━━━━━━━━━━

Hello *${order.customer.firstName} ${order.customer.lastName}*! 👋
Your order has been placed successfully.

📦 *Order ID:* #${order.orderNumber}

🛒 *Items:*
${itemLines}

💰 *Price Details:*
  - Subtotal: ${order.subtotal?.toLocaleString() || order.total} EGP
${shippingLine}
  ────────────────
  *Total: ${order.total?.toLocaleString()} EGP*

${isPickup ? '🏪 *Pickup:*' : '🚚 *Delivery Address:*'}
${deliveryLine}

📞 We will call you soon at *${order.customer.phone}* to confirm your order.

⏰ *Estimated Delivery:* 3–5 business days${isPickup ? '\n🏪 *Pickup:* Ready same day or next day' : ''}

━━━━━━━━━━━━━━━━━━━━━━
*Thank you for choosing Hamedo Sport!* 🎾
Instagram: @hamedo.sport`
  );
}

// ── Admin alert builder ────────────────────────────────────────────────
function buildAdminMessage(order) {
  const isPickup = order.deliveryMethod === 'pickup' ||
                   order.delivery?.address?.toLowerCase().includes('pickup');

  return (
`🛒 *New Order!*
Order #: ${order.orderNumber}
Customer: ${order.customer.firstName} ${order.customer.lastName}
Phone: ${order.customer.phone}
Items: ${order.items.length}
Total: ${order.total} EGP
${isPickup ? '🏪 PICKUP — no delivery needed' : `📍 ${order.delivery.city}, ${order.delivery.governorate}`}`
  );
}

// ── UltraMsg (customer WhatsApp with image) ───────────────────────────
async function sendCustomerWhatsApp(order) {
  const instanceId = process.env.ULTRAMSG_INSTANCE || 'instance165688';
  const token      = process.env.ULTRAMSG_TOKEN     || 'ttgymwtcpbitqvns';
  const base       = `https://api.ultramsg.com/${instanceId}`;

  // Normalize phone — must start with country code, no +
  const phone = order.customer.phone.replace(/^\+/, '');

  // 1. Send product image first (first item's image)
  const productImage = order.items?.[0]?.image;
  if (productImage) {
    const imgParams = new URLSearchParams();
    imgParams.append('token',   token);
    imgParams.append('to',      '+' + phone);
    imgParams.append('image',   productImage);
    imgParams.append('caption', `${order.items[0].name} — Your order #${order.orderNumber}`);

    const imgRes = await fetch(`${base}/messages/image`, {
      method: 'POST',
      body:   imgParams,
    });
    const imgJson = await imgRes.json();
    if (imgJson.sent !== 'true') {
      console.warn('⚠️  Image not sent:', imgJson.message || 'unknown');
    }
  }

  // 2. Send the text confirmation message
  const params = new URLSearchParams();
  params.append('token', token);
  params.append('to',    '+' + phone);
  params.append('body',  buildCustomerMessage(order));

  const res  = await fetch(`${base}/messages/chat`, { method: 'POST', body: params });
  const json = await res.json();

  if (json.sent === 'true') {
    console.log(`✅ Customer WhatsApp sent to ${phone}`);
  } else {
    throw new Error(`UltraMsg error: ${json.message || JSON.stringify(json)}`);
  }
}

// ── CallMeBot (admin alert) ────────────────────────────────────────────
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
  // Run both in parallel — if one fails, the other still sends
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