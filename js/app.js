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
    paymentMethod: 'lypay',
    isAdminAuth: (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sahabati_admin_auth') === 'true' : false)
};

// Cart limits come from js/security.js; fall back to safe defaults if it failed to load
function guardLimit(name, fallback) {
    return (typeof FraudGuard !== 'undefined' && FraudGuard.LIMITS && FraudGuard.LIMITS[name]) || fallback;
}

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
    loadCartForActiveCustomer();
    updateWhatsAppLinks();
    updateCustomerAuthUI();
    renderCategories();
    renderHome();
    renderHomeChat();
    renderChatApps('');
    renderGamesNav();
    renderGameDetail(state.selectedGame || 'pubg');
    renderGiftCards('all');
    renderOrders();
    updateCartUI();
    renderPaymentInstructions();
    bindEvents();
    sanitizeStoredCart();
    initPromoCarousel();
    connectToServer();
    
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
    const cardFilters = (APP_DATA.categories || []).map(c => c.id).filter(id => id !== 'games' && id !== 'chat');
    if (['home', 'games', 'chat', 'giftcards', 'checkout', 'orders'].concat(cardFilters).includes(hash)) {
        if (cardFilters.includes(hash)) {
            navigateTo('giftcards');
            filterGiftCards(hash);
        } else {
            navigateTo(hash);
        }
    } else {
        navigateTo('home');
    }
}

// ---------- Server connection (الخادم هو مصدر الأسعار والطلبات عند توفره) ----------
function apiFetch(url, options) {
    const opts = Object.assign({ headers: { 'Content-Type': 'application/json' } }, options || {});
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(15000);
    return fetch(url, opts).then(res => res.json().catch(() => ({})).then(data => {
        if (!res.ok) { const e = new Error(data.error || ('HTTP ' + res.status)); e.status = res.status; throw e; }
        return data;
    }));
}

function connectToServer() {
    if (typeof fetch === 'undefined' || typeof window === 'undefined' || !window.location) return;
    if (!/^https?:$/.test(window.location.protocol) || /github\.io$/.test(window.location.hostname)) return;
    apiFetch('/api/catalog').then(catalog => {
        if (!catalog || !Array.isArray(catalog.games) || !Array.isArray(catalog.giftCards)) return;
        state.serverMode = true;
        APP_DATA = catalog;
        APP_DATA.settings = Object.assign({}, DEFAULT_STORE_SETTINGS, catalog.settings || {});
        delete APP_DATA.settings.adminPin;
        updateWhatsAppLinks();
        renderCategories();
        renderHome();
        renderHomeChat();
        renderChatApps(document.getElementById('chat-search-input')?.value || '');
        renderGamesNav();
        renderGameDetail(state.selectedGame || 'pubg');
        renderGiftCards('all');
        sanitizeStoredCart();
        if (state.currentTab === 'checkout') renderCheckout();
        refreshServerOrders().then(changed => { if (!changed) updateCustomerAuthUI(); });
    }).catch(() => { /* لا يوجد خادم: يعمل المتجر محلياً */ });
}

// تحديث تلقائي لحالة الطلبات كل 30 ثانية ما دامت صفحة «طلباتي» مفتوحة
if (typeof setInterval === 'function' && typeof document !== 'undefined') {
    setInterval(() => {
        if (state.serverMode && state.currentTab === 'orders' && !document.hidden) refreshServerOrders();
    }, 30000);
}

function saveLocalOrders() {
    try { localStorage.setItem('sahabati_orders', JSON.stringify(state.orders.slice(0, 100))); } catch (e) {}
}

// Retrieve orders strictly isolated for the active viewer (customer or guest)
function getOrdersForCurrentViewer() {
    const customer = typeof getActiveCustomer === 'function' ? getActiveCustomer() : null;
    const cleanCustomerPhone = customer && customer.phone ? String(customer.phone).replace(/[^0-9]/g, '') : '';

    const all = [];
    const seen = new Set();
    ((state && state.orders) || []).forEach(o => {
        if (o && o.id && !seen.has(o.id)) {
            seen.add(o.id);
            all.push(o);
        }
    });

    if (typeof SahabatiDB !== 'undefined' && SahabatiDB.getAllOrders) {
        (SahabatiDB.getAllOrders() || []).forEach(o => {
            if (o && o.id && !seen.has(o.id)) {
                seen.add(o.id);
                all.push(o);
            }
        });
    }

    if (customer) {
        return all.filter(o => {
            if (o.userId && o.userId === customer.id) return true;
            if (cleanCustomerPhone && o.customerPhone) {
                const op = String(o.customerPhone).replace(/[^0-9]/g, '');
                if (op === cleanCustomerPhone || (op.length >= 9 && cleanCustomerPhone.length >= 9 && op.slice(-9) === cleanCustomerPhone.slice(-9))) {
                    return !o.userId || o.userId === customer.id || o.userId === 'guest';
                }
            }
            return false;
        });
    }

    // Guest mode: only show orders placed by a guest without user association
    return all.filter(o => !o.userId || o.userId === 'guest');
}

