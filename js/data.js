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
        telecom_libyana: {
            id: 'telecom_libyana',
            title: 'كروت شحن ليبيانا (Libyana)',
            accountInfo: 'كرت تعبئة ليبيانا بقيمة الطلب',
            instructions: 'اشترِ كرت تعبئة ليبيانا بقيمة طلبك، وأدخل الكود المكوّن من 13 رقماً في الخانة بالأسفل. نتحقق من الكرت ثم نسلّمك طلبك فوراً.'
        },
        lypay: {
            id: 'lypay',
            title: 'لي باي (LyPay) - مصرف الجمهورية',
            accountInfo: 'رقم هاتف التحويل: 0920541749',
            instructions: 'قم بتحويل قيمة الطلب عبر تطبيق LyPay (مصرف الجمهورية) إلى رقم المتجر 0920541749، واكتب رقم هاتفك أو مرجع العملية لتأكيد الشحن.'
        },
        onepay: {
            id: 'onepay',
            title: 'وان باي (OnePay) - مصرف التجارة والتنمية',
            accountInfo: 'رقم هاتف التحويل: 0920541749',
            instructions: 'قم بتحويل قيمة الطلب عبر تطبيق OnePay (مصرف التجارة والتنمية) إلى رقم المتجر 0920541749، واكتب رقم المعاملة لتأكيد الشحن.'
        }
    }
};

// ================= تطبيقات الشات والصوتية (الشحن بالـ ID) =================
// المعرّف ثابت حسب الترتيب: أضف التطبيقات الجديدة في آخر القائمة فقط.
const CHAT_APP_NAMES = [
    'اب لايف',
    'أزال لايف',
    'أيومي شات',
    'اب فون',
    'الو شات',
    'اميسو بارتي',
    'اور تالك',
    'اولاميت',
    'اولو لايف',
    'اهلا',
    'اهلا شات',
    'ايفن شات',
    'بات لايف',
    'بارتي ستار',
    'باور لايف',
    'بومو شات',
    'بومو لايف',
    'بولالا',
    'بولي شات',
    'بست لايف',
    'بيلا شات',
    'بينيمو شات',
    'تادا شات',
    'تاكا تالك',
    'تامي شات',
    'تايا شات',
    'توب توب',
    'توب فويس',
    'توميل',
    'تي لايف',
    'جاكو شات',
    'جانجو شات',
    'جيو لايف',
    'جيمي لايف',
    'حكي شات',
    'دانا شات',
    'دولي لايف',
    'دي دي',
    'ديتو لايف',
    'ديكا لايف',
    'دي مو شات',
    'روح',
    'روستار',
    'روكا لايف',
    'زار شات',
    'زافا لايف',
    'زينا لايف',
    'سايا',
    'لايكي',
    'ستار ميكر',
    'سعادة لايف',
    'سلام',
    'صحرا شات',
    'سوبر لايف',
    'سوبر ميت',
    'سوغو شات',
    'سول ستار',
    'سول شات',
    'سوها',
    'سويو',
    'سيلا',
    'شاتا',
    'شاتي',
    'شاميت',
    'شباب',
    'صدفة شات',
    'صوفيا شات',
    'طيب شات',
    'عرب ستار',
    'عمار شات',
    'عيوني شات',
    'غلا ستار',
    'غاميت لايف',
    'فانسي لايف',
    'فن اب',
    'فور بارتي',
    'فور شات',
    'فور فن',
    'فوفو شات',
    'فون',
    'في في بارتي',
    'فيل شات',
    'كارني لايف',
    'كراك شات',
    'كراش لايف',
    'كواي',
    'كوكو',
    'كيتي لايف',
    'كيو لايف',
    'لودو لايف',
    'لاسكي',
    'لكا شات',
    'لكي شات',
    'لما شات',
    'لمي شات',
    'ليام',
    'لايت شات',
    'لايكي لايف',
    'لوكي',
    'ليت شات',
    'ليت',
    'ماي شات',
    'ليغو لايف'
];
// أسماء مكررة أو متشابهة: تبقى في القائمة (حتى لا تتغير المعرّفات) لكنها مخفية عن الزبائن
const CHAT_APP_HIDDEN = ['اهلا', 'ليت', 'لايكي', 'دي دي'];
// تصحيح أسماء كُتبت بشكل مختلف عن اسم التطبيق الحقيقي (تُطبَّق أيضاً على الكتالوجات المحفوظة)
const CHAT_APP_RENAMES = { 'از لايف': 'أزال لايف', 'ايمو شات': 'أيومي شات', 'ام سي يو بارتي': 'اميسو بارتي', 'دولو لايف': 'دولي لايف', 'تو لايف': 'ديتو لايف' };
// أيقونات التطبيقات المحفوظة داخل الموقع (images/chat/<id>.webp)
const CHAT_APP_IMAGES = ['chat_001', 'chat_002', 'chat_003', 'chat_004', 'chat_005', 'chat_006', 'chat_007', 'chat_008', 'chat_009', 'chat_025', 'chat_026', 'chat_027', 'chat_028', 'chat_029', 'chat_030', 'chat_034', 'chat_035', 'chat_036', 'chat_037', 'chat_039', 'chat_040', 'chat_042', 'chat_043'];
// باقات افتراضية بالقيمة: يحصل العميل على رصيد يعادل المبلغ. يمكن تعديلها لكل تطبيق من لوحة الإدارة.
const CHAT_APP_PACKAGES = [
    { suffix: 'v10', nameAr: 'شحن بقيمة 10 د.ل', priceLYD: 10.00, icon: '🪙' },
    { suffix: 'v20', nameAr: 'شحن بقيمة 20 د.ل', priceLYD: 20.00, icon: '🪙' },
    { suffix: 'v50', nameAr: 'شحن بقيمة 50 د.ل', priceLYD: 50.00, icon: '💎', popular: true },
    { suffix: 'v100', nameAr: 'شحن بقيمة 100 د.ل', priceLYD: 100.00, icon: '👑', bestValue: true }
];
function buildChatApps() {
    return CHAT_APP_NAMES.map((name, i) => {
        const id = 'chat_' + String(i + 1).padStart(3, '0');
        return {
            id: id,
            category: 'chat',
            deliveryMethod: 'id',
            hidden: CHAT_APP_HIDDEN.includes(name),
            image: CHAT_APP_IMAGES.includes(id) ? 'images/chat/' + id + '.webp' : undefined,
            nameAr: name,
            nameEn: name,
            idLabelAr: 'معرّف حسابك (ID) في ' + name + ':',
            idPlaceholder: 'مثال: 12345678',
            packages: CHAT_APP_PACKAGES.map(p => ({ id: id + '_' + p.suffix, nameAr: p.nameAr, priceLYD: p.priceLYD, icon: p.icon, popular: !!p.popular, bestValue: !!p.bestValue }))
        };
    // نعرض فقط التطبيقات التي لها أيقونة (قرار المالك). القائمة الكاملة تبقى أعلاه حتى لا تتغير المعرّفات.
    }).filter(app => app.image);
}

