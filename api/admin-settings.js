// Admin-only product settings. Supabase service-role key stays server-side.
const TABLE = "store_settings";
function auth(req) {
  const expected = process.env.ADMIN_DASHBOARD_PASSWORD;
  const supplied = String(req.headers["x-admin-password"] || "");
  return !!expected && supplied.length === expected.length && supplied === expected;
}
async function supabase(path, init = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configure Supabase environment variables first.");
  return fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}
module.exports = async (req, res) => {
  if (!auth(req)) return res.status(401).json({ error: "Unauthorized" });
  try {
    if (req.method === "GET") {
      const r = await supabase(`${TABLE}?select=key,value`);
      if (!r.ok) return res.status(502).json({ error: "Could not read product settings. Check that store_settings table exists." });
      const rows = await r.json();
      const map = Object.fromEntries(rows.map(x => [x.key, x.value]));
      return res.status(200).json({ product: map.product_settings || null });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const body = req.body || {};
    if (body.action !== "save-product") return res.status(400).json({ error: "Unknown action" });
    const v = body.product || {};
    const product = {
      productName: String(v.productName || "").trim().slice(0,180),
      description: String(v.description || "").trim().slice(0,3000),
      imageUrl: String(v.imageUrl || "").trim().slice(0,1000),
      price: Number(v.price), mrp: Number(v.mrp), rating: Number(v.rating), reviewCount: Number(v.reviewCount),
      reviews: Array.isArray(v.reviews) ? v.reviews.slice(0,3).map(r => ({ title:String(r.title||"").slice(0,120), body:String(r.body||"").slice(0,1000) })) : [],
    };
    if (!product.productName || !product.description || !product.imageUrl || !Number.isFinite(product.price) || product.price < 1 || !Number.isFinite(product.mrp) || product.mrp < product.price || !Number.isFinite(product.rating) || product.rating < 0 || product.rating > 5 || !Number.isInteger(product.reviewCount) || product.reviewCount < 0) {
      return res.status(400).json({ error: "Check the product name, description, photo, prices, rating, and review count. MRP must be at least the selling price." });
    }
    if (!product.imageUrl.startsWith("/") && !/^https:\/\//i.test(product.imageUrl)) return res.status(400).json({ error: "Photo URL must be an HTTPS URL or a site path beginning with /." });
    const r = await supabase(`${TABLE}?on_conflict=key`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ key: "product_settings", value: product }]) });
    if (!r.ok) { const msg = await r.text(); console.error("save product settings failed", msg); return res.status(502).json({ error: "Could not save settings. Check the store_settings table and Supabase permissions." }); }
    return res.status(200).json({ ok: true, product });
  } catch (e) {
    console.error("admin-settings error", e.message);
    return res.status(503).json({ error: e.message || "Could not save settings." });
  }
};
