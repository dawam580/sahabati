// ==========================================
// Sahabati Interactions - اقتباس من مواقع بيع الكروت
// SEAGM / Midasbuy / Eneba / mdcard patterns
// ==========================================

// Price multipliers per payment method - اقتباس mdcard: الأسعار تختلف
const PAYMENT_MULTIPLIERS = {
  bank_transfer: 1.00,
  one_pay: 1.015,
  telecom_libyana: 1.05,
  telecom_madar: 1.05,
  usdt: 0.97
};
function getPriceForMethod(base, method) {
  const m = PAYMENT_MULTIPLIERS[method] || 1;
  return +(base * m).toFixed(2);
}
function formatPriceLive(price) {
  return price.toFixed(2) + ' د.ل';
}

// Live Search with debounce - اقتباس Eneba/SEAGM
let searchDebounce = null;
let selectedSuggestionIndex = -1;
function handleLiveSearch(value) {
  const q = value.trim().toLowerCase();
  const dd = document.getElementById('search-suggestions');
  const input = document.getElementById('global-search-input');
  if (!dd) return;
  if (searchDebounce) clearTimeout(searchDebounce);
  if (!q || q.length < 1) {
    dd.classList.add('hidden');
    dd.innerHTML = '';
    selectedSuggestionIndex = -1;
    return;
  }
  searchDebounce = setTimeout(() => {
    const games = APP_DATA.games.filter(g => g.nameAr.toLowerCase().includes(q) || g.nameEn.toLowerCase().includes(q));
    const cards = APP_DATA.giftCards.filter(c => c.nameAr.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q) || (c.nominal && c.nominal.toLowerCase().includes(q)));
    // also search packages
    const pkgs = [];
    APP_DATA.games.forEach(g => {
      g.packages.forEach(p => {
        if (p.nameAr.toLowerCase().includes(q)) pkgs.push({game: g, pkg: p});
      });
    });

    const total = games.length + cards.length + pkgs.length;
    if (total === 0) {
      dd.innerHTML = `<div class="p-4 text-center text-xs text-slate-500"><i class="fa-solid fa-magnifying-glass mb-2 block text-lg text-slate-300"></i>لا توجد نتائج لـ "${escapeHtml(value)}"<br><span class="text-[11px]">جرب كلمات مثل: ببجي، نتفليكس، تيك توك</span></div>`;
      dd.classList.remove('hidden');
      return;
    }

    let html = `<div class="p-2 text-[11px] font-bold text-slate-500 border-b border-slate-100">${total} نتيجة لـ "${escapeHtml(value)}"</div>`;

    if (games.length) {
      html += `<div class="p-2"><div class="text-[10px] font-black text-sky-700 mb-1">الألعاب</div>`;
      html += games.slice(0,3).map(g => `
        <button onclick="selectGameFromSearch('${g.id}')" class="w-full text-right p-2.5 rounded-xl hover:bg-sky-50 border border-transparent hover:border-sky-100 flex items-center justify-between transition text-xs">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center text-xs">🎮</span>
            <span class="font-bold text-slate-900">${highlightMatch(g.nameAr, value)}</span>
          </div>
          <span class="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">شحن فوري</span>
        </button>`).join('');
      html += `</div>`;
    }
    if (pkgs.length) {
      html += `<div class="p-2"><div class="text-[10px] font-black text-emerald-700 mb-1">الباقات</div>`;
      html += pkgs.slice(0,4).map(({game, pkg}) => `
        <button onclick="addGamePackageToCartWithFly('${game.id}','${pkg.id}', this)" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-100 flex items-center justify-between transition text-xs">
          <div>
            <div class="font-bold text-slate-900">${highlightMatch(pkg.nameAr, value)} <span class="text-slate-500 font-normal">- ${game.nameAr.split('(')[0]}</span></div>
            <div class="text-[11px] font-black text-emerald-700">${formatPriceLive(getPriceForMethod(pkg.priceLYD, state.paymentMethod))} <span class="text-[10px] text-slate-400 font-normal">(${state.paymentMethod})</span></div>
          </div>
          <span class="bg-emerald-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold">أضف <i class="fa-solid fa-cart-plus mr-1"></i></span>
        </button>`).join('');
      html += `</div>`;
    }
    if (cards.length) {
      html += `<div class="p-2"><div class="text-[10px] font-black text-amber-700 mb-1">البطاقات والاشتراكات</div>`;
      html += cards.slice(0,4).map(c => `
        <button onclick="addGiftCardToCartWithFly('${c.id}', this); closeSearchDropdown()" class="w-full text-right p-2.5 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100 flex items-center justify-between transition text-xs">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-white text-xs"><i class="fa-solid fa-gift"></i></span>
            <div class="text-right">
              <div class="font-bold text-slate-900">${highlightMatch(c.nameAr, value)}</div>
              <div class="text-[11px] font-black text-emerald-700">${formatPriceLive(getPriceForMethod(c.priceLYD, state.paymentMethod))}</div>
            </div>
          </div>
          <span class="bg-white border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold">متوفر</span>
        </button>`).join('');
      html += `</div>`;
    }

    html += `<div class="p-2 border-t border-slate-100"><button onclick="handleSearch('${escapeHtml(value).replace(/'/g, "\\'")}'); closeSearchDropdown()" class="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">عرض كل النتائج <i class="fa-solid fa-arrow-left mr-1"></i></button></div>`;
    dd.innerHTML = html;
    dd.classList.remove('hidden');
    selectedSuggestionIndex = -1;
  }, 260);
}

