// Storefront behaviour. Fetch admin-edited product settings before rendering.
(async function initStorefront(){
  try {
    const response = await fetch("/api/store-config");
    if (response.ok) {
      const settings = await response.json();
      if (settings && typeof settings === "object") {
        if (settings.productName) STORE.productName = settings.productName;
        if (Number.isFinite(Number(settings.price))) STORE.price = Number(settings.price);
        if (Number.isFinite(Number(settings.mrp))) STORE.mrp = Number(settings.mrp);
        window.STORE_PRODUCT_SETTINGS = settings;
      }
    }
  } catch (_) {}
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const inr = (n) => "₹" + n.toLocaleString("en-IN");
const disc = Math.round((1 - STORE.price / STORE.mrp) * 100);

// ---------- static bindings ----------
const B = { brand: STORE.brand, discount: disc, priceUnit: inr(STORE.price), productShort: STORE.productName };
const productSettings = window.STORE_PRODUCT_SETTINGS || {};
$$("[data-b]").forEach((e) => (e.textContent = B[e.dataset.b]));
if (productSettings.productName) $("#title").textContent = productSettings.productName;
if (productSettings.description) {
  const desc = $("#tDesc");
  if (desc) { desc.replaceChildren(); productSettings.description.split(/\n+/).filter(Boolean).forEach(line => { const para = document.createElement("p"); para.textContent = line; desc.append(para); }); }
}
if (productSettings.imageUrl) {
  const hero = $("#slides img"); if (hero) { hero.src = productSettings.imageUrl; hero.alt = productSettings.productName || "Product photo"; }
  const checkoutImg = document.querySelector(".card.item img"); if (checkoutImg) checkoutImg.src = productSettings.imageUrl;
}
if (Number.isFinite(Number(productSettings.rating))) {
  const rating = Number(productSettings.rating).toFixed(1);
  const badge = document.querySelector(".rating-badge"); if (badge) { const b=badge.querySelector("b"), em=badge.querySelector("em"); if(b)b.textContent=Number(productSettings.rating).toString(); if(em)em.textContent=String(productSettings.reviewCount ?? 0); badge.setAttribute("aria-label",`Rated ${rating} out of 5, ${productSettings.reviewCount ?? 0} ratings`); }
  const big = document.querySelector(".rbig strong"); if(big)big.textContent=rating;
}
if (productSettings.reviewCount != null) { const count=$("#reviewCount"); if(count)count.textContent=String(productSettings.reviewCount); }
if (Array.isArray(productSettings.reviews)) {
  const cards = [...document.querySelectorAll("#sRev article.rev")];
  productSettings.reviews.slice(0,3).forEach((review,i)=>{ const card=cards[i]; if(!card)return; const title=card.querySelector(".rh b"), body=card.querySelector("p"); if(title)title.textContent=review.title||"Customer review"; if(body)body.textContent=review.body||""; });
}
$("#year").textContent = new Date().getFullYear();
$("#byOut").textContent = deliveryBy();
$("#sBy").textContent = deliveryBy();

let qty = 1, addr = null, pay = "COD", placed = null, cartAdded = false, pin = "";

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 1800);
}

// ---------- prices ----------
function render() {
  const subtotal = STORE.price * qty, mrp = STORE.mrp * qty, save = mrp - subtotal;
  const total = pay === "RAZORPAY" ? Math.round(subtotal * 0.95) : subtotal;
  $("#mrpOut").textContent = mrp.toLocaleString("en-IN");
  $("#priceOut").textContent = inr(total);
  $("#dealPrice").textContent = inr(total);

  // summary + payment
  $("#sPack").textContent = qty;
  $("#sMrp").textContent = inr(mrp);
  $("#sPrice").textContent = inr(total);
  $("#qOut").textContent = qty;
  $("#pdN").textContent = qty;
  $("#pdW").textContent = qty > 1 ? "items" : "item";
  $("#pdMrp").textContent = inr(mrp);
  $("#pdDisc").textContent = "− " + inr(save);
  $("#pdTot").textContent = inr(total);
  $("#pdSave").textContent = `You will save ${inr(save)} on this order`;
  $("#bMrp").textContent = inr(mrp);
  $("#bTot").textContent = inr(total);
  $("#pMrp").textContent = inr(mrp);
  $("#pTot").textContent = inr(total);
  $("#payTot").textContent = inr(total);
  $$(".payamt").forEach((e) => (e.textContent = inr(total)));
  $("#placeBtn").textContent = pay === "RAZORPAY" ? `Pay ${inr(total)}` : "Place Order";
}
$("#qMinus").onclick = () => { qty = Math.max(1, qty - 1); render(); };
$("#qPlus").onclick = () => { qty = Math.min(10, qty + 1); render(); };
render();

