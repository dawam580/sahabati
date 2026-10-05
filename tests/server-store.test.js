const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function freshStore() {
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sahabati-store-'));
    process.env.ADMIN_PIN = 'secret-pin-1';
    delete require.cache[require.resolve('../store')];
    const store = require('../store').createStore();
    // كود حقيقي واحد على الأقل لكل اختبار يحتاج المخزن
    store._db.addBatchCodes({ productId: 'apple_itunes_10_us', brand: 'apple', productName: 'آيتونز أمريكي' }, 'US-1\nUS-2\nUS-3\nUS-4\nUS-5\nUS-6\nUS-7\nUS-8');
    return store;
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
    assert.ok(/^US-\d$/.test(after.orders[0].vouchers[0].voucherCode));
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
    assert.match(token, /^\d{10,16}\.[a-f0-9]{64}$/);
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

test('catalog: entertainment section, chat apps, Libyana only, no telecom/PSN/Steam cards, Claude added', () => {
    const store = freshStore();
    const cat = store.publicCatalog();
    const ids = cat.giftCards.map(c => c.id);
    for (const id of ['netflix_4k_1m', 'shahid_vip_full', 'disney_plus_1m', 'watchit_1m', 'crunchyroll_1m']) {
        assert.equal(cat.giftCards.find(c => c.id === id).category, 'entertainment', id);
    }
    assert.ok(ids.includes('claude_pro_1m') && ids.includes('chatgpt_plus_1m') && ids.includes('apple_itunes_10_us'));
    assert.ok(!ids.some(id => id.startsWith('card_tt_')), 'TikTok is sold from the games section by QR');
    assert.ok(!cat.giftCards.some(c => c.category === 'telecom' || ['playstation', 'steam', 'madar', 'libyana'].includes(c.brand)));
    assert.deepEqual(Object.keys(cat.settings.paymentMethodsInfo).sort(), ['bank_transfer', 'lypay', 'onepay', 'telecom_libyana'].sort());
    const chat = cat.games.filter(g => g.category === 'chat');
    assert.equal(chat.length, 23, 'only chat apps with an icon are listed');
    assert.ok(chat.every(g => g.deliveryMethod === 'id' && g.image));
    const method = id => cat.games.find(g => g.id === id).deliveryMethod;
    assert.deepEqual(['pubg', 'freefire', 'tiktok_coins', 'roblox', 'clashofclans'].map(method), ['id', 'id', 'qr', 'login', 'login']);
    const r = store.createOrder(goodOrder({ paymentMethod: 'telecom_madar' }), 'z');
    assert.equal(r.order.paymentMethod, 'telecom_libyana');
    const rLy = store.createOrder(goodOrder({ paymentMethod: 'lypay', cardCode13: '', transferRef: '0912223344' }), 'z1');
    assert.equal(rLy.status, 201);
    assert.equal(rLy.order.paymentMethod, 'lypay');
    assert.equal(rLy.order.transferRef, '0912223344');
    const rOne = store.createOrder(goodOrder({ paymentMethod: 'onepay', cardCode13: '', transferRef: 'REF-9988' }), 'z2');
    assert.equal(rOne.status, 201);
    assert.equal(rOne.order.paymentMethod, 'onepay');
    assert.equal(rOne.order.transferRef, 'REF-9988');

    const rBank = store.createOrder(goodOrder({ paymentMethod: 'bank_transfer', cardCode13: '', transferRef: 'BANK-001' }), 'z3');
    assert.equal(rBank.status, 201);
    assert.equal(rBank.order.paymentMethod, 'bank_transfer');
    assert.equal(rBank.order.transferRef, 'BANK-001');

    // Multi-pricing verification: Shahid VIP has LY: 35, Bank: 30, OnePay: 31
    const rShahidLy = store.createOrder(goodOrder({ items: [{ type: 'giftcard', cardId: 'shahid_vip_full', quantity: 1 }], paymentMethod: 'lypay', transferRef: '092000' }), 'z4');
    assert.equal(rShahidLy.status, 201);
    assert.equal(rShahidLy.order.items[0].priceLYD, 35, 'Shahid LY price is 35 LYD');

    const rShahidBank = store.createOrder(goodOrder({ items: [{ type: 'giftcard', cardId: 'shahid_vip_full', quantity: 1 }], paymentMethod: 'bank_transfer', transferRef: 'TR-1' }), 'z5');
    assert.equal(rShahidBank.status, 201);
    assert.equal(rShahidBank.order.items[0].priceLYD, 30, 'Shahid Bank price is 30 LYD');

    const rShahidOne = store.createOrder(goodOrder({ items: [{ type: 'giftcard', cardId: 'shahid_vip_full', quantity: 1 }], paymentMethod: 'onepay', transferRef: 'ONE-1' }), 'z6');
    assert.equal(rShahidOne.status, 201);
    assert.equal(rShahidOne.order.items[0].priceLYD, 31, 'Shahid OnePay price is 31 LYD');
});

test('delivery methods: PUBG and chat apps need an ID, TikTok by QR, Roblox by login; hidden items cannot be ordered', () => {
    const store = freshStore();
    const game = (gameId, packageId, playerId) => goodOrder({ items: [{ type: 'game', gameId, packageId, quantity: 1, playerId }] });
    assert.equal(store.createOrder(game('pubg', 'pubg_60', ''), 'a1').status, 400);
    assert.equal(store.createOrder(game('pubg', 'pubg_60', '5123456789'), 'a2').order.items[0].meta, 'Player ID: 5123456789');
    assert.equal(store.createOrder(game('chat_001', 'chat_001_v10', ''), 'a3').status, 400);
    assert.equal(store.createOrder(game('chat_001', 'chat_001_v10', '12345678'), 'a4').status, 201);
    assert.equal(store.createOrder(game('tiktok_coins', 'tt_100', ''), 'a5').order.items[0].meta, 'الشحن عبر رمز QR');
    assert.equal(store.createOrder(game('roblox', 'rb_80', ''), 'a6').order.items[0].meta, 'الشحن عبر تسجيل الدخول');

    const cat = store.publicCatalog();
    cat.giftCards.find(c => c.id === 'watchit_1m').hidden = true;
    store.saveCatalog(cat);
    assert.equal(store.createOrder(goodOrder({ items: [{ type: 'giftcard', cardId: 'watchit_1m', quantity: 1 }] }), 'a7').status, 400);
});

test('v5: similar chat app names are hidden, Turkish iTunes added, and a saved v4 catalog keeps admin prices', () => {
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sahabati-store-'));
    // simulate a catalog the admin saved under v4 with a custom price
    const vm = require('node:vm');
    const ctx = vm.createContext({ localStorage: { getItem: () => null, setItem() {} }, console });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') + ';this.D=JSON.parse(JSON.stringify(DEFAULT_APP_DATA));', ctx);
    const v4 = ctx.D;
    v4.catalogVersion = 4;
    v4.giftCards = v4.giftCards.filter(c => c.id !== 'apple_itunes_tr_100');
    v4.games.forEach(g => { delete g.hidden; });
    v4.giftCards.find(c => c.id === 'watchit_1m').priceLYD = 33;
    fs.writeFileSync(path.join(process.env.DATA_DIR, 'catalog.json'), JSON.stringify(v4));
    process.env.ADMIN_PIN = 'secret-pin-1';
    delete require.cache[require.resolve('../store')];
    const cat = require('../store').createStore().publicCatalog();
    assert.equal(cat.catalogVersion, 8);
    assert.equal(cat.giftCards.find(c => c.id === 'watchit_1m').priceLYD, 33, 'admin price kept');
    assert.ok(cat.giftCards.some(c => c.id === 'apple_itunes_tr_100' && c.category === 'gift_cards'));
    const names = cat.games.filter(g => g.category === 'chat').map(g => g.nameAr);
    assert.ok(!['اهلا', 'لايكي', 'ليت', 'دي دي'].some(n => names.includes(n)), 'duplicates are gone');
});

test('admin PIN tolerates spaces and quotes copied into the hosting variable', () => {
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sahabati-store-'));
    process.env.ADMIN_PIN = '  "Pin@2026x" \n';
    delete require.cache[require.resolve('../store')];
    const store = require('../store').createStore();
    assert.match(store.adminLogin('Pin@2026x'), /^\d{10,16}\.[a-f0-9]{64}$/);
    assert.match(store.adminLogin(' Pin@2026x '), /^\d{10,16}\.[a-f0-9]{64}$/);
    assert.equal(store.adminLogin('pin@2026x'), null, 'still case-sensitive');
});

test('admin PIN typed with an Arabic phone keyboard (Arabic-Indic digits) is accepted', () => {
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sahabati-store-'));
    process.env.ADMIN_PIN = '5550001@';
    delete require.cache[require.resolve('../store')];
    const store = require('../store').createStore();
    assert.match(store.adminLogin('٥٥٥٠٠٠١@'), /^\d{10,16}\.[a-f0-9]{64}$/);
    assert.match(store.adminLogin('۵۵۵۰۰۰۱@'), /^\d{10,16}\.[a-f0-9]{64}$/);
    assert.equal(store.adminLogin('٥٥٥٠٠٠٢@'), null);
});

test('v6: chat app icons and corrected names, applied to a saved v5 catalog without touching admin edits', () => {
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sahabati-store-'));
    const vm = require('node:vm');
    const ctx = vm.createContext({ localStorage: { getItem: () => null, setItem() {} }, console });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') + ';this.D=JSON.parse(JSON.stringify(DEFAULT_APP_DATA));', ctx);
    const v5 = ctx.D;
    v5.catalogVersion = 5;
    v5.games.forEach(g => { if (g.category === 'chat') delete g.image; });
    const g39 = v5.games.find(g => g.id === 'chat_039'); g39.nameAr = 'تو لايف';
    const g1 = v5.games.find(g => g.id === 'chat_001'); g1.image = 'https://example.com/admin-choice.png';
    v5.games.find(g => g.id === 'pubg').packages[0].priceLYD = 11;
    fs.writeFileSync(path.join(process.env.DATA_DIR, 'catalog.json'), JSON.stringify(v5));
    process.env.ADMIN_PIN = 'secret-pin-1';
    delete require.cache[require.resolve('../store')];
    const cat = require('../store').createStore().publicCatalog();
    const byId = id => cat.games.find(g => g.id === id);
    assert.equal(cat.catalogVersion, 8);
    assert.equal(byId('chat_039').nameAr, 'ديتو لايف');
    assert.equal(byId('chat_002').image, 'images/chat/chat_002.webp');
    assert.equal(byId('chat_001').image, 'https://example.com/admin-choice.png', 'admin image kept');
    assert.equal(byId('pubg').packages[0].priceLYD, 11, 'admin price kept');
    assert.equal(byId('chat_038'), undefined, 'apps without an icon are removed');
    for (const g of cat.games.filter(g => g.image && g.image.startsWith('images/'))) {
        assert.ok(fs.existsSync(path.join(__dirname, '..', g.image)), g.image + ' exists');
    }
});

test('v7: a saved v6 catalog drops default chat apps without an icon but keeps admin-added apps and admin images', () => {
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sahabati-store-'));
    const vm = require('node:vm');
    const ctx = vm.createContext({ localStorage: { getItem: () => null, setItem() {} }, console });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') + ';this.D=JSON.parse(JSON.stringify(DEFAULT_APP_DATA));this.B=buildChatApps;', ctx);
    const v6 = ctx.D;
    v6.catalogVersion = 6;
    // a v6 catalog still listed every chat app
    v6.games = v6.games.filter(g => g.category !== 'chat');
    const all = ctx.B();
    const full = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8').match(/const CHAT_APP_NAMES = \[([\s\S]*?)\];/)[1].replace(/'/g, '"').replace(/,\s*$/, '').replace(/^/, '[') + ']');
    full.forEach((name, i) => v6.games.push({ id: 'chat_' + String(i + 1).padStart(3, '0'), category: 'chat', nameAr: name, packages: [] }));
    v6.games.find(g => g.id === 'chat_050').image = 'https://example.com/x.png';
    v6.games.push({ id: 'game_123', category: 'chat', nameAr: 'تطبيق أضافه المدير', packages: [] });
    fs.writeFileSync(path.join(process.env.DATA_DIR, 'catalog.json'), JSON.stringify(v6));
    delete require.cache[require.resolve('../store')];
    const cat = require('../store').createStore().publicCatalog();
    const ids = cat.games.filter(g => g.category === 'chat').map(g => g.id);
    assert.ok(all.length === 23);
    assert.ok(ids.includes('chat_050') && ids.includes('game_123'));
    assert.ok(!ids.includes('chat_010'));
    assert.equal(ids.length, 2, 'v6 chat entries had no image except chat_050');
});

