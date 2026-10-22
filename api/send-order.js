// Vercel serverless function (Node 18+, zero dependencies).
// Receives an order, re-prices it on the server, emails it to YOU via Resend,
// and (if the buyer gave an email) sends them a confirmation too.
//
// Env vars: RESEND_API_KEY, TO_EMAIL, FROM_EMAIL
const { STORE, estimateDelivery } = require("../config.js");
const crypto = require('crypto');
const getProductSettings = require('./_product-settings.js');

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

async function sendMail(apiKey, payload) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (b.website) return res.status(200).json({ ok: true }); // honeypot: bots fill this

  const name = String(b.name || "").trim();
  const phone = String(b.phone || "").trim();

  const address = String(b.address || "").trim();
  const landmark = String(b.landmark || "").trim();
  const city = String(b.city || "").trim();
  const state = String(b.state || "").trim();
  const pincode = String(b.pincode || "").trim();
  const altPhone = "";
  const email = "";
  const product = await getProductSettings();
  const prepaid = b.payment === 'RAZORPAY';
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  if (prepaid) {
    if (!razorpayKeyId || !razorpayKeySecret || !b.razorpayOrderId || !b.razorpayPaymentId || !b.razorpaySignature) {
      return res.status(400).json({ error: 'Payment verification details are missing.' });
    }
    const expected = crypto.createHmac('sha256', razorpayKeySecret).update(`${b.razorpayOrderId}|${b.razorpayPaymentId}`).digest('hex');
    const received = String(b.razorpaySignature);
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(received, 'hex');
    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      return res.status(400).json({ error: 'Payment signature could not be verified.' });
    }
    try {
      const auth = `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`;
      let paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(b.razorpayPaymentId)}`, { headers: { Authorization: auth } });
      let paymentInfo = await paymentRes.json().catch(() => ({}));
      const expectedAmount = Math.round(product.price * Math.min(Math.max(parseInt(b.qty, 10) || 1, 1), 10) * 0.95) * 100;
      if (paymentRes.ok && paymentInfo.status === 'authorized' && paymentInfo.order_id === b.razorpayOrderId && paymentInfo.amount === expectedAmount) {
        // Capture authorized payments before treating the order as paid.
        paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(b.razorpayPaymentId)}/capture`, {
          method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: expectedAmount, currency: 'INR' }),
        });
        paymentInfo = await paymentRes.json().catch(() => ({}));
      }
      if (!paymentRes.ok || paymentInfo.order_id !== b.razorpayOrderId || paymentInfo.amount !== expectedAmount || paymentInfo.currency !== 'INR' || paymentInfo.status !== 'captured') {
        return res.status(400).json({ error: 'Payment is not verified as successful. If money was deducted, contact support before paying again.' });
      }
    } catch (verificationError) {
      console.error('Razorpay verification error:', verificationError.message);
      return res.status(502).json({ error: 'Could not verify payment. Please contact support before trying again.' });
    }
  }
  const qty = Math.min(Math.max(parseInt(b.qty, 10) || 1, 1), 10);

  if (!name || !address || !city || !state) return res.status(400).json({ error: "Missing required fields" });
  if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: "Invalid mobile number" });
  if (!/^\d{6}$/.test(pincode)) return res.status(400).json({ error: "Invalid pincode" });

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.TO_EMAIL;
  const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
  if (!apiKey || !toEmail) {
    console.error("Missing RESEND_API_KEY or TO_EMAIL");
    return res.status(500).json({ error: "Email service not configured" });
  }

  // Server decides price/ID/date — never trust the browser for these.
  const subtotal = product.price * qty;
  const total = prepaid ? Math.round(subtotal * 0.95) : subtotal;
  const orderId = `${STORE.orderPrefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const deliveryDate = estimateDelivery();

  const row = (k, v) => `<tr><td style="padding:6px 12px 6px 0;color:#666">${k}</td><td style="padding:6px 0"><strong>${esc(v)}</strong></td></tr>`;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#212121">
      <h2 style="margin:0 0 12px">New order ${esc(orderId)}</h2>
      <table cellpadding="0" style="border-collapse:collapse">
        ${row("Product", product.productName)}
        ${row("Quantity", qty)}
        ${row("Payment", prepaid ? `PAID via Razorpay — ₹${total}; payment ID ${b.razorpayPaymentId}` : `Cash on Delivery — collect ₹${total}`)}
        ${row("Delivery window", deliveryDate)}
      </table>
      <hr style="border:0;border-top:1px solid #e0e0e0;margin:14px 0">
      <table cellpadding="0" style="border-collapse:collapse">
        ${row("Name", name)}
        ${row("Phone", phone)}
        ${row("Alt. phone", altPhone || "-")}
        ${row("Email", email || "-")}
                ${row("Address", address)}
                ${row("Landmark", landmark || "-")}
        ${row("City", city)}
        ${row("State", state)}
        ${row("Pincode", pincode)}
      </table>
    </div>`;

  try {
    await sendMail(apiKey, {
      from: fromEmail,
      to: [toEmail],
      ...(email ? { reply_to: email } : {}),
      subject: `New order ${orderId} — ${qty} × ${STORE.brand} — ₹${total} — ${prepaid ? "PREPAID" : "COD"}`,
      html,
    });
  } catch (err) {
    console.error("send-order error:", err);
    return res.status(500).json({ error: "Failed to send order" });
  }

  if (false) {
    // Awaited (serverless may freeze after responding) but best-effort: a failed customer email must not fail the order.
    try {
      await sendMail(apiKey, {
      from: fromEmail,
      to: [email],
      subject: `Order confirmed — ${orderId}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px">
        <p>Hi ${esc(name)}, thanks for your order!</p>
        <p><strong>${esc(product.productName)}</strong> × ${qty} — ₹${total} (${prepaid ? "prepaid via UPI" : "pay on delivery"})<br>
        Order ID: <strong>${esc(orderId)}</strong><br>Expected delivery: ${esc(deliveryDate)}</p></div>`,
      });
    } catch (e) {
      console.error("customer mail failed:", e.message);
    }
  }

  // Persist order metrics when Supabase is configured. Email remains the order notification fallback.
  let dashboardTracked = false;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const dbRes = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/store_orders`, {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          order_id: orderId, customer_name: name, phone, address, landmark, city, state, pincode,
          quantity: qty, payment_method: prepaid ? "PREPAID" : "COD", total_amount: total,
          order_status: "PLACED", created_at: new Date().toISOString(),
        }),
      });
      if (!dbRes.ok) console.error("Dashboard order save failed:", dbRes.status, await dbRes.text());
      else dashboardTracked = true;
    } catch (e) { console.error("Dashboard order save failed:", e.message); }
  }

  return res.status(200).json({ ok: true, orderId, deliveryDate, total, prepaid, paymentStatus: prepaid ? 'VERIFIED' : 'COD', dashboardTracked });
};
