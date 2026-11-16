// ============ STORE CONFIG — the one file you edit ============
// Read by the browser (script.js) AND the serverless function (api/send-order.js),
// so price and delivery days are always identical on the page and in your order email.
const STORE = {
  brand: "StainRol",
  productName: "2-Tier Adhesive Corner Storage Shelf – 90° Bathroom & Kitchen Organizer",
  price: 490,          // selling price per unit, INR
  mrp: 999,            // crossed-out price per unit, INR
  codEnabled: false,   // set true to re-enable the existing COD checkout flow
  deliveryMinDays: 4,
  deliveryMaxDays: 6,
  orderPrefix: "OD",
};

const _fmt = { day: "numeric", month: "short" };
function _addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
// "28 Oct – 30 Oct"
function estimateDelivery() {
  return `${_addDays(STORE.deliveryMinDays).toLocaleDateString("en-IN", _fmt)} – ${_addDays(STORE.deliveryMaxDays).toLocaleDateString("en-IN", _fmt)}`;
}
// Delivery date label shown in the product and checkout pages.
function deliveryBy() { return _addDays(STORE.deliveryMaxDays).toLocaleDateString("en-IN", _fmt); }

if (typeof module !== "undefined") module.exports = { STORE, estimateDelivery, deliveryBy };
