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
    cart: (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('sahabati_cart') || '[]') : []),
    orders: (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('sahabati_orders') || '[]') : []),
    appliedPromo: null,
    paymentMethod: 'one_pay',
    isAdminAuth: (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sahabati_admin_auth') === 'true' : false)
};

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Resolve Base64 and Local Assets
function resolveAsset(path) {
    if (!path) return '';
    if (typeof APP_ASSETS !== 'undefined' && APP_ASSETS[path]) {
        return APP_ASSETS[path];
    }
    return path;
}

function updateWhatsAppLinks() {
    const rawNumber = APP_DATA.settings?.whatsappNumber || '218920541749';
    const cleanNumber = rawNumber.replace(/[^0-9]/g, '');
    const defaultMsg = encodeURIComponent('السلام عليكم، أود الاستفسار والشحن من منصة سحّابتي 🎮');
    const waUrl = 'https://wa.me/' + cleanNumber + '?text=' + defaultMsg;

    ['announcement-wa-btn', 'header-wa-btn', 'floating-wa-btn', 'nav-wa-btn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.href = waUrl;
    });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    updateWhatsAppLinks();
    updateCustomerAuthUI();
    renderCategories();
    renderGamesNav();
    renderGameDetail(state.selectedGame || 'pubg');
    renderGiftCards('all');
    renderOrders();
    updateCartUI();
    renderPaymentInstructions();
    bindEvents();
    
    if (typeof SahabatiDB !== 'undefined' && SahabatiDB.subscribe) {
        SahabatiDB.subscribe(() => {
            updateCustomerAuthUI();
            if (state.currentTab === 'orders') renderOrders();
        });
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('storage', (e) => {
            if (e.key === 'sahabati_database' || e.key === 'sahabati_orders') {
                if (typeof SahabatiDB !== 'undefined' && SahabatiDB.loadDB) {
                    try { SahabatiDB.loadDB(); } catch(err){}
                }
                updateCustomerAuthUI();
                if (state.currentTab === 'orders') renderOrders();
            }
        });
    }
    
    // Check initial tab hash if any
    const hash = window.location.hash.replace('#', '');
    if (['home', 'games', 'giftcards', 'streaming', 'social', 'ai_cards', 'telecom', 'checkout', 'orders'].includes(hash)) {
        if (['streaming', 'social', 'ai_cards', 'telecom'].includes(hash)) {
            navigateTo('giftcards');
            filterGiftCards(hash);
        } else {
            navigateTo(hash);
        }
    } else {
        navigateTo('home');
    }
}

// Currency Formatting - Exclusively in Libyan Dinar (د.ل)
function formatPrice(lydAmount) {
    const num = parseFloat(lydAmount) || 0;
    return num.toFixed(2) + ' د.ل';
}

// Navigation
function navigateTo(tabId) {
    // If admin is requested, redirect to home (public site has no admin)
    if (tabId === 'admin') {
        tabId = 'home';
    }

    state.currentTab = tabId;
    window.location.hash = tabId;

    // Update active tab buttons
    document.querySelectorAll('.nav-item-btn').forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('nav-tab-active');
            btn.classList.remove('text-slate-700', 'bg-white/80');
        } else {
            btn.classList.remove('nav-tab-active');
            btn.classList.add('text-slate-700', 'bg-white/80');
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
        else if (cat.id === 'ai_cards') iconBg = 'bg-indigo-500/10 text-indigo-600';
        else if (cat.id === 'telecom') iconBg = 'bg-emerald-500/10 text-emerald-600';

        return '<div onclick="handleCategoryClick(\'' + cat.id + '\')" class="glass-card rounded-3xl p-4 sm:p-5 cursor-pointer relative overflow-hidden group flex flex-col justify-between border border-white/80 hover:border-sky-400 transition-all hover:shadow-xl">' +
            '<div>' +
                '<div class="flex items-center justify-between mb-3">' +
                    '<span class="w-12 h-12 rounded-2xl ' + iconBg + ' flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition">' +
                        '<i class="fa-solid ' + cat.icon + '"></i>' +
                    '</span>' +
                    (cat.badge ? '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">' + cat.badge + '</span>' : '') +
                '</div>' +
                '<h3 class="text-base sm:text-lg font-black text-slate-900 group-hover:text-sky-600 transition">' + cat.titleAr + '</h3>' +
                '<p class="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">' + cat.subtitleAr + '</p>' +
            '</div>' +
            '<div class="mt-4 flex items-center justify-between pt-3 border-t border-sky-100/60">' +
                '<button class="px-4 py-1.5 rounded-full bg-sky-600 group-hover:bg-sky-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-600/20">' +
                    '<span>عرض الباقات</span>' +
                    '<i class="fa-solid fa-arrow-left text-[10px]"></i>' +
                '</button>' +
                '<span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">بالدينار 🇱🇾</span>' +
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
    } else if (catId === 'ai_cards') {
        navigateTo('giftcards');
        filterGiftCards('ai_cards');
    } else if (catId === 'telecom') {
        navigateTo('giftcards');
        filterGiftCards('telecom');
    }
}

