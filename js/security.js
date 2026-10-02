// ==========================================
// Sahabati Fraud Guard (قيود منع الغش والاحتيال)
// يعمل في المتصفح قبل إرسال الطلب. لا يغني عن التحقق اليدوي من الدفع في لوحة الإدارة،
// لكنه يمنع التلاعب الشائع: تعديل الأسعار في السلة، الطلبات المتكررة، الكروت المكررة أو الوهمية.
// ==========================================

(function (root) {
    'use strict';

    const LIMITS = {
        maxQtyPerItem: 5,          // أقصى كمية للمنتج الواحد في الطلب
        maxCartLines: 10,          // أقصى عدد منتجات مختلفة في السلة
        maxOrderLYD: 2000,         // أقصى قيمة للطلب الواحد
        orderCooldownMs: 60 * 1000,          // دقيقة بين كل طلبين
        maxOrdersPerWindow: 3,               // 3 طلبات كحد أقصى...
        ordersWindowMs: 15 * 60 * 1000,      // ...خلال 15 دقيقة
        maxVoucherFailures: 5,               // محاولات كرت خاطئة قبل القفل
        voucherLockMs: 15 * 60 * 1000,       // مدة القفل
        minFormFillMs: 3000                  // تعبئة النموذج أسرع من 3 ثوانٍ = روبوت
    };

    const KEYS = {
        orderTimes: 'sahabati_guard_order_times',
        voucherFails: 'sahabati_guard_voucher_fails',
        usedVouchers: 'sahabati_guard_used_vouchers'
    };

    function now() { return Date.now(); }

    function readJSON(key, fallback) {
        try {
            const raw = root.localStorage && root.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }
    function writeJSON(key, value) {
        try { root.localStorage && root.localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }

    // ---------- رقم الهاتف الليبي ----------
    // يقبل: 0912345678 / 912345678 / 218912345678 / +218912345678 ويعيد الصيغة 09XXXXXXXX
    function normalizeLibyanPhone(input) {
        const digits = String(input || '').replace(/[^0-9]/g, '');
        let local = digits;
        if (local.startsWith('00218')) local = local.slice(5);
        else if (local.startsWith('218')) local = local.slice(3);
        if (local.startsWith('0')) local = local.slice(1);
        // 91 / 92 / 94 / 95 = مدار وليبيانا وLTT
        if (!/^9[1-5]\d{7}$/.test(local)) return null;
        return '0' + local;
    }

    // ---------- كود كرت التعبئة ----------
    function voucherProblem(code) {
        const c = String(code || '');
        if (!/^\d{13}$/.test(c)) return 'يجب أن يتكون الكرت من 13 رقماً بالضبط';
        if (/^(\d)\1{12}$/.test(c)) return 'هذا الكود غير صالح (أرقام مكررة)';
        if ('01234567890123456789'.includes(c) || '98765432109876543210'.includes(c)) {
            return 'هذا الكود غير صالح (أرقام متسلسلة)';
        }
        if (isVoucherUsed(c)) return 'تم استخدام هذا الكرت في طلب سابق';
        return null;
    }

    function voucherFingerprint(code) {
        // لا نحفظ الكود نفسه في المتصفح - بصمة قصيرة فقط
        let h = 2166136261;
        const s = 'shb:' + code;
        for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
        return (h >>> 0).toString(36);
    }

    function isVoucherUsed(code) {
        const used = readJSON(KEYS.usedVouchers, []);
        if (used.includes(voucherFingerprint(code))) return true;
        try {
            if (root.SahabatiDB && typeof root.SahabatiDB.getAllOrders === 'function') {
                return root.SahabatiDB.getAllOrders().some(o => o && o.cardCode13 === code && o.status !== 'cancelled');
            }
        } catch (e) {}
        return false;
    }

    function markVoucherUsed(code) {
        const used = readJSON(KEYS.usedVouchers, []);
        used.push(voucherFingerprint(code));
        writeJSON(KEYS.usedVouchers, used.slice(-200));
    }

    function voucherLockRemainingMs() {
        const f = readJSON(KEYS.voucherFails, { count: 0, until: 0 });
        return f.until > now() ? f.until - now() : 0;
    }
    function recordVoucherFailure() {
        const f = readJSON(KEYS.voucherFails, { count: 0, until: 0 });
        f.count = (f.until && f.until <= now()) ? 1 : f.count + 1;
        f.until = 0;
        if (f.count >= LIMITS.maxVoucherFailures) { f.until = now() + LIMITS.voucherLockMs; f.count = 0; }
        writeJSON(KEYS.voucherFails, f);
    }
    function clearVoucherFailures() { writeJSON(KEYS.voucherFails, { count: 0, until: 0 }); }

    // ---------- معدل الطلبات ----------
    function rateLimitProblem() {
        const times = readJSON(KEYS.orderTimes, []).filter(t => now() - t < LIMITS.ordersWindowMs);
        const last = times[times.length - 1];
        if (last && now() - last < LIMITS.orderCooldownMs) {
            const sec = Math.ceil((LIMITS.orderCooldownMs - (now() - last)) / 1000);
            return 'يرجى الانتظار ' + sec + ' ثانية قبل إرسال طلب جديد';
        }
        if (times.length >= LIMITS.maxOrdersPerWindow) {
            const min = Math.ceil((LIMITS.ordersWindowMs - (now() - times[0])) / 60000);
            return 'تجاوزت الحد المسموح من الطلبات. حاول بعد ' + min + ' دقيقة أو تواصل معنا عبر واتساب';
        }
        return null;
    }
    function recordOrder() {
        const times = readJSON(KEYS.orderTimes, []).filter(t => now() - t < LIMITS.ordersWindowMs);
        times.push(now());
        writeJSON(KEYS.orderTimes, times);
    }

    // ---------- سلامة السلة والأسعار ----------
    // السلة محفوظة في localStorage ويمكن لأي شخص تعديل سعرها من المتصفح،
    // لذلك نعيد تسعير كل عنصر من الكتالوج الرسمي ونحذف أي عنصر غير معروف.
    function catalogPrice(item, data) {
        if (!item || !data) return null;
        // المنتجات التي أخفاها المدير لا تُباع
        if (item.type === 'game') {
            const game = (data.games || []).find(g => g.id === item.gameId);
            const pkg = game && !game.hidden && (game.packages || []).find(p => p.id === item.packageId);
            return pkg && !pkg.hidden ? Number(pkg.priceLYD) : null;
        }
        if (item.type === 'giftcard') {
            const card = (data.giftCards || []).find(c => c.id === item.cardId);
            return card && !card.hidden ? Number(card.priceLYD) : null;
        }
        return null;
    }

    function sanitizeCart(cart, data) {
        const clean = [];
        let changed = false;
        (Array.isArray(cart) ? cart : []).forEach(item => {
            const price = catalogPrice(item, data);
            if (price === null || !isFinite(price) || price <= 0) { changed = true; return; }
            let qty = Math.floor(Number(item.quantity));
            if (!isFinite(qty) || qty < 1) { changed = true; return; }
            if (qty > LIMITS.maxQtyPerItem) { qty = LIMITS.maxQtyPerItem; changed = true; }
            if (item.priceLYD !== price) changed = true;
            clean.push(Object.assign({}, item, { priceLYD: price, quantity: qty }));
        });
        if (clean.length > LIMITS.maxCartLines) { clean.length = LIMITS.maxCartLines; changed = true; }
        return { cart: clean, changed: changed };
    }

    function cartTotal(cart) {
        return (cart || []).reduce((sum, i) => sum + i.priceLYD * i.quantity, 0);
    }

    // ---------- معرّف اللاعب ----------
    function playerIdProblem(id) {
        const v = String(id || '').trim();
        if (!v) return 'يرجى إدخال معرّف اللاعب (ID) أولاً';
        if (!/^\d{5,15}$/.test(v)) return 'معرّف اللاعب يجب أن يكون أرقاماً فقط (من 5 إلى 15 رقماً)';
        if (/^(\d)\1+$/.test(v)) return 'معرّف اللاعب غير صالح';
        return null;
    }

    // ---------- معرّف طلب غير قابل للتخمين ----------
    function secureOrderId() {
        let n;
        try {
            const a = new Uint32Array(1);
            root.crypto.getRandomValues(a);
            n = a[0];
        } catch (e) { n = Math.floor(Math.random() * 0xffffffff); }
        return 'LYD-' + (n % 90000000 + 10000000);
    }

    function cleanText(str, max) {
        return String(str || '').replace(/[<>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, max || 200);
    }

    root.FraudGuard = {
        LIMITS: LIMITS,
        normalizeLibyanPhone: normalizeLibyanPhone,
        voucherProblem: voucherProblem,
        markVoucherUsed: markVoucherUsed,
        voucherLockRemainingMs: voucherLockRemainingMs,
        recordVoucherFailure: recordVoucherFailure,
        clearVoucherFailures: clearVoucherFailures,
        rateLimitProblem: rateLimitProblem,
        recordOrder: recordOrder,
        sanitizeCart: sanitizeCart,
        cartTotal: cartTotal,
        playerIdProblem: playerIdProblem,
        secureOrderId: secureOrderId,
        cleanText: cleanText
    };
})(typeof window !== 'undefined' ? window : globalThis);
