// Professional Trading Shell - MultiBank-inspired layout
import { get, set, subscribe } from '../../state/store.js';
import { navigate, currentPath } from '../../router.js';
import { esc, escAttr, money } from '../../utils/format.js';
import { $, $$, delegate } from '../../utils/dom.js';
import { icons } from '../common/Icons.js';
import { t, translateDom } from '../../utils/i18n.js';
import { api } from '../../services/api.js';
import { trySwitchToReal } from '../../utils/gates.js';

const NAV = [
  { route: 'home', key: 'nav.home', label: 'Home', icon: 'home' },
  { route: 'trade', key: 'nav.trade', label: 'Trade', icon: 'trade' },
  { route: 'wallet', key: 'nav.wallet', label: 'Funds', icon: 'wallet' },
  { route: 'invest', key: 'nav.earn', label: 'Earn', icon: 'earn' },
];

const NAV_MORE = [
  { route: 'news', key: 'nav.news', label: 'News', icon: 'news' },
  { route: 'account', key: 'nav.account', label: 'Account', icon: 'account' },
];

const MOBILE_NAV = [
  { route: 'home', key: 'nav.home', label: 'Home', icon: 'home' },
  { route: 'trade', key: 'nav.trade', label: 'Trade', icon: 'trade' },
  { route: 'invest', key: 'nav.earn', label: 'Earn', icon: 'earn' },
  { route: 'wallet', key: 'nav.wallet', label: 'Funds', icon: 'wallet' },
];

const LICENSE_PDF_URL = '/assets/docs/SCA_LIC-0005622_Certificate.pdf';
const LICENSE_PREVIEW_URL = '/assets/docs/SCA_LIC-0005622_Certificate_preview.png';