function highlightMatch(text, query) {
  const q = query.trim();
  if (!q) return escapeHtml(text);
  const re = new RegExp('('+escapeRegExp(q)+')', 'ig');
  return escapeHtml(text).replace(re, '<span class="search-highlight">$1</span>');
}
function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function closeSearchDropdown() {
  const dd = document.getElementById('search-suggestions');
  if (dd) { dd.classList.add('hidden'); dd.innerHTML=''; }
  selectedSuggestionIndex=-1;
}
function selectGameFromSearch(gameId){
  selectGame(gameId);
  navigateTo('games');
  closeSearchDropdown();
  document.getElementById('global-search-input').value='';
  showToast('تم العثور على اللعبة ✓');
}

// Enhanced bind for live search
function enhanceSearch() {
  const input = document.getElementById('global-search-input');
  const dd = document.getElementById('search-suggestions');
  if (!input || !dd) return;
  input.addEventListener('input', (e)=> handleLiveSearch(e.target.value));
  input.addEventListener('focus', (e)=> { if(e.target.value.trim().length>=1) handleLiveSearch(e.target.value); });
  document.addEventListener('click', (e)=>{
    if (!dd.contains(e.target) && e.target !== input) closeSearchDropdown();
  });
  input.addEventListener('keydown', (e)=>{
    const items = dd.querySelectorAll('button');
    if (dd.classList.contains('hidden') || !items.length) return;
    if (e.key === 'ArrowDown'){ e.preventDefault(); selectedSuggestionIndex = Math.min(selectedSuggestionIndex+1, items.length-1); updateSuggestionFocus(items); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); selectedSuggestionIndex = Math.max(selectedSuggestionIndex-1, 0); updateSuggestionFocus(items); }
    else if (e.key === 'Enter'){ if(selectedSuggestionIndex>=0) { e.preventDefault(); items[selectedSuggestionIndex].click(); } else { handleSearch(input.value); closeSearchDropdown(); } }
    else if (e.key === 'Escape'){ closeSearchDropdown(); }
  });
}
function updateSuggestionFocus(items){
  items.forEach((el,i)=>{
    el.classList.toggle('bg-sky-50', i===selectedSuggestionIndex);
    el.classList.toggle('border-sky-100', i===selectedSuggestionIndex);
    if(i===selectedSuggestionIndex) el.scrollIntoView({block:'nearest'});
  });
}

