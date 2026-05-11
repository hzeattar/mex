// i18n - Internationalization service
let locale = localStorage.getItem('vp_lang') || navigator.language?.slice(0, 2) || 'en';
let translations = {};

const SUPPORTED = ['en', 'ar', 'ru', 'de', 'fr', 'hi', 'zh'];

export async function initI18n() {
  if (!SUPPORTED.includes(locale)) locale = 'en';
  await loadLocale(locale);
}

export async function loadLocale(lang) {
  if (!SUPPORTED.includes(lang)) lang = 'en';
  locale = lang;
  try {
    const res = await fetch(`/assets/i18n/${lang}.json`);
    if (res.ok) translations = await res.json();
    else translations = {};
  } catch (e) {
    translations = {};
  }
  localStorage.setItem('vp_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function t(key, fallback = '') {
  return translations[key] || fallback || key;
}

export function currentLocale() {
  return locale;
}

export function setLocale(lang) {
  loadLocale(lang).then(() => window.location.reload());
}
