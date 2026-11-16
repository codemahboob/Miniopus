// Public product settings only. Never return credentials or private order data.
module.exports = async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const fallback = {
    productName: "2-Tier Adhesive Corner Storage Shelf – 90° Bathroom & Kitchen Organizer",
    description: "Make unused corners useful with this 2-tier adhesive corner shelf. Its compact 90° design helps organize shampoo, soap, skincare, kitchen jars, toiletries and everyday essentials while keeping counters clutter-free. Install without drilling: clean the wall, peel the adhesive backing, press the hooks firmly in place and hang the shelf. Suitable for smooth glass, ceramic tile, marble, wood, painted walls and plaster surfaces. The shelf is described as rust-resistant and waterproof. Allow the adhesive to set before loading and avoid exceeding its safe holding capacity.",
    imageUrl: "/images/photo-1.jpg", price: 490, mrp: 999, rating: 4, reviewCount: 18,
    reviews: [
      {title:"Kaam karta hai",body:"Instagram par dekh kar order kiya tha. Pehle doubt tha, lekin use karne ke baad laga ki product sach me kaam karta hai."},
      {title:"Paisa vasool",body:"Price ke hisaab se quality bahut achhi lagi. Ek bottle kaafi time chal jati hai aur results bhi genuine hain."},
      {title:"Must-have",body:"Bachcho ke kapdo par roz kuch na kuch gir jata hai. Is product ne kaafi baar kapde bachaye hain."}
    ]
  };
  try {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const q = await fetch(`${url.replace(/\/$/, "")}/rest/v1/store_settings?select=value&key=eq.product_settings&limit=1`, {headers:{apikey:key,Authorization:`Bearer ${key}`}});
      if (q.ok) { const rows = await q.json(); if (rows[0] && rows[0].value) return res.status(200).json({...fallback,...rows[0].value}); }
    }
  } catch (e) { console.error("store-config fallback",e.message); }
  return res.status(200).json(fallback);
};
