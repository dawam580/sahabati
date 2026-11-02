let paymentProof = null;
let paymentProofReading = false;
let orderSubmitting = false;
let proofSelection = 0;

function usesStaticOrderFlow() {
    return (window.location?.hostname || '').endsWith('.github.io');
}

async function localProofRecord(id, proof) {
    const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('sahabati_payment_proofs', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('proofs');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('تعذر حفظ الصورة في المتصفح. أتح التخزين وحاول مجدداً.'));
    });
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction('proofs', proof ? 'readwrite' : 'readonly');
            const store = tx.objectStore('proofs');
            const request = proof ? store.put(proof, id) : store.get(id);
            tx.oncomplete = () => resolve(request.result);
            tx.onerror = tx.onabort = () => reject(new Error('تعذر حفظ أو قراءة إثبات الدفع. تحقق من مساحة التخزين وحاول مجدداً.'));
        });
    } finally { db.close(); }
}

async function downloadPaymentProof(id) {
    try {
        const proof = await localProofRecord(id);
        if (!proof) throw new Error('الصورة غير موجودة في هذا المتصفح. أرفق الصورة الأصلية من جهازك في واتساب.');
        const link = document.createElement('a');
        link.href = proof.data;
        link.download = proof.name || 'payment-proof.jpg';
        document.body.appendChild(link); link.click(); link.remove();
        showToast('أرفق الصورة التي نزّلتها في محادثة الطلب على واتساب.');
    } catch (error) { showToast(error.message, 'fa-triangle-exclamation'); }
}

function localProofActions(order) {
    return order.localProof ? '<div class="proof-success"><p>الصورة محفوظة في هذا المتصفح فقط. نزّلها وأرفقها في محادثة الطلب على واتساب.</p><button type="button" class="proof-share" onclick="downloadPaymentProof(\'' + escapeOrderText(order.id) + '\')">تنزيل إثبات الدفع</button></div>' : '';
}

document.addEventListener('DOMContentLoaded', () => {
    if (!usesStaticOrderFlow()) return;
    document.getElementById('proof-storage-help').textContent = 'ستُحفظ الصورة في هذا المتصفح فقط. بعد فتح الطلب، نزّلها وأرفقها في محادثة واتساب.';
    document.getElementById('complete-payment-btn').querySelector('span').textContent = 'تجهيز الطلب وفتح واتساب';
});

function clearPaymentProof() {
    proofSelection++;
    paymentProofReading = false;
    paymentProof = null;
    document.getElementById('payment-proof-input').value = '';
    document.getElementById('payment-proof-preview').hidden = true;
    document.getElementById('payment-proof-image').removeAttribute('src');
    document.getElementById('payment-proof-status').textContent = 'JPG، PNG أو WebP · حتى 5 ميجابايت';
}

async function selectPaymentProof(input) {
    const selection = ++proofSelection;
    paymentProofReading = false;
    clearPaymentProofDisplay();
    const file = input.files[0];
    if (!file) { clearPaymentProof(); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) {
        input.value = '';
        document.getElementById('payment-proof-status').textContent = 'اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 5 ميجابايت.';
        return;
    }
    paymentProofReading = true;
    document.getElementById('payment-proof-status').textContent = 'جاري تجهيز الصورة…';
    try {
        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        const img = new Image();
        img.src = data;
        await img.decode();
        if (selection !== proofSelection) return;
        paymentProof = { data, name: file.name };
        document.getElementById('payment-proof-image').src = data;
        document.getElementById('payment-proof-name').textContent = file.name;
        document.getElementById('payment-proof-preview').hidden = false;
        document.getElementById('payment-proof-status').textContent = usesStaticOrderFlow()
            ? 'الصورة جاهزة. أرفقها في واتساب بعد تجهيز الطلب.'
            : 'الصورة جاهزة، ستُحفظ مع طلبك عند الإرسال.';
    } catch {
        if (selection !== proofSelection) return;
        input.value = '';
        document.getElementById('payment-proof-status').textContent = 'تعذر قراءة الصورة. اختر صورة أخرى.';
    } finally { if (selection === proofSelection) paymentProofReading = false; }
}

function clearPaymentProofDisplay() {
    paymentProof = null;
    document.getElementById('payment-proof-preview').hidden = true;
}

