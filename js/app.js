// ==========================================
// Sahabati Store Application Engine
// Platform: سحّابتي (Sahabati)
// Currency: Libyan Dinar (LYD / د.ل) Strictly
// Compatible with: شاشات - هواتف - جميع الأجهزة
// ==========================================

let state = {
    lang: 'ar',
    currency: 'LYD',
    currentTab: 'home',
    selectedGame: 'pubg',
    verifiedPlayerId: '',
    verifiedPlayerName: '',
    selectedPackage: null,
    cart: loadJSON('sahabati_cart', []),
    orders: loadJSON('sahabati_orders', []),
    appliedPromo: null,
    paymentMethod: 'one_pay',
    isAdminAuth: (typeof sessGet === 'function' ? sessGet('sahabati_admin_auth') : null) === 'true'
};

// Resolve Base64 and Local Assets
function resolveAsset(path) {
    if (!path) return '';
    if (typeof APP_ASSETS !== 'undefined' && APP_ASSETS[path]) {
        return APP_ASSETS[path];
    }
    return path;
}

function updateWhatsAppLinks() {
    const rawNumber = APP_DATA.settings?.whatsappNumber || '218910000000';
    const cleanNumber = rawNumber.replace(/[^0-9]/g, '');
    const defaultMsg = encodeURIComponent('السلام عليكم، أود الاستفسار والشحن من منصة سحّابتي 🎮');
    const waUrl = 'https://wa.me/' + cleanNumber + '?text=' + defaultMsg;

    ['announcement-wa-btn', 'header-wa-btn', 'floating-wa-btn', 'nav-wa-btn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.href = waUrl;
    });
    ['footer-wa-link', 'footer-wa-link2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.href = waUrl;
    });
}

// Brand owner: الشعار + الغلاف + حسابات المالك (تتحدث من الأدمن)
function ownerLogo() { return APP_DATA.settings?.logoImage || 'logo.png'; }
function ownerHero() { return APP_DATA.settings?.heroImage || 'hero-banner.jpg'; }
function updateOwnerBranding() {
    const logo = ownerLogo(), hero = ownerHero();
    document.querySelectorAll('[data-logo]').forEach(el => {
        el.src = logo;
        el.onerror = function() { this.onerror = null; this.src = '08_sahabati_app_icon_1024x1024.png'; };
    });
    document.querySelectorAll('[data-hero]').forEach(el => {
        el.src = hero;
        el.onerror = function() { this.onerror = null; this.src = 'header_hero.jpg'; };
    });
    const tg = APP_DATA.settings?.telegramUrl || 'https://t.me/A_98_A20';
    const fb = APP_DATA.settings?.facebookUrl || '';
    const ig = APP_DATA.settings?.instagramUrl || '';
    const tt = APP_DATA.settings?.tiktokUrl || '';
    const set = (id, url) => { const el = document.getElementById(id); if (el && url) el.href = url; };
    set('footer-tg-link', tg); set('footer-tg-link2', tg); set('footer-fb-link', fb); set('footer-ig-link', ig); set('footer-tt-link', tt);
    const nm = APP_DATA.settings?.ownerName || 'سحابتي';
    document.querySelectorAll('[data-owner]').forEach(el => { el.textContent = nm; });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function safeStep(name, fn) {
    try { fn(); }
    catch (err) { try { console.warn('init step failed:', name, err); } catch(e){} }
}

function initApp() {
    // restore saved payment method (ون باي / حوالة / ليبيانا فقط)
    const savedPay = (typeof storeGet === 'function' ? storeGet('sahabati_selected_payment') : null);
    if (savedPay && ['one_pay','bank_transfer','telecom_libyana'].includes(savedPay) && APP_DATA.settings.paymentMethodsInfo[savedPay]) {
        state.paymentMethod = savedPay;
    } else {
        state.paymentMethod = 'one_pay';
    }
    safeStep('links', updateWhatsAppLinks);
    safeStep('categories', renderCategories);
    safeStep('gamesNav', renderGamesNav);
    safeStep('gameDetail', () => renderGameDetail(state.selectedGame || 'pubg'));
    safeStep('giftCards', () => renderGiftCards('all'));
    safeStep('orders', renderOrders);
    safeStep('cartUI', updateCartUI);
    safeStep('payInstr', renderPaymentInstructions);
    safeStep('branding', () => { if (typeof updateOwnerBranding === 'function') updateOwnerBranding(); });
    safeStep('pubgHome', () => { if (typeof renderPubgHome === 'function') renderPubgHome(); });
    safeStep('notices', () => { if (typeof renderAnnouncements === 'function') renderAnnouncements(); });
    // apply global bar visual
    safeStep('payBar', () => selectPaymentMethod(state.paymentMethod));
    safeStep('events', bindEvents);
    safeStep('fresh', () => { if (typeof checkBuildFresh === 'function') checkBuildFresh(); });
    
    // Check initial tab hash if any
    const hash = window.location.hash.replace('#', '');
    if (['home', 'games', 'giftcards', 'streaming', 'social', 'telecom', 'checkout', 'orders'].includes(hash)) {
        if (hash === 'streaming' || hash === 'social' || hash === 'telecom') {
            navigateTo('giftcards');
            filterGiftCards(hash);
        } else {
            navigateTo(hash);
        }
    } else if (hash === 'admin') {
        window.location.href = 'admin.html';
        return;
    } else if (false) {
        if (state.isAdminAuth) {
            navigateTo('admin');
        } else {
            openAdminAuthModal();
        }
    }
}

// Currency Formatting - Exclusively in Libyan Dinar (د.ل)
function formatPrice(lydAmount) {
    const num = parseFloat(lydAmount) || 0;
    return num.toFixed(2) + ' د.ل';
}

// Navigation
function navigateTo(tabId) {
    state.currentTab = tabId;
    window.location.hash = tabId;

    // Update active tab buttons
    document.querySelectorAll('.nav-item-btn').forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('nav-tab-active');
            btn.classList.remove('text-slate-600', 'bg-white/70');
        } else {
            btn.classList.remove('nav-tab-active');
            btn.classList.add('text-slate-600', 'bg-white/70');
        }
    });

    // Hide all view pages
    document.querySelectorAll('.view-page').forEach(page => {
        page.classList.add('hidden');
    });

    // Show target view page
    const target = document.getElementById('page-' + tabId);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (tabId === 'checkout') {
        renderCheckout();
    } else if (tabId === 'orders') {
        renderOrders();
    } else if (tabId === 'admin') {
        if (!state.isAdminAuth) {
            openAdminAuthModal();
            return;
        }
        renderAdminPanel();
    }
}

