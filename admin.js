const $ = (s) => document.querySelector(s);
const money = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n||0));
const dateFmt = s => new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
let password = localStorage.getItem('stainrol_admin_password') || '';
let currentRange = '30d';
function showLogin(){ $('#loginCard').classList.remove('hidden'); $('#dashboard').classList.add('hidden'); $('#logout').classList.add('hidden'); }
function showDashboard(){ $('#loginCard').classList.add('hidden'); $('#dashboard').classList.remove('hidden'); $('#logout').classList.remove('hidden'); }
async function load(range=currentRange){
  currentRange=range;
  document.querySelectorAll('[data-range]').forEach(b=>b.classList.toggle('selected',b.dataset.range===range));
  $('#notice').classList.add('hidden');
  try{
    const r=await fetch(`/api/admin-orders?range=${encodeURIComponent(range)}`,{headers:{'x-admin-password':password}});
    const data=await r.json().catch(()=>({}));
    if(r.status===401){localStorage.removeItem('stainrol_admin_password');password='';showLogin();$('#loginError').textContent='Password was not accepted.';return;}
    if(!r.ok){showDashboard();$('#notice').textContent=data.error||'Dashboard could not load.';$('#notice').classList.remove('hidden');clearData();return;}
    showDashboard();render(data);$('#updatedAt').textContent=`Updated ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`;
  }catch(e){showDashboard();$('#notice').textContent='Could not connect. Check your connection and try again.';$('#notice').classList.remove('hidden');}
}
function clearData(){['revenue','orders','codRevenue','prepaidRevenue','aov','codCount','prepaidCount','ordersHint'].forEach(id=>{const e=$('#'+id);if(e)e.textContent=id.includes('Revenue')||id==='revenue'?'₹0':'0';});$('#chart').innerHTML='<div class="no-data">No data available</div>';$('#orderRows').innerHTML='';$('#empty').classList.remove('hidden');}
function render(data){const s=data.summary;$('#revenue').textContent=money(s.revenue);$('#orders').textContent=s.totalOrders.toLocaleString('en-IN');$('#aov').textContent=`${money(s.averageOrderValue)} average order value`;
$('#codRevenue').textContent=money(s.codRevenue);$('#codCount').textContent=`${s.codOrders} COD orders`;
$('#prepaidRevenue').textContent=money(s.prepaidRevenue);$('#prepaidCount').textContent=`${s.prepaidOrders} prepaid orders`;
$('#ordersHint').textContent=`${data.days===1?'Today':`In the last ${data.days} days`}`;
const daily=data.daily||[];const max=Math.max(1,...daily.map(d=>d.revenue));$('#chart').innerHTML='';
const step=Math.max(1,Math.ceil(daily.length/45));const shown=daily.filter((_,i)=>i%step===0||i===daily.length-1);
if(!shown.length){$('#chart').innerHTML='<div class="no-data">No sales recorded yet</div>';}else shown.forEach(d=>{const wrap=document.createElement('div');wrap.className='bar-wrap';const bar=document.createElement('div');bar.className='bar';bar.style.height=`${Math.max(d.revenue?3:1,d.revenue/max*100)}%`;bar.title=`${dateFmt(d.date)} · ${money(d.revenue)} · ${d.orders} orders`;wrap.append(bar);$('#chart').append(wrap);});
$('#chartStart').textContent=daily.length?dateFmt(daily[0].date):'';$('#chartEnd').textContent=daily.length?dateFmt(daily[daily.length-1].date):'';
const rows=$('#orderRows');rows.innerHTML='';(data.orders||[]).slice(0,100).forEach(o=>{const tr=document.createElement('tr');const values=[['order-id',o.order_id||'—'],['',dateFmt(o.created_at)],['',`${o.quantity||1} unit${Number(o.quantity||1)===1?'':'s'}`],['',o.payment_method],['status',o.order_status||'PLACED']];values.forEach((v,i)=>{const td=document.createElement('td');if(i===3){const badge=document.createElement('span');badge.className='payment '+(o.payment_method==='PREPAID'?'prepaid':'cod');badge.textContent=o.payment_method==='PREPAID'?'Prepaid':'COD';td.append(badge);}else{td.className=v[0];td.textContent=v[1];}tr.append(td);});const amount=document.createElement('td');amount.className='right';amount.textContent=money(o.total_amount);tr.append(amount);rows.append(tr);});$('#orderCountLabel').textContent=`${(data.orders||[]).length} orders`;$('#empty').classList.toggle('hidden',!!(data.orders||[]).length);
}
$('#loginForm').addEventListener('submit',e=>{e.preventDefault();password=$('#password').value;localStorage.setItem('stainrol_admin_password',password);load(currentRange);});
$('#logout').addEventListener('click',()=>{localStorage.removeItem('stainrol_admin_password');password='';$('#password').value='';showLogin();});
document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>load(b.dataset.range)));