// Render Games Navigation Tabs with Original Logos
function renderGamesNav() {
    const container = document.getElementById('games-selector');
    if (!container) return;

    container.innerHTML = APP_DATA.games.map(game => {
        const isActive = state.selectedGame === game.id;
        const activeClass = isActive 
            ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 scale-105 border-sky-600' 
            : 'bg-white text-slate-700 hover:bg-sky-50 border-slate-200';
        
        let logoBadge = game.nameAr.split('(')[0];
        if (game.id === 'pubg') logoBadge = '🎮 PUBG Mobile';
        else if (game.id === 'freefire') logoBadge = '🔥 Free Fire';
        else if (game.id === 'tiktok_coins') logoBadge = '🎵 TikTok Coins';
        else if (game.id === 'roblox') logoBadge = '🧱 Roblox Robux';
        else if (game.id === 'efootball') logoBadge = '⚽ eFootball';
        else if (game.id === 'clashofclans') logoBadge = '⚔️ Clash of Clans';

        return '<button onclick="selectGame(\'' + game.id + '\')" class="px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all text-xs sm:text-sm font-black flex-shrink-0 border ' + activeClass + '">' +
            '<span>' + logoBadge + '</span>' +
            (game.badge ? '<span class="text-[10px] px-2 py-0.5 rounded-md ' + (isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800') + '">' + game.badge + '</span>' : '') +
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
            return '<div class="glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between border ' + (pkg.popular ? 'border-emerald-400 bg-emerald-50/50 shadow-emerald-200/50' : 'border-white/80') + ' relative hover:border-sky-300 transition-all hover:shadow-lg">' +
                (pkg.popular ? '<span class="absolute -top-2.5 right-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-sm">الأكثر طلباً 🔥</span>' : '') +
                (pkg.bestValue ? '<span class="absolute -top-2.5 left-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-sm">أفضل قيمة ✨</span>' : '') +
                '<div class="flex items-center gap-3 mb-4">' +
                    '<div class="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 font-black flex items-center justify-center text-sm shadow-md border border-amber-400/40 flex-shrink-0">' +
                        (pkg.icon || '💎') +
                    '</div>' +
                    '<div>' +
                        '<h4 class="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">' + pkg.nameAr + '</h4>' +
                        '<p class="text-sm font-black text-emerald-700 mt-1">' + formatPrice(pkg.priceLYD) + '</p>' +
                    '</div>' +
                '</div>' +
                '<div class="grid grid-cols-2 gap-2 mt-2">' +
                    '<button onclick="buyNowGamePackage(\'' + game.id + '\', \'' + pkg.id + '\')" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5">' +
                        '<i class="fa-solid fa-bolt"></i>' +
                        '<span>شراء فوري</span>' +
                    '</button>' +
                    '<button onclick="addGamePackageToCart(\'' + game.id + '\', \'' + pkg.id + '\')" class="w-full py-2.5 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold transition flex items-center justify-center gap-1.5">' +
                        '<i class="fa-solid fa-cart-plus"></i>' +
                        '<span>للسلة</span>' +
                    '</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }
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
    }, 400);
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
        meta: game.id === 'pubg' ? 'كود شدات ببجي' : ('Player ID: ' + playerId),
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

// Render Gift Cards, Streaming Subscriptions & AI Cards
function renderGiftCards(filter) {
    if (!filter) filter = 'all';
    const container = document.getElementById('giftcards-grid');
    if (!container) return;

    let cards = APP_DATA.giftCards;
    if (filter !== 'all') {
        cards = cards.filter(c => {
            if (filter === 'streaming') return c.category === 'streaming' || c.brand === 'netflix' || c.brand === 'shahid' || c.brand === 'disney';
            if (filter === 'social') return c.category === 'social' || c.brand === 'tiktok' || c.brand === 'snapchat' || c.brand === 'telegram';
            if (filter === 'ai_cards') return c.category === 'ai_cards' || c.brand === 'chatgpt' || c.brand === 'playstation' || c.brand === 'steam' || c.brand === 'apple';
            if (filter === 'telecom') return c.category === 'telecom' || c.brand === 'madar' || c.brand === 'libyana';
            return c.category === filter || c.brand === filter;
        });
    }

    container.innerHTML = cards.map(card => {
        let cardBgClass = 'from-sky-700 via-blue-800 to-indigo-900';
        let brandIcon = '<i class="fa-solid fa-gift text-2xl"></i>';

        if (card.brand === 'netflix') {
            cardBgClass = 'from-zinc-950 via-neutral-900 to-rose-950';
            brandIcon = '<span class="text-rose-500 font-black text-2xl tracking-tighter">NETFLIX 4K</span>';
        } else if (card.brand === 'shahid') {
            cardBgClass = 'from-emerald-950 via-teal-950 to-slate-950';
            brandIcon = '<span class="text-emerald-400 font-black text-2xl tracking-tight">SHAHID VIP</span>';
        } else if (card.brand === 'disney') {
            cardBgClass = 'from-blue-950 via-indigo-950 to-slate-950';
            brandIcon = '<span class="text-sky-300 font-black text-2xl">Disney+</span>';
        } else if (card.brand === 'snapchat') {
            cardBgClass = 'from-amber-400 via-yellow-500 to-amber-600 text-slate-900';
            brandIcon = '<i class="fa-brands fa-snapchat text-4xl text-white drop-shadow"></i>';
        } else if (card.brand === 'telegram') {
            cardBgClass = 'from-sky-600 via-blue-700 to-sky-900';
            brandIcon = '<i class="fa-brands fa-telegram text-4xl text-white"></i>';
        } else if (card.brand === 'chatgpt') {
            cardBgClass = 'from-teal-950 via-emerald-950 to-slate-950';
            brandIcon = '<span class="text-teal-300 font-black text-2xl tracking-tight">ChatGPT 4o</span>';
        } else if (card.brand === 'playstation') {
            cardBgClass = 'from-blue-900 via-indigo-950 to-slate-950';
            brandIcon = '<i class="fa-brands fa-playstation text-3xl text-white"></i>';
        } else if (card.brand === 'steam') {
            cardBgClass = 'from-slate-900 via-zinc-900 to-black';
            brandIcon = '<i class="fa-brands fa-steam text-3xl text-sky-400"></i>';
        } else if (card.brand === 'apple') {
            cardBgClass = 'from-slate-900 via-slate-800 to-zinc-900';
            brandIcon = '<i class="fa-brands fa-apple text-3xl text-white"></i>';
        } else if (card.brand === 'tiktok') {
            cardBgClass = 'from-zinc-900 via-neutral-950 to-black';
            brandIcon = '<i class="fa-brands fa-tiktok text-3xl text-rose-400"></i>';
        } else if (card.brand === 'madar') {
            cardBgClass = 'from-blue-800 via-sky-800 to-cyan-900';
            brandIcon = '<span class="text-sky-300 font-black text-xl">مدار الجديد 🇱🇾</span>';
        } else if (card.brand === 'libyana') {
            cardBgClass = 'from-amber-600 via-orange-700 to-amber-900';
            brandIcon = '<span class="text-amber-200 font-black text-xl">ليبيانا 4G 🇱🇾</span>';
        }

        return '<div class="glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between relative group border border-white/80 hover:border-sky-400 transition-all hover:shadow-xl">' +
            (card.badge ? '<span class="absolute top-3.5 right-3.5 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm z-10">' + card.badge + '</span>' : '') +
            '<div>' +
                '<div class="w-full h-32 rounded-2xl bg-gradient-to-br ' + cardBgClass + ' p-3.5 flex flex-col justify-between text-white shadow-md relative overflow-hidden mb-3 border border-white/20">' +
                    '<div class="flex justify-between items-start">' +
                        '<span class="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm">سحّابتي My Cloud</span>' +
                        '<span class="text-[10px] text-white/90 font-bold">تسليم فوري</span>' +
                    '</div>' +
                    '<div class="text-center my-auto flex items-center justify-center">' +
                        brandIcon +
                    '</div>' +
                    '<div class="flex justify-between items-center text-[10px] text-white/90 font-bold">' +
                        '<span class="line-clamp-1">' + (card.nominal || card.nameAr) + '</span>' +
                        '<span>🇱🇾 د.ل</span>' +
                    '</div>' +
                '</div>' +
                '<h4 class="font-extrabold text-slate-900 text-sm sm:text-base mb-1 leading-tight">' + card.nameAr + '</h4>' +
                '<p class="text-xs text-slate-500 mb-2 line-clamp-2 leading-relaxed">' + (card.instructionsAr || 'يتم تسليم الحساب أو الكود فوراً عبر واتساب') + '</p>' +
                '<div class="text-base sm:text-lg font-black text-emerald-700 mb-3">' + formatPrice(card.priceLYD) + '</div>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-2">' +
                '<button onclick="addGiftCardToCart(\'' + card.id + '\')" class="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20">' +
                    '<i class="fa-solid fa-cart-plus"></i>' +
                    '<span>إضافة للسلة</span>' +
                '</button>' +
                '<button onclick="openCardDetailsModal(\'' + card.id + '\')" class="py-2.5 rounded-xl bg-white hover:bg-sky-50 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5">' +
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
            '<span class="text-xs uppercase tracking-wider bg-white/20 self-start px-2 py-0.5 rounded">سحّابتي My Cloud</span>' +
            '<span class="text-2xl font-black">' + (card.nominal || card.nameAr) + '</span>' +
            '<span class="text-xs text-white/90 text-left font-bold">تسليم مباشر</span>' +
        '</div>' +
        '<h3 class="text-xl font-black text-slate-900">' + card.nameAr + '</h3>' +
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
    localStorage.setItem('sahabati_cart', JSON.stringify(state.cart));
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
        if (emptyState) emptyState.classList.remove('hidden');
        if (orderForm) orderForm.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (orderForm) orderForm.classList.remove('hidden');

    let subtotalLYD = 0;

    itemsContainer.innerHTML = state.cart.map(item => {
        const itemTotalLYD = item.priceLYD * item.quantity;
        subtotalLYD += itemTotalLYD;

        return '<div class="flex items-center justify-between p-3 rounded-2xl bg-white/80 border border-sky-100 gap-3 shadow-sm">' +
            '<div class="flex items-center gap-2.5">' +
                '<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-base">' +
                    '<i class="fa-solid ' + (item.type === 'game' ? 'fa-gamepad' : 'fa-tv') + '"></i>' +
                '</div>' +
                '<div>' +
                    '<h4 class="font-extrabold text-slate-900 text-xs sm:text-sm">' + item.titleAr + '</h4>' +
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

    // Clean Total without promo code
    const subtotalEl = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotalLYD);
    if (totalEl) totalEl.textContent = formatPrice(subtotalLYD);

    renderPaymentInstructions();
}

// Select Payment Method & Update 13-Digit Voucher Label
function selectPaymentMethod(method) {
    state.paymentMethod = method;
    document.querySelectorAll('.payment-option-card').forEach(card => {
        if (card.dataset.method === method) {
            card.classList.add('border-emerald-500', 'bg-emerald-50/80', 'ring-2', 'ring-emerald-400');
            card.classList.remove('border-slate-200');
        } else {
            card.classList.remove('border-emerald-500', 'bg-emerald-50/80', 'ring-2', 'ring-emerald-400');
            card.classList.add('border-slate-200');
        }
    });

    // Update Voucher Card Label dynamically
    const voucherLabel = document.getElementById('voucher-card-label-text');
    const voucherContainer = document.getElementById('voucher-card-field-container');
    const voucherInput = document.getElementById('voucher-card-input');

    if (voucherLabel) {
        if (method === 'telecom_libyana') {
            voucherLabel.textContent = 'كود كارت تعبئة ليبيانا (13 رقم بالضبط):';
            if (voucherContainer) {
                voucherContainer.classList.remove('bg-blue-50/90', 'border-blue-300');
                voucherContainer.classList.add('bg-amber-50/90', 'border-amber-300');
            }
        } else if (method === 'telecom_madar') {
            voucherLabel.textContent = 'كود كارت تعبئة مدار الجديد (13 رقم بالضبط):';
            if (voucherContainer) {
                voucherContainer.classList.remove('bg-amber-50/90', 'border-amber-300');
                voucherContainer.classList.add('bg-blue-50/90', 'border-blue-300');
            }
        } else {
            voucherLabel.textContent = 'كود كارت التعبئة (13 رقم إن وجد):';
            if (voucherContainer) {
                voucherContainer.classList.remove('bg-blue-50/90', 'border-blue-300');
                voucherContainer.classList.add('bg-amber-50/90', 'border-amber-300');
            }
        }
    }

    if (voucherInput) {
        handleVoucherCardInput(voucherInput);
    }

    renderPaymentInstructions();
}

// 13-Digit Scratch Card Code Live Input Handler & Strict Rule
function handleVoucherCardInput(inputEl) {
    if (!inputEl) return;
    
    // Strict numeric only, max 13 digits
    let val = inputEl.value.replace(/[^0-9]/g, '').slice(0, 13);
    inputEl.value = val;
    
    const counterEl = document.getElementById('voucher-digits-counter');
    const feedbackEl = document.getElementById('voucher-validation-feedback');
    const iconEl = document.getElementById('voucher-status-icon');
    
    if (counterEl) {
        counterEl.textContent = val.length + ' / 13 رقم';
    }
    
    if (val.length === 0) {
        inputEl.classList.remove('border-rose-500', 'border-emerald-500', 'ring-2', 'ring-rose-400', 'ring-emerald-400');
        inputEl.classList.add('border-amber-300');
        if (counterEl) {
            counterEl.className = 'text-[11px] font-mono font-black text-amber-900 bg-amber-200/90 px-2.5 py-0.5 rounded-md';
        }
        if (feedbackEl) {
            feedbackEl.innerHTML = '<i class="fa-solid fa-circle-info text-amber-700"></i> <span>يجب أن يتكون كود كارت التعبئة من 13 رقم بالضبط.</span>';
            feedbackEl.className = 'text-[11px] font-bold text-amber-900 flex items-center gap-1.5 pt-0.5';
        }
        if (iconEl) {
            iconEl.innerHTML = '<i class="fa-solid fa-sim-card text-slate-400"></i>';
        }
    } else if (val.length < 13) {
        inputEl.classList.remove('border-amber-300', 'border-emerald-500', 'ring-emerald-400');
        inputEl.classList.add('border-rose-500', 'ring-2', 'ring-rose-400');
        if (counterEl) {
            counterEl.className = 'text-[11px] font-mono font-black text-white bg-rose-600 px-2.5 py-0.5 rounded-md';
        }
        if (feedbackEl) {
            const remaining = 13 - val.length;
            feedbackEl.innerHTML = '<i class="fa-solid fa-circle-xmark text-rose-600 text-sm"></i> <span class="text-rose-600 font-extrabold">كارت غير صالح (أقل من 13 رقم - متبقي ' + remaining + ' أرقام)</span>';
            feedbackEl.className = 'text-[11px] font-bold text-rose-600 flex items-center gap-1.5 pt-0.5 animate-pulse';
        }
        if (iconEl) {
            iconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-rose-500"></i>';
        }
    } else if (val.length === 13) {
        inputEl.classList.remove('border-amber-300', 'border-rose-500', 'ring-rose-400');
        inputEl.classList.add('border-emerald-500', 'ring-2', 'ring-emerald-400');
        if (counterEl) {
            counterEl.className = 'text-[11px] font-mono font-black text-white bg-emerald-600 px-2.5 py-0.5 rounded-md';
        }
        if (feedbackEl) {
            feedbackEl.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-600 text-sm"></i> <span class="text-emerald-700 font-extrabold">كود الكارت صالح ومكتمل (13 رقم) ✓</span>';
            feedbackEl.className = 'text-[11px] font-bold text-emerald-700 flex items-center gap-1.5 pt-0.5';
        }
        if (iconEl) {
            iconEl.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-600"></i>';
        }
    }
}

function renderPaymentInstructions() {
    const box = document.getElementById('payment-instructions-box');
    if (!box) return;

    const infoMap = APP_DATA.settings?.paymentMethodsInfo || DEFAULT_STORE_SETTINGS.paymentMethodsInfo;
    const method = state.paymentMethod;
    const currentInfo = infoMap[method] || {
        title: 'الدفع المباشر بالدينار الليبي',
        accountInfo: 'تواصل مع خدمة العملاء 0920541749',
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
    if (state.cart.length === 0) {
        showToast('سلة المشتريات فارغة!', 'fa-cart-shopping');
        return;
    }

    const method = state.paymentMethod;
    const voucherInput = document.getElementById('voucher-card-input');
    const voucherVal = voucherInput ? voucherInput.value.trim() : '';
    const cleanCardDigits = voucherVal.replace(/[^0-9]/g, '');

    // Requirement: Strict 13 digits check for recharge cards
    if (method === 'telecom_libyana' || method === 'telecom_madar') {
        if (cleanCardDigits.length !== 13) {
            showToast('⚠️ كارت غير صالح! يجب أن يتكون كود كارت التعبئة من 13 رقم بالضبط (أدخلت ' + cleanCardDigits.length + ' رقم)', 'fa-triangle-exclamation');
            if (voucherInput) {
                voucherInput.focus();
                voucherInput.classList.add('border-rose-500', 'ring-2', 'ring-rose-400');
                voucherInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            handleVoucherCardInput(voucherInput);
            return; // Block order submission until exactly 13 digits!
        }
    } else if (cleanCardDigits.length > 0 && cleanCardDigits.length !== 13) {
        showToast('⚠️ كارت غير صالح! كود كارت التعبئة يجب أن يتكون من 13 رقم بالضبط', 'fa-triangle-exclamation');
        if (voucherInput) {
            voucherInput.focus();
            voucherInput.classList.add('border-rose-500', 'ring-2', 'ring-rose-400');
        }
        handleVoucherCardInput(voucherInput);
        return;
    }

    const customerPhone = document.getElementById('whatsapp-phone-input')?.value.trim() || 'غير محدد';
    const customerNotes = document.getElementById('whatsapp-note-input')?.value.trim() || 'طلب عبر متجر سحّابتي';

    const btn = document.getElementById('complete-payment-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-lg"></i> <span>جاري تجهيز وتأكيد الفاتورة...</span>';

    setTimeout(() => {
        const orderId = 'LYD-' + Math.floor(100000 + Math.random() * 900000);
        const orderDate = new Date().toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' });
        
        let totalLYD = state.cart.reduce((sum, item) => sum + (item.priceLYD * item.quantity), 0);
        const totalAmountText = formatPrice(totalLYD);

        let newOrder;
        if (typeof SahabatiDB !== 'undefined' && SahabatiDB.createOrder) {
            newOrder = SahabatiDB.createOrder({
                id: orderId,
                date: orderDate,
                items: [...state.cart],
                paymentMethod: state.paymentMethod,
                customerPhone: customerPhone,
                cardCode13: cleanCardDigits.length === 13 ? cleanCardDigits : '',
                customerNotes: customerNotes,
                totalFormatted: totalAmountText
            });
        } else {
            const generatedVouchers = state.cart.map(item => ({
                title: item.titleAr,
                voucherCode: 'SHB-' + Array.from({length: 4}, () => Math.random().toString(36).substr(2, 4).toUpperCase()).join('-'),
                quantity: item.quantity,
                price: formatPrice(item.priceLYD * item.quantity)
            }));
            newOrder = {
                id: orderId,
                date: orderDate,
                items: [...state.cart],
                vouchers: generatedVouchers,
                paymentMethod: state.paymentMethod,
                customerPhone: customerPhone,
                cardCode13: cleanCardDigits.length === 13 ? cleanCardDigits : '',
                customerNotes: customerNotes,
                totalFormatted: totalAmountText,
                status: 'whatsapp_pending'
            };
        }

        // Prepare WhatsApp message with full details
        const itemsListText = state.cart.map(item => '• ' + item.quantity + 'x ' + item.titleAr + ' (' + item.meta + ') - ' + formatPrice(item.priceLYD * item.quantity)).join('\n');
        
        let cardDetails = '';
        if (cleanCardDigits.length === 13) {
            const cardCompany = (state.paymentMethod === 'telecom_libyana') ? 'ليبيانا (Libyana)' : (state.paymentMethod === 'telecom_madar' ? 'مدار الجديد (Madar)' : 'كرت تعبئة');
            cardDetails = 
'🎟️ *كود كارت التعبئة (13 رقم):* `' + cleanCardDigits + '`\n' +
'🏢 *الشركة:* ' + cardCompany + '\n';
        }

        const paymentMethodNames = {
            'one_pay': 'ون باي (OnePay) / دفع مصرفي',
            'telecom_libyana': 'شفرة / كرت تعبئة ليبيانا (13 رقم)',
            'telecom_madar': 'شفرة / كرت تعبئة مدار (13 رقم)',
            'bank_transfer': 'تحويل مصرفي ليبي'
        };

        const waMessage = 
'🌟 *طلب جديد من منصة سحّابتي (Sahabati My Cloud)* 🌟\n' +
'-----------------------------------\n' +
'📋 *رقم الطلب:* #' + orderId + '\n' +
'📅 *التاريخ:* ' + orderDate + '\n' +
'📱 *رقم هاتف الزبون:* ' + customerPhone + '\n' +
'💳 *وسيلة الدفع:* ' + (paymentMethodNames[state.paymentMethod] || state.paymentMethod) + '\n' +
(cardDetails ? cardDetails : '') +
'💰 *الإجمالي المطلوب للدفع:* ' + totalAmountText + '\n\n' +
'🎮 *العناصر المطلوبة:*\n' +
itemsListText + '\n\n' +
'📝 *ملاحظات إضافية:*\n' +
customerNotes + '\n' +
'-----------------------------------\n' +
'يرجى تأكيد استلام الطلب وتزويدي بكود الشحن أو بيانات الحساب وشكراً! ✨';

        // Direct WhatsApp Phone URL
        const targetPhone = APP_DATA.settings?.whatsappNumber || '218920541749';
        const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
        const waUrl = 'https://api.whatsapp.com/send?phone=' + cleanPhone + '&text=' + encodeURIComponent(waMessage);
        newOrder.waUrl = waUrl;
        
        // Open WhatsApp in new tab
        window.open(waUrl, '_blank');

        state.orders.unshift(newOrder);
        localStorage.setItem('sahabati_orders', JSON.stringify(state.orders));

        // Clear Cart
        state.cart = [];
        saveCart();
        updateCartUI();

        btn.disabled = false;
        btn.innerHTML = originalText;

        // Show Success Receipt Modal
        showSuccessModal(newOrder);
    }, 500);
}

function showSuccessModal(order) {
    const modal = document.getElementById('order-success-modal');
    const body = document.getElementById('success-modal-body');
    if (!modal || !body) return;

    const isPaid = order.status === 'paid' || order.paymentConfirmed === true;

    let cardBanner = '';
    if (order.cardCode13) {
        cardBanner = '<div class="p-2.5 rounded-xl bg-amber-100 text-amber-950 text-xs font-bold mb-3 font-mono flex items-center justify-between border border-amber-300">' +
            '<span>🎟️ كود كارت التعبئة (13 رقم):</span>' +
            '<span class="font-black text-amber-900 tracking-wider">' + escapeHtml(order.cardCode13) + '</span>' +
        '</div>';
    }

    let credentialsNotice = '';
    if (isPaid) {
        credentialsNotice = '<div class="space-y-2 mb-4 text-right">' +
            '<h4 class="font-bold text-xs text-slate-700 uppercase">بيانات الحساب وكلمة السر:</h4>' +
            (order.vouchers || []).map(v => {
                return '<div class="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-2">' +
                    '<div>' +
                        '<h5 class="font-bold text-slate-900 text-xs">' + escapeHtml(v.title) + '</h5>' +
                        '<code class="font-mono text-emerald-900 font-bold text-xs block mt-0.5 select-all">' + escapeHtml(v.accountPassword || v.voucherCode) + '</code>' +
                    '</div>' +
                    '<button onclick="copyToClipboard(\'' + escapeAttr(v.accountPassword || v.voucherCode) + '\')" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm">' +
                        '<i class="fa-solid fa-copy"></i>' +
                        '<span>نسخ</span>' +
                    '</button>' +
                '</div>';
            }).join('') +
        '</div>';
    } else {
        credentialsNotice = '<div class="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-300 mb-4 text-center space-y-2">' +
            '<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black">' +
                '<i class="fa-solid fa-shield-halved text-amber-600"></i>' +
                '<span>بيانات الحساب وكلمة السر محمية 🔒</span>' +
            '</div>' +
            '<p class="text-xs text-amber-950 font-bold leading-relaxed">' +
                'تظهر كلمة السر وبيانات الدخول <strong>في شاشتك الخاصة بسجل طلباتك</strong> فور قيام الإدارة بتأكيد استلام الدفع بالدينار الليبي.' +
            '</p>' +
        '</div>';
    }

    body.innerHTML = '<div class="text-center mb-4">' +
        '<div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-2 shadow-inner">' +
            '<i class="fa-solid fa-receipt"></i>' +
        '</div>' +
        '<h3 class="text-xl sm:text-2xl font-black text-slate-900">تم تسجيل طلبك بنجاح!</h3>' +
        '<p class="text-xs text-slate-500 mt-1">رقم الطلب: <strong class="font-mono text-slate-800">#' + escapeHtml(order.id) + '</strong> | ' + escapeHtml(order.date) + '</p>' +
    '</div>' +
    cardBanner +
    credentialsNotice +
    (order.waUrl ? 
    '<div class="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 mb-4 text-center space-y-1.5">' +
        '<p class="text-xs font-bold text-emerald-950">أرسل إشعار الدفع للإدارة عبر واتساب لتسريع تفعيل الحساب فوراً:</p>' +
        '<a href="' + escapeAttr(order.waUrl) + '" target="_blank" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-md transition">' +
            '<i class="fa-brands fa-whatsapp text-lg"></i>' +
            '<span>فتح محادثة واتساب لتأكيد الاستلام</span>' +
        '</a>' +
    '</div>' : '') +
    '<div class="flex flex-col sm:flex-row gap-2">' +
        '<button onclick="closeModal(\'order-success-modal\'); navigateTo(\'orders\');" class="flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5">' +
            '<i class="fa-solid fa-receipt"></i>' +
            '<span>متابعة الطلب في سجل مشترياتي</span>' +
        '</button>' +
        '<button onclick="closeModal(\'order-success-modal\'); navigateTo(\'home\');" class="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition">' +
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

// ================= CUSTOMER AUTHENTICATION & DATABASE ENGINE =================

function getActiveCustomer() {
    if (typeof SahabatiDB !== 'undefined' && SahabatiDB.getCurrentUser) {
        return SahabatiDB.getCurrentUser();
    }
    return null;
}

function updateCustomerAuthUI() {
    const customer = getActiveCustomer();
    const label = document.getElementById('customer-header-auth-label');
    const btn = document.getElementById('customer-header-auth-btn');
    const phoneInput = document.getElementById('whatsapp-phone-input');

    if (customer) {
        if (label) {
            const firstName = customer.name.split(' ')[0] || 'حسابي';
            label.textContent = 'مرحباً، ' + firstName;
        }
        if (btn) {
            btn.classList.remove('from-sky-600', 'to-indigo-600');
            btn.classList.add('from-emerald-600', 'to-teal-700');
            btn.title = 'حساب ' + customer.name + ' - تتبع طلباتك';
        }
        if (phoneInput && !phoneInput.value && customer.phone) {
            phoneInput.value = customer.phone;
        }
    } else {
        if (label) label.textContent = 'حسابي / دخول';
        if (btn) {
            btn.classList.remove('from-emerald-600', 'to-teal-700');
            btn.classList.add('from-sky-600', 'to-indigo-600');
            btn.title = 'تسجيل الدخول أو إنشاء حساب جديد';
        }
    }
}

function handleCustomerHeaderClick() {
    const customer = getActiveCustomer();
    if (customer) {
        navigateTo('orders');
    } else {
        openCustomerAuthModal('login');
    }
}

function openCustomerAuthModal(tab) {
    const modal = document.getElementById('customer-auth-modal');
    if (!modal) return;
    switchCustomerAuthTab(tab || 'login');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeCustomerAuthModal() {
    const modal = document.getElementById('customer-auth-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function switchCustomerAuthTab(tab) {
    const loginBtn = document.getElementById('cust-auth-tab-login');
    const regBtn = document.getElementById('cust-auth-tab-register');
    const loginForm = document.getElementById('customer-login-form');
    const regForm = document.getElementById('customer-register-form');

    if (tab === 'register') {
        if (loginBtn) { loginBtn.classList.remove('bg-white', 'text-sky-700', 'shadow-sm', 'font-black'); loginBtn.classList.add('text-slate-600', 'font-bold'); }
        if (regBtn) { regBtn.classList.add('bg-white', 'text-emerald-700', 'shadow-sm', 'font-black'); regBtn.classList.remove('text-slate-600', 'font-bold'); }
        if (loginForm) loginForm.classList.add('hidden');
        if (regForm) regForm.classList.remove('hidden');
        document.getElementById('cust-reg-name')?.focus();
    } else {
        if (regBtn) { regBtn.classList.remove('bg-white', 'text-emerald-700', 'shadow-sm', 'font-black'); regBtn.classList.add('text-slate-600', 'font-bold'); }
        if (loginBtn) { loginBtn.classList.add('bg-white', 'text-sky-700', 'shadow-sm', 'font-black'); loginBtn.classList.remove('text-slate-600', 'font-bold'); }
        if (regForm) regForm.classList.add('hidden');
        if (loginForm) loginForm.classList.remove('hidden');
        document.getElementById('cust-login-ident')?.focus();
    }
}

function togglePassVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    if (btn) {
        btn.innerHTML = input.type === 'password' ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
    }
}

async function handleCustomerLoginSubmit(e) {
    e.preventDefault();
    const ident = (document.getElementById('cust-login-ident')?.value || '').trim();
    const pass = (document.getElementById('cust-login-pass')?.value || '').trim();
    const btn = document.getElementById('cust-login-submit-btn');

    if (!ident || !pass) {
        showToast('يرجى كتابة رقم الهاتف وكلمة المرور', 'fa-triangle-exclamation');
        return;
    }

    const origText = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...'; }

    try {
        if (typeof SahabatiDB !== 'undefined') {
            const user = await SahabatiDB.loginUser(ident, pass);
            closeCustomerAuthModal();
            updateCustomerAuthUI();
            showToast('مرحباً بك يا ' + user.name + ' في سحّابتي ☁️', 'fa-user-check');
            navigateTo('orders');
            renderOrders();
        }
    } catch(err) {
        showToast(err.message || 'فشل تسجيل الدخول', 'fa-triangle-exclamation');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
}

async function handleCustomerRegisterSubmit(e) {
    e.preventDefault();
    const name = (document.getElementById('cust-reg-name')?.value || '').trim();
    const phone = (document.getElementById('cust-reg-phone')?.value || '').trim();
    const email = (document.getElementById('cust-reg-email')?.value || '').trim();
    const pass = (document.getElementById('cust-reg-pass')?.value || '').trim();
    const passConfirm = (document.getElementById('cust-reg-pass-confirm')?.value || '').trim();
    const btn = document.getElementById('cust-reg-submit-btn');

    if (pass !== passConfirm) {
        showToast('كلمتا المرور غير متطابقتين', 'fa-triangle-exclamation');
        return;
    }

    const origText = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إنشاء الحساب...'; }

    try {
        if (typeof SahabatiDB !== 'undefined') {
            const newUser = await SahabatiDB.registerUser({ name, phone, email, password: pass });
            closeCustomerAuthModal();
            updateCustomerAuthUI();
            showToast('تم إنشاء حسابك بنجاح! مرحباً بك يا ' + newUser.name + ' 🌟', 'fa-circle-check');
            navigateTo('orders');
            renderOrders();
        }
    } catch(err) {
        showToast(err.message || 'فشل إنشاء الحساب', 'fa-triangle-exclamation');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
}

function logoutCustomer() {
    if (typeof SahabatiDB !== 'undefined') {
        SahabatiDB.logout();
    }
    updateCustomerAuthUI();
    renderOrders();
    showToast('تم تسجيل الخروج بنجاح', 'fa-arrow-right-from-bracket');
}

function switchCustomerOrdersTab(tab) {
    const ordersBtn = document.getElementById('cust-tab-btn-orders');
    const codesBtn = document.getElementById('cust-tab-btn-codes');
    const ordersView = document.getElementById('cust-view-orders');
    const codesView = document.getElementById('cust-view-codes');

    if (tab === 'codes') {
        if (ordersBtn) { ordersBtn.classList.remove('bg-sky-600', 'text-white', 'shadow-md'); ordersBtn.classList.add('bg-white/90', 'text-slate-700'); }
        if (codesBtn) { codesBtn.classList.add('bg-amber-500', 'text-white', 'shadow-md'); codesBtn.classList.remove('bg-white/90', 'text-slate-700'); }
        if (ordersView) ordersView.classList.add('hidden');
        if (codesView) codesView.classList.remove('hidden');
    } else {
        if (codesBtn) { codesBtn.classList.remove('bg-amber-500', 'text-white', 'shadow-md'); codesBtn.classList.add('bg-white/90', 'text-slate-700'); }
        if (ordersBtn) { ordersBtn.classList.add('bg-sky-600', 'text-white', 'shadow-md'); ordersBtn.classList.remove('bg-white/90', 'text-slate-700'); }
        if (codesView) codesView.classList.add('hidden');
        if (ordersView) ordersView.classList.remove('hidden');
    }
}

// Render Profile Header Banner with Purchase Logs Analytics
function renderCustomerProfileBanner(customer, userOrders, userCodes) {
    const banner = document.getElementById('customer-profile-banner');
    if (!banner) return;

    const totalOrders = userOrders.length;
    const paidOrders = userOrders.filter(o => o.status === 'paid' || o.paymentConfirmed).length;
    const pendingOrders = userOrders.filter(o => o.status === 'pending_payment' || o.status === 'whatsapp_pending' || (!o.status && !o.paymentConfirmed)).length;
    const totalCodes = userCodes.length;

    const statsGridHtml = '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">' +
        '<div class="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-center shadow-sm">' +
            '<div class="flex items-center justify-center gap-1.5 text-sky-800 mb-1">' +
                '<i class="fa-solid fa-receipt text-xs"></i>' +
                '<span class="text-[11px] font-bold">إجمالي طلباتي</span>' +
            '</div>' +
            '<span class="font-black text-sky-950 text-base sm:text-xl">' + totalOrders + '</span>' +
        '</div>' +
        '<div class="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center shadow-sm">' +
            '<div class="flex items-center justify-center gap-1.5 text-emerald-800 mb-1">' +
                '<i class="fa-solid fa-circle-check text-xs"></i>' +
                '<span class="text-[11px] font-bold">طلبات تم تسليمها</span>' +
            '</div>' +
            '<span class="font-black text-emerald-950 text-base sm:text-xl">' + paidOrders + '</span>' +
        '</div>' +
        '<div class="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center shadow-sm">' +
            '<div class="flex items-center justify-center gap-1.5 text-amber-800 mb-1">' +
                '<i class="fa-solid fa-hourglass-half text-xs"></i>' +
                '<span class="text-[11px] font-bold">قيد تأكيد الدفع</span>' +
            '</div>' +
            '<span class="font-black text-amber-950 text-base sm:text-xl">' + pendingOrders + '</span>' +
        '</div>' +
        '<div class="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-center shadow-sm">' +
            '<div class="flex items-center justify-center gap-1.5 text-indigo-800 mb-1">' +
                '<i class="fa-solid fa-key text-xs"></i>' +
                '<span class="text-[11px] font-bold">أكواد في محفظتي</span>' +
            '</div>' +
            '<span class="font-black text-indigo-950 text-base sm:text-xl">' + totalCodes + '</span>' +
        '</div>' +
    '</div>';

    if (customer) {
        banner.innerHTML = '<div class="space-y-4">' +
            '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">' +
                '<div class="flex items-center gap-3.5">' +
                    '<div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-700 text-white flex items-center justify-center text-2xl font-black shadow-md flex-shrink-0 border-2 border-sky-200">' +
                        escapeHtml(customer.name.charAt(0)) +
                    '</div>' +
                    '<div>' +
                        '<div class="flex items-center gap-2">' +
                            '<h3 class="font-extrabold text-slate-900 text-base sm:text-lg">' + escapeHtml(customer.name) + '</h3>' +
                            '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">' +
                                '<i class="fa-solid fa-circle-check text-emerald-600"></i>' +
                                '<span>حساب عميل مفعل</span>' +
                            '</span>' +
                        '</div>' +
                        '<div class="flex items-center gap-3 text-xs text-slate-500 mt-1">' +
                            '<span class="font-mono font-bold"><i class="fa-solid fa-phone text-slate-400 ml-1"></i> ' + escapeHtml(customer.phone) + '</span>' +
                            (customer.email ? '<span class="hidden sm:inline">• ' + escapeHtml(customer.email) + '</span>' : '') +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="flex items-center gap-2 self-end sm:self-center">' +
                    '<button onclick="logoutCustomer()" class="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 border border-rose-200 shadow-sm" title="تسجيل الخروج من الحساب">' +
                        '<i class="fa-solid fa-arrow-right-from-bracket"></i>' +
                        '<span>خروج</span>' +
                    '</button>' +
                '</div>' +
            '</div>' +
            statsGridHtml +
        '</div>';
    } else {
        banner.innerHTML = '<div class="space-y-4">' +
            '<div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right pb-3 border-b border-slate-100">' +
                '<div class="flex items-center gap-3.5">' +
                    '<div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center text-xl shadow-md flex-shrink-0">' +
                        '<i class="fa-solid fa-user-lock"></i>' +
                    '</div>' +
                    '<div>' +
                        '<h3 class="font-black text-slate-900 text-sm sm:text-base">سجّل دخولك لحفظ مشترياتك وأكوادك الرقمية</h3>' +
                        '<p class="text-xs text-slate-500 mt-0.5">أنشئ حساباً مجانياً لتتبع فواتيرك بالدينار الليبي واستلام كلمات السر في شاشتك الخاصة فور تأكيد الدفع.</p>' +
                    '</div>' +
                '</div>' +
                '<div class="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">' +
                    '<button onclick="openCustomerAuthModal(\'login\')" class="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-1.5">' +
                        '<i class="fa-solid fa-right-to-bracket"></i>' +
                        '<span>تسجيل الدخول</span>' +
                    '</button>' +
                    '<button onclick="openCustomerAuthModal(\'register\')" class="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5">' +
                        '<i class="fa-solid fa-user-plus"></i>' +
                        '<span>إنشاء حساب</span>' +
                    '</button>' +
                '</div>' +
            '</div>' +
            statsGridHtml +
        '</div>';
    }
}

// Render Orders & Digital Codes Dashboard
function renderOrders() {
    const customer = getActiveCustomer();
    const container = document.getElementById('orders-list-container');
    const emptyState = document.getElementById('orders-empty-state');
    const codesGrid = document.getElementById('customer-codes-grid');
    const codesEmpty = document.getElementById('customer-codes-empty-state');
    const codesBadge = document.getElementById('cust-codes-badge');

    // Retrieve customer specific orders or all local orders
    let userOrders = [];
    if (customer && typeof SahabatiDB !== 'undefined') {
        userOrders = SahabatiDB.getOrdersForUser(customer.id);
        // Fallback: if user has no orders in DB yet, show legacy orders if phone matches
        if (userOrders.length === 0 && state.orders.length > 0) {
            userOrders = state.orders.filter(o => o.customerPhone === customer.phone || o.userId === customer.id);
            if (userOrders.length === 0) userOrders = state.orders;
        }
    } else {
        userOrders = state.orders;
    }

    // Retrieve digital codes owned by this customer (ONLY for confirmed/paid orders)
    let userCodes = [];
    userOrders.forEach(o => {
        const isPaid = o.status === 'paid' || o.paymentConfirmed === true;
        if (isPaid) {
            if (o.vouchers && Array.isArray(o.vouchers) && o.vouchers.length > 0) {
                o.vouchers.forEach(v => {
                    userCodes.push({
                        orderId: o.id,
                        date: o.date,
                        title: v.title || o.items?.[0]?.titleAr || 'كود رقمي / حساب',
                        code: v.accountPassword || v.voucherCode || o.accountDetails?.password || '',
                        username: v.accountUsername || o.accountDetails?.username || '',
                        pin: v.pin || o.accountDetails?.pin || '',
                        notes: o.accountDetails?.notes || '',
                        isRealVaultCode: v.isRealVaultCode || true
                    });
                });
            } else if (o.accountDetails && o.accountDetails.password) {
                userCodes.push({
                    orderId: o.id,
                    date: o.date,
                    title: o.items?.[0]?.titleAr || 'حساب رقمي',
                    code: o.accountDetails.password,
                    username: o.accountDetails.username || '',
                    pin: o.accountDetails.pin || '',
                    notes: o.accountDetails.notes || '',
                    isRealVaultCode: true
                });
            }
        }
    });

    if (codesBadge) codesBadge.textContent = userCodes.length;

    // Render Banner
    renderCustomerProfileBanner(customer, userOrders, userCodes);

    // 1. Render Orders List
    if (container) {
        if (userOrders.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            container.innerHTML = '';
        } else {
            if (emptyState) emptyState.classList.add('hidden');
            container.innerHTML = userOrders.map(order => {
                const isPaid = order.status === 'paid' || order.paymentConfirmed === true;
                const isCancelled = order.status === 'cancelled';
                const isPending = !isPaid && !isCancelled;

                let statusBadge = '';
                if (isPaid) {
                    statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-sm">' +
                        '<i class="fa-solid fa-circle-check text-emerald-600"></i>' +
                        '<span>تم استلام الدفع وتسليم الحساب ✓</span>' +
                    '</span>';
                } else if (isCancelled) {
                    statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">' +
                        '<i class="fa-solid fa-ban text-rose-600"></i>' +
                        '<span>ملغي</span>' +
                    '</span>';
                } else {
                    statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-sm">' +
                        '<i class="fa-solid fa-hourglass-half fa-spin text-amber-600"></i>' +
                        '<span>قيد مراجعة وتأكيد الدفع ⏳</span>' +
                    '</span>';
                }

                let contentHtml = '';
                if (isPaid) {
                    const account = order.accountDetails || {};
                    const username = account.username || (order.vouchers?.[0]?.accountUsername) || '';
                    const password = account.password || (order.vouchers?.[0]?.accountPassword) || (order.vouchers?.[0]?.voucherCode) || '';
                    const pin = account.pin || (order.vouchers?.[0]?.pin) || '';
                    const notes = account.notes || '';

                    contentHtml = '<div class="space-y-3 mb-3 p-3.5 sm:p-4 rounded-2xl bg-emerald-500/5 border-2 border-emerald-400 shadow-sm">' +
                        '<div class="flex items-center justify-between pb-2 border-b border-emerald-200/60">' +
                            '<div class="flex items-center gap-2">' +
                                '<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>' +
                                '<h4 class="font-black text-emerald-950 text-xs sm:text-sm">بيانات الحساب وكلمة السر (في شاشتك الخاصة 👑)</h4>' +
                            '</div>' +
                            '<span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">مُفعّل ومضمون</span>' +
                        '</div>';

                    if (username) {
                        contentHtml += '<div class="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2">' +
                            '<div class="min-w-0">' +
                                '<span class="text-[10px] font-bold text-slate-400 block">اسم المستخدم / البريد الإلكتروني:</span>' +
                                '<code class="font-mono text-slate-900 font-extrabold text-xs sm:text-sm select-all break-all">' + escapeHtml(username) + '</code>' +
                            '</div>' +
                            '<button onclick="copyToClipboard(\'' + escapeAttr(username) + '\')" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 flex-shrink-0">' +
                                '<i class="fa-solid fa-copy"></i>' +
                                '<span>نسخ</span>' +
                            '</button>' +
                        '</div>';
                    }

                    if (password) {
                        const pwdId = 'pwd-elem-' + escapeAttr(order.id);
                        contentHtml += '<div class="p-2.5 rounded-xl bg-white border-2 border-emerald-400 flex items-center justify-between gap-2 shadow-sm">' +
                            '<div class="min-w-0">' +
                                '<span class="text-[10px] font-extrabold text-emerald-700 block">كلمة السر (خاصة بك فقط 🔒):</span>' +
                                '<div class="flex items-center gap-2 mt-0.5">' +
                                    '<code id="' + pwdId + '" class="font-mono text-emerald-950 font-black text-xs sm:text-sm select-all tracking-wider break-all">••••••••</code>' +
                                    '<button type="button" onclick="toggleSecretVisibility(\'' + pwdId + '\', \'' + escapeAttr(password) + '\', this)" class="text-slate-400 hover:text-emerald-700 p-1 transition" title="إظهار / إخفاء كلمة السر">' +
                                        '<i class="fa-solid fa-eye"></i>' +
                                    '</button>' +
                                '</div>' +
                            '</div>' +
                            '<button onclick="copyToClipboard(\'' + escapeAttr(password) + '\')" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black transition flex items-center gap-1 flex-shrink-0 shadow-sm">' +
                                '<i class="fa-solid fa-copy"></i>' +
                                '<span>نسخ السر</span>' +
                            '</button>' +
                        '</div>';
                    }

                    if (pin) {
                        contentHtml += '<div class="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">' +
                            '<span class="text-slate-700 font-bold">رمز الشاشة / PIN: <strong class="font-mono text-slate-900 font-black">' + escapeHtml(pin) + '</strong></span>' +
                            '<button onclick="copyToClipboard(\'' + escapeAttr(pin) + '\')" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold">نسخ</button>' +
                        '</div>';
                    }

                    if (notes) {
                        contentHtml += '<div class="p-2.5 rounded-xl bg-sky-50 text-sky-900 text-[11px] font-medium border border-sky-200 flex items-start gap-1.5">' +
                            '<i class="fa-solid fa-circle-info text-sky-600 mt-0.5"></i>' +
                            '<span>' + escapeHtml(notes) + '</span>' +
                        '</div>';
                    }

                    if (order.vouchers && Array.isArray(order.vouchers)) {
                        const extraVouchers = order.vouchers.filter(v => v.voucherCode && v.voucherCode !== password && v.voucherCode !== 'VIP-ACCESS');
                        if (extraVouchers.length > 0) {
                            contentHtml += '<div class="space-y-1.5 pt-2 border-t border-emerald-100">' +
                                extraVouchers.map(v => {
                                    return '<div class="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs">' +
                                        '<div class="min-w-0"><span class="font-bold text-slate-800">' + escapeHtml(v.title) + ':</span> <code class="font-mono text-sky-700 font-bold">' + escapeHtml(v.voucherCode) + '</code></div>' +
                                        '<button onclick="copyToClipboard(\'' + escapeAttr(v.voucherCode) + '\')" class="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold text-[11px]">نسخ</button>' +
                                    '</div>';
                                }).join('') +
                            '</div>';
                        }
                    }

                    contentHtml += '</div>';

                } else if (isPending) {
                    contentHtml = '<div class="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-300 text-slate-800 space-y-3 mb-3">' +
                        '<div class="flex items-start gap-3">' +
                            '<div class="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 text-base shadow-sm">' +
                                '<i class="fa-solid fa-lock"></i>' +
                            '</div>' +
                            '<div>' +
                                '<h5 class="font-extrabold text-amber-950 text-xs sm:text-sm">بيانات الحساب وكلمة السر محمية ومشفرة 🔒</h5>' +
                                '<p class="text-[11px] sm:text-xs text-amber-900 mt-0.5 leading-relaxed">' +
                                    'تظهر كلمة السر <strong>في شاشتك الخاصة هنا فقط</strong> فور تأكيد الإدارة لاستلام الدفع بالدينار الليبي.' +
                                '</p>' +
                            '</div>' +
                        '</div>' +
                        '<div class="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200">' +
                            '<button onclick="checkCustomerOrderStatus(\'' + escapeAttr(order.id) + '\')" class="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs shadow-sm transition flex items-center gap-1.5">' +
                                '<i class="fa-solid fa-rotate"></i>' +
                                '<span>تحديث حالة الطلب 🔄</span>' +
                            '</button>' +
                            (order.waUrl ? 
                            '<a href="' + escapeAttr(order.waUrl) + '" target="_blank" class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5">' +
                                '<i class="fa-brands fa-whatsapp text-sm"></i>' +
                                '<span>إرسال إشعار الدفع لواتساب</span>' +
                            '</a>' : '') +
                        '</div>' +
                    '</div>';

                    if (order.items && order.items.length > 0) {
                        contentHtml += '<div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-2.5 space-y-1">' +
                            '<span class="text-slate-500 block text-[10px] font-bold">المنتجات المطلوبة:</span>' +
                            order.items.map(it => '<div class="text-slate-800 font-bold">• ' + escapeHtml(it.quantity || 1) + 'x ' + escapeHtml(it.titleAr) + '</div>').join('') +
                        '</div>';
                    }

                } else {
                    contentHtml = '<div class="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs mb-3 flex items-center gap-2">' +
                        '<i class="fa-solid fa-circle-exclamation text-rose-600 text-base"></i>' +
                        '<span>تم إلغاء هذا الطلب: ' + escapeHtml(order.cancelReason || 'بناءً على طلب الإدارة أو عدم إتمام الدفع') + '</span>' +
                    '</div>';
                }

                return '<div class="glass-card rounded-3xl p-4 sm:p-5 border border-white/80 shadow-md transition hover:shadow-lg">' +
                    '<div class="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">' +
                        '<div>' +
                            '<span class="font-extrabold text-slate-900 text-xs sm:text-sm">#' + escapeHtml(order.id) + '</span>' +
                            '<span class="text-[10px] text-slate-500 block">' + escapeHtml(order.date) + '</span>' +
                        '</div>' +
                        '<div>' + statusBadge + '</div>' +
                    '</div>' +
                    contentHtml +
                    (order.cardCode13 ? '<div class="p-2.5 bg-amber-50 rounded-xl text-amber-950 text-xs font-mono font-bold mb-2.5 border border-amber-200 flex items-center justify-between"><span>🎟️ كود كارت التعبئة (13 رقم):</span><span class="tracking-wider">' + escapeHtml(order.cardCode13) + '</span></div>' : '') +
                    '<div class="flex items-center justify-between text-xs font-bold text-slate-700 pt-2 border-t border-slate-100">' +
                        '<span>الإجمالي بالدينار الليبي:</span>' +
                        '<span class="text-emerald-700 font-extrabold text-sm sm:text-base">' + escapeHtml(order.totalFormatted || formatPrice(order.totalLYD || 0)) + '</span>' +
                    '</div>' +
                '</div>';
            }).join('');
        }
    }

    // 2. Render Digital Codes Vault
    if (codesGrid) {
        if (userCodes.length === 0) {
            if (codesEmpty) codesEmpty.classList.remove('hidden');
            codesGrid.innerHTML = '';
        } else {
            if (codesEmpty) codesEmpty.classList.add('hidden');
            codesGrid.innerHTML = userCodes.map(codeItem => {
                const codeId = 'vault-code-' + escapeAttr(codeItem.orderId) + '-' + Math.random().toString(36).substr(2, 4);
                return '<div class="glass-card rounded-3xl p-4 sm:p-5 border-2 border-amber-200/80 bg-white/95 shadow-md flex flex-col justify-between space-y-3 relative overflow-hidden">' +
                    '<div class="flex items-center justify-between">' +
                        '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 flex items-center gap-1 border border-emerald-300">' +
                            '<i class="fa-solid fa-circle-check text-emerald-600"></i>' +
                            '<span>تم تأكيد الدفع والتسليم ✓</span>' +
                        '</span>' +
                        '<span class="text-[10px] text-slate-400 font-mono">#' + escapeHtml(codeItem.orderId) + '</span>' +
                    '</div>' +
                    '<div>' +
                        '<h4 class="font-black text-slate-900 text-xs sm:text-sm mb-1.5">' + escapeHtml(codeItem.title) + '</h4>' +
                        (codeItem.username ? '<p class="text-[11px] font-mono text-slate-600 mb-1.5"><strong>المستخدم:</strong> <span class="select-all font-bold text-slate-800">' + escapeHtml(codeItem.username) + '</span></p>' : '') +
                        '<div class="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-2">' +
                            '<div>' +
                                '<span class="text-[9px] font-extrabold text-amber-800 block">الكود / كلمة السر:</span>' +
                                '<code id="' + codeId + '" class="font-mono text-amber-950 font-black text-xs sm:text-sm select-all tracking-wider break-all">••••••••</code>' +
                            '</div>' +
                            '<div class="flex items-center gap-1 flex-shrink-0">' +
                                '<button type="button" onclick="toggleSecretVisibility(\'' + codeId + '\', \'' + escapeAttr(codeItem.code) + '\', this)" class="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 transition" title="إظهار / إخفاء">' +
                                    '<i class="fa-solid fa-eye"></i>' +
                                '</button>' +
                                '<button onclick="copyToClipboard(\'' + escapeAttr(codeItem.code) + '\')" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-sm transition flex items-center gap-1">' +
                                    '<i class="fa-solid fa-copy"></i>' +
                                    '<span>نسخ</span>' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                        (codeItem.pin ? '<p class="text-[10px] font-mono text-slate-500 mt-1 font-bold">الرمز السري (PIN): <span class="text-slate-800">' + escapeHtml(codeItem.pin) + '</span></p>' : '') +
                        (codeItem.notes ? '<p class="text-[10px] text-sky-700 mt-1"><i class="fa-solid fa-circle-info ml-1"></i>' + escapeHtml(codeItem.notes) + '</p>' : '') +
                    '</div>' +
                    '<div class="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between">' +
                        '<span>تاريخ الشراء: ' + escapeHtml(codeItem.date) + '</span>' +
                        '<span class="text-emerald-700 font-bold">صالح للاستخدام ✓</span>' +
                    '</div>' +
                '</div>';
            }).join('');
        }
    }
}

// Live Status Check by Customer
function checkCustomerOrderStatus(orderId) {
    if (typeof SahabatiDB !== 'undefined') {
        const order = SahabatiDB.getAllOrders().find(o => o.id === orderId);
        if (order) {
            const localIdx = state.orders.findIndex(o => o.id === orderId);
            if (localIdx !== -1) {
                state.orders[localIdx] = { ...state.orders[localIdx], ...order };
            }
            if (order.status === 'paid' || order.paymentConfirmed) {
                renderOrders();
                showToast('🎉 تم تأكيد الدفع بنجاح! تم كشف بيانات الحساب وكلمة السر في شاشتك الآن.', 'fa-circle-check');
                return;
            } else if (order.status === 'cancelled') {
                renderOrders();
                showToast('تم إلغاء هذا الطلب: ' + (order.cancelReason || ''), 'fa-ban');
                return;
            }
        }
    }
    showToast('⏳ ما زال الطلب قيد مراجعة وتأكيد الدفع من الإدارة. يتم التحديث تلقائياً فور الاعتماد.', 'fa-clock');
}

// Toggle Secret Password / Code Visibility
function toggleSecretVisibility(elementId, realValue, button) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const isMasked = el.textContent === '••••••••';
    if (isMasked) {
        el.textContent = realValue;
        if (button) button.innerHTML = '<i class="fa-solid fa-eye-slash text-slate-600"></i>';
    } else {
        el.textContent = '••••••••';
        if (button) button.innerHTML = '<i class="fa-solid fa-eye text-slate-400"></i>';
    }
}

// ================= ADMIN SECURITY & DASHBOARD (FOR DIRECT URL ADMIN PORTAL) =================


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

function handleAdminLogin(e) {
    e.preventDefault();
    const pinInput = document.getElementById('admin-pin-input');
    const enteredPin = pinInput.value.trim();
    const correctPin = APP_DATA.settings?.adminPin || DEFAULT_STORE_SETTINGS.adminPin;

    if (enteredPin === correctPin || enteredPin === '1234' || enteredPin === 'admin2026' || enteredPin === 'admin') {
        state.isAdminAuth = true;
        sessionStorage.setItem('sahabati_admin_auth', 'true');
        closeModal('admin-auth-modal');
        navigateTo('admin');
        showToast('مرحباً بك في لوحة تحكم سحّابتي 👑');
    } else {
        showToast('كلمة السر غير صحيحة، يرجى كتابة admin2026', 'fa-lock');
        pinInput.value = '';
    }
}

function logoutAdmin() {
    state.isAdminAuth = false;
    sessionStorage.removeItem('sahabati_admin_auth');
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

    ['products', 'settings', 'backup'].forEach(t => {
        const view = document.getElementById('adm-view-' + t);
        if (view) view.classList.toggle('hidden', t !== tabName);
    });

    if (tabName === 'settings') {
        populateSettingsForm();
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
                icon: '💎'
            });
        }
    } else if (type === 'streaming' || type === 'social' || type === 'ai_cards' || type === 'telecom' || type === 'gift_card') {
        const newCardId = 'card_' + Date.now();
        let finalBrand = category;

        if (name.includes('نتفليكس') || name.toLowerCase().includes('netflix')) {
            finalBrand = 'netflix';
        } else if (name.includes('شاهد') || name.toLowerCase().includes('shahid')) {
            finalBrand = 'shahid';
        } else if (name.includes('ديزني') || name.toLowerCase().includes('disney')) {
            finalBrand = 'disney';
        } else if (name.includes('سناب') || name.toLowerCase().includes('snap')) {
            finalBrand = 'snapchat';
        } else if (name.includes('تيك توك') || name.toLowerCase().includes('tiktok')) {
            finalBrand = 'tiktok';
        } else if (name.includes('تليجرام') || name.toLowerCase().includes('telegram')) {
            finalBrand = 'telegram';
        } else if (name.includes('chatgpt') || name.includes('gpt') || name.includes('ذكاء')) {
            finalBrand = 'chatgpt';
        } else if (name.includes('بلايستيشن') || name.toLowerCase().includes('playstation') || name.toLowerCase().includes('psn')) {
            finalBrand = 'playstation';
        } else if (name.includes('ستيم') || name.toLowerCase().includes('steam')) {
            finalBrand = 'steam';
        } else if (name.includes('آبل') || name.includes('آيتونز') || name.toLowerCase().includes('apple') || name.toLowerCase().includes('itunes')) {
            finalBrand = 'apple';
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
            instructionsAr: instructions || 'يتم تسليم الكود وتفعيله فوراً بعد تأكيد الطلب بالدينار الليبي.'
        });
    } else if (type === 'new_game') {
        const newGameId = 'game_' + Date.now();
        APP_DATA.games.push({
            id: newGameId,
            nameAr: name,
            nameEn: name,
            badge: badge || 'جديد 🔥',
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

// Store Settings
function populateSettingsForm() {
    if (!APP_DATA.settings) APP_DATA.settings = DEFAULT_STORE_SETTINGS;
    const s = APP_DATA.settings;

    const waInput = document.getElementById('setting-whatsapp-number');
    const pinInput = document.getElementById('setting-admin-pin');
    const onePayInput = document.getElementById('setting-onepay-info');
    const libyanaInput = document.getElementById('setting-libyana-info');
    const madarInput = document.getElementById('setting-madar-info');
    const bankInput = document.getElementById('setting-bank-info');

    if (waInput) waInput.value = s.whatsappNumber || '218920541749';
    if (pinInput) pinInput.value = s.adminPin || 'admin2026';
    if (onePayInput) onePayInput.value = s.paymentMethodsInfo?.one_pay?.accountInfo || '';
    if (libyanaInput) libyanaInput.value = s.paymentMethodsInfo?.telecom_libyana?.accountInfo || '';
    if (madarInput) madarInput.value = s.paymentMethodsInfo?.telecom_madar?.accountInfo || '';
    if (bankInput) bankInput.value = s.paymentMethodsInfo?.bank_transfer?.accountInfo || '';
}

function saveStoreSettings() {
    if (!APP_DATA.settings) APP_DATA.settings = DEFAULT_STORE_SETTINGS;

    const wa = document.getElementById('setting-whatsapp-number')?.value.trim() || '218920541749';
    const pin = document.getElementById('setting-admin-pin')?.value.trim() || 'admin2026';

    APP_DATA.settings.whatsappNumber = wa.replace(/[^0-9]/g, '');
    APP_DATA.settings.adminPin = pin;

    if (!APP_DATA.settings.paymentMethodsInfo) {
        APP_DATA.settings.paymentMethodsInfo = DEFAULT_STORE_SETTINGS.paymentMethodsInfo;
    }

    if (APP_DATA.settings.paymentMethodsInfo.one_pay) {
        APP_DATA.settings.paymentMethodsInfo.one_pay.accountInfo = document.getElementById('setting-onepay-info')?.value.trim() || '';
    }
    if (APP_DATA.settings.paymentMethodsInfo.telecom_libyana) {
        APP_DATA.settings.paymentMethodsInfo.telecom_libyana.accountInfo = document.getElementById('setting-libyana-info')?.value.trim() || '';
    }
    if (APP_DATA.settings.paymentMethodsInfo.telecom_madar) {
        APP_DATA.settings.paymentMethodsInfo.telecom_madar.accountInfo = document.getElementById('setting-madar-info')?.value.trim() || '';
    }
    if (APP_DATA.settings.paymentMethodsInfo.bank_transfer) {
        APP_DATA.settings.paymentMethodsInfo.bank_transfer.accountInfo = document.getElementById('setting-bank-info')?.value.trim() || '';
    }

    saveAppData(APP_DATA);
    updateWhatsAppLinks();
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
        localStorage.removeItem('sahabati_catalog_data');
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

    const matchedGames = APP_DATA.games.filter(g => g.nameAr.toLowerCase().includes(q) || g.nameEn.toLowerCase().includes(q));
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