export function renderShell(app) {
  const brand = get('brand');
  const mode = get('mode');
  const wallet = activeWallet();
  const brandName = brand.name || t('brand.name', 'MEX Global');
  const brandProduct = brand.product || t('brand.product', 'Trading Platform');
  const logoUrl = brand.logo_url || '/assets/img/mex_global_logo.png';

  app.innerHTML = `
    <div class="flex flex-col h-[100dvh] overflow-hidden" id="shell">
      <!-- Desktop Top Navigation Bar -->
      <header class="hidden lg:flex items-center h-12 px-4 border-b border-line bg-surface shrink-0 z-50">
        <a href="#/home" class="mex-shell-brand mr-6">
          <img class="brand-logo brand-logo-wordmark" src="${escAttr(logoUrl)}" alt="${escAttr(brandName)}">
          <span><strong>${esc(brandName)}</strong><small>${esc(brandProduct)}</small></span>
        </a>
        <nav class="flex items-center gap-1" id="desktop-nav">
          ${NAV.map(n => `<a href="#/${n.route}" class="nav-tab" data-nav="${n.route}"><span class="w-4 h-4">${icons[n.icon]}</span>${t(n.key, n.label)}</a>`).join('')}
          ${NAV_MORE.map(n => `<a href="#/${n.route}" class="nav-tab" data-nav="${n.route}">${t(n.key, n.label)}</a>`).join('')}
        </nav>
        <div class="flex-1"></div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-panel border border-line" title="Total = Available + In Use">
            <span class="text-[10px] text-muted uppercase" id="topbar-currency">${esc(wallet.currency)}</span>
            <strong class="text-xs font-mono" id="topbar-balance">${money(wallet.balance || wallet.available)}</strong>
          </div>
          ${modeSelector(mode, 'desktop')}
          <button class="icon-btn relative" id="notif-btn" title="Notifications">
            ${icons.bell}
            <span class="notif-badge hidden" id="notif-badge">0</span>
          </button>
          <button type="button" class="icon-btn" data-account-trigger title="Account">${icons.account}</button>
        </div>
      </header>

      <!-- Mobile Header -->
      <header class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-surface shrink-0 z-50">
        <div class="flex items-center gap-2 mobile-brand-slot">
          <button class="icon-btn icon-btn-sm" id="markets-hamburger" title="Markets">${icons.hamburger}</button>
          <a href="#/home" class="mex-shell-brand mex-shell-brand-sm">
            <img class="brand-logo brand-logo-wordmark" src="${escAttr(logoUrl)}" alt="${escAttr(brandName)}">
            <span><strong>${esc(brandName)}</strong></span>
          </a>
        </div>
        <div class="trade-mobile-balances hidden" id="trade-mobile-balances">
          <span><small>${t('shell.available', 'Available')}</small><b id="trade-mob-available">${money(wallet.available || 0)}</b></span>
          <button type="button" id="trade-mobile-balance-more" aria-label="More balances">${t('common.more', 'More')}</button>
          <div class="trade-mobile-balance-popover hidden" id="trade-mobile-balance-popover">
            <span><small>${t('shell.total', 'Total')}</small><b id="trade-mob-total">${money(wallet.balance || wallet.available || 0)}</b></span>
            <span><small>${t('shell.in_use', 'In use')}</small><b id="trade-mob-inuse">${money(wallet.holds || 0)}</b></span>
            <span><small>${t('shell.pnl24', 'PnL 24')}</small><b id="trade-mob-pnl24">${money(0)}</b></span>
            <span><small>${t('shell.pnl_total', 'PnL total')}</small><b id="trade-mob-pnltotal">${money(0)}</b></span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${modeSelector(mode, 'mobile')}
          <button class="icon-btn icon-btn-sm" id="notif-btn-m">${icons.bell}<span class="notif-badge hidden" id="notif-badge-m">0</span></button>
          <button type="button" class="icon-btn icon-btn-sm" data-account-trigger title="Account">${icons.account}</button>
        </div>
      </header>

      <!-- Main View -->
      <main class="flex-1 overflow-auto pb-[calc(56px+var(--safe-b))]" id="view">
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
            <strong>${t('nav.menu', 'Menu')}</strong>
          </div>
          <div class="mobile-menu-wallet"><small>${esc(wallet.currency)}</small><strong>${money(wallet.available)}</strong><span>${mode === 'real' ? t('workspace.real', 'Live workspace') : t('workspace.demo', 'Demo workspace')}</span></div>
          <div class="mobile-menu-quick">
            ${[...NAV, ...NAV_MORE].map(n => `<a href="#/${n.route}" data-nav="${n.route}"><span>${icons[n.icon] || ''}</span><strong>${t(n.key, n.label)}</strong></a>`).join('')}
          </div>
          <div class="markets-drawer-body" id="markets-drawer-list">
            <div class="mobile-menu-centered-loader"><div class="loading-spinner-sm"></div></div>
          </div>
          ${licenseMiniCard()}
        </div>
      </div>

      <!-- Notification Panel -->
      <div class="notif-panel hidden" id="notif-panel">
        <div class="notif-panel-header"><strong>${t('common.notifications', 'Notifications')}</strong><button class="icon-btn icon-btn-sm" id="notif-close">${icons.close}</button></div>
        <div class="notif-panel-body" id="notif-list"><p class="text-muted text-xs text-center py-6">${t('common.loading', 'Loading...')}</p></div>
      </div>

      <!-- Account Panel -->
      <div class="account-popover hidden" id="account-popover">
        <div class="account-popover-overlay" data-account-close></div>
        <div class="account-popover-panel" id="account-popover-panel">
          <div id="account-popover-content"></div>
        </div>
      </div>

      <!-- License PDF Modal -->
      <div class="license-modal hidden" id="license-modal" role="dialog" aria-modal="true" aria-label="MEX Global license certificate">
        <div class="license-modal-backdrop" data-license-close></div>
        <div class="license-modal-panel">
          <div class="license-modal-head">
            <div>
              <span>${t('license.regulated_entity','Regulated entity')}</span>
              <strong>${t('license.company_name','MEX GLOBAL FINANCIAL SERVICES LLC')}</strong>
              <small>${t('license.company_desc','MEX Global Financial Services LLC of the UAE is regulated by the Capital Market Authority of the UAE, as a Category 1 Trading Broker for Over-the-Counter Derivatives Contracts and Foreign Exchange Spot Markets, under ECMA license number 20200000031.')}</small>
            </div>
            <button type="button" class="icon-btn icon-btn-sm" data-license-close>${icons.close}</button>
          </div>
          <div class="license-pdf-viewer">
            <iframe id="license-pdf-frame" title="SCA license certificate" loading="lazy"></iframe>
            <div class="license-pdf-fallback hidden" id="license-pdf-fallback">
              <img src="${LICENSE_PREVIEW_URL}"
                   alt="SCA License Certificate preview"
                   class="license-preview-img"
                   loading="lazy" />
              <p class="text-muted text-sm text-center mt-3">${t('license.preview_fallback', 'PDF preview not supported in this browser.')}</p>
            </div>
          </div>
          <div class="license-modal-actions">
            <a href="${LICENSE_PDF_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-ghost">
              ${t('license.open_certificate', 'Open certificate')}
            </a>
            <a href="${LICENSE_PDF_URL}" download class="btn btn-sm btn-ghost">
              ${t('license.download_pdf', 'Download PDF')}
            </a>
          </div>
        </div>
      </div>
    </div>`;

  bindShell(app);
  syncActive();
  translateDom(app);
  refreshNotificationBadge();

  // Brand logo fallback via event listener (not inline onerror)
  app.querySelectorAll('.brand-logo').forEach(img => {
    img.addEventListener('error', function() {
      this.classList.remove('brand-logo-wordmark');
      this.style.display = 'none';
      if (this.nextElementSibling) this.nextElementSibling.style.display = '';
    }, { once: true });
  });

  window.addEventListener('hashchange', syncActive);
  if (!window.__mexShellWalletSub) {
    window.__mexShellWalletSub = true;
    subscribe('wallet', refreshShellBalance);
    subscribe('mode', refreshShellBalance);
    subscribe('portfolio', refreshShellBalance);
  }
}