// ---------- gallery ----------
const slides = $("#slides"), n = slides.children.length, thumb = $("#progThumb");
thumb.style.width = 100 / n + "%";
const onScroll = () => { thumb.style.left = (slides.scrollLeft / slides.scrollWidth) * 100 + "%"; };
slides.addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true });
$("#wishBtn").onclick = (e) => {
  const b = e.currentTarget, on = b.getAttribute("aria-pressed") !== "true";
  b.setAttribute("aria-pressed", String(on));
  toast(on ? "Added to wishlist" : "Removed from wishlist");
};
$("#shareBtn").onclick = async () => {
  const data = { title: STORE.productName, url: location.origin + location.pathname };
  try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(data.url); toast("Link copied"); } catch (e) { toast(data.url); }
};
$("#backBtn").onclick = () => (history.length > 1 ? history.back() : window.scrollTo({ top: 0, behavior: "smooth" }));

// ---------- title "more" ----------
const title = $("#title"), more = $("#moreBtn");
const fitMore = () => { if (title.classList.contains("clamp")) more.hidden = !(title.scrollHeight > title.clientHeight + 1); };
more.onclick = () => title.classList.remove("clamp");
addEventListener("load", fitMore); addEventListener("resize", fitMore); fitMore();

// ---------- offers / accordions / tabs ----------
$("#dealBtn").onclick = (e) => {
  const open = e.currentTarget.getAttribute("aria-expanded") !== "true";
  e.currentTarget.setAttribute("aria-expanded", String(open));
  $("#offerList").hidden = !open;
};
$$(".sech").forEach((h) =>
  h.addEventListener("click", () => {
    const sec = h.closest(".acc"), open = !sec.classList.contains("open");
    sec.classList.toggle("open", open);
    h.setAttribute("aria-expanded", String(open));
    sec.querySelector(".body").hidden = !open;
  })
);
$$(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    $$(".tab").forEach((x) => x.classList.toggle("on", x === t));
    $("#tSpec").hidden = t.dataset.t !== "tSpec";
    $("#tDesc").hidden = t.dataset.t !== "tDesc";
  })
);

// ---------- delivery location ----------
$("#locBtn").onclick = () => { $("#locForm").hidden = !$("#locForm").hidden; if (!$("#locForm").hidden) $("#locPin").focus(); };
$("#locGo").onclick = () => {
  const v = $("#locPin").value.trim();
  if (!/^\d{6}$/.test(v)) { toast("Enter a valid 6-digit pincode"); return; }
  pin = v; $("#locTxt").textContent = "Deliver to " + v; $("#locAct").textContent = "Change";
  $("#locForm").hidden = true; $("#f-pin").value = v;
};

// ---------- cart buttons ----------
$("#addBtn").onclick = () => {
  if (cartAdded) return go("address");
  cartAdded = true; $("#cartBadge").hidden = false;
  $("#addBtn").textContent = "Go to cart"; toast("Added to cart");
};
$("#cartBtn").onclick = () => (cartAdded ? go("address") : toast("Your cart is empty"));
$("#buyBtn").onclick = () => go("address");

// ======================================================
//  CHECKOUT — 3 steps: Address → Order Summary → Payment
//  (hash routing so the phone's Back button works)
// ======================================================
const co = $("#co");
const STEPS = ["address", "summary", "payment"];
const TITLES = { address: "Add delivery address", summary: "Order summary", payment: "Payments", placed: "Order placed" };

function go(step) { location.hash = step; }

