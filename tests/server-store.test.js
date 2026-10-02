const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function freshStore() {
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sahabati-store-'));
    process.env.ADMIN_PIN = 'secret-pin-1';
    delete require.cache[require.resolve('../store')];
    return require('../store').createStore();
}

// كل طلب يحتاج كرت ليبيانا جديداً (الدفع عبر ليبيانا فقط)
let cardSeq = 10;
const nextCard = () => '48291750364' + String(cardSeq++).padStart(2, '0');
const goodOrder = (extra) => Object.assign({
    phone: '0912345678',
    cardCode13: nextCard(),
    items: [{ type: 'giftcard', cardId: 'apple_itunes_10_us', quantity: 1, priceLYD: 0.01 }]
}, extra);

test('server prices orders from its own catalog and hides codes until paid', () => {
    const store = freshStore();
    const r = store.createOrder(goodOrder({ items: [{ type: 'giftcard', cardId: 'apple_itunes_10_us', quantity: 50, priceLYD: 0.01, titleAr: 'fake' }] }), '1.1.1.1');
    assert.equal(r.status, 201);
    assert.equal(r.order.items[0].priceLYD, 68);
    assert.equal(r.order.items[0].quantity, 5);
    assert.notEqual(r.order.items[0].titleAr, 'fake');
    assert.ok(r.order.vouchers.every(v => v.locked && !v.voucherCode));

    const before = store.orderStatus({ phone: '0912345678', ids: [r.order.id] }, '1.1.1.1');
    assert.equal(before.orders[0].accountDetails, null);
    assert.equal(store.orderStatus({ phone: '0921111111', ids: [r.order.id] }, '1.1.1.1').orders.length, 0, 'other phones cannot read the order');

    store._db.confirmOrderPayment(r.order.id);
    const after = store.orderStatus({ phone: '0912345678', ids: [r.order.id] }, '1.1.1.1');
    assert.equal(after.orders[0].vouchers[0].voucherCode, 'XX78-9921-ITUNES-10USD-LY');
});

test('server rejects bad phones, unknown items, missing player IDs, missing or reused cards and floods', () => {
    const store = freshStore();
    assert.equal(store.createOrder(goodOrder({ phone: '123' }), 'a').status, 400);
    assert.equal(store.createOrder(goodOrder({ items: [{ type: 'giftcard', cardId: 'nope', quantity: 1 }] }), 'b').status, 400);
    assert.equal(store.createOrder(goodOrder({ items: [{ type: 'game', gameId: 'freefire', packageId: 'ff_100', quantity: 1 }] }), 'c').status, 400);
    assert.equal(store.createOrder(goodOrder({ website: 'bot' }), 'd').status, 400);
    assert.equal(store.createOrder(goodOrder({ cardCode13: '' }), 'g').status, 400, 'Libyana card is required');
    assert.equal(store.createOrder(goodOrder({ cardCode13: '4829175036418' }), 'e').status, 201);
    assert.equal(store.createOrder(goodOrder({ cardCode13: '4829175036418' }), 'f').status, 400, 'card reused');
    assert.equal(store.createOrder(goodOrder(), 'e').status, 429, 'cooldown per IP');
});

test('admin login is checked on the server and the catalog never exposes the PIN', () => {
    const store = freshStore();
    assert.equal(store.adminLogin('wrong'), null);
    const token = store.adminLogin('secret-pin-1');
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.equal(store.isAdmin({ headers: { authorization: 'Bearer ' + token } }), true);
    assert.equal(store.isAdmin({ headers: {} }), false);
    assert.equal(JSON.stringify(store.publicCatalog()).includes('adminPin'), false);
});

test('admin database upload keeps orders that arrived meanwhile', () => {
    const store = freshStore();
    const snapshot = JSON.parse(JSON.stringify(store.adminDatabase()));
    const r = store.createOrder(goodOrder(), 'x');
    store.mergeAdminDatabase(snapshot);
    assert.ok(store.adminDatabase().orders.some(o => o.id === r.order.id));
    const code = store.adminDatabase().voucher_codes.find(c => c.assignedOrderId === r.order.id);
    assert.equal(code.status, 'reserved', 'stale admin copy must not free a reserved code');
});

test('catalog: Netflix and Shahid are separate, only Libyana payment, no telecom/PSN/Steam cards, Claude added', () => {
    const store = freshStore();
    const cat = store.publicCatalog();
    const ids = cat.giftCards.map(c => c.id);
    assert.equal(cat.giftCards.find(c => c.id === 'netflix_4k_1m').category, 'netflix');
    assert.equal(cat.giftCards.find(c => c.id === 'shahid_vip_full').category, 'shahid');
    assert.ok(ids.includes('claude_pro_1m') && ids.includes('chatgpt_plus_1m') && ids.includes('apple_itunes_10_us'));
    assert.ok(!cat.giftCards.some(c => ['telecom'].includes(c.category) || ['playstation', 'steam', 'madar', 'libyana'].includes(c.brand)));
    assert.deepEqual(Object.keys(cat.settings.paymentMethodsInfo), ['telecom_libyana']);
    const r = store.createOrder(goodOrder({ paymentMethod: 'telecom_madar' }), 'z');
    assert.equal(r.order.paymentMethod, 'telecom_libyana');
});
