// ==========================================
// Sahabati Admin - منفصل تماماً عن واجهة الزبون للأمان
// لا يتم تحميل هذا الملف في index.html
// ==========================================

let adminState = {
    isAdminAuth: sessionStorage.getItem('sahabati_admin_auth') === 'true',
    orders: JSON.parse(localStorage.getItem('sahabati_orders') || '[]')
};

// Helpers - نسخة مستقلة للأمان
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
    document.getElementById('admin-session-badge')?.classList.remove('hidden');
    renderAdminPanel();
}

function handleAdminLogin(e){
    e.preventDefault();
    const pinInput=document.getElementById('admin-pin-input');
    const entered=pinInput.value.trim();
    const correct=APP_DATA.settings?.adminPin || DEFAULT_STORE_SETTINGS.adminPin;
    if(entered===correct){
        adminState.isAdminAuth=true;
        sessionStorage.setItem('sahabati_admin_auth','true');
        showToast('مرحباً بك في لوحة تحكم سحابتي 👑');
        showDashboard();
    } else {
        showToast('كلمة السر غير صحيحة','fa-lock');
        pinInput.value='';
    }
}
function logoutAdmin(){
    adminState.isAdminAuth=false;
    sessionStorage.removeItem('sahabati_admin_auth');
    showLogin();
    showToast('تم قفل لوحة الأدمن بنجاح');
}

function switchAdminTab(tabName){
    document.querySelectorAll('.admin-tab-btn').forEach(b=>{ b.classList.remove('bg-indigo-600','text-white'); b.classList.add('bg-white','text-slate-700'); });
    const active=document.getElementById('adm-tab-btn-'+tabName);
    if(active){ active.classList.add('bg-indigo-600','text-white'); active.classList.remove('bg-white','text-slate-700'); }
    ['products','settings','backup'].forEach(t=>{ const v=document.getElementById('adm-view-'+t); if(v) v.classList.toggle('hidden', t!==tabName); });
    if(tabName==='settings') populateSettingsForm();
}

