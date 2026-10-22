// Shared server-side reader for dashboard-edited public product settings.
const { STORE } = require('../config.js');
module.exports = async function getProductSettings() {
  const fallback = { productName: STORE.productName, price: STORE.price, mrp: STORE.mrp };
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fallback;
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/store_settings?select=value&key=eq.product_settings&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return fallback;
    const rows = await response.json();
    const value = rows?.[0]?.value;
    if (!value || typeof value !== 'object') return fallback;
    return {
      ...fallback,
      ...(typeof value.productName === 'string' && value.productName.trim() ? { productName: value.productName.trim() } : {}),
      ...(Number.isFinite(Number(value.price)) && Number(value.price) > 0 ? { price: Number(value.price) } : {}),
      ...(Number.isFinite(Number(value.mrp)) && Number(value.mrp) > 0 ? { mrp: Number(value.mrp) } : {}),
    };
  } catch (error) {
    console.error('Could not read dashboard product settings:', error.message);
    return fallback;
  }
};