function showStep(h) {
  co.hidden = false; document.documentElement.classList.add("lock");
  ["address", "summary", "payment", "placed"].forEach((s) => ($("#p-" + s).hidden = s !== h));
  $("#coTitle").textContent = TITLES[h];
  $("#steps").hidden = h === "placed";
  const i = STEPS.indexOf(h);
  $$("#steps li").forEach((li, k) => { li.classList.toggle("done", k < i); li.classList.toggle("on", k === i); });
  co.scrollTop = 0;
  if (h === "address" && pin && !$("#f-pin").value) $("#f-pin").value = pin;
  if (h === "summary") renderSummary();
  if (h === "payment") renderPayment();
}
function closeCheckout() { co.hidden = true; document.documentElement.classList.remove("lock"); }

function route() {
  const h = location.hash.slice(1);
  if (placed && h !== "placed") { resetAll(); closeCheckout(); return; }
  if (!["address", "summary", "payment", "placed"].includes(h)) { closeCheckout(); return; }
  if ((h === "summary" || h === "payment") && !addr) { location.replace("#address"); return; }
  if (h === "placed" && !placed) { location.replace("#"); return; }
  showStep(h);
}
addEventListener("hashchange", route);
if (location.hash) history.replaceState(null, "", location.pathname + location.search); // always open on the product
$("#coBack").onclick = () => history.back();

// ----- step 1: address -----
const form = $("#addrForm"), addrErr = $("#addrErr");
form.addEventListener("submit", (e) => {
  e.preventDefault(); addrErr.textContent = "";
  if (!form.checkValidity()) {
    form.reportValidity();
    addrErr.textContent = "Please complete all required fields with valid details.";
    return;
  }
  const d = Object.fromEntries(new FormData(form));
  // Keep only the customer-facing address fields and reliably advance to step 2.
  addr = d;
  go("summary");
});

// ----- step 2: summary -----
function renderSummary() {
  $("#sName").textContent = addr.name;
  $("#sType").hidden = true;
  $("#sAddr").textContent = `${addr.address}, ${addr.city}, ${addr.state} - ${addr.pincode}` + (addr.landmark ? `  (Near ${addr.landmark})` : "");
  $("#sPhone").textContent = addr.phone;
  render();
}
$("#chgAddr").onclick = () => history.back();
$("#vpd").onclick = () => $("#priceDetails").scrollIntoView({ behavior: "smooth", block: "center" });
$("#toPay").onclick = () => go("payment");

// ----- step 3: payment (Razorpay / COD) -----
$$('input[name="pay"]').forEach((r) =>
  r.addEventListener("change", () => {
    pay = r.value;
    $("#optPrepaid").classList.toggle("on", pay === "RAZORPAY");
    $("#optCod").classList.toggle("on", pay === "COD");
    render();
  })
);
function renderPayment() { $("#payErr").textContent = ""; render(); }

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load secure payment checkout."));
    document.head.appendChild(script);
  });
}

async function postJson(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

$("#placeBtn").onclick = async () => {
  const btn = $("#placeBtn"), label = btn.textContent;
  $("#payErr").textContent = "";
  btn.disabled = true; btn.textContent = pay === "RAZORPAY" ? "Starting secure payment…" : "Placing order…";
  try {
    if (pay === "RAZORPAY") {
      const order = await postJson("/api/create-razorpay-order", { ...addr, qty });
      await loadRazorpay();
      btn.disabled = false; btn.textContent = label;
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: order.brand || STORE.brand,
        description: order.productName || STORE.productName,
        order_id: order.razorpayOrderId,
        prefill: { name: order.customerName || addr.name, contact: order.customerPhone || addr.phone, email: order.email || "" },
        theme: { color: "#2874f0" },
        modal: { ondismiss: () => { $("#payErr").textContent = "Payment was not completed. You can try again or choose Cash on Delivery."; } },
        handler: async (response) => {
          btn.disabled = true; btn.textContent = "Verifying payment…";
          try {
            const out = await postJson("/api/send-order", { ...addr, qty, payment: "RAZORPAY", razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature });
            placed = out; showPlaced(out); history.replaceState(null, "", "#placed"); route();
          } catch (err) {
            console.error(err);
            $("#payErr").textContent = err.message || "Payment needs verification. Please contact support before paying again.";
          } finally { btn.disabled = false; if (!placed) render(); }
        }
      });
      checkout.on("payment.failed", (event) => { $("#payErr").textContent = event.error?.description || "Payment failed. Please try again or choose Cash on Delivery."; });
      checkout.open();
      return;
    }
    const out = await postJson("/api/send-order", { ...addr, qty, payment: "COD" });
    placed = out; showPlaced(out); history.replaceState(null, "", "#placed"); route();
  } catch (err) {
    console.error(err);
    $("#payErr").textContent = err.message || "We could not place your order. Please check your details and try again.";
    btn.textContent = label;
  } finally {
    if (!placed) { btn.disabled = false; if (pay === "COD") render(); else btn.textContent = label; }
  }
};