// Cart Drawer - اقتباس mdcard/cart
function openCartDrawer(){
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-drawer-overlay');
  if(!drawer) return;
  renderCartDrawer();
  drawer.classList.remove('closed');
  drawer.classList.add('open');
  drawer.style.transform='translateX(0)';
  drawer.style.visibility='visible';
  overlay.classList.remove('hidden');
  overlay.classList.add('visible');
  document.body.style.overflow='hidden';
  if(navigator.vibrate) navigator.vibrate(20);
}
function closeCartDrawer(){
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-drawer-overlay');
  if(!drawer) return;
  drawer.classList.remove('open');
  drawer.classList.add('closed');
  drawer.style.transform='translateX(115%)';
  drawer.style.visibility='hidden';
  overlay.classList.remove('visible');
  overlay.classList.add('hidden');
  document.body.style.overflow='';
}
function toggleCartDrawer(){
  const drawer = document.getElementById('cart-drawer');
  if(drawer.classList.contains('open')) closeCartDrawer(); else openCartDrawer();
}
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.toggleCartDrawer = toggleCartDrawer;
function renderCartDrawer(){
  const cont = document.getElementById('cart-drawer-items');
  const empty = document.getElementById('cart-drawer-empty');
  const body = document.getElementById('cart-drawer-body');
  const subEl = document.getElementById('cart-drawer-subtotal');
  const totalEl = document.getElementById('cart-drawer-total');
  const countEl = document.getElementById('cart-drawer-count');
  if(!cont) return;
  const count = state.cart.reduce((s,i)=>s+i.quantity,0);
  if(countEl) countEl.textContent = count + ' عنصر';
  if(state.cart.length===0){
    empty.classList.remove('hidden');
    body.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.classList.remove('hidden');
  let subtotal = 0;
  cont.innerHTML = state.cart.map(item=>{
    const price = getPriceForMethod(item.priceLYD, state.paymentMethod);
    const total = price * item.quantity;
    subtotal += total;
    return `<div class="flex gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
      <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-700">
        <i class="fa-solid ${item.type==='game'?'fa-gamepad':'fa-tv'}"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-xs font-black text-slate-900 line-clamp-1">${escapeHtml(item.titleAr)}</div>
        <div class="text-[11px] text-slate-500">${escapeHtml(item.meta)}</div>
        <div class="flex items-center justify-between mt-1">
          <span class="text-xs font-black text-emerald-700">${formatPriceLive(total)}</span>
          <div class="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-0.5">
            <button onclick="updateCartQuantityWithDrawer('${item.cartItemId}', -1)" class="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 text-xs qty-btn">-</button>
            <span class="text-xs font-black w-6 text-center">${item.quantity}</span>
            <button onclick="updateCartQuantityWithDrawer('${item.cartItemId}', 1)" class="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 text-xs qty-btn">+</button>
          </div>
        </div>
      </div>
      <button onclick="removeFromCartWithDrawer('${item.cartItemId}')" class="text-rose-400 hover:text-rose-600 self-start p-1"><i class="fa-solid fa-xmark"></i></button>
    </div>`;
  }).join('');
  let discount = state.appliedPromo ? subtotal * (state.appliedPromo.discountPercent/100) : 0;
  let total = subtotal - discount;
  subEl.textContent = formatPriceLive(subtotal);
  totalEl.textContent = formatPriceLive(total);
  // trust badges
  const hint = document.getElementById('cart-drawer-promo-hint');
  if(hint){
    if(state.appliedPromo) hint.innerHTML = `<span class="text-emerald-700 font-bold">✓ خصم ${state.appliedPromo.discountPercent}% مطبق: -${formatPriceLive(discount)}</span>`;
    else hint.textContent = '';
  }
}
function updateCartQuantityWithDrawer(id, delta){
  updateCartQuantity(id, delta);
  renderCartDrawer();
  if(navigator.vibrate) navigator.vibrate(10);
}
function removeFromCartWithDrawer(id){
  removeFromCart(id);
  renderCartDrawer();
}

// Flying animation - اقتباس Midasbuy/SEAGM
function flyToCart(sourceEl){
  const cartBtn = document.querySelector('button[onclick="toggleCartDrawer()"]') || document.getElementById('cart-drawer-btn') || document.querySelector('.cart-count-badge')?.parentElement;
  if(!sourceEl || !cartBtn) return;
  const srcRect = sourceEl.getBoundingClientRect();
  const cartRect = cartBtn.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'fly-item';
  fly.style.left = srcRect.left + srcRect.width/2 - 20 + 'px';
  fly.style.top = srcRect.top + srcRect.height/2 - 20 + 'px';
  fly.style.width = '40px';
  fly.style.height = '40px';
  fly.style.background = 'linear-gradient(135deg, #0284c7, #10b981)';
  fly.style.display = 'flex';
  fly.style.alignItems = 'center';
  fly.style.justifyContent = 'center';
  fly.style.color = 'white';
  fly.innerHTML = '<i class="fa-solid fa-bag-shopping"></i>';
  document.body.appendChild(fly);
  // force reflow
  fly.getBoundingClientRect();
  fly.style.left = cartRect.left + cartRect.width/2 - 20 + 'px';
  fly.style.top = cartRect.top + cartRect.height/2 - 20 + 'px';
  fly.style.transform = 'scale(0.3)';
  fly.style.opacity = '0.8';
  setTimeout(()=>{
    fly.remove();
    // bounce cart
    cartBtn.animate([{transform:'scale(1)'},{transform:'scale(1.15)'},{transform:'scale(1)'}], {duration:300, easing:'ease-out'});
    if(navigator.vibrate) navigator.vibrate([20,30,20]);
  }, 800);
}
function addGamePackageToCartWithFly(gameId, pkgId, sourceEl){
  flyToCart(sourceEl || event?.target);
  addGamePackageToCart(gameId, pkgId);
  setTimeout(openCartDrawer, 400);
}
function addGiftCardToCartWithFly(cardId, sourceEl){
  flyToCart(sourceEl || event?.target);
  addGiftCardToCart(cardId);
  setTimeout(openCartDrawer, 400);
}

// Override original add to cart to also fly (patch)
const originalAddGame = window.addGamePackageToCart;
const originalAddGift = window.addGiftCardToCart;
window.addGamePackageToCart = function(gameId, pkgId){
  const btn = event?.target?.closest('button');
  if(btn) flyToCart(btn);
  // call original logic without recursion
  const game = APP_DATA.games.find(g=>g.id===gameId);
  const pkg = game?.packages.find(p=>p.id===pkgId);
  if(!game || !pkg) return;
  const playerId = state.verifiedPlayerId || document.getElementById('player-id-input')?.value || 'Player_LY';
  const item = {
    cartItemId: 'item_'+Date.now()+Math.random().toString(36).substr(2,4),
    type:'game', gameId:game.id, packageId:pkg.id,
    titleAr: game.nameAr.split('(')[0]+' - '+pkg.nameAr,
    meta:'Player ID: '+playerId,
    priceLYD: pkg.priceLYD,
    quantity:1
  };
  state.cart.push(item); saveCart(); updateCartUI(); renderCartDrawer();
  showToast('تمت إضافة '+pkg.nameAr+' إلى السلة 🛒');
  // haptic
  if(navigator.vibrate) navigator.vibrate(20);
};
window.addGiftCardToCart = function(cardId){
  const btn = event?.target?.closest('button');
  if(btn) flyToCart(btn);
  const card = APP_DATA.giftCards.find(c=>c.id===cardId);
  if(!card) return;
  const item = {
    cartItemId: 'item_'+Date.now()+Math.random().toString(36).substr(2,4),
    type:'giftcard', cardId:card.id,
    titleAr: card.nameAr,
    meta: card.nominal || 'اشتراك وبطاقة رقمية',
    priceLYD: card.priceLYD,
    quantity:1
  };
  state.cart.push(item); saveCart(); updateCartUI(); renderCartDrawer();
  showToast('تمت إضافة '+card.nameAr+' إلى السلة 🎁');
  if(navigator.vibrate) navigator.vibrate(20);
};

// Phone mask & operator detection - اقتباس مواقع الكروت الليبية
function initPhoneMask(){
  const input = document.getElementById('whatsapp-phone-input');
  const badge = document.getElementById('phone-operator-badge');
  if(!input) return;
  input.addEventListener('input', (e)=>{
    let v = e.target.value.replace(/\D/g,'');
    // limit to 10 digits (libya 09xxxxxxxx)
    if(v.length>10) v=v.slice(0,10);
    // auto prefix 09 if starts with 9
    if(v.length===9 && !v.startsWith('0')) v='0'+v;
    e.target.value = v;
    // operator
    if(!badge) return;
    if(v.startsWith('092') || v.startsWith('091') || v.startsWith('094')) {
      // libyana 92,93,94? actually libyana 92,94 - madar 91,92? simplified
      if(v.startsWith('092') || v.startsWith('094')) { badge.textContent='ليبيانا'; badge.className='operator-badge operator-libyana'; }
      else if(v.startsWith('091') || v.startsWith('092')) { badge.textContent='مدار'; badge.className='operator-badge operator-madar'; }
    } else if(v.length>=2) {
      badge.textContent = v.length===10 ? 'رقم صحيح ✓' : 'غير مكتمل';
      badge.className = 'operator-badge '+(v.length===10?'operator-libyana':'operator-unknown');
    } else {
      badge.textContent=''; badge.className='operator-badge hidden';
    }
    // validation styling
    if(v.length===10) { input.classList.remove('border-rose-300'); input.classList.add('border-emerald-300','bg-emerald-50'); }
    else if(v.length>0) { input.classList.add('border-rose-300'); }
    else { input.classList.remove('border-rose-300','border-emerald-300','bg-emerald-50'); }
  });
}

// Promo inline validation - اقتباس Eneba checkout
function initPromoInline(){
  const input = document.getElementById('promo-code-input');
  const hint = document.getElementById('promo-inline-hint');
  if(!input) return;
  let t=null;
  input.addEventListener('input', ()=>{
    clearTimeout(t);
    const code = input.value.trim().toUpperCase();
    if(!code){ input.classList.remove('promo-valid','promo-invalid'); if(hint) hint.textContent=''; return; }
    t=setTimeout(()=>{
      if(APP_DATA.promoCodes[code]){
        input.classList.remove('promo-invalid'); input.classList.add('promo-valid');
        if(hint) hint.innerHTML = `<span class="text-emerald-700 font-bold">✓ ${APP_DATA.promoCodes[code].description} (-${APP_DATA.promoCodes[code].discountPercent}%)</span>`;
        if(!state.appliedPromo || state.appliedPromo.code!==code){
          state.appliedPromo = {code, ...APP_DATA.promoCodes[code]};
          renderCheckout(); renderCartDrawer();
        }
      } else {
        input.classList.remove('promo-valid'); input.classList.add('promo-invalid');
        if(hint) hint.innerHTML = `<span class="text-rose-600">✗ كود غير صالح</span>`;
        if(state.appliedPromo && state.appliedPromo.code===code){ state.appliedPromo=null; renderCheckout(); renderCartDrawer(); }
      }
    }, 450);
  });
}

// Price live update on payment change - observer
function enhancePriceLive(){
  const originalSelect = window.selectPaymentMethod;
  window.selectPaymentMethod = function(method){
    originalSelect(method);
    // pulse prices
    document.querySelectorAll('.price-live').forEach(el=>{
      el.classList.remove('price-pulse');
      void el.offsetWidth;
      el.classList.add('price-pulse');
    });
    // update drawer
    renderCartDrawer();
    renderCheckout();
    // update gift cards & packages with new price
    // re-render to show new price (debounced)
    setTimeout(()=>{
      renderGiftCards(document.querySelector('.giftcard-cat-btn.bg-sky-600')?.dataset.category || 'all');
      renderGameDetail(state.selectedGame);
    }, 100);
  };
  window.selectGlobalPayment = function(method){
    window.selectPaymentMethod(method);
    showToast('تم اختيار طريقة الدفع: ' + (APP_DATA.settings.paymentMethodsInfo[method]?.title || method));
  };
}

// Skeleton + fade-in - اقتباس Eneba
function initFadeIn(){
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
  }, {threshold:0.08});
  document.querySelectorAll('.fade-in').forEach(el=> obs.observe(el));
  // also observe dynamically added cards
  const gridObs = new MutationObserver(()=>{
    document.querySelectorAll('.fade-in:not(.visible)').forEach(el=> obs.observe(el));
  });
  gridObs.observe(document.body, {childList:true, subtree:true});
}