async function loadProductSettings(){
  const message=$('#productMessage'); if(message){message.textContent='Loading settings…';message.classList.remove('error');}
  try {
    const r=await fetch('/api/admin-settings',{headers:{'x-admin-password':password}});
    const data=await r.json().catch(()=>({}));
    if(r.status===401){localStorage.removeItem('stainrol_admin_password');password='';showLogin();throw new Error('Password was not accepted.');}
    if(!r.ok) throw new Error(data.error||'Could not load product settings.');
    const p=data.product||{};
    $('#psName').value=p.productName||'StainRol Stain Remover Roll-On (50 ml) for Clothes | Instant Spot Cleaner';
    $('#psDescription').value=p.description||'StainRol is a pocket-size roll-on cleaner for quick spot treatment. Roll it over the stain, let it work for a few minutes, then wash as usual. The no-mess roll-on tip lets you apply it only where you need it. Patch-test on a hidden spot first for delicate or dark fabrics.';
    $('#psImage').value=p.imageUrl||'/images/photo-1.jpg'; $('#psPrice').value=p.price??490; $('#psMrp').value=p.mrp??999;
    $('#psRating').value=p.rating??4; $('#psReviewCount').value=p.reviewCount??18;
    const reviews=p.reviews||[{title:'Kaam karta hai',body:'Instagram par dekh kar order kiya tha. Pehle doubt tha, lekin use karne ke baad laga ki product sach me kaam karta hai.'},{title:'Paisa vasool',body:'Price ke hisaab se quality bahut achhi lagi. Ek bottle kaafi time chal jati hai aur results bhi genuine hain.'},{title:'Must-have',body:'Bachcho ke kapdo par roz kuch na kuch gir jata hai. Is product ne kaafi baar kapde bachaye hain.'}];
    for(let i=0;i<3;i++){const v=reviews[i]||{};$('#psReview'+(i+1)+'Title').value=v.title||'';$('#psReview'+(i+1)+'Body').value=v.body||'';}
    updatePhotoPreview(); if(message)message.textContent='Settings loaded.';
  } catch(e){if(message){message.textContent=e.message;message.classList.add('error');}}
}
function updatePhotoPreview(){const input=$('#psImage'),img=$('#psPreview');if(input&&img)img.src=input.value.trim()||'images/photo-1.jpg';}
$('#psImage').addEventListener('input',updatePhotoPreview);
$('#productForm').addEventListener('submit',async e=>{
  e.preventDefault(); const message=$('#productMessage'),button=$('#saveProduct');
  message.textContent='Saving…';message.classList.remove('error');button.disabled=true;
  const product={productName:$('#psName').value,description:$('#psDescription').value,imageUrl:$('#psImage').value,price:Number($('#psPrice').value),mrp:Number($('#psMrp').value),rating:Number($('#psRating').value),reviewCount:Number($('#psReviewCount').value),reviews:[1,2,3].map(i=>({title:$('#psReview'+i+'Title').value,body:$('#psReview'+i+'Body').value}))};
  try{const r=await fetch('/api/admin-settings',{method:'POST',headers:{'content-type':'application/json','x-admin-password':password},body:JSON.stringify({action:'save-product',product})});const data=await r.json().catch(()=>({}));if(r.status===401){localStorage.removeItem('stainrol_admin_password');password='';showLogin();throw new Error('Password was not accepted. Please sign in again.');}if(!r.ok)throw new Error(data.error||'Save failed.');message.textContent='Saved. Refresh the storefront to see changes.';updatePhotoPreview();}catch(err){message.textContent=err.message;message.classList.add('error');}finally{button.disabled=false;}
});

if(password){load();loadProductSettings();}else showLogin();
