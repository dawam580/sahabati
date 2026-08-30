// ==========================================
// Sahabati Store Configuration & Data Store
// Platform: سحّابتي (Sahabati)
// Currency: Libyan Dinar (LYD / د.ل) Strictly
// Compatible with: شاشات - هواتف - جميع الأجهزة
// ==========================================

const DEFAULT_STORE_SETTINGS = {
    whatsappNumber: '218920541749', // رقم واتساب المتجر الجديد 0920541749
    telegramChannel: 'sabh',
    telegramUrl: 'https://t.me/sabh',
    adminPin: 'admin2026',           // Admin dashboard access PIN
    storeNameAr: 'سحّابتي',
    storeNameEn: 'Sahabati Cloud',
    currency: {
        code: 'LYD',
        symbol: 'د.ل',
        name: 'دينار ليبي'
    },
    paymentMethodsInfo: {
        one_pay: {
            title: 'ون باي (OnePay)',
            accountInfo: 'خدمة ون باي - الدفع الإلكتروني الليبي',
            instructions: 'ادفع عبر تطبيق ون باي بالدينار الليبي وأرسل لقطة الشاشة ورقم المعاملة عبر واتساب 0920541749 للتأكيد الفوري.'
        },
        telecom_libyana: {
            title: 'رصيد ليبيانا (Libyana)',
            accountInfo: 'رقم تحويل رصيد ليبيانا: 0920000000',
            instructions: 'حوّل الرصيد مباشرة أو أرسل كود كرت ليبيانا عبر واتساب لتأكيد الشحن فوراً.'
        },
        telecom_madar: {
            title: 'رصيد مدار الجديد (Madar)',
            accountInfo: 'رقم تحويل رصيد مدار: 0910000000',
            instructions: 'حوّل الرصيد مباشرة أو أرسل كود كرت مدار الجديد عبر واتساب لتأكيد الشحن فوراً.'
        },
        bank_transfer: {
            title: 'تحويل مصرفي ليبي',
            accountInfo: 'اسم الحساب: منصة سحّابتي | رقم الحساب: 0123456789012',
            instructions: 'قم بالتحويل المصرفي وأرسل إشعار الخصم عبر واتساب 0920541749.'
        }
    }
};