// Confetti on success - اقتباس Midasbuy
function launchConfetti(){
  const colors = ['#10b981','#0284c7','#f59e0b','#e11d48','#8b5cf6'];
  for(let i=0;i<28;i++){
    const c = document.createElement('div');
    c.className='confetti-piece';
    c.style.left = (Math.random()*100)+'%';
    c.style.top = '-10px';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.transform = `rotate(${Math.random()*360}deg)`;
    c.style.borderRadius = Math.random()>0.5?'50%':'2px';
    document.body.appendChild(c);
    const dur = 1200 + Math.random()*800;
    const x = (Math.random()-0.5)*120;
    c.animate([
      {transform:`translate(0,0) rotate(0deg)`, opacity:1},
      {transform:`translate(${x}px, ${window.innerHeight+100}px) rotate(${720+Math.random()*360}deg)`, opacity:0}
    ], {duration:dur, easing:'cubic-bezier(0.25,0.46,0.45,0.94)'}).onfinish=()=>c.remove();
  }
  if(navigator.vibrate) navigator.vibrate([30,50,30]);
}
// Patch showSuccessModal to add confetti
const origShowSuccess = window.showSuccessModal;
if(origShowSuccess){
  window.showSuccessModal = function(order){
    origShowSuccess(order);
    setTimeout(launchConfetti, 200);
  };
}

