// ==========================================
// Sahabati server-side store (مصدر الحقيقة على الخادم)
// يشغّل نفس منطق js/database.js و js/security.js داخل الخادم حتى لا يعتمد
// تسعير الطلبات وحجز الأكواد وكشفها على متصفح العميل.
// ==========================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '.data');
const FILES = {
    sahabati_database_v2: 'database.json',
    sahabati_catalog_data: 'catalog.json'
};
const ADMIN_SESSION_MS = 12 * 60 * 60 * 1000;

function writeAtomic(file, text) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = file + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, text, 'utf8');
    fs.renameSync(tmp, file);
}

// localStorage يُحفظ في ملفات .data/ للمفاتيح المهمة، والباقي في الذاكرة
function fileBackedStorage() {
    const mem = {};
    return {
        getItem(key) {
            if (FILES[key]) {
                try { return fs.readFileSync(path.join(DATA_DIR, FILES[key]), 'utf8'); } catch (e) { return null; }
            }
            return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null;
        },
        setItem(key, value) {
            if (FILES[key]) writeAtomic(path.join(DATA_DIR, FILES[key]), String(value));
            else mem[key] = String(value);
        },
        removeItem(key) {
            if (FILES[key]) { try { fs.unlinkSync(path.join(DATA_DIR, FILES[key])); } catch (e) {} }
            else delete mem[key];
        }
    };
}

// لوحة مفاتيح الهاتف العربية تكتب الأرقام هكذا ١٢٣ أو ۱۲۳: نحوّلها إلى 123 قبل المقارنة
function toLatinDigits(value) {
    return String(value || '')
        .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
        .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));
}

