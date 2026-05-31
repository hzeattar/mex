// Lightweight i18n service for the MEX Group client shell.
// English and Arabic are polished; legacy locales fall back to English.
const SUPPORTED = ['en', 'ar'];
const FALLBACK_LOCALE = 'en';

const BUILT_INS = {
  en: {
    'brand.name': 'MEX Group',
    'brand.product': 'MEX Group',
    'brand.tagline': 'Professional trading workspace',
    'nav.home': 'Home',
    'nav.trade': 'Trade',
    'nav.portfolio': 'Portfolio',
    'nav.wallet': 'Funds',
    'nav.earn': 'Earn',
    'nav.markets': 'Markets',
    'nav.news': 'News',
    'nav.support': 'Support',
    'nav.account': 'Account',
    'common.loading': 'Loading...',
    'common.retry': 'Retry',
    'common.connection_failed': 'Connection failed',
    'common.no_notifications': 'No notifications',
    'common.failed_to_load': 'Failed to load',
    'common.notifications': 'Notifications',
    'common.refresh': 'Refresh',
    'common.close': 'Close',
    'mode.real': 'Real',
    'mode.demo': 'Demo',
    'topbar.balance': 'Balance',
    'auth.service_reconnecting': 'Service reconnecting, please retry in a moment.',
    'news.badge': 'MEX Group Briefing',
    'news.title': 'Market News & Platform Updates',
    'news.subtitle': 'Follow operational updates, market notes, funding notices, and copy desk announcements from MEX Group.',
    'news.empty': 'No news articles yet.',
    'news.readMore': 'Read full update',
    'news.openSource': 'Open source',
  },
  ar: {
    'brand.name': 'MEX Group',
    'brand.product': 'MEX Group',
    'brand.tagline': 'مساحة تداول احترافية',
    'nav.home': 'الرئيسية',
    'nav.trade': 'التداول',
    'nav.portfolio': 'المحفظة',
    'nav.wallet': 'الأموال',
    'nav.earn': 'العقود',
    'nav.markets': 'الأسواق',
    'nav.news': 'الأخبار',
    'nav.support': 'الدعم',
    'nav.account': 'الحساب',
    'common.loading': 'جار التحميل...',
    'common.retry': 'إعادة المحاولة',
    'common.connection_failed': 'تعذر الاتصال',
    'common.no_notifications': 'لا توجد إشعارات',
    'common.failed_to_load': 'تعذر التحميل',
    'common.notifications': 'الإشعارات',
    'common.refresh': 'تحديث',
    'common.close': 'إغلاق',
    'mode.real': 'حقيقي',
    'mode.demo': 'تجريبي',
    'topbar.balance': 'الرصيد',
    'auth.service_reconnecting': 'الخدمة تعيد الاتصال الآن، حاول مرة أخرى بعد لحظات.',
    'news.badge': 'موجز MEX Group',
    'news.title': 'الأخبار وتحديثات المنصة',
    'news.subtitle': 'تابع تحديثات التشغيل وملاحظات السوق والتنبيهات المالية وإعلانات مكتب النسخ من MEX Group.',
    'news.empty': 'لا توجد أخبار حتى الآن.',
    'news.readMore': 'اقرأ التحديث كاملًا',
    'news.openSource': 'فتح المصدر',
  },
};

