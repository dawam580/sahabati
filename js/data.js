// ==========================================
// Sahabati Store Configuration & Data Store
// Platform: سحّابتي (Sahabati)
// Currency: Libyan Dinar (LYD / د.ل) Strictly
// Compatible with: شاشات - هواتف - جميع الأجهزة
// ==========================================

const DEFAULT_STORE_SETTINGS = {
    whatsappNumber: '218920541749', // رقم واتساب المتجر 0920541749
    telegramChannel: 'A_98_A20',
    telegramUrl: 'https://t.me/A_98_A20',
    adminPin: 'admin2026',           // Admin dashboard access PIN
    storeNameAr: 'سحّابتي',
    storeNameEn: 'Sahabati My Cloud',
    heroImage: 'sahabati_banner_hero.jpg',
    currency: {
        code: 'LYD',
        symbol: 'د.ل',
        name: 'دينار ليبي'
    },
    paymentMethodsInfo: {
        one_pay: {
            title: 'ون باي (OnePay) / دفع مصرفي فوري',
            accountInfo: 'خدمة ون باي - موبي كاش - سداد - تداول',
            instructions: 'ادفع عبر تطبيق ون باي أو أي محفظة مصرفية بالدينار الليبي وأرسل إشعار الدفع عبر واتساب 0920541749 للتأكيد والتسليم الفوري.'
        },
        telecom_libyana: {
            title: 'شفرة ورصيد ليبيانا (Libyana)',
            accountInfo: 'رقم تحويل رصيد ليبيانا: 0920000000',
            instructions: 'حوّل الرصيد مباشرة أو أرسل كود كرت تعبئة ليبيانا في محادثة واتساب لتأكيد الشحن فوراً.'
        },
        telecom_madar: {
            title: 'شفرة ورصيد مدار الجديد (Madar)',
            accountInfo: 'رقم تحويل رصيد مدار: 0910000000',
            instructions: 'حوّل الرصيد مباشرة أو أرسل كود كرت تعبئة مدار الجديد في محادثة واتساب لتأكيد الشحن فوراً.'
        },
        bank_transfer: {
            title: 'تحويل مصرفي ليبي مباشر',
            accountInfo: 'اسم الحساب: منصة سحّابتي | رقم الحساب: 0123456789012',
            instructions: 'قم بالتحويل المصرفي وأرسل إشعار الخصم في محادثة واتساب 0920541749.'
        }
    }
};

