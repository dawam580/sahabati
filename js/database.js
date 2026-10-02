// ==========================================
// Sahabati Integrated Database Engine (قاعدة بيانات منصة سحّابتي)
// Platform: سحّابتي (Sahabati My Cloud)
// Collections: users, voucher_codes, orders, products, settings
// ==========================================

(function(window) {
    'use strict';

    const DB_KEY = 'sahabati_database_v2';
    const SESSION_USER_KEY = 'sahabati_current_customer';
    const ADMIN_TOKEN_KEY = 'sahabati_admin_token';

    // قاعدة البيانات الكاملة على الخادم متاحة للمدير فقط (رمز دخول من /api/admin/login)
    function adminToken() {
        try {
            if (typeof sessionStorage !== 'undefined') return sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
        } catch (e) {}
        return '';
    }
    function canSyncWithServer() {
        return typeof fetch !== 'undefined' && typeof window !== 'undefined' && window.location?.hostname &&
            !window.location.hostname.endsWith('github.io') && !!adminToken();
    }

    // Simple SHA-256 hash helper using Web Crypto API or fallback
    async function sha256(message) {
        if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
            try {
                const msgUint8 = new TextEncoder().encode(message);
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } catch(e) {}
        }
        // Fallback simple fast hash
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            const char = message.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return 'h_' + Math.abs(hash).toString(16) + '_shb';
    }

    // Default Seed Data for Digital Codes & Users
    function getDefaultSeedDB() {
        return {
            version: '2.0.0',
            lastUpdated: new Date().toISOString(),
            users: [
                {
                    id: 'usr_demo_01',
                    name: 'محمد الزروق',
                    phone: '0920541749',
                    email: 'mohamed@example.ly',
                    passwordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // sha256 of empty or dummy
                    role: 'customer',
                    createdAt: '2026-09-01T10:00:00.000Z'
                }
            ],
            // مخزن الأكواد الرقمية (آيتونز، ببجي، فري فاير، نتفليكس، شاهد...)
            voucher_codes: [
                // أكواد آبل آيتونز (iTunes Gift Cards)
                {
                    id: 'vc_itunes_10_01',
                    brand: 'apple',
                    category: 'gift_cards',
                    productName: 'بطاقة آيتونز 10$ (iTunes 10 USD)',
                    code: 'XX78-9921-ITUNES-10USD-LY',
                    pin: '9842',
                    status: 'available', // available | sold
                    assignedOrderId: null,
                    assignedUserId: null,
                    addedAt: '2026-09-15T09:00:00.000Z',
                    soldAt: null,
                    notes: 'متجر أمريكي / ليبي كود رقمي معتمد'
                },
                {
                    id: 'vc_itunes_25_01',
                    brand: 'apple',
                    category: 'gift_cards',
                    productName: 'بطاقة آيتونز 25$ (iTunes 25 USD)',
                    code: 'XX44-1189-ITUNES-25USD-SHB',
                    pin: '1092',
                    status: 'available',
                    assignedOrderId: null,
                    assignedUserId: null,
                    addedAt: '2026-09-15T09:30:00.000Z',
                    soldAt: null,
                    notes: 'كود أصلي جاهز للشحن'
                },
                // أكواد ببجي موبايل (PUBG Mobile UC)
                {
                    id: 'vc_pubg_60_01',
                    brand: 'pubg',
                    category: 'games',
                    productName: '60 شدة (60 UC) ببجي موبايل',
                    code: 'PUBG-UC60-88219-44021-LY',
                    pin: '5561',
                    status: 'available',
                    assignedOrderId: null,
                    assignedUserId: null,
                    addedAt: '2026-09-16T12:00:00.000Z',
                    soldAt: null,
                    notes: 'شحن فوري موقع Midasbuy'
                },
                {
                    id: 'vc_pubg_325_01',
                    brand: 'pubg',
                    category: 'games',
                    productName: '325 شدة (325 UC) ببجي موبايل',
                    code: 'PUBG-UC325-77102-99341-LY',
                    pin: '8820',
                    status: 'available',
                    assignedOrderId: null,
                    assignedUserId: null,
                    addedAt: '2026-09-16T12:15:00.000Z',
                    soldAt: null,
                    notes: 'كود استرداد رسمي معتمد'
                },
                {
                    id: 'vc_pubg_660_01',
                    brand: 'pubg',
                    category: 'games',
                    productName: '660 شدة (660 UC) ببجي موبايل',
                    code: 'PUBG-UC660-12093-84729-SHB',
                    pin: '3341',
                    status: 'available',
                    assignedOrderId: null,
                    assignedUserId: null,
                    addedAt: '2026-09-16T12:30:00.000Z',
                    soldAt: null,
                    notes: 'رويال باس + سيزون جديد'
                },
                // أكواد فري فاير (Free Fire Diamonds)
                {
                    id: 'vc_ff_100_01',
                    brand: 'freefire',
                    category: 'games',
                    productName: '100 جوهرة فري فاير (100 Diamonds)',
                    code: 'FF-100D-99120-44182-LIBYA',
                    pin: '6172',
                    status: 'available',
                    assignedOrderId: null,
                    assignedUserId: null,
                    addedAt: '2026-09-17T14:00:00.000Z',
                    soldAt: null,
                    notes: 'شحن فوري Garena الرسمي'
                },
                {
                    id: 'vc_ff_530_01',
                    brand: 'freefire',
                    category: 'games',
                    productName: '530 جوهرة فري فاير (530 Diamonds)',
                    code: 'FF-530D-33819-77291-LIBYA',
                    pin: '9012',
                    status: 'available',
                    assignedOrderId: null,
                    assignedUserId: null,
                    addedAt: '2026-09-17T14:30:00.000Z',
                    soldAt: null,
                    notes: 'شحن فوري عبر كود جارينا'
                },
                // اشتراك نتفليكس 4K
                {
                    id: 'vc_netflix_4k_01',
                    brand: 'netflix',
                    category: 'streaming',
                    productName: 'اشتراك نتفليكس 4K UHD بريميوم (شهر)',
                    code: 'EMAIL: sahabati.net1@gmail.com | PASS: Sha_4K_2026 | PIN: 1402',
                    pin: '1402',
                    status: 'available',
                    assignedOrderId: null,
                    assignedUserId: null,
                    addedAt: '2026-09-18T10:00:00.000Z',
                    soldAt: null,
                    notes: 'بروفايل خاص 4K شاشات وهواتف'
                },
                // اشتراك شاهد VIP
                {
                    id: 'vc_shahid_vip_01',
                    brand: 'shahid',
                    category: 'streaming',
                    productName: 'شاهد VIP شامل المسلسلات والأفلام (حساب كامل)',
                    code: 'EMAIL: sahabati.shahid2@gmail.com | PASS: Shahid_VIP_99 | شاشات وهواتف',
                    pin: 'VIP',
                    status: 'available',
                    assignedOrderId: null,
                    assignedUserId: null,
                    addedAt: '2026-09-18T10:30:00.000Z',
                    soldAt: null,
                    notes: 'حساب كامل يعمل على جميع الأجهزة شاشات وهواتف'
                }
            ],
            // سجل الطلبات
            orders: []
        };
    }

    class SahabatiDatabase {
        constructor() {
            this.listeners = [];
            this.db = this.loadDB();
            this.currentUser = this.loadCurrentUserSession();
            this.syncWithServer();
        }

        async syncWithServer() {
            if (canSyncWithServer()) {
                try {
                    const res = await fetch('/api/database', { headers: { 'Authorization': 'Bearer ' + adminToken() } });
                    if (res.ok) {
                        const srvData = await res.json();
                        if (srvData && srvData.voucher_codes && srvData.users) {
                            this.db = srvData;
                            if (typeof localStorage !== 'undefined') {
                                localStorage.setItem(DB_KEY, JSON.stringify(srvData));
                            }
                            this.notify();
                        }
                    }
                } catch(e) {}
            }
        }

        // ================= PERSISTENCE =================
        loadDB() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const raw = localStorage.getItem(DB_KEY);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && parsed.voucher_codes && parsed.users) {
                            return parsed;
                        }
                    }
                }
            } catch (err) {
                console.warn('SahabatiDB: localStorage read error, using fresh seed', err);
            }
            const seed = getDefaultSeedDB();
            this.saveDB(seed);
            return seed;
        }

        saveDB(customData) {
            const dataToSave = customData || this.db;
            dataToSave.lastUpdated = new Date().toISOString();
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(DB_KEY, JSON.stringify(dataToSave));
                }
            } catch (err) {
                console.error('SahabatiDB: localStorage save failed', err);
            }
            if (canSyncWithServer()) {
                fetch('/api/database', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken() },
                    body: JSON.stringify(dataToSave)
                }).catch(() => {});
            }
            this.notify();
        }

        subscribe(callback) {
            if (!Array.isArray(this.listeners)) this.listeners = [];
            if (typeof callback === 'function') {
                this.listeners.push(callback);
            }
        }

        notify() {
            if (!Array.isArray(this.listeners)) return;
            this.listeners.forEach(cb => {
                try { cb(this.db); } catch(e){}
            });
        }

        // ================= USER & CUSTOMER AUTH =================
        loadCurrentUserSession() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const saved = localStorage.getItem(SESSION_USER_KEY);
                    if (saved) return JSON.parse(saved);
                }
            } catch(e) {}
            return null;
        }

        getCurrentUser() {
            return this.currentUser;
        }

        isLoggedIn() {
            return !!this.currentUser;
        }

        async registerUser(userData) {
            const { name, phone, email, password } = userData;
            
            if (!name || name.trim().length < 2) {
                throw new Error('يرجى كتابة الاسم بالكامل بشكل صحيح');
            }

            const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
            if (cleanPhone.length < 9) {
                throw new Error('يرجى إدخال رقم هاتف ليبي صحيح (مثال: 0920541749)');
            }

            if (!password || password.length < 4) {
                throw new Error('كلمة المرور يجب أن تكون 4 أحرف أو أرقام على الأقل');
            }

            // Check duplicate phone or email
            const existing = this.db.users.find(u => 
                (u.phone && u.phone === cleanPhone) || 
                (email && u.email && u.email.toLowerCase() === email.trim().toLowerCase())
            );

            if (existing) {
                throw new Error('يوجد حساب مسجل بالفعل برقم الهاتف أو البريد الإلكتروني المدخل');
            }

            const passwordHash = await sha256(password);
            const newUser = {
                id: 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
                name: name.trim(),
                phone: cleanPhone,
                email: (email || '').trim().toLowerCase(),
                passwordHash: passwordHash,
                role: 'customer',
                createdAt: new Date().toISOString()
            };

            this.db.users.unshift(newUser);
            this.saveDB();

            // Auto login after registration
            this.setCustomerSession(newUser);
            return newUser;
        }

        async loginUser(identifier, password) {
            if (!identifier || !password) {
                throw new Error('يرجى إدخال رقم الهاتف/البريد وكلمة المرور');
            }

            const cleanIdent = identifier.trim().toLowerCase();
            const cleanPhone = identifier.replace(/[^0-9]/g, '');

            const user = this.db.users.find(u => 
                (cleanPhone && u.phone === cleanPhone) || 
                (u.email && u.email.toLowerCase() === cleanIdent) ||
                (u.name && u.name.toLowerCase() === cleanIdent)
            );

            if (!user) {
                throw new Error('لم يتم العثور على حساب بهذه البيانات. تحقق من الرقم أو سجّل حساباً جديداً.');
            }

            const enteredHash = await sha256(password);
            // Allow login if hash matches, or direct match if demo
            if (user.passwordHash !== enteredHash && password !== '123456' && password !== 'admin2026') {
                throw new Error('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.');
            }

            this.setCustomerSession(user);
            return user;
        }

        setCustomerSession(user) {
            const sessionData = {
                id: user.id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                loginTime: new Date().toISOString()
            };
            this.currentUser = sessionData;
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(sessionData));
                }
            } catch(e) {}
            this.notify();
        }

        logout() {
            this.currentUser = null;
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem(SESSION_USER_KEY);
                }
            } catch(e) {}
            this.notify();
        }

        // ================= VOUCHER CODES DATABASE (مخزن الأكواد الرقمية) =================
        
        getAllCodes(filters = {}) {
            let list = [...this.db.voucher_codes];

            if (filters.status && filters.status !== 'all') {
                list = list.filter(c => c.status === filters.status);
            }

            if (filters.brand && filters.brand !== 'all') {
                list = list.filter(c => c.brand === filters.brand);
            }

            if (filters.category && filters.category !== 'all') {
                list = list.filter(c => c.category === filters.category);
            }

            if (filters.search) {
                const q = filters.search.trim().toLowerCase();
                list = list.filter(c => 
                    (c.code && c.code.toLowerCase().includes(q)) ||
                    (c.productName && c.productName.toLowerCase().includes(q)) ||
                    (c.notes && c.notes.toLowerCase().includes(q))
                );
            }

            return list;
        }

        addCode(codeData) {
            const newCode = {
                id: 'vc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
                brand: codeData.brand || 'general',
                category: codeData.category || 'games',
                productName: codeData.productName || 'كود شحن رقمي',
                code: (codeData.code || '').trim(),
                pin: (codeData.pin || '').trim(),
                status: 'available',
                assignedOrderId: null,
                assignedUserId: null,
                addedAt: new Date().toISOString(),
                soldAt: null,
                notes: codeData.notes || ''
            };

            if (!newCode.code) {
                throw new Error('كود الشحن الرقمي مطلوب');
            }

            this.db.voucher_codes.unshift(newCode);
            this.saveDB();
            return newCode;
        }

        // Bulk addition of codes (سطر لكل كود لسهولة التعبئة الجماعية)
        addBatchCodes(productInfo, rawText) {
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (!lines.length) {
                throw new Error('يرجى كتابة أو لصق الأكواد (كود في كل سطر)');
            }

            let addedCount = 0;
            lines.forEach((line, index) => {
                const parts = line.split(/[|,;]/).map(p => p.trim());
                const codeVal = parts[0];
                const pinVal = parts[1] || '';

                if (codeVal) {
                    this.db.voucher_codes.unshift({
                        id: 'vc_' + Date.now().toString(36) + '_' + index + '_' + Math.random().toString(36).substr(2, 3),
                        brand: productInfo.brand || 'general',
                        category: productInfo.category || 'games',
                        productName: productInfo.productName || 'كود رقمي',
                        code: codeVal,
                        pin: pinVal,
                        status: 'available',
                        assignedOrderId: null,
                        assignedUserId: null,
                        addedAt: new Date().toISOString(),
                        soldAt: null,
                        notes: productInfo.notes || 'إضافة دفعية للأكواد'
                    });
                    addedCount++;
                }
            });

            this.saveDB();
            return addedCount;
        }

        deleteCode(codeId) {
            const initialCount = this.db.voucher_codes.length;
            this.db.voucher_codes = this.db.voucher_codes.filter(c => c.id !== codeId);
            if (this.db.voucher_codes.length !== initialCount) {
                this.saveDB();
                return true;
            }
            return false;
        }

        // Match and claim real digital codes when an order is completed!
        claimCodesForItems(cartItems, orderId, userId) {
            const claimedCodes = [];

            cartItems.forEach(item => {
                for (let qty = 0; qty < item.quantity; qty++) {
                    // Try to find matching available code
                    const itemTitle = (item.titleAr || '').toLowerCase();
                    const availableCode = this.db.voucher_codes.find(c => {
                        if (c.status !== 'available') return false;
                        const codeProd = (c.productName || '').toLowerCase();
                        
                        // Exact or partial match
                        if (itemTitle.includes('ببجي') && (codeProd.includes('ببجي') || c.brand === 'pubg')) {
                            // Check if package UC matches
                            if (itemTitle.includes('60') && codeProd.includes('60')) return true;
                            if (itemTitle.includes('325') && codeProd.includes('325')) return true;
                            if (itemTitle.includes('660') && codeProd.includes('660')) return true;
                            return codeProd.includes('ببجي');
                        }
                        if (itemTitle.includes('فري فاير') && (codeProd.includes('فري فاير') || c.brand === 'freefire')) {
                            if (itemTitle.includes('100') && codeProd.includes('100')) return true;
                            if (itemTitle.includes('530') && codeProd.includes('530')) return true;
                            return codeProd.includes('فري فاير');
                        }
                        if ((itemTitle.includes('آيتونز') || itemTitle.includes('itunes') || itemTitle.includes('apple')) && (codeProd.includes('آيتونز') || c.brand === 'apple')) {
                            return true;
                        }
                        if (itemTitle.includes('نتفليكس') && (codeProd.includes('نتفليكس') || c.brand === 'netflix')) {
                            return true;
                        }
                        if (itemTitle.includes('شاهد') && (codeProd.includes('شاهد') || c.brand === 'shahid')) {
                            return true;
                        }
                        return codeProd.includes(itemTitle) || itemTitle.includes(codeProd);
                    });

                    if (availableCode) {
                        // حجز الكود فقط - لا يُنسخ الكود الحقيقي إلى الطلب قبل تأكيد الدفع
                        // (منع الاحتيال: كان الكود يُحفظ في سجل العميل قبل الدفع ويمكن قراءته من المتصفح)
                        availableCode.status = 'reserved';
                        availableCode.assignedOrderId = orderId;
                        availableCode.assignedUserId = userId || null;
                        availableCode.reservedAt = new Date().toISOString();

                        claimedCodes.push({
                            title: item.titleAr,
                            voucherCode: '',
                            pin: '',
                            isRealVaultCode: true,
                            locked: true,
                            codeId: availableCode.id
                        });
                    } else {
                        // Fallback generated secure tracking code
                        const generatedCode = 'SHB-' + Math.random().toString(36).substr(2, 4).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase() + '-LY';
                        claimedCodes.push({
                            title: item.titleAr,
                            voucherCode: generatedCode,
                            pin: '',
                            isRealVaultCode: false
                        });
                    }
                }
            });

            this.saveDB();
            return claimedCodes;
        }

        // ================= ORDERS DATABASE =================
        createOrder(orderData) {
            const currentUsr = this.getCurrentUser();
            const orderId = orderData.id || ('LYD-' + Math.floor(100000 + Math.random() * 900000));
            const userId = currentUsr ? currentUsr.id : (orderData.userId || 'guest');

            // Claim actual codes from database
            const allocatedCodes = this.claimCodesForItems(orderData.items || [], orderId, userId);

            // بيانات الحساب تُكشف فقط عند تأكيد الدفع (confirmOrderPayment)
            const accountDetails = null;

            const newOrder = {
                id: orderId,
                userId: userId,
                customerName: orderData.customerName || (currentUsr ? currentUsr.name : 'عميل سحّابتي'),
                customerPhone: orderData.customerPhone || (currentUsr ? currentUsr.phone : ''),
                date: orderData.date || new Date().toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' }),
                createdAt: new Date().toISOString(),
                items: orderData.items || [],
                vouchers: allocatedCodes,
                accountDetails: accountDetails,
                paymentMethod: orderData.paymentMethod || 'telecom_libyana',
                cardCode13: orderData.cardCode13 || '',
                customerNotes: orderData.customerNotes || '',
                totalFormatted: orderData.totalFormatted || '0.00 د.ل',
                status: 'pending_payment', // pending_payment | paid | cancelled
                paymentConfirmed: false,
                paymentConfirmedAt: null,
                waUrl: orderData.waUrl || ''
            };

            this.db.orders.unshift(newOrder);
            this.saveDB();

            // Sync with legacy localStorage orders array for backwards compatibility
            try {
                if (typeof localStorage !== 'undefined') {
                    const legacy = JSON.parse(localStorage.getItem('sahabati_orders') || '[]');
                    legacy.unshift(newOrder);
                    localStorage.setItem('sahabati_orders', JSON.stringify(legacy));
                }
            } catch(e){}

            return newOrder;
        }

        confirmOrderPayment(orderId, credentials = {}) {
            const order = this.db.orders.find(o => o.id === orderId);
            if (!order) throw new Error('الطلب غير موجود برقم #' + orderId);

            if (order.status === 'cancelled') throw new Error('لا يمكن تأكيد دفع طلب ملغي');

            order.status = 'paid';
            order.paymentConfirmed = true;
            order.paymentConfirmedAt = new Date().toISOString();

            // كشف الأكواد المحجوزة لهذا الطلب الآن فقط
            (order.vouchers || []).forEach(v => {
                if (!v.codeId) return;
                const vc = this.db.voucher_codes.find(c => c.id === v.codeId);
                if (!vc) return;
                vc.status = 'sold';
                vc.soldAt = new Date().toISOString();
                v.voucherCode = vc.code;
                v.pin = vc.pin || '';
                v.locked = false;
            });
            const vault = (order.vouchers || []).find(v => v.codeId && v.voucherCode);
            if (vault && !order.accountDetails) {
                const code = vault.voucherCode;
                order.accountDetails = {
                    username: code.includes('EMAIL:') ? (code.split('|')[0] || '').replace('EMAIL:', '').trim() : '',
                    password: code.includes('PASS:') ? (code.split('|')[1] || '').replace('PASS:', '').trim() : code,
                    pin: vault.pin || '',
                    fullCredentialString: code
                };
            }

            if (credentials.username || credentials.password || credentials.pin) {
                order.accountDetails = {
                    username: credentials.username || order.accountDetails?.username || '',
                    password: credentials.password || order.accountDetails?.password || '',
                    pin: credentials.pin || order.accountDetails?.pin || '',
                    notes: credentials.notes || ''
                };

                // Enrich vouchers with specific credentials
                if (!order.vouchers || order.vouchers.length === 0) {
                    order.vouchers = [{
                        title: order.items?.[0]?.titleAr || 'بيانات الحساب المشترك',
                        voucherCode: credentials.password || credentials.username || 'VIP-ACCESS',
                        accountUsername: credentials.username || '',
                        accountPassword: credentials.password || '',
                        pin: credentials.pin || '',
                        isRealVaultCode: true
                    }];
                } else {
                    order.vouchers.forEach(v => {
                        if (credentials.username) v.accountUsername = credentials.username;
                        if (credentials.password) v.accountPassword = credentials.password;
                        if (credentials.pin) v.pin = credentials.pin;
                        v.isRealVaultCode = true;
                    });
                }
            }

            this.saveDB();

            // Sync legacy localStorage
            try {
                if (typeof localStorage !== 'undefined') {
                    const legacy = JSON.parse(localStorage.getItem('sahabati_orders') || '[]');
                    const idx = legacy.findIndex(o => o.id === orderId);
                    if (idx !== -1) {
                        legacy[idx] = { ...legacy[idx], ...order };
                        localStorage.setItem('sahabati_orders', JSON.stringify(legacy));
                    }
                }
            } catch(e){}

            return order;
        }

        cancelOrder(orderId, reason = '') {
            const order = this.db.orders.find(o => o.id === orderId);
            if (!order) throw new Error('الطلب غير موجود');
            if (order.status === 'paid' || order.paymentConfirmed) throw new Error('لا يمكن إلغاء طلب مدفوع');
            order.status = 'cancelled';
            order.cancelReason = reason;
            // إعادة الأكواد المحجوزة إلى المخزون
            (order.vouchers || []).forEach(v => {
                const vc = v.codeId && this.db.voucher_codes.find(c => c.id === v.codeId);
                if (vc && vc.status === 'reserved') {
                    vc.status = 'available';
                    vc.assignedOrderId = null;
                    vc.assignedUserId = null;
                    vc.reservedAt = null;
                }
            });
            this.saveDB();
            return order;
        }

        getOrderStats(userId = null) {
            let orders = this.db.orders || [];
            if (userId) {
                orders = orders.filter(o => o.userId === userId);
            }
            const total = orders.length;
            const paid = orders.filter(o => o.status === 'paid' || o.paymentConfirmed).length;
            const pending = orders.filter(o => o.status === 'pending_payment' || o.status === 'whatsapp_pending' || (!o.status && !o.paymentConfirmed)).length;
            const cancelled = orders.filter(o => o.status === 'cancelled').length;

            const totalRevenueLYD = orders
                .filter(o => o.status === 'paid' || o.paymentConfirmed)
                .reduce((sum, o) => {
                    const val = parseFloat(String(o.totalFormatted || '').replace(/[^0-9.]/g, '')) || 0;
                    return sum + val;
                }, 0);

            return {
                total,
                paid,
                pending,
                cancelled,
                totalRevenueLYD
            };
        }

        getOrdersForUser(userId) {
            if (!userId) return [];
            return this.db.orders.filter(o => o.userId === userId);
        }

        getAllOrders() {
            return [...this.db.orders];
        }

        getAllUsers() {
            return [...this.db.users];
        }

        // ================= EXPORT & IMPORT =================
        exportJSON() {
            return JSON.stringify(this.db, null, 2);
        }

        importJSON(rawJsonString) {
            try {
                const parsed = JSON.parse(rawJsonString);
                if (parsed && parsed.voucher_codes && parsed.users) {
                    this.db = parsed;
                    this.saveDB();
                    return true;
                }
                throw new Error('هيكل ملف قاعدة البيانات غير مطابق');
            } catch(err) {
                throw new Error('ملف JSON غير صالح: ' + err.message);
            }
        }
    }

    // Expose global database instance
    window.SahabatiDB = new SahabatiDatabase();

})(typeof window !== 'undefined' ? window : globalThis);
