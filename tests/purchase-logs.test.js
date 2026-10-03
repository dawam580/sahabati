const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

async function createDatabaseContext() {
    const memoryStorage = {};
    const context = vm.createContext({
        console,
        localStorage: {
            getItem: (k) => memoryStorage[k] || null,
            setItem: (k, v) => { memoryStorage[k] = String(v); },
            removeItem: (k) => { delete memoryStorage[k]; },
            clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
        },
        sessionStorage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
        },
        window: {},
        Date,
        Math,
        JSON,
        parseFloat,
        String,
        Array
    });
    context.window = context;

    const dbCode = await fs.readFile(path.join(__dirname, '..', 'js', 'database.js'), 'utf8');
    vm.runInContext(dbCode, context);
    return context;
}

test('SahabatiDB: order creation defaults to pending_payment with paymentConfirmed=false', async () => {
    const ctx = await createDatabaseContext();
    const db = ctx.SahabatiDB;
    assert.ok(db, 'SahabatiDB must be defined');

    const order = db.createOrder({
        id: 'LYD-100001',
        date: '2026-10-01 12:00',
        items: [{ titleAr: 'اشتراك شاهد VIP', quantity: 1, priceLYD: 25 }],
        paymentMethod: 'one_pay',
        customerPhone: '0912345678',
        totalFormatted: '25.00 د.ل'
    });

    assert.equal(order.id, 'LYD-100001');
    assert.equal(order.status, 'pending_payment');
    assert.equal(order.paymentConfirmed, false);

    const stats = db.getOrderStats();
    assert.equal(stats.total, 1);
    assert.equal(stats.pending, 1);
    assert.equal(stats.paid, 0);
});

test('SahabatiDB: confirmOrderPayment unlocks credentials and updates statistics', async () => {
    const ctx = await createDatabaseContext();
    const db = ctx.SahabatiDB;

    const order = db.createOrder({
        id: 'LYD-100002',
        date: '2026-10-01 12:30',
        items: [{ titleAr: 'اشتراك نتفليكس بريميوم', quantity: 1, priceLYD: 45 }],
        paymentMethod: 'telecom_libyana',
        customerPhone: '0920001122',
        cardCode13: '1234567890123',
        totalFormatted: '45.00 د.ل'
    });

    assert.equal(order.status, 'pending_payment');

    const confirmed = db.confirmOrderPayment('LYD-100002', {
        username: 'user@netflix.ly',
        password: 'SuperSecretPassword2026',
        pin: '4455',
        notes: 'شاشة رقم 2 - يرجى عدم تغيير كلمة السر'
    });

    assert.equal(confirmed.status, 'paid');
    assert.equal(confirmed.paymentConfirmed, true);
    assert.equal(confirmed.accountDetails.username, 'user@netflix.ly');
    assert.equal(confirmed.accountDetails.password, 'SuperSecretPassword2026');
    assert.equal(confirmed.accountDetails.pin, '4455');
    assert.equal(confirmed.accountDetails.notes, 'شاشة رقم 2 - يرجى عدم تغيير كلمة السر');

    const stats = db.getOrderStats();
    assert.equal(stats.total, 1);
    assert.equal(stats.pending, 0);
    assert.equal(stats.paid, 1);
    assert.equal(stats.totalRevenueLYD, 45);
});

test('SahabatiDB: cancelOrder updates order status to cancelled', async () => {
    const ctx = await createDatabaseContext();
    const db = ctx.SahabatiDB;

    db.createOrder({
        id: 'LYD-100003',
        date: '2026-10-01 13:00',
        items: [{ titleAr: 'ببجي 60 شدة', quantity: 1, priceLYD: 10 }],
        paymentMethod: 'telecom_madar',
        customerPhone: '0919998877',
        totalFormatted: '10.00 د.ل'
    });

    const cancelled = db.cancelOrder('LYD-100003', 'كود الكارت غير صالح');
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(cancelled.cancelReason, 'كود الكارت غير صالح');

    const stats = db.getOrderStats();
    assert.equal(stats.total, 1);
    assert.equal(stats.cancelled, 1);
    assert.equal(stats.pending, 0);
    assert.equal(stats.paid, 0);
});

test('SahabatiDB: vault codes stay hidden until payment and return to stock on cancel', async () => {
    const ctx = await createDatabaseContext();
    const db = ctx.SahabatiDB;
    const item = [{ type: 'giftcard', cardId: 'apple_itunes_10_us', titleAr: 'بطاقة آيتونز 10$', quantity: 1, priceLYD: 30 }];
    db.addBatchCodes({ productId: 'apple_itunes_10_us', brand: 'apple', productName: 'آيتونز 10$' }, 'REAL-ITUNES-CODE-1|1234');

    const order = db.createOrder({ id: 'LYD-200001', items: item, totalFormatted: '30.00 د.ل' });
    assert.equal(order.vouchers[0].voucherCode, '', 'real code must not be copied into an unpaid order');
    assert.equal(order.accountDetails, null);
    assert.equal(db.getAllCodes().find(c => c.id === order.vouchers[0].codeId).status, 'reserved');

    const paid = db.confirmOrderPayment('LYD-200001');
    assert.equal(paid.vouchers[0].voucherCode, 'REAL-ITUNES-CODE-1');
    assert.equal(paid.vouchers[0].pin, '1234');
    assert.equal(db.getAllCodes().find(c => c.id === paid.vouchers[0].codeId).status, 'sold');
    assert.throws(() => db.cancelOrder('LYD-200001'));

    const ctx2 = await createDatabaseContext();
    const db2 = ctx2.SahabatiDB;
    db2.addBatchCodes({ productId: 'apple_itunes_10_us', brand: 'apple', productName: 'آيتونز 10$' }, 'REAL-ITUNES-CODE-2');
    const o2 = db2.createOrder({ id: 'LYD-200002', items: item, totalFormatted: '30.00 د.ل' });
    db2.cancelOrder('LYD-200002', 'لم يتم الدفع');
    assert.equal(db2.getAllCodes().find(c => c.id === o2.vouchers[0].codeId).status, 'available');
    assert.throws(() => db2.confirmOrderPayment('LYD-200002'));
});