function cleanPin(value) {
    return toLatinDigits(value).trim().replace(/^(['"])(.*)\1$/, '$2').trim();
}

function createStore() {
    const context = vm.createContext({
        console, Date, Math, JSON, Uint32Array, TextEncoder,
        crypto: crypto.webcrypto,
        localStorage: fileBackedStorage(),
        sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }
    });
    context.window = context;
    context.globalThis = context;
    for (const file of ['data.js', 'database.js', 'security.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, 'js', file), 'utf8'), context, { filename: file });
    }
    const db = context.SahabatiDB;
    const guard = context.FraudGuard;
    const getCatalog = () => vm.runInContext('APP_DATA', context);

    // ---------- admin auth ----------
    // نتجاهل المسافات وعلامات الاقتباس التي قد تُنسخ بالخطأ مع القيمة في لوحة الاستضافة
    let adminPin = cleanPin(process.env.ADMIN_PIN);
    if (!adminPin) {
        adminPin = crypto.randomBytes(6).toString('base64url');
        console.warn('[sahabati] ADMIN_PIN غير مضبوط. كلمة سر مؤقتة للوحة الإدارة لهذا التشغيل فقط: ' + adminPin);
    } else {
        console.log('[sahabati] ADMIN_PIN مضبوط (' + adminPin.length + ' أحرف).');
    }
    const sessions = new Map();

    function adminLogin(pin) {
        const a = Buffer.from(cleanPin(pin));
        const b = Buffer.from(adminPin);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, Date.now() + ADMIN_SESSION_MS);
        return token;
    }

    function isAdmin(req) {
        const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers['authorization'] || '');
        if (!m) return false;
        const exp = sessions.get(m[1]);
        if (!exp || exp < Date.now()) { sessions.delete(m[1]); return false; }
        return true;
    }

    function adminLogout(req) {
        const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers['authorization'] || '');
        if (m) sessions.delete(m[1]);
    }

    // ---------- catalog ----------
    function publicCatalog() {
        const data = JSON.parse(JSON.stringify(getCatalog()));
        if (data.settings) delete data.settings.adminPin; // لا تُرسل كلمة السر للمتصفح أبداً
        return data;
    }

    function saveCatalog(data) {
        if (!data || !Array.isArray(data.games) || !Array.isArray(data.giftCards)) throw new Error('كتالوج غير صالح');
        if (data.settings) delete data.settings.adminPin;
        context.__incoming = JSON.stringify(data);
        vm.runInContext('APP_DATA = JSON.parse(__incoming); APP_DATA.settings = Object.assign({}, DEFAULT_STORE_SETTINGS, APP_DATA.settings || {}); saveAppData(APP_DATA);', context);
        delete context.__incoming;
    }

    // ---------- orders ----------
    const orderTimesByIp = new Map();
    function ipRateProblem(ip) {
        const now = Date.now();
        const L = guard.LIMITS;
        const times = (orderTimesByIp.get(ip) || []).filter(t => now - t < L.ordersWindowMs);
        orderTimesByIp.set(ip, times);
        if (orderTimesByIp.size > 10000) orderTimesByIp.clear();
        const last = times[times.length - 1];
        if (last && now - last < L.orderCooldownMs) return 'يرجى الانتظار قليلاً قبل إرسال طلب جديد';
        if (times.length >= L.maxOrdersPerWindow) return 'تجاوزت الحد المسموح من الطلبات، حاول لاحقاً أو تواصل معنا عبر واتساب';
        return null;
    }

    function createOrder(body, ip) {
        if (!body || typeof body !== 'object') return { status: 400, error: 'طلب غير صالح' };
        if (body.website) return { status: 400, error: 'طلب غير صالح' }; // honeypot

        const rate = ipRateProblem(ip);
        if (rate) return { status: 429, error: rate };

        const phone = guard.normalizeLibyanPhone(body.phone);
        if (!phone) return { status: 400, error: 'أدخل رقم هاتف ليبي صحيح (مثال: 0912345678)' };

        const catalog = getCatalog();
        const rawItems = Array.isArray(body.items) ? body.items.slice(0, guard.LIMITS.maxCartLines) : [];
        const items = rawItems.map(i => ({
            type: i && i.type === 'game' ? 'game' : 'giftcard',
            gameId: String(i && i.gameId || ''),
            packageId: String(i && i.packageId || ''),
            cardId: String(i && i.cardId || ''),
            playerId: String(i && i.playerId || '').replace(/\s/g, ''),
            quantity: i && i.quantity
        }));
        const { cart } = guard.sanitizeCart(items, catalog);
        if (!cart.length || cart.length !== items.length) return { status: 400, error: 'بعض المنتجات لم تعد متوفرة، حدّث الصفحة وحاول مجدداً' };

        // أسماء المنتجات ومعرّف اللاعب تُبنى على الخادم وليس من نص المتصفح
        for (const item of cart) {
            if (item.type === 'game') {
                const game = catalog.games.find(g => g.id === item.gameId);
                const pkg = game.packages.find(p => p.id === item.packageId);
                item.titleAr = game.nameAr.split('(')[0].trim() + ' - ' + pkg.nameAr;
                const method = game.deliveryMethod || 'id';
                if (method === 'qr') {
                    item.meta = 'الشحن عبر رمز QR';
                } else if (method === 'login') {
                    item.meta = 'الشحن عبر تسجيل الدخول';
                } else {
                    const idProblem = guard.playerIdProblem(item.playerId);
                    if (idProblem) return { status: 400, error: idProblem };
                    item.meta = 'Player ID: ' + item.playerId;
                }
            } else {
                const card = catalog.giftCards.find(c => c.id === item.cardId);
                item.titleAr = card.nameAr;
                item.meta = card.nominal || 'اشتراك وبطاقة رقمية';
            }
            delete item.playerId;
        }

        const total = guard.cartTotal(cart);
        const maxOrder = Number(catalog.settings && catalog.settings.maxOrderLYD) || guard.LIMITS.maxOrderLYD;
        if (total > maxOrder) return { status: 400, error: 'الحد الأقصى للطلب الواحد ' + maxOrder.toFixed(2) + ' د.ل' };

        const method = 'telecom_libyana'; // الدفع عبر ليبيانا فقط
        const card = String(body.cardCode13 || '').replace(/[^0-9]/g, '');
        const problem = guard.voucherProblem(card);
        if (problem) return { status: 400, error: problem };

        const order = db.createOrder({
            id: guard.secureOrderId(),
            date: new Date().toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Tripoli' }),
            items: cart,
            paymentMethod: method,
            customerName: guard.cleanText(body.name, 60) || 'عميل سحّابتي',
            customerPhone: phone,
            cardCode13: card.length === 13 ? card : '',
            customerNotes: guard.cleanText(body.notes, 200),
            totalFormatted: total.toFixed(2) + ' د.ل'
        });
        orderTimesByIp.get(ip).push(Date.now());
        return { status: 201, order: customerView(order) };
    }

    // ما يراه العميل: لا أكواد قبل الدفع، ولا بيانات داخلية
    function customerView(o) {
        const paid = o.status === 'paid' || o.paymentConfirmed === true;
        return {
            id: o.id,
            date: o.date,
            createdAt: o.createdAt,
            items: o.items,
            paymentMethod: o.paymentMethod,
            customerPhone: o.customerPhone,
            cardCode13: o.cardCode13 ? '•••••••••' + o.cardCode13.slice(-4) : '',
            totalFormatted: o.totalFormatted,
            status: o.status,
            paymentConfirmed: paid,
            cancelReason: o.cancelReason || '',
            vouchers: paid ? o.vouchers : (o.vouchers || []).map(v => ({ title: v.title, locked: true })),
            accountDetails: paid ? o.accountDetails : null,
            serverOrder: true
        };
    }

    const lookupsByIp = new Map();
    function orderStatus(body, ip) {
        const now = Date.now();
        const hits = (lookupsByIp.get(ip) || []).filter(t => now - t < 60000);
        hits.push(now);
        lookupsByIp.set(ip, hits);
        if (lookupsByIp.size > 10000) lookupsByIp.clear();
        if (hits.length > 30) return { status: 429, error: 'طلبات كثيرة، حاول بعد دقيقة' };
        const phone = guard.normalizeLibyanPhone(body && body.phone);
        const ids = Array.isArray(body && body.ids) ? body.ids.slice(0, 50).map(String) : [];
        if (!phone || !ids.length) return { status: 400, error: 'بيانات غير مكتملة' };
        const orders = db.getAllOrders().filter(o => ids.includes(o.id) && o.customerPhone === phone);
        return { status: 200, orders: orders.map(customerView) };
    }

    // ---------- admin database sync ----------
    function adminDatabase() {
        return db.db;
    }

    // اللوحة ترسل قاعدة البيانات كاملة؛ الطلبات الجديدة التي وصلت للخادم أثناء ذلك لا تُفقد
    function mergeAdminDatabase(incoming) {
        if (!incoming || !Array.isArray(incoming.orders) || !Array.isArray(incoming.users) || !Array.isArray(incoming.voucher_codes)) {
            throw new Error('missing collections');
        }
        const incomingIds = new Set(incoming.orders.map(o => o && o.id));
        const serverOnly = db.db.orders.filter(o => !incomingIds.has(o.id));
        const codeIds = new Set(incoming.voucher_codes.map(c => c && c.id));
        // أكواد حجزها الخادم لطلبات جديدة لا تعرفها اللوحة بعد
        const reservedElsewhere = db.db.voucher_codes.filter(c => !codeIds.has(c.id) && c.status !== 'available');
        const merged = Object.assign({}, incoming, {
            orders: serverOnly.concat(incoming.orders),
            voucher_codes: incoming.voucher_codes.map(c => {
                const current = db.db.voucher_codes.find(x => x.id === c.id);
                const heldByNewOrder = current && current.status !== 'available' && serverOnly.some(o => o.id === current.assignedOrderId);
                return heldByNewOrder ? current : c;
            }).concat(reservedElsewhere)
        });
        db.db = merged;
        db.saveDB();
    }

    return {
        adminLogin, adminLogout, isAdmin,
        publicCatalog, saveCatalog,
        createOrder, orderStatus,
        adminDatabase, mergeAdminDatabase,
        _db: db
    };
}

module.exports = { createStore };