const DEFAULT_APP_DATA = {
    settings: DEFAULT_STORE_SETTINGS,
    promoCodes: {
        'SAHABATI20': { discountPercent: 20, description: 'خصم سحّابتي الخاص 20%' },
        'LIBYA10': { discountPercent: 10, description: 'خصم الشحن المباشر 10%' },
        'WELCOME': { discountPercent: 15, description: 'خصم الترحيب للزبائن الجدد 15%' }
    },
    categories: [
        {
            id: 'games',
            titleAr: 'شحن ألعاب الفيديو',
            titleEn: 'Game Top-ups',
            subtitleAr: 'ببجي موبايل، فري فاير، كوينز بيس، وروبلوكس بالمعرّف',
            icon: 'fa-gamepad',
            badge: 'شحن فوري بالمعرّف ⚡'
        },
        {
            id: 'streaming',
            titleAr: 'اشتراكات البث والترفيه',
            titleEn: 'Streaming & VOD',
            subtitleAr: 'نتفليكس 4K، شاهد VIP حساب كامل (شاشات وهواتف)',
            icon: 'fa-tv',
            badge: 'شاشات & هواتف 📺'
        },
        {
            id: 'social',
            titleAr: 'سوشيال ميديا وعملات',
            titleEn: 'Social Coins & Plus',
            subtitleAr: 'عملات تيك توك TikTok، وسناب شات بلس Snapchat+',
            icon: 'fa-coins',
            badge: 'تيك توك & سناب 🔥'
        }
    ],
    games: [
        {
            id: 'pubg',
            nameAr: 'ببجي موبايل (PUBG Mobile UC)',
            nameEn: 'PUBG Mobile',
            badge: 'شحن فوري بالمعرّف 🔥',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pubg.png',
            idLabelAr: 'أدخل معرّف اللاعب (Player ID):',
            idPlaceholder: 'مثال: 5123456789',
            packages: [
                { id: 'pubg_60', nameAr: '60 شدة (60 UC)', priceLYD: 10.00, popular: false, icon: 'UC' },
                { id: 'pubg_120', nameAr: '120 شدة (120 UC)', priceLYD: 20.00, popular: false, icon: 'UC' },
                { id: 'pubg_180', nameAr: '180 شدة (180 UC)', priceLYD: 30.00, popular: false, icon: 'UC' },
                { id: 'pubg_325', nameAr: '325 شدة (325 UC)', priceLYD: 50.00, popular: true, icon: 'UC' },
                { id: 'pubg_385', nameAr: '385 شدة (385 UC)', priceLYD: 60.00, popular: false, icon: 'UC' },
                { id: 'pubg_660', nameAr: '660 شدة - الرويال باس (660 UC)', priceLYD: 100.00, popular: true, bestValue: false, icon: '👑' },
                { id: 'pubg_720', nameAr: '720 شدة (720 UC)', priceLYD: 110.00, popular: false, icon: 'UC' },
                { id: 'pubg_1800', nameAr: '1,800 شدة (1800 UC)', priceLYD: 235.00, popular: false, icon: 'UC' },
                { id: 'pubg_1920', nameAr: '1,920 شدة (1920 UC)', priceLYD: 255.00, popular: false, icon: 'UC' },
                { id: 'pubg_3850', nameAr: '3,850 شدة (3850 UC)', priceLYD: 470.00, popular: false, bestValue: true, icon: 'UC' },
                { id: 'pubg_8100', nameAr: '8,100 شدة (8100 UC)', priceLYD: 925.00, popular: true, bestValue: true, icon: 'UC' },
                { id: 'pubg_16200', nameAr: '16,200 شدة (16200 UC)', priceLYD: 1850.00, popular: false, bestValue: true, icon: '🏆' }
            ]
        },
        {
            id: 'freefire',
            nameAr: 'فري فاير (Free Fire Diamonds)',
            nameEn: 'Free Fire',
            badge: 'فوري ⚡',
            icon: '01_photo_5809670474982690366_y.jpg',
            idLabelAr: 'معرف الحساب (Player ID):',
            idPlaceholder: 'مثال: 987654321',
            packages: [
                { id: 'ff_100', nameAr: '100 جوهرة (100 💎)', priceLYD: 10.00, icon: '💎' },
                { id: 'ff_210', nameAr: '210 جوهرة (210 💎)', priceLYD: 20.00, icon: '💎' },
                { id: 'ff_310', nameAr: '310 جوهرة (310 💎)', priceLYD: 30.00, popular: true, icon: '💎' },
                { id: 'ff_530', nameAr: '530 جوهرة (530 💎)', priceLYD: 50.00, popular: true, icon: '💎' },
                { id: 'ff_1080', nameAr: '1,080 جوهرة (1080 💎)', priceLYD: 100.00, bestValue: true, icon: '💎' },
                { id: 'ff_2200', nameAr: '2,200 جوهرة (2200 💎)', priceLYD: 200.00, bestValue: true, icon: '🏆' }
            ]
        },
        {
            id: 'tiktok_coins',
            nameAr: 'عملات تيك توك (TikTok Coins)',
            nameEn: 'TikTok Coins',
            badge: 'شحن يوزر 🎵',
            icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
            idLabelAr: 'اسم مستخدم تيك توك (@Username):',
            idPlaceholder: 'مثال: @username',
            packages: [
                { id: 'tt_100', nameAr: '100 عملة تيك توك', priceLYD: 10.00, icon: '🪙' },
                { id: 'tt_200', nameAr: '200 عملة تيك توك', priceLYD: 20.00, icon: '🪙' },
                { id: 'tt_335', nameAr: '335 عملة تيك توك', priceLYD: 35.00, popular: true, icon: '🪙' },
                { id: 'tt_670', nameAr: '670 عملة تيك توك', priceLYD: 70.00, popular: true, icon: '🪙' },
                { id: 'tt_960', nameAr: '960 عملة تيك توك', priceLYD: 100.00, icon: '🪙' },
                { id: 'tt_1920', nameAr: '1,920 عملة تيك توك', priceLYD: 200.00, icon: '🪙' },
                { id: 'tt_3500', nameAr: '3,500 عملة تيك توك', priceLYD: 365.00, bestValue: true, icon: '🪙' },
                { id: 'tt_7000', nameAr: '7,000 عملة تيك توك', priceLYD: 730.00, bestValue: true, icon: '🪙' },
                { id: 'tt_10000', nameAr: '10,000 عملة تيك توك', priceLYD: 1040.00, bestValue: true, icon: '👑' }
            ]
        },
        {
            id: 'roblox',
            nameAr: 'روبلوكس (Roblox Robux)',
            nameEn: 'Roblox Robux',
            badge: 'خصم 20% 🔥',
            icon: '07_roblox_promotion_banner.png',
            idLabelAr: 'اسم مستخدم روبلوكس (Username):',
            idPlaceholder: 'مثال: RobloxPlayer123',
            packages: [
                { id: 'rb_80', nameAr: '80 Robux رصيد روبلوكس', priceLYD: 10.00, icon: 'R$' },
                { id: 'rb_400', nameAr: '400 Robux رصيد روبلوكس', priceLYD: 35.00, popular: true, icon: 'R$' },
                { id: 'rb_800', nameAr: '800 Robux رصيد روبلوكس', priceLYD: 65.00, bestValue: true, icon: 'R$' },
                { id: 'rb_1700', nameAr: '1,700 Robux رصيد روبلوكس', priceLYD: 130.00, icon: 'R$' }
            ]
        }
    ],
    giftCards: [
        // ================= STREAMING & ENTERTAINMENT =================
        {
            id: 'netflix_4k_1m',
            brand: 'netflix',
            category: 'streaming',
            nameAr: 'اشتراك نتفليكس (Netflix 4K) - شهر واحد',
            nominal: '1 Month - Profile User',
            priceLYD: 45.00,
            badge: 'ملف خاص 4K UHD 🔥',
            type: 'User Profile',
            duration: '1 month',
            quality: '4K Ultra HD',
            instructionsAr: 'ملف شخصي خاص بك بجودة 4K Ultra HD لمدة شهر كامل مع ضمان كامل المدة وتسليم فوري عبر واتساب.'
        },
        {
            id: 'shahid_vip_full',
            brand: 'shahid',
            category: 'streaming',
            nameAr: 'اشتراك شاهد VIP (Shahid VIP) - حساب كامل',
            nominal: 'Full Account - جميع الأجهزة',
            priceLYD: 40.00,
            badge: 'حساب كامل 📺📱',
            type: 'Full Account',
            quality: 'Full HD / 4K',
            instructionsAr: 'حساب كامل خاص بك يعمل على جميع الأجهزة: شاشات التلفزيون الذكية، الهواتف الذكية، والأجهزة اللوحية، يشمل مكتبة المسلسلات والأفلام والرياضة.'
        },
        {
            id: 'snapchat_plus_3m',
            brand: 'snapchat',
            category: 'social',
            nameAr: 'اشتراك سناب شات بلس (Snapchat+) - 3 أشهر',
            nominal: '3 Months Subscription',
            priceLYD: 50.00,
            badge: '3 أشهر 🌟',
            duration: '3 months',
            instructionsAr: 'تفعيل فوري لاشتراك سناب شات بلس لمدة 3 أشهر مع جميع ميزات بلس الحصرية.'
        },
        {
            id: 'snapchat_plus_6m',
            brand: 'snapchat',
            category: 'social',
            nameAr: 'اشتراك سناب شات بلس (Snapchat+) - 6 أشهر',
            nominal: '6 Months Subscription',
            priceLYD: 80.00,
            badge: '6 أشهر (أفضل توفير) ✨',
            duration: '6 months',
            instructionsAr: 'تفعيل فوري لاشتراك سناب شات بلس لمدة 6 أشهر مع جميع ميزات بلس الحصرية.'
        },

        // ================= TIKTOK COINS AS GIFTCARD OPTION =================
        {
            id: 'card_tt_100',
            brand: 'tiktok',
            category: 'social',
            nameAr: '100 عملة تيك توك (TikTok Coins)',
            nominal: '100 Coins',
            priceLYD: 10.00,
            badge: 'شحن فوري',
            instructionsAr: 'شحن مباشر على اسم المستخدم (@Username) الخاص بك على تيك توك فور تأكيد الطلب.'
        },
        {
            id: 'card_tt_335',
            brand: 'tiktok',
            category: 'social',
            nameAr: '335 عملة تيك توك (TikTok Coins)',
            nominal: '335 Coins',
            priceLYD: 35.00,
            badge: 'الأكثر طلباً 🔥',
            instructionsAr: 'شحن مباشر على اسم المستخدم (@Username) الخاص بك على تيك توك فور تأكيد الطلب.'
        },
        {
            id: 'card_tt_670',
            brand: 'tiktok',
            category: 'social',
            nameAr: '670 عملة تيك توك (TikTok Coins)',
            nominal: '670 Coins',
            priceLYD: 70.00,
            badge: 'عرض خاص',
            instructionsAr: 'شحن مباشر على اسم المستخدم (@Username) الخاص بك على تيك توك فور تأكيد الطلب.'
        },
        {
            id: 'card_tt_960',
            brand: 'tiktok',
            category: 'social',
            nameAr: '960 عملة تيك توك (TikTok Coins)',
            nominal: '960 Coins',
            priceLYD: 100.00,
            badge: '100 د.ل ✨',
            instructionsAr: 'شحن مباشر على اسم المستخدم (@Username) الخاص بك على تيك توك فور تأكيد الطلب.'
        },
        {
            id: 'card_tt_1920',
            brand: 'tiktok',
            category: 'social',
            nameAr: '1,920 عملة تيك توك (TikTok Coins)',
            nominal: '1920 Coins',
            priceLYD: 200.00,
            badge: '200 د.ل 🚀',
            instructionsAr: 'شحن مباشر على اسم المستخدم (@Username) الخاص بك على تيك توك فور تأكيد الطلب.'
        },
        {
            id: 'card_tt_3500',
            brand: 'tiktok',
            category: 'social',
            nameAr: '3,500 عملة تيك توك (TikTok Coins)',
            nominal: '3500 Coins',
            priceLYD: 365.00,
            badge: 'أفضل توفير',
            instructionsAr: 'شحن مباشر على اسم المستخدم (@Username) الخاص بك على تيك توك فور تأكيد الطلب.'
        },
        {
            id: 'card_tt_7000',
            brand: 'tiktok',
            category: 'social',
            nameAr: '7,000 عملة تيك توك (TikTok Coins)',
            nominal: '7000 Coins',
            priceLYD: 730.00,
            badge: 'VIP 💎',
            instructionsAr: 'شحن مباشر على اسم المستخدم (@Username) الخاص بك على تيك توك فور تأكيد الطلب.'
        },
        {
            id: 'card_tt_10000',
            brand: 'tiktok',
            category: 'social',
            nameAr: '10,000 عملة تيك توك (TikTok Coins)',
            nominal: '10000 Coins',
            priceLYD: 1040.00,
            badge: 'باقة كبار الشخصيات 👑',
            instructionsAr: 'شحن مباشر على اسم المستخدم (@Username) الخاص بك على تيك توك فور تأكيد الطلب.'
        },

    ]
};

