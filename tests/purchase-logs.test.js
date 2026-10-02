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
    const item = [{ titleAr: 'بطاقة آيتونز 10$', quantity: 1, priceLYD: 30 }];

    const order = db.createOrder({ id: 'LYD-200001', items: item, totalFormatted: '30.00 د.ل' });
    assert.equal(order.vouchers[0].voucherCode, '', 'real code must not be copied into an unpaid order');
    assert.equal(order.accountDetails, null);
    assert.equal(db.getAllCodes().find(c => c.id === order.vouchers[0].codeId).status, 'reserved');

    const paid = db.confirmOrderPayment('LYD-200001');
    assert.equal(paid.vouchers[0].voucherCode, 'XX78-9921-ITUNES-10USD-LY');
    assert.equal(db.getAllCodes().find(c => c.id === paid.vouchers[0].codeId).status, 'sold');
    assert.throws(() => db.cancelOrder('LYD-200001'));

    const ctx2 = await createDatabaseContext();
    const db2 = ctx2.SahabatiDB;
    const o2 = db2.createOrder({ id: 'LYD-200002', items: item, totalFormatted: '30.00 د.ل' });
    db2.cancelOrder('LYD-200002', 'لم يتم الدفع');
    assert.equal(db2.getAllCodes().find(c => c.id === o2.vouchers[0].codeId).status, 'available');
    assert.throws(() => db2.confirmOrderPayment('LYD-200002'));
});