// بطاقة آيتونز تركي (تُضاف أيضاً للكتالوجات المحفوظة عبر الترحيل أدناه)
const TR_ITUNES_CARD = {
    id: 'apple_itunes_tr_100',
    brand: 'apple',
    category: 'gift_cards',
    nameAr: 'بطاقة آيتونز تركي 100 ليرة (Apple iTunes TR)',
    nominal: '100 TL Apple Gift Card',
    priceLYD: 25.00,
    badge: 'آبل تركي 🇹🇷',
    instructionsAr: 'كود بطاقة متجر آبل التركي 100 ليرة، يعمل فقط على حسابات آبل المسجلة على المتجر التركي.'
};

const DEFAULT_APP_DATA = {
    settings: DEFAULT_STORE_SETTINGS,
    // رقم إصدار الكتالوج: عند تغييره يُهمل أي كتالوج قديم محفوظ في المتصفح أو على الخادم
    catalogVersion: 8,
    categories: [
        { id: 'games', titleAr: 'شحن ألعاب الفيديو', shortAr: 'الألعاب', icon: 'fa-gamepad', badge: 'شحن فوري ⚡' },
        { id: 'chat', titleAr: 'تطبيقات الشات والصوتية', shortAr: 'الشات والصوتية', icon: 'fa-microphone-lines', badge: 'شحن بالـ ID 🎙️' },
        { id: 'entertainment', titleAr: 'الترفيه والمشاهدة', shortAr: 'الترفيه', icon: 'fa-film', brand: 'netflix', badge: 'نتفليكس · شاهد · ديزني 🎬' },
        { id: 'social', titleAr: 'سوشيال ميديا', shortAr: 'سوشيال', icon: 'fa-coins', badge: 'سناب · تيليجرام 🔥' },
        { id: 'ai_cards', titleAr: 'اشتراكات ChatGPT و Claude', shortAr: 'ChatGPT و Claude', icon: 'fa-robot', badge: 'ذكاء اصطناعي 🤖' },
        { id: 'gift_cards', titleAr: 'بطاقات آبل آيتونز', shortAr: 'آبل آيتونز', icon: 'fa-apple', brand: 'apple', badge: 'آبل 🍎' }
    ],
    games: [
        {
            id: 'pubg',
            deliveryMethod: 'id', // id | qr | login
            nameAr: 'ببجي موبايل (PUBG Mobile UC)',
            nameEn: 'PUBG Mobile',
            badge: 'شحن بالـ ID ⚡',
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
            deliveryMethod: 'id',
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
            deliveryMethod: 'qr',
            nameAr: 'عملات تيك توك (TikTok Coins)',
            nameEn: 'TikTok Coins',
            badge: 'شحن يوزر مباشر 🎵',
            icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
            logoSvg: '<i class="fa-brands fa-tiktok text-rose-400 text-lg"></i>',
            deliveryNoteAr: 'الشحن عبر رمز QR: بعد إرسال الطلب، افتح تيك توك ← الملف الشخصي ← القائمة ← الرصيد، وأرسل لنا صورة رمز QR عبر واتساب لنشحن العملات مباشرة.',
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
            deliveryMethod: 'login',
            nameAr: 'روبلوكس (Roblox Robux)',
            nameEn: 'Roblox Robux',
            badge: 'شحن فوري باليوزر 🧱',
            icon: '07_roblox_promotion_banner.png',
            logoSvg: '<span class="text-sky-400 font-black text-xs">ROBLOX</span>',
            deliveryNoteAr: 'الشحن عبر تسجيل الدخول: بعد إرسال الطلب يتواصل معك فريقنا عبر واتساب الرسمي لتسجيل الدخول إلى حسابك وشحن الروبوكس. لا تُحفظ بيانات حسابك في الموقع.',
            packages: [
                { id: 'rb_80', nameAr: '80 Robux رصيد روبلوكس', priceLYD: 10.00, icon: 'R$' },
                { id: 'rb_400', nameAr: '400 Robux رصيد روبلوكس', priceLYD: 35.00, popular: true, icon: 'R$' },
                { id: 'rb_800', nameAr: '800 Robux رصيد روبلوكس', priceLYD: 65.00, bestValue: true, icon: 'R$' },
                { id: 'rb_1700', nameAr: '1,700 Robux رصيد روبلوكس', priceLYD: 130.00, icon: 'R$' }
            ]
        },
        {
            id: 'efootball',
            deliveryMethod: 'id',
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
            deliveryMethod: 'login',
            nameAr: 'كلاش أوف كلانس (Clash of Clans)',
            nameEn: 'Clash of Clans',
            badge: 'جواهر وباس ⚔️',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/clash-of-clans.png',
            logoSvg: '<span class="text-amber-300 font-black text-xs">CLASH</span>',
            deliveryNoteAr: 'الشحن عبر تسجيل الدخول: بعد إرسال الطلب يتواصل معك فريقنا عبر واتساب الرسمي لتسجيل الدخول إلى حسابك (Supercell ID) وشحن الجواهر. لا تُحفظ بيانات حسابك في الموقع.',
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
            category: 'entertainment',
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
            category: 'entertainment',
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
            category: 'entertainment',
            nameAr: 'اشتراك ديزني بلس (Disney+) - شهر كامل',
            nominal: '1 Month Subscription',
            priceLYD: 35.00,
            badge: 'أفلام ومسلسلات 4K ✨',
            instructionsAr: 'اشتراك ديزني بلس الرسمي لمدة شهر كامل مع دعم جميع الأجهزة ودقة 4K.'
        },
        {
            id: 'watchit_1m',
            brand: 'watchit',
            category: 'entertainment',
            nameAr: 'اشتراك واتش إت (WATCH IT) - شهر كامل',
            nominal: '1 Month Subscription',
            priceLYD: 30.00,
            badge: 'مسلسلات وأفلام عربية 🎬',
            instructionsAr: 'اشتراك واتش إت لمدة شهر كامل لمشاهدة المسلسلات والأفلام العربية الحصرية على جميع الأجهزة.'
        },
        {
            id: 'crunchyroll_1m',
            brand: 'crunchyroll',
            category: 'entertainment',
            nameAr: 'اشتراك كرانشي رول (Crunchyroll) - شهر كامل',
            nominal: '1 Month Premium',
            priceLYD: 30.00,
            badge: 'أنمي بدون إعلانات 🍥',
            instructionsAr: 'اشتراك كرانشي رول بريميوم لمدة شهر كامل لمشاهدة الأنمي بدون إعلانات وبأعلى جودة.'
        },

        // ================= 2. SOCIAL MEDIA =================
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

        // ================= 3. AI SUBSCRIPTIONS & APPLE GIFT CARDS =================
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
            id: 'claude_pro_1m',
            brand: 'claude',
            category: 'ai_cards',
            nameAr: 'اشتراك Claude Pro كلود - شهر كامل',
            nominal: 'Claude Pro - 1 Month',
            priceLYD: 120.00,
            badge: 'Claude Pro ✨',
            instructionsAr: 'تفعيل اشتراك كلود برو (Claude Pro) لمدة شهر كامل: استخدام أكبر بكثير من الخطة المجانية، ومشاريع، وتحليل الملفات والصور.'
        },
        {
            id: 'apple_itunes_10_us',
            brand: 'apple',
            category: 'gift_cards',
            nameAr: 'بطاقة آيتونز أمريكي 10 دولار (Apple iTunes $10 US)',
            nominal: '$10 Apple Gift Card',
            priceLYD: 68.00,
            badge: 'آبل أمريكي 🍎',
            instructionsAr: 'كود بطاقة متجر آبل لشحن رصيد الآيفون والآيباد وشراء التطبيقات والاشتراكات.'
        },
        TR_ITUNES_CARD
    ]
};

