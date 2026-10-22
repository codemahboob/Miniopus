// Creates a Razorpay order on the server. Never expose RAZORPAY_KEY_SECRET to the browser.
const { STORE } = require('../config.js');
const getProductSettings = require('./_product-settings.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return res.status(503).json({ error: 'Online payment is not configured yet. Please choose Cash on Delivery.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const qty = Math.min(Math.max(parseInt(body.qty, 10) || 1, 1), 10);
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const address = String(body.address || '').trim();
  const city = String(body.city || '').trim();
  const state = String(body.state || '').trim();
  const pincode = String(body.pincode || '').trim();
  if (!name || !address || !city || !state || !/^[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ error: 'Please check your delivery details and try again.' });
  }

  const product = await getProductSettings();
  const amountRupees = Math.round(product.price * qty * 0.95); // same 5% prepaid discount shown at checkout
  const receipt = `${STORE.orderPrefix}-${Date.now().toString(36).toUpperCase()}`.slice(0, 40);
  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: amountRupees * 100, currency: 'INR', receipt, notes: { product: STORE.brand, quantity: String(qty), customer_name: name, customer_phone: phone } }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.id) {
      console.error('Razorpay order creation failed:', response.status, result.error?.code || 'unknown');
      return res.status(502).json({ error: 'Could not start online payment. Please try again or choose Cash on Delivery.' });
    }
    return res.status(200).json({ keyId, razorpayOrderId: result.id, amount: result.amount, currency: result.currency, productName: product.productName, brand: STORE.brand, customerName: name, customerPhone: phone, email: '' });
  } catch (error) {
    console.error('Razorpay order error:', error.message);
    return res.status(502).json({ error: 'Could not connect to the payment service. Please try again.' });
  }
};