function modeSelector(mode, scope) {
  const isMobile = scope === 'mobile';
  const label = mode === 'real' ? t('mode.real', 'Real') : t('mode.demo', 'Demo');
  return `<div class="mode-selector ${isMobile ? 'mode-selector-sm' : ''}">
    <button class="mode-btn ${isMobile ? 'mode-btn-sm' : ''} ${mode === 'real' ? 'is-real' : ''}" id="${isMobile ? 'mode-toggle-m' : 'mode-toggle'}" data-mode-trigger type="button" title="Switch mode">
      <span class="mode-dot"></span>
      <span class="mode-label">${label}</span>
      <span class="mode-caret">${icons.chevronDown}</span>
    </button>
    <div class="mode-menu hidden" data-mode-menu>
      <button type="button" data-set-mode="real" class="${mode === 'real' ? 'active' : ''}"><span class="mode-dot is-real-dot"></span>${t('mode.real', 'Real')}</button>
      <button type="button" data-set-mode="demo" class="${mode === 'demo' ? 'active' : ''}"><span class="mode-dot"></span>${t('mode.demo', 'Demo')}</button>
    </div>
  </div>`;
}

function refreshShellBalance() {
  const wallet = activeWallet();
  const portfolio = get('portfolio') || {};
  const metrics = portfolio.metrics || {};
  const cur = document.getElementById('topbar-currency');
  const bal = document.getElementById('topbar-balance');
  if (cur) cur.textContent = wallet.currency || 'USDT';
  if (bal) bal.textContent = money(wallet.balance || wallet.available || 0);
  const drawerWallet = document.querySelector('.mobile-menu-wallet');
  if (drawerWallet) {
    drawerWallet.innerHTML = `<small>${esc(wallet.currency || 'USDT')}</small><strong>${money(wallet.available || wallet.balance || 0)}</strong><span>${get('mode') === 'real' ? t('workspace.real', 'Live workspace') : t('workspace.demo', 'Demo workspace')}</span>`;
  }
  setText('trade-mob-available', money(metrics.available_balance ?? wallet.available ?? wallet.balance ?? 0));
  setText('trade-mob-pnl24', money(metrics.pnl_24_live ?? 0));
  setText('trade-mob-total', money(metrics.total_balance ?? wallet.balance ?? wallet.available ?? 0));
  setText('trade-mob-inuse', money(metrics.in_use_balance ?? wallet.holds ?? 0));
  setText('trade-mob-pnltotal', money(metrics.pnl_total_live ?? 0));
  const pnl24 = document.getElementById('trade-mob-pnl24');
  if (pnl24) pnl24.className = Number(metrics.pnl_24_live || 0) >= 0 ? 'text-buy' : 'text-sell';
  const pnlTotal = document.getElementById('trade-mob-pnltotal');
  if (pnlTotal) pnlTotal.className = Number(metrics.pnl_total_live || 0) >= 0 ? 'text-buy' : 'text-sell';
}