// LocalStorage Persistence Layer - مع ترحيل لإزالة كروت ليبيانا/مدار من البيع (يبقى الدفع فقط)
function loadAppData() {
    try {
        const stored = localStorage.getItem('sahabati_catalog_data');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.games && parsed.giftCards) {
                parsed.settings = { ...DEFAULT_STORE_SETTINGS, ...(parsed.settings || {}) };
                // ترحيل: احذف كروت الاتصالات من البيع (لم يعد يباع) - يبقى الدفع عبر الرصيد فقط
                if (parsed.giftCards.some(c => c.category === 'telecom' || c.id.includes('libyana') || c.id.includes('madar'))) {
                    parsed.giftCards = parsed.giftCards.filter(c => c.category !== 'telecom' && !c.id.includes('libyana') && !c.id.includes('madar'));
                    // احذف فئة telecom من التصنيفات إذا وجدت
                    if (parsed.categories) parsed.categories = parsed.categories.filter(cat => cat.id !== 'telecom');
                    // احفظ الترحيل فوراً
                    try { localStorage.setItem('sahabati_catalog_data', JSON.stringify(parsed)); } catch(e){}
                }
                // تأكد من وجود ون باي في طرق الدفع
                if (!parsed.settings.paymentMethodsInfo.one_pay) {
                    parsed.settings.paymentMethodsInfo.one_pay = JSON.parse(JSON.stringify(DEFAULT_STORE_SETTINGS.paymentMethodsInfo.one_pay));
                    try { localStorage.setItem('sahabati_catalog_data', JSON.stringify(parsed)); } catch(e){}
                }
                // احذف طرق الدفع القديمة المحذوفة (سداد، تداول، كاش) إذا كانت مخزنة
                ['sadad','tadawul','cash','telecom_cards'].forEach(k=>{ if(parsed.settings.paymentMethodsInfo[k]) delete parsed.settings.paymentMethodsInfo[k]; });
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Failed to load stored catalog data, falling back to defaults:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_APP_DATA));
}

function saveAppData(data) {
    try {
        localStorage.setItem('sahabati_catalog_data', JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save app data:', e);
    }
}

let APP_DATA = loadAppData();