// Ask the server for the latest status of this device's orders (codes appear only after payment)
let ordersRefreshInFlight = false;
function refreshServerOrders(showResult) {
    if (!state.serverMode || ordersRefreshInFlight) return Promise.resolve(false);
    const customer = typeof getActiveCustomer === 'function' ? getActiveCustomer() : null;
    const viewerOrders = getOrdersForCurrentViewer();
    const pending = viewerOrders.filter(o => o.serverOrder && o.status !== 'paid' && o.status !== 'cancelled' && o.status !== 'missing');

    const byPhone = {};
    if (pending.length > 0) {
        pending.forEach(o => {
            const ph = o.customerPhone || (customer ? customer.phone : '');
            if (ph) {
                (byPhone[ph] = byPhone[ph] || []).push(o.id);
            }
        });
    } else if (customer && customer.phone) {
        byPhone[customer.phone] = [];
    }

    if (Object.keys(byPhone).length === 0) return Promise.resolve(false);

    ordersRefreshInFlight = true;
    let changed = false;
    return Promise.all(Object.keys(byPhone).map(phone =>
        apiFetch('/api/orders/status', { method: 'POST', body: JSON.stringify({ phone: phone, ids: byPhone[phone] }) })
            .then(data => {
                (data.orders || []).forEach(fresh => {
                    const idx = state.orders.findIndex(o => o.id === fresh.id);
                    if (idx !== -1) {
                        if (state.orders[idx].status !== fresh.status) changed = true;
                        state.orders[idx] = Object.assign({}, state.orders[idx], fresh);
                    } else if (customer) {
                        fresh.userId = customer.id;
                        state.orders.unshift(fresh);
                        changed = true;
                    }
                });
                // الخادم لا يعرف هذا الطلب: لا نتركه "قيد الدفع" للأبد
                (data.missing || []).forEach(id => {
                    const o = state.orders.find(x => x.id === id);
                    if (o && o.status !== 'missing') { o.status = 'missing'; changed = true; }
                });
            })
            .catch(() => {})
    )).then(() => {
        ordersRefreshInFlight = false;
        if (changed) {
            saveLocalOrders();
            if (state.currentTab === 'orders') renderOrders();
            if (showResult) showToast('تم تحديث حالة طلباتك ✓');
        }
        return changed;
    });
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

    document.querySelectorAll('.tab-bar-item').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.nav === tabId);
    });
    const buyBar = document.getElementById('game-buy-bar');
    if (buyBar) buyBar.classList.toggle('hidden', !(tabId === 'games' && state.selectedPackage));

    // Hide all view pages
    document.querySelectorAll('.view-page').forEach(page => {
        page.classList.add('hidden');
    });

    // Show target view page
    const target = document.getElementById('page-' + tabId);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    if (tabId === 'chat') {
        renderChatApps(document.getElementById('chat-search-input')?.value || '');
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
    toast.innerHTML = '<i class="fa-solid ' + escapeAttr(icon) + ' text-emerald-400 text-lg"></i> <span>' + escapeHtml(message) + '</span>';
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(15px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// Render Categories as round app-style chips
function renderCategories() {
    const container = document.getElementById('categories-grid');
    if (!container) return;

    container.innerHTML = APP_DATA.categories.map(cat => {
        const shortTitle = cat.shortAr || cat.titleAr;
        const svg = cat.brand && typeof brandSvg === 'function' ? brandSvg(cat.brand, 'cat-svg') : '';
        const icon = svg || ('<i class="' + (/^fa-(apple|tiktok)$/.test(cat.icon) ? 'fa-brands ' : 'fa-solid ') + escapeAttr(cat.icon) + '"></i>');
        return '<button type="button" role="listitem" onclick="handleCategoryClick(\'' + escapeAttr(cat.id) + '\')" class="cat-chip cat-' + escapeAttr(cat.id) + '">' +
            '<span class="cat-icon">' + icon + '</span>' +
            '<span class="cat-label">' + escapeHtml(shortTitle) + '</span>' +
        '</button>';
    }).join('');
}

// Brand look for product tiles (ألوان العلامات التجارية)
const BRAND_LOOK = {
    pubg: { cls: 'b-pubg', mark: 'PUBG' },
    freefire: { cls: 'b-freefire', mark: '<i class="fa-solid fa-fire"></i>' },
    tiktok_coins: { cls: 'b-tiktok', mark: '<i class="fa-brands fa-tiktok"></i>' },
    tiktok: { cls: 'b-tiktok', mark: '<i class="fa-brands fa-tiktok"></i>' },
    roblox: { cls: 'b-roblox', mark: 'R$' },
    efootball: { cls: 'b-efootball', mark: '<i class="fa-solid fa-futbol"></i>' },
    clashofclans: { cls: 'b-clash', mark: '<i class="fa-solid fa-shield"></i>' },
    netflix: { cls: 'b-netflix', mark: 'N' },
    shahid: { cls: 'b-shahid', mark: 'شاهد' },
    disney: { cls: 'b-disney', mark: 'D+' },
    snapchat: { cls: 'b-snapchat', mark: '<i class="fa-brands fa-snapchat"></i>' },
    telegram: { cls: 'b-telegram', mark: '<i class="fa-brands fa-telegram"></i>' },
    chatgpt: { cls: 'b-chatgpt', mark: '<i class="fa-solid fa-robot"></i>' },
    claude: { cls: 'b-claude', mark: 'Claude' },
    watchit: { cls: 'b-watchit', mark: 'WATCH IT' },
    crunchyroll: { cls: 'b-crunchyroll', mark: 'CR' },
    apple: { cls: 'b-apple', mark: '<i class="fa-brands fa-apple"></i>' },
    libyana: { cls: 'b-libyana', mark: 'ليبيانا' }
};
function brandLook(key) {
    const look = BRAND_LOOK[key] || { cls: 'b-default', mark: '<i class="fa-solid fa-gift"></i>' };
    const svg = typeof brandSvg === 'function' ? brandSvg(key) : '';
    return svg ? { cls: look.cls, mark: svg } : look;
}
function gameCategory(game) {
    return (game && game.category) || 'games';
}
function isAvailable(item) {
    return !!item && !item.hidden;
}
// Chat apps have no brand logo: a colored tile with the app's first letter
// صورة التطبيق إن أضافها المدير (رابط https أو ملف داخل الموقع images/...)، وإلا مربع ملوّن بأول حرف
function safeImageUrl(url) {
    const u = String(url || '').trim();
    return /^(https:\/\/|images\/)[^"'<>\s]+$/i.test(u) ? u : '';
}
function chatAppMark(game, index) {
    const hue = (index * 47) % 360;
    const letter = String(game.nameAr || '?').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('');
    const img = safeImageUrl(game.image);
    if (img) {
        return '<span class="tile-art chat-art has-img" style="--h:' + hue + '" data-letter="' + escapeAttr(letter) + '">' +
            '<img src="' + escapeAttr(img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove(\'has-img\');this.parentNode.textContent=this.parentNode.dataset.letter">' +
        '</span>';
    }
    return '<span class="tile-art chat-art" style="--h:' + hue + '">' + escapeHtml(letter) + '</span>';
}
// شارة صغيرة فوق أيقونة المنتج الذي يُشحن يدوياً
function manualBadge(item) {
    return item && item.manual ? '<span class="manual-badge" title="يتم الشحن يدوياً بعد تأكيد الدفع"><i class="fa-solid fa-hand"></i> يدوي</span>' : '';
}
function shortName(nameAr) {
    return String(nameAr || '').split('(')[0].trim();
}

// Home page product blocks
function renderHome() {
    const gamesGrid = document.getElementById('home-games-grid');
    if (gamesGrid) {
        gamesGrid.innerHTML = APP_DATA.games.filter(g => gameCategory(g) === 'games' && isAvailable(g)).map(game => {
            const look = brandLook(game.id);
            const minPrice = Math.min.apply(null, (game.packages || []).map(p => Number(p.priceLYD) || 0).filter(Boolean));
            return '<button type="button" class="tile" onclick="selectGame(\'' + escapeAttr(game.id) + '\'); navigateTo(\'games\');">' +
                '<span class="tile-art ' + look.cls + '">' + look.mark + manualBadge(game) + '</span>' +
                '<span class="tile-name">' + escapeHtml(shortName(game.nameAr)) + '</span>' +
                (isFinite(minPrice) ? '<span class="tile-price">من ' + formatPrice(minPrice) + '</span>' : '') +
            '</button>';
        }).join('');
    }

    const cardTile = card => {
        const look = brandLook(card.brand);
        return '<button type="button" class="mini-card" onclick="openCardDetailsModal(\'' + escapeAttr(card.id) + '\')">' +
            '<span class="mini-card-art ' + look.cls + '">' + look.mark + manualBadge(card) +
                (card.badge ? '<em>' + escapeHtml(card.badge) + '</em>' : '') +
            '</span>' +
            '<span class="mini-card-name">' + escapeHtml(shortName(card.nameAr)) + '</span>' +
            '<span class="mini-card-price">' + formatPrice(card.priceLYD) + '</span>' +
        '</button>';
    };
    const streamingRow = document.getElementById('home-streaming-row');
    if (streamingRow) {
        streamingRow.innerHTML = APP_DATA.giftCards.filter(c => c.category === 'entertainment' && isAvailable(c)).map(cardTile).join('');
    }
    const cardsRow = document.getElementById('home-cards-row');
    if (cardsRow) {
        cardsRow.innerHTML = APP_DATA.giftCards.filter(c => ['ai_cards', 'gift_cards', 'social'].includes(c.category) && isAvailable(c)).map(cardTile).join('');
    }
}

// Chat & voice apps: tiles that open the shared top-up page
function chatAppTile(game, index) {
    return '<button type="button" class="tile chat-tile" onclick="openChatApp(\'' + escapeAttr(game.id) + '\')">' +
        chatAppMark(game, index).replace(/<\/span>$/, manualBadge(game) + '</span>') +
        '<span class="tile-name">' + escapeHtml(game.nameAr) + '</span>' +
    '</button>';
}
function chatApps() {
    return APP_DATA.games.filter(g => gameCategory(g) === 'chat' && isAvailable(g));
}
function renderHomeChat() {
    const grid = document.getElementById('home-chat-grid');
    if (!grid) return;
    const apps = chatApps();
    grid.innerHTML = apps.slice(0, 8).map(chatAppTile).join('') +
        (apps.length > 8 ? '<button type="button" class="tile chat-tile more" onclick="navigateTo(\'chat\')"><span class="tile-art chat-art more-art">+' + (apps.length - 8) + '</span><span class="tile-name">عرض الكل</span></button>' : '');
}
function renderChatApps(query) {
    const grid = document.getElementById('chat-apps-grid');
    if (!grid) return;
    const q = String(query || '').trim().toLowerCase();
    const apps = chatApps();
    const list = q ? apps.filter(g => g.nameAr.toLowerCase().includes(q) || String(g.nameEn || '').toLowerCase().includes(q)) : apps;
    grid.innerHTML = list.map(g => chatAppTile(g, apps.indexOf(g))).join('') ||
        '<p class="empty-note">لا يوجد تطبيق بهذا الاسم. تواصل معنا عبر واتساب لإضافته.</p>';
}
function openChatApp(gameId) {
    selectGame(gameId);
    navigateTo('games');
}

// Swipeable promo banners with dots + gentle autoplay
function initPromoCarousel() {
    const track = document.getElementById('promo-track');
    const dots = document.getElementById('promo-dots');
    if (!track || !dots || !track.children.length) return;
    document.querySelectorAll('.promo-art[data-brand]').forEach(el => {
        const svg = typeof brandSvg === 'function' ? brandSvg(el.dataset.brand, 'promo-svg') : '';
        if (svg) el.innerHTML = svg;
    });
    const slides = Array.from(track.children);
    dots.innerHTML = slides.map((_, i) => '<span class="' + (i === 0 ? 'on' : '') + '"></span>').join('');
    const setActive = () => {
        const w = track.clientWidth || 1;
        const idx = Math.round(Math.abs(track.scrollLeft) / w);
        Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', i === idx));
        return idx;
    };
    track.addEventListener('scroll', () => { window.requestAnimationFrame(setActive); }, { passive: true });
    let paused = false;
    track.addEventListener('touchstart', () => { paused = true; }, { passive: true });
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setInterval(() => {
        if (paused || document.hidden || state.currentTab !== 'home') return;
        const next = (setActive() + 1) % slides.length;
        // RTL: scrollLeft is negative in modern browsers
        const dir = getComputedStyle(track).direction === 'rtl' ? -1 : 1;
        track.scrollTo({ left: dir * next * track.clientWidth, behavior: 'smooth' });
    }, 5000);
}

function handleCategoryClick(catId) {
    if (catId === 'games') {
        const current = APP_DATA.games.find(g => g.id === state.selectedGame);
        if (!current || gameCategory(current) !== 'games') selectGame('pubg');
        navigateTo('games');
    } else if (catId === 'chat') {
        navigateTo('chat');
    } else {
        navigateTo('giftcards');
        filterGiftCards(catId);
    }
}

// Render Games Navigation Tabs with Original Logos
function renderGamesNav() {
    const container = document.getElementById('games-selector');
    if (!container) return;

    const current = APP_DATA.games.find(g => g.id === state.selectedGame);
    const isChat = gameCategory(current) === 'chat';
    document.getElementById('games-selector-panel')?.classList.toggle('hidden', isChat);
    document.getElementById('chat-back-btn')?.classList.toggle('hidden', !isChat);
    if (isChat) { container.innerHTML = ''; return; }

    container.innerHTML = APP_DATA.games.filter(g => gameCategory(g) === 'games' && isAvailable(g)).map(game => {
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

    // كل لعبة/تطبيق له معرّفه الخاص: لا ننقل معرّف لعبة إلى أخرى
    if (state.verifiedForGame !== game.id) {
        state.verifiedPlayerId = '';
        state.verifiedForGame = game.id;
        const statusBox = document.getElementById('player-id-status');
        if (statusBox) statusBox.innerHTML = '';
    }
    state.selectedGame = game.id;

    const titleEl = document.getElementById('game-title-text');
    if (titleEl) {
        titleEl.textContent = game.nameAr;
    }

    const idLabelEl = document.getElementById('player-id-label');
    if (idLabelEl) {
        idLabelEl.textContent = game.idLabelAr || 'بيانات التسليم:';
    }

    const idInput = document.getElementById('player-id-input');
    if (idInput) {
        idInput.placeholder = game.idPlaceholder || 'مثال: 5123456789';
        idInput.value = state.verifiedPlayerId || '';
    }

    const needsId = gameNeedsPlayerId(game.id);
    const idCard = idInput ? idInput.closest('.p-5') : null;
    if (idCard) idCard.classList.toggle('hidden', !needsId);

    const badge = document.getElementById('game-method-badge');
    if (badge) {
        badge.textContent = ({ id: '🆔 الشحن بمعرّف الحساب (ID)', qr: '🔳 الشحن عبر رمز QR', login: '🔐 الشحن عبر تسجيل الدخول', manual: '✋ تسليم يدوي' }[deliveryMethodOf(game)] || '') + (game.manual && deliveryMethodOf(game) !== 'manual' ? ' · ✋ يدوي' : '');
    }

    const note = document.getElementById('delivery-note');
    if (note) {
        const method = deliveryMethodOf(game);
        const icon = method === 'qr' ? 'fa-qrcode' : (method === 'manual' ? 'fa-hand' : 'fa-right-to-bracket');
        const title = method === 'qr' ? 'الشحن عبر رمز QR' : (method === 'manual' ? 'تسليم يدوي' : 'الشحن عبر تسجيل الدخول');
        const defaultNote = method === 'manual' ? 'بعد تأكيد الدفع نسلّمك طلبك يدوياً ويظهر في «طلباتي».' : 'بعد إرسال الطلب نتواصل معك عبر واتساب لإتمام الشحن.';
        note.innerHTML = needsId ? '' : '<i class="fa-solid ' + icon + '"></i><div><strong>' + title + '</strong><p>' + escapeHtml(method === 'manual' ? defaultNote : (game.deliveryNoteAr || defaultNote)) + '</p></div>';
        note.classList.toggle('hidden', needsId);
    }

    state.selectedPackage = null;
    updateBuyBar();

    const packagesContainer = document.getElementById('packages-grid');
    if (packagesContainer) {
        packagesContainer.innerHTML = game.packages.filter(isAvailable).map(pkg => {
            const tag = pkg.popular ? '<span class="pkg-tag hot">الأكثر طلباً</span>' : (pkg.bestValue ? '<span class="pkg-tag value">أفضل قيمة</span>' : '');
            return '<button type="button" class="pkg-tile" data-pkg="' + escapeAttr(pkg.id) + '" onclick="selectPackage(\'' + escapeAttr(game.id) + '\', \'' + escapeAttr(pkg.id) + '\')">' +
                tag +
                '<span class="pkg-icon">' + escapeHtml(pkg.icon || '💎') + '</span>' +
                '<span class="pkg-name">' + escapeHtml(pkg.nameAr) + '</span>' +
                '<span class="pkg-price">' + formatPrice(pkg.priceLYD) + '</span>' +
            '</button>';
        }).join('');
    }
}

// طريقة الشحن لكل لعبة: id (معرّف اللاعب) | qr (رمز QR) | login (تسجيل الدخول عبر واتساب)
function deliveryMethodOf(game) {
    return (game && game.deliveryMethod) || 'manual';
}
function gameNeedsPlayerId(gameId) {
    return false;
}
function deliveryMeta(game, playerId) {
    const method = deliveryMethodOf(game);
    if (method === 'qr') return 'الشحن عبر رمز QR';
    if (method === 'login') return 'الشحن عبر تسجيل الدخول';
    if (method === 'manual') return 'تسليم يدوي';
    return game && game.id === 'pubg' ? 'كود شدات ببجي' : 'باقة شحن';
}

function selectPackage(gameId, pkgId) {
    const game = APP_DATA.games.find(g => g.id === gameId);
    const pkg = game && game.packages.find(p => p.id === pkgId);
    if (!pkg) return;
    state.selectedPackage = { gameId: gameId, pkgId: pkgId };
    document.querySelectorAll('.pkg-tile').forEach(t => t.classList.toggle('is-selected', t.dataset.pkg === pkgId));
    updateBuyBar();
}

function updateBuyBar() {
    const bar = document.getElementById('game-buy-bar');
    if (!bar) return;
    const sel = state.selectedPackage;
    const game = sel && APP_DATA.games.find(g => g.id === sel.gameId);
    const pkg = game && game.packages.find(p => p.id === sel.pkgId);
    bar.classList.toggle('hidden', !pkg || state.currentTab !== 'games');
    if (!pkg) return;
    const nameEl = document.getElementById('buy-bar-name');
    const priceEl = document.getElementById('buy-bar-price');
    if (nameEl) nameEl.textContent = shortName(game.nameAr) + ' · ' + pkg.nameAr;
    if (priceEl) priceEl.textContent = formatPrice(pkg.priceLYD);
}

function addSelectedPackageToCart() {
    const sel = state.selectedPackage;
    if (!sel) { showToast('اختر باقة أولاً', 'fa-hand-pointer'); return false; }
    return addGamePackageToCart(sel.gameId, sel.pkgId);
}

function buySelectedPackage() {
    if (addSelectedPackageToCart()) navigateTo('checkout');
}

// Legacy account-id validation kept for old saved catalogs only.
function verifyPlayerId() {
    const input = document.getElementById('player-id-input');
    const statusBox = document.getElementById('player-id-status');
    if (!input || !statusBox) return false;
    const idVal = input.value.replace(/\s/g, '');
    input.value = idVal;
    const problem = FraudGuard.playerIdProblem(idVal);
    if (problem) {
        state.verifiedPlayerId = '';
        statusBox.innerHTML = '<div class="id-status bad"><i class="fa-solid fa-circle-xmark"></i><span>' + escapeHtml(problem) + '</span></div>';
        return false;
    }
    state.verifiedPlayerId = idVal;
    statusBox.innerHTML = '<div class="id-status ok"><i class="fa-solid fa-circle-check"></i><span>سيتم الشحن إلى المعرّف: <strong>' + escapeHtml(idVal) + '</strong></span></div>';
    return true;
}

// Add Game Package to Cart
function addGamePackageToCart(gameId, pkgId) {
    const game = APP_DATA.games.find(g => g.id === gameId);
    if (!game) return;
    const pkg = game.packages.find(p => p.id === pkgId);
    if (!pkg || !isAvailable(game) || !isAvailable(pkg)) return false;

    let playerId = '';
    if (gameNeedsPlayerId(game.id)) {
        const typed = (document.getElementById('player-id-input')?.value || '').replace(/\s/g, '');
        if ((!state.verifiedPlayerId || typed !== state.verifiedPlayerId) && !verifyPlayerId()) {
            showToast(FraudGuard.playerIdProblem(typed) || 'يرجى تأكيد معرّف اللاعب', 'fa-id-card');
            document.getElementById('player-id-input')?.focus();
            return false;
        }
        playerId = state.verifiedPlayerId;
    }

    const meta = deliveryMeta(game, playerId);
    const existing = state.cart.find(i => i.type === 'game' && i.packageId === pkg.id && i.meta === meta);
    if (existing) {
        return updateCartQuantity(existing.cartItemId, 1) !== false;
    }
    if (state.cart.length >= guardLimit('maxCartLines', 10)) {
        showToast('وصلت للحد الأقصى من المنتجات في السلة', 'fa-triangle-exclamation');
        return false;
    }

    const cartItem = {
        cartItemId: 'item_' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: 'game',
        gameId: game.id,
        packageId: pkg.id,
        titleAr: game.nameAr.split('(')[0] + ' - ' + pkg.nameAr,
        meta: meta,
        priceLYD: (typeof FraudGuard !== 'undefined' && FraudGuard.getProductPrice) ? (FraudGuard.getProductPrice(pkg, APP_DATA, state.paymentMethod) || pkg.priceLYD) : pkg.priceLYD,
        quantity: 1
    };

    state.cart.push(cartItem);
    saveCart();
    updateCartUI();
    showToast('تمت إضافة ' + pkg.nameAr + ' إلى السلة 🛒');
    return true;
}

function buyNowGamePackage(gameId, pkgId) {
    if (addGamePackageToCart(gameId, pkgId)) navigateTo('checkout');
}

// Render Gift Cards, Streaming Subscriptions & AI Cards
function renderGiftCards(filter) {
    if (!filter) filter = 'all';
    const container = document.getElementById('giftcards-grid');
    if (!container) return;

    let cards = APP_DATA.giftCards.filter(isAvailable);
    if (filter !== 'all') {
        cards = cards.filter(c => c.category === filter);
    }

    container.innerHTML = cards.map(card => {
        const look = brandLook(card.brand);
        return '<div class="gc-tile">' +
            '<button type="button" class="gc-art ' + look.cls + '" onclick="openCardDetailsModal(\'' + escapeAttr(card.id) + '\')" aria-label="تفاصيل ' + escapeAttr(card.nameAr) + '">' + manualBadge(card) +
                '<span class="gc-mark">' + look.mark + '</span>' +
                (card.badge ? '<em>' + escapeHtml(card.badge) + '</em>' : '') +
                '<small>' + escapeHtml(card.nominal || '') + '</small>' +
            '</button>' +
            '<div class="gc-body">' +
                '<h4>' + escapeHtml(shortName(card.nameAr)) + '</h4>' +
                '<div class="gc-foot">' +
                    '<strong>' + formatPrice(card.priceLYD) + '</strong>' +
                    '<button type="button" onclick="addGiftCardToCart(\'' + escapeAttr(card.id) + '\')" class="gc-add" aria-label="أضف للسلة"><i class="fa-solid fa-plus"></i></button>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('') || '<p class="empty-note">لا توجد منتجات في هذا القسم حالياً</p>';
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

// طريقة تسليم البطاقة/الاشتراك يحددها المدير: code (افتراضي) | id | manual
function cardDeliveryMethod(card) {
    return (card && card.deliveryMethod) || 'code';
}

function addGiftCardToCart(cardId, accountId) {
    const card = APP_DATA.giftCards.find(c => c.id === cardId);
    if (!card || !isAvailable(card)) return false;

    // منتج يحتاج معرّف حساب العميل: نفتح نافذة التفاصيل لإدخاله
    let meta = card.nominal || 'اشتراك وبطاقة رقمية';
    if (cardDeliveryMethod(card) === 'id') {
        const v = String(accountId || '').trim();
        if (!v) { openCardDetailsModal(card.id); return false; }
        const problem = typeof FraudGuard !== 'undefined' ? FraudGuard.accountIdProblem(v) : null;
        if (problem) { showToast(problem, 'fa-id-card'); return false; }
        meta = 'ID: ' + v;
    } else if (cardDeliveryMethod(card) === 'manual') {
        meta = 'تسليم يدوي';
    }

    const existing = state.cart.find(i => i.type === 'giftcard' && i.cardId === card.id && i.meta === meta);
    if (existing) {
        if (updateCartQuantity(existing.cartItemId, 1) !== false) showToast('تمت زيادة الكمية: ' + card.nameAr);
        return;
    }
    if (state.cart.length >= guardLimit('maxCartLines', 10)) {
        showToast('وصلت للحد الأقصى من المنتجات في السلة', 'fa-triangle-exclamation');
        return;
    }

    const cartItem = {
        cartItemId: 'item_' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: 'giftcard',
        cardId: card.id,
        titleAr: card.nameAr,
        meta: meta,
        priceLYD: (typeof FraudGuard !== 'undefined' && FraudGuard.getProductPrice) ? (FraudGuard.getProductPrice(card, APP_DATA, state.paymentMethod) || card.priceLYD) : card.priceLYD,
        quantity: 1
    };

    state.cart.push(cartItem);
    saveCart();
    updateCartUI();
    showToast('تمت إضافة ' + card.nameAr + ' إلى السلة 🎁');
    return true;
}

function openCardDetailsModal(cardId) {
    const card = APP_DATA.giftCards.find(c => c.id === cardId);
    if (!card) return;

    const modal = document.getElementById('card-detail-modal');
    const content = document.getElementById('card-modal-body');
    if (!modal || !content) return;

    const method = cardDeliveryMethod(card);
    const deliveryHtml = method === 'id'
        ? '<div class="mb-4 text-right"><label for="card-account-input" class="text-xs font-extrabold text-slate-800 block mb-1">' + escapeHtml(card.idLabelAr || 'معرّف أو بريد حسابك (لتفعيل الاشتراك عليه):') + '</label>' +
            '<input type="text" id="card-account-input" autocomplete="off" maxlength="80" dir="ltr" placeholder="' + escapeAttr(card.idPlaceholder || 'example@email.com أو ID') + '" class="glass-input w-full rounded-xl py-2.5 px-3 text-sm font-bold text-slate-900">' +
            '<p class="text-[11px] text-slate-500 font-bold mt-1">تأكد من كتابته بشكل صحيح، فالتفعيل يتم على هذا الحساب.</p></div>'
        : (method === 'manual'
            ? '<div class="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900"><i class="fa-solid fa-hand"></i> تسليم يدوي: بعد تأكيد الدفع نسلّمك الطلب ويظهر في «طلباتي».</div>'
            : '');

    const methodsList = [
        { id: 'lypay', name: 'رصيد LY', icon: 'fa-solid fa-mobile-screen-button' },
        { id: 'bank_transfer', name: 'تحويل مصرفي', icon: 'fa-solid fa-building-columns' },
        { id: 'onepay', name: 'OnePay', icon: 'fa-solid fa-money-bill-transfer' },
        { id: 'telecom_libyana', name: 'كروت ليبيانا', icon: 'fa-solid fa-sim-card' }
    ];

    const availableForCard = methodsList.filter(m => {
        const p = (typeof FraudGuard !== 'undefined' && FraudGuard.getProductPrice)
            ? FraudGuard.getProductPrice(card, APP_DATA, m.id)
            : card.priceLYD;
        return p !== null && p > 0;
    });

    const activeMethod = (state.paymentMethod && availableForCard.some(m => m.id === state.paymentMethod))
        ? state.paymentMethod
        : (availableForCard[0]?.id || 'lypay');

    const currentPrice = (typeof FraudGuard !== 'undefined' && FraudGuard.getProductPrice)
        ? (FraudGuard.getProductPrice(card, APP_DATA, activeMethod) || card.priceLYD)
        : card.priceLYD;

    const multiPriceHtml = availableForCard.length > 0 ? (
        '<div class="mb-4 space-y-2 text-right">' +
            '<div class="flex items-center justify-between">' +
                '<label class="text-xs font-black text-slate-800">اختر طريقة الدفع لمعرفة السعر النهائي:</label>' +
                '<span class="text-[10px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">تحديث فوري</span>' +
            '</div>' +
            '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2" id="card-modal-methods-grid">' +
                availableForCard.map(m => {
                    const mPrice = FraudGuard.getProductPrice(card, APP_DATA, m.id);
                    const isSel = m.id === activeMethod;
                    return '<div onclick="selectCardModalMethod(\'' + escapeAttr(card.id) + '\', \'' + escapeAttr(m.id) + '\')" id="card-method-pill-' + escapeAttr(m.id) + '" class="card-modal-method-pill cursor-pointer p-2 rounded-xl border text-center transition ' + (isSel ? 'border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-400 font-black' : 'border-slate-200 bg-white hover:bg-slate-50 font-bold') + '">' +
                        '<span class="text-[11px] text-slate-800 block"><i class="' + m.icon + ' text-sky-600 ml-1"></i> ' + m.name + '</span>' +
                        '<span class="text-xs font-mono font-black text-emerald-700 block mt-0.5">' + formatPrice(mPrice) + '</span>' +
                    '</div>';
                }).join('') +
            '</div>' +
        '</div>'
    ) : '';

    content.innerHTML = '<div class="text-center mb-4">' +
        '<div class="w-full h-28 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-800 p-4 text-white flex flex-col justify-between shadow-lg mb-3">' +
            '<span class="text-xs uppercase tracking-wider bg-white/20 self-start px-2 py-0.5 rounded">سحّابتي My Cloud</span>' +
            '<span class="text-2xl font-black">' + escapeHtml(card.nominal || card.nameAr) + '</span>' +
            '<span class="text-xs text-white/90 text-left font-bold">' + (method === 'manual' ? 'تسليم يدوي' : 'تسليم مباشر') + '</span>' +
        '</div>' +
        '<h3 class="text-xl font-black text-slate-900">' + escapeHtml(card.nameAr) + '</h3>' +
        '<p id="card-modal-price" class="text-2xl font-black text-emerald-700 mt-1">' + formatPrice(currentPrice) + '</p>' +
    '</div>' +
    multiPriceHtml +
    '<div class="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 mb-4 text-xs leading-relaxed text-slate-700">' +
        '<h4 class="font-bold text-slate-900 mb-1 flex items-center gap-1.5">' +
            '<i class="fa-solid fa-circle-question text-emerald-600"></i>' +
            '<span>طريقة الاستخدام والتسليم:</span>' +
        '</h4>' +
        '<p>' + escapeHtml(card.instructionsAr || 'يتم تسليم كود التفعيل أو بيانات الحساب فور تأكيد الطلب عبر واتساب.') + '</p>' +
    '</div>' +
    deliveryHtml +
    '<div class="flex gap-2">' +
        '<button onclick="if (addGiftCardToCart(\'' + escapeAttr(card.id) + '\', (document.getElementById(\'card-account-input\') || {}).value) !== false) closeModal(\'card-detail-modal\');" class="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30">' +
            'إضافة إلى السلة' +
        '</button>' +
        '<button onclick="closeModal(\'card-detail-modal\')" class="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm">' +
            'إغلاق' +
        '</button>' +
    '</div>';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function selectCardModalMethod(cardId, methodId) {
    const card = APP_DATA.giftCards.find(c => c.id === cardId);
    if (!card) return;
    state.paymentMethod = methodId;
    const price = (typeof FraudGuard !== 'undefined' && FraudGuard.getProductPrice)
        ? (FraudGuard.getProductPrice(card, APP_DATA, methodId) || card.priceLYD)
        : card.priceLYD;
    const priceEl = document.getElementById('card-modal-price');
    if (priceEl) priceEl.textContent = formatPrice(price);

    document.querySelectorAll('.card-modal-method-pill').forEach(el => {
        el.classList.remove('border-emerald-500', 'bg-emerald-50/90', 'ring-2', 'ring-emerald-400', 'font-black');
        el.classList.add('border-slate-200', 'bg-white', 'font-bold');
    });
    const activePill = document.getElementById('card-method-pill-' + methodId);
    if (activePill) {
        activePill.classList.add('border-emerald-500', 'bg-emerald-50/90', 'ring-2', 'ring-emerald-400', 'font-black');
        activePill.classList.remove('border-slate-200', 'bg-white');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Cart Storage & UI - معزولة 100% لكل عميل (سلة مستقلة لكل حساب)
function getCartStorageKey() {
    const customer = typeof getActiveCustomer === 'function' ? getActiveCustomer() : null;
    return customer ? ('sahabati_cart_' + customer.id) : 'sahabati_cart_guest';
}

function loadCartForActiveCustomer() {
    try {
        const key = getCartStorageKey();
        const raw = localStorage.getItem(key);
        state.cart = raw ? JSON.parse(raw) : [];
    } catch (e) {
        state.cart = [];
    }
    sanitizeStoredCart();
    updateCartUI();
    if (state.currentTab === 'checkout') renderCheckout();
}

function saveCart() {
    try {
        localStorage.setItem(getCartStorageKey(), JSON.stringify(state.cart));
    } catch (e) {}
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
        if (delta > 0 && item.quantity >= guardLimit('maxQtyPerItem', 5)) {
            showToast('الحد الأقصى ' + guardLimit('maxQtyPerItem', 5) + ' قطع من نفس المنتج في الطلب الواحد', 'fa-triangle-exclamation');
            return false;
        }
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(cartItemId);
            return;
        }
        saveCart();
        updateCartUI();
        if (state.currentTab === 'checkout') renderCheckout();
    }
}

// Re-price the stored cart from the official catalog (prevents edited prices in localStorage)
function sanitizeStoredCart(method) {
    if (typeof FraudGuard === 'undefined') return;
    const pm = method || state.paymentMethod || null;
    const result = FraudGuard.sanitizeCart(state.cart, APP_DATA, pm);
    if (result.changed) {
        state.cart = result.cart;
        saveCart();
        updateCartUI();
    }
    return result.changed;
}

const ALL_PAYMENT_METHODS = [
    { id: 'lypay', nameAr: 'رصيد LY', sub: 'دفع إلكتروني فوري', icon: 'fa-solid fa-mobile-screen-button', color: 'sky' },
    { id: 'bank_transfer', nameAr: 'تحويل مصرفي', sub: 'التجارة والتنمية', icon: 'fa-solid fa-building-columns', color: 'blue' },
    { id: 'onepay', nameAr: 'OnePay', sub: 'دفع إلكتروني فوري', icon: 'fa-solid fa-money-bill-transfer', color: 'emerald' },
    { id: 'telecom_libyana', nameAr: 'كروت ليبيانا', sub: 'كود 13 رقماً', icon: 'fa-solid fa-sim-card', color: 'amber' }
];

function getAvailablePaymentMethods() {
    if (!state.cart || state.cart.length === 0) return ALL_PAYMENT_METHODS;
    return ALL_PAYMENT_METHODS.filter(m => {
        return state.cart.every(item => {
            const p = (typeof FraudGuard !== 'undefined' && FraudGuard.getProductPrice)
                ? FraudGuard.getProductPrice(item, APP_DATA, m.id)
                : item.priceLYD;
            return p !== null && p > 0;
        });
    });
}

function renderPaymentOptions() {
    const grid = document.getElementById('payment-options-grid');
    if (!grid) return;

    const available = getAvailablePaymentMethods();
    if (available.length > 0 && !available.some(m => m.id === state.paymentMethod)) {
        state.paymentMethod = available[0].id;
    }

    grid.innerHTML = available.map(m => {
        const isSelected = state.paymentMethod === m.id;
        const mTotal = state.cart.reduce((sum, item) => {
            const p = (typeof FraudGuard !== 'undefined' && FraudGuard.getProductPrice)
                ? (FraudGuard.getProductPrice(item, APP_DATA, m.id) || item.priceLYD)
                : item.priceLYD;
            return sum + p * item.quantity;
        }, 0);

        const activeClasses = isSelected
            ? 'border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-400 font-black shadow-md'
            : 'border-slate-200 bg-white/70 hover:bg-slate-50 font-bold';

        return '<div onclick="selectPaymentMethod(\'' + m.id + '\')" data-method="' + m.id + '" class="payment-option-card cursor-pointer ' + activeClasses + ' p-3 rounded-2xl text-center flex sm:flex-col items-center justify-between sm:justify-center gap-2 border transition-all">' +
            '<div class="flex sm:flex-col items-center gap-2">' +
                '<i class="' + m.icon + ' text-2xl text-' + m.color + '-600"></i>' +
                '<div class="text-right sm:text-center">' +
                    '<span class="text-xs font-black text-slate-800 block">' + m.nameAr + '</span>' +
                    '<span class="text-[10px] text-slate-500 block">' + m.sub + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="text-left sm:text-center mt-0 sm:mt-1">' +
                '<span class="text-xs font-mono font-black text-emerald-700 bg-white/90 px-2 py-0.5 rounded-lg border border-slate-200 block shadow-inner">' + formatPrice(mTotal) + '</span>' +
            '</div>' +
        '</div>';
    }).join('');
}

function renderOrderSummary() {
    const summaryBox = document.getElementById('checkout-order-summary-box');
    if (!summaryBox) return;

    if (state.cart.length === 0) {
        summaryBox.innerHTML = '';
        return;
    }

    const curMethodObj = ALL_PAYMENT_METHODS.find(m => m.id === state.paymentMethod) || { nameAr: state.paymentMethod };

    summaryBox.innerHTML = state.cart.map(item => {
        const itemPrice = (typeof FraudGuard !== 'undefined' && FraudGuard.getProductPrice)
            ? (FraudGuard.getProductPrice(item, APP_DATA, state.paymentMethod) || item.priceLYD)
            : item.priceLYD;
        const itemTotal = itemPrice * item.quantity;

        return '<div class="p-3 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-1.5 text-xs shadow-sm">' +
            '<div class="flex justify-between items-center">' +
                '<span class="text-slate-500 font-bold">المنتج:</span>' +
                '<span class="font-black text-slate-900">' + escapeHtml(item.titleAr) + '</span>' +
            '</div>' +
            '<div class="flex justify-between items-center">' +
                '<span class="text-slate-500 font-bold">طريقة الدفع:</span>' +
                '<span class="font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 text-[11px]">' + curMethodObj.nameAr + '</span>' +
            '</div>' +
            '<div class="flex justify-between items-center text-slate-600">' +
                '<span>السعر:</span>' +
                '<span class="font-mono font-bold text-slate-800">' + formatPrice(itemPrice) + '</span>' +
            '</div>' +
            '<div class="flex justify-between items-center text-slate-600">' +
                '<span>الكمية:</span>' +
                '<span class="font-mono font-bold text-slate-800">' + item.quantity + '</span>' +
            '</div>' +
            '<div class="flex justify-between items-center pt-1.5 border-t border-slate-200">' +
                '<span class="font-black text-slate-900">الإجمالي:</span>' +
                '<span class="font-mono font-black text-emerald-700 text-sm">' + formatPrice(itemTotal) + '</span>' +
            '</div>' +
        '</div>';
    }).join('');
}

// Render Checkout Page
function renderCheckout() {
    const itemsContainer = document.getElementById('checkout-items-list');
    const emptyState = document.getElementById('checkout-empty-state');
    const orderForm = document.getElementById('checkout-form-container');

    if (!itemsContainer) return;
    if (!state.checkoutOpenedAt) state.checkoutOpenedAt = Date.now();

    const available = getAvailablePaymentMethods();
    if (available.length > 0 && !available.some(m => m.id === state.paymentMethod)) {
        state.paymentMethod = available[0].id;
    }

    sanitizeStoredCart(state.paymentMethod);

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
                    '<h4 class="font-extrabold text-slate-900 text-xs sm:text-sm">' + escapeHtml(item.titleAr) + '</h4>' +
                    '<p class="text-[11px] text-slate-500">' + escapeHtml(item.meta) + '</p>' +
                '</div>' +
            '</div>' +
            '<div class="flex items-center gap-2.5">' +
                '<div class="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden text-xs">' +
                    '<button onclick="updateCartQuantity(\'' + escapeAttr(item.cartItemId) + '\', -1)" class="px-2 py-1 hover:bg-slate-100 text-slate-600 font-bold">-</button>' +
                    '<span class="px-2 py-1 font-bold text-slate-800">' + item.quantity + '</span>' +
                    '<button onclick="updateCartQuantity(\'' + escapeAttr(item.cartItemId) + '\', 1)" class="px-2 py-1 hover:bg-slate-100 text-slate-600 font-bold">+</button>' +
                '</div>' +
                '<div class="text-right">' +
                    '<span class="font-bold text-emerald-700 text-xs sm:text-sm block">' + formatPrice(itemTotalLYD) + '</span>' +
                '</div>' +
                '<button onclick="removeFromCart(\'' + escapeAttr(item.cartItemId) + '\')" class="text-rose-500 hover:text-rose-700 text-xs p-1">' +
                    '<i class="fa-solid fa-trash-can"></i>' +
                '</button>' +
            '</div>' +
        '</div>';
    }).join('');

    const subtotalEl = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotalLYD);
    if (totalEl) totalEl.textContent = formatPrice(subtotalLYD);

    renderPaymentOptions();
    renderOrderSummary();
    renderPaymentInstructions();
    updatePaymentInputContainers();
}

// Select Payment Method & Update Prices Dynamically
function selectPaymentMethod(method) {
    state.paymentMethod = method;
    sanitizeStoredCart(method);
    renderCheckout();
}

function updatePaymentInputContainers() {
    const method = state.paymentMethod || 'lypay';
    const voucherContainer = document.getElementById('voucher-card-field-container');
    const voucherInput = document.getElementById('voucher-card-input');
    const bankTransferContainer = document.getElementById('bank-transfer-field-container');
    const bankTransferLabel = document.getElementById('bank-transfer-label-text');
    const bankTransferInput = document.getElementById('bank-transfer-ref-input');
    const bankTransferHint = document.getElementById('bank-transfer-hint-text');

    if (method === 'telecom_libyana') {
        if (voucherContainer) voucherContainer.classList.remove('hidden');
        if (bankTransferContainer) bankTransferContainer.classList.add('hidden');
        if (voucherInput) handleVoucherCardInput(voucherInput);
    } else {
        if (voucherContainer) voucherContainer.classList.add('hidden');
        if (bankTransferContainer) bankTransferContainer.classList.remove('hidden');
        if (method === 'lypay') {
            if (bankTransferLabel) bankTransferLabel.innerHTML = '<i class="fa-solid fa-receipt text-sky-700 text-sm"></i> <span>رقم الهاتف المحول منه أو رقم العملية (رصيد ليبيانا):</span>';
            if (bankTransferInput) bankTransferInput.placeholder = 'مثال: 092XXXXXXX أو رقم رسالة التحويل';
            if (bankTransferHint) bankTransferHint.textContent = 'قم بالتحويل عبر الكود المباشر أعلاه لرقم المتجر 0920541749، واكتب رقم هاتفك أو الإشعار لتأكيد الشحن فوراً.';
        } else if (method === 'bank_transfer') {
            if (bankTransferLabel) bankTransferLabel.innerHTML = '<i class="fa-solid fa-building-columns text-blue-700 text-sm"></i> <span>اسم المحوّل / رقم الحساب / إشعار التحويل (مصرف التجارة والتنمية):</span>';
            if (bankTransferInput) bankTransferInput.placeholder = 'مثال: اسمك في المصرف أو رقم الحساب أو كود الإشعار';
            if (bankTransferHint) bankTransferHint.textContent = 'تم التحويل لحساب المتجر 0041609456001 (عطيه موسى عطيه مفتاح). اكتب بياناتك لتأكيد الشحن.';
        } else if (method === 'onepay') {
            if (bankTransferLabel) bankTransferLabel.innerHTML = '<i class="fa-solid fa-money-bill-transfer text-emerald-700 text-sm"></i> <span>رقم حساب/هاتف أو كود العملية (OnePay):</span>';
            if (bankTransferInput) bankTransferInput.placeholder = 'مثال: رقم حسابك في ون باي أو كود الإشعار';
            if (bankTransferHint) bankTransferHint.textContent = 'قم بالتحويل عبر تطبيق OnePay لحساب المتجر 0920541749، واكتب رقم هاتفك أو الإشعار لتأكيد الشحن فوراً.';
        }
    }
}

// 13-Digit Scratch Card Code Live Input Handler & Strict Rule
function handleVoucherCardInput(inputEl) {
    if (!inputEl) return;
    
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

    const method = state.paymentMethod || 'lypay';
    const totalLYD = (typeof FraudGuard !== 'undefined' && FraudGuard.cartTotal)
        ? FraudGuard.cartTotal(state.cart)
        : state.cart.reduce((s, i) => s + i.priceLYD * i.quantity, 0);

    if (method === 'lypay') {
        const amountThousands = Math.round(totalLYD * 1000);
        const ussdCode = '*122*920541749*' + amountThousands + '#';
        const dialUrl = 'tel:*122*920541749*' + amountThousands + '%23';

        box.innerHTML = '<div class="space-y-3">' +
            '<div class="flex items-center justify-between border-b border-sky-200 pb-2">' +
                '<div class="flex items-center gap-2.5">' +
                    '<div class="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center text-xl shadow-md flex-shrink-0">' +
                        '<i class="fa-solid fa-mobile-screen-button"></i>' +
                    '</div>' +
                    '<div>' +
                        '<h4 class="font-black text-sky-950 text-sm">رصيد ليبيانا (LibyanaLY)</h4>' +
                        '<p class="text-xs text-sky-800 font-bold">تحويل رصيد مباشر فوري</p>' +
                    '</div>' +
                '</div>' +
                '<div class="text-left">' +
                    '<span class="text-[10px] text-sky-700 font-bold block">المبلغ المطلوب تحويله:</span>' +
                    '<span class="text-base font-black font-mono text-sky-950">' + formatPrice(totalLYD) + '</span>' +
                '</div>' +
            '</div>' +

            '<div class="p-3 bg-white/95 rounded-2xl border-2 border-sky-300 space-y-2">' +
                '<div class="flex items-center justify-between">' +
                    '<span class="text-xs font-black text-sky-950 flex items-center gap-1.5">' +
                        '<i class="fa-solid fa-bolt text-amber-500"></i>' +
                        '<span>كود تحويل الرصيد المباشر (جاهز لمبلغ ' + formatPrice(totalLYD) + '):</span>' +
                    '</span>' +
                    '<span class="text-[10px] font-mono font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">' +
                        'القيمة: ' + amountThousands +
                    '</span>' +
                '</div>' +
                '<div class="flex flex-col sm:flex-row items-center gap-2">' +
                    '<code class="flex-1 w-full text-center py-2.5 px-3 rounded-xl bg-slate-900 text-emerald-400 font-mono font-black text-base tracking-wider dir-ltr select-all">' +
                        ussdCode +
                    '</code>' +
                    '<div class="flex items-center gap-2 w-full sm:w-auto">' +
                        '<button type="button" onclick="copyToClipboard(\'' + ussdCode + '\', \'كود تحويل الرصيد\')" class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5">' +
                            '<i class="fa-solid fa-copy"></i>' +
                            '<span>نسخ الكود</span>' +
                        '</button>' +
                        '<a href="' + dialUrl + '" class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5">' +
                            '<i class="fa-solid fa-phone"></i>' +
                            '<span>اتصال فوري</span>' +
                        '</a>' +
                    '</div>' +
                '</div>' +
                '<p class="text-[11px] text-slate-600 font-medium pt-0.5">' +
                    '* اضغط «اتصال فوري» أو انسخ الكود ونفّذه من هاتفك لتحويل الرصيد مباشرة لحساب المتجر <strong>0920541749</strong>.' +
                '</p>' +
            '</div>' +
        '</div>';
    } else if (method === 'bank_transfer') {
        box.innerHTML = '<div class="space-y-3">' +
            '<div class="flex items-center justify-between border-b border-blue-200 pb-2">' +
                '<div class="flex items-center gap-2.5">' +
                    '<div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md flex-shrink-0">' +
                        '<i class="fa-solid fa-building-columns"></i>' +
                    '</div>' +
                    '<div>' +
                        '<h4 class="font-black text-blue-950 text-sm">التحويل المصرفي</h4>' +
                        '<p class="text-xs text-blue-800 font-bold">مصرف التجارة والتنمية</p>' +
                    '</div>' +
                '</div>' +
                '<div class="text-left">' +
                    '<span class="text-[10px] text-blue-700 font-bold block">المبلغ المطلوب تحويله:</span>' +
                    '<span class="text-base font-black font-mono text-blue-950">' + formatPrice(totalLYD) + '</span>' +
                '</div>' +
            '</div>' +

            '<div class="p-2.5 rounded-xl bg-blue-100 text-blue-950 font-bold text-xs flex items-center justify-between border border-blue-300">' +
                '<span class="flex items-center gap-1.5">' +
                    '<i class="fa-solid fa-circle-exclamation text-blue-700"></i>' +
                    '<span>المبلغ المطلوب تحويله مصرفياً:</span>' +
                '</span>' +
                '<span class="font-mono font-black text-base text-blue-900">' + formatPrice(totalLYD) + '</span>' +
            '</div>' +

            '<div class="p-3 bg-white/95 rounded-2xl border-2 border-blue-200 space-y-2 text-xs">' +
                '<div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">' +
                    '<div>' +
                        '<span class="text-[10px] text-slate-500 block">المصرف:</span>' +
                        '<span class="font-black text-slate-900">مصرف التجارة والتنمية</span>' +
                    '</div>' +
                    '<span class="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">حساب رسمي</span>' +
                '</div>' +
                '<div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">' +
                    '<div>' +
                        '<span class="text-[10px] text-slate-500 block">اسم المستفيد:</span>' +
                        '<span class="font-black text-slate-900">عطيه موسى عطيه مفتاح</span>' +
                    '</div>' +
                    '<button type="button" onclick="copyToClipboard(\'عطيه موسى عطيه مفتاح\', \'اسم المستفيد\')" class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition flex items-center gap-1">' +
                        '<i class="fa-solid fa-copy"></i> <span>نسخ</span>' +
                    '</button>' +
                '</div>' +
                '<div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">' +
                    '<div>' +
                        '<span class="text-[10px] text-slate-500 block">رقم الحساب:</span>' +
                        '<span class="font-mono font-black text-slate-900 dir-ltr text-sm">0041609456001</span>' +
                    '</div>' +
                    '<button type="button" onclick="copyToClipboard(\'0041609456001\', \'رقم الحساب\')" class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition flex items-center gap-1">' +
                        '<i class="fa-solid fa-copy"></i> <span>نسخ</span>' +
                    '</button>' +
                '</div>' +
                '<div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">' +
                    '<div class="min-w-0 pr-1">' +
                        '<span class="text-[10px] text-slate-500 block">IBAN الدولي:</span>' +
                        '<span class="font-mono font-black text-slate-900 dir-ltr text-[11px] truncate block select-all">LY65010041000041609456001</span>' +
                    '</div>' +
                    '<button type="button" onclick="copyToClipboard(\'LY65010041000041609456001\', \'رمز IBAN\')" class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition flex items-center gap-1 flex-shrink-0">' +
                        '<i class="fa-solid fa-copy"></i> <span>نسخ</span>' +
                    '</button>' +
                '</div>' +
                '<p class="text-[11px] text-slate-600 font-medium pt-1">' +
                    '* بعد إتمام التحويل، اكتب اسمك في المصرف أو رقم الإشعار في الخانة بالأسفل لتأكيد الشحن فوراً.' +
                '</p>' +
            '</div>' +
        '</div>';
    } else if (method === 'onepay') {
        box.innerHTML = '<div class="space-y-3">' +
            '<div class="flex items-center justify-between border-b border-emerald-200 pb-2">' +
                '<div class="flex items-center gap-2.5">' +
                    '<div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md flex-shrink-0">' +
                        '<i class="fa-solid fa-money-bill-transfer"></i>' +
                    '</div>' +
                    '<div>' +
                        '<h4 class="font-black text-emerald-950 text-sm">OnePay (وان باي)</h4>' +
                        '<p class="text-xs text-emerald-800 font-bold">دفع إلكتروني فوري</p>' +
                    '</div>' +
                '</div>' +
                '<div class="text-left">' +
                    '<span class="text-[10px] text-emerald-700 font-bold block">المبلغ المطلوب دفعه عبر OnePay:</span>' +
                    '<span class="text-base font-black font-mono text-emerald-950">' + formatPrice(totalLYD) + '</span>' +
                '</div>' +
            '</div>' +

            '<div class="p-3 bg-white/95 rounded-2xl border-2 border-emerald-300 space-y-2">' +
                '<div class="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200">' +
                    '<div>' +
                        '<span class="text-[10px] text-slate-600 block">رقم حساب المتجر في OnePay:</span>' +
                        '<span class="font-mono font-black text-slate-900 text-base dir-ltr">0920541749</span>' +
                    '</div>' +
                    '<button type="button" onclick="copyToClipboard(\'0920541749\', \'رقم حساب OnePay\')" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1">' +
                        '<i class="fa-solid fa-copy"></i> <span>نسخ الحساب</span>' +
                    '</button>' +
                '</div>' +
                '<p class="text-[11px] text-slate-600 font-medium">' +
                    '* حوّل المبلغ المطلوب (' + formatPrice(totalLYD) + ') لحساب المتجر أعلاه، ثم اكتب رقم الإشعار بالأسفل لتأكيد الشحن فوراً.' +
                '</p>' +
            '</div>' +
        '</div>';
    } else if (method === 'telecom_libyana') {
        box.innerHTML = '<div class="space-y-3">' +
            '<div class="flex items-center justify-between border-b border-amber-200 pb-2">' +
                '<div class="flex items-center gap-2.5">' +
                    '<div class="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xl shadow-md flex-shrink-0">' +
                        '<i class="fa-solid fa-sim-card"></i>' +
                    '</div>' +
                    '<div>' +
                        '<h4 class="font-black text-amber-950 text-sm">كروت شحن ليبيانا</h4>' +
                        '<p class="text-xs text-amber-800 font-bold">كرت تعبئة 13 رقماً</p>' +
                    '</div>' +
                '</div>' +
                '<div class="text-left">' +
                    '<span class="text-[10px] text-amber-700 font-bold block">المبلغ المطلوب بكروت الشحن:</span>' +
                    '<span class="text-base font-black font-mono text-amber-950">' + formatPrice(totalLYD) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="p-3 bg-white/95 rounded-2xl border-2 border-amber-200 text-xs text-slate-700">' +
                '<p class="font-medium">' +
                    '* اشترِ كرت تعبئة ليبيانا بقيمة طلبك (' + formatPrice(totalLYD) + ')، ثم أدخل كود الكرت المكون من 13 رقماً في الخانة بالأسفل.' +
                '</p>' +
            '</div>' +
        '</div>';
    }
}

const PAYMENT_METHOD_NAMES = {
    'lypay': 'رصيد ليبيانا (LibyanaLY)',
    'bank_transfer': 'تحويل مصرفي (مصرف التجارة والتنمية)',
    'onepay': 'OnePay (دفع إلكتروني فوري)',
    'telecom_libyana': 'كروت شحن ليبيانا (13 رقم)'
};

function orderDateParts(date) {
    const d = date instanceof Date ? date : new Date();
    const pad = n => String(n).padStart(2, '0');
    return {
        date: pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(),
        time: pad(d.getHours()) + ':' + pad(d.getMinutes())
    };
}

function buildOrderWhatsAppUrl(order, extra) {
    const parts = orderDateParts();
    const items = order.items || [];
    const itemsText = items.length === 1
        ? 'المنتج: ' + (items[0].titleAr || items[0].productName || 'منتج') + '\n' +
          'الكمية: ' + (items[0].quantity || 1)
        : 'المنتجات:\n' + items.map(item => '- ' + (item.titleAr || item.productName || 'منتج') + ' | الكمية: ' + (item.quantity || 1)).join('\n');

    const waMessage =
'طلب جديد | سحّابتي ☁️\n' +
(extra.customerName ? 'العميل: ' + extra.customerName + '\n' : '') +
'الهاتف: ' + (order.customerPhone || extra.customerPhone || '') + '\n' +
itemsText + '\n' +
'التاريخ: ' + parts.date + '\n' +
'الوقت: ' + parts.time;

    const cleanPhone = (APP_DATA.settings?.whatsappNumber || '218920541749').replace(/[^0-9]/g, '');
    return 'https://api.whatsapp.com/send?phone=' + cleanPhone + '&text=' + encodeURIComponent(waMessage);
}

// Server-side order: prices, product names and code reservation are decided by the server
function submitOrderToServer(input) {
    const customer = getActiveCustomer();
    // نفتح النافذة الآن (مع ضغطة الزر) حتى لا يحجبها المتصفح، ثم نوجهها لواتساب بعد الحفظ
    let waWindow = null;
    try { waWindow = window.open('', '_blank'); } catch (e) {}
    const payload = {
        items: input.cartItems.map(i => ({
            type: i.type, gameId: i.gameId, packageId: i.packageId, cardId: i.cardId, quantity: i.quantity,
            playerId: ''
        })),
        phone: input.customerPhone,
        name: input.customerName,
        userId: customer ? customer.id : null,
        notes: input.customerNotes,
        paymentMethod: input.method,
        cardCode13: input.cardCode13,
        transferRef: input.transferRef,
        website: input.honeypot
    };
    return apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) }).then(order => {
        order.userId = customer ? customer.id : (order.userId || 'guest');
        order.waUrl = buildOrderWhatsAppUrl(order, input);
        if (waWindow) { try { waWindow.location.href = order.waUrl; } catch (e) {} }

        state.orders.unshift(order);
        saveLocalOrders();
        FraudGuard.recordOrder();
        if (input.cardCode13) { FraudGuard.markVoucherUsed(input.cardCode13); FraudGuard.clearVoucherFailures(); }

        state.cart = [];
        state.checkoutOpenedAt = 0;
        saveCart();
        updateCartUI();
        if (input.voucherInput) { input.voucherInput.value = ''; handleVoucherCardInput(input.voucherInput); }
        const bankInput = document.getElementById('bank-transfer-ref-input');
        if (bankInput) bankInput.value = '';
        showSuccessModal(order);
        return true;
    }).catch(err => {
        if (waWindow) { try { waWindow.close(); } catch (e) {} }
        if (input.cardCode13 && err.status === 400) FraudGuard.recordVoucherFailure();
        showToast(err.status === 400 || err.status === 429 ? err.message : 'تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مجدداً', 'fa-triangle-exclamation');
        if (err.status === 400) connectToServer(); // ربما تغيّرت الأسعار: نحدّث الكتالوج
        return false;
    });
}

// Complete Payment Execution & WhatsApp Redirect (with fraud guards)
function checkoutFail(message, focusId) {
    showToast(message, 'fa-triangle-exclamation');
    const el = focusId && document.getElementById(focusId);
    if (el) {
        el.classList.add('border-rose-500', 'ring-2', 'ring-rose-400');
        try { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    }
    return false;
}

function processPayment() {
    if (state.cart.length === 0) {
        showToast('سلة المشتريات فارغة!', 'fa-cart-shopping');
        return false;
    }
    const btn = document.getElementById('complete-payment-btn');
    if (btn && btn.disabled) return false; // منع الضغط المزدوج

    // 1) Honeypot + speed check (bots)
    const honeypot = document.getElementById('checkout-website-field');
    if (honeypot && honeypot.value) return false;
    if (state.checkoutOpenedAt && Date.now() - state.checkoutOpenedAt < FraudGuard.LIMITS.minFormFillMs) {
        return checkoutFail('يرجى مراجعة طلبك قبل الإرسال');
    }

    // 2) Rate limit
    const rateProblem = FraudGuard.rateLimitProblem();
    if (rateProblem) return checkoutFail(rateProblem);

    // 3) Re-price cart from the catalog and enforce limits
    if (sanitizeStoredCart()) {
        renderCheckout();
        return checkoutFail('تم تحديث السلة حسب الأسعار الرسمية، يرجى المراجعة ثم التأكيد مجدداً');
    }
    const cartItems = state.cart.map(i => Object.assign({}, i));
    const totalLYD = FraudGuard.cartTotal(cartItems);
    const maxOrder = Number(APP_DATA.settings?.maxOrderLYD) || FraudGuard.LIMITS.maxOrderLYD;
    if (totalLYD > maxOrder) {
        return checkoutFail('الحد الأقصى للطلب الواحد ' + formatPrice(maxOrder) + '. للطلبات الأكبر تواصل معنا عبر واتساب');
    }

    // 4) Libyan phone number (required)
    const phoneInput = document.getElementById('whatsapp-phone-input');
    const customerPhone = FraudGuard.normalizeLibyanPhone(phoneInput ? phoneInput.value : '');
    if (!customerPhone) {
        return checkoutFail('أدخل رقم هاتف ليبي صحيح (مثال: 0912345678)', 'whatsapp-phone-input');
    }
    if (phoneInput) phoneInput.value = customerPhone;

    // 5) Payment Method & Verification
    const method = state.paymentMethod || 'telecom_libyana';
    const voucherInput = document.getElementById('voucher-card-input');
    const bankTransferInput = document.getElementById('bank-transfer-ref-input');
    const cleanCardDigits = (voucherInput ? voucherInput.value : '').replace(/[^0-9]/g, '');
    const transferRef = FraudGuard.cleanText(bankTransferInput ? bankTransferInput.value : '', 80);

    if (method === 'telecom_libyana') {
        const lockMs = FraudGuard.voucherLockRemainingMs();
        if (lockMs > 0) {
            return checkoutFail('تم إيقاف إدخال الكروت مؤقتاً بسبب محاولات خاطئة متكررة. حاول بعد ' + Math.ceil(lockMs / 60000) + ' دقيقة');
        }
        const cardProblem = FraudGuard.voucherProblem(cleanCardDigits);
        if (cardProblem) {
            FraudGuard.recordVoucherFailure();
            if (voucherInput) handleVoucherCardInput(voucherInput);
            return checkoutFail('⚠️ ' + cardProblem, 'voucher-card-input');
        }
    }

    const customerNotes = FraudGuard.cleanText(document.getElementById('whatsapp-note-input')?.value, 200) || 'طلب عبر متجر سحّابتي';
    const customer = getActiveCustomer();
    const customerName = FraudGuard.cleanText(document.getElementById('customer-name-input')?.value, 60) || (customer ? customer.name : '');

    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-lg"></i> <span>جاري تسجيل الطلب...</span>';
    }
    const restoreButton = () => { if (btn) { btn.disabled = false; btn.innerHTML = originalText; } };

    if (state.serverMode) {
        return submitOrderToServer({
            cartItems: cartItems, method: method, customerPhone: customerPhone, customerName: customerName,
            customerNotes: customerNotes, cardCode13: method === 'telecom_libyana' ? cleanCardDigits : '',
            transferRef: transferRef, honeypot: honeypot ? honeypot.value : '', voucherInput: voucherInput
        }).finally(restoreButton);
    }

    try {
        const orderId = FraudGuard.secureOrderId();
        const orderDate = new Date().toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' });
        const totalAmountText = formatPrice(totalLYD);
        const cardCode13 = method === 'telecom_libyana' ? cleanCardDigits : '';

        let newOrder;
        if (typeof SahabatiDB !== 'undefined' && SahabatiDB.createOrder) {
            newOrder = SahabatiDB.createOrder({
                id: orderId,
                date: orderDate,
                items: cartItems,
                paymentMethod: method,
                userId: customer ? customer.id : null,
                customerName: customerName || undefined,
                customerPhone: customerPhone,
                cardCode13: cardCode13,
                transferRef: transferRef,
                customerNotes: customerNotes,
                totalFormatted: totalAmountText
            });
        } else {
            newOrder = {
                id: orderId, userId: customer ? customer.id : 'guest', date: orderDate, items: cartItems, vouchers: [],
                paymentMethod: method, customerPhone: customerPhone, cardCode13: cardCode13,
                transferRef: transferRef, customerNotes: customerNotes, totalFormatted: totalAmountText, status: 'pending_payment'
            };
        }

        const waUrl = buildOrderWhatsAppUrl(newOrder, { cardCode13: cardCode13, transferRef: transferRef, customerName: customerName, customerNotes: customerNotes });
        newOrder.waUrl = waUrl;

        // يُفتح بشكل متزامن مع الضغطة حتى لا يحجبه المتصفح
        window.open(waUrl, '_blank', 'noopener');

        state.orders.unshift(newOrder);
        saveLocalOrders();

        FraudGuard.recordOrder();
        if (cardCode13) { FraudGuard.markVoucherUsed(cardCode13); FraudGuard.clearVoucherFailures(); }

        state.cart = [];
        state.checkoutOpenedAt = 0;
        saveCart();
        updateCartUI();
        if (voucherInput) { voucherInput.value = ''; handleVoucherCardInput(voucherInput); }

        showSuccessModal(newOrder);
        return true;
    } catch (err) {
        showToast('تعذر تسجيل الطلب: ' + (err && err.message ? err.message : 'خطأ غير متوقع'), 'fa-triangle-exclamation');
        return false;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

function showSuccessModal(order) {
    const modal = document.getElementById('order-success-modal');
    const body = document.getElementById('success-modal-body');
    if (!modal || !body) return;

    const isPaid = order.status === 'paid' || order.paymentConfirmed === true;

    let cardBanner = '';
    if (order.paymentMethod === 'telecom_libyana' && order.cardCode13) {
        cardBanner = '<div class="p-2.5 rounded-xl bg-amber-100 text-amber-950 text-xs font-bold mb-3 font-mono flex items-center justify-between border border-amber-300">' +
            '<span>🎟️ كود كارت التعبئة (13 رقم):</span>' +
            '<span class="font-black text-amber-900 tracking-wider">' + escapeHtml(order.cardCode13) + '</span>' +
        '</div>';
    } else if (order.paymentMethod === 'lypay') {
        cardBanner = '<div class="p-3 rounded-2xl bg-sky-50 border border-sky-300 text-sky-950 text-xs mb-3 space-y-1 text-right">' +
            '<div class="flex items-center justify-between font-bold">' +
                '<span>🏦 وسيلة الدفع: LibyanaLY (دفع إلكتروني فوري)</span>' +
                '<span class="font-mono text-sky-800 font-black">0920541749</span>' +
            '</div>' +
            (order.transferRef ? '<div class="text-[11px] text-sky-800 font-medium">🔖 رقم العملية / الحساب المحول منه: <strong class="font-mono font-bold">' + escapeHtml(order.transferRef) + '</strong></div>' : '') +
            '<div class="text-[10px] text-sky-700">سيتم تفعيل طلبك فور مطابقة إشعار التحويل الإلكتروني.</div>' +
        '</div>';
    } else if (order.paymentMethod === 'onepay') {
        cardBanner = '<div class="p-3 rounded-2xl bg-teal-50 border border-teal-300 text-teal-950 text-xs mb-3 space-y-1 text-right">' +
            '<div class="flex items-center justify-between font-bold">' +
                '<span>🏦 وسيلة الدفع: OnePay (دفع إلكتروني فوري)</span>' +
                '<span class="font-mono text-teal-800 font-black">0920541749</span>' +
            '</div>' +
            (order.transferRef ? '<div class="text-[11px] text-teal-800 font-medium">🔖 رقم العملية / الحساب المحول منه: <strong class="font-mono font-bold">' + escapeHtml(order.transferRef) + '</strong></div>' : '') +
            '<div class="text-[10px] text-teal-700">سيتم تفعيل طلبك فور مطابقة إشعار التحويل الإلكتروني.</div>' +
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

function copyToClipboard(text, label) {
    const showSuccess = () => showToast(label ? ('تم نسخ ' + label) : ('تم النسخ بنجاح: ' + text), 'fa-clipboard-check');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showSuccess).catch(() => {
            fallbackCopy(text, showSuccess);
        });
    } else {
        fallbackCopy(text, showSuccess);
    }
}
function fallbackCopy(text, cb) {
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        if (cb) cb();
    } catch (e) {
        showToast('تعذر النسخ تلقائياً', 'fa-triangle-exclamation');
    }
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
            loadCartForActiveCustomer();
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
            loadCartForActiveCustomer();
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
    const phoneInput = document.getElementById('whatsapp-phone-input');
    const nameInput = document.getElementById('customer-name-input');
    if (phoneInput) phoneInput.value = '';
    if (nameInput) nameInput.value = '';
    loadCartForActiveCustomer();
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

    // Retrieve orders strictly isolated for this customer (zero leakage between accounts)
    let userOrders = getOrdersForCurrentViewer();
    if (state.serverMode) {
        refreshServerOrders();
    }

    // Retrieve digital codes owned by this customer (ONLY for confirmed/paid orders)
    let userCodes = [];
    userOrders.forEach(o => {
        const isPaid = o.status === 'paid' || o.paymentConfirmed === true;
        if (isPaid) {
            if (o.vouchers && Array.isArray(o.vouchers) && o.vouchers.length > 0) {
                o.vouchers.filter(v => v.accountPassword || v.voucherCode || o.accountDetails?.password).forEach(v => {
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
                const isMissing = order.status === 'missing';
                const isPending = !isPaid && !isCancelled && !isMissing;

                let statusBadge = '';
                if (isPaid) {
                    statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-sm">' +
                        '<i class="fa-solid fa-circle-check text-emerald-600"></i>' +
                        '<span>تم الدفع واكتمل الطلب ✓</span>' +
                    '</span>';
                } else if (isMissing) {
                    statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">' +
                        '<i class="fa-solid fa-circle-question text-slate-500"></i>' +
                        '<span>غير موجود لدى المتجر — تواصل معنا عبر واتساب برقم الطلب</span>' +
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
                                '<h4 class="font-black text-emerald-950 text-xs sm:text-sm">' + (password || username ? 'بيانات طلبك (في شاشتك الخاصة 👑)' : 'تم تنفيذ طلبك بنجاح ✅') + '</h4>' +
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
                                '<span class="text-[10px] font-extrabold text-emerald-700 block">' + (username ? 'كلمة السر (خاصة بك فقط 🔒):' : 'الكود (خاص بك فقط 🔒):') + '</span>' +
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

                let paymentBadge = '';
                if (order.paymentMethod === 'lypay') {
                    paymentBadge = '<span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300">🏦 LibyanaLY</span>';
                } else if (order.paymentMethod === 'onepay') {
                    paymentBadge = '<span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-300">🏦 OnePay</span>';
                } else {
                    paymentBadge = '<span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">🎟️ كارت ليبيانا</span>';
                }

                let paymentBox = '';
                if (order.paymentMethod === 'lypay') {
                    paymentBox = '<div class="p-2.5 bg-sky-50 rounded-xl text-sky-950 text-xs font-bold mb-2.5 border border-sky-200 flex items-center justify-between">' +
                        '<span>🏦 دفع إلكتروني فوري (LibyanaLY):</span><span class="font-mono text-sky-800 font-black">' + escapeHtml(order.transferRef || 'حساب 0920541749') + '</span></div>';
                } else if (order.paymentMethod === 'onepay') {
                    paymentBox = '<div class="p-2.5 bg-teal-50 rounded-xl text-teal-950 text-xs font-bold mb-2.5 border border-teal-200 flex items-center justify-between">' +
                        '<span>🏦 دفع إلكتروني فوري (OnePay):</span><span class="font-mono text-teal-800 font-black">' + escapeHtml(order.transferRef || 'حساب 0920541749') + '</span></div>';
                } else if (order.cardCode13) {
                    paymentBox = '<div class="p-2.5 bg-amber-50 rounded-xl text-amber-950 text-xs font-mono font-bold mb-2.5 border border-amber-200 flex items-center justify-between">' +
                        '<span>🎟️ كود كارت التعبئة (13 رقم):</span><span class="tracking-wider">' + escapeHtml(order.cardCode13) + '</span></div>';
                }

                return '<div class="glass-card rounded-3xl p-4 sm:p-5 border border-white/80 shadow-md transition hover:shadow-lg">' +
                    '<div class="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">' +
                        '<div>' +
                            '<div class="flex items-center gap-2">' +
                                '<span class="font-extrabold text-slate-900 text-xs sm:text-sm">#' + escapeHtml(order.id) + '</span>' +
                                paymentBadge +
                            '</div>' +
                            '<span class="text-[10px] text-slate-500 block mt-0.5">' + escapeHtml(order.date) + '</span>' +
                        '</div>' +
                        '<div>' + statusBadge + '</div>' +
                    '</div>' +
                    contentHtml +
                    paymentBox +
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
    if (state.serverMode) {
        refreshServerOrders(true).then(changed => {
            const order = state.orders.find(o => o.id === orderId);
            if (changed || !order) return;
            showToast('⏳ ما زال الطلب قيد مراجعة وتأكيد الدفع من الإدارة.', 'fa-clock');
        });
        return;
    }
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

    if (enteredPin && enteredPin === correctPin) {
        state.isAdminAuth = true;
        sessionStorage.setItem('sahabati_admin_auth', 'true');
        closeModal('admin-auth-modal');
        navigateTo('admin');
        showToast('مرحباً بك في لوحة تحكم سحّابتي 👑');
    } else {
        showToast('كلمة السر غير صحيحة', 'fa-lock');
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

    const matchedGames = APP_DATA.games.filter(g => isAvailable(g) && (g.nameAr.toLowerCase().includes(q) || String(g.nameEn || '').toLowerCase().includes(q)));
    const matchedCards = APP_DATA.giftCards.filter(c => isAvailable(c) && (c.nameAr.toLowerCase().includes(q) || String(c.brand || '').toLowerCase().includes(q)));

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
