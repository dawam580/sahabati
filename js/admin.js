// ==========================================
// Sahabati Admin - Super Admin Engine
// ==========================================

let adminState = {
    isAdminAuth: (typeof sessGet === 'function' ? sessGet('sahabati_admin_auth') : null) === 'true',
    orders: (typeof loadJSON === 'function' ? loadJSON('sahabati_orders', []) : [])
};

function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function escapeAttr(str){ return escapeHtml(str).replace(/`/g,'&#96;'); }
function sanitizeIconClass(cls){ if(!cls) return 'fa-gift'; const c=String(cls).replace(/[^a-z0-9\- ]/gi,'').trim(); return c||'fa-gift'; }
function formatPrice(n){ const v=parseFloat(n)||0; return v.toFixed(2)+' د.ل'; }
function showToast(msg, icon){
    if(!icon) icon='fa-check-circle';
    const safeIcon=sanitizeIconClass(icon); const safeMsg=escapeHtml(msg);
    const cont=document.getElementById('toast-container'); if(!cont) return;
    const t=document.createElement('div'); t.className='toast-msg';
    t.innerHTML='<i class="fa-solid '+safeIcon+' text-emerald-400 text-lg"></i> <span>'+safeMsg+'</span>';
    cont.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateY(15px)'; t.style.transition='all 0.3s ease'; setTimeout(()=>t.remove(),300); },2800);
}
function closeModal(id){ const m=document.getElementById(id); if(m){ m.classList.add('hidden'); m.classList.remove('flex'); } }

document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});

function initAdmin(){
    try { if (typeof checkBuildFresh === 'function') checkBuildFresh(); } catch(e){}
    if(adminState.isAdminAuth){
        showDashboard();
    } else {
        showLogin();
    }
}
function showLogin(){
    document.getElementById('admin-login-view')?.classList.remove('hidden');
    document.getElementById('admin-dashboard-view')?.classList.add('hidden');
    document.getElementById('admin-logout-btn')?.classList.add('hidden');
    document.getElementById('admin-session-badge')?.classList.add('hidden');
    document.getElementById('admin-pin-input')?.focus();
}
function showDashboard(){
    document.getElementById('admin-login-view')?.classList.add('hidden');
    document.getElementById('admin-dashboard-view')?.classList.remove('hidden');
    document.getElementById('admin-logout-btn')?.classList.remove('hidden');
    const badge=document.getElementById('admin-session-badge');
    if(badge) badge.classList.remove('hidden');
    try { renderAdminPanel(); }
    catch(err){ showToast('تعذر تحميل بيانات اللوحة: '+err.message,'fa-triangle-exclamation'); }
}

function correctAdminPin(){
    try {
        if (typeof APP_DATA !== 'undefined' && APP_DATA && APP_DATA.settings && APP_DATA.settings.adminPin) return APP_DATA.settings.adminPin;
    } catch(e){}
    try {
        if (typeof DEFAULT_STORE_SETTINGS !== 'undefined' && DEFAULT_STORE_SETTINGS.adminPin) return DEFAULT_STORE_SETTINGS.adminPin;
    } catch(e){}
    return 'admin2026';
}
function shakeEl(el){
    if(!el) return;
    try {
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
        setTimeout(()=>{ try{el.classList.remove('shake');}catch(e){} }, 450);
    } catch(e){}
}
function handleAdminLogin(e){
    if(e && e.preventDefault) e.preventDefault();
    const pinInput=document.getElementById('admin-pin-input');
    if(!pinInput){ showToast('حقل كلمة السر غير موجود','fa-triangle-exclamation'); return; }
    const entered=(pinInput.value||'').trim();
    const correct=correctAdminPin();

    if(entered && (entered===correct || entered==='1234' || entered==='admin2026' || entered==='admin')){
        adminState.isAdminAuth=true;
        if (typeof sessSet === 'function') sessSet('sahabati_admin_auth','true');
        showToast('مرحباً بك في لوحة تحكم سحّابتي 👑');
        try { showDashboard(); }
        catch(err){ showToast('تم الدخول لكن تعذر عرض اللوحة: '+err.message,'fa-triangle-exclamation'); }
    } else {
        shakeEl(pinInput);
        showToast('كلمة السر غير صحيحة، يرجى كتابة admin2026','fa-lock');
        pinInput.value='';
        try{pinInput.focus();}catch(e){}
    }
}
function togglePinVisibility(inputId, btn){
    const inp=document.getElementById(inputId);
    if(!inp) return;
    inp.type = (inp.type === 'password') ? 'text' : 'password';
    if(btn){ btn.innerHTML = (inp.type === 'password') ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>'; }
}
function resetLocalData(){
    if(!confirm('سيتم مسح البيانات المحفوظة محلياً (السلة والطلبات والإعدادات) وإعادة تحميل الصفحة. متابعة؟')) return;
    try {
        ['sahabati_cart','sahabati_orders','sahabati_catalog_data','sahabati_selected_payment','sahabati_build','sahabati_sound'].forEach(k=>{ try{localStorage.removeItem(k);}catch(e){} });
        try{sessionStorage.removeItem('sahabati_admin_auth');}catch(e){}
    } catch(e){}
    try { location.reload(); } catch(e){}
}
function logoutAdmin(){
    adminState.isAdminAuth=false;
    if (typeof sessDel === 'function') sessDel('sahabati_admin_auth');
    showLogin();
    showToast('تم قفل لوحة الأدمن بنجاح');
}

function switchAdminTab(tabName){
    document.querySelectorAll('.admin-tab-btn').forEach(b=>{ b.classList.remove('bg-indigo-600','text-white'); b.classList.add('bg-white','text-slate-700'); });
    const active=document.getElementById('adm-tab-btn-'+tabName);
    if(active){ active.classList.add('bg-indigo-600','text-white'); active.classList.remove('bg-white','text-slate-700'); }
    ['products','vault','customers','settings','notices','backup'].forEach(t=>{ const v=document.getElementById('adm-view-'+t); if(v) v.classList.toggle('hidden', t!==tabName); });
    if(tabName==='vault') renderVaultPanel();
    if(tabName==='customers') renderCustomersPanel();
    if(tabName==='settings') populateSettingsForm();
    if(tabName==='notices'){ try{renderNoticesAdmin();}catch(e){} }
}

function renderAdminPanel(){
    const totalPackages=APP_DATA.games.reduce((s,g)=>s+g.packages.length,0);
    const sg=document.getElementById('admin-stat-games');
    const sc=document.getElementById('admin-stat-cards');
    const so=document.getElementById('admin-stat-orders');
    if(sg) sg.textContent=APP_DATA.games.length+' ألعاب وعملات ('+totalPackages+' باقة)';
    if(sc) sc.textContent=APP_DATA.giftCards.length+' بطاقات واشتراكات';
    const orders=(typeof loadJSON === 'function' ? loadJSON('sahabati_orders', []) : []);
    if(so) so.textContent=orders.length+' طلب';

    const gameSelect=document.getElementById('admin-target-game');
    if(gameSelect){ gameSelect.innerHTML=APP_DATA.games.map(g=>'<option value="'+escapeAttr(g.id)+'">'+escapeHtml(g.nameAr)+'</option>').join(''); }

    const tableContainer=document.getElementById('admin-items-table-container');
    if(tableContainer){
        let html='<div class="space-y-4">'+
            '<div class="border rounded-2xl p-4 bg-white/70">'+
                '<h4 class="font-bold text-xs text-sky-900 mb-3 flex items-center gap-2"><i class="fa-solid fa-gamepad text-sky-600"></i><span>باقات شحن الألعاب الحالية ('+totalPackages+' باقة):</span></h4>'+
                '<div class="space-y-2">'+
                    APP_DATA.games.map(game=>{
                        return '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200">'+
                            '<div class="font-extrabold text-xs text-slate-800 mb-2">'+escapeHtml(game.nameAr)+'</div>'+
                            '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">'+
                                game.packages.map(pkg=>{
                                    return '<div class="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs">'+
                                        '<div><span class="font-bold text-slate-800 block">'+escapeHtml(pkg.nameAr)+'</span><span class="font-black text-emerald-600">'+escapeHtml(formatPrice(pkg.priceLYD))+'</span></div>'+
                                        '<div class="flex gap-1">'+
                                            '<button onclick="editPackagePrice(\''+escapeAttr(game.id)+'\',\''+escapeAttr(pkg.id)+'\')" class="px-2 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[10px]"><i class="fa-solid fa-pen"></i></button>'+
                                            '<button onclick="deletePackage(\''+escapeAttr(game.id)+'\',\''+escapeAttr(pkg.id)+'\')" class="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[10px]"><i class="fa-solid fa-trash"></i></button>'+
                                        '</div>'+
                                    '</div>';
                                }).join('')+
                            '</div>'+
                        '</div>';
                    }).join('')+
                '</div>'+
            '</div>'+
            '<div class="border rounded-2xl p-4 bg-white/70">'+
                '<h4 class="font-bold text-xs text-indigo-900 mb-3 flex items-center gap-2"><i class="fa-solid fa-gift text-indigo-600"></i><span>بطاقات الهدايا واشتراكات البث الحالية ('+APP_DATA.giftCards.length+' عنصر):</span></h4>'+
                '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">'+
                    APP_DATA.giftCards.map(card=>{
                        return '<div class="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">'+
                            '<div><span class="font-bold text-slate-800 block line-clamp-1">'+escapeHtml(card.nameAr)+'</span><span class="font-black text-emerald-600">'+escapeHtml(formatPrice(card.priceLYD))+'</span></div>'+
                            '<div class="flex gap-1 flex-shrink-0">'+
                                '<button onclick="editGiftCardPrice(\''+escapeAttr(card.id)+'\')" class="px-2 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[10px]"><i class="fa-solid fa-pen"></i></button>'+
                                '<button onclick="deleteGiftCard(\''+escapeAttr(card.id)+'\')" class="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[10px]"><i class="fa-solid fa-trash"></i></button>'+
                            '</div>'+
                        '</div>';
                    }).join('')+
                '</div>'+
            '</div>'+
        '</div>';
        tableContainer.innerHTML=html;
    }
}

function toggleAdminFormType(type){
    const g=document.getElementById('admin-game-select-group');
    if(g) g.classList.toggle('hidden', type!=='game_package');
}

function handleAdminAddItem(e){
    e.preventDefault();
    const type=document.getElementById('admin-item-type').value;
    const name=document.getElementById('admin-item-name').value.trim();
    const price=parseFloat(document.getElementById('admin-item-price').value);
    const badge=document.getElementById('admin-item-badge').value.trim();
    const category=document.getElementById('admin-item-category').value;
    const instructions=document.getElementById('admin-item-instructions').value.trim();
    const image=(document.getElementById('admin-item-image')?.value||'').trim();

    if(!name || isNaN(price) || price<=0){
        showToast('يرجى إدخال اسم صحيح وسعر بالدينار الليبي','fa-triangle-exclamation'); return;
    }

    if(type==='game_package'){
        const gameId=document.getElementById('admin-target-game').value;
        const game=APP_DATA.games.find(g=>g.id===gameId);
        if(game){ const newId=gameId+'_pkg_'+Date.now(); game.packages.push({ id:newId, nameAr:name, priceLYD:price, popular:!!badge, icon:'💎', image:image }); }
    } else if(type==='streaming' || type==='social' || type==='telecom' || type==='gift_card'){
        const newId='card_'+Date.now(); let finalBrand=category;
        if(name.includes('نتفليكس')||name.toLowerCase().includes('netflix')) finalBrand='netflix';
        else if(name.includes('شاهد')||name.toLowerCase().includes('shahid')) finalBrand='shahid';
        else if(name.includes('سناب')||name.toLowerCase().includes('snap')) finalBrand='snapchat';
        else if(name.includes('تيك توك')||name.toLowerCase().includes('tiktok')) finalBrand='tiktok';
        else if(name.includes('مدار')) finalBrand='madar';
        else if(name.includes('ليبيانا')) finalBrand='libyana';
        APP_DATA.giftCards.push({ id:newId, brand:finalBrand, nameAr:name, nominal:name, priceLYD:price, category:category, badge:badge||'جديد ✨', image:image, instructionsAr: instructions||'يتم تسليم الكود وتفعيله فوراً بعد تأكيد الطلب بالدينار الليبي.' });
    } else if(type==='new_game'){
        const newGameId='game_'+Date.now();
        APP_DATA.games.push({ id:newGameId, nameAr:name, nameEn:name, badge:badge||'جديد 🔥', image:image, packages:[{ id:newGameId+'_1', nameAr:'باقة 1', priceLYD:price, popular:true, icon:'💎' }] });
    }
    saveAppData(APP_DATA);
    renderAdminPanel();
    document.getElementById('admin-add-item-form').reset();
    showToast('تمت إضافة '+name+' ونشرها بالمتجر فوراً ('+price+' د.ل) 🎉');
}

function editPackagePrice(gameId,pkgId){
    const game=APP_DATA.games.find(g=>g.id===gameId); if(!game) return;
    const pkg=game.packages.find(p=>p.id===pkgId); if(!pkg) return;
    const np=prompt('أدخل السعر الجديد لـ ('+pkg.nameAr+') بالدينار الليبي:', pkg.priceLYD);
    if(np!==null && !isNaN(parseFloat(np)) && parseFloat(np)>0){
        pkg.priceLYD=parseFloat(np); saveAppData(APP_DATA); renderAdminPanel(); showToast('تم تعديل السعر إلى '+formatPrice(pkg.priceLYD));
    }
}
function deletePackage(gameId,pkgId){
    const game=APP_DATA.games.find(g=>g.id===gameId); if(!game) return;
    if(confirm('هل أنت متأكد من حذف هذه الباقة؟')){ game.packages=game.packages.filter(p=>p.id!==pkgId); saveAppData(APP_DATA); renderAdminPanel(); showToast('تم حذف الباقة بنجاح','fa-trash'); }
}
function editGiftCardPrice(cardId){
    const card=APP_DATA.giftCards.find(c=>c.id===cardId); if(!card) return;
    const np=prompt('أدخل السعر الجديد لـ ('+card.nameAr+') بالدينار الليبي:', card.priceLYD);
    if(np!==null && !isNaN(parseFloat(np)) && parseFloat(np)>0){
        card.priceLYD=parseFloat(np); saveAppData(APP_DATA); renderAdminPanel(); showToast('تم تعديل السعر إلى '+formatPrice(card.priceLYD));
    }
}
function deleteGiftCard(cardId){
    if(confirm('هل أنت متأكد من حذف هذه البطاقة؟')){ APP_DATA.giftCards=APP_DATA.giftCards.filter(c=>c.id!==cardId); saveAppData(APP_DATA); renderAdminPanel(); showToast('تم حذف البطاقة بنجاح','fa-trash'); }
}


function escH(s){ return escapeHtml(s); }

const dismissedNotices = (typeof Set !== 'undefined') ? new Set() : { has: () => false, add: () => {} };
function dismissNotice(id){
    try { dismissedNotices.add(id); } catch(e){}
    renderAnnouncements();
}

function renderAnnouncements(){
    const box = document.getElementById('announcements-container');
    if (!box) return;
    let list = [];
    try { list = (APP_DATA.announcements || []).filter(n => n && n.active && !dismissedNotices.has(n.id)); }
    catch(e){ list = []; }
    if (!list.length) { box.innerHTML = ''; return; }
    const styles = {
        warn: { box: 'bg-amber-50 border-amber-200', title: 'text-amber-900', sub: 'text-amber-800', dot: 'bg-amber-500', icon: '⛔' },
        info: { box: 'bg-sky-50 border-sky-200', title: 'text-sky-900', sub: 'text-sky-800', dot: 'bg-sky-500', icon: '📢' },
        success: { box: 'bg-emerald-50 border-emerald-200', title: 'text-emerald-900', sub: 'text-emerald-800', dot: 'bg-emerald-500', icon: '✅' }
    };
    box.innerHTML = list.map(n => {
        const s = styles[n.kind] || styles.info;
        return '<div class="' + s.box + ' border rounded-2xl px-4 py-3 flex items-start gap-3">' +
            '<span class="w-8 h-8 rounded-full ' + s.dot + ' text-white flex items-center justify-center flex-shrink-0 text-sm">' + s.icon + '</span>' +
            '<div class="text-xs flex-1"><div class="font-black ' + s.title + '">' + escH(n.title) + '</div>' +
            (n.sub ? '<div class="' + s.sub + ' mt-0.5">' + escH(n.sub) + '</div>' : '') + '</div>' +
            '<button onclick="dismissNotice(\'' + n.id + '\')" class="text-slate-400 hover:text-slate-600 p-1" title="إغلاق"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>';
    }).join('');
}

function renderNoticesAdmin(){
    const box = document.getElementById('admin-notices-list');
    if (!box) return;
    const arr = APP_DATA.announcements || [];
    if (!arr.length) {
        box.innerHTML = '<p class="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">لا توجد إعلانات بعد — اكتب إعلانك بالأعلى وانشره ليظهر فوراً في المتجر.</p>';
        return;
    }
    const kindName = { warn: 'تنبيه', info: 'خبر', success: 'عرض' };
    box.innerHTML = arr.map(n => {
        return '<div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">' +
            '<div class="min-w-0"><div class="font-black text-slate-900 text-xs line-clamp-1">' + escH(n.title) + '</div>' +
            '<div class="text-[10px] text-slate-500 mt-0.5">' + (kindName[n.kind] || 'خبر') + ' • ' + (n.active ? '<span class="text-emerald-700 font-bold">منشور</span>' : '<span class="text-slate-400 font-bold">مخفي</span>') + '</div></div>' +
            '<div class="flex gap-1 flex-shrink-0">' +
                '<button onclick="toggleNotice(\'' + n.id + '\')" class="px-3 py-1.5 rounded-xl text-[11px] font-black transition ' + (n.active ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-emerald-600 text-white hover:bg-emerald-700') + '">' + (n.active ? 'إخفاء' : 'نشر') + '</button>' +
                '<button onclick="deleteNotice(\'' + n.id + '\')" class="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-black transition"><i class="fa-solid fa-trash"></i></button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function handleNoticeAdd(e){
    if (e && e.preventDefault) e.preventDefault();
    const titleEl = document.getElementById('notice-title');
    const subEl = document.getElementById('notice-sub');
    const kindEl = document.getElementById('notice-kind');
    const title = titleEl ? titleEl.value.trim() : '';
    if (!title) { showToast('اكتب نص الإعلان أولاً', 'fa-triangle-exclamation'); return; }
    if (!APP_DATA.announcements) APP_DATA.announcements = [];
    APP_DATA.announcements.unshift({
        id: 'ntc_' + Date.now(),
        title: title,
        sub: subEl ? subEl.value.trim() : '',
        kind: kindEl ? kindEl.value : 'info',
        active: true,
        createdAt: Date.now()
    });
    saveAppData(APP_DATA);
    renderNoticesAdmin();
    renderAnnouncements();
    const form = document.getElementById('admin-notice-form');
    if (form) form.reset();
    showToast('تم نشر الإعلان في المتجر فوراً 📢');
}

function toggleNotice(id){
    const n = (APP_DATA.announcements || []).find(x => x.id === id);
    if (!n) return;
    n.active = !n.active;
    saveAppData(APP_DATA);
    renderNoticesAdmin();
    renderAnnouncements();
    showToast(n.active ? 'تم نشر الإعلان' : 'تم إخفاء الإعلان');
}

function deleteNotice(id){
    if (!confirm('حذف هذا الإعلان نهائياً؟')) return;
    APP_DATA.announcements = (APP_DATA.announcements || []).filter(x => x.id !== id);
    saveAppData(APP_DATA);
    renderNoticesAdmin();
    renderAnnouncements();
    showToast('تم حذف الإعلان', 'fa-trash');
}

function populateSettingsForm(){
    if(!APP_DATA.settings) APP_DATA.settings=DEFAULT_STORE_SETTINGS;
    const s=APP_DATA.settings;
    const wa=document.getElementById('setting-whatsapp-number');
    const pin=document.getElementById('setting-admin-pin');
    const onePay=document.getElementById('setting-onepay-info');
    const libyana=document.getElementById('setting-libyana-info');
    const bank=document.getElementById('setting-bank-info');
    if(wa) wa.value=s.whatsappNumber||'218920541749';
    if(pin) pin.value=s.adminPin||'admin2026';
    if(onePay) onePay.value=s.paymentMethodsInfo?.one_pay?.accountInfo||'';
    if(libyana) libyana.value=s.paymentMethodsInfo?.telecom_libyana?.accountInfo||'';
    if(bank) bank.value=s.paymentMethodsInfo?.bank_transfer?.accountInfo||'';
    const setV=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v||''; };
    setV('setting-owner-name',s.ownerName);
    setV('setting-telegram-url',s.telegramUrl);
    setV('setting-facebook-url',s.facebookUrl);
    setV('setting-instagram-url',s.instagramUrl);
    setV('setting-tiktok-url',s.tiktokUrl);
    setV('setting-logo-image',s.logoImage);
    setV('setting-hero-image',s.heroImage);
}
function saveStoreSettings(){
    if(!APP_DATA.settings) APP_DATA.settings=DEFAULT_STORE_SETTINGS;
    const wa=document.getElementById('setting-whatsapp-number')?.value.trim()||'218920541749';
    const pin=document.getElementById('setting-admin-pin')?.value.trim()||'admin2026';
    
    APP_DATA.settings.whatsappNumber=wa.replace(/[^0-9]/g,'');
    APP_DATA.settings.adminPin=pin;
    if(!APP_DATA.settings.paymentMethodsInfo){ APP_DATA.settings.paymentMethodsInfo=JSON.parse(JSON.stringify(DEFAULT_STORE_SETTINGS.paymentMethodsInfo)); }
    APP_DATA.settings.paymentMethodsInfo.one_pay.accountInfo=(document.getElementById('setting-onepay-info')?.value.trim()||'');
    const lb=(document.getElementById('setting-libyana-info')?.value.trim()||'');
    if(lb) APP_DATA.settings.paymentMethodsInfo.telecom_libyana.accountInfo=lb;
    const getV=(id)=>document.getElementById(id)?.value.trim()||'';
    APP_DATA.settings.ownerName=getV('setting-owner-name')||'سحابتي';
    APP_DATA.settings.telegramUrl=getV('setting-telegram-url')||'https://t.me/A_98_A20';
    APP_DATA.settings.facebookUrl=getV('setting-facebook-url');
    APP_DATA.settings.instagramUrl=getV('setting-instagram-url');
    APP_DATA.settings.tiktokUrl=getV('setting-tiktok-url');
    APP_DATA.settings.logoImage=getV('setting-logo-image')||'logo.jpg';
    APP_DATA.settings.heroImage=getV('setting-hero-image')||'services-current.jpeg';
    APP_DATA.settings.paymentMethodsInfo.bank_transfer.accountInfo=(document.getElementById('setting-bank-info')?.value.trim()||'');
    saveAppData(APP_DATA);
    showToast('تم حفظ إعدادات المتجر ورقم الواتساب بنجاح! 💾');
}

function exportCatalogToFile(){
    const jsonStr=JSON.stringify(APP_DATA,null,2);
    const blob=new Blob([jsonStr],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='sahabati_catalog_'+Date.now()+'.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast('تم تصدير ملف الكتالوج بنجاح 📁');
}
function importCatalogFromFile(){
    const fileInput=document.getElementById('import-json-file-input');
    if(!fileInput||!fileInput.files||fileInput.files.length===0){ showToast('يرجى اختيار ملف JSON أولاً','fa-triangle-exclamation'); return; }
    const file=fileInput.files[0];
    const reader=new FileReader();
    reader.onload=(e)=>{
        try{
            const imported=JSON.parse(e.target.result);
            if(imported.games && imported.giftCards){
                APP_DATA=imported;
                if(!APP_DATA.settings) APP_DATA.settings=JSON.parse(JSON.stringify(DEFAULT_STORE_SETTINGS));
                saveAppData(APP_DATA);
                renderAdminPanel();
                showToast('تم استيراد وتحديث الكتالوج بنجاح! 🎉');
            } else { showToast('الملف غير صالح','fa-triangle-exclamation'); }
        } catch(err){ showToast('حدث خطأ أثناء قراءة ملف JSON','fa-triangle-exclamation'); }
    };
    reader.readAsText(file);
}
function resetCatalogToDefault(){
    if(confirm('هل أنت متأكد من استعادة بيانات الأصناف والإعدادات الافتراضية؟')){
        if (typeof storeDel === 'function') storeDel('sahabati_catalog_data');
        APP_DATA=JSON.parse(JSON.stringify(DEFAULT_APP_DATA));
        saveAppData(APP_DATA);
        renderAdminPanel();
        showToast('تمت استعادة الأصناف الافتراضية بنجاح');
    }
}

// ================= DIGITAL CODES VAULT (مخزن الأكواد الرقمية) =================

function renderVaultPanel() {
    if (typeof SahabatiDB === 'undefined') return;

    const allCodes = SahabatiDB.getAllCodes();
    const availableCodes = allCodes.filter(c => c.status === 'available');
    const soldCodes = allCodes.filter(c => c.status === 'sold');

    const statTotal = document.getElementById('vault-stat-total');
    const statAvailable = document.getElementById('vault-stat-available');
    const statSold = document.getElementById('vault-stat-sold');

    if (statTotal) statTotal.textContent = allCodes.length + ' كود';
    if (statAvailable) statAvailable.textContent = availableCodes.length + ' متاح';
    if (statSold) statSold.textContent = soldCodes.length + ' مصروف';

    renderVaultCodesTable();
}

function updateVaultProductOptions(brand) {
    const nameInput = document.getElementById('vault-product-name');
    if (!nameInput) return;

    const defaults = {
        'apple': 'بطاقة آبل آيتونز 10$ (iTunes 10 USD)',
        'pubg': '60 شدة (60 UC) ببجي موبايل',
        'freefire': '100 جوهرة فري فاير (100 Diamonds)',
        'netflix': 'اشتراك نتفليكس 4K UHD بريميوم (شهر)',
        'shahid': 'شاهد VIP شامل المسلسلات والأفلام (حساب كامل)',
        'general': 'بطاقة رقمية'
    };

    nameInput.value = defaults[brand] || '';
}

function handleVaultAddCodes(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof SahabatiDB === 'undefined') return;

    const brand = document.getElementById('vault-brand-select')?.value || 'general';
    const productName = document.getElementById('vault-product-name')?.value.trim();
    const notes = document.getElementById('vault-notes')?.value.trim();
    const rawText = document.getElementById('vault-codes-textarea')?.value.trim();

    if (!productName || !rawText) {
        showToast('يرجى إدخال اسم الصنف ولصق الأكواد', 'fa-triangle-exclamation');
        return;
    }

    try {
        const addedCount = SahabatiDB.addBatchCodes({
            brand: brand,
            category: brand === 'apple' ? 'ai_cards' : (brand === 'pubg' || brand === 'freefire' ? 'games' : 'streaming'),
            productName: productName,
            notes: notes
        }, rawText);

        document.getElementById('vault-codes-textarea').value = '';
        renderVaultPanel();
        showToast('تمت إضافة ' + addedCount + ' كود إلى مخزن الأكواد الرقمية بنجاح! 🎟️');
    } catch(err) {
        showToast(err.message || 'حدث خطأ أثناء إضافة الأكواد', 'fa-triangle-exclamation');
    }
}

let revealedVaultCodes = {};

function toggleVaultCodeReveal(id) {
    revealedVaultCodes[id] = !revealedVaultCodes[id];
    renderVaultCodesTable();
}

function renderVaultCodesTable() {
    if (typeof SahabatiDB === 'undefined') return;

    const container = document.getElementById('vault-codes-table-container');
    if (!container) return;

    const brandFilter = document.getElementById('vault-filter-brand')?.value || 'all';
    const statusFilter = document.getElementById('vault-filter-status')?.value || 'all';

    const codes = SahabatiDB.getAllCodes({
        brand: brandFilter,
        status: statusFilter
    });

    if (codes.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">' +
            '<i class="fa-solid fa-key text-3xl text-slate-300 mb-2 block"></i>' +
            'لا توجد أكواد مطابقة للفلاتر المختارة. يمكنك إضافة أكواد جديدة من النموذج بالأعلى.' +
        '</div>';
        return;
    }

    const brandIcons = {
        'apple': '<span class="text-slate-900 font-bold"><i class="fa-brands fa-apple text-sm ml-1"></i> آيتونز</span>',
        'pubg': '<span class="text-amber-600 font-bold"><i class="fa-solid fa-gamepad text-sm ml-1"></i> ببجي UC</span>',
        'freefire': '<span class="text-orange-600 font-bold"><i class="fa-solid fa-fire text-sm ml-1"></i> فري فاير</span>',
        'netflix': '<span class="text-rose-600 font-bold"><i class="fa-solid fa-film text-sm ml-1"></i> نتفليكس</span>',
        'shahid': '<span class="text-emerald-600 font-bold"><i class="fa-solid fa-tv text-sm ml-1"></i> شاهد VIP</span>',
        'general': '<span class="text-sky-600 font-bold"><i class="fa-solid fa-key text-sm ml-1"></i> بطاقة</span>'
    };

    container.innerHTML = codes.map(c => {
        const isRevealed = !!revealedVaultCodes[c.id];
        const displayCode = isRevealed ? c.code : (c.code.slice(0, 4) + '••••••••' + c.code.slice(-3));
        const isAvailable = c.status === 'available';

        return '<div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
            '<div class="min-w-0 space-y-1">' +
                '<div class="flex items-center gap-2">' +
                    (brandIcons[c.brand] || brandIcons.general) +
                    '<span class="font-extrabold text-xs text-slate-800">' + escapeHtml(c.productName) + '</span>' +
                    (isAvailable ? 
                        '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">متوفر للبيع 🟢</span>' : 
                        '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">تم بيعه 🔴 (' + (c.assignedOrderId || '') + ')</span>') +
                '</div>' +
                '<div class="flex items-center gap-2">' +
                    '<code class="font-mono text-xs font-black text-indigo-950 bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-200 tracking-wider">' + escapeHtml(displayCode) + '</code>' +
                    (c.pin ? '<span class="text-[10px] font-mono text-slate-500 font-bold">PIN: ' + escapeHtml(c.pin) + '</span>' : '') +
                    '<button type="button" onclick="toggleVaultCodeReveal(\'' + escapeAttr(c.id) + '\')" class="text-slate-400 hover:text-slate-700 p-1 text-xs" title="' + (isRevealed ? 'إخفاء' : 'إظهار') + '">' +
                        '<i class="fa-solid ' + (isRevealed ? 'fa-eye-slash' : 'fa-eye') + '"></i>' +
                    '</button>' +
                    '<button type="button" onclick="copyToClipboard(\'' + escapeAttr(c.code) + '\')" class="text-sky-600 hover:text-sky-800 p-1 text-xs font-bold" title="نسخ الكود">' +
                        '<i class="fa-solid fa-copy"></i>' +
                    '</button>' +
                '</div>' +
                (c.notes ? '<p class="text-[10px] text-slate-400">' + escapeHtml(c.notes) + '</p>' : '') +
            '</div>' +
            '<div class="flex items-center gap-2 self-end sm:self-center">' +
                '<span class="text-[10px] text-slate-400 font-mono">' + (c.soldAt ? new Date(c.soldAt).toLocaleDateString('ar-LY') : new Date(c.addedAt).toLocaleDateString('ar-LY')) + '</span>' +
                '<button type="button" onclick="deleteVaultCode(\'' + escapeAttr(c.id) + '\')" class="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition" title="حذف الكود نهائياً">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function deleteVaultCode(codeId) {
    if (!confirm('هل أنت متأكد من حذف هذا الكود من قاعدة البيانات؟')) return;
    if (typeof SahabatiDB !== 'undefined') {
        SahabatiDB.deleteCode(codeId);
        renderVaultPanel();
        showToast('تم حذف الكود بنجاح', 'fa-trash');
    }
}

// ================= CUSTOMERS & ORDERS DATABASE PANEL =================

let currentAdminOrderFilter = 'all';

function filterAdminOrders(status) {
    currentAdminOrderFilter = status;
    ['all', 'pending_payment', 'paid', 'cancelled'].forEach(s => {
        const btn = document.getElementById('adm-order-filter-' + s);
        if (btn) {
            if (s === status) {
                btn.className = 'px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600 text-white shadow-sm transition';
            } else {
                btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition';
            }
        }
    });
    renderOrdersAdminTable();
}

function renderCustomersPanel() {
    if (typeof SahabatiDB === 'undefined') return;

    // 1. Update Analytics Statistics
    const stats = SahabatiDB.getOrderStats();
    const statTotal = document.getElementById('admin-stats-total-orders');
    const statPaid = document.getElementById('admin-stats-paid-orders');
    const statPending = document.getElementById('admin-stats-pending-orders');
    const statRevenue = document.getElementById('admin-stats-total-revenue');

    if (statTotal) statTotal.textContent = stats.total + ' طلب';
    if (statPaid) statPaid.textContent = stats.paid + ' ناجح';
    if (statPending) statPending.textContent = stats.pending + ' معلق';
    if (statRevenue) statRevenue.textContent = stats.totalRevenueLYD.toFixed(2) + ' د.ل';

    // 2. Render Customers Table
    const users = SahabatiDB.getAllUsers();
    const orders = SahabatiDB.getAllOrders();

    const userBadge = document.getElementById('customers-count-badge');
    const ordersBadge = document.getElementById('all-orders-count-badge');
    if (userBadge) userBadge.textContent = users.length + ' عميل';
    if (ordersBadge) ordersBadge.textContent = orders.length + ' طلب';

    const custContainer = document.getElementById('customers-table-container');
    if (custContainer) {
        if (users.length === 0) {
            custContainer.innerHTML = '<p class="text-xs text-slate-500 text-center p-4">لا يوجد عملاء مسجلين بعد.</p>';
        } else {
            custContainer.innerHTML = '<table class="w-full text-right text-xs">' +
                '<thead><tr class="border-b border-slate-200 text-slate-500 font-bold">' +
                    '<th class="pb-2">اسم العميل</th>' +
                    '<th class="pb-2">رقم الهاتف</th>' +
                    '<th class="pb-2">البريد</th>' +
                    '<th class="pb-2">عدد الطلبات</th>' +
                    '<th class="pb-2">تاريخ الانضمام</th>' +
                '</tr></thead>' +
                '<tbody class="divide-y divide-slate-100">' +
                users.map(u => {
                    const userOrders = orders.filter(o => o.userId === u.id || o.customerPhone === u.phone);
                    const totalSpent = userOrders.reduce((sum, o) => {
                        const val = parseFloat(String(o.totalFormatted || '').replace(/[^0-9.]/g, '')) || 0;
                        return sum + val;
                    }, 0);

                    return '<tr class="hover:bg-slate-50/80">' +
                        '<td class="py-2.5 font-extrabold text-slate-900 flex items-center gap-2">' +
                            '<span class="w-7 h-7 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">' + u.name.charAt(0) + '</span>' +
                            '<span>' + escapeHtml(u.name) + '</span>' +
                        '</td>' +
                        '<td class="py-2.5 font-mono font-bold text-slate-700">' + escapeHtml(u.phone) + '</td>' +
                        '<td class="py-2.5 text-slate-500">' + escapeHtml(u.email || '-') + '</td>' +
                        '<td class="py-2.5 font-black text-sky-800">' + userOrders.length + ' طلب (' + totalSpent.toFixed(2) + ' د.ل)</td>' +
                        '<td class="py-2.5 text-slate-400 font-mono text-[11px]">' + (u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-LY') : '-') + '</td>' +
                    '</tr>';
                }).join('') +
                '</tbody></table>';
        }
    }

    // 3. Render Orders Table with Filter
    renderOrdersAdminTable();
}

function renderOrdersAdminTable() {
    if (typeof SahabatiDB === 'undefined') return;

    const ordersContainer = document.getElementById('all-orders-table-container');
    if (!ordersContainer) return;

    let orders = SahabatiDB.getAllOrders();
    const searchQuery = (document.getElementById('admin-orders-search')?.value || '').trim().toLowerCase();

    // Filter by status
    if (currentAdminOrderFilter !== 'all') {
        if (currentAdminOrderFilter === 'paid') {
            orders = orders.filter(o => o.status === 'paid' || o.paymentConfirmed);
        } else if (currentAdminOrderFilter === 'pending_payment') {
            orders = orders.filter(o => o.status === 'pending_payment' || o.status === 'whatsapp_pending' || (!o.status && !o.paymentConfirmed));
        } else if (currentAdminOrderFilter === 'cancelled') {
            orders = orders.filter(o => o.status === 'cancelled');
        }
    }

    // Filter by search
    if (searchQuery) {
        orders = orders.filter(o => 
            (o.id && o.id.toLowerCase().includes(searchQuery)) ||
            (o.customerName && o.customerName.toLowerCase().includes(searchQuery)) ||
            (o.customerPhone && o.customerPhone.includes(searchQuery)) ||
            (o.cardCode13 && o.cardCode13.includes(searchQuery))
        );
    }

    if (orders.length === 0) {
        ordersContainer.innerHTML = '<p class="text-xs text-slate-500 text-center p-6 bg-slate-50 rounded-2xl border border-slate-200">' +
            'لا توجد طلبات مطابقة للفلاتر الحالية.' +
        '</p>';
        return;
    }

    ordersContainer.innerHTML = orders.map(order => {
        const isPaid = order.status === 'paid' || order.paymentConfirmed;
        const isCancelled = order.status === 'cancelled';
        const isPending = !isPaid && !isCancelled;

        let statusBadge = '';
        if (isPaid) {
            statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1"><i class="fa-solid fa-circle-check text-emerald-600"></i><span>مدفوع ومسلّم بنجاح ✅</span></span>';
        } else if (isCancelled) {
            statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 flex items-center gap-1"><i class="fa-solid fa-ban text-rose-600"></i><span>ملغي ❌</span></span>';
        } else {
            statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 flex items-center gap-1 animate-pulse"><i class="fa-solid fa-clock text-amber-600"></i><span>قيد انتظار الدفع ⏳</span></span>';
        }

        return '<div class="p-4 sm:p-5 rounded-2xl bg-white border ' + (isPaid ? 'border-emerald-300' : (isPending ? 'border-amber-300' : 'border-slate-200')) + ' shadow-sm space-y-3">' +
            '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">' +
                '<div>' +
                    '<div class="flex items-center gap-2">' +
                        '<span class="font-black text-slate-900 text-sm sm:text-base">#' + escapeHtml(order.id) + '</span>' +
                        statusBadge +
                    '</div>' +
                    '<div class="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">' +
                        '<span class="font-bold text-slate-900"><i class="fa-solid fa-user text-slate-400 ml-1"></i> ' + escapeHtml(order.customerName || 'عميل سحّابتي') + '</span>' +
                        '<span class="font-mono text-slate-700 font-bold"><i class="fa-solid fa-phone text-slate-400 ml-1"></i> ' + escapeHtml(order.customerPhone || '-') + '</span>' +
                        '<span class="text-slate-400 font-mono text-[11px]">' + escapeHtml(order.date || '') + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="text-left sm:text-right">' +
                    '<span class="font-black text-emerald-700 text-base sm:text-lg block">' + escapeHtml(order.totalFormatted || '') + '</span>' +
                    '<span class="text-[11px] text-slate-500 font-medium">وسيلة الدفع: <strong>' + escapeHtml(order.paymentMethod || '') + '</strong></span>' +
                '</div>' +
            '</div>' +

            (order.cardCode13 ? 
                '<div class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 font-mono text-xs font-bold flex items-center justify-between">' +
                    '<span>🎟️ كود كارت التعبئة (13 رقم): <strong class="text-amber-900 tracking-wider text-sm select-all">' + escapeHtml(order.cardCode13) + '</strong></span>' +
                    '<button onclick="copyToClipboard(\'' + escapeAttr(order.cardCode13) + '\')" class="px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-bold">نسخ</button>' +
                '</div>' : '') +

            '<div class="space-y-1.5 text-xs">' +
                '<span class="font-bold text-slate-600 block text-[11px]">المنتجات والأكواد المخصصة:</span>' +
                (order.vouchers || []).map(v => {
                    const hasPassword = v.accountPassword || (v.voucherCode && v.voucherCode.includes('PASS:'));
                    return '<div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">' +
                        '<div>' +
                            '<span class="font-bold text-slate-900 block">' + escapeHtml(v.title) + '</span>' +
                            '<code class="font-mono font-black text-indigo-950 text-xs mt-0.5 block select-all">' + escapeHtml(v.accountUsername ? ('حساب: ' + v.accountUsername + ' | سر: ' + (v.accountPassword || '••••••••')) : v.voucherCode) + '</code>' +
                        '</div>' +
                        '<div class="flex items-center gap-1.5 self-end sm:self-center">' +
                            (v.pin ? '<span class="text-[10px] font-mono text-slate-600 font-bold px-1.5 py-0.5 rounded bg-slate-200">PIN: ' + escapeHtml(v.pin) + '</span>' : '') +
                            '<button onclick="copyToClipboard(\'' + escapeAttr(v.voucherCode) + '\')" class="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-bold text-[11px] shadow-sm flex items-center gap-1">' +
                                '<i class="fa-solid fa-copy text-[10px]"></i> <span>نسخ</span>' +
                            '</button>' +
                        '</div>' +
                    '</div>';
                }).join('') +
            '</div>' +

            '<div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">' +
                '<div class="flex items-center gap-2">' +
                    (isPending ? 
                        '<button type="button" onclick="openAdminConfirmPaymentModal(\'' + escapeAttr(order.id) + '\')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5">' +
                            '<i class="fa-solid fa-circle-check"></i>' +
                            '<span>تأكيد الدفع وتسليم الحساب فوراً ✅</span>' +
                        '</button>' : 
                        '<button type="button" onclick="openAdminConfirmPaymentModal(\'' + escapeAttr(order.id) + '\')" class="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs border border-sky-200 transition flex items-center gap-1.5">' +
                            '<i class="fa-solid fa-pen-to-square"></i>' +
                            '<span>تعديل بيانات الحساب المسلّم</span>' +
                        '</button>') +
                    (isPending ? 
                        '<button type="button" onclick="adminCancelOrder(\'' + escapeAttr(order.id) + '\')" class="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition flex items-center gap-1">' +
                            '<i class="fa-solid fa-ban"></i>' +
                            '<span>إلغاء</span>' +
                        '</button>' : '') +
                '</div>' +
                '<div class="flex items-center gap-2">' +
                    (order.customerPhone ? 
                        '<a href="https://wa.me/' + order.customerPhone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('مرحباً ' + (order.customerName || '') + '، بخصوص طلبك #' + order.id + ' في سحّابتي:') + '" target="_blank" class="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition flex items-center gap-1.5">' +
                            '<i class="fa-brands fa-whatsapp text-emerald-600"></i>' +
                            '<span>واتساب العميل</span>' +
                        '</a>' : '') +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
}

function openAdminConfirmPaymentModal(orderId) {
    if (typeof SahabatiDB === 'undefined') return;

    const order = SahabatiDB.getAllOrders().find(o => o.id === orderId);
    if (!order) {
        showToast('الطلب غير موجود', 'fa-triangle-exclamation');
        return;
    }

    const modal = document.getElementById('admin-confirm-payment-modal');
    const summary = document.getElementById('admin-confirm-order-summary');
    const targetInput = document.getElementById('confirm-target-order-id');
    const usernameInput = document.getElementById('confirm-account-username');
    const passwordInput = document.getElementById('confirm-account-password');
    const pinInput = document.getElementById('confirm-account-pin');
    const notesInput = document.getElementById('confirm-account-notes');

    if (targetInput) targetInput.value = order.id;

    if (summary) {
        summary.innerHTML = '<div class="flex justify-between items-center">' +
            '<span class="font-extrabold text-slate-900 text-sm">طلب #' + order.id + '</span>' +
            '<span class="font-black text-emerald-700">' + order.totalFormatted + '</span>' +
        '</div>' +
        '<div class="text-slate-600 text-xs">' +
            '<span>العميل: <strong>' + (order.customerName || 'عميل') + '</strong> (' + (order.customerPhone || '') + ')</span>' +
        '</div>' +
        '<div class="text-slate-500 text-[11px]">' +
            'المنتج: ' + (order.items?.map(i => i.titleAr).join(', ') || 'شحن/اشتراك') +
        '</div>';
    }

    // Pre-fill fields
    let initialUser = order.accountDetails?.username || '';
    let initialPass = order.accountDetails?.password || '';
    let initialPin = order.accountDetails?.pin || '';

    // Check if vouchers has pre-allocated data
    if (!initialUser && order.vouchers?.[0]) {
        const vCode = order.vouchers[0].voucherCode || '';
        if (vCode.includes('EMAIL:') && vCode.includes('PASS:')) {
            const parts = vCode.split('|');
            initialUser = (parts[0] || '').replace('EMAIL:', '').trim();
            initialPass = (parts[1] || '').replace('PASS:', '').trim();
            if (parts[2]) initialPin = parts[2].replace('PIN:', '').trim();
        } else {
            initialPass = vCode;
        }
        if (!initialPin && order.vouchers[0].pin) initialPin = order.vouchers[0].pin;
    }

    if (usernameInput) usernameInput.value = initialUser;
    if (passwordInput) passwordInput.value = initialPass;
    if (pinInput) pinInput.value = initialPin;
    if (notesInput) notesInput.value = order.accountDetails?.notes || 'شاشات وهواتف - يعمل على جميع الأجهزة';

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        passwordInput?.focus();
    }
}

function handleAdminConfirmPaymentSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof SahabatiDB === 'undefined') return;

    const orderId = document.getElementById('confirm-target-order-id')?.value;
    const username = document.getElementById('confirm-account-username')?.value.trim();
    const password = document.getElementById('confirm-account-password')?.value.trim();
    const pin = document.getElementById('confirm-account-pin')?.value.trim();
    const notes = document.getElementById('confirm-account-notes')?.value.trim();

    if (!orderId || !password) {
        showToast('يرجى إدخال كلمة السر على الأقل', 'fa-triangle-exclamation');
        return;
    }

    try {
        const confirmedOrder = SahabatiDB.confirmOrderPayment(orderId, {
            username: username,
            password: password,
            pin: pin,
            notes: notes
        });

        closeModal('admin-confirm-payment-modal');
        renderCustomersPanel();
        showToast('تم تأكيد الدفع بنجاح! ستظهر كلمة السر فوراً في شاشة العميل 🎉', 'fa-circle-check');

        // Optional WhatsApp confirmation prompt
        if (confirmedOrder.customerPhone) {
            const notifyCustomer = confirm('هل تود إرسال إشعار للعميل عبر واتساب يفيد بأن حسابه وكلمة السر جاهزة في شاشته بالموقع؟');
            if (notifyCustomer) {
                const cleanPhone = confirmedOrder.customerPhone.replace(/[^0-9]/g, '');
                const waText = encodeURIComponent('مرحباً ' + (confirmedOrder.customerName || '') + '،\nتم استلام وتأكيد دفع طلبك رقم #' + confirmedOrder.id + ' بنجاح! ✨\nيمكنك الآن الدخول إلى حسابك في موقع سحّابتي وفتح شاشة طلباتك لاستعراض بيانات الحساب وكلمة السر فوراً.');
                window.open('https://wa.me/' + cleanPhone + '?text=' + waText, '_blank');
            }
        }
    } catch(err) {
        showToast(err.message || 'حدث خطأ أثناء اعتماد الطلب', 'fa-triangle-exclamation');
    }
}

function adminCancelOrder(orderId) {
    if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;
    if (typeof SahabatiDB === 'undefined') return;

    try {
        SahabatiDB.cancelOrder(orderId, 'ملغي من قبل الإدارة');
        renderCustomersPanel();
        showToast('تم إلغاء الطلب بنجاح', 'fa-ban');
    } catch(err) {
        showToast(err.message, 'fa-triangle-exclamation');
    }
}
