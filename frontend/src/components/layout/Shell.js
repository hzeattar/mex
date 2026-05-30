// Professional Trading Shell - MultiBank-inspired layout
import { get, set, subscribe } from '../../state/store.js';
import { navigate, currentPath } from '../../router.js';
import { esc, money } from '../../utils/format.js';
import { $, $$, delegate } from '../../utils/dom.js';
import { icons } from '../common/Icons.js';
import { currentLocale, setLocale, t, translateDom } from '../../utils/i18n.js';
import { api } from '../../services/api.js';

const NAV = [
  { route: 'home', key: 'nav.home', label: 'Home', icon: 'home' },
  { route: 'trade', key: 'nav.trade', label: 'Trade', icon: 'trade' },
  { route: 'portfolio', key: 'nav.portfolio', label: 'Portfolio', icon: 'portfolio' },
  { route: 'wallet', key: 'nav.wallet', label: 'Funds', icon: 'wallet' },
  { route: 'invest', key: 'nav.earn', label: 'Earn', icon: 'earn' },
];

const NAV_MORE = [
  { route: 'news', key: 'nav.news', label: 'News', icon: 'news' },
  { route: 'support', key: 'nav.support', label: 'Support', icon: 'support' },
  { route: 'account', key: 'nav.account', label: 'Account', icon: 'account' },
];

const MOBILE_NAV = [
  { route: 'home', key: 'nav.home', label: 'Home', icon: 'home' },
  { route: 'trade', key: 'nav.trade', label: 'Trade', icon: 'trade' },
  { route: 'invest', key: 'nav.earn', label: 'Earn', icon: 'earn' },
  { route: 'wallet', key: 'nav.wallet', label: 'Funds', icon: 'wallet' },
];