function bindShell(app) {
  delegate(app, '[data-nav]', 'click', (e, el) => { e.preventDefault(); closeMarketsDrawer(); closeAccountPopover(); navigate(el.dataset.nav); });
  delegate(app, '[data-account-trigger]', 'click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openAccountPopover();
  });
  delegate(app, '[data-account-close]', 'click', (e) => {
    e.preventDefault();
    closeAccountPopover();
  });
  delegate(app, '[data-open-license]', 'click', (e) => {
    e.preventDefault();
    openLicenseModal();
  });
  delegate(app, '[data-license-close]', 'click', (e) => {
    e.preventDefault();
    closeLicenseModal();
  });
  $$('[data-mode-trigger]', app).forEach(b => b?.addEventListener('click', toggleModeMenu));
  delegate(app, '[data-set-mode]', 'click', (e, el) => {
    e.preventDefault();
    setMode(el.dataset.setMode);
  });
  $('#trade-mobile-balance-more', app)?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const popover = $('#trade-mobile-balance-popover', app);
    const open = popover?.classList.toggle('hidden') === false;
    e.currentTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  if (!window.__mexShellGlobalListenersBound) {
    window.__mexShellGlobalListenersBound = true;
    document.addEventListener('click', (e) => {
      const logoutLink = e.target?.closest?.('a[href="/logout.php"]');
      if (logoutLink) {
        e.preventDefault();
        fetch('/api/auth/logout.php', { method: 'POST', credentials: 'include' })
          .catch(() => {})
          .finally(() => { window.location.href = '/'; });
        return;
      }
      closeModeMenus();
      closeTradeBalancePopover();
      if (!e.target?.closest?.('#account-popover-panel') && !e.target?.closest?.('[data-account-trigger]')) {
        closeAccountPopover();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModeMenus();
        closeTradeBalancePopover();
        closeAccountPopover();
        closeLicenseModal();
      }
    });
  }
  $$('#notif-btn, #notif-btn-m', app).forEach(b => b?.addEventListener('click', toggleNotifications));
  $('#notif-close', app)?.addEventListener('click', () => $('#notif-panel')?.classList.add('hidden'));

  // Markets hamburger / drawer
  $('#markets-hamburger', app)?.addEventListener('click', handleMobileHamburger);
  $('#markets-drawer-close', app)?.addEventListener('click', closeMarketsDrawer);
  $('#markets-drawer-overlay', app)?.addEventListener('click', closeMarketsDrawer);
}


function handleMobileHamburger() {
  const { path } = currentPath();
  if (path === 'trade') {
    const tradeMarketButton = document.querySelector('#mob-mkt-btn');
    if (tradeMarketButton) {
      tradeMarketButton.click();
      return;
    }
  }
  openMarketsDrawer();
}

function toggleModeMenu(e) {
  e.preventDefault();
  e.stopPropagation();
  const wrap = e.currentTarget?.closest('.mode-selector');
  const menu = wrap?.querySelector('[data-mode-menu]');
  if (!menu) return;
  const open = !menu.classList.contains('hidden');
  closeModeMenus();
  menu.classList.toggle('hidden', open);
}

function closeModeMenus() {
  document.querySelectorAll('[data-mode-menu]').forEach(menu => menu.classList.add('hidden'));
}