function buildOrderMessage(order, now) {
    const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Tripoli', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Tripoli', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
    const lines = ['طلب جديد | سحّابتي ☁️'];
    if (order.customerName) lines.push('العميل: ' + order.customerName);
    lines.push('الهاتف: ' + order.customerPhone);
    order.items.forEach(item => lines.push('المنتج: ' + item.titleAr, 'الكمية: ' + item.quantity));
    lines.push('التاريخ: ' + date, 'الوقت: ' + time);
    return lines.join('\n');
}

async function processPayment() {
    if (orderSubmitting) return;
    if (!state.cart.length) { showToast('أضف منتجات إلى السلة أولاً', 'fa-cart-shopping'); return; }
    const phoneInput = document.getElementById('whatsapp-phone-input');
    const phone = phoneInput.value.trim().replace(/[٠-٩]/g, digit => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit)).replace(/[\s-]/g, '');
    if (!/^0?9\d{8}$/.test(phone)) { showToast('أدخل رقم هاتف ليبي صحيحاً', 'fa-triangle-exclamation'); phoneInput.focus(); return; }
    if (paymentProofReading || !paymentProof) {
        showToast(paymentProofReading ? 'انتظر حتى تصبح الصورة جاهزة' : 'ارفع صورة إثبات الدفع لإتمام الطلب', 'fa-image');
        document.getElementById('payment-proof-input').focus(); return;
    }
    const btn = document.getElementById('complete-payment-btn');
    const originalText = btn.innerHTML;
    const items = state.cart.map(item => ({ ...item }));
    const name = document.getElementById('customer-name-input').value.trim().replace(/[\r\n]+/g, ' ');
    const total = document.getElementById('checkout-total').textContent;
    const paymentMethod = state.paymentMethod;
    orderSubmitting = true;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> حفظ الطلب وإثبات الدفع…';
    // Reserve a tab during the user's click for Safari popup rules.
    let waWin = null;
    try { waWin = window.open('about:blank', '_blank'); } catch { /* The receipt provides a direct link. */ }
    if (waWin) waWin.opener = null;
    try {
        let saved;
        if (usesStaticOrderFlow()) {
            saved = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), localProof: true };
            await localProofRecord(saved.id, paymentProof);
        } else {
        const response = await fetch('/api/orders', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, items, paymentMethod, proof: paymentProof.data }),
            signal: AbortSignal.timeout(45000)
        });
        saved = await response.json();
        if (!response.ok) throw new Error(saved.error || 'تعذر حفظ الطلب. حاول مجدداً.');
        }
        const now = new Date(saved.createdAt);
        const order = {
            id: saved.id, date: now.toLocaleString('ar-LY', { timeZone: 'Africa/Tripoli' }),
            items, vouchers: [], customerName: name, customerPhone: phone, paymentMethod,
            totalFormatted: total, status: 'whatsapp_pending',
            localProof: saved.localProof || false,
            proofUrl: saved.proofPath ? new URL(saved.proofPath, window.location.origin).href : null
        };
        const targetPhone = String(APP_DATA.settings?.whatsappNumber || '218910000000').replace(/\D/g, '');
        order.waUrl = 'https://wa.me/' + targetPhone + '?text=' + encodeURIComponent(buildOrderMessage(order, now));
        if (order.proofUrl) order.proofWaUrl = 'https://wa.me/' + targetPhone + '?text=' + encodeURIComponent('إثبات الدفع | سحّابتي ☁️\nالهاتف: ' + phone + '\n' + order.proofUrl);
        state.orders.unshift(order);
        try { storeSet('sahabati_orders', JSON.stringify(state.orders)); } catch { /* Server copy remains saved. */ }
        state.cart = []; state.appliedPromo = null;
        saveCart(); updateCartUI(); clearPaymentProof();
        showSuccessModal(order);
        if (waWin && !waWin.closed) waWin.location.href = order.waUrl;
        else showToast('تم حفظ طلبك. اضغط فتح واتساب لإرساله.');
    } catch (error) {
        if (waWin && !waWin.closed) waWin.close();
        showToast(error.message || 'تعذر حفظ الطلب. تحقق من الاتصال وحاول مجدداً.', 'fa-triangle-exclamation');
    } finally {
        orderSubmitting = false; btn.disabled = false; btn.innerHTML = originalText;
    }
}
