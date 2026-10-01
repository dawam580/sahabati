const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { Readable } = require('node:stream');

test('order and image are saved together, validated, and retrieved by opaque link', async () => {
    const storage = await fs.mkdtemp(path.join(os.tmpdir(), 'sahabati-test-'));
    process.env.ORDER_STORAGE_DIR = storage;
    const { handleOrders } = require('../order-api');
    const call = async (url, body, method = 'POST') => {
        const req = Readable.from([Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]);
        req.method = method; req.headers = { 'content-type': 'application/json' };
        const result = {};
        const res = { writeHead(status, headers) { result.status = status; result.headers = headers; }, end(data) { result.data = data; } };
        assert.equal(await handleOrders(req, res, {}, url), true);
        return result;
    };
    const image = await fs.readFile(path.join(__dirname, '..', 'logo.jpg'));
    const body = { name: 'محمد', phone: '0912345678', items: [{ titleAr: 'شاهد', quantity: 2 }, { titleAr: 'نتفليكس', quantity: 1 }], proof: 'data:image/jpeg;base64,' + image.toString('base64') };
    const result = await call('/api/orders', body);
    assert.equal(result.status, 201);
    const saved = JSON.parse(result.data);
    const savedOrder = JSON.parse(await fs.readFile(path.join(storage, saved.id, 'order.json'), 'utf8'));
    assert.deepEqual(savedOrder.items, body.items);
    assert.equal(savedOrder.createdAt, saved.createdAt);
    const proof = await call(saved.proofPath, '', 'GET');
    assert.equal(proof.status, 200);
    assert.deepEqual(proof.data, image);
    assert.equal(proof.headers['Cache-Control'], 'private, no-store');
    assert.equal((await call('/api/orders', { ...body, phone: '123' })).status, 400);
    assert.equal((await call('/api/orders', { ...body, items: [{ titleAr: 'شاهد', quantity: -1 }] })).status, 400);
    assert.equal((await call('/api/orders', { ...body, proof: 'data:image/jpeg;base64,' + Buffer.from('not an image').toString('base64') })).status, 400);
    assert.equal((await call('/api/orders', { ...body, proof: '' })).status, 400);
    assert.equal((await call('/api/orders', '{invalid')).status, 400);
    assert.equal((await call('/api/orders', '', 'GET')).status, 405);
    assert.equal((await call('/api/orders', { ...body, proof: 'data:image/jpeg;base64,' + Buffer.alloc(6 * 1024 * 1024).toString('base64') })).status, 413);
    assert.equal((await fs.readdir(storage)).length, 1, 'invalid orders leave no files');
    // Remove only files and directory created by this test.
    await fs.unlink(path.join(storage, saved.id, 'proof.jpg'));
    await fs.unlink(path.join(storage, saved.id, 'order.json'));
    await fs.rmdir(path.join(storage, saved.id));
    await fs.rmdir(storage);
});

async function flowContext() {
    const context = vm.createContext({ Intl, Date, URL, AbortSignal, document: { addEventListener() {} } });
    vm.runInContext(await fs.readFile(path.join(__dirname, '..', 'js', 'order-flow.js'), 'utf8'), context);
    return context;
}

test('WhatsApp message has only required fields, supports multiple products and Libya date rollover', async () => {
    const context = await flowContext();
    const message = context.buildOrderMessage({ customerName: 'محمد', customerPhone: '0912345678', items: [{ titleAr: 'شاهد', quantity: 2 }, { titleAr: 'نتفليكس', quantity: 1 }] }, new Date('2026-09-26T22:28:00Z'));
    assert.equal(message, 'طلب جديد | سحّابتي ☁️\nالعميل: محمد\nالهاتف: 0912345678\nالمنتج: شاهد\nالكمية: 2\nالمنتج: نتفليكس\nالكمية: 1\nالتاريخ: 27/09/2026\nالوقت: 00:28');
    assert.ok(!context.buildOrderMessage({ customerPhone: '0912345678', items: [{ titleAr: 'شاهد', quantity: 1 }] }, new Date()).includes('العميل:'));
});

test('failed upload preserves cart and proof, restores button, closes blank WhatsApp tab', async () => {
    const context = await flowContext();
    const button = { innerHTML: 'إرسال', disabled: false };
    const fields = { 'whatsapp-phone-input': { value: '0912345678' }, 'customer-name-input': { value: '' }, 'checkout-total': { textContent: '10 د.ل' }, 'complete-payment-btn': button };
    let closed = false;
    context.document = { getElementById: id => fields[id] };
    context.window = { open: () => ({ close: () => { closed = true; } }) };
    context.state = { cart: [{ titleAr: 'شاهد', quantity: 2 }] };
    context.fetch = async () => ({ ok: false, json: async () => ({ error: 'تعذر الحفظ' }) });
    context.showToast = () => {};
    vm.runInContext("paymentProof = { data: 'example' };", context);
    await context.processPayment();
    assert.equal(context.state.cart.length, 1);
    assert.equal(vm.runInContext('paymentProof.data', context), 'example');
    assert.equal(button.disabled, false);
    assert.equal(button.innerHTML, 'إرسال');
    assert.equal(closed, true);
});

