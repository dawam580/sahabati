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