export function renderShell(app) {
  const brand = get('brand');
  const mode = get('mode');
  const wallet = activeWallet();

  app.innerHTML = `
    <div class="flex flex-col h-screen overflow-hidden" id="shell">
      <!-- Desktop Top Navigation Bar -->
      <header class="hidden lg:flex items-center h-12 px-4 border-b border-line bg-surface shrink-0 z-50">
        <a href="#/home" class="mex-shell-brand mr-6">
          <img class="brand-logo" src="/assets/img/mexgroup_logo.svg" alt="MEX Group">
          <span><strong>${esc(brand.name || t('brand.name', 'MEX Group'))}</strong><small>${esc(brand.product || t('brand.product', 'Trading Platform'))}</small></span>
        </a>
        <nav class="flex items-center gap-1" id="desktop-nav">
          ${NAV.map(n => `<a href="#/${n.route}" class="nav-tab" data-nav="${n.route}"><span class="w-4 h-4">${icons[n.icon]}</span>${t(n.key, n.label)}</a>`).join('')}
          ${NAV_MORE.map(n => `<a href="#/${n.route}" class="nav-tab" data-nav="${n.route}">${t(n.key, n.label)}</a>`).join('')}
        </nav>
        <div class="flex-1"></div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-panel border border-line">
            <span class="text-[10px] text-muted uppercase">${esc(wallet.currency)}</span>
            <strong class="text-xs font-mono" id="topbar-balance">${money(wallet.available)}</strong>
          </div>
          <button class="mode-btn ${mode === 'real' ? 'is-real' : ''}" id="mode-toggle" title="Switch mode">
            <span class="mode-dot"></span>
            <span class="mode-label">${mode === 'real' ? t('mode.real', 'Real') : t('mode.demo', 'Demo')}</span>
          </button>
          <select class="lang-select" id="lang-select">
            <option value="en" ${currentLocale() === 'en' ? 'selected' : ''}>EN</option>
            <option value="ar" ${currentLocale() === 'ar' ? 'selected' : ''}>AR</option>
          </select>
          <button class="icon-btn relative" id="notif-btn" title="Notifications">
            ${icons.bell}
            <span class="notif-badge hidden" id="notif-badge">0</span>
          </button>
          <a href="#/account" class="icon-btn" title="Account">${icons.account}</a>
        </div>
      </header>

      <!-- Mobile Header -->
      <header class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-surface shrink-0 z-50">
        <div class="flex items-center gap-2">
          <button class="icon-btn icon-btn-sm" id="markets-hamburger" title="Markets">${icons.hamburger}</button>
          <a href="#/home" class="mex-shell-brand mex-shell-brand-sm">
            <img class="brand-logo" src="/assets/img/mexgroup_logo.svg" alt="MEX Group">
            <span><strong>${esc(brand.name || t('brand.name', 'MEX Group'))}</strong></span>
          </a>
        </div>
        <div class="flex items-center gap-2">
          <button class="mode-btn mode-btn-sm ${mode === 'real' ? 'is-real' : ''}" id="mode-toggle-m">
            <span class="mode-dot"></span>
            <span class="mode-label">${mode === 'real' ? t('mode.real', 'Real') : t('mode.demo', 'Demo')}</span>
          </button>
          <button class="icon-btn icon-btn-sm" id="notif-btn-m">${icons.bell}<span class="notif-badge hidden" id="notif-badge-m">0</span></button>
          <a href="#/account" class="icon-btn icon-btn-sm" title="Account">${icons.account}</a>
        </div>
      </header>

      <!-- Main View -->
      <main class="flex-1 overflow-auto" id="view">
        <div class="flex items-center justify-center h-full"><div class="loading-spinner"></div></div>
      </main>

      <!-- Mobile Bottom Nav -->
      <nav class="lg:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around h-14 bg-surface/95 backdrop-blur-xl border-t border-line" style="padding-bottom:env(safe-area-inset-bottom)" id="bottom-nav">
        ${MOBILE_NAV.map(n => `<a href="#/${n.route}" class="mobile-tab" data-nav="${n.route}"><span class="w-5 h-5">${icons[n.icon]}</span><span class="mobile-tab-label">${t(n.key, n.label)}</span></a>`).join('')}
      </nav>

      <!-- Markets Side Drawer (Hamburger) -->
      <div class="markets-drawer hidden" id="markets-drawer">
        <div class="markets-drawer-overlay" id="markets-drawer-overlay"></div>
        <div class="markets-drawer-panel" id="markets-drawer-panel">
          <div class="markets-drawer-header">
            <button class="icon-btn icon-btn-sm" id="markets-drawer-close">${icons.back || icons.close}</button>
            <strong>${t('nav.markets', 'Markets')}</strong>
          </div>
          <div class="markets-drawer-search">
            <input type="text" id="markets-search-input" placeholder="${t('common.search', 'Search...')}" class="w-full">
          </div>
          <div class="markets-drawer-body" id="markets-drawer-list">
            <div class="loading-spinner-sm"></div>
          </div>
        </div>
      </div>

      <!-- Notification Panel -->
      <div class="notif-panel hidden" id="notif-panel">
        <div class="notif-panel-header"><strong>${t('common.notifications', 'Notifications')}</strong><button class="icon-btn icon-btn-sm" id="notif-close">${icons.close}</button></div>
        <div class="notif-panel-body" id="notif-list"><p class="text-muted text-xs text-center py-6">${t('common.loading', 'Loading...')}</p></div>
      </div>
    </div>`;

  bindShell(app);
  syncActive();
  translateDom(app);

  // Brand logo fallback via event listener (not inline onerror)
  app.querySelectorAll('.brand-logo').forEach(img => {
    img.addEventListener('error', function() { this.style.display = 'none'; }, { once: true });
  });

  window.addEventListener('hashchange', syncActive);
}

function bindShell(app) {
  delegate(app, '[data-nav]', 'click', (e, el) => { e.preventDefault(); navigate(el.dataset.nav); });
  $$('#mode-toggle, #mode-toggle-m', app).forEach(b => b?.addEventListener('click', toggleMode));
  $('#lang-select', app)?.addEventListener('change', e => setLocale(e.target.value));
  $$('#notif-btn, #notif-btn-m', app).forEach(b => b?.addEventListener('click', toggleNotifications));
  $('#notif-close', app)?.addEventListener('click', () => $('#notif-panel')?.classList.add('hidden'));

  // Markets hamburger / drawer
  $('#markets-hamburger', app)?.addEventListener('click', openMarketsDrawer);
  $('#markets-drawer-close', app)?.addEventListener('click', closeMarketsDrawer);
  $('#markets-drawer-overlay', app)?.addEventListener('click', closeMarketsDrawer);
  $('#markets-search-input', app)?.addEventListener('input', filterMarketsDrawer);
}

function toggleMode() {
  const next = get('mode') === 'real' ? 'demo' : 'real';
  localStorage.setItem('vp_mode', next);
  window.location.reload();
}

