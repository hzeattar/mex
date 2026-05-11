// App Shell - Sidebar + Workspace + Bottom Nav + Mobile Header
import { get, subscribe } from '../../state/store.js';
import { navigate, currentPath } from '../../router.js';
import { esc } from '../../utils/format.js';
import { $, $$, delegate } from '../../utils/dom.js';
import { icons } from '../common/Icons.js';
import { currentLocale, setLocale } from '../../utils/i18n.js';

const NAV_ITEMS = [
  { route: 'home', label: 'Home', icon: 'home' },
  { route: 'trade', label: 'Trade', icon: 'trade' },
  { route: 'portfolio', label: 'Portfolio', icon: 'portfolio' },
  { route: 'wallet', label: 'Assets', icon: 'wallet' },
  { route: 'invest', label: 'Earn', icon: 'earn' },
  { route: 'news', label: 'News', icon: 'news' },
  { route: 'support', label: 'Support', icon: 'support' },
  { route: 'account', label: 'Account', icon: 'account' },
];

const MOBILE_NAV = [
  { route: 'home', label: 'Home', icon: 'home' },
  { route: 'trade', label: 'Trade', icon: 'trade' },
  { route: 'invest', label: 'Earn', icon: 'earn' },
  { route: 'wallet', label: 'Assets', icon: 'wallet' },
];

export function renderShell(app) {
  const brand = get('brand');

  app.innerHTML = `
    <div class="flex min-h-screen">
      <!-- Desktop Sidebar -->
      <aside class="hidden lg:flex flex-col w-[240px] border-r border-line bg-panel/60 backdrop-blur-xl fixed inset-y-0 left-0 z-40 overflow-y-auto">
        <div class="p-5 border-b border-line">
          <a href="#/home" class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-green grid place-items-center text-white font-black text-sm">V</div>
            <strong class="text-base tracking-tight">${esc(brand.name)}</strong>
          </a>
        </div>
        <nav class="flex-1 p-3 space-y-1" id="sidebar-nav">
          ${NAV_ITEMS.map(navItem).join('')}
        </nav>
        <div class="p-3 border-t border-line">
          <button class="w-full btn-ghost text-xs" id="mode-toggle-desktop">
            <span class="w-2 h-2 rounded-full" id="mode-dot-desktop"></span>
            <span id="mode-label-desktop">${get('mode') === 'real' ? 'Real' : 'Demo'}</span>
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex-1 lg:ml-[240px] flex flex-col min-h-screen">
        <!-- Mobile Header -->
        <header class="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b border-line bg-panel/90 backdrop-blur-xl">
          <a href="#/home" class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-green grid place-items-center text-white font-black text-[10px]">V</div>
            <strong class="text-sm">${esc(brand.name)}</strong>
          </a>
          <div class="flex items-center gap-2">
            <button class="btn-ghost btn-sm" id="mode-toggle-mobile">
              <span class="w-2 h-2 rounded-full" id="mode-dot-mobile"></span>
              <span id="mode-label-mobile">${get('mode') === 'real' ? 'Real' : 'Demo'}</span>
            </button>
            <button class="w-9 h-9 grid place-items-center rounded-lg border border-line" id="market-drawer-btn" aria-label="Markets">
              ${icons.menu}
            </button>
          </div>
        </header>

        <!-- Top Bar (Desktop) -->
        <header class="hidden lg:flex items-center justify-between px-6 h-14 border-b border-line bg-panel/40 backdrop-blur-sm" id="topbar">
          <div id="topbar-title" class="text-sm text-muted"></div>
          <div class="flex items-center gap-3">
            <button class="btn-ghost btn-sm" id="mode-toggle-topbar">
              <span class="w-2 h-2 rounded-full" id="mode-dot-topbar"></span>
              <span id="mode-label-topbar">${get('mode') === 'real' ? 'Real' : 'Demo'}</span>
            </button>
            <div class="text-right">
              <div class="text-[10px] text-muted uppercase" id="balance-currency">USDT</div>
              <div class="text-sm font-bold" id="balance-amount">0.00</div>
            </div>
            <select class="input text-xs w-16 py-1" id="lang-select">
              <option value="en" ${currentLocale() === 'en' ? 'selected' : ''}>EN</option>
              <option value="ar" ${currentLocale() === 'ar' ? 'selected' : ''}>????</option>
              <option value="ru" ${currentLocale() === 'ru' ? 'selected' : ''}>RU</option>
            </select>
            <button class="relative w-9 h-9 grid place-items-center rounded-lg border border-line hover:border-line-strong" id="notifications-btn">
              ${icons.bell}
              <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red text-[9px] font-bold grid place-items-center hidden" id="notif-badge">0</span>
            </button>
          </div>
        </header>

        <!-- View container -->
        <main class="flex-1 p-4 lg:p-6 pb-24 lg:pb-6" id="view">
          <div class="flex items-center justify-center min-h-[50vh]">
            <div class="skeleton w-8 h-8 rounded-full"></div>
          </div>
        </main>
      </div>

      <!-- Mobile Bottom Nav -->
      <nav class="lg:hidden fixed bottom-0 inset-x-0 z-50 grid grid-cols-4 bg-panel/95 backdrop-blur-xl border-t border-line" style="padding-bottom: var(--safe-bottom)" id="bottom-nav">
        ${MOBILE_NAV.map(mobileNavItem).join('')}
      </nav>

      <!-- Market Drawer (mobile) -->
      <div class="fixed inset-0 z-[200] hidden" id="market-drawer-overlay">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" data-close-drawer></div>
        <div class="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-auto rounded-t-2xl border border-line bg-panel shadow-card animate-slide-up" id="market-drawer-sheet">
        </div>
      </div>
    </div>`;

  bindShellEvents(app);
  syncNavActive();
  syncModeUI();

  subscribe('mode', syncModeUI);
  window.addEventListener('hashchange', syncNavActive);
}