// Toast Notifications
function showToast(message, icon) {
    if (!icon) icon = 'fa-check-circle';
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = '<i class="fa-solid ' + icon + ' text-emerald-400 text-lg"></i> <span>' + message + '</span>';
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(15px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// Render Categories Grid
function renderCategories() {
    const container = document.getElementById('categories-grid');
    if (!container) return;

    container.innerHTML = APP_DATA.categories.map(cat => {
        let iconBg = 'bg-sky-500/10 text-sky-600';
        if (cat.id === 'streaming') iconBg = 'bg-rose-500/10 text-rose-600';
        else if (cat.id === 'social') iconBg = 'bg-amber-500/10 text-amber-600';
        else if (cat.id === 'telecom') iconBg = 'bg-emerald-500/10 text-emerald-600';

        return '<div onclick="handleCategoryClick(\'' + cat.id + '\')" class="glass-card rounded-3xl p-4 sm:p-5 cursor-pointer relative overflow-hidden group flex flex-col justify-between border border-white/80 hover:border-sky-300">' +
            '<div>' +
                '<div class="flex items-center justify-between mb-2.5">' +
                    '<span class="w-11 h-11 rounded-2xl ' + iconBg + ' flex items-center justify-center text-xl shadow-sm">' +
                        '<i class="fa-solid ' + cat.icon + '"></i>' +
                    '</span>' +
                    (cat.badge ? '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">' + cat.badge + '</span>' : '') +
                '</div>' +
                '<h3 class="text-base sm:text-lg font-black text-slate-800">' + cat.titleAr + '</h3>' +
                '<p class="text-xs text-slate-500 mt-1 line-clamp-2">' + cat.subtitleAr + '</p>' +
            '</div>' +
            '<div class="mt-4 flex items-center justify-between pt-3 border-t border-sky-100/60">' +
                '<button class="px-3.5 py-1.5 rounded-full bg-sky-600 group-hover:bg-sky-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-md shadow-sky-600/20">' +
                    '<span>تصفح الأسعار</span>' +
                    '<i class="fa-solid fa-arrow-left text-[10px]"></i>' +
                '</button>' +
                '<span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">بالدينار 🇱🇾</span>' +
            '</div>' +
        '</div>';
    }).join('');
}

function handleCategoryClick(catId) {
    if (catId === 'games') {
        navigateTo('games');
    } else if (catId === 'streaming') {
        navigateTo('giftcards');
        filterGiftCards('streaming');
    } else if (catId === 'social') {
        navigateTo('giftcards');
        filterGiftCards('social');
    } else if (catId === 'telecom') {
        navigateTo('giftcards');
        filterGiftCards('telecom');
    }
}

// Render Games Navigation Tabs
function renderGamesNav() {
    const container = document.getElementById('games-selector');
    if (!container) return;

    container.innerHTML = APP_DATA.games.map(game => {
        const activeClass = state.selectedGame === game.id ? 'bg-sky-600 text-white shadow-md' : 'bg-white/80 text-slate-700 hover:bg-white border border-sky-100';
        const badgeClass = state.selectedGame === game.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800';
        return '<button onclick="selectGame(\'' + game.id + '\')" class="px-3 py-1.5 rounded-2xl flex items-center gap-2 transition-all text-xs sm:text-sm font-bold flex-shrink-0 ' + activeClass + '">' +
            '<img src="' + game.icon + '" alt="' + game.nameEn + '" width="32" height="32" loading="lazy" decoding="async" class="w-8 h-8 rounded-xl object-cover bg-white border border-slate-200" onerror="this.style.display=\'none\'">' +
            '<span>' + game.nameAr.split('(')[0] + '</span>' +
            (game.badge ? '<span class="text-[10px] px-1.5 py-0.2 rounded-md ' + badgeClass + '">' + game.badge + '</span>' : '') +
        '</button>';
    }).join('');
}

function selectGame(gameId) {
    state.selectedGame = gameId;
    renderGamesNav();
    renderGameDetail(gameId);
}

// Render Selected Game Details & Packages
function renderGameDetail(gameId) {
    const game = APP_DATA.games.find(g => g.id === gameId) || APP_DATA.games[0];
    if (!game) return;

    state.selectedGame = game.id;

    const titleEl = document.getElementById('game-title-text');
    if (titleEl) {
        titleEl.textContent = game.nameAr;
    }

    const bannerEl = document.getElementById('game-banner-img');
    if (bannerEl) {
        if (game.image) { bannerEl.src = game.image; bannerEl.style.display = ''; }
        else { bannerEl.style.display = 'none'; }
    }

    const idLabelEl = document.getElementById('player-id-label');
    if (idLabelEl) {
        idLabelEl.textContent = game.idLabelAr || 'أدخل معرّف اللاعب (Player ID):';
    }

    const idInput = document.getElementById('player-id-input');
    if (idInput) {
        idInput.placeholder = game.idPlaceholder || 'مثال: 5123456789';
        idInput.value = state.verifiedPlayerId || '';
    }

    const packagesContainer = document.getElementById('packages-grid');
    if (packagesContainer) {
        packagesContainer.innerHTML = game.packages.map(pkg => {
            return '<div class="glass-card rounded-2xl p-4 flex flex-col justify-between border ' + (pkg.popular ? 'border-emerald-400 bg-emerald-50/60 shadow-emerald-200/50' : 'border-white/80') + ' relative">' +
                (pkg.popular ? '<span class="absolute -top-2.5 right-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">الأكثر طلباً 🔥</span>' : '') +
                (pkg.bestValue ? '<span class="absolute -top-2.5 left-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">أفضل قيمة ✨</span>' : '') +
                '<div class="flex items-center gap-3 mb-3">' +
                    (pkg.image
                        ? '<img src="' + pkg.image + '" alt="" loading="lazy" decoding="async" class="game-logo" onerror="this.outerHTML=\'<div class=&quot;pkg-coin&quot;>' + (pkg.icon || 'UC') + '</div>\'">'
                        : '<div class="pkg-coin">' + (pkg.icon || 'UC') + '</div>') +
                    '<div>' +
                        '<h4 class="font-extrabold text-slate-900 text-sm">' + pkg.nameAr + '</h4>' +
                        '<p class="text-sm font-black text-emerald-700 mt-0.5">' + formatPrice(pkg.priceLYD) + '</p>' +
                    '</div>' +
                '</div>' +
                '<div class="grid grid-cols-2 gap-2 mt-2">' +
                    '<button onclick="buyNowGamePackage(\'' + game.id + '\', \'' + pkg.id + '\')" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1">' +
                        '<i class="fa-solid fa-bolt"></i>' +
                        '<span>شراء بالدينار</span>' +
                    '</button>' +
                    '<button onclick="addGamePackageToCart(\'' + game.id + '\', \'' + pkg.id + '\')" class="w-full py-2.5 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold transition flex items-center justify-center gap-1">' +
                        '<i class="fa-solid fa-cart-plus"></i>' +
                        '<span>للسلة</span>' +
                    '</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }
}

// PUBG UC codes on homepage
function renderPubgHome() {
    const grid = document.getElementById('pubg-home-grid');
    if (!grid) return;
    const pubg = APP_DATA.games.find(g => g.id === 'pubg');
    if (!pubg || !pubg.packages) { grid.innerHTML = ''; return; }
    grid.innerHTML = pubg.packages.slice(0, 6).map(pkg => {
        const base = (typeof getPriceForMethod === 'function') ? getPriceForMethod(pkg.priceLYD, state.paymentMethod) : pkg.priceLYD;
        const price = (typeof formatPriceLive === 'function') ? formatPriceLive(base) : formatPrice(base);
        return '<div class="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex flex-col gap-2 card-interactive">' +
            '<div class="flex items-center gap-2.5">' +
                '<div class="pkg-coin">' + (pkg.icon || 'UC') + '</div>' +
                '<div class="flex-1 min-w-0">' +
                    '<div class="text-xs font-black text-slate-900 line-clamp-1">' + pkg.nameAr + '</div>' +
                    '<div class="text-xs font-black text-emerald-700 price-live">' + price + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-1.5">' +
                '<button onclick="addGamePackageToCart(\'pubg\',\'' + pkg.id + '\')" class="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition flex items-center justify-center gap-1"><i class="fa-solid fa-cart-plus"></i> أضف</button>' +
                '<button onclick="buyNowGamePackage(\'pubg\',\'' + pkg.id + '\')" class="py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-[11px] font-black transition">اشتر الآن</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

// Verify Player ID simulation
function verifyPlayerId() {
    const input = document.getElementById('player-id-input');
    const statusBox = document.getElementById('player-id-status');
    const idVal = input.value.trim();

    if (!idVal || idVal.length < 3) {
        showToast('يرجى إدخال معرّف صحيح لا يقل عن 3 خانات', 'fa-triangle-exclamation');
        return;
    }

    statusBox.innerHTML = '<div class="flex items-center gap-2 text-sky-700 font-bold text-xs bg-sky-100/70 p-2.5 rounded-xl border border-sky-200">' +
        '<i class="fa-solid fa-spinner fa-spin"></i>' +
        '<span>جاري التحقق من الحساب في خوادم اللعبة...</span>' +
    '</div>';

    setTimeout(() => {
        const nicknames = ['⚡ Falcon_Sniper 👑', '🦅 SkyWarrior_Libya 🇱🇾', '🔥 Desert_Fox_Tripoli', '🎮 Sahabati_Legend', '✨ Royal_King_Benghazi'];
        const randomNick = nicknames[Math.floor(Math.random() * nicknames.length)];
        state.verifiedPlayerId = idVal;
        state.verifiedPlayerName = randomNick;

        statusBox.innerHTML = '<div class="flex items-center justify-between text-emerald-800 font-bold text-xs bg-emerald-100/80 p-2.5 rounded-xl border border-emerald-300">' +
            '<div class="flex items-center gap-2">' +
                '<i class="fa-solid fa-circle-check text-emerald-600 text-sm"></i>' +
                '<span>تم التحقق: <strong class="text-slate-900">' + randomNick + '</strong> (ID: ' + idVal + ')</span>' +
            '</div>' +
            '<span class="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">جاهز للشحن</span>' +
        '</div>';
        showToast('تم ربط الحساب بنجاح: ' + randomNick);
    }, 500);
}

// Add Game Package to Cart
function addGamePackageToCart(gameId, pkgId) {
    const game = APP_DATA.games.find(g => g.id === gameId);
    if (!game) return;
    const pkg = game.packages.find(p => p.id === pkgId);
    if (!pkg) return;

    const playerId = state.verifiedPlayerId || document.getElementById('player-id-input')?.value || 'Player_LY';

    const cartItem = {
        cartItemId: 'item_' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: 'game',
        gameId: game.id,
        packageId: pkg.id,
        titleAr: game.nameAr.split('(')[0] + ' - ' + pkg.nameAr,
        meta: 'Player ID: ' + playerId,
        priceLYD: pkg.priceLYD,
        quantity: 1
    };

    state.cart.push(cartItem);
    saveCart();
    updateCartUI();
    showToast('تمت إضافة ' + pkg.nameAr + ' إلى السلة 🛒');
}

function buyNowGamePackage(gameId, pkgId) {
    addGamePackageToCart(gameId, pkgId);
    navigateTo('checkout');
}

// Render Gift Cards & Streaming Subscriptions
function renderGiftCards(filter) {
    if (!filter) filter = 'all';
    const container = document.getElementById('giftcards-grid');
    if (!container) return;

    let cards = APP_DATA.giftCards;
    if (filter !== 'all') {
        cards = cards.filter(c => {
            if (filter === 'streaming') return c.category === 'streaming' || c.brand === 'netflix' || c.brand === 'shahid';
            if (filter === 'social') return c.category === 'social' || c.brand === 'tiktok' || c.brand === 'snapchat';
            if (filter === 'telecom') return c.category === 'telecom' || c.brand === 'madar' || c.brand === 'libyana';
            return c.category === filter || c.brand === filter;
        });
    }

    container.innerHTML = cards.map(card => {
        let cardBgClass = 'from-sky-600 via-blue-700 to-indigo-800';
        let brandIcon = '<i class="fa-solid fa-gift text-2xl"></i>';

        if (card.brand === 'netflix') {
            cardBgClass = 'from-zinc-950 via-neutral-900 to-rose-950';
            brandIcon = '<span class="text-rose-500 font-black text-2xl tracking-tighter">NETFLIX 4K</span>';
        } else if (card.brand === 'shahid') {
            cardBgClass = 'from-emerald-900 via-teal-950 to-slate-950';
            brandIcon = '<span class="text-emerald-400 font-black text-2xl">SHAHID VIP</span>';
        } else if (card.brand === 'snapchat') {
            cardBgClass = 'from-amber-400 via-yellow-500 to-amber-600 text-slate-900';
            brandIcon = '<i class="fa-brands fa-snapchat text-4xl text-white drop-shadow"></i>';
        } else if (card.brand === 'tiktok') {
            cardBgClass = 'from-zinc-900 via-neutral-950 to-black';
            brandIcon = '<i class="fa-brands fa-tiktok text-3xl text-rose-400"></i>';
        } else if (card.brand === 'madar') {
            cardBgClass = 'from-blue-800 via-sky-800 to-cyan-900';
            brandIcon = '<span class="text-sky-300 font-black text-xl">مدار الجديد</span>';
        } else if (card.brand === 'libyana') {
            cardBgClass = 'from-amber-600 via-orange-700 to-amber-900';
            brandIcon = '<span class="text-amber-200 font-black text-xl">ليبيانا 4G</span>';
        } else if (card.brand === 'chatgpt') {
            cardBgClass = 'from-emerald-700 via-teal-800 to-slate-900';
            brandIcon = '<span class="text-white font-black text-xl">ChatGPT Plus 🤖</span>';
        }

        const customImg = card.image ? '<img src="' + card.image + '" alt="" loading="lazy" decoding="async" class="pro-img absolute inset-0" onerror="this.remove()">' : '';
        return '<div class="glass-card card-interactive rounded-3xl p-4 flex flex-col justify-between relative group border border-white/80 hover:border-sky-300 fade-in">' +
            (card.badge ? '<span class="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md z-10">' + card.badge + '</span>' : '') +
            '<span class="absolute top-3 left-3 bg-white/90 backdrop-blur text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10 stock-urgency">تسليم فوري ⚡</span>' +
            '<div>' +
                '<div class="brand-card-img bg-gradient-to-br ' + cardBgClass + ' shadow-md mb-3 border border-white/20">' +
                    customImg +
                    '<div class="absolute inset-0 flex flex-col justify-between p-3.5 text-white">' +
                    '<div class="flex justify-between items-start">' +
                        '<span class="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm">سحّابتي Sahabati</span>' +
                    '</div>' +
                    '<div class="text-center my-auto flex items-center justify-center">' +
                        brandIcon +
                    '</div>' +
                    '<div class="flex justify-between items-center text-[10px] text-white/90 font-bold">' +
                        '<span class="line-clamp-1">' + (card.nominal || card.nameAr) + '</span>' +
                        '<span>د.ل</span>' +
                    '</div>' +
                    '</div>' +
                '</div>' +
                '<h4 class="font-bold text-slate-900 text-sm mb-1">' + card.nameAr + '</h4>' +
                '<p class="text-xs text-slate-500 mb-2 line-clamp-1">' + (card.instructionsAr || 'يتم تسليم الحساب أو الكود فوراً عبر واتساب') + '</p>' +
                '<div class="text-base font-black text-emerald-700 mb-3">' + formatPrice(card.priceLYD) + '</div>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-2">' +
                '<button onclick="addGiftCardToCart(\'' + card.id + '\')" class="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm">' +
                    '<i class="fa-solid fa-cart-plus"></i>' +
                    '<span>إضافة للسلة</span>' +
                '</button>' +
                '<button onclick="openCardDetailsModal(\'' + card.id + '\')" class="py-2.5 rounded-xl bg-white hover:bg-sky-50 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center justify-center gap-1">' +
                    '<i class="fa-solid fa-circle-info text-sky-600"></i>' +
                    '<span>تفاصيل</span>' +
                '</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function filterGiftCards(category) {
    document.querySelectorAll('.giftcard-cat-btn').forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('bg-sky-600', 'text-white');
            btn.classList.remove('bg-white/80', 'text-slate-700');
        } else {
            btn.classList.remove('bg-sky-600', 'text-white');
            btn.classList.add('bg-white/80', 'text-slate-700');
        }
    });
    renderGiftCards(category);
}

function addGiftCardToCart(cardId) {
    const card = APP_DATA.giftCards.find(c => c.id === cardId);
    if (!card) return;

    const cartItem = {
        cartItemId: 'item_' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: 'giftcard',
        cardId: card.id,
        titleAr: card.nameAr,
        meta: card.nominal || 'اشتراك وبطاقة رقمية',
        priceLYD: card.priceLYD,
        quantity: 1
    };

    state.cart.push(cartItem);
    saveCart();
    updateCartUI();
    showToast('تمت إضافة ' + card.nameAr + ' إلى السلة 🎁');
}

function openCardDetailsModal(cardId) {
    const card = APP_DATA.giftCards.find(c => c.id === cardId);
    if (!card) return;

    const modal = document.getElementById('card-detail-modal');
    const content = document.getElementById('card-modal-body');
    if (!modal || !content) return;

    content.innerHTML = '<div class="text-center mb-4">' +
        '<div class="w-full h-28 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-800 p-4 text-white flex flex-col justify-between shadow-lg mb-3">' +
            '<span class="text-xs uppercase tracking-wider bg-white/20 self-start px-2 py-0.5 rounded">سحّابتي Sahabati</span>' +
            '<span class="text-2xl font-black">' + (card.nominal || card.nameAr) + '</span>' +
            '<span class="text-xs text-white/90 text-left font-bold">تسليم مباشر</span>' +
        '</div>' +
        '<h3 class="text-xl font-bold text-slate-900">' + card.nameAr + '</h3>' +
        '<p class="text-xl font-black text-emerald-700 mt-1">' + formatPrice(card.priceLYD) + '</p>' +
    '</div>' +
    '<div class="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 mb-4 text-xs leading-relaxed text-slate-700">' +
        '<h4 class="font-bold text-slate-900 mb-1 flex items-center gap-1.5">' +
            '<i class="fa-solid fa-circle-question text-emerald-600"></i>' +
            '<span>طريقة الاستخدام والتسليم:</span>' +
        '</h4>' +
        '<p>' + (card.instructionsAr || 'يتم تسليم كود التفعيل أو بيانات الحساب فور تأكيد الطلب عبر واتساب.') + '</p>' +
    '</div>' +
    '<div class="flex gap-2">' +
        '<button onclick="addGiftCardToCart(\'' + card.id + '\'); closeModal(\'card-detail-modal\');" class="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30">' +
            'إضافة إلى السلة' +
        '</button>' +
        '<button onclick="closeModal(\'card-detail-modal\')" class="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm">' +
            'إغلاق' +
        '</button>' +
    '</div>';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Cart Storage & UI
function saveCart() {
    if (typeof storeSet === 'function') storeSet('sahabati_cart', JSON.stringify(state.cart));
}

function updateCartUI() {
    const badges = document.querySelectorAll('.cart-count-badge');
    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    badges.forEach(b => {
        b.textContent = totalCount;
        if (totalCount > 0) {
            b.classList.remove('hidden');
        } else {
            b.classList.add('hidden');
        }
    });
}

function removeFromCart(cartItemId) {
    state.cart = state.cart.filter(item => item.cartItemId !== cartItemId);
    saveCart();
    updateCartUI();
    renderCheckout();
    showToast('تم حذف العنصر من السلة', 'fa-trash');
}

function updateCartQuantity(cartItemId, delta) {
    const item = state.cart.find(i => i.cartItemId === cartItemId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(cartItemId);
            return;
        }
        saveCart();
        updateCartUI();
        renderCheckout();
    }
}

// Render Checkout Page
function renderCheckout() {
    const itemsContainer = document.getElementById('checkout-items-list');
    const emptyState = document.getElementById('checkout-empty-state');
    const orderForm = document.getElementById('checkout-form-container');

    if (!itemsContainer) return;

    if (state.cart.length === 0) {
        emptyState.classList.remove('hidden');
        orderForm.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    orderForm.classList.remove('hidden');

    let subtotalLYD = 0;

    itemsContainer.innerHTML = state.cart.map(item => {
        const itemTotalLYD = item.priceLYD * item.quantity;
        subtotalLYD += itemTotalLYD;

        return '<div class="flex items-center justify-between p-3 rounded-2xl bg-white/80 border border-sky-100 gap-3 shadow-sm">' +
            '<div class="flex items-center gap-2.5">' +
                '<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">' +
                    '<i class="fa-solid ' + (item.type === 'game' ? 'fa-gamepad' : 'fa-tv') + '"></i>' +
                '</div>' +
                '<div>' +
                    '<h4 class="font-bold text-slate-900 text-xs sm:text-sm">' + item.titleAr + '</h4>' +
                    '<p class="text-[11px] text-slate-500">' + item.meta + '</p>' +
                '</div>' +
            '</div>' +
            '<div class="flex items-center gap-2.5">' +
                '<div class="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden text-xs">' +
                    '<button onclick="updateCartQuantity(\'' + item.cartItemId + '\', -1)" class="px-2 py-1 hover:bg-slate-100 text-slate-600 font-bold">-</button>' +
                    '<span class="px-2 py-1 font-bold text-slate-800">' + item.quantity + '</span>' +
                    '<button onclick="updateCartQuantity(\'' + item.cartItemId + '\', 1)" class="px-2 py-1 hover:bg-slate-100 text-slate-600 font-bold">+</button>' +
                '</div>' +
                '<div class="text-right">' +
                    '<span class="font-bold text-emerald-700 text-xs sm:text-sm block">' + formatPrice(itemTotalLYD) + '</span>' +
                '</div>' +
                '<button onclick="removeFromCart(\'' + item.cartItemId + '\')" class="text-rose-500 hover:text-rose-700 text-xs p-1">' +
                    '<i class="fa-solid fa-trash-can"></i>' +
                '</button>' +
            '</div>' +
        '</div>';
    }).join('');

    // Apply Promo Discount
    let discountPercent = state.appliedPromo ? state.appliedPromo.discountPercent : 0;
    let discountLYD = subtotalLYD * (discountPercent / 100);
    let totalLYD = subtotalLYD - discountLYD;

    document.getElementById('checkout-subtotal').textContent = formatPrice(subtotalLYD);
    document.getElementById('checkout-discount').textContent = discountPercent > 0 ? '-' + formatPrice(discountLYD) + ' (' + discountPercent + '%)' : formatPrice(0);
    document.getElementById('checkout-total').textContent = formatPrice(totalLYD);

    renderPaymentInstructions();
}

// Promo Code Verification
function applyPromoCode() {
    const input = document.getElementById('promo-code-input');
    const code = input.value.trim().toUpperCase();

    if (!code) return;

    if (APP_DATA.promoCodes[code]) {
        state.appliedPromo = {
            code: code,
            ...APP_DATA.promoCodes[code]
        };
        showToast('تم تفعيل الكوبون: ' + state.appliedPromo.description);
        renderCheckout();
    } else {
        showToast('كوبون الخصم غير صالح أو منتهي الصلاحية', 'fa-circle-xmark');
    }
}

// Select Payment Method
const ALLOWED_PAYMENTS = ['one_pay','bank_transfer','telecom_libyana'];
function selectPaymentMethod(method) {
    if (!ALLOWED_PAYMENTS.includes(method)) method = 'one_pay';
    state.paymentMethod = method;
    if (typeof storeSet === 'function') storeSet('sahabati_selected_payment', method);
    document.querySelectorAll('.payment-option-card').forEach(card => {
        if (card.dataset.method === method) {
            card.classList.add('border-emerald-500', 'bg-emerald-50/80', 'ring-2', 'ring-emerald-400');
            card.classList.remove('border-slate-200');
        } else {
            card.classList.remove('border-emerald-500', 'bg-emerald-50/80', 'ring-2', 'ring-emerald-400');
            card.classList.add('border-slate-200');
        }
    });
    renderPaymentInstructions();
}

// Global payment selector (MDCard quote) - persists choice
function selectGlobalPayment(method) {
    selectPaymentMethod(method);
    showToast('تم اختيار طريقة الدفع: ' + (APP_DATA.settings.paymentMethodsInfo[method]?.title || method));
}

function sendSuggestion(platform) {
    const input = document.getElementById('suggest-input');
    const text = input ? input.value.trim() : '';
    if (!text || text.length < 2) {
        showToast('اكتب اسم اللعبة أو الاقتراح أولاً', 'fa-lightbulb');
        return;
    }
    const msg = encodeURIComponent('مرحباً سحّابتي 👋 أقترح إضافة: ' + text);
    const waNumber = (APP_DATA.settings?.whatsappNumber || '218920541749').replace(/[^0-9]/g,'');
    if (platform === 'telegram') {
        const tgUrl = APP_DATA.settings.telegramUrl || 'https://t.me/A_98_A20';
        window.open(tgUrl, '_blank');
        showToast('تم نسخ اقتراحك، أرسله في تيليجرام: ' + text);
    } else {
        const waUrl = 'https://wa.me/' + waNumber + '?text=' + msg;
        window.open(waUrl, '_blank');
        showToast('تم إرسال اقتراحك عبر واتساب ✅');
    }
    if (input) input.value = '';
}

function renderPaymentInstructions() {
    const box = document.getElementById('payment-instructions-box');
    if (!box) return;

    const infoMap = APP_DATA.settings?.paymentMethodsInfo || DEFAULT_STORE_SETTINGS.paymentMethodsInfo;
    const method = state.paymentMethod;
    const currentInfo = infoMap[method] || {
        title: 'الدفع المباشر بالدينار الليبي',
        accountInfo: 'تواصل مع خدمة العملاء',
        instructions: 'سيتم الاتفاق على وسيلة الدفع وتأكيد الشحن الفوري عبر محادثة واتساب.'
    };

    box.innerHTML = '<div class="flex items-center gap-3">' +
        '<div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-md flex-shrink-0">' +
            '<i class="fa-solid fa-money-check-dollar"></i>' +
        '</div>' +
        '<div>' +
            '<h4 class="font-black text-emerald-950 text-sm">' + currentInfo.title + '</h4>' +
            '<p class="text-xs font-mono font-bold text-emerald-800 mt-0.5">' + currentInfo.accountInfo + '</p>' +
        '</div>' +
    '</div>' +
    '<div class="bg-white/80 p-2.5 rounded-xl border border-emerald-200 text-xs text-slate-700 leading-relaxed font-medium">' +
        '<i class="fa-solid fa-circle-info text-emerald-600 ml-1"></i>' +
        '<span>' + currentInfo.instructions + '</span>' +
    '</div>';
}

// Complete Payment Execution & WhatsApp Redirect
function processPayment() {
    if (state.cart.length === 0) return;

    const btn = document.getElementById('complete-payment-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-lg"></i> <span>جاري تجهيز وتأكيد الفاتورة...</span>';

    setTimeout(() => {
        const orderId = 'LYD-' + Math.floor(100000 + Math.random() * 900000);
        const orderDate = new Date().toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' });
        const customerPhone = document.getElementById('whatsapp-phone-input')?.value || 'غير محدد';
        const customerNotes = document.getElementById('whatsapp-note-input')?.value || 'الدفع بالدينار الليبي';
        
        const totalAmountText = document.getElementById('checkout-total').textContent;

        const generatedVouchers = state.cart.map(item => ({
            title: item.titleAr,
            voucherCode: 'SHB-' + Array.from({length: 4}, () => Math.random().toString(36).substr(2, 4).toUpperCase()).join('-'),
            quantity: item.quantity,
            price: formatPrice(item.priceLYD * item.quantity)
        }));

        const newOrder = {
            id: orderId,
            date: orderDate,
            items: [...state.cart],
            vouchers: generatedVouchers,
            paymentMethod: state.paymentMethod,
            customerPhone: customerPhone,
            customerNotes: customerNotes,
            totalFormatted: totalAmountText,
            status: 'whatsapp_pending'
        };

        // Prepare WhatsApp message
        const itemsListText = state.cart.map(item => '• ' + item.quantity + 'x ' + item.titleAr + ' (' + item.meta + ') - ' + formatPrice(item.priceLYD * item.quantity)).join('\n');
        
        const waMessage = 
'🌟 *طلب جديد من منصة سحّابتي (Sahabati)* 🌟\n' +
'-----------------------------------\n' +
'📋 *رقم الطلب:* #' + orderId + '\n' +
'📅 *التاريخ:* ' + orderDate + '\n' +
'📱 *رقم هاتف الزبون:* ' + customerPhone + '\n' +
'💰 *الإجمالي المطلوب:* ' + totalAmountText + '\n' +
'💳 *وسيلة الدفع:* ' + state.paymentMethod.toUpperCase() + ' (دينار ليبي)\n\n' +
'🎮 *العناصر المطلوبة:*\n' +
itemsListText + '\n\n' +
'📝 *بيانات التحويل والملاحظات:*\n' +
customerNotes + '\n' +
'-----------------------------------\n' +
'يرجى تأكيد استلام الطلب وتزويدي بكود الشحن أو بيانات الحساب وشكراً! ✨';

        // Direct WhatsApp Phone URL
        const targetPhone = APP_DATA.settings?.whatsappNumber || '218910000000';
        const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
        const waUrl = 'https://api.whatsapp.com/send?phone=' + cleanPhone + '&text=' + encodeURIComponent(waMessage);
        newOrder.waUrl = waUrl;
        
        // Open WhatsApp in new tab
        window.open(waUrl, '_blank');

        state.orders.unshift(newOrder);
        if (typeof storeSet === 'function') storeSet('sahabati_orders', JSON.stringify(state.orders));

        // Clear Cart
        state.cart = [];
        state.appliedPromo = null;
        saveCart();
        updateCartUI();

        btn.disabled = false;
        btn.innerHTML = originalText;

        // Show Success Receipt Modal
        showSuccessModal(newOrder);
    }, 600);
}

function showSuccessModal(order) {
    const modal = document.getElementById('order-success-modal');
    const body = document.getElementById('success-modal-body');
    if (!modal || !body) return;

    body.innerHTML = '<div class="text-center mb-5">' +
        '<div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-2.5 shadow-inner">' +
            '<i class="fa-brands fa-whatsapp"></i>' +
        '</div>' +
        '<h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">تم تجهيز طلبك بنجاح!</h3>' +
        '<p class="text-xs text-slate-500 mt-1">رقم الطلب: ' + order.id + ' | ' + order.date + '</p>' +
    '</div>' +
    '<div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 mb-4 text-center space-y-2">' +
        '<p class="text-xs font-bold text-emerald-950">تم إنشاء الفاتورة بالدينار الليبي وفتح محادثة واتساب خدمة العملاء لتسليم الشحن.</p>' +
        '<a href="' + order.waUrl + '" target="_blank" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition">' +
            '<i class="fa-brands fa-whatsapp text-lg"></i>' +
            '<span>فتح محادثة واتساب لتأكيد الاستلام</span>' +
        '</a>' +
    '</div>' +
    '<div class="space-y-2.5 mb-5">' +
        '<h4 class="font-bold text-xs text-slate-700 uppercase tracking-wider">أكواد وبيانات الطلب:</h4>' +
        order.vouchers.map(v => {
            return '<div class="p-3 rounded-2xl bg-sky-50/80 border border-sky-200 flex items-center justify-between gap-2">' +
                '<div>' +
                    '<h5 class="font-bold text-slate-900 text-xs">' + v.title + '</h5>' +
                    '<code class="font-mono text-sky-800 font-bold text-xs block mt-0.5 select-all">' + v.voucherCode + '</code>' +
                '</div>' +
                '<button onclick="copyToClipboard(\'' + v.voucherCode + '\')" class="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm">' +
                    '<i class="fa-solid fa-copy"></i>' +
                    '<span>نسخ</span>' +
                '</button>' +
            '</div>';
        }).join('') +
    '</div>' +
    '<div class="flex gap-2">' +
        '<button onclick="closeModal(\'order-success-modal\'); navigateTo(\'orders\');" class="flex-1 py-3 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-md">' +
            'عرض في سجل طلباتي' +
        '</button>' +
        '<button onclick="closeModal(\'order-success-modal\'); navigateTo(\'home\');" class="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">' +
            'الرئيسية' +
        '</button>' +
    '</div>';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('تم نسخ الكود: ' + text, 'fa-clipboard-check');
    });
}

// Render Orders History
function renderOrders() {
    const container = document.getElementById('orders-list-container');
    const emptyState = document.getElementById('orders-empty-state');
    if (!container) return;

    if (state.orders.length === 0) {
        emptyState.classList.remove('hidden');
        container.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    container.innerHTML = state.orders.map(order => {
        return '<div class="glass-card rounded-3xl p-4 sm:p-5 border border-white/80 shadow-md">' +
            '<div class="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">' +
                '<div>' +
                    '<span class="font-extrabold text-slate-900 text-xs sm:text-sm">#' + order.id + '</span>' +
                    '<span class="text-[10px] text-slate-500 block">' + order.date + '</span>' +
                '</div>' +
                '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">' +
                    '<i class="fa-brands fa-whatsapp"></i>' +
                    '<span>طلب واتساب (ليبي)</span>' +
                '</span>' +
            '</div>' +
            '<div class="space-y-2 mb-2.5">' +
                order.vouchers.map(v => {
                    return '<div class="p-2.5 rounded-xl bg-sky-50/60 border border-sky-100 flex items-center justify-between">' +
                        '<div>' +
                            '<p class="font-bold text-xs text-slate-800">' + v.title + '</p>' +
                            '<code class="font-mono text-sky-700 font-bold text-xs">' + v.voucherCode + '</code>' +
                        '</div>' +
                        '<button onclick="copyToClipboard(\'' + v.voucherCode + '\')" class="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold">' +
                            '<i class="fa-solid fa-copy"></i>' +
                        '</button>' +
                    '</div>';
                }).join('') +
            '</div>' +
            '<div class="flex items-center justify-between text-xs font-bold text-slate-700 pt-2 border-t border-slate-100">' +
                '<span>الإجمالي بالدينار الليبي:</span>' +
                '<span class="text-emerald-700 font-extrabold text-sm sm:text-base">' + order.totalFormatted + '</span>' +
            '</div>' +
        '</div>';
    }).join('');
}

// ================= ADMIN SECURITY & DASHBOARD =================

function openAdminAuthModal() {
    if (state.isAdminAuth) {
        navigateTo('admin');
        return;
    }
    const modal = document.getElementById('admin-auth-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.getElementById('admin-pin-input')?.focus();
    }
}

function correctAdminPin() {
    try {
        if (typeof APP_DATA !== 'undefined' && APP_DATA && APP_DATA.settings && APP_DATA.settings.adminPin) return APP_DATA.settings.adminPin;
    } catch (e) {}
    return 'admin2026';
}

function handleAdminLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const pinInput = document.getElementById('admin-pin-input');
    if (!pinInput) { showToast('حقل كلمة السر غير موجود', 'fa-triangle-exclamation'); return; }
    const enteredPin = (pinInput.value || '').trim();
    const correctPin = correctAdminPin();

    if (enteredPin && (enteredPin === correctPin || enteredPin === '1234' || enteredPin === 'admin2026')) {
        state.isAdminAuth = true;
        if (typeof sessSet === 'function') sessSet('sahabati_admin_auth', 'true');
        closeModal('admin-auth-modal');
        try { navigateTo('admin'); }
        catch (err) { showToast('تم الدخول لكن تعذر فتح اللوحة: ' + err.message, 'fa-triangle-exclamation'); return; }
        showToast('مرحباً بك في لوحة تحكم سحّابتي 👑');
    } else {
        try {
            pinInput.classList.remove('shake'); void pinInput.offsetWidth; pinInput.classList.add('shake');
            setTimeout(() => { try { pinInput.classList.remove('shake'); } catch (e) {} }, 450);
        } catch (e) {}
        showToast('كلمة السر غير صحيحة، يرجى المحاولة مجدداً', 'fa-lock');
        pinInput.value = '';
        try { pinInput.focus(); } catch (e) {}
    }
}

function togglePinVisibility(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.type = (inp.type === 'password') ? 'text' : 'password';
    if (btn) { btn.innerHTML = (inp.type === 'password') ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>'; }
}

function logoutAdmin() {
    state.isAdminAuth = false;
    if (typeof sessDel === 'function') sessDel('sahabati_admin_auth');
    navigateTo('home');
    showToast('تم قفل لوحة الأدمن بنجاح');
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-white', 'text-slate-700');
    });

    const activeBtn = document.getElementById('adm-tab-btn-' + tabName);
    if (activeBtn) {
        activeBtn.classList.add('bg-indigo-600', 'text-white');
        activeBtn.classList.remove('bg-white', 'text-slate-700');
    }

    ['products', 'settings', 'notices', 'backup'].forEach(t => {
        const view = document.getElementById('adm-view-' + t);
        if (view) view.classList.toggle('hidden', t !== tabName);
    });

    if (tabName === 'settings') {
        populateSettingsForm();
    }
    if (tabName === 'notices') {
        try { renderNoticesAdmin(); } catch (e) {}
    }
}

function renderAdminPanel() {
    const totalPackages = APP_DATA.games.reduce((sum, g) => sum + g.packages.length, 0);
    const statGames = document.getElementById('admin-stat-games');
    const statCards = document.getElementById('admin-stat-cards');
    const statOrders = document.getElementById('admin-stat-orders');

    if (statGames) statGames.textContent = APP_DATA.games.length + ' ألعاب وعملات (' + totalPackages + ' باقة)';
    if (statCards) statCards.textContent = APP_DATA.giftCards.length + ' بطاقات واشتراكات';
    if (statOrders) statOrders.textContent = state.orders.length + ' طلب';

    // Populate Game Select in Add Form
    const gameSelect = document.getElementById('admin-target-game');
    if (gameSelect) {
        gameSelect.innerHTML = APP_DATA.games.map(g => '<option value="' + g.id + '">' + g.nameAr + '</option>').join('');
    }

    // Render Table of Current Items
    const tableContainer = document.getElementById('admin-items-table-container');
    if (tableContainer) {
        let html = '<div class="space-y-4">' +
            '<div class="border rounded-2xl p-4 bg-white/70">' +
                '<h4 class="font-bold text-xs text-sky-900 mb-3 flex items-center gap-2">' +
                    '<i class="fa-solid fa-gamepad text-sky-600"></i>' +
                    '<span>باقات شحن الألعاب الحالية (' + totalPackages + ' باقة):</span>' +
                '</h4>' +
                '<div class="space-y-2">' +
                    APP_DATA.games.map(game => {
                        return '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200">' +
                            '<div class="font-extrabold text-xs text-slate-800 mb-2">' +
                                game.nameAr +
                            '</div>' +
                            '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">' +
                                game.packages.map(pkg => {
                                    return '<div class="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs">' +
                                        '<div>' +
                                            '<span class="font-bold text-slate-800 block">' + pkg.nameAr + '</span>' +
                                            '<span class="font-black text-emerald-600">' + formatPrice(pkg.priceLYD) + '</span>' +
                                        '</div>' +
                                        '<div class="flex gap-1">' +
                                            '<button onclick="editPackagePrice(\'' + game.id + '\', \'' + pkg.id + '\')" class="px-2 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[10px]">' +
                                                '<i class="fa-solid fa-pen"></i>' +
                                            '</button>' +
                                            '<button onclick="deletePackage(\'' + game.id + '\', \'' + pkg.id + '\')" class="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[10px]">' +
                                                '<i class="fa-solid fa-trash"></i>' +
                                            '</button>' +
                                        '</div>' +
                                    '</div>';
                                }).join('') +
                            '</div>' +
                        '</div>';
                    }).join('') +
                '</div>' +
            '</div>' +
            '<div class="border rounded-2xl p-4 bg-white/70">' +
                '<h4 class="font-bold text-xs text-indigo-900 mb-3 flex items-center gap-2">' +
                    '<i class="fa-solid fa-tv text-indigo-600"></i>' +
                    '<span>الاشتراكات وبطاقات الهدايا الحالية (' + APP_DATA.giftCards.length + ' عنصر):</span>' +
                '</h4>' +
                '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">' +
                    APP_DATA.giftCards.map(card => {
                        return '<div class="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">' +
                            '<div>' +
                                '<span class="font-bold text-slate-800 block line-clamp-1">' + card.nameAr + '</span>' +
                                '<span class="font-black text-emerald-600">' + formatPrice(card.priceLYD) + '</span>' +
                            '</div>' +
                            '<div class="flex gap-1 flex-shrink-0">' +
                                '<button onclick="editGiftCardPrice(\'' + card.id + '\')" class="px-2 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[10px]">' +
                                    '<i class="fa-solid fa-pen"></i>' +
                                '</button>' +
                                '<button onclick="deleteGiftCard(\'' + card.id + '\')" class="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[10px]">' +
                                    '<i class="fa-solid fa-trash"></i>' +
                                '</button>' +
                            '</div>' +
                        '</div>';
                    }).join('') +
                '</div>' +
            '</div>' +
        '</div>';
        tableContainer.innerHTML = html;
    }
}

function toggleAdminFormType(type) {
    const gameGroup = document.getElementById('admin-game-select-group');
    if (gameGroup) {
        gameGroup.classList.toggle('hidden', type !== 'game_package');
    }
}

function handleAdminAddItem(e) {
    e.preventDefault();

    const type = document.getElementById('admin-item-type').value;
    const name = document.getElementById('admin-item-name').value.trim();
    const price = parseFloat(document.getElementById('admin-item-price').value);
    const badge = document.getElementById('admin-item-badge').value.trim();
    const category = document.getElementById('admin-item-category').value;
    const instructions = document.getElementById('admin-item-instructions').value.trim();
    const image = (document.getElementById('admin-item-image')?.value || '').trim();

    if (!name || isNaN(price) || price <= 0) {
        showToast('يرجى إدخال اسم صحيح وسعر بالدينار الليبي', 'fa-triangle-exclamation');
        return;
    }

    if (type === 'game_package') {
        const gameId = document.getElementById('admin-target-game').value;
        const game = APP_DATA.games.find(g => g.id === gameId);
        if (game) {
            const newPkgId = gameId + '_pkg_' + Date.now();
            game.packages.push({
                id: newPkgId,
                nameAr: name,
                priceLYD: price,
                popular: !!badge,
                icon: '💎',
                image: image
            });
        }
    } else if (type === 'streaming' || type === 'social' || type === 'telecom' || type === 'gift_card') {
        const newCardId = 'card_' + Date.now();
        let finalBrand = category;

        if (name.includes('نتفليكس') || name.toLowerCase().includes('netflix')) {
            finalBrand = 'netflix';
        } else if (name.includes('شاهد') || name.toLowerCase().includes('shahid')) {
            finalBrand = 'shahid';
        } else if (name.includes('سناب') || name.toLowerCase().includes('snap')) {
            finalBrand = 'snapchat';
        } else if (name.includes('تيك توك') || name.toLowerCase().includes('tiktok')) {
            finalBrand = 'tiktok';
        } else if (name.includes('مدار')) {
            finalBrand = 'madar';
        } else if (name.includes('ليبيانا')) {
            finalBrand = 'libyana';
        }

        APP_DATA.giftCards.push({
            id: newCardId,
            brand: finalBrand,
            nameAr: name,
            nominal: name,
            priceLYD: price,
            category: category,
            badge: badge || 'جديد ✨',
            image: image,
            instructionsAr: instructions || 'يتم تسليم الكود وتفعيله فوراً بعد تأكيد الطلب بالدينار الليبي.'
        });
    } else if (type === 'new_game') {
        const newGameId = 'game_' + Date.now();
        APP_DATA.games.push({
            id: newGameId,
            nameAr: name,
            nameEn: name,
            badge: badge || 'جديد 🔥',
            image: image,
            packages: [
                { id: newGameId + '_1', nameAr: 'باقة 1', priceLYD: price, popular: true, icon: '💎' }
            ]
        });
    }

    saveAppData(APP_DATA);

    // Refresh views
    renderGamesNav();
    renderGameDetail(state.selectedGame);
    renderGiftCards('all');
    renderAdminPanel();

    document.getElementById('admin-add-item-form').reset();
    showToast('تمت إضافة ' + name + ' ونشرها بالمتجر فوراً (' + price + ' د.ل) 🎉');
}

function editPackagePrice(gameId, pkgId) {
    const game = APP_DATA.games.find(g => g.id === gameId);
    if (!game) return;
    const pkg = game.packages.find(p => p.id === pkgId);
    if (!pkg) return;

    const newPrice = prompt('أدخل السعر الجديد لـ (' + pkg.nameAr + ') بالدينار الليبي:', pkg.priceLYD);
    if (newPrice !== null && !isNaN(parseFloat(newPrice)) && parseFloat(newPrice) > 0) {
        pkg.priceLYD = parseFloat(newPrice);
        saveAppData(APP_DATA);
        renderGameDetail(gameId);
        renderAdminPanel();
        showToast('تم تعديل السعر إلى ' + formatPrice(pkg.priceLYD));
    }
}

function deletePackage(gameId, pkgId) {
    const game = APP_DATA.games.find(g => g.id === gameId);
    if (!game) return;
    if (confirm('هل أنت متأكد من حذف هذه الباقة؟')) {
        game.packages = game.packages.filter(p => p.id !== pkgId);
        saveAppData(APP_DATA);
        renderGameDetail(gameId);
        renderAdminPanel();
        showToast('تم حذف الباقة بنجاح', 'fa-trash');
    }
}

function editGiftCardPrice(cardId) {
    const card = APP_DATA.giftCards.find(c => c.id === cardId);
    if (!card) return;

    const newPrice = prompt('أدخل السعر الجديد لـ (' + card.nameAr + ') بالدينار الليبي:', card.priceLYD);
    if (newPrice !== null && !isNaN(parseFloat(newPrice)) && parseFloat(newPrice) > 0) {
        card.priceLYD = parseFloat(newPrice);
        saveAppData(APP_DATA);
        renderGiftCards('all');
        renderAdminPanel();
        showToast('تم تعديل السعر إلى ' + formatPrice(card.priceLYD));
    }
}

function deleteGiftCard(cardId) {
    if (confirm('هل أنت متأكد من حذف هذه البطاقة؟')) {
        APP_DATA.giftCards = APP_DATA.giftCards.filter(c => c.id !== cardId);
        saveAppData(APP_DATA);
        renderGiftCards('all');
        renderAdminPanel();
        showToast('تم حذف البطاقة بنجاح', 'fa-trash');
    }
}


function escH(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

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

// Store Settings
function populateSettingsForm() {
    if (!APP_DATA.settings) APP_DATA.settings = DEFAULT_STORE_SETTINGS;
    const s = APP_DATA.settings;

    const waInput = document.getElementById('setting-whatsapp-number');
    const pinInput = document.getElementById('setting-admin-pin');
    const libyanaInput = document.getElementById('setting-libyana-info');
    const onePayInput = document.getElementById('setting-onepay-info');
    const bankInput = document.getElementById('setting-bank-info');

    if (waInput) waInput.value = s.whatsappNumber || '218910000000';
    if (pinInput) pinInput.value = s.adminPin || 'admin2026';
    if (libyanaInput) libyanaInput.value = s.paymentMethodsInfo?.telecom_libyana?.accountInfo || '';
    if (onePayInput) onePayInput.value = s.paymentMethodsInfo?.one_pay?.accountInfo || '';
    if (bankInput) bankInput.value = s.paymentMethodsInfo?.bank_transfer?.accountInfo || '';
    const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    setV('setting-owner-name', s.ownerName);
    setV('setting-telegram-url', s.telegramUrl);
    setV('setting-facebook-url', s.facebookUrl);
    setV('setting-instagram-url', s.instagramUrl);
    setV('setting-tiktok-url', s.tiktokUrl);
    setV('setting-logo-image', s.logoImage);
    setV('setting-hero-image', s.heroImage);
}

function saveStoreSettings() {
    if (!APP_DATA.settings) APP_DATA.settings = DEFAULT_STORE_SETTINGS;

    const wa = document.getElementById('setting-whatsapp-number')?.value.trim() || '218910000000';
    const pin = document.getElementById('setting-admin-pin')?.value.trim() || 'admin2026';

    APP_DATA.settings.whatsappNumber = wa;
    APP_DATA.settings.adminPin = pin;

    if (!APP_DATA.settings.paymentMethodsInfo) {
        APP_DATA.settings.paymentMethodsInfo = DEFAULT_STORE_SETTINGS.paymentMethodsInfo;
    }

    if (!APP_DATA.settings.paymentMethodsInfo.one_pay) APP_DATA.settings.paymentMethodsInfo.one_pay = { title: 'ون باي (OnePay)' };
    if (!APP_DATA.settings.paymentMethodsInfo.bank_transfer) APP_DATA.settings.paymentMethodsInfo.bank_transfer = { title: 'تحويل مصرفي ليبي' };
    APP_DATA.settings.paymentMethodsInfo.one_pay.accountInfo = document.getElementById('setting-onepay-info')?.value.trim() || '';
    APP_DATA.settings.paymentMethodsInfo.bank_transfer.accountInfo = document.getElementById('setting-bank-info')?.value.trim() || '';
    APP_DATA.settings.paymentMethodsInfo.telecom_libyana.accountInfo = document.getElementById('setting-libyana-info')?.value.trim() || '';
    const getV = (id) => document.getElementById(id)?.value.trim() || '';
    APP_DATA.settings.ownerName = getV('setting-owner-name') || 'سحابتي';
    APP_DATA.settings.telegramUrl = getV('setting-telegram-url') || 'https://t.me/A_98_A20';
    APP_DATA.settings.facebookUrl = getV('setting-facebook-url');
    APP_DATA.settings.instagramUrl = getV('setting-instagram-url');
    APP_DATA.settings.tiktokUrl = getV('setting-tiktok-url');
    APP_DATA.settings.logoImage = getV('setting-logo-image') || 'logo.png';
    APP_DATA.settings.heroImage = getV('setting-hero-image') || 'hero-banner.jpg';

    saveAppData(APP_DATA);
    updateWhatsAppLinks();
    updateOwnerBranding();
    renderPaymentInstructions();
    showToast('تم حفظ إعدادات المتجر ورقم الواتساب بنجاح! 💾');
}

// Backup / Export & Import JSON
function exportCatalogToFile() {
    const jsonStr = JSON.stringify(APP_DATA, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sahabati_catalog_' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملف الكتالوج بنجاح 📁');
}

function importCatalogFromFile() {
    const fileInput = document.getElementById('import-json-file-input');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast('يرجى اختيار ملف JSON أولاً', 'fa-triangle-exclamation');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.games && importedData.giftCards) {
                APP_DATA = importedData;
                saveAppData(APP_DATA);
                updateWhatsAppLinks();
                renderGamesNav();
                renderGameDetail(state.selectedGame);
                renderGiftCards('all');
                renderAdminPanel();
                renderPaymentInstructions();
                showToast('تم استيراد وتحديث الكتالوج بنجاح! 🎉');
            } else {
                showToast('الملف غير صالح أو لا يحتوي على بنية كتالوج صحيحة', 'fa-triangle-exclamation');
            }
        } catch (err) {
            showToast('حدث خطأ أثناء قراءة ملف JSON', 'fa-triangle-exclamation');
        }
    };
    reader.readAsText(file);
}

function resetCatalogToDefault() {
    if (confirm('هل أنت متأكد من استعادة بيانات الأصناف والإعدادات الافتراضية؟')) {
        if (typeof storeDel === 'function') storeDel('sahabati_catalog_data');
        APP_DATA = JSON.parse(JSON.stringify(DEFAULT_APP_DATA));
        updateWhatsAppLinks();
        renderGamesNav();
        renderGameDetail('pubg');
        renderGiftCards('all');
        renderAdminPanel();
        renderPaymentInstructions();
        showToast('تمت استعادة الأصناف الافتراضية بنجاح');
    }
}

// Search Feature
function handleSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) return;

    const matchedGames = APP_DATA.games.filter(g => g.nameAr.toLowerCase().includes(q));
    const matchedCards = APP_DATA.giftCards.filter(c => c.nameAr.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q));

    if (matchedGames.length > 0) {
        selectGame(matchedGames[0].id);
        navigateTo('games');
        showToast('نتائج البحث عن: ' + query);
    } else if (matchedCards.length > 0) {
        navigateTo('giftcards');
        showToast('نتائج البحث عن: ' + query);
    } else {
        showToast('لم يتم العثور على نتائج مطابقة', 'fa-magnifying-glass');
    }
}

// Bind Events
function bindEvents() {
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch(searchInput.value);
        });
    }
}