DEFAULT_APP_DATA.games = DEFAULT_APP_DATA.games.concat(buildChatApps());

// ترقية كتالوج محفوظ بدل حذفه: تبقى أسعار وتعديلات المدير كما هي
function migrateCatalog(data) {
    if (data.catalogVersion === 4) {
        (data.games || []).forEach(g => {
            if (g.category === 'chat' && CHAT_APP_HIDDEN.includes(g.nameAr)) g.hidden = true;
        });
        if (!(data.giftCards || []).some(c => c.id === TR_ITUNES_CARD.id)) data.giftCards.push(JSON.parse(JSON.stringify(TR_ITUNES_CARD)));
        data.catalogVersion = 5;
    }
    if (data.catalogVersion === 5) {
        (data.games || []).forEach(g => {
            if (g.category !== 'chat') return;
            const newName = CHAT_APP_RENAMES[g.nameAr];
            if (newName) {
                g.nameAr = newName; g.nameEn = newName;
                g.idLabelAr = 'معرّف حسابك (ID) في ' + newName + ':';
            }
            if (g.nameAr === 'دي دي') g.hidden = true;
            if (!g.image && CHAT_APP_IMAGES.includes(g.id)) g.image = 'images/chat/' + g.id + '.webp';
        });
        data.catalogVersion = 6;
    }
    if (data.catalogVersion === 6) {
        // حذف تطبيقات الشات الافتراضية التي ليس لها صورة. التطبيقات التي أضافها المدير بنفسه
        // (معرّف غير chat_###) أو وضع لها صورة تبقى كما هي.
        data.games = (data.games || []).filter(g => !(g.category === 'chat' && /^chat_\d{3}$/.test(g.id) && !g.image));
        data.catalogVersion = 7;
    }
    if (data.catalogVersion === 7) {
        (data.games || []).concat(data.giftCards || []).forEach(item => {
            if (MANUAL_PRODUCT_IDS.includes(item.id) && item.manual === undefined) item.manual = true;
        });
        data.catalogVersion = 8;
    }
    return data;
}

// منتجات تُشحن يدوياً (يظهر عليها شارة «يدوي» للعميل). يمكن تغييرها من لوحة الإدارة.
const MANUAL_PRODUCT_IDS = ['pubg', 'freefire', 'tiktok_coins', 'snapchat_plus_3m', 'snapchat_plus_6m', 'telegram_premium_3m'];
DEFAULT_APP_DATA.games.concat(DEFAULT_APP_DATA.giftCards).forEach(item => {
    if (MANUAL_PRODUCT_IDS.includes(item.id)) item.manual = true;
});

// LocalStorage Persistence Layer
function loadAppData() {
    try {
        const stored = localStorage.getItem('sahabati_catalog_data');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.games && parsed.giftCards) migrateCatalog(parsed);
            if (parsed && parsed.games && parsed.giftCards && parsed.catalogVersion === DEFAULT_APP_DATA.catalogVersion) {
                parsed.settings = { ...DEFAULT_STORE_SETTINGS, ...(parsed.settings || {}) };
                parsed.settings.paymentMethodsInfo = Object.assign({}, DEFAULT_STORE_SETTINGS.paymentMethodsInfo, parsed.settings.paymentMethodsInfo || {});
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