test('admin sessions survive a server restart and end when ADMIN_PIN changes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sahabati-store-'));
    const boot = pin => { process.env.DATA_DIR = dir; process.env.ADMIN_PIN = pin; delete require.cache[require.resolve('../store')]; return require('../store').createStore(); };
    const token = boot('pin-one-1').adminLogin('pin-one-1');
    const req = { headers: { authorization: 'Bearer ' + token } };
    assert.equal(boot('pin-one-1').isAdmin(req), true, 'same secret + same PIN after restart');
    assert.equal(boot('pin-two-2').isAdmin(req), false, 'changing the PIN signs everyone out');
    assert.equal(boot('pin-one-1').isAdmin({ headers: { authorization: 'Bearer ' + token.replace(/.$/, c => c === '0' ? '1' : '0') } }), false, 'tampered token rejected');
});

test('admin confirms on the server; a stale full-database upload cannot turn a paid order back to pending', () => {
    const store = freshStore();
    const r = store.createOrder(goodOrder(), 'ip-1');
    const staleSnapshot = JSON.parse(JSON.stringify(store.adminDatabase()));
    const paid = store.adminConfirmOrder({ id: r.order.id });
    assert.equal(paid.status, 'paid');
    assert.ok(/^US-\d$/.test(paid.vouchers[0].voucherCode));
    store.mergeAdminDatabase(staleSnapshot); // the panel still had the order as pending
    const view = store.orderStatus({ phone: '0912345678', ids: [r.order.id] }, 'ip-1').orders[0];
    assert.equal(view.status, 'paid');
    assert.equal(view.vouchers[0].voucherCode, paid.vouchers[0].voucherCode);
    const code = store.adminDatabase().voucher_codes.find(c => c.assignedOrderId === r.order.id);
    assert.equal(code.status, 'sold');
    assert.throws(() => store.adminCancelOrder({ id: r.order.id }), /مدفوع/);
});