function setMode(next) {
  next = next === 'real' ? 'real' : 'demo';
  if (next === get('mode')) {
    closeModeMenus();
    return;
  }
  if (next === 'real') {
    trySwitchToReal('mode');
    closeModeMenus();
    return;
  }
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
    const data = await api('/notifications/list.php?limit=30&mark_read=1', { timeout: 6000 });
    const items = data?.items || [];
    setNotificationBadge(0);
    if (!items.length) {
      list.innerHTML = `<p class="text-muted text-xs text-center py-6">${t('common.no_notifications', 'No notifications')}</p>`;
      return;
    }
    list.innerHTML = items.slice(0, 30).map(n => {
      const kind = String(n.kind || n.type || 'info').toLowerCase();
      const iconMap = { success: '✓', warning: '⚠', danger: '⚡', info: 'ℹ', deposit: '↓', withdrawal: '↑', kyc: '🪪', position: '📈', trade: '📊' };
      const colorMap = { success: 'notif-success', warning: 'notif-warning', danger: 'notif-danger', info: 'notif-info', deposit: 'notif-success', kyc: 'notif-info', position: 'notif-trade', trade: 'notif-trade' };
      const icon = iconMap[kind] || iconMap.info;
      const colorClass = colorMap[kind] || 'notif-info';
      const link = n.link ? ` data-notif-link="${escAttr(n.link)}"` : '';
      const when = n.created_at ? notifRelTime(n.created_at) : '';
      return `<div class="notif-item ${n.read ? '' : 'unread'} ${colorClass}" ${link} role="button" tabindex="0">
        <span class="notif-icon">${icon}</span>
        <div class="notif-body">
          <p class="notif-title">${esc(n.title || n.message || '--')}</p>
          ${n.title && n.message && n.message !== n.title ? `<p class="notif-msg">${esc(n.message)}</p>` : ''}
          ${when ? `<span class="notif-when">${esc(when)}</span>` : ''}
        </div>
      </div>`;
    }).join('');
    // Click: navigate via link attribute
    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-notif-link]');
      if (!item) return;
      const href = item.dataset.notifLink || '';
      if (href.startsWith('#/')) { navigate(href.slice(1)); toggleNotifications(); }
      else if (href) { window.location.href = href; }
    });
    translateDom(list);
  } catch (_e) {
    list.innerHTML = `<p class="text-muted text-xs text-center py-6">${t('common.error_loading', 'Could not load notifications')}</p>`;
  }
}

function notifRelTime(iso) {
  try {
    const d = new Date(iso.replace(' ', 'T'));
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return t('common.just_now', 'Just now');
    if (diff < 3600) return Math.floor(diff / 60) + ' ' + t('common.min_ago', 'min ago');
    if (diff < 86400) return Math.floor(diff / 3600) + ' ' + t('common.hr_ago', 'hr ago');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (_e) { return ''; }
}

async function refreshNotificationBadge() {
  try {
    const data = await api('/notifications/list.php?limit=1&peek=1', { timeout: 5000 });
    setNotificationBadge(Number(data?.unread || 0));
  } catch (_e) {
    setNotificationBadge(0);
  }
}

function setNotificationBadge(count) {
  const safe = Math.max(0, Math.min(99, Number(count || 0)));
  $$('#notif-badge, #notif-badge-m').forEach((badge) => {
    if (!badge) return;
    badge.textContent = String(safe);
    badge.classList.toggle('hidden', safe <= 0);
  });
}

function syncActive() {
  const { path } = currentPath();
  const activePath = ['deposit', 'withdraw', 'funding'].includes(path) ? 'wallet' : path;
  const shell = document.getElementById('shell');
  if (shell) shell.classList.toggle('is-trade-route', path === 'trade');
  if (path !== 'trade') closeTradeBalancePopover();
  $$('[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === activePath);
  });
  refreshShellBalance();
}

function closeTradeBalancePopover() {
  const popover = document.getElementById('trade-mobile-balance-popover');
  const button = document.getElementById('trade-mobile-balance-more');
  if (popover) popover.classList.add('hidden');
  if (button) button.setAttribute('aria-expanded', 'false');
}

