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
    if(getAdminToken()){
        adminState.isAdminAuth=true;
        showDashboard();
        loadServerData();
    } else if(adminState.isAdminAuth){
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

// ---------- Server mode (الخادم يتحقق من كلمة السر ويحفظ البيانات) ----------
const ADMIN_TOKEN_KEY='sahabati_admin_token';
function getAdminToken(){ try{ return sessionStorage.getItem(ADMIN_TOKEN_KEY)||''; }catch(e){ return ''; } }
function setAdminToken(t){ try{ if(t) sessionStorage.setItem(ADMIN_TOKEN_KEY,t); else sessionStorage.removeItem(ADMIN_TOKEN_KEY); }catch(e){} }
function adminApi(url, options){
    const opts=Object.assign({}, options||{});
    opts.headers=Object.assign({ 'Content-Type':'application/json' }, opts.headers||{});
    const token=getAdminToken();
    if(token) opts.headers['Authorization']='Bearer '+token;
    return fetch(url, opts).then(res=>res.json().catch(()=>({})).then(data=>{
        if(!res.ok){ const e=new Error(data.error||('HTTP '+res.status)); e.status=res.status; throw e; }
        return data;
    }));
}
// Load catalog + database from the server after login, and keep orders fresh
function loadServerData(){
    if(!getAdminToken()) return Promise.resolve();
    return Promise.all([
        adminApi('/api/catalog').then(catalog=>{
            if(catalog && Array.isArray(catalog.games)){
                APP_DATA=catalog;
                APP_DATA.settings=Object.assign({}, DEFAULT_STORE_SETTINGS, catalog.settings||{});
                delete APP_DATA.settings.adminPin;
                saveAppDataLocal(APP_DATA);
            }
        }),
        (typeof SahabatiDB!=='undefined' && SahabatiDB.syncWithServer) ? SahabatiDB.syncWithServer() : null
    ]).then(()=>{ try{ renderAdminPanel(); }catch(e){} }).catch(err=>{
        if(err && err.status===401){ setAdminToken(''); adminState.isAdminAuth=false; showLogin(); showToast('انتهت الجلسة، يرجى تسجيل الدخول مجدداً','fa-lock'); }
    });
}
// Every catalog save in the panel is also sent to the server so customers see it
const saveAppDataLocal = saveAppData;
saveAppData = function(data){
    saveAppDataLocal(data);
    if(getAdminToken()){
        adminApi('/api/catalog', { method:'PUT', body: JSON.stringify(data) })
            .catch(err=>showToast('لم يتم حفظ التعديل على الخادم: '+err.message,'fa-triangle-exclamation'));
    }
};
// الخادم رفض الحفظ: نخبر المدير بوضوح بدلاً من أن يظن أن التعديل وصل للزبائن
if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('sahabati-auth-expired', () => {
        if (!getAdminToken()) return;
        setAdminToken(''); adminState.isAdminAuth=false; showLogin();
        showToast('انتهت جلسة الدخول. سجّل الدخول مرة أخرى ثم أعد آخر عملية (لم تُحفظ على الخادم).','fa-lock');
    });
    window.addEventListener('sahabati-sync-failed', () => {
        if (getAdminToken()) showToast('تعذر حفظ آخر تعديل على الخادم. تحقق من الإنترنت وأعد المحاولة.','fa-triangle-exclamation');
    });
}
setInterval(()=>{ if(adminState.isAdminAuth && getAdminToken() && !document.hidden && typeof SahabatiDB!=='undefined'){ SahabatiDB.syncWithServer().then(()=>{ try{ renderAdminPanel(); }catch(e){} }); } }, 30000);

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
function adminLoginFailed(pinInput){
    shakeEl(pinInput);
    showToast('كلمة السر غير صحيحة','fa-lock');
    pinInput.value='';
    try{pinInput.focus();}catch(e){}
}
async function handleAdminLogin(e){
    if(e && e.preventDefault) e.preventDefault();
    const pinInput=document.getElementById('admin-pin-input');
    if(!pinInput){ showToast('حقل كلمة السر غير موجود','fa-triangle-exclamation'); return; }
    // أرقام لوحة المفاتيح العربية (١٢٣) تُحوَّل إلى 123
    const entered=(pinInput.value||'').replace(/[\u0660-\u0669]/g,d=>String(d.charCodeAt(0)-0x0660)).replace(/[\u06F0-\u06F9]/g,d=>String(d.charCodeAt(0)-0x06F0)).trim();
    if(!entered) return adminLoginFailed(pinInput);

    // 1) الخادم أولاً: كلمة السر محفوظة في متغير البيئة ADMIN_PIN وليس في المتصفح
    if(!/github\.io$/.test(location.hostname)){
        try {
            const data=await adminApi('/api/admin/login', { method:'POST', body: JSON.stringify({ pin: entered }) });
            setAdminToken(data.token);
            adminState.isAdminAuth=true;
            pinInput.value='';
            showToast('مرحباً بك في لوحة تحكم سحّابتي 👑');
            showDashboard();
            loadServerData();
            return;
        } catch(err){
            if(err.status===401 || err.status===429) return err.status===429 ? showToast(err.message,'fa-lock') : adminLoginFailed(pinInput);
            // لا يوجد خادم (استضافة ثابتة): نكمل بالتحقق المحلي
        }
    }

    // 2) استضافة بدون خادم: تحقق محلي
    const correct=correctAdminPin();
    if(entered===correct){
        adminState.isAdminAuth=true;
        if (typeof sessSet === 'function') sessSet('sahabati_admin_auth','true');
        showToast('مرحباً بك في لوحة تحكم سحّابتي 👑');
        try { showDashboard(); }
        catch(err){ showToast('تم الدخول لكن تعذر عرض اللوحة: '+err.message,'fa-triangle-exclamation'); }
    } else {
        adminLoginFailed(pinInput);
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
    if(getAdminToken()){ adminApi('/api/admin/logout', { method:'POST' }).catch(()=>{}); setAdminToken(''); }
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
    if(tabName==='vault'){ fillVaultProductSelect(); renderVaultPanel(); }
    if(tabName==='customers') renderCustomersPanel();
    if(tabName==='settings') populateSettingsForm();
    if(tabName==='notices'){ try{renderNoticesAdmin();}catch(e){} }
}

// ---------- Product manager (إدارة المنتجات والأسعار) ----------
const ADMIN_SECTION_NAMES={ games:'الألعاب', chat:'الشات والصوتية', entertainment:'الترفيه', ai_cards:'ChatGPT و Claude', gift_cards:'آبل آيتونز', social:'سوشيال' };
const ADMIN_METHOD_NAMES={ id:'🆔 بالمعرّف', qr:'🔳 QR', login:'🔐 تسجيل دخول' };
function adminGameSection(g){ return g.category||'games'; }

// عدد القطع المباعة لكل منتج من الطلبات المدفوعة
function adminSalesIndex(){
    const idx={};
    let orders=[];
    try{ orders=(typeof SahabatiDB!=='undefined' && SahabatiDB.getAllOrders) ? SahabatiDB.getAllOrders() : []; }catch(e){}
    orders.filter(o=>o.status==='paid'||o.paymentConfirmed).forEach(o=>{
        (o.items||[]).forEach(i=>{
            const key=i.type==='game' ? ('p:'+i.packageId) : ('c:'+i.cardId);
            idx[key]=(idx[key]||0)+(Number(i.quantity)||1);
            if(i.type==='game'){ idx['g:'+i.gameId]=(idx['g:'+i.gameId]||0)+(Number(i.quantity)||1); }
        });
    });
    return { idx, total: orders.length, paid: orders.filter(o=>o.status==='paid'||o.paymentConfirmed).length };
}

function adminPriceInput(kind, a, b, price){
    const id='price-'+kind+'-'+a+(b?'-'+b:'');
    return '<input type="number" min="0.5" step="0.5" id="'+escapeAttr(id)+'" value="'+escapeAttr(Number(price).toFixed(2))+'" class="adm-price">'+
        '<button type="button" class="adm-btn save" title="حفظ السعر" onclick="adminSavePrice(\''+kind+'\',\''+escapeAttr(a)+'\',\''+escapeAttr(b||'')+'\')"><i class="fa-solid fa-floppy-disk"></i></button>';
}
function adminRowActions(kind, a, b, hidden){
    return (kind!=='pkg' ? '<button type="button" class="adm-btn" title="تغيير الصورة" onclick="adminSetImage(\''+kind+'\',\''+escapeAttr(a)+'\')"><i class="fa-solid fa-image"></i></button>' : '')+
        '<button type="button" class="adm-btn" title="تعديل الاسم" onclick="adminRename(\''+kind+'\',\''+escapeAttr(a)+'\',\''+escapeAttr(b||'')+'\')"><i class="fa-solid fa-pen"></i></button>'+
        '<button type="button" class="adm-btn '+(hidden?'off':'')+'" title="'+(hidden?'إظهار للزبائن':'إخفاء عن الزبائن')+'" onclick="adminToggleHidden(\''+kind+'\',\''+escapeAttr(a)+'\',\''+escapeAttr(b||'')+'\')"><i class="fa-solid '+(hidden?'fa-eye-slash':'fa-eye')+'"></i></button>'+
        '<button type="button" class="adm-btn danger" title="حذف" onclick="adminDelete(\''+kind+'\',\''+escapeAttr(a)+'\',\''+escapeAttr(b||'')+'\')"><i class="fa-solid fa-trash"></i></button>';
}

function renderAdminPanel(){
    const sales=adminSalesIndex();
    const totalPackages=APP_DATA.games.reduce((s,g)=>s+g.packages.length,0);
    const sg=document.getElementById('admin-stat-games');
    const sc=document.getElementById('admin-stat-cards');
    const so=document.getElementById('admin-stat-orders');
    if(sg) sg.textContent=APP_DATA.games.length+' ('+totalPackages+' باقة)';
    if(sc) sc.textContent=APP_DATA.giftCards.length+' بطاقات واشتراكات';
    if(so) so.textContent=sales.paid+' / '+sales.total;

    const gameSelect=document.getElementById('admin-target-game');
    if(gameSelect){ gameSelect.innerHTML=APP_DATA.games.map(g=>'<option value="'+escapeAttr(g.id)+'">'+escapeHtml(g.nameAr)+' — '+escapeHtml(ADMIN_SECTION_NAMES[adminGameSection(g)]||'')+'</option>').join(''); }

    const box=document.getElementById('admin-items-table-container');
    if(!box) return;
    const q=(document.getElementById('admin-product-search')?.value||'').trim().toLowerCase();
    const section=document.getElementById('admin-product-section')?.value||'all';
    const match=(name)=>!q || String(name||'').toLowerCase().includes(q);
    const sectionOk=(sec, hidden)=> section==='all' || (section==='hidden' ? hidden : sec===section);

    const games=APP_DATA.games.filter(g=>{
        const anyHidden=g.hidden || g.packages.some(p=>p.hidden);
        return sectionOk(adminGameSection(g), anyHidden) && (match(g.nameAr) || g.packages.some(p=>match(p.nameAr)));
    });
    const cards=APP_DATA.giftCards.filter(c=>sectionOk(c.category, !!c.hidden) && match(c.nameAr));

    let html='';
    if(games.length){
        html+='<div class="adm-group-title"><i class="fa-solid fa-gamepad"></i> الألعاب وتطبيقات الشات ('+games.length+')</div>';
        html+=games.slice(0,150).map(g=>{
            const sold=sales.idx['g:'+g.id]||0;
            return '<details class="adm-game'+(g.hidden?' is-hidden':'')+'"'+(q?' open':'')+'>'+
                '<summary>'+(g.image?'<img class="adm-thumb" src="'+escapeAttr(g.image)+'" alt="" referrerpolicy="no-referrer">':'')+'<span class="adm-name">'+escapeHtml(g.nameAr)+'</span>'+
                    '<span class="adm-chip">'+escapeHtml(ADMIN_SECTION_NAMES[adminGameSection(g)]||'')+'</span>'+
                    '<span class="adm-chip">'+escapeHtml(ADMIN_METHOD_NAMES[g.deliveryMethod||'id'])+'</span>'+
                    (g.hidden?'<span class="adm-chip warn">مخفي</span>':'')+
                    '<span class="adm-chip ok">مبيع: '+sold+'</span></summary>'+
                '<div class="adm-game-actions">'+
                    '<label class="adm-mini">طريقة الشحن: <select onchange="adminSetMethod(\''+escapeAttr(g.id)+'\',this.value)">'+
                        ['id','qr','login'].map(m=>'<option value="'+m+'"'+((g.deliveryMethod||'id')===m?' selected':'')+'>'+ADMIN_METHOD_NAMES[m]+'</option>').join('')+
                    '</select></label>'+
                    adminRowActions('game', g.id, '', !!g.hidden)+
                '</div>'+
                '<div class="adm-rows">'+
                    g.packages.map(p=>'<div class="adm-row'+(p.hidden?' is-hidden':'')+'">'+
                        '<div class="adm-row-name"><span>'+escapeHtml(p.nameAr)+'</span><small>مبيع: '+(sales.idx['p:'+p.id]||0)+(p.hidden?' · مخفي':'')+'</small></div>'+
                        '<div class="adm-row-tools">'+adminPriceInput('pkg', g.id, p.id, p.priceLYD)+adminRowActions('pkg', g.id, p.id, !!p.hidden)+'</div>'+
                    '</div>').join('')+
                '</div>'+
            '</details>';
        }).join('');
        if(games.length>150) html+='<p class="adm-note">يُعرض أول 150 نتيجة، استخدم البحث للوصول إلى البقية.</p>';
    }
    if(cards.length){
        html+='<div class="adm-group-title"><i class="fa-solid fa-gift"></i> الاشتراكات والبطاقات ('+cards.length+')</div><div class="adm-rows">';
        html+=cards.map(c=>'<div class="adm-row'+(c.hidden?' is-hidden':'')+'">'+
            '<div class="adm-row-name"><span>'+escapeHtml(c.nameAr)+'</span><small>'+escapeHtml(ADMIN_SECTION_NAMES[c.category]||c.category||'')+' · مبيع: '+(sales.idx['c:'+c.id]||0)+(c.hidden?' · مخفي':'')+'</small></div>'+
            '<div class="adm-row-tools">'+adminPriceInput('card', c.id, '', c.priceLYD)+adminRowActions('card', c.id, '', !!c.hidden)+'</div>'+
        '</div>').join('')+'</div>';
    }
    box.innerHTML=html||'<p class="adm-note">لا توجد منتجات مطابقة للبحث.</p>';
}

function adminFind(kind, a, b){
    if(kind==='card') return APP_DATA.giftCards.find(c=>c.id===a);
    const game=APP_DATA.games.find(g=>g.id===a);
    if(kind==='game') return game;
    return game && game.packages.find(p=>p.id===b);
}
function adminSavePrice(kind, a, b){
    const item=adminFind(kind,a,b); if(!item) return;
    const input=document.getElementById('price-'+kind+'-'+a+(b?'-'+b:''));
    const v=parseFloat(input && input.value);
    if(!isFinite(v) || v<=0){ showToast('أدخل سعراً صحيحاً أكبر من صفر','fa-triangle-exclamation'); return; }
    item.priceLYD=Math.round(v*100)/100;
    saveAppData(APP_DATA); renderAdminPanel();
    showToast('تم حفظ السعر: '+formatPrice(item.priceLYD));
}
function adminRename(kind, a, b){
    const item=adminFind(kind,a,b); if(!item) return;
    const name=prompt('الاسم الجديد:', item.nameAr);
    if(name===null) return;
    const clean=String(name).replace(/[<>]/g,'').trim();
    if(clean.length<2){ showToast('الاسم قصير جداً','fa-triangle-exclamation'); return; }
    item.nameAr=clean;
    saveAppData(APP_DATA); renderAdminPanel(); showToast('تم تعديل الاسم');
}
function adminToggleHidden(kind, a, b){
    const item=adminFind(kind,a,b); if(!item) return;
    item.hidden=!item.hidden;
    saveAppData(APP_DATA); renderAdminPanel();
    showToast(item.hidden?'تم إخفاء المنتج عن الزبائن':'المنتج ظاهر للزبائن الآن', item.hidden?'fa-eye-slash':'fa-eye');
}
function adminDelete(kind, a, b){
    const item=adminFind(kind,a,b); if(!item) return;
    if(!confirm('حذف «'+item.nameAr+'» نهائياً؟ يمكنك بدلاً من ذلك إخفاؤه مؤقتاً.')) return;
    if(kind==='card') APP_DATA.giftCards=APP_DATA.giftCards.filter(c=>c.id!==a);
    else if(kind==='game') APP_DATA.games=APP_DATA.games.filter(g=>g.id!==a);
    else { const g=adminFind('game',a); g.packages=g.packages.filter(p=>p.id!==b); }
    saveAppData(APP_DATA); renderAdminPanel(); showToast('تم الحذف','fa-trash');
}
function adminSetImage(kind, id){
    const item=adminFind(kind,id); if(!item) return;
    const url=prompt('رابط صورة التطبيق (يبدأ بـ https://) أو مسار ملف داخل الموقع مثل images/chat/app.png.\nاتركه فارغاً لإزالة الصورة:', item.image||'');
    if(url===null) return;
    const clean=String(url).trim();
    if(clean && !/^(https:\/\/|images\/)[^"'<>\s]+$/i.test(clean)){ showToast('الرابط يجب أن يبدأ بـ https:// أو images/','fa-triangle-exclamation'); return; }
    if(clean) item.image=clean; else delete item.image;
    saveAppData(APP_DATA); renderAdminPanel();
    showToast(clean?'تم تحديث الصورة':'تمت إزالة الصورة','fa-image');
}
function adminSetMethod(gameId, method){
    const g=adminFind('game',gameId); if(!g || !ADMIN_METHOD_NAMES[method]) return;
    g.deliveryMethod=method;
    saveAppData(APP_DATA); renderAdminPanel(); showToast('تم تغيير طريقة الشحن: '+ADMIN_METHOD_NAMES[method]);
}

function toggleAdminFormType(type){
    const g=document.getElementById('admin-game-select-group');
    if(g) g.classList.toggle('hidden', type!=='game_package');
    const ng=document.getElementById('admin-new-game-group');
    if(ng) ng.classList.toggle('hidden', type!=='new_game');
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
    } else if(type==='gift_card'){
        const newId='card_'+Date.now(); let finalBrand=category;
        if(name.includes('نتفليكس')||name.toLowerCase().includes('netflix')) finalBrand='netflix';
        else if(name.includes('شاهد')||name.toLowerCase().includes('shahid')) finalBrand='shahid';
        else if(name.includes('سناب')||name.toLowerCase().includes('snap')) finalBrand='snapchat';
        else if(name.includes('تيك توك')||name.toLowerCase().includes('tiktok')) finalBrand='tiktok';
        else if(name.toLowerCase().includes('chatgpt')||name.includes('شات جي بي تي')) finalBrand='chatgpt';
        else if(name.toLowerCase().includes('claude')||name.includes('كلود')) finalBrand='claude';
        else if(name.includes('آبل')||name.includes('ايتونز')||name.includes('آيتونز')||name.toLowerCase().includes('apple')||name.toLowerCase().includes('itunes')) finalBrand='apple';
        else if(name.includes('تيليجرام')||name.toLowerCase().includes('telegram')) finalBrand='telegram';
        APP_DATA.giftCards.push({ id:newId, brand:finalBrand, nameAr:name, nominal:name, priceLYD:price, category:category, badge:badge||'جديد ✨', image:image, instructionsAr: instructions||'يتم تسليم الكود وتفعيله فوراً بعد تأكيد الطلب بالدينار الليبي.' });
    } else if(type==='new_game'){
        const newGameId='game_'+Date.now();
        const section=document.getElementById('admin-new-game-section')?.value==='chat' ? 'chat' : 'games';
        const method=document.getElementById('admin-delivery-method')?.value || 'id';
        APP_DATA.games.push({ id:newGameId, category:section, deliveryMethod:method, nameAr:name, nameEn:name, badge:badge||'جديد 🔥', image:image,
            idLabelAr: method==='id' ? ('معرّف حسابك (ID) في '+name+':') : undefined,
            deliveryNoteAr: method==='qr' ? 'بعد إرسال الطلب أرسل لنا صورة رمز QR عبر واتساب لنشحن مباشرة.' : (method==='login' ? 'بعد إرسال الطلب يتواصل معك فريقنا عبر واتساب الرسمي لإتمام الشحن بتسجيل الدخول. لا تُحفظ بيانات حسابك في الموقع.' : undefined),
            packages:[{ id:newGameId+'_1', nameAr: section==='chat' ? ('شحن بقيمة '+price+' د.ل') : 'باقة 1', priceLYD:price, popular:true, icon:'💎' }] });
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
    const libyana=document.getElementById('setting-libyana-info');
    if(wa) wa.value=s.whatsappNumber||'218920541749';
    if(pin){ pin.value=''; if(getAdminToken()){ pin.disabled=true; pin.placeholder='تُغيَّر من متغير ADMIN_PIN على الخادم'; } }
    if(libyana) libyana.value=s.paymentMethodsInfo?.telecom_libyana?.accountInfo||'';
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
    const pin=document.getElementById('setting-admin-pin')?.value.trim()||'';
    if(pin && pin.length<6){ showToast('كلمة سر الإدارة يجب أن تكون 6 أحرف على الأقل','fa-lock'); return; }

    APP_DATA.settings.whatsappNumber=wa.replace(/[^0-9]/g,'');
    if(pin) APP_DATA.settings.adminPin=pin;
    if(!APP_DATA.settings.paymentMethodsInfo || !APP_DATA.settings.paymentMethodsInfo.telecom_libyana){ APP_DATA.settings.paymentMethodsInfo=JSON.parse(JSON.stringify(DEFAULT_STORE_SETTINGS.paymentMethodsInfo)); }
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

// المنتجات التي تُسلَّم بكود أو حساب (البطاقات والاشتراكات). الألعاب وتطبيقات الشات تُشحن بالـ ID/QR/تسجيل الدخول
function fillVaultProductSelect() {
    const sel = document.getElementById('vault-product-select');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = APP_DATA.giftCards.map(c => '<option value="'+escapeAttr(c.id)+'">'+escapeHtml(c.nameAr)+(c.hidden?' (مخفي)':'')+'</option>').join('');
    if (current) sel.value = current;
}

function handleVaultAddCodes(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof SahabatiDB === 'undefined') return;

    const productId = document.getElementById('vault-product-select')?.value;
    const product = APP_DATA.giftCards.find(c => c.id === productId);
    const notes = document.getElementById('vault-notes')?.value.trim();
    const rawText = document.getElementById('vault-codes-textarea')?.value.trim();

    if (!product || !rawText) {
        showToast('اختر المنتج والصق الأكواد', 'fa-triangle-exclamation');
        return;
    }

    try {
        const addedCount = SahabatiDB.addBatchCodes({
            productId: product.id,
            brand: product.brand || 'general',
            category: product.category || 'gift_cards',
            productName: product.nameAr,
            notes: notes
        }, rawText);

        document.getElementById('vault-codes-textarea').value = '';
        renderVaultPanel();
        showToast('تمت إضافة ' + addedCount + ' كود لمنتج: ' + product.nameAr + ' 🎟️');
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
                        (c.status === 'reserved'
                            ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">محجوز بانتظار الدفع 🟡 (' + escapeHtml(c.assignedOrderId || '') + ')</span>'
                            : '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">تم بيعه 🔴 (' + escapeHtml(c.assignedOrderId || '') + ')</span>')) +
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

function adminCopyBtn(text){
    return '<button type="button" class="adm-btn" title="نسخ" onclick="copyToClipboard(\''+escapeAttr(text)+'\')"><i class="fa-solid fa-copy"></i></button>';
}
function openAdminConfirmPaymentModal(orderId) {
    if (typeof SahabatiDB === 'undefined') return;
    const order = SahabatiDB.getAllOrders().find(o => o.id === orderId);
    if (!order) { showToast('الطلب غير موجود', 'fa-triangle-exclamation'); return; }

    const modal = document.getElementById('admin-confirm-payment-modal');
    const summary = document.getElementById('admin-confirm-order-summary');
    document.getElementById('confirm-target-order-id').value = order.id;

    const vaultCount = (order.vouchers || []).filter(v => v.codeId).length;
    const items = (order.items || []).map(i => {
        const meta = String(i.meta || '');
        const pid = /^Player ID: /.test(meta) ? meta.replace('Player ID: ', '') : '';
        return '<div class="adm-row">'+
            '<div class="adm-row-name"><span>'+escapeHtml(i.quantity+'× '+(i.titleAr||''))+'</span><small>'+escapeHtml(pid ? ('معرّف الحساب (ID): '+pid) : meta)+'</small></div>'+
            (pid ? '<div class="adm-row-tools">'+adminCopyBtn(pid)+'</div>' : '')+
        '</div>';
    }).join('');

    if (summary) {
        summary.innerHTML =
            '<div class="adm-row"><div class="adm-row-name"><span>طلب #'+escapeHtml(order.id)+' · '+escapeHtml(order.totalFormatted||'')+'</span>'+
                '<small>'+escapeHtml((order.customerName||'عميل')+' · '+(order.customerPhone||''))+'</small></div>'+
                (order.customerPhone ? '<div class="adm-row-tools">'+adminCopyBtn(order.customerPhone)+'</div>' : '')+'</div>'+
            (order.cardCode13
                ? '<div class="adm-row" style="border-color:#f59e0b;background:#fffbeb"><div class="adm-row-name"><span>🎟️ كرت ليبيانا: <b style="font-family:monospace;letter-spacing:1px">'+escapeHtml(order.cardCode13)+'</b></span><small>اشحن الكرت على رقمك وتأكد أن قيمته تغطي '+escapeHtml(order.totalFormatted||'')+' قبل التأكيد</small></div><div class="adm-row-tools">'+adminCopyBtn(order.cardCode13)+'</div></div>'
                : '<div class="adm-row" style="border-color:#fca5a5;background:#fff1f2"><div class="adm-row-name"><span>⚠️ لا يوجد كود كرت في هذا الطلب</span><small>لا تؤكد قبل استلام الدفع عبر واتساب</small></div></div>')+
            items+
            (vaultCount ? '<div class="adm-note" style="color:#047857">📦 '+vaultCount+' كود محجوز من المخزن لهذا الطلب، سيظهر للعميل تلقائياً عند التأكيد.</div>' : '')+
            (order.customerNotes ? '<div class="adm-note">📝 ملاحظة العميل: '+escapeHtml(order.customerNotes)+'</div>' : '');
    }

    document.getElementById('confirm-account-username').value = order.accountDetails?.username || '';
    document.getElementById('confirm-account-password').value = order.accountDetails?.password || '';
    document.getElementById('confirm-account-pin').value = order.accountDetails?.pin || '';
    document.getElementById('confirm-account-notes').value = order.accountDetails?.notes || '';

    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

// رقم ليبي محلي 09XXXXXXXX → 2189XXXXXXXX لرابط واتساب
function waNumber(phone){
    const d=String(phone||'').replace(/[^0-9]/g,'');
    if(/^0?9\d{8}$/.test(d)) return '218'+d.replace(/^0/,'');
    return d;
}

function handleAdminConfirmPaymentSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof SahabatiDB === 'undefined') return;

    const orderId = document.getElementById('confirm-target-order-id')?.value;
    const username = document.getElementById('confirm-account-username')?.value.trim();
    const code = document.getElementById('confirm-account-password')?.value.trim();
    const pin = document.getElementById('confirm-account-pin')?.value.trim();
    const notes = document.getElementById('confirm-account-notes')?.value.trim();
    if (!orderId) return;

    const submitBtn = document.querySelector('#admin-confirm-payment-form button[type=submit]');
    const finish = (confirmedOrder) => {
        closeModal('admin-confirm-payment-modal');
        renderCustomersPanel();
        showToast('تم تأكيد الدفع ✅ سيرى العميل طلبه مكتملاً في «طلباتي»', 'fa-circle-check');
        notifyCustomerOnWhatsApp(confirmedOrder, code, notes);
    };

    // مع الخادم: التأكيد يُحفظ على الخادم أولاً، ولا نعرض "تم" إلا بعد رده
    if (getAdminToken()) {
        if (submitBtn) submitBtn.disabled = true;
        adminApi('/api/admin/orders/confirm', { method: 'POST', body: JSON.stringify({ id: orderId, username: username, password: code, pin: pin, notes: notes }) })
            .then(data => SahabatiDB.syncWithServer().then(() => finish(data.order)))
            .catch(err => {
                if (err.status === 401) { window.dispatchEvent(new CustomEvent('sahabati-auth-expired')); return; }
                showToast('لم يتم التأكيد: ' + (err.message || 'خطأ في الاتصال') + '. أعد المحاولة.', 'fa-triangle-exclamation');
            })
            .finally(() => { if (submitBtn) submitBtn.disabled = false; });
        return;
    }

    try {
        finish(SahabatiDB.confirmOrderPayment(orderId, { username: username, password: code, pin: pin, notes: notes }));
    } catch(err) {
        showToast(err.message || 'حدث خطأ أثناء اعتماد الطلب', 'fa-triangle-exclamation');
    }
}

function notifyCustomerOnWhatsApp(confirmedOrder, code, notes) {
    try {

        if (confirmedOrder.customerPhone && confirm('إرسال رسالة واتساب للعميل بأن طلبه اكتمل؟')) {
            const waText = encodeURIComponent('مرحباً ' + (confirmedOrder.customerName || '') + '،\nتم تأكيد دفع طلبك رقم #' + confirmedOrder.id + ' وإتمامه بنجاح ✨\n' +
                (code || vaultCodesCount(confirmedOrder) ? 'افتح «طلباتي» في موقع سحّابتي لرؤية الكود.' : (notes || 'تم شحن طلبك.')));
            window.open('https://wa.me/' + waNumber(confirmedOrder.customerPhone) + '?text=' + waText, '_blank');
        }
    } catch(err) {
        showToast(err.message || 'حدث خطأ أثناء اعتماد الطلب', 'fa-triangle-exclamation');
    }
}
function vaultCodesCount(order){ return (order.vouchers || []).filter(v => v.codeId && v.voucherCode).length; }

function adminCancelOrder(orderId) {
    if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;
    if (typeof SahabatiDB === 'undefined') return;

    if (getAdminToken()) {
        adminApi('/api/admin/orders/cancel', { method: 'POST', body: JSON.stringify({ id: orderId, reason: 'ملغي من قبل الإدارة' }) })
            .then(() => SahabatiDB.syncWithServer())
            .then(() => { renderCustomersPanel(); showToast('تم إلغاء الطلب بنجاح', 'fa-ban'); })
            .catch(err => {
                if (err.status === 401) { window.dispatchEvent(new CustomEvent('sahabati-auth-expired')); return; }
                showToast('لم يتم الإلغاء: ' + (err.message || 'خطأ في الاتصال'), 'fa-triangle-exclamation');
            });
        return;
    }

    try {
        SahabatiDB.cancelOrder(orderId, 'ملغي من قبل الإدارة');
        renderCustomersPanel();
        showToast('تم إلغاء الطلب بنجاح', 'fa-ban');
    } catch(err) {
        showToast(err.message, 'fa-triangle-exclamation');
    }
}