test('storage: Railway volume is used automatically; temporary storage is reported', () => {
    const keep = { DATA_DIR: process.env.DATA_DIR, RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT, RAILWAY_VOLUME_MOUNT_PATH: process.env.RAILWAY_VOLUME_MOUNT_PATH };
    const load = () => { delete require.cache[require.resolve('../store')]; return require('../store').createStore(); };
    try {
        process.env.ADMIN_PIN = 'secret-pin-1';
        process.env.RAILWAY_ENVIRONMENT = 'production';
        delete process.env.RAILWAY_VOLUME_MOUNT_PATH;
        process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sahabati-tmp-'));
        assert.equal(load().storageInfo().persistent, false, 'Railway without a volume = temporary');

        const vol = fs.mkdtempSync(path.join(os.tmpdir(), 'sahabati-vol-'));
        delete process.env.DATA_DIR;
        process.env.RAILWAY_VOLUME_MOUNT_PATH = vol;
        const info = load().storageInfo();
        assert.equal(info.dataDir, vol, 'volume path used without DATA_DIR');
        assert.equal(info.persistent, true);
    } finally {
        for (const [k, v] of Object.entries(keep)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    }
});

test('order status reports orders the server no longer has', () => {
    const store = freshStore();
    const r = store.createOrder(goodOrder(), 'ip-m');
    const res = store.orderStatus({ phone: '0912345678', ids: [r.order.id, 'LYD-00000000'] }, 'ip-m');
    assert.equal(res.orders.length, 1);
    assert.deepEqual([...res.missing], ['LYD-00000000']);
});

test('v8: manual-delivery badge on PUBG, Free Fire, TikTok, Snapchat and Telegram; admin choice kept', () => {
    const store = freshStore();
    const cat = store.publicCatalog();
    const all = cat.games.concat(cat.giftCards);
    const manual = all.filter(i => i.manual).map(i => i.id).sort();
    assert.deepEqual(manual, ['freefire', 'pubg', 'snapchat_plus_3m', 'snapchat_plus_6m', 'telegram_premium_3m', 'tiktok_coins'].sort());
    // admin turned the badge off for PUBG and saved; it must stay off
    cat.games.find(g => g.id === 'pubg').manual = false;
    store.saveCatalog(cat);
    assert.equal(store.publicCatalog().games.find(g => g.id === 'pubg').manual, false);
});

test('storage: a relative DATA_DIR like "data" falls back to the attached volume', () => {
    const keep = { DATA_DIR: process.env.DATA_DIR, RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT, RAILWAY_VOLUME_MOUNT_PATH: process.env.RAILWAY_VOLUME_MOUNT_PATH };
    try {
        const vol = fs.mkdtempSync(path.join(os.tmpdir(), 'sahabati-vol-'));
        process.env.ADMIN_PIN = 'secret-pin-1';
        process.env.RAILWAY_ENVIRONMENT = 'production';
        process.env.RAILWAY_VOLUME_MOUNT_PATH = vol;
        process.env.DATA_DIR = 'data';
        delete require.cache[require.resolve('../store')];
        const info = require('../store').createStore().storageInfo();
        assert.equal(info.dataDir, vol);
        assert.equal(info.persistent, true);
    } finally {
        for (const [k, v] of Object.entries(keep)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    }
});

test('admin-chosen delivery method: a card by ID needs an account ID, a manual card never takes a vault code, a manual game needs no ID', () => {
    const store = freshStore();
    const cat = store.publicCatalog();
    cat.giftCards.find(c => c.id === 'apple_itunes_10_us').deliveryMethod = 'id';
    cat.games.find(g => g.id === 'pubg').deliveryMethod = 'manual';
    store.saveCatalog(cat);
    const card = (playerId) => goodOrder({ items: [{ type: 'giftcard', cardId: 'apple_itunes_10_us', quantity: 1, playerId }] });
    assert.equal(store.createOrder(card(''), 'm1').status, 400, 'ID card needs an account ID');
    const byId = store.createOrder(card('user@example.com'), 'm2');
    assert.equal(byId.status, 201);
    assert.equal(byId.order.items[0].meta, 'ID: user@example.com');
    assert.ok(!byId.order.vouchers.some(v => v.codeId), 'ID delivery does not reserve a vault code');

    const cat2 = store.publicCatalog();
    cat2.giftCards.find(c => c.id === 'apple_itunes_10_us').deliveryMethod = 'manual';
    store.saveCatalog(cat2);
    const manual = store.createOrder(card(''), 'm3');
    assert.equal(manual.status, 201);
    assert.equal(manual.order.items[0].meta, 'تسليم يدوي');
    assert.ok(!manual.order.vouchers.some(v => v.codeId), 'manual delivery does not reserve a vault code');
    assert.equal(store.adminDatabase().voucher_codes.filter(c => c.status === 'available').length, 8);

    const game = store.createOrder(goodOrder({ items: [{ type: 'game', gameId: 'pubg', packageId: 'pubg_60', quantity: 1, playerId: '' }] }), 'm4');
    assert.equal(game.status, 201);
    assert.equal(game.order.items[0].meta, 'تسليم يدوي');
});
