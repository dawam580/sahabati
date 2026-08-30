// ==========================================
// Sahabati Store Configuration & Data Store
// Currency: Libyan Dinar (LYD / د.ل) Strictly
// ==========================================

const DEFAULT_STORE_SETTINGS = {
    whatsappNumber: '218910000000', // Default store WhatsApp number
    adminPin: 'admin2026',           // Admin dashboard access PIN
    storeNameAr: 'سحابتي',
    storeNameEn: 'Sahabati My Cloud',
    currency: {
        code: 'LYD',
        symbol: 'د.ل',
        name: 'دينار ليبي'
    },
    paymentMethodsInfo: {
        sadad: {
            title: 'خدمة سداد (Sadad)',
            accountInfo: 'رقم هاتف سداد للمتجر: 0910000000',
            instructions: 'قم بتحويل المبلغ بالدينار الليبي عبر تطبيق سداد إلى الرقم أعلاه وإرفاق رقم المعاملة.'
        },
        tadawul: {
            title: 'خدمة تداول (Tadawul)',
            accountInfo: 'رمز متجر تداول: 998877',
            instructions: 'أدخل رمز المتجر في تطبيق تداول وقم بالتحويل بالدينار الليبي.'
        },
        bank_transfer: {
            title: 'تحويل مصرفي ليبي (مصرف الأمان / الجمهورية / التجارة والتنمية)',
            accountInfo: 'اسم الحساب: منصة سحابتي | رقم الحساب: 0123456789012',
            instructions: 'يرجى إجراء التحويل المصرفي وإرسال إشعار الخصم في محادثة واتساب.'
        },
        telecom_cards: {
            title: 'كروت وشفرات مدار / ليبيانا (Madar & Libyana)',
            accountInfo: 'رقم تحويل الرصيد: 0910000000 (مدار) / 0920000000 (ليبيانا)',
            instructions: 'يمكنك تحويل رصيد مباشر أو إرسال أرقام كروت التعبئة لتأكيد الشحن.'
        },
        cash: {
            title: 'دفع كاش / استلام يدوي',
            accountInfo: 'خدمة الدفع والاستلام عبر نقاط ومندوبي المبيعات المعتمدين',
            instructions: 'تواصل مع خدمة العملاء على واتساب لتحديد أقرب نقطة استلام وتأكيد شحنك.'
        }
    }
};