function openAccountPopover() {
  const panel = $('#account-popover');
  const content = $('#account-popover-content');
  if (!panel || !content) return;
  content.innerHTML = accountPopoverMarkup();
  panel.classList.remove('hidden');
  document.body.classList.add('account-popover-open');
}

function closeAccountPopover() {
  const panel = $('#account-popover');
  if (panel) panel.classList.add('hidden');
  document.body.classList.remove('account-popover-open');
}

function accountPopoverMarkup() {
  const user = get('user') || {};
  const kyc = get('kyc') || {};
  const level = get('level') || {};
  const brand = get('brand') || {};
  const support = get('support') || {};
  const wallet = activeWallet();
  const current = level.current || user.user_level || {};
  const name = user.display_name || user.name || user.username || user.email || 'Client';
  const initial = String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
  const kycStatus = String(kyc.status || 'not submitted').replace(/_/g, ' ');
  const whatsappUrl = brand.whatsapp_support_url || support.whatsapp_url || '';
  const whatsappReady = /^https?:\/\//i.test(String(whatsappUrl));
  return `
    <div class="account-popover-head">
      <span class="account-popover-avatar">${esc(initial)}</span>
      <div class="min-w-0">
        <strong>${esc(name)}</strong>
        <small>${esc(user.email || t('shell.no_email', 'No email attached'))}</small>
      </div>
      <button type="button" class="icon-btn icon-btn-sm" data-account-close>${icons.close}</button>
    </div>
    <div class="account-popover-balance">
      <span>${esc(wallet.currency || 'USDT')}</span>
      <strong>${money(wallet.available || wallet.balance || 0)}</strong>
      <small>${get('mode') === 'real' ? t('shell.real_account', 'Real account') : t('shell.demo_account', 'Demo account')}</small>
    </div>
    <div class="account-popover-grid">
      <span><small>${t('shell.kyc', 'KYC')}</small><b>${esc(kycStatusLabel(kycStatus))}</b></span>
      <span><small>${t('shell.level', 'Level')}</small><b>${esc(current.name || current.name_en || current.level_code || 'Starter')}</b></span>
    </div>
    <div class="account-popover-actions">
      <a href="#/home" data-nav="home">${icons.home}<span>${t('nav.dashboard', 'Dashboard')}</span></a>
      <a href="#/wallet" data-nav="wallet">${icons.wallet}<span>${t('nav.funds', 'Funds')}</span></a>
      <a href="#/kyc" data-nav="kyc">${icons.kyc}<span>${t('shell.kyc', 'KYC')}</span></a>
      <a href="#/account" data-nav="account">${icons.account}<span>${t('shell.full_account', 'Full account')}</span></a>
      ${whatsappReady
        ? `<a href="${escAttr(whatsappUrl)}" target="_blank" rel="noopener">${icons.whatsapp || icons.support}<span>WhatsApp</span></a>`
        : `<button type="button" disabled>${icons.whatsapp || icons.support}<span>${t('shell.whatsapp_setup', 'WhatsApp setup')}</span></button>`}
      <a href="/logout.php" class="is-danger" data-logout>${icons.lock}<span>${t('shell.logout', 'Logout')}</span></a>
    </div>`;
}

function titleCase(value) {
  return String(value || '').replace(/\b\w/g, ch => ch.toUpperCase());
}

function kycStatusLabel(status) {
  const s = String(status || '').toLowerCase().replace(/\s+/g, '_');
  const map = {
    accepted: t('kyc.label.accepted', 'Accepted'),
    approved: t('kyc.label.accepted', 'Accepted'),
    verified: t('kyc.label.accepted', 'Accepted'),
    pending: t('kyc.label.pending', 'Pending'),
    rejected: t('kyc.label.rejected', 'Rejected'),
    not_submitted: t('kyc.label.not_submitted', 'Not submitted'),
  };
  return map[s] || titleCase(status);
}

