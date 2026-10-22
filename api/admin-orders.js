// Admin-only sales dashboard API. Requires Supabase + ADMIN_DASHBOARD_PASSWORD env vars.
module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const expected = process.env.ADMIN_DASHBOARD_PASSWORD;
  const supplied = String(req.headers["x-admin-password"] || "");
  if (!expected || supplied.length !== expected.length || supplied !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Dashboard database is not configured yet. Add Supabase environment variables and create the store_orders table." });

  const range = String(req.query.range || "30d");
  const days = ({ today: 1, "7d": 7, "30d": 30, "90d": 90, "365d": 365 })[range] || 30;
  const start = new Date();
  if (range === "today") start.setHours(0,0,0,0);
  else start.setDate(start.getDate() - (days - 1));
  const query = new URLSearchParams({
    select: "order_id,customer_name,quantity,payment_method,total_amount,order_status,created_at",
    created_at: `gte.${start.toISOString()}`,
    order: "created_at.desc",
    limit: "1000",
  });
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/rest/v1/store_orders?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return res.status(502).json({ error: "Could not read order data from database." });
    const orders = await r.json();
    const totalOrders = orders.length;
    const revenue = orders.reduce((n, o) => n + Number(o.total_amount || 0), 0);
    const codOrders = orders.filter(o => o.payment_method === "COD");
    const prepaidOrders = orders.filter(o => o.payment_method === "PREPAID");
    const dayMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
      dayMap[d.toISOString().slice(0,10)] = { date: d.toISOString().slice(0,10), orders: 0, revenue: 0 };
    }
    for (const o of orders) {
      const keyDate = new Date(o.created_at).toISOString().slice(0,10);
      if (dayMap[keyDate]) { dayMap[keyDate].orders++; dayMap[keyDate].revenue += Number(o.total_amount || 0); }
    }
    return res.status(200).json({ range, days, summary: {
      totalOrders, revenue, codOrders: codOrders.length,
      codRevenue: codOrders.reduce((n,o)=>n+Number(o.total_amount||0),0),
      prepaidOrders: prepaidOrders.length,
      prepaidRevenue: prepaidOrders.reduce((n,o)=>n+Number(o.total_amount||0),0),
      averageOrderValue: totalOrders ? Math.round(revenue/totalOrders) : 0,
    }, daily: Object.values(dayMap), orders });
  } catch (e) {
    console.error("admin-orders error:", e.message);
    return res.status(500).json({ error: "Could not load dashboard data." });
  }
};
