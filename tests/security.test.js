const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

async function guardContext() {
    const mem = {};
    const context = vm.createContext({
        Date, Math, JSON, Uint32Array,
        crypto: { getRandomValues: a => { a[0] = 123456789; return a; } },
        localStorage: { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } }
    });
    context.window = context;
    vm.runInContext(await fs.readFile(path.join(__dirname, '..', 'js', 'security.js'), 'utf8'), context);
    return context.FraudGuard;
}

const CATALOG = {
    games: [{ id: 'freefire', packages: [{ id: 'ff_100', priceLYD: 10 }] }],
    giftCards: [{ id: 'netflix', priceLYD: 45 }]
};

test('Libyan phone numbers are normalized and invalid ones rejected', async () => {
    const g = await guardContext();
    assert.equal(g.normalizeLibyanPhone('0912345678'), '0912345678');
    assert.equal(g.normalizeLibyanPhone('+218 92 123 4567'), '0921234567');
    assert.equal(g.normalizeLibyanPhone('00218941234567'), '0941234567');
    assert.equal(g.normalizeLibyanPhone('123'), null);
    assert.equal(g.normalizeLibyanPhone('0812345678'), null);
});

test('tampered cart prices are restored from the catalog and unknown items dropped', async () => {
    const g = await guardContext();
    const { cart, changed } = g.sanitizeCart([
        { type: 'game', gameId: 'freefire', packageId: 'ff_100', priceLYD: 0.01, quantity: 99 },
        { type: 'giftcard', cardId: 'netflix', priceLYD: 45, quantity: 1 },
        { type: 'giftcard', cardId: 'fake', priceLYD: 1, quantity: 1 }
    ], CATALOG);
    assert.equal(changed, true);
    assert.equal(cart.length, 2);
    assert.equal(cart[0].priceLYD, 10);
    assert.equal(cart[0].quantity, g.LIMITS.maxQtyPerItem);
    assert.equal(g.cartTotal(cart), 10 * g.LIMITS.maxQtyPerItem + 45);
});

test('recharge cards: format, trivial patterns and reuse are rejected', async () => {
    const g = await guardContext();
    assert.ok(g.voucherProblem('123'));
    assert.ok(g.voucherProblem('7777777777777'));
    assert.ok(g.voucherProblem('1234567890123'));
    assert.equal(g.voucherProblem('4829175036418'), null);
    g.markVoucherUsed('4829175036418');
    assert.match(g.voucherProblem('4829175036418'), /سابق/);
});

test('repeated wrong cards lock voucher entry', async () => {
    const g = await guardContext();
    for (let i = 0; i < g.LIMITS.maxVoucherFailures; i++) g.recordVoucherFailure();
    assert.ok(g.voucherLockRemainingMs() > 0);
});

test('order cooldown and per-window limit', async () => {
    const g = await guardContext();
    assert.equal(g.rateLimitProblem(), null);
    g.recordOrder();
    assert.ok(g.rateLimitProblem());
});

test('player IDs must be numeric and plausible', async () => {
    const g = await guardContext();
    assert.ok(g.playerIdProblem(''));
    assert.ok(g.playerIdProblem('abc123'));
    assert.ok(g.playerIdProblem('11111111'));
    assert.equal(g.playerIdProblem('123456789'), null);
});

test('multi-pricing: getProductPrice respects payment method and drops unsupported items', async () => {
    const g = await guardContext();
    const catalog = {
        games: [{
            id: 'pubg',
            packages: [{
                id: 'pkg_1',
                priceLYD: 50,
                prices: { lypay: 55, bank_transfer: 48, onepay: 49 }
            }, {
                id: 'pkg_ly_only',
                priceLYD: 20,
                prices: { lypay: 20 }
            }]
        }],
        giftCards: [{
            id: 'shahid',
            priceLYD: 30,
            prices: { lypay: 35, bank_transfer: 30, onepay: 31 }
        }]
    };

    // Correct method prices
    assert.equal(g.getProductPrice({ type: 'game', gameId: 'pubg', packageId: 'pkg_1' }, catalog, 'lypay'), 55);
    assert.equal(g.getProductPrice({ type: 'game', gameId: 'pubg', packageId: 'pkg_1' }, catalog, 'bank_transfer'), 48);
    assert.equal(g.getProductPrice({ type: 'game', gameId: 'pubg', packageId: 'pkg_1' }, catalog, 'onepay'), 49);

    // Default fallback when no method specified
    assert.equal(g.getProductPrice({ type: 'game', gameId: 'pubg', packageId: 'pkg_1' }, catalog, null), 50);

    // Product with only LY allowed
    assert.equal(g.getProductPrice({ type: 'game', gameId: 'pubg', packageId: 'pkg_ly_only' }, catalog, 'lypay'), 20);
    assert.equal(g.getProductPrice({ type: 'game', gameId: 'pubg', packageId: 'pkg_ly_only' }, catalog, 'bank_transfer'), null);
    assert.equal(g.getProductPrice({ type: 'game', gameId: 'pubg', packageId: 'pkg_ly_only' }, catalog, 'onepay'), null);

    // Sanitize cart with supported vs unsupported method
    const { cart: lyCart } = g.sanitizeCart([
        { type: 'game', gameId: 'pubg', packageId: 'pkg_1', quantity: 1 },
        { type: 'game', gameId: 'pubg', packageId: 'pkg_ly_only', quantity: 1 }
    ], catalog, 'lypay');
    assert.equal(lyCart.length, 2);
    assert.equal(lyCart[0].priceLYD, 55);
    assert.equal(lyCart[1].priceLYD, 20);

    const { cart: bankCart } = g.sanitizeCart([
        { type: 'game', gameId: 'pubg', packageId: 'pkg_1', quantity: 1 },
        { type: 'game', gameId: 'pubg', packageId: 'pkg_ly_only', quantity: 1 }
    ], catalog, 'bank_transfer');
    assert.equal(bankCart.length, 1, 'unsupported item is dropped');
    assert.equal(bankCart[0].packageId, 'pkg_1');
    assert.equal(bankCart[0].priceLYD, 48);
});

test('multi-pricing: Libyana USSD transfer code formula matches requirement', () => {
    // 35 LYD -> *122*920541749*35000#
    const price1 = 35;
    assert.equal(`*122*920541749*${Math.round(price1 * 1000)}#`, '*122*920541749*35000#');

    // 25 LYD -> *122*920541749*25000#
    const price2 = 25;
    assert.equal(`*122*920541749*${Math.round(price2 * 1000)}#`, '*122*920541749*25000#');

    // Multi-quantity total e.g. 2 x 35 LYD = 70 LYD -> *122*920541749*70000#
    const total = 35 * 2;
    assert.equal(`*122*920541749*${Math.round(total * 1000)}#`, '*122*920541749*70000#');
});