const PHRASES = {
  ar: {
    Home: 'الرئيسية',
    Trade: 'التداول',
    Portfolio: 'المحفظة',
    Funds: 'الأموال',
    Earn: 'العقود',
    News: 'الأخبار',
    Support: 'الدعم',
    Account: 'الحساب',
    Deposit: 'إيداع',
    Withdraw: 'سحب',
    KYC: 'التوثيق',
    Wallet: 'الأموال',
    Markets: 'الأسواق',
    'Fast watch': 'متابعة سريعة',
    'Copy Trading': 'نسخ الصفقات',
    Contracts: 'العقود',
    'Open Positions': 'الصفقات المفتوحة',
    'Open positions': 'الصفقات المفتوحة',
    'No open positions yet.': 'لا توجد صفقات مفتوحة بعد.',
    'Order Ticket': 'تذكرة الأمر',
    Market: 'سوق',
    Limit: 'محدد',
    Stop: 'إيقاف',
    Sell: 'بيع',
    Buy: 'شراء',
    'Buy / Long': 'شراء / لونج',
    'Sell / Short': 'بيع / شورت',
    Positions: 'الصفقات',
    Orders: 'الأوامر',
    History: 'السجل',
    'Real account required': 'مطلوب حساب حقيقي',
    'KYC required': 'مطلوب التوثيق',
    'Copy Real': 'نسخ حقيقي',
    'Current level': 'المستوى الحالي',
    'Next level': 'المستوى التالي',
    'Real available': 'المتاح الحقيقي',
    'Active copies': 'نسخ نشطة',
    'Active contracts': 'عقود نشطة',
    'Manual requests': 'طلبات يدوية',
    Deposits: 'الإيداعات',
    Withdrawals: 'السحوبات',
    Verification: 'التوثيق',
    Approved: 'مقبول',
    Pending: 'قيد المراجعة',
    Rejected: 'مرفوض',
    'Latest transactions': 'آخر المعاملات',
    Profile: 'الملف الشخصي',
    Security: 'الأمان',
    Preferences: 'التفضيلات',
    Capabilities: 'الصلاحيات',
    'Connection failed': 'تعذر الاتصال',
    Retry: 'إعادة المحاولة',
    Notifications: 'الإشعارات',
    'No notifications': 'لا توجد إشعارات',
    'Failed to load': 'تعذر التحميل',
    'Trading desk': 'مكتب التداول',
    'Professional trading & investment platform': 'منصة تداول وعقود احترافية',
    'Open Trade': 'افتح التداول',
    'Real balance': 'الرصيد الحقيقي',
    Available: 'المتاح',
    Balance: 'الرصيد',
    Holds: 'محجوز',
    Mode: 'الوضع',
    'Internal execution': 'تنفيذ داخلي',
    'Quick actions': 'إجراءات سريعة',
    'Copy signals and level contracts': 'نسخ صفقات وعقود مرتبطة بالمستوى',
    'Start a real funding request': 'ابدأ طلب تمويل حقيقي',
    'Request manual admin payout': 'اطلب سحبًا يدويًا من الإدارة',
    'Verify account documents': 'وثق مستندات الحساب',
    'Client trading platform': 'منصة تداول العملاء',
    'Service reconnecting, please retry in a moment.': 'الخدمة تعيد الاتصال الآن، حاول مرة أخرى بعد لحظات.',
  },
};

let locale = localStorage.getItem('vp_lang') || navigator.language?.slice(0, 2) || FALLBACK_LOCALE;
let translations = { ...BUILT_INS.en };

function normalizeLocale(lang) {
  const normalized = String(lang || FALLBACK_LOCALE).slice(0, 2).toLowerCase();
  return SUPPORTED.includes(normalized) ? normalized : FALLBACK_LOCALE;
}

export async function initI18n() {
  locale = normalizeLocale(locale);
  await loadLocale(locale);
}

export async function loadLocale(lang) {
  locale = normalizeLocale(lang);

  let remote = {};
  try {
    const res = await fetch(`/assets/i18n/${locale}.json`, { cache: 'no-store' });
    if (res.ok) remote = await res.json();
  } catch (e) {
    remote = {};
  }

  translations = {
    ...BUILT_INS.en,
    ...(remote && typeof remote === 'object' ? remote : {}),
    ...(BUILT_INS[locale] || {}),
  };

  localStorage.setItem('vp_lang', locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  document.body?.classList.toggle('rtl', locale === 'ar');
  document.body?.classList.toggle('ltr', locale !== 'ar');
  return translations;
}

export function t(key, fallback = '') {
  return translations[key] || BUILT_INS.en[key] || fallback || key;
}

export function currentLocale() {
  return locale;
}

export function isRTL() {
  return locale === 'ar';
}

export function setLocale(lang) {
  loadLocale(lang).then(() => window.location.reload());
}

export function translateDom(root = document) {
  if (locale !== 'ar') return;
  const phraseMap = PHRASES.ar;
  const target = root instanceof Element || root instanceof Document ? root : document;
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-no-i18n],script,style,textarea,input,select')) return NodeFilter.FILTER_REJECT;
      const text = node.nodeValue || '';
      const trimmed = text.trim();
      if (!trimmed || trimmed.length > 90 || !phraseMap[trimmed]) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue || '';
    const trimmed = text.trim();
    node.nodeValue = text.replace(trimmed, phraseMap[trimmed]);
  }
}