test('SahabatiDB: starts with no demo codes; codes go only to their product; games never take codes', async () => {
    const ctx = await createDatabaseContext();
    const db = ctx.SahabatiDB;
    assert.equal(db.getAllCodes().length, 0, 'vault starts empty');
    db.addBatchCodes({ productId: 'apple_itunes_10_us', brand: 'apple', productName: 'آيتونز أمريكي' }, 'US-CODE-1');
    const tr = db.createOrder({ id: 'LYD-300001', items: [{ type: 'giftcard', cardId: 'apple_itunes_tr_100', titleAr: 'بطاقة آيتونز تركي', quantity: 1 }] });
    assert.ok(!tr.vouchers[0].codeId, 'Turkish order must not get the US code');
    const pubg = db.createOrder({ id: 'LYD-300002', items: [{ type: 'game', gameId: 'pubg', packageId: 'pubg_325', titleAr: 'ببجي - 325 شدة', quantity: 1 }] });
    assert.ok(!pubg.vouchers[0].codeId && pubg.vouchers[0].voucherCode === '', 'ID top-ups never take vault codes');
    const us = db.createOrder({ id: 'LYD-300003', items: [{ type: 'giftcard', cardId: 'apple_itunes_10_us', titleAr: 'بطاقة آيتونز أمريكي', quantity: 1 }] });
    assert.ok(us.vouchers[0].codeId);
    // ID top-up confirmed with a message only
    const done = db.confirmOrderPayment('LYD-300002', { notes: 'تم شحن 325 شدة' });
    assert.equal(done.accountDetails.notes, 'تم شحن 325 شدة');
    assert.equal(done.vouchers[0].voucherCode, '');
});

test('SahabatiDB: demo codes and demo user are removed from an existing database, sold codes kept', async () => {
    const seeded = { version: '2.0.0', users: [{ id: 'usr_demo_01', name: 'x' }], orders: [], voucher_codes: [
        { id: 'vc_pubg_60_01', status: 'available', code: 'DEMO' },
        { id: 'vc_itunes_10_01', status: 'sold', code: 'DEMO-SOLD', assignedOrderId: 'LYD-1' },
        { id: 'vc_real', status: 'available', code: 'REAL' }
    ] };
    const mem = { sahabati_database_v2: JSON.stringify(seeded) };
    const context = vm.createContext({ console, Date, Math, JSON, parseFloat, String, Array,
        localStorage: { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
        sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
    context.window = context;
    vm.runInContext(await fs.readFile(path.join(__dirname, '..', 'js', 'database.js'), 'utf8'), context);
    const ids = JSON.stringify(context.SahabatiDB.getAllCodes().map(c => c.id).sort());
    assert.equal(ids, JSON.stringify(['vc_itunes_10_01', 'vc_real']));
    assert.equal(context.SahabatiDB.getAllUsers().length, 0);
});

test('SahabatiDB: customer orders are strictly isolated between accounts', async () => {
    const ctx = await createDatabaseContext();
    const db = ctx.SahabatiDB;

    // Register User A
    const userA = await db.registerUser({ name: 'أحمد علي', phone: '0912223344', password: 'pass1234' });
    const orderA1 = db.createOrder({
        id: 'LYD-A01',
        customerPhone: '0912223344',
        paymentMethod: 'lypay',
        transferRef: 'REF-A-01',
        items: [{ titleAr: 'ببجي 60 شدة', quantity: 1, priceLYD: 10 }]
    });

    // Verify User A orders
    assert.equal(db.getOrdersForCustomer(userA).length, 1);
    assert.equal(db.getOrdersForCustomer(userA)[0].id, 'LYD-A01');

    // User A logs out
    db.logout();
    assert.equal(db.getCurrentUser(), null);

    // Register User B
    const userB = await db.registerUser({ name: 'سالم عمر', phone: '0925556677', password: 'pass5678' });
    assert.equal(userB.id !== userA.id, true);

    // User B must have 0 orders
    const ordersB = db.getOrdersForCustomer(userB);
    assert.equal(ordersB.length, 0, 'New customer B must have zero orders and must not see customer A orders');

    // User B creates an order
    const orderB1 = db.createOrder({
        id: 'LYD-B01',
        customerPhone: '0925556677',
        paymentMethod: 'onepay',
        transferRef: 'REF-B-01',
        items: [{ titleAr: 'فري فاير 100 جوهرة', quantity: 1, priceLYD: 8 }]
    });

    // Verify isolation: User A sees only order A, User B sees only order B
    const userAOrders = db.getOrdersForCustomer(userA);
    const userBOrders = db.getOrdersForCustomer(userB);
    assert.equal(userAOrders.length, 1);
    assert.equal(userAOrders[0].id, 'LYD-A01');
    assert.equal(userBOrders.length, 1);
    assert.equal(userBOrders[0].id, 'LYD-B01');
});