function toggleNotifications() {
  const panel = $('#notif-panel');
  if (!panel) return;
  const isHidden = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !isHidden);
  if (isHidden) loadNotifications();
}

async function loadNotifications() {
  const list = $('#notif-list');
  if (!list) return;
  try {
    const data = await api('/notifications/list.php', { timeout: 6000 });
    const items = data?.items || [];
    if (!items.length) { list.innerHTML = `<p class="text-muted text-xs text-center py-6">${t('common.no_notifications', 'No notifications')}</p>`; return; }
    list.innerHTML = items.slice(0, 20).map(n => `<div class="notif-item ${n.read ? '' : 'unread'}"><p class="text-xs">${esc(n.message || n.title || '--')}</p><span class="text-[10px] text-muted">${esc(n.created_at || '')}</span></div>`).join('');
    translateDom(list);
  } catch (e) { list.innerHTML = `<p class="text-muted text-xs text-center py-6">${t('common.failed_to_load', 'Failed to load')}</p>`; }
}

function syncActive() {
  const { path } = currentPath();
  $$('[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === path);
  });
}

/* ── Markets Side Drawer ── */
let _marketsCache = null;

async function openMarketsDrawer() {
  const drawer = $('#markets-drawer');
  if (!drawer) return;
  drawer.classList.remove('hidden');
  await loadMarketsList();
}

function closeMarketsDrawer() {
  const drawer = $('#markets-drawer');
  if (drawer) drawer.classList.add('hidden');
}

async function loadMarketsList() {
  const list = $('#markets-drawer-list');
  if (!list) return;
  try {
    if (!_marketsCache) {
      const data = await api('/markets.php', { timeout: 8000 });
      _marketsCache = data?.markets || data || [];
    }
    renderMarketsList(_marketsCache, '');
  } catch (e) {
    list.innerHTML = `<p class="text-muted text-xs text-center py-6">${t('common.failed_to_load', 'Failed to load')}</p>`;
  }
}

let _marketIconFn = null;

async function renderMarketsList(markets, query) {
  const list = $('#markets-drawer-list');
  if (!list) return;
  if (!_marketIconFn) {
    try { const mod = await import('../../utils/marketIcon.js'); _marketIconFn = mod.marketIcon; } catch(e) { _marketIconFn = () => ''; }
  }
  const q = query.toLowerCase();
  const filtered = q ? markets.filter(m => (m.symbol || m.name || '').toLowerCase().includes(q)) : markets;
  if (!filtered.length) { list.innerHTML = `<p class="text-muted text-xs text-center py-4">${t('common.no_results', 'No results')}</p>`; return; }
  list.innerHTML = filtered.map(m => {
    const sym = esc(m.symbol || '');
    const name = esc(m.name || sym);
    const price = m.price != null ? parseFloat(m.price).toFixed(m.type === 'crypto' ? 2 : 4) : '--';
    const change = m.change_pct != null ? parseFloat(m.change_pct).toFixed(2) : '';
    const changeClass = change.startsWith('-') ? 'text-red-400' : change ? 'text-green-400' : '';
    return `<a href="#/trade?symbol=${encodeURIComponent(sym)}" class="markets-drawer-item" data-symbol="${sym}">
      <img src="${_marketIconFn(sym)}" alt="" class="market-icon-sm">
      <div class="markets-drawer-info"><strong>${name}</strong><span class="text-[10px] text-muted">${esc(m.type || '')}</span></div>
      <div class="markets-drawer-price text-right"><span class="font-mono text-xs">${price}</span>${change ? `<span class="text-[10px] ${changeClass}">${change}%</span>` : ''}</div>
    </a>`;
  }).join('');
  // Logo fallback via event listener (not inline onerror)
  list.querySelectorAll('.market-icon-sm').forEach(img => {
    img.addEventListener('error', function() { this.style.display = 'none'; }, { once: true });
  });
  // Click to navigate and close
  list.querySelectorAll('.markets-drawer-item').forEach(a => {
    a.addEventListener('click', () => closeMarketsDrawer());
  });
}

function filterMarketsDrawer(e) {
  if (!_marketsCache) return;
  renderMarketsList(_marketsCache, e.target.value || '');
}

function activeWallet() {
  const w = get('wallet') || {};
  const mode = get('mode');
  return mode === 'real' ? (w.real || { balance: 0, available: 0, currency: 'USDT' }) : (w.demo || { balance: 10000, available: 10000, currency: 'USDT_DEMO' });
}