function renderAdminPanel(){
    const totalPackages=APP_DATA.games.reduce((s,g)=>s+g.packages.length,0);
    const sg=document.getElementById('admin-stat-games');
    const sc=document.getElementById('admin-stat-cards');
    const so=document.getElementById('admin-stat-orders');
    if(sg) sg.textContent=APP_DATA.games.length+' ألعاب ('+totalPackages+' باقة)';
    if(sc) sc.textContent=APP_DATA.giftCards.length+' بطاقات واشتراكات';
    const orders=JSON.parse(localStorage.getItem('sahabati_orders')||'[]');
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
                '<h4 class="font-bold text-xs text-indigo-900 mb-3 flex items-center gap-2"><i class="fa-solid fa-gift text-indigo-600"></i><span>بطاقات الهدايا واشتراكات البث الحالية ('+APP_DATA.giftCards.length+' بطاقة):</span></h4>'+
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
    if(!name || name.length>80 || /[<>]/.test(name) || isNaN(price) || price<=0 || price>5000){
        showToast('يرجى إدخال اسم صحيح (≤80 حرف) وسعر بين 0.5 و 5000 د.ل','fa-triangle-exclamation'); return;
    }
    if(badge.length>40 || /[<>]/.test(badge)){ showToast('شارة العرض تحتوي على محارف غير مسموحة','fa-triangle-exclamation'); return; }
    if(instructions.length>300){ showToast('التعليمات طويلة جداً (الحد 300 حرف)','fa-triangle-exclamation'); return; }

    if(type==='game_package'){
        const gameId=document.getElementById('admin-target-game').value;
        const game=APP_DATA.games.find(g=>g.id===gameId);
        if(game){ const newId=gameId+'_pkg_'+Date.now(); game.packages.push({ id:newId, nameAr:name, priceLYD:price, popular:!!badge, icon:'💎' }); }
    } else if(type==='streaming' || type==='telecom' || type==='gift_card'){
        const newId='card_'+Date.now(); let finalBrand=category;
        if(name.includes('نتفليكس')||name.toLowerCase().includes('netflix')) finalBrand='netflix';
        else if(name.includes('شاهد')||name.toLowerCase().includes('shahid')) finalBrand='shahid';
        else if(name.includes('أمازون')||name.toLowerCase().includes('amazon')||name.includes('برايم')) finalBrand='amazon';
        else if(name.includes('مدار')) finalBrand='madar';
        else if(name.includes('ليبيانا')) finalBrand='libyana';
        APP_DATA.giftCards.push({ id:newId, brand:finalBrand, nameAr:name, nominal:name, priceLYD:price, category:category, badge:badge||'جديد ✨', instructionsAr: instructions||'يتم تسليم الكود وتفعيله فوراً بعد تأكيد الطلب بالدينار الليبي.' });
    } else if(type==='new_game'){
        const newGameId='game_'+Date.now();
        APP_DATA.games.push({ id:newGameId, nameAr:name, nameEn:name, badge:badge||'جديد 🔥', packages:[{ id:newGameId+'_1', nameAr:'باقة 1', priceLYD:price, popular:true, icon:'💎' }] });
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
    if(np!==null && !isNaN(parseFloat(np)) && parseFloat(np)>0 && parseFloat(np)<=5000){
        pkg.priceLYD=parseFloat(np); saveAppData(APP_DATA); renderAdminPanel(); showToast('تم تعديل السعر إلى '+formatPrice(pkg.priceLYD));
    } else if(np!==null){ showToast('سعر غير صالح (يجب بين 0.5 و 5000)','fa-triangle-exclamation'); }
}
function deletePackage(gameId,pkgId){
    const game=APP_DATA.games.find(g=>g.id===gameId); if(!game) return;
    if(confirm('هل أنت متأكد من حذف هذه الباقة؟')){ game.packages=game.packages.filter(p=>p.id!==pkgId); saveAppData(APP_DATA); renderAdminPanel(); showToast('تم حذف الباقة بنجاح','fa-trash'); }
}
function editGiftCardPrice(cardId){
    const card=APP_DATA.giftCards.find(c=>c.id===cardId); if(!card) return;
    const np=prompt('أدخل السعر الجديد لـ ('+card.nameAr+') بالدينار الليبي:', card.priceLYD);
    if(np!==null && !isNaN(parseFloat(np)) && parseFloat(np)>0 && parseFloat(np)<=5000){
        card.priceLYD=parseFloat(np); saveAppData(APP_DATA); renderAdminPanel(); showToast('تم تعديل السعر إلى '+formatPrice(card.priceLYD));
    } else if(np!==null){ showToast('سعر غير صالح','fa-triangle-exclamation'); }
}
function deleteGiftCard(cardId){
    if(confirm('هل أنت متأكد من حذف هذه البطاقة؟')){ APP_DATA.giftCards=APP_DATA.giftCards.filter(c=>c.id!==cardId); saveAppData(APP_DATA); renderAdminPanel(); showToast('تم حذف البطاقة بنجاح','fa-trash'); }
}

function populateSettingsForm(){
    if(!APP_DATA.settings) APP_DATA.settings=DEFAULT_STORE_SETTINGS;
    const s=APP_DATA.settings;
    const wa=document.getElementById('setting-whatsapp-number');
    const pin=document.getElementById('setting-admin-pin');
    const onePay=document.getElementById('setting-onepay-info');
    const libyana=document.getElementById('setting-libyana-info');
    const madar=document.getElementById('setting-madar-info');
    const bank=document.getElementById('setting-bank-info');
    if(wa) wa.value=s.whatsappNumber||'218920541749';
    if(pin) pin.value=s.adminPin||'admin2026';
    if(onePay) onePay.value=s.paymentMethodsInfo?.one_pay?.accountInfo||'';
    if(libyana) libyana.value=s.paymentMethodsInfo?.telecom_libyana?.accountInfo||'';
    if(madar) madar.value=s.paymentMethodsInfo?.telecom_madar?.accountInfo||'';
    if(bank) bank.value=s.paymentMethodsInfo?.bank_transfer?.accountInfo||'';
}
function saveStoreSettings(){
    if(!APP_DATA.settings) APP_DATA.settings=DEFAULT_STORE_SETTINGS;
    const wa=document.getElementById('setting-whatsapp-number')?.value.trim()||'218920541749';
    const pin=document.getElementById('setting-admin-pin')?.value.trim()||'admin2026';
    if(!/^\d{10,15}$/.test(wa.replace(/[^0-9]/g,''))){ showToast('رقم واتساب غير صالح (يجب 10-15 رقم)','fa-triangle-exclamation'); return; }
    if(pin.length<4 || pin.length>32 || /[<>]/.test(pin)){ showToast('كلمة السر يجب 4-32 حرف بدون < >','fa-triangle-exclamation'); return; }
    APP_DATA.settings.whatsappNumber=wa.replace(/[^0-9]/g,'');
    APP_DATA.settings.adminPin=pin;
    if(!APP_DATA.settings.paymentMethodsInfo){ APP_DATA.settings.paymentMethodsInfo=JSON.parse(JSON.stringify(DEFAULT_STORE_SETTINGS.paymentMethodsInfo)); }
    APP_DATA.settings.paymentMethodsInfo.one_pay.accountInfo=(document.getElementById('setting-onepay-info')?.value.trim()||'').slice(0,200);
    const lb=(document.getElementById('setting-libyana-info')?.value.trim()||'').slice(0,200);
    const md=(document.getElementById('setting-madar-info')?.value.trim()||'').slice(0,200);
    if(lb) APP_DATA.settings.paymentMethodsInfo.telecom_libyana.accountInfo=lb;
    if(md) APP_DATA.settings.paymentMethodsInfo.telecom_madar.accountInfo=md;
    APP_DATA.settings.paymentMethodsInfo.bank_transfer.accountInfo=(document.getElementById('setting-bank-info')?.value.trim()||'').slice(0,200);
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
    if(file.size>2*1024*1024){ showToast('الملف كبير جداً (الحد 2MB)','fa-triangle-exclamation'); return; }
    const reader=new FileReader();
    reader.onload=(e)=>{
        try{
            const imported=JSON.parse(e.target.result);
            if(imported.games && imported.giftCards && Array.isArray(imported.games) && Array.isArray(imported.giftCards)){
                const js=JSON.stringify(imported);
                if(js.includes('<script')||js.includes('javascript:')){ showToast('الملف يحتوي على محتوى غير آمن','fa-triangle-exclamation'); return; }
                if(imported.games.length>100 || imported.giftCards.length>500){ showToast('الملف يحتوي على عدد عناصر غير طبيعي','fa-triangle-exclamation'); return; }
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
        localStorage.removeItem('sahabati_catalog_data');
        APP_DATA=JSON.parse(JSON.stringify(DEFAULT_APP_DATA));
        saveAppData(APP_DATA);
        renderAdminPanel();
        showToast('تمت استعادة الأصناف الافتراضية بنجاح');
    }
}