test('saved order contains both WhatsApp links and works when popups are blocked', async () => {
    const context = await flowContext();
    const button = { innerHTML: 'إرسال', disabled: false };
    const fields = { 'whatsapp-phone-input': { value: '0912345678' }, 'customer-name-input': { value: 'محمد' }, 'checkout-total': { textContent: '10 د.ل' }, 'complete-payment-btn': button, 'payment-proof-input': {}, 'payment-proof-preview': {}, 'payment-proof-image': { removeAttribute() {} }, 'payment-proof-status': {} };
    context.document = { getElementById: id => fields[id] };
    context.window = { open: () => null, location: { origin: 'https://shop.example' } };
    context.state = { cart: [{ titleAr: 'شاهد', quantity: 2 }], orders: [], paymentMethod: 'one_pay' };
    context.APP_DATA = { settings: { whatsappNumber: '218920541749' } };
    context.fetch = async () => ({ ok: true, json: async () => ({ id: 'test-id', createdAt: '2026-09-27T01:28:00Z', proofPath: '/payment-proof/test-id' }) });
    context.showToast = context.storeSet = context.saveCart = context.updateCartUI = () => {};
    let receipt;
    context.showSuccessModal = order => { receipt = order; };
    vm.runInContext("paymentProof = { data: 'example' };", context);
    await context.processPayment();
    assert.equal(context.state.cart.length, 0);
    assert.equal(context.state.orders.length, 1);
    assert.equal(receipt.proofUrl, 'https://shop.example/payment-proof/test-id');
    assert.ok(new URL(receipt.proofWaUrl).searchParams.get('text').includes(receipt.proofUrl));
    assert.ok(!new URL(receipt.waUrl).searchParams.get('text').includes(receipt.proofUrl));
    assert.ok(new URL(receipt.waUrl).searchParams.get('text').includes('الوقت: 03:28'));
    assert.equal(button.disabled, false);
});

test('both cart implementations keep PUBG orders free of account IDs', async () => {
    const context = vm.createContext({
        console, loadJSON: (_key, fallback) => fallback, storeGet: () => null,
        document: { addEventListener() {}, getElementById(id) {
            if (id === 'player-id-input') throw new Error('PUBG must not read the account field');
            return null;
        } }, navigator: {},
        APP_DATA: { games: [{ id: 'pubg', nameAr: 'ببجي موبايل', packages: [{ id: 'pubg_60', nameAr: '60 شدة', priceLYD: 10 }] }] }
    });
    context.window = context;
    vm.runInContext(await fs.readFile(path.join(__dirname, '..', 'js', 'app.js'), 'utf8'), context);
    vm.runInContext("state.verifiedPlayerId = 'stale-account'; saveCart = updateCartUI = showToast = () => {};", context);
    context.addGamePackageToCart('pubg', 'pubg_60');
    assert.equal(vm.runInContext('state.cart[0].meta', context), 'كود شدات ببجي');
    vm.runInContext(await fs.readFile(path.join(__dirname, '..', 'js', 'interactions.js'), 'utf8'), context);
    vm.runInContext('renderCartDrawer = playSound = () => {};', context);
    context.addGamePackageToCart('pubg', 'pubg_60');
    assert.equal(vm.runInContext('state.cart[1].meta', context), 'كود شدات ببجي');
});

test('GitHub Pages prepares WhatsApp and saves local proof without requesting a server', async () => {
    const context = await flowContext();
    const button = { innerHTML: 'إرسال', disabled: false };
    const fields = { 'whatsapp-phone-input': { value: '0912345678' }, 'customer-name-input': { value: 'محمد' }, 'checkout-total': { textContent: '10 د.ل' }, 'complete-payment-btn': button, 'payment-proof-input': {}, 'payment-proof-preview': {}, 'payment-proof-image': { removeAttribute() {} }, 'payment-proof-status': {} };
    context.document = { getElementById: id => fields[id] };
    context.window = { open: () => null, location: { hostname: 'dawam580.github.io', origin: 'https://dawam580.github.io' } };
    context.crypto = { randomUUID: () => 'local-test-id' };
    context.state = { cart: [{ titleAr: 'شاهد', quantity: 2 }], orders: [], paymentMethod: 'one_pay' };
    context.APP_DATA = { settings: { whatsappNumber: '218920541749' } };
    context.fetch = async () => { throw new Error('Static hosting must not call an order API'); };
    let savedProof;
    context.localProofRecord = async (id, proof) => { savedProof = { id, proof }; };
    context.showToast = context.storeSet = context.saveCart = context.updateCartUI = context.showSuccessModal = () => {};
    vm.runInContext("paymentProof = { data: 'example', name: 'receipt.jpg' };", context);
    await context.processPayment();
    assert.equal(savedProof.id, 'local-test-id');
    assert.equal(savedProof.proof.name, 'receipt.jpg');
    assert.equal(context.state.orders[0].localProof, true);
    assert.equal(context.state.orders[0].proofUrl, null);
    assert.ok(context.state.orders[0].waUrl.startsWith('https://wa.me/218920541749'));
    assert.equal(context.state.cart.length, 0);
});