const DEFAULT_APP_DATA = {
    settings: DEFAULT_STORE_SETTINGS,
    promoCodes: {
        'SAHABATI20': { discountPercent: 20, description: 'خصم سحابتي الخاص 20%' },
        'LIBYA10': { discountPercent: 10, description: 'خصم الشحن المباشر 10%' },
        'WELCOME': { discountPercent: 15, description: 'خصم الترحيب للزبائن الجدد 15%' }
    },
    categories: [
        {
            id: 'games',
            titleAr: 'شحن ألعاب الفيديو',
            titleEn: 'Game Top-ups',
            subtitleAr: 'ببجي، فري فاير، بيس، فيفا، روبلوكس والمزيد',
            icon: 'fa-gamepad',
            bgImage: '04_pubg_mobile_top_up_page.png'
        },
        {
            id: 'giftcards',
            titleAr: 'بطاقات الهدايا الرقمية',
            titleEn: 'Gift Cards',
            subtitleAr: 'أبل آيتونز، بلايستيشن، بلس، تيك توك وجوجل بلاي',
            icon: 'fa-gift',
            bgImage: '05_gift_cards_shop_grid.png'
        },
        {
            id: 'telecom',
            titleAr: 'كروت رصيد الاتصالات',
            titleEn: 'Telecom Cards',
            subtitleAr: 'كروت وتعبئة رصيد مدار الجديد وليبيانا فوراً',
            icon: 'fa-sim-card',
            bgImage: '03_sahabati_service_categories.png'
        }
    ],
    games: [
        {
            id: 'pubg',
            nameAr: 'ببجي موبايل (PUBG Mobile)',
            nameEn: 'PUBG Mobile',
            badge: 'الأكثر طلباً 🔥',
            icon: '04_pubg_mobile_top_up_page.png',
            banner: '04_pubg_mobile_top_up_page.png',
            idLabelAr: 'أدخل معرّف اللاعب (Player ID):',
            idPlaceholder: 'مثال: 5123456789',
            packages: [
                { id: 'pubg_60', nameAr: '60 شدة (60 UC)', priceLYD: 5.00, popular: false, icon: 'UC' },
                { id: 'pubg_300', nameAr: '300 + 30 شدة مجانية (330 UC)', priceLYD: 25.00, popular: true, bestValue: false, icon: 'UC' },
                { id: 'pubg_600', nameAr: '600 + 60 شدة مجانية (660 UC)', priceLYD: 49.00, popular: false, bestValue: true, icon: 'UC' },
                { id: 'pubg_1500', nameAr: '1500 + 150 شدة مجانية (1650 UC)', priceLYD: 120.00, popular: false, icon: 'UC' },
                { id: 'pubg_3000', nameAr: '3000 + 300 شدة مجانية (3300 UC)', priceLYD: 240.00, popular: false, icon: 'UC' },
                { id: 'pubg_6000', nameAr: '6000 + 600 شدة مجانية (6600 UC)', priceLYD: 475.00, popular: true, bestValue: true, icon: 'UC' }
            ]
        },
        {
            id: 'freefire',
            nameAr: 'فري فاير (Free Fire)',
            nameEn: 'Free Fire Diamonds',
            badge: 'فوري ⚡',
            icon: '01_photo_5809670474982690366_y.jpg',
            banner: '01_photo_5809670474982690366_y.jpg',
            idLabelAr: 'معرف الحساب (Player ID):',
            idPlaceholder: 'مثال: 987654321',
            packages: [
                { id: 'ff_100', nameAr: '100 + 10 جوهرة (110 💎)', priceLYD: 5.00, icon: '💎' },
                { id: 'ff_520', nameAr: '520 + 52 جوهرة (572 💎)', priceLYD: 25.00, popular: true, icon: '💎' },
                { id: 'ff_1060', nameAr: '1060 + 106 جوهرة (1166 💎)', priceLYD: 50.00, bestValue: true, icon: '💎' },
                { id: 'ff_2180', nameAr: '2180 + 218 جوهرة (2398 💎)', priceLYD: 100.00, icon: '💎' }
            ]
        },
        {
            id: 'efootball',
            nameAr: 'إي فوتبول بيس (eFootball™ 2026)',
            nameEn: 'eFootball PES Coins',
            badge: 'جديد ⚽',
            icon: '08_sahabati_app_icon_1024x1024.png',
            banner: 'header_hero.jpg',
            idLabelAr: 'معرف حساب كونامي / ID اللعبة:',
            idPlaceholder: 'مثال: efootball_player_123',
            packages: [
                { id: 'ef_130', nameAr: '130 كوينز بيس (Coins)', priceLYD: 10.00, icon: '🪙' },
                { id: 'ef_550', nameAr: '550 كوينز بيس (Coins)', priceLYD: 35.00, popular: true, icon: '🪙' },
                { id: 'ef_1050', nameAr: '1,050 كوينز بيس (Coins)', priceLYD: 65.00, bestValue: true, icon: '🪙' },
                { id: 'ef_2130', nameAr: '2,130 كوينز بيس (Coins)', priceLYD: 125.00, icon: '🪙' }
            ]
        },
        {
            id: 'fcmobile',
            nameAr: 'إف سي فيفا موبايل (EA SPORTS FC™ Mobile)',
            nameEn: 'EA FC Mobile Points',
            badge: 'نقاط فيفا 🏆',
            icon: '08_sahabati_app_icon_1024x1024.png',
            banner: 'header_hero.jpg',
            idLabelAr: 'معرف اللاعب (UID / Player ID):',
            idPlaceholder: 'مثال: 9876543210',
            packages: [
                { id: 'fc_500', nameAr: '500 نقطة FC Points', priceLYD: 25.00, icon: 'FC' },
                { id: 'fc_1050', nameAr: '1,050 نقطة FC Points', priceLYD: 50.00, popular: true, icon: 'FC' },
                { id: 'fc_2200', nameAr: '2,200 نقطة FC Points', priceLYD: 100.00, bestValue: true, icon: 'FC' },
                { id: 'fc_5700', nameAr: '5,700 نقطة FC Points', priceLYD: 240.00, icon: 'FC' }
            ]
        },
        {
            id: 'roblox',
            nameAr: 'روبلوكس (Roblox Robux)',
            nameEn: 'Roblox Robux',
            badge: 'خصم 20% 🏷️',
            icon: '07_roblox_promotion_banner.png',
            banner: '07_roblox_promotion_banner.png',
            idLabelAr: 'اسم مستخدم روبلوكس (Username):',
            idPlaceholder: 'مثال: GamerHero2026',
            packages: [
                { id: 'rbx_400', nameAr: '400 روبوكس (400 Robux)', priceLYD: 20.00, icon: '🪙' },
                { id: 'rbx_800', nameAr: '800 روبوكس (800 Robux)', priceLYD: 40.00, popular: true, icon: '🪙' },
                { id: 'rbx_1700', nameAr: '1,700 روبوكس (1,700 Robux)', priceLYD: 80.00, icon: '🪙' },
                { id: 'rbx_4500', nameAr: '4,500 روبوكس (4,500 Robux)', priceLYD: 200.00, bestValue: true, icon: '🪙' }
            ]
        },
        {
            id: 'codm',
            nameAr: 'كول أوف ديوتي (Call of Duty Mobile)',
            nameEn: 'COD Mobile CP',
            badge: 'عروض خاصة 🎯',
            icon: '08_sahabati_app_icon_1024x1024.png',
            banner: 'header_hero.jpg',
            idLabelAr: 'معرف الحساب (Player OpenID):',
            idPlaceholder: 'مثال: 6789123456789',
            packages: [
                { id: 'cod_80', nameAr: '80 CP', priceLYD: 5.00, icon: 'CP' },
                { id: 'cod_420', nameAr: '420 CP', priceLYD: 25.00, popular: true, icon: 'CP' },
                { id: 'cod_880', nameAr: '880 CP', priceLYD: 50.00, icon: 'CP' },
                { id: 'cod_2400', nameAr: '2,400 CP', priceLYD: 120.00, bestValue: true, icon: 'CP' }
            ]
        }
    ],
    giftCards: [
        {
            id: 'apple_10',
            brand: 'apple',
            nameAr: 'بطاقة أبل آيتونز $10 (حساب أمريكي)',
            nominal: '$10 USD',
            priceLYD: 50.00,
            category: 'apple',
            badge: 'الأكثر طلباً ⭐',
            image: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
            instructionsAr: 'يتم شحن الكود في حساب Apple ID الأمريكي من متجر App Store فوراً.'
        },
        {
            id: 'apple_50',
            brand: 'apple',
            nameAr: 'بطاقة أبل آيتونز $50 (حساب أمريكي)',
            nominal: '$50 USD',
            priceLYD: 250.00,
            category: 'apple',
            badge: 'تسليم فوري',
            image: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
            instructionsAr: 'يتم شحن الكود مباشرة في حساب Apple ID الأمريكي الخاص بك من خلال App Store.'
        },
        {
            id: 'psn_10',
            brand: 'playstation',
            nameAr: 'بطاقة بلايستيشن ستور $10 (أمريكي PSN)',
            nominal: '$10 USD',
            priceLYD: 50.00,
            category: 'gaming',
            badge: 'فوري 🎮',
            image: 'https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_logo.svg',
            instructionsAr: 'يتم إدخال الرمز المكون من 12 خانة داخل PlayStation Store > Redeem Codes.'
        },
        {
            id: 'psn_50',
            brand: 'playstation',
            nameAr: 'بطاقة بلايستيشن ستور $50 (أمريكي PSN)',
            nominal: '$50 USD',
            priceLYD: 250.00,
            category: 'gaming',
            badge: 'كود أصلي 🎮',
            image: 'https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_logo.svg',
            instructionsAr: 'يتم إدخال الرمز المكون من 12 خانة داخل PlayStation Store > Redeem Codes.'
        },
        {
            id: 'ps_plus_1m',
            brand: 'playstation',
            nameAr: 'اشتراك بلايستيشن بلس إسنشال (1 شهر أمريكي)',
            nominal: 'PS Plus 1 Month',
            priceLYD: 65.00,
            category: 'gaming',
            badge: 'بلس أونلاين 🌟',
            image: 'https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_logo.svg',
            instructionsAr: 'تفعيل اشتراك PlayStation Plus للعب أونلاين وتحميل الألعاب الشهرية المجانية.'
        },
        {
            id: 'tiktok_1000',
            brand: 'tiktok',
            nameAr: 'شحن عملات تيك توك 1,000 Coins',
            nominal: '1,000 Coins',
            priceLYD: 50.00,
            category: 'social',
            badge: 'مباشر ⚡',
            image: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
            instructionsAr: 'يتم شحن العملات في حساب التيك توك للبث المباشر والدعم فوراً.'
        },
        {
            id: 'tiktok_5000',
            brand: 'tiktok',
            nameAr: 'شحن عملات تيك توك 5,000 Coins للبث المباشر',
            nominal: '5,000 Coins',
            priceLYD: 245.00,
            category: 'social',
            badge: 'عرض خاص 🔥',
            image: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
            instructionsAr: 'يتم شحن العملات في حساب التيك توك للبث المباشر والدعم فوراً عبر المعرف.'
        },
        {
            id: 'google_25',
            brand: 'google',
            nameAr: 'بطاقة جوجل بلاي $25 (أمريكي)',
            nominal: '$25 USD',
            priceLYD: 125.00,
            category: 'google',
            badge: 'فوري 🚀',
            image: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Google_Play_Arrow_logo.svg',
            instructionsAr: 'يتم استرداد القيمة عبر متجر Google Play في الحساب الأمريكي.'
        },
        {
            id: 'steam_20',
            brand: 'steam',
            nameAr: 'بطاقة محفظة ستيم $20 Global (عالمية)',
            nominal: '$20 USD',
            priceLYD: 100.00,
            category: 'gaming',
            badge: 'عالمي 🌍',
            image: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg',
            instructionsAr: 'يتم إدخال الكود داخل تطبيق Steam > Add Funds to Steam Wallet.'
        },
        {
            id: 'madar_10',
            brand: 'telecom',
            nameAr: 'كرت تعبئة رصيد مدار الجديد (10 د.ل)',
            nominal: '10 دينار ليبي',
            priceLYD: 10.00,
            category: 'telecom',
            badge: 'مدار 📱',
            image: '03_sahabati_service_categories.png',
            instructionsAr: 'تعبئة رصيد فوري لشفرات مدار الجديد عبر الكود أو التحويل المباشر.'
        },
        {
            id: 'libyana_10',
            brand: 'telecom',
            nameAr: 'كرت تعبئة رصيد ليبيانا (10 د.ل)',
            nominal: '10 دينار ليبي',
            priceLYD: 10.00,
            category: 'telecom',
            badge: 'ليبيانا 📶',
            image: '03_sahabati_service_categories.png',
            instructionsAr: 'تعبئة رصيد فوري لشفرات ليبيانا للهاتف المحمول.'
        }
    ]
};

// Load saved custom catalog and settings or fallback to default
function loadAppData() {
    try {
        const saved = localStorage.getItem('sahabati_catalog_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Ensure settings exists
            if (!parsed.settings) parsed.settings = DEFAULT_STORE_SETTINGS;
            return parsed;
        }
    } catch (e) {
        console.error('Error loading custom catalog:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_APP_DATA));
}

// Save custom catalog to localStorage
function saveAppData(data) {
    localStorage.setItem('sahabati_catalog_data', JSON.stringify(data));
}

let APP_DATA = loadAppData();