function navItem(item) {
  return `<a href="#/${item.route}" class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-text hover:bg-panel-2 transition-colors" data-nav="${item.route}">
    <span class="w-5 h-5 shrink-0">${icons[item.icon] || ''}</span>
    <span>${item.label}</span>
  </a>`;
}

function mobileNavItem(item) {
  return `<a href="#/${item.route}" class="mobile-nav-link flex flex-col items-center justify-center gap-1 py-2 text-muted hover:text-text transition-colors" data-nav="${item.route}">
    <span class="w-6 h-6">${icons[item.icon] || ''}</span>
    <span class="text-[10px] font-medium">${item.label}</span>
  </a>`;
}

function bindShellEvents(app) {
  // Navigation active state
  delegate(app, '[data-nav]', 'click', (e, el) => {
    e.preventDefault();
    navigate(el.dataset.nav);
  });

  // Market drawer
  const drawerBtn = $('#market-drawer-btn', app);
  const overlay = $('#market-drawer-overlay', app);
  if (drawerBtn) drawerBtn.addEventListener('click', () => toggleDrawer(true));
  delegate(app, '[data-close-drawer]', 'click', () => toggleDrawer(false));

  // Mode toggle
  $$('[id^="mode-toggle"]', app).forEach((btn) => {
    btn.addEventListener('click', toggleMode);
  });

  // Language selector
  $('#lang-select', app)?.addEventListener('change', (e) => setLocale(e.target.value));
}

function toggleDrawer(open) {
  const overlay = $('#market-drawer-overlay');
  if (!overlay) return;
  overlay.classList.toggle('hidden', !open);
  document.body.classList.toggle('overflow-hidden', open);
}

function toggleMode() {
  const current = get('mode');
  const next = current === 'real' ? 'demo' : 'real';
  set('mode', next);
  localStorage.setItem('vp_mode', next);
  syncModeUI();
  window.location.reload();
}

function syncNavActive() {
  const { path } = currentPath();
  $$('[data-nav]').forEach((el) => {
    const isActive = el.dataset.nav === path;
    el.classList.toggle('text-text', isActive);
    el.classList.toggle('bg-accent-soft', isActive);
    el.classList.toggle('text-muted', !isActive);
  });
}

function syncModeUI() {
  const mode = get('mode');
  const isReal = mode === 'real';
  $$('[id^="mode-dot"]').forEach((dot) => {
    dot.className = `w-2 h-2 rounded-full ${isReal ? 'bg-green' : 'bg-gold'}`;
  });
  $$('[id^="mode-label"]').forEach((lbl) => {
    lbl.textContent = isReal ? 'Real' : 'Demo';
  });
}