const DEFAULT_APP_DATA = {
    settings: DEFAULT_STORE_SETTINGS,
    categories: [
        {
            id: 'games',
            titleAr: 'شحن ألعاب الفيديو',
            titleEn: 'Game Top-ups',
            subtitleAr: 'ببجي موبايل، فري فاير، روبلوكس، كوينز بيس، كلاش أوف كلانس',
            icon: 'fa-gamepad',
            badge: 'شحن فوري بالمعرّف ⚡'
        },
        {
            id: 'streaming',
            titleAr: 'اشتراكات المشاهدة الترفيهية',
            titleEn: 'Streaming & Movies',
            subtitleAr: 'نتفليكس 4K UHD، شاهد VIP حساب كامل (شاشات وهواتف)، ديزني بلس',
            icon: 'fa-tv',
            badge: 'شاشات & هواتف 📺'
        },
        {
            id: 'social',
            titleAr: 'سوشيال ميديا وعملات',
            titleEn: 'Social Coins & Plus',
            subtitleAr: 'عملات تيك توك TikTok، سناب شات بلس Snapchat+، تليجرام بريميوم',
            icon: 'fa-coins',
            badge: 'تيك توك & سناب 🔥'
        },
        {
            id: 'ai_cards',
            titleAr: 'الذكاء الاصطناعي والبطاقات',
            titleEn: 'AI & Gift Cards',
            subtitleAr: 'اشتراك ChatGPT Plus، بطاقات بلايستيشن، ستيم، آبل آيتونز',
            icon: 'fa-robot',
            badge: 'ChatGPT & Cards 🤖'
        },
        {
            id: 'telecom',
            titleAr: 'كروت مدار وليبيانا',
            titleEn: 'Telecom Cards',
            subtitleAr: 'كروت تعبئة ودفع مباشر بشفرات ليبيانا ومدار الجديد',
            icon: 'fa-sim-card',
            badge: 'ليبيانا & مدار 🇱🇾'
        }
    ],
    games: [
        {
            id: 'pubg',
            nameAr: 'ببجي موبايل (PUBG Mobile UC)',
            nameEn: 'PUBG Mobile',
            badge: 'أكواد وشدات فورية 🔥',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pubg.png',
            logoSvg: '<span class="text-amber-400 font-black text-xs tracking-wider">PUBG</span>',
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
            badge: 'شحن فوري ⚡',
            icon: '01_photo_5809670474982690366_y.jpg',
            logoSvg: '<span class="text-orange-400 font-black text-xs">FREE FIRE</span>',
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
            badge: 'شحن يوزر مباشر 🎵',
            icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
            logoSvg: '<i class="fa-brands fa-tiktok text-rose-400 text-lg"></i>',
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
            badge: 'شحن فوري باليوزر 🧱',
            icon: '07_roblox_promotion_banner.png',
            logoSvg: '<span class="text-sky-400 font-black text-xs">ROBLOX</span>',
            idLabelAr: 'اسم مستخدم روبلوكس (Username):',
            idPlaceholder: 'مثال: RobloxPlayer123',
            packages: [
                { id: 'rb_80', nameAr: '80 Robux رصيد روبلوكس', priceLYD: 10.00, icon: 'R$' },
                { id: 'rb_400', nameAr: '400 Robux رصيد روبلوكس', priceLYD: 35.00, popular: true, icon: 'R$' },
                { id: 'rb_800', nameAr: '800 Robux رصيد روبلوكس', priceLYD: 65.00, bestValue: true, icon: 'R$' },
                { id: 'rb_1700', nameAr: '1,700 Robux رصيد روبلوكس', priceLYD: 130.00, icon: 'R$' }
            ]
        },
        {
            id: 'efootball',
            nameAr: 'إي فوتبول بيس (eFootball™ Coins)',
            nameEn: 'eFootball PES',
            badge: 'كوينز بيس ⚽',
            icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/EFootball_Logo.svg',
            logoSvg: '<span class="text-blue-400 font-black text-xs">eFootball</span>',
            idLabelAr: 'معرف كونامي / ID اللعبة:',
            idPlaceholder: 'مثال: efootball_player_123',
            packages: [
                { id: 'ef_130', nameAr: '130 كوينز بيس (Coins)', priceLYD: 10.00, icon: '🪙' },
                { id: 'ef_550', nameAr: '550 كوينز بيس (Coins)', priceLYD: 35.00, popular: true, icon: '🪙' },
                { id: 'ef_1050', nameAr: '1,050 كوينز بيس (Coins)', priceLYD: 65.00, bestValue: true, icon: '🪙' },
                { id: 'ef_2130', nameAr: '2,130 كوينز بيس (Coins)', priceLYD: 125.00, icon: '🪙' }
            ]
        },
        {
            id: 'clashofclans',
            nameAr: 'كلاش أوف كلانس (Clash of Clans)',
            nameEn: 'Clash of Clans',
            badge: 'جواهر وباس ⚔️',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/clash-of-clans.png',
            logoSvg: '<span class="text-amber-300 font-black text-xs">CLASH</span>',
            idLabelAr: 'رمز تاغ اللاعب (#PlayerTag):',
            idPlaceholder: 'مثال: #9ABC123XYZ',
            packages: [
                { id: 'coc_goldpass', nameAr: 'تذكرة الجولد باس (Gold Pass)', priceLYD: 35.00, popular: true, icon: '🎫' },
                { id: 'coc_500', nameAr: '500 جوهرة كلاش (Gems)', priceLYD: 30.00, icon: '💎' },
                { id: 'coc_1200', nameAr: '1,200 جوهرة كلاش (Gems)', priceLYD: 65.00, bestValue: true, icon: '💎' },
                { id: 'coc_2500', nameAr: '2,500 جوهرة كلاش (Gems)', priceLYD: 130.00, icon: '💎' }
            ]
        }
    ],
    giftCards: [
        // ================= 1. STREAMING & ENTERTAINMENT =================
        {
            id: 'netflix_4k_1m',
            brand: 'netflix',
            category: 'streaming',
            nameAr: 'اشتراك نتفليكس (Netflix 4K) - شهر واحد',
            nominal: '1 Month - Profile User 4K',
            priceLYD: 45.00,
            badge: 'ملف خاص 4K UHD 🔥',
            type: 'User Profile',
            duration: '1 month',
            quality: '4K Ultra HD',
            instructionsAr: 'ملف شخصي خاص بك ومحمي برمز PIN بجودة 4K Ultra HD لمدة شهر كامل مع ضمان كامل المدة وتسليم فوري عبر واتساب.'
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
            id: 'disney_plus_1m',
            brand: 'disney',
            category: 'streaming',
            nameAr: 'اشتراك ديزني بلس (Disney+) - شهر كامل',
            nominal: '1 Month Subscription',
            priceLYD: 35.00,
            badge: 'أفلام ومسلسلات 4K ✨',
            instructionsAr: 'اشتراك ديزني بلس الرسمي لمدة شهر كامل مع دعم جميع الأجهزة ودقة 4K.'
        },

        // ================= 2. SOCIAL MEDIA & COINS =================
        {
            id: 'snapchat_plus_3m',
            brand: 'snapchat',
            category: 'social',
            nameAr: 'اشتراك سناب شات بلس (Snapchat+) - 3 أشهر',
            nominal: '3 Months Subscription',
            priceLYD: 50.00,
            badge: '3 أشهر 🌟',
            duration: '3 months',
            instructionsAr: 'تفعيل فوري لاشتراك سناب شات بلس على حسابك الشخصي لمدة 3 أشهر مع جميع الميزات الحصرية.'
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
            instructionsAr: 'تفعيل فوري لاشتراك سناب شات بلس على حسابك الشخصي لمدة 6 أشهر مع جميع الميزات الحصرية.'
        },
        {
            id: 'telegram_premium_3m',
            brand: 'telegram',
            category: 'social',
            nameAr: 'اشتراك تيليجرام بريميوم (Telegram Premium) - 3 أشهر',
            nominal: '3 Months Subscription',
            priceLYD: 65.00,
            badge: 'تفعيل باليوزر ⚡',
            instructionsAr: 'تفعيل رسمي لاشتراك تيليجرام بريميوم عبر اسم المستخدم (@username) الخاص بك مباشرة.'
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
            id: 'card_tt_3500',
            brand: 'tiktok',
            category: 'social',
            nameAr: '3,500 عملة تيك توك (TikTok Coins)',
            nominal: '3500 Coins',
            priceLYD: 365.00,
            badge: 'أفضل توفير 🚀',
            instructionsAr: 'شحن مباشر على اسم المستخدم (@Username) الخاص بك على تيك توك فور تأكيد الطلب.'
        },

        // ================= 3. AI & DIGITAL GIFT CARDS =================
        {
            id: 'chatgpt_plus_1m',
            brand: 'chatgpt',
            category: 'ai_cards',
            nameAr: 'اشتراك ChatGPT Plus الذكاء الاصطناعي - شهر كامل',
            nominal: 'Official GPT-4o / Plus',
            priceLYD: 120.00,
            badge: 'GPT-4o الرسمي 🤖',
            instructionsAr: 'تفعيل اشتراك شات جي بي تي بلس (ChatGPT Plus) مع وصول غير محدود لنماذج GPT-4o وتوليد الصور والتحليل المتقدم.'
        },
        {
            id: 'playstation_10_us',
            brand: 'playstation',
            category: 'ai_cards',
            nameAr: 'بطاقة بلايستيشن 10 دولار أمريكي (PSN $10 US)',
            nominal: '$10 USD PlayStation Card',
            priceLYD: 68.00,
            badge: 'ستور أمريكي 🎮',
            instructionsAr: 'كود بطاقة بلايستيشن ستور أمريكي 10$ رقمي أصلي مع تسليم فوري.'
        },
        {
            id: 'steam_10_usd',
            brand: 'steam',
            category: 'ai_cards',
            nameAr: 'بطاقة ستيم 10 دولار (Steam $10 USD Global)',
            nominal: '$10 Steam Wallet',
            priceLYD: 68.00,
            badge: 'ستيم ألعاب 🕹️',
            instructionsAr: 'كود تعبئة محفظة ستيم العالمي أصلي للشراء من متجر ستيم.'
        },
        {
            id: 'apple_itunes_10_us',
            brand: 'apple',
            category: 'ai_cards',
            nameAr: 'بطاقة آبل آيتونز 10 دولار (Apple iTunes $10 US)',
            nominal: '$10 Apple Gift Card',
            priceLYD: 68.00,
            badge: 'آبل أمريكي 🍎',
            instructionsAr: 'كود بطاقة متجر آبل لشحن رصيد الآيفون والآيباد وشراء التطبيقات والاشتراكات.'
        },

        // ================= 4. TELECOM VOUCHERS (LIBYANA & MADAR) =================
        {
            id: 'card_libyana_10',
            brand: 'libyana',
            category: 'telecom',
            nameAr: 'كرت تعبئة ليبيانا 10 دينار',
            nominal: '10 LYD Voucher',
            priceLYD: 10.00,
            badge: 'ليبيانا 🇱🇾',
            instructionsAr: 'كود تعبئة رصيد كرت ليبيانا 10 د.ل فوري صالح للاستخدام فوراً.'
        },
        {
            id: 'card_libyana_20',
            brand: 'libyana',
            category: 'telecom',
            nameAr: 'كرت تعبئة ليبيانا 20 دينار',
            nominal: '20 LYD Voucher',
            priceLYD: 20.00,
            badge: 'ليبيانا 🇱🇾',
            instructionsAr: 'كود تعبئة رصيد كرت ليبيانا 20 د.ل فوري صالح للاستخدام فوراً.'
        },
        {
            id: 'card_madar_10',
            brand: 'madar',
            category: 'telecom',
            nameAr: 'كرت تعبئة مدار 10 دينار',
            nominal: '10 LYD Voucher',
            priceLYD: 10.00,
            badge: 'مدار 🇱🇾',
            instructionsAr: 'كود تعبئة رصيد كرت مدار الجديد 10 د.ل فوري صالح للاستخدام فوراً.'
        },
        {
            id: 'card_madar_20',
            brand: 'madar',
            category: 'telecom',
            nameAr: 'كرت تعبئة مدار 20 دينار',
            nominal: '20 LYD Voucher',
            priceLYD: 20.00,
            badge: 'مدار 🇱🇾',
            instructionsAr: 'كود تعبئة رصيد كرت مدار الجديد 20 د.ل فوري صالح للاستخدام فوراً.'
        }
    ]
};

// LocalStorage Persistence Layer
function loadAppData() {
    try {
        const stored = localStorage.getItem('sahabati_catalog_data');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.games && parsed.giftCards) {
                parsed.settings = { ...DEFAULT_STORE_SETTINGS, ...(parsed.settings || {}) };
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