// ----- order placed -----
function showPlaced(o) {
  const setText = (id, value) => {
    const el = $("#" + id);
    if (el) el.textContent = value == null ? "" : String(value);
  };

  setText("okId", o.id || o.orderId || "Confirmed");
  setText("okDate", o.deliveryDate || "Delivery date will be confirmed");
  const amt = Number(o.total || 0);
  if (o.prepaid) {
    setText("okH", "Payment successful!");
    setText("okPay", `Your Razorpay payment of ₹${amt} has been verified. Your order is confirmed.`);
    $("#okUpi").hidden = true;
  } else {
    setText("okPay", `Pay ₹${amt} in cash when your order is delivered.`);
    $("#okUpi").hidden = true;
  }

  // Show a white full-screen animation first, then return to order details.
  let screen = document.getElementById("order-success-animation");
  if (!screen) {
    screen = document.createElement("div");
    screen.id = "order-success-animation";
    screen.innerHTML = '<div id="order-success-lottie"></div><h2>Order placed successfully!</h2><p>Your order is being confirmed</p>';
    document.body.appendChild(screen);
  }
  screen.style.display = "flex";
  screen.style.position = "fixed";
  screen.style.inset = "0";
  screen.style.zIndex = "99999";
  screen.style.background = "#fff";
  screen.style.color = "#171717";
  screen.style.flexDirection = "column";
  screen.style.alignItems = "center";
  screen.style.justifyContent = "center";
  screen.style.textAlign = "center";
  screen.style.fontFamily = "system-ui, sans-serif";
  screen.style.padding = "24px";
  screen.style.boxSizing = "border-box";
  screen.querySelector("#order-success-lottie").style.width = "min(80vw, 340px)";
  screen.querySelector("#order-success-lottie").style.height = "min(80vw, 340px)";

  const reveal = () => {
    screen.style.display = "none";
    const placedSection = document.getElementById("p-placed");
    if (placedSection) placedSection.scrollIntoView({block:"start"});
  };

  const runAnimation = () => {
    if (window.lottie && window.lottie.loadAnimation) {
      try {
        const player = window.lottie.loadAnimation({
          container: screen.querySelector("#order-success-lottie"),
          renderer: "svg",
          loop: false,
          autoplay: true,
          path: "/animations/order-success.json"
        });
        const fallback = setTimeout(reveal, 4500);
        player.addEventListener("complete", () => {
          clearTimeout(fallback);
          setTimeout(reveal, 700);
        });
        player.addEventListener("data_failed", () => {
          clearTimeout(fallback);
          setTimeout(reveal, 1800);
        });
        return;
      } catch (_) {}
    }
    setTimeout(reveal, 2200);
  };

  if (!document.getElementById("lottie-player-script")) {
    const script = document.createElement("script");
    script.id = "lottie-player-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js";
    script.onload = runAnimation;
    script.onerror = () => setTimeout(reveal, 2200);
    document.head.appendChild(script);
  } else {
    runAnimation();
  }
}


function resetAll() {
  placed = null; addr = null; qty = 1; pay = "COD"; cartAdded = false;
  form.reset(); $("#cartBadge").hidden = true; $("#addBtn").textContent = "Add to cart";
  $$('input[name="pay"]').forEach((r) => (r.checked = r.value === "COD"));
  $("#optPrepaid").classList.remove("on"); $("#optCod").classList.add("on");
  render();
}
$("#okClose").onclick = () => { location.replace("#"); };

})();