// Enhance checkout phone + promo on DOM ready
document.addEventListener('DOMContentLoaded', ()=>{
  enhanceSearch();
  initPhoneMask();
  initPromoInline();
  enhancePriceLive();
  initFadeIn();
  // patch updateCartUI to also render drawer
  const origUpdateCartUI = window.updateCartUI;
  window.updateCartUI = function(){
    origUpdateCartUI();
    renderCartDrawer();
  };
  // close drawer on hash change
  window.addEventListener('hashchange', closeCartDrawer);
  // expose fly functions globally
  window.openCartDrawer = openCartDrawer;
  window.closeCartDrawer = closeCartDrawer;
  window.toggleCartDrawer = toggleCartDrawer;
  window.flyToCart = flyToCart;
  window.addGamePackageToCartWithFly = addGamePackageToCartWithFly;
  window.addGiftCardToCartWithFly = addGiftCardToCartWithFly;
});

// Also patch render functions to add card-interactive + fade-in + price-live
const origRenderCategories = window.renderCategories;
if(origRenderCategories){
  window.renderCategories = function(){
    origRenderCategories();
    document.querySelectorAll('#categories-grid > div').forEach(el=>{ el.classList.add('card-interactive','fade-in'); });
    initFadeIn();
  };
}
const origRenderGiftCards = window.renderGiftCards;
if(origRenderGiftCards){
  window.renderGiftCards = function(filter){
    origRenderGiftCards(filter);
    document.querySelectorAll('#giftcards-grid > div').forEach(el=>{ el.classList.add('card-interactive','fade-in'); });
    // add price-live class to price elements
    document.querySelectorAll('#giftcards-grid .text-base.font-black').forEach(el=> el.classList.add('price-live'));
  };
}
const origRenderGameDetail = window.renderGameDetail;
if(origRenderGameDetail){
  window.renderGameDetail = function(gameId){
    origRenderGameDetail(gameId);
    document.querySelectorAll('#packages-grid > div').forEach(el=>{ el.classList.add('card-interactive','fade-in'); });
    document.querySelectorAll('#packages-grid .text-sm.font-black').forEach(el=> el.classList.add('price-live'));
  };
}