function licenseMiniCard() {
  return `<div class="mobile-menu-license">
    <div>
      <span class="uae-flag-badge" aria-label="UAE">🇦🇪</span>
      <span>${t('license.regulated_entity','Regulated entity')}</span>
      <strong>${t('license.company_name','MEX GLOBAL FINANCIAL SERVICES LLC')}</strong>
      <small>${t('license.company_desc','MEX Global Financial Services LLC of the UAE is regulated by the Capital Market Authority of the UAE, as a Category 1 Trading Broker for Over-the-Counter Derivatives Contracts and Foreign Exchange Spot Markets, under ECMA license number 20200000031.')}</small>
    </div>
    <button type="button" data-open-license>${t('license.view_license','View license')}</button>
  </div>`;
}

function shouldUseLicenseImagePreview() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function openLicenseModal() {
  const modal = $('#license-modal');
  const frame = $('#license-pdf-frame');
  const fallback = $('#license-pdf-fallback');
  if (!modal) return;

  if (shouldUseLicenseImagePreview()) {
    if (frame) {
      frame.removeAttribute('src');
      frame.classList.add('is-hidden');
    }
    if (fallback) fallback.classList.remove('hidden');
    modal.classList.remove('hidden');
    document.body.classList.add('license-modal-open');
    return;
  }

  if (frame) frame.classList.remove('is-hidden');
  if (fallback) fallback.classList.add('hidden');

  // Lazy-load the PDF only on first open
  if (frame && !frame.getAttribute('src')) {
    frame.setAttribute('src', LICENSE_PDF_URL);

    // Show fallback if iframe is blank after 4s (mobile browsers often can't render PDF iframes)
    const fallbackTimer = setTimeout(() => {
      if (!frame.dataset.loaded && fallback) {
        frame.classList.add('is-hidden');
        fallback.classList.remove('hidden');
      }
    }, 4000);

    frame.addEventListener('load', () => {
      frame.dataset.loaded = '1';
      clearTimeout(fallbackTimer);
      // Additional check: some browsers fire load but content is blank
      try {
        const h = frame.contentDocument?.body?.scrollHeight || 0;
        if (h < 10 && fallback) {
          frame.classList.add('is-hidden');
          fallback.classList.remove('hidden');
        }
      } catch (_) {
        // cross-origin — assume it loaded OK if no error
      }
    }, { once: true });

    frame.addEventListener('error', () => {
      clearTimeout(fallbackTimer);
      if (fallback) { frame.classList.add('is-hidden'); fallback.classList.remove('hidden'); }
    }, { once: true });
  }

  modal.classList.remove('hidden');
  document.body.classList.add('license-modal-open');
}

function closeLicenseModal() {
  const modal = $('#license-modal');
  if (modal) modal.classList.add('hidden');
  document.body.classList.remove('license-modal-open');
}

/* ── Markets Side Drawer ── */
let _marketsCache = null;
const _fallbackDrawerMarkets = [
  ['BTCUSDT', 'Bitcoin / Tether', 'crypto'], ['ETHUSDT', 'Ethereum / Tether', 'crypto'], ['BNBUSDT', 'BNB / Tether', 'crypto'],
  ['EURUSD', 'Euro / US Dollar', 'forex'], ['GBPUSD', 'British Pound / US Dollar', 'forex'], ['USDJPY', 'US Dollar / Japanese Yen', 'forex'],
  ['XAUUSD', 'Gold Spot / US Dollar', 'commodities'], ['AAPL', 'Apple Inc.', 'stocks'], ['2222', 'Saudi Aramco', 'arab'],
].map(([symbol, name, type]) => ({ symbol, name, type, price: null, change_pct: null }));

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
      const data = await api('/markets.php?type=crypto&scope=trade&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=50', { timeout: 0, retry: 1, cacheTtl: 15000 });
      _marketsCache = data?.items || data?.markets || data || [];
      if (!_marketsCache.length) _marketsCache = _fallbackDrawerMarkets;
    }
    renderMarketsList(_marketsCache, '');
  } catch (e) {
    _marketsCache = _marketsCache?.length ? _marketsCache : _fallbackDrawerMarkets;
    renderMarketsList(_marketsCache, '');
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
    return `<a href="#/trade?symbol=${encodeURIComponent(sym)}&type=${encodeURIComponent(m.type || 'crypto')}" class="markets-drawer-item" data-symbol="${sym}"> 
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

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
