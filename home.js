// Home View
import { get, set } from '../state/store.js';
import { money, pct, price, timeAgo, esc, escAttr } from '../utils/format.js';
import { navigate } from '../router.js';
import { api } from '../services/api.js';
import { icons } from '../components/common/Icons.js';
import { marketIconPath, marketInitial } from '../utils/marketIcon.js';
import { currentLocale, setLocale, t, LANG_NAMES, LANG_FLAGS, SUPPORTED } from '../utils/i18n.js';

let homeDocClick = null;
// Listeners bound to the persistent #view container; disposed on cleanup to avoid accumulation.
let homeDisposers = [];

const HOME_FX_CURRENCIES = [
  { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EGP', flag: '🇪🇬', name: 'Egyptian Pound' },
  { code: 'SAR', flag: '🇸🇦', name: 'Saudi Riyal' },
  { code: 'AED', flag: '🇦🇪', name: 'UAE Dirham' },
  { code: 'KWD', flag: '🇰🇼', name: 'Kuwaiti Dinar' },
  { code: 'QAR', flag: '🇶🇦', name: 'Qatari Riyal' },
  { code: 'BHD', flag: '🇧🇭', name: 'Bahraini Dinar' },
  { code: 'OMR', flag: '🇴🇲', name: 'Omani Rial' },
  { code: 'JOD', flag: '🇯🇴', name: 'Jordanian Dinar' },
  { code: 'TRY', flag: '🇹🇷', name: 'Turkish Lira' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
];

export function render() {
  const brand = get('brand') || {};
  const wallet = activeWallet();
  const portfolio = get('portfolio') || {};
  const metrics = portfolio.metrics || {};
  const mode = get('mode') === 'real' ? 'real' : 'demo';
  const level = get('level') || {};
  const currentLevel = level.current || {};
  const nextLevel = level.next || {};
  const confirmedTotal = Number(level.confirmed_deposit_total || level.total_deposits || level.deposit_total || 0);
  const nextRequired = Number(nextLevel.min_deposit_total || nextLevel.min_total_deposit || nextLevel.required_deposit || 0);
  const remainingToNext = Math.max(0, nextRequired - confirmedTotal);
  const levelProgress = nextRequired > 0 ? Math.min(100, Math.round((confirmedTotal / nextRequired) * 100)) : (confirmedTotal > 0 ? 100 : 0);
  const walletBalance = Number(wallet.balance || wallet.available || 0);
  const balance = Number(metrics.total_balance ?? walletBalance);
  const available = Number(metrics.available_balance ?? wallet.available ?? balance ?? 0);
  const holds = Number(metrics.in_use_balance ?? wallet.holds ?? wallet.locked ?? 0);
  const pnl24 = Number(metrics.pnl_24_live ?? 0);
  const pnlTotal = Number(metrics.pnl_total_live ?? 0);
  const tierLabel = currentLevel.name || currentLevel.name_en || currentLevel.level_code || 'Starter';
  const nextLabel = nextLevel.name || nextLevel.name_en || 'next tier';

  return `
    <div class="pro-dashboard animate-fade-in pro-dashboard-compact">
      <section class="pro-card pro-balance-overview" aria-label="Account overview">
        <div class="pro-balance-topline">
          <div class="pro-hero-kicker">
            <span class="badge-accent">${esc(brand.name || 'MEX Group')}</span>
            <span class="pro-pill ${mode === 'real' ? 'is-live' : 'is-demo'}"><i></i>${mode === 'real' ? 'Real workspace' : 'Demo workspace'}</span>
            ${levelBadge(currentLevel)}
          </div>
          <div class="pro-balance-actions">
            ${languageSwitcher()}
            <a href="#/trade" class="btn-primary">Trade</a>
          </div>
        </div>
        <div class="pro-balance-main-row">
          <div class="pro-balance-total">
            <div class="pro-balance-total-head">
              <span>Total balance</span>
              <button class="pro-pnl-chart-btn" id="home-pnl-chart-toggle" type="button" aria-expanded="false" title="PnL total chart">
                ${icons.trade}
              </button>
            </div>
            <strong id="home-balance-total" data-count-to="${balance}">${money(balance)}</strong>
            <small id="home-balance-currency">${esc(wallet.currency || 'USDT')}</small>
            ${homeCurrencyConverter()}
            <div class="home-pnl-chart-card hidden" id="home-pnl-chart-card">
              <div><span>PnL total live</span><b id="home-pnl-chart-value" class="text-buy">${money(0)}</b></div>
              <div class="home-pnl-spark" id="home-pnl-spark">${pnlSparkline(0)}</div>
            </div>
          </div>
          <div class="pro-balance-metrics">
            <span><small>PnL 24 live</small><b id="home-pnl-24" class="${pnl24 >= 0 ? 'text-buy' : 'text-sell'}">${money(pnl24)}</b></span>
            <span><small>PnL total live</small><b id="home-pnl-total" class="${pnlTotal >= 0 ? 'text-buy' : 'text-sell'}">${money(pnlTotal)}</b></span>
            <span><small>Available balance</small><b id="home-balance-available">${money(available)}</b></span>
            <span><small>In use balance</small><b id="home-balance-inuse">${money(holds)}</b></span>
          </div>
        </div>
      </section>

      <section class="pro-card pro-level-scroll-card">
        <div class="pro-section-head">
          <div><span>Level program</span><h2>${esc(tierLabel)} progress</h2></div>
          <b class="pro-level-percent" id="home-level-percent">${levelProgress}%</b>
        </div>
        <div class="pro-progress"><i id="home-level-progress" style="width:${levelProgress}%"></i></div>
        <div class="pro-level-rail" aria-label="Level benefits and next tiers">
          ${renderLevelRail(level, { currentLevel, nextLevel, confirmedTotal, remainingToNext, nextRequired, levelProgress, mode })}
        </div>
      </section>

      <section class="pro-card pro-card-section pro-earn-rail-card blur-gate ${mode !== 'real' ? 'blur-active' : ''}">
        <div class="pro-section-head">
          <div><span>Earn desk</span><h2>Copy trading & contracts</h2><p>Swipe through live signals, recommended copies and level-linked contracts.</p></div>
          <a href="#/invest" class="btn-ghost btn-sm">View all</a>
        </div>
        <div class="blur-gate-content relative" id="home-copy-section">
          ${copyScrollerPlaceholder(mode)}
        </div>
        ${mode !== 'real' ? `<div class="blur-gate-overlay"><span class="badge">Real account only</span></div>` : ''}
      </section>

      <section class="pro-main-layout pro-main-layout-single">
        <div class="pro-main-stack">
          <section class="pro-card pro-card-section">
            <div class="pro-section-head">
              <div><span>Markets</span><h2>Live watchlist</h2></div>
              <a href="#/trade" class="btn-ghost btn-sm">Trade</a>
            </div>
            <div class="pro-market-tabs" id="home-market-tabs">
              ${['All','Crypto','Forex','Stocks','Commodities','Futures','Arab'].map((t,i) =>
                `<button class="${i===0?'active':''}" data-home-tab="${t.toLowerCase()}">${t}</button>`
              ).join('')}
            </div>
            <div class="pro-market-grid" id="home-markets">
              ${Array(8).fill(0).map(() => `<div class="skeleton h-20 rounded-xl"></div>`).join('')}
            </div>
          </section>
        </div>
      </section>
    </div>`;
}
export function mount(container) {
  updateBalanceOverview(container, get('portfolio'));

  // Scroll to current level card once on initial mount (instant, left-positioned)
  requestAnimationFrame(() => {
    const rail = container.querySelector('.pro-level-rail');
    if (rail) scrollCurrentLevelRail(rail, false);
  });

  // Attach logo fallback handlers (not inline onerror)
  const onHomeImgError = (e) => {
    if (e.target.tagName === 'IMG' && e.target.dataset.fallback === 'initial') {
      e.target.style.display = 'none';
      const fallback = e.target.nextElementSibling;
      if (fallback) fallback.style.display = 'grid';
    }
  };
  container.addEventListener('error', onHomeImgError, true);
  homeDisposers.push(() => container.removeEventListener('error', onHomeImgError, true));

  // Stagger reveal for market cards
  setTimeout(() => {
    container.querySelectorAll('#home-markets > *').forEach((card, i) => {
      card.classList.add('stagger-item');
      card.style.animationDelay = `${i * 0.05 + 0.1}s`;
    });
  }, 50);

  const onHomeClick = (e) => {
    const langTrigger = e.target.closest('[data-home-lang-trigger]');
    if (langTrigger) {
      e.preventDefault();
      e.stopPropagation();
      const menu = langTrigger.closest('[data-home-lang-menu]');
      const drop = menu?.querySelector('[data-home-lang-dropdown]');
      const open = drop?.classList.toggle('hidden') === false;
      langTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    const langOption = e.target.closest('[data-home-set-locale]');
    if (langOption) {
      e.preventDefault();
      e.stopPropagation();
      const nextLocale = langOption.dataset.homeSetLocale || langOption.dataset.lang;
      closeHomeLang(container);
      if (nextLocale && nextLocale !== currentLocale()) {
        langOption.disabled = true;
        langOption.classList.add('is-loading');
        setLocale(nextLocale);
      }
      return;
    }
    if (!e.target.closest('[data-home-lang-menu]')) closeHomeLang(container);

    const chartToggle = e.target.closest('#home-pnl-chart-toggle');
    if (chartToggle) {
      e.preventDefault();
      const chartCard = container.querySelector('#home-pnl-chart-card');
      const open = chartCard?.classList.toggle('hidden') === false;
      chartToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }

    const btn = e.target.closest('[data-home-tab]');
    if (!btn) return;
    const tab = btn.dataset.homeTab;
    container.__homeMarketTab = tab;
    container.querySelectorAll('[data-home-tab]').forEach(b => {
      b.classList.toggle('active', b === btn);
    });
    renderMarketsByTab(container, tab);
  };
  container.addEventListener('click', onHomeClick);
  homeDisposers.push(() => container.removeEventListener('click', onHomeClick));

  const onHomeChange = (e) => {
    const select = e.target.closest('#home-fx-select');
    if (!select) return;
    const code = normalizeHomeCurrency(select.value);
    localStorage.setItem('vp_home_currency', code);
    loadHomeFx(container, code);
  };
  container.addEventListener('change', onHomeChange);
  homeDisposers.push(() => container.removeEventListener('change', onHomeChange));

  if (homeDocClick) document.removeEventListener('click', homeDocClick);
  homeDocClick = (e) => {
    if (!container.contains(e.target)) closeHomeLang(container);
  };
  document.addEventListener('click', homeDocClick);

  loadHomeData(container);
  loadHomeFx(container, selectedHomeCurrency());
}

export function cleanup() {
  if (homeDocClick) {
    document.removeEventListener('click', homeDocClick);
    homeDocClick = null;
  }
  homeDisposers.forEach((d) => { try { d(); } catch (_e) {} });
  homeDisposers = [];
}

function animateCount(el, from, to, duration) {
  const start = performance.now();
  const isDecimal = to % 1 !== 0;
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    el.textContent = isDecimal ? current.toFixed(2) : Math.round(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function loadHomeData(container) {
  const mode = get('mode') === 'real' ? 'real' : 'demo';

  // Fire all independent requests in parallel immediately
  const [walletRes, levelRes, marketsRes, portfolioRes, signalsRes, contractsRes] = await Promise.allSettled([
    api('/wallet/summary.php', { timeout: 0, retry: 1, cacheTtl: 12000 }),
    api(`/user/level.php?lang=${encodeURIComponent(currentLocale())}`, { timeout: 0, retry: 1, cacheTtl: 60000 }),
    api('/markets.php?scope=home&supported=1&lite=1&with_quotes=1&rescue=1&limit=30', { timeout: 16000, retry: 1, cacheTtl: 25000 }),
    api(`/trade/portfolio.php?fast=1&mode=${mode}`, { timeout: 0, retry: 1, cacheTtl: 10000 }),
    mode === 'real'
      ? api(`/signals.php?bot=1&home=1&fast=1&lang=${encodeURIComponent(currentLocale())}`, { timeout: 0, retry: 1, cacheTtl: 20000 })
      : Promise.resolve(null),
    api(`/invest/plans.php?kind=contract&home=1&lang=${encodeURIComponent(currentLocale())}`, { timeout: 0, retry: 1, cacheTtl: 60000 }),
  ]);

  // Process wallet
  const wallet = walletRes.status === 'fulfilled' ? walletRes.value : null;
  if (wallet?.real || wallet?.demo) {
    set('wallet', { real: wallet.real || {}, demo: wallet.demo || {} });
    updateBalanceOverview(container);
  } else {
    updateBalanceOverview(container);
  }

  // Process level
  const levelData = levelRes.status === 'fulfilled' ? levelRes.value : null;
  if (levelData?.ok !== false && (levelData?.current || Array.isArray(levelData?.levels))) {
    set('level', levelData);
    updateLevelOverview(container);
  }

  // Process markets
  const markets = marketsRes.status === 'fulfilled' ? marketsRes.value : null;
  if (markets && Array.isArray(markets.items) && markets.items.length) {
    container.__homeAllMarkets = markets.items;
    renderMarketsByTab(container, container.__homeMarketTab || 'all');
  } else {
    // Fallback: try without quotes
    api('/markets.php?scope=home&supported=1&lite=1&limit=30', { timeout: 8000, retry: 0, cacheTtl: 30000 })
      .then((m2) => {
        if (m2 && Array.isArray(m2.items) && m2.items.length) {
          container.__homeAllMarkets = m2.items;
          renderMarketsByTab(container, container.__homeMarketTab || 'all');
        } else {
          const grid = container.querySelector('#home-markets');
          if (grid) grid.innerHTML = '<p class="pro-empty">Markets are reconnecting...</p>';
        }
      })
      .catch(() => {
        const grid = container.querySelector('#home-markets');
        if (grid) grid.innerHTML = '<p class="pro-empty">Markets are reconnecting...</p>';
      });
  }

  // Process portfolio
  const portfolio = portfolioRes.status === 'fulfilled' ? portfolioRes.value : null;
  if (portfolio?.ok !== false) {
    set('portfolio', portfolio);
    updateBalanceOverview(container, portfolio);
  } else {
    updateBalanceOverview(container);
  }

  // Process earn rail (signals + contracts)
  const signals = (signalsRes.status === 'fulfilled' && signalsRes.value) ? signalsRes.value : null;
  const contracts = (contractsRes.status === 'fulfilled' && contractsRes.value) ? contractsRes.value : null;
  renderEarnRail(container, signals?.items || [], contracts?.items || []);
}

function updateBalanceOverview(container, portfolio = get('portfolio')) {
  const wallet = activeWallet();
  const mode = get('mode') === 'real' ? 'real' : 'demo';
  const metrics = portfolio?.metrics || {};
  const balance = Number(wallet.balance || wallet.available || 0);
  const total = Number(metrics.total_balance ?? balance);
  const available = Number(metrics.available_balance ?? wallet.available ?? balance ?? 0);
  const inUse = Number(metrics.in_use_balance ?? wallet.holds ?? wallet.locked ?? 0);
  const pnl24 = Number(metrics.pnl_24_live ?? 0);
  const pnlTotal = Number(metrics.pnl_total_live ?? 0);
  container.__homeBalanceValues = {
    total,
    available,
    inUse,
    pnl24,
    pnlTotal,
    currency: wallet.currency || 'USDT',
  };
  renderConvertedBalances(container);
}

function renderConvertedBalances(container) {
  const base = container.__homeBalanceValues || {};
  const total = Number(base.total || 0);
  const available = Number(base.available || 0);
  const inUse = Number(base.inUse || 0);
  const pnl24 = Number(base.pnl24 || 0);
  const pnlTotal = Number(base.pnlTotal || 0);
  const baseCurrency = base.currency || activeWallet().currency || 'USDT';
  const fx = currentHomeFx();
  const selected = normalizeHomeCurrency(fx.code);
  const rate = Number(fx.rate || 0) > 0 ? Number(fx.rate) : 1;
  const converted = (value) => Number(value || 0) * rate;
  const suffix = selected === 'USD' ? baseCurrency : selected;
  const totalEl = container.querySelector('#home-balance-total');
  if (totalEl) {
    totalEl.dataset.countTo = String(total);
    totalEl.textContent = money(converted(total), homeCurrencyDecimals(selected));
  }
  const curEl = container.querySelector('#home-balance-currency');
  if (curEl) curEl.textContent = selected === 'USD' ? baseCurrency : `${selected} - base ${baseCurrency}`;
  const availEl = container.querySelector('#home-balance-available');
  if (availEl) availEl.textContent = `${money(converted(available), homeCurrencyDecimals(selected))} ${suffix}`;
  const inUseEl = container.querySelector('#home-balance-inuse');
  if (inUseEl) inUseEl.textContent = `${money(converted(inUse), homeCurrencyDecimals(selected))} ${suffix}`;
  const pnl24El = container.querySelector('#home-pnl-24');
  if (pnl24El) {
    pnl24El.textContent = `${money(converted(pnl24), homeCurrencyDecimals(selected))} ${suffix}`;
    pnl24El.className = pnl24 >= 0 ? 'text-buy' : 'text-sell';
  }
  const pnlTotalEl = container.querySelector('#home-pnl-total');
  if (pnlTotalEl) {
    pnlTotalEl.textContent = `${money(converted(pnlTotal), homeCurrencyDecimals(selected))} ${suffix}`;
    pnlTotalEl.className = pnlTotal >= 0 ? 'text-buy' : 'text-sell';
  }
  const fxTotal = container.querySelector('#home-fx-total');
  if (fxTotal) fxTotal.textContent = `${money(converted(total), homeCurrencyDecimals(selected))} ${suffix}`;
  const fxRate = container.querySelector('#home-fx-rate');
  if (fxRate) {
    fxRate.textContent = selected === 'USD'
      ? `1 ${baseCurrency} = 1 USD`
      : `1 ${baseCurrency} ~= ${money(rate, homeCurrencyDecimals(selected))} ${selected}`;
  }
  const fxNote = container.querySelector('#home-fx-note');
  if (fxNote) {
    const source = fx.source ? ` - ${fx.source}` : '';
    fxNote.textContent = selected === 'USD' ? 'Showing account base currency' : `Converted estimate${source}`;
    fxNote.classList.toggle('is-error', Boolean(fx.error));
  }
  const select = container.querySelector('#home-fx-select');
  if (select && select.value !== selected) select.value = selected;
  updatePnlChart(container, converted(pnlTotal), converted(pnl24), suffix);
}

function updateLevelOverview(container) {
  const level = get('level') || {};
  const currentLevel = level.current || {};
  const nextLevel = level.next || {};
  const confirmedTotal = Number(level.confirmed_deposit_total || level.total_deposits || level.deposit_total || 0);
  const nextRequired = Number(nextLevel.min_deposit_total || nextLevel.min_total_deposit || nextLevel.required_deposit || 0);
  const remainingToNext = Math.max(0, nextRequired - confirmedTotal);
  const levelProgress = nextRequired > 0 ? Math.min(100, Math.round((confirmedTotal / nextRequired) * 100)) : (confirmedTotal > 0 ? 100 : 0);
  const title = container.querySelector('.pro-level-scroll-card .pro-section-head h2');
  if (title) title.textContent = `${currentLevel.name || currentLevel.name_en || currentLevel.level_code || 'Starter'} progress`;
  const pctEl = container.querySelector('#home-level-percent');
  if (pctEl) pctEl.textContent = `${levelProgress}%`;
  const bar = container.querySelector('#home-level-progress');
  if (bar) bar.style.width = `${levelProgress}%`;
  const rail = container.querySelector('.pro-level-rail');
  if (rail) {
    const oldScrollLeft = rail.scrollLeft;
    rail.innerHTML = renderLevelRail(level, {
      currentLevel,
      nextLevel,
      confirmedTotal,
      remainingToNext,
      nextRequired,
      levelProgress,
      mode: get('mode') === 'real' ? 'real' : 'demo',
    });
    if (rail.scrollLeft === 0) {
      scrollCurrentLevelRail(rail);
    }
  }
}

function renderEarnRail(container, signals = [], contracts = []) {
  const section = container.querySelector('#home-copy-section');
  if (!section) return;
  const mode = get('mode') === 'real' ? 'real' : 'demo';
  const signalCards = (signals || []).slice(0, 6).map(signalRailCard).join('');
  const contractCards = renderContractRailCards(contracts || []);
  section.innerHTML = `
    <div class="pro-earn-rail-group">
      <div class="pro-rail-label-row">
        <span>Copy desk</span>
        <a href="#/invest" class="btn-ghost btn-xs">Open Earn</a>
      </div>
      <div class="pro-earn-rail" id="copy-scroller">
        ${signalCards || emptyCopyRailCard(mode)}
      </div>
    </div>
    <div class="pro-earn-rail-group">
      <div class="pro-rail-label-row">
        <span>Contracts</span>
        <a href="#/invest" class="btn-ghost btn-xs">View contracts</a>
      </div>
      <div class="pro-earn-rail" id="contracts-scroller">
        ${contractCards}
      </div>
    </div>`;
}

function signalRailCard(sig) {
  const dir = normalizeBotDirection(sig.direction);
  const symbol = sig.symbol || sig.market_symbol || '--';
  const botName = avalonBotName(sig);
  return `<article class="copy-card pro-earn-card">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2 min-w-0">
        <span class="avalon-mini-mark" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg></span>
        <div class="min-w-0">
          <strong class="text-xs truncate block">${esc(botName)}</strong>
          <span class="text-[10px] text-muted truncate block">${esc(symbol)} · AI copy basket</span>
        </div>
      </div>
      ${botDirectionChip(dir)}
    </div>
    <div class="copy-card__quote py-2">
      <span class="status-chip ${Number(sig.live_price || 0) > 0 ? 'status-chip-live' : 'status-chip-locked'}">${Number(sig.live_price || 0) > 0 ? 'LIVE' : 'READY'}</span>
      <strong>${Number(sig.live_price || 0) > 0 ? '$' + money(sig.live_price, sig.type === 'forex' ? 5 : 2) : '--'}</strong>
      <span class="${Number(sig.live_change_pct || 0) >= 0 ? 'text-buy' : 'text-sell'}">${pct(sig.live_change_pct || 0)}</span>
    </div>
    <div class="copy-card__perf mt-2">
      <div class="copy-card__perf-item"><small>Entry</small><strong>${signalLevel(sig.entry || sig.entry_price, sig.type)}</strong></div>
      <div class="copy-card__perf-item ${Number(sig.win_rate||0) >= 60 ? 'pos' : ''}"><small>Win Rate</small><strong>${Number(sig.win_rate||0) > 0 ? Number(sig.win_rate).toFixed(0)+'%' : '--'}</strong></div>
      <div class="copy-card__perf-item pos"><small>TP</small><strong>${signalLevel(sig.tp1 || sig.take_profit_1 || sig.take_profit, sig.type)}</strong></div>
    </div>
    ${signalLevelsMissing(sig) ? `<p class="text-[10px] text-muted mt-2">Awaiting desk levels</p>` : signalLevelsSource(sig)}
    <a href="#/invest" class="btn-primary btn-sm w-full mt-3">Open copy desk</a>
  </article>`;
}

function renderContractRailCards(contracts) {
  const items = (contracts || []).slice(0, 4);
  const source = items.length ? items : [
    { name: 'Daily contract', cycle_roi_percent: 1.8, duration_days: 1, required_level: { name: 'Starter' }, status: 'active' },
    { name: 'Weekly contract', cycle_roi_percent: 8.5, duration_days: 7, required_level: { name: 'Gold' }, status: 'active' },
    { name: 'Monthly contract', cycle_roi_percent: 18, duration_days: 30, required_level: { name: 'Platinum' }, status: 'active' },
  ];
  return source.map((plan) => {
    const required = plan.required_level?.name || plan.required_level?.name_en || plan.level_name || 'Starter';
    const roi = Number(plan.cycle_roi_percent || plan.roi_percent || plan.rate || 0);
    const duration = Number(plan.duration_days || plan.term_days || 0);
    return `<article class="pro-contract-card pro-earn-card">
      <div class="pro-contract-badge">Contract</div>
      <strong>${esc(plan.name || plan.name_en || 'Level contract')}</strong>
      <small>${duration > 0 ? `${duration} day term` : 'Flexible term'} · ${esc(required)} level</small>
      <div class="pro-contract-rate"><span>Target return</span><b>${roi > 0 ? roi.toFixed(2) + '%' : 'Managed'}</b></div>
      <a href="#/invest" class="btn-ghost btn-sm w-full mt-3">View contract</a>
    </article>`;
  }).join('');
}

function emptyCopyRailCard(mode) {
  return `<article class="copy-card pro-earn-card pro-earn-empty-card">
    <div class="pro-contract-badge">Copy desk</div>
    <strong>${mode === 'real' ? 'No active signals yet' : 'Real account only'}</strong>
    <small>${mode === 'real' ? 'The desk will appear here once admin publishes live signals.' : 'Switch to Real and verify KYC to copy live signals.'}</small>
    <a href="#/invest" class="btn-primary btn-sm w-full mt-3">Open Earn</a>
  </article>`;
}

function renderMarkets(container, items) {
  const grid = container.querySelector('#home-markets');
  if (!grid) return;
  grid.innerHTML = items.map((m) => `
    <button class="home-market-card" data-symbol="${escAttr(m.symbol)}" data-type="${escAttr(m.type || 'crypto')}">
      ${marketLogo(m, 'home-market-icon')}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <div class="font-semibold text-sm truncate">${esc(m.symbol)}</div>
          ${quoteStateChip(m)}
        </div>
        <div class="text-[11px] text-muted truncate">${esc(m.name || m.symbol)}</div>
        <div class="mini-spark" aria-hidden="true">${miniSpark(m.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold" data-home-price>${formatMarketPrice(m.price || m.q_price, m.type)}</div>
        <div class="text-[11px] ${Number(m.change_pct || m.q_change || 0) >= 0 ? 'text-buy' : 'text-sell'}" data-home-change>${pct(m.change_pct || m.q_change || 0)}</div>
        <div class="text-[9px] text-muted uppercase mt-1" data-home-source>${quoteStateText(m)}</div>
      </div>
    </button>
  `).join('');
  grid.querySelectorAll('[data-symbol]').forEach((btn) => {
    btn.addEventListener('click', () => navigate('trade', { symbol: btn.dataset.symbol, type: btn.dataset.type }));
  });
}

function renderMarketsByTab(container, tab = 'all') {
  const all = Array.isArray(container.__homeAllMarkets) ? container.__homeAllMarkets : [];
  const key = String(tab || 'all').toLowerCase();
  const normalizedKey = key === 'commodity' ? 'commodities' : key;
  const filtered = normalizedKey === 'all'
    ? all
    : all.filter((item) => normalizeHomeMarketType(item.type) === normalizedKey);
  const visible = filtered.slice(0, normalizedKey === 'all' ? 16 : 30);
  const grid = container.querySelector('#home-markets');
  if (!visible.length) {
    if (grid) grid.innerHTML = '<p class="pro-empty">No markets available in this desk.</p>';
    return;
  }
  renderMarkets(container, visible);
  hydrateMarketQuotes(container, visible);
}

function normalizeHomeMarketType(type) {
  const value = String(type || 'crypto').toLowerCase();
  if (value === 'commodity') return 'commodities';
  if (value === 'stock') return 'stocks';
  if (value === 'future') return 'futures';
  if (value === 'fx') return 'forex';
  return value;
}

async function hydrateMarketQuotes(container, items) {
  const groups = new Map();
  items.forEach((item) => {
    const symbol = String(item.symbol || '').toUpperCase();
    const type = item.type || 'crypto';
    if (!symbol) return;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(symbol);
  });

  const missing = [];
  // Build all chunk requests up-front, then fire them ALL in parallel
  const allRequests = [];
  [...groups.entries()].forEach(([type, symbols]) => {
    const unique = [...new Set(symbols)];
    const chunkSize = type === 'crypto' ? 30 : 8;
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      allRequests.push({ type, chunk, symbols });
    }
  });

  const results = await Promise.allSettled(allRequests.map(({ type, chunk }) =>
    api(`/quotes.php?symbols=${encodeURIComponent(chunk.join(','))}&type=${encodeURIComponent(type)}&visible=1&purpose=watchlist&_=${Date.now()}`, {
      timeout: type === 'crypto' ? 4000 : 6000,
      cacheTtl: 0,
      cache: 'no-store',
    }).catch(() => null)
  ));

  const seen = new Set();
  results.forEach((res, idx) => {
    const { type, chunk, symbols } = allRequests[idx];
    if (res.status === 'fulfilled' && res.value?.items?.length) {
      res.value.items.forEach((q) => {
        seen.add(String(q.symbol || '').toUpperCase());
        applyQuoteToMarketCard(container, q, type);
      });
    }
    symbols.forEach((symbol) => {
      const card = findMarketCard(container, symbol);
      const hasPrice = card && card.querySelector('[data-home-price]')?.textContent !== '--';
      if (!seen.has(symbol) || !hasPrice) missing.push({ symbol, type });
    });
  });
  // Only warm missing if there are few — skip the expensive multi-pass rescue
  if (missing.length > 0 && missing.length <= 12) {
    warmMissingHomeQuotes(container, missing);
  }
}

async function warmMissingHomeQuotes(container, missing) {
  const byType = new Map();
  missing.forEach((item) => {
    if (!item.symbol || !item.type) return;
    if (!byType.has(item.type)) byType.set(item.type, []);
    byType.get(item.type).push(item.symbol);
  });
  // Fire ONE request per type in parallel (no multi-pass rescue)
  const requests = [...byType.entries()].map(([type, symbols]) => {
    const unique = [...new Set(symbols)].slice(0, type === 'crypto' ? 12 : 4);
    return api(`/quotes.php?symbols=${encodeURIComponent(unique.join(','))}&type=${encodeURIComponent(type)}&visible=1&purpose=watchlist&_=${Date.now()}`, {
      timeout: type === 'crypto' ? 4000 : 6000,
      cacheTtl: 0,
      cache: 'no-store',
    }).then((data) => {
      if (data?.items?.length) data.items.forEach((q) => applyQuoteToMarketCard(container, q, type));
    }).catch(() => null);
  });
  await Promise.allSettled(requests);
}

function applyQuoteToMarketCard(container, q, fallbackType) {
  const symbol = String(q.symbol || '').toUpperCase();
  const card = findMarketCard(container, symbol);
  if (!card) return;
  const type = card.dataset.type || q.type || fallbackType;
  const p = Number(q.price || q.q_price || 0);
  const chg = Number(q.change_pct || q.q_change || 0);
  const priceEl = card.querySelector('[data-home-price]');
  const changeEl = card.querySelector('[data-home-change]');
  const sourceEl = card.querySelector('[data-home-source]');
  if (priceEl && p > 0) {
    const oldPrice = parseFloat(priceEl.dataset.price || '0');
    priceEl.textContent = price(p, type);
    priceEl.dataset.price = String(p);
    if (oldPrice > 0 && p !== oldPrice) {
      const cls = p > oldPrice ? 'animate-price-up' : 'animate-price-down';
      priceEl.classList.remove('animate-price-up','animate-price-down');
      requestAnimationFrame(() => {
        priceEl.classList.add(cls);
        setTimeout(() => priceEl.classList.remove(cls), 800);
      });
    }
  }
  if (changeEl) {
    changeEl.textContent = pct(chg);
    changeEl.className = `text-[11px] ${chg >= 0 ? 'text-buy' : 'text-sell'}`;
  }
  if (sourceEl && p > 0) sourceEl.textContent = quoteStateText(q);
  const chip = card.querySelector('[data-quote-chip]');
  if (chip && p > 0) {
    chip.className = `status-chip ${quoteStateClass(q)}`;
    chip.textContent = quoteStateText(q);
  }
}

function findMarketCard(container, symbol) {
  return [...container.querySelectorAll('[data-symbol]')]
    .find((node) => String(node.dataset.symbol || '').toUpperCase() === String(symbol || '').toUpperCase());
}

function marketLogo(market, className) {
  const symbol = market.symbol || '--';
  return `<span class="${className}">
    <img src="${escAttr(marketIconPath(market, market.type || 'crypto'))}" alt="${escAttr(symbol)}" loading="lazy" data-fallback="initial" />
    <b style="display:none">${esc(marketInitial(symbol))}</b>
  </span>`;
}

function renderPositions(container, positions) {
  const el = container.querySelector('#home-positions');
  if (!el) return;
  if (!positions.length) {
    el.innerHTML = `<p class="text-muted text-sm text-center py-6">No open positions</p>`;
    return;
  }
  el.innerHTML = `<div class="grid gap-2 lg:grid-cols-2">${positions.map(positionRow).join('')}</div>`;
}

function positionRow(p) {
  const pnl = Number(p.pnl || p.unrealized_pnl || 0);
  const symbol = String(p.symbol || '').replace('@R@', '');
  const type = p.asset_type || p.type || 'crypto';
  const mark = Number(p.mark_price || p.current_price || p.price || 0);
  return `<div class="position-card">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        ${marketLogo({ symbol, type }, 'market-logo !h-8 !w-8')}
        <div class="min-w-0">
          <strong class="text-sm truncate block">${esc(symbol)}</strong>
          <span class="text-[10px] text-muted">${esc(p.market_type || p.order_type || 'spot')} / ${esc(positionSide(p))}</span>
        </div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono ${pnl >= 0 ? 'text-buy' : 'text-sell'}">${money(pnl)}</div>
        <div class="text-[10px] text-muted">PnL</div>
      </div>
    </div>
    <div class="position-metrics mt-3">
      ${positionMetric('Entry', price(p.entry_price || p.open_price, type))}
      ${positionMetric('Mark', mark > 0 ? price(mark, type) : '--')}
      ${positionMetric('Size', money(p.qty || p.amount || p.size || p.units || 0))}
      ${positionMetric('Lev', `${p.leverage || 1}x`)}
      ${positionMetric('Margin', money(p.margin_initial || p.margin || 0))}
      ${positionMetric('ROE', pct(p.roe_pct || p.roe || 0))}
      ${positionMetric('Opened', positionAge(p))}
    </div>
  </div>`;
}

function positionMetric(label, value) {
  return `<span><small>${label}</small><strong>${value}</strong></span>`;
}

function positionSide(position) {
  const side = String(position.side || 'buy').toUpperCase();
  return side === 'SELL' ? 'SELL' : 'BUY';
}

function positionAge(position) {
  const raw = position.created_at || position.opened_at || position.open_time || '';
  if (!raw) return '--';
  const ts = typeof raw === 'number'
    ? raw
    : (/^\d+$/.test(String(raw)) ? Number(raw) : Math.floor(Date.parse(raw) / 1000));
  return Number.isFinite(ts) && ts > 0 ? timeAgo(ts) : '--';
}

function renderLevelRail(level, ctx) {
  const levels = Array.isArray(level?.levels) ? level.levels : [];
  const currentId = ctx.currentLevel?.id;
  const currentCode = String(ctx.currentLevel?.level_code || '').toLowerCase();
  const currentKey = levelIdentity(ctx.currentLevel);
  const normalized = levels.length ? levels : [
    ctx.currentLevel,
    ctx.nextLevel,
    { name: 'Platinum', level_code: 'platinum', sort_order: 998, min_deposit_total: Math.max(1, ctx.nextRequired ? ctx.nextRequired * 2 : 50000), perks: 'Higher contract limits and priority support' },
    { name: 'VIP', level_code: 'vip', sort_order: 999, min_deposit_total: Math.max(1, ctx.nextRequired ? ctx.nextRequired * 4 : 100000), perks: 'Dedicated execution review and premium limits' },
  ].filter(Boolean);

  const listMap = new Map();
  const seen = new Set();
  const addLevel = (lvl) => {
    if (!lvl || typeof lvl !== 'object') return;
    const key = levelIdentity(lvl);
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    listMap.set(key || `level-${listMap.size}`, lvl);
  };
  normalized.forEach(addLevel);
  addLevel(ctx.currentLevel);
  addLevel(ctx.nextLevel);

  const list = Array.from(listMap.values()).sort((a, b) => {
    const minDiff = levelMinimum(a) - levelMinimum(b);
    if (Math.abs(minDiff) > 0.0000001) return minDiff;
    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  });

  const currentIndex = list.findIndex((lvl) => {
    if (!lvl || typeof lvl !== 'object') return false;
    const sameId = currentId && Number(lvl.id) === Number(currentId);
    const sameCode = currentCode && String(lvl.level_code || '').toLowerCase() === currentCode;
    const sameKey = currentKey && levelIdentity(lvl) === currentKey;
    return Boolean(sameId || sameCode || sameKey);
  });

  const cards = [];
  // Build cards in natural order (completed → current → locked).
  // Then scroll the rail so the current card is first visible.
  list.forEach((lvl, index) => {
    if (!lvl || typeof lvl !== 'object') return;
    const isCurrent = index === currentIndex || ((currentId && Number(lvl.id) === Number(currentId)) || (currentCode && String(lvl.level_code || '').toLowerCase() === currentCode) || (currentKey && levelIdentity(lvl) === currentKey));
    const isCompleted = currentIndex >= 0 && index < currentIndex;
    const min = levelMinimum(lvl);
    const progress = isCurrent ? ctx.levelProgress : (isCompleted ? 100 : 0);
    const title = lvl.name || lvl.name_en || lvl.level_code || `Tier ${index + 1}`;
    const nextName = ctx.nextLevel?.name || ctx.nextLevel?.name_en || 'next tier';
    cards.push(levelProgramCard({
      label: isCurrent ? 'Current tier' : (isCompleted ? 'Completed tier' : 'Locked tier'),
      title,
      sub: isCurrent
        ? (ctx.nextRequired > 0 ? `${money(ctx.remainingToNext)} USDT to ${nextName}` : 'Top tier permissions are active')
        : (isCompleted ? 'Unlocked and completed' : (min > 0 ? `${money(min)} USDT required` : 'Starter access')),
      progress,
      state: isCurrent ? 'current' : (isCompleted ? 'completed' : 'locked'),
      isCurrent,
      perks: levelPerks(lvl, defaultLevelPerks(title, isCurrent, ctx.mode))
    }));
  });

  return cards.join('');
}

function levelIdentity(level) {
  return String(level?.id || level?.level_code || level?.name || level?.name_en || '').toLowerCase();
}

function levelMinimum(level) {
  return Number(level?.min_deposit_total || level?.min_total_deposit || level?.required_deposit || 0);
}

function levelProgramCard({ label, title, sub, progress, state, perks, isCurrent }) {
  const pctValue = progress == null ? null : Math.max(0, Math.min(100, Number(progress) || 0));
  const perkItems = Array.isArray(perks) ? perks : [String(perks || '')].filter(Boolean);
  return `<article class="pro-level-rail-card is-${escAttr(state || 'locked')}"${isCurrent ? ' data-current-level-card="1"' : ''}>
    <div class="pro-level-card-row"><span>${esc(label)}</span>${pctValue == null ? '' : `<b>${pctValue}%</b>`}</div>
    <strong>${esc(title)}</strong>
    <small>${esc(sub || '')}</small>
    ${pctValue == null ? '' : `<div class="pro-mini-progress"><i style="width:${pctValue}%"></i></div>`}
    <ul class="pro-level-benefits">
      ${perkItems.slice(0, 5).map((item) => `<li>${esc(item)}</li>`).join('')}
    </ul>
  </article>`;
}

function levelPerks(level, fallback) {
  const raw = level?.perks || level?.perks_en || level?.features || level?.description || '';
  const fallbackItems = Array.isArray(fallback) ? fallback : String(fallback || '').split('|');
  if (!raw) return fallbackItems.filter(Boolean);
  const clean = String(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const items = clean.split(/[\n\r,;|•·]+/).map((x) => x.trim()).filter(Boolean);
  return (items.length > 1 ? items : [clean]).slice(0, 5);
}

function defaultLevelPerks(title, isCurrent, mode) {
  const label = String(title || '').toLowerCase();
  if (label.includes('vip')) return ['Priority account handling', 'Highest contract access', 'Premium copy desk limits'];
  if (label.includes('platinum')) return ['Advanced copy desk access', 'Higher contract caps', 'Priority funding review'];
  if (label.includes('gold')) return ['Premium copy desk', 'Higher contract caps', 'Dedicated account guidance'];
  if (isCurrent && mode === 'real') return ['Live trading enabled', 'Wallet and funding access', 'Copy desk eligibility'];
  return ['Market access', 'Watchlist and trade desk', 'Level progression benefits'];
}

function homeCurrencyConverter() {
  const selected = selectedHomeCurrency();
  const options = HOME_FX_CURRENCIES.map((item) => `
    <option value="${escAttr(item.code)}" ${item.code === selected ? 'selected' : ''}>${item.flag} ${esc(item.name)} (${item.code})</option>
  `).join('');
  return `<div class="home-fx-converter" aria-label="Local balance converter">
    <label class="home-fx-select-wrap">
      <span>Local currency</span>
      <select id="home-fx-select">${options}</select>
    </label>
    <div class="home-fx-preview">
      <small>Converted total</small>
      <b id="home-fx-total">${money(0)} USDT</b>
      <em id="home-fx-rate">1 USDT = 1 USD</em>
    </div>
    <p id="home-fx-note">Showing account base currency</p>
  </div>`;
}

function selectedHomeCurrency() {
  return normalizeHomeCurrency(localStorage.getItem('vp_home_currency') || 'USD');
}

function normalizeHomeCurrency(code) {
  const raw = String(code || 'USD').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return HOME_FX_CURRENCIES.some((item) => item.code === raw) ? raw : 'USD';
}

function homeCurrencyDecimals(code) {
  return ['JPY'].includes(code) ? 0 : 2;
}

function currentHomeFx() {
  const selected = selectedHomeCurrency();
  const cached = get('home.fx') || {};
  if (normalizeHomeCurrency(cached.code) === selected && Number(cached.rate || 0) > 0) {
    return { code: selected, rate: Number(cached.rate), source: cached.source || '', error: Boolean(cached.error) };
  }
  return { code: selected, rate: 1, source: selected === 'USD' ? 'base' : '', error: false };
}

async function loadHomeFx(container, code = selectedHomeCurrency()) {
  const selected = normalizeHomeCurrency(code);
  localStorage.setItem('vp_home_currency', selected);
  if (selected === 'USD') {
    set('home.fx', { code: 'USD', rate: 1, source: 'base', updated_at: Math.floor(Date.now() / 1000) });
    renderConvertedBalances(container);
    return;
  }
  const existing = get('home.fx') || {};
  if (normalizeHomeCurrency(existing.code) === selected && Number(existing.rate || 0) > 0) {
    renderConvertedBalances(container);
  }
  try {
    const data = await api(`/fx_rate.php?to=${encodeURIComponent(selected)}`, { timeout: 4000, retry: 1, cacheTtl: 3600000 });
    const rate = Number(data?.rate || 0);
    if (rate > 0) {
      set('home.fx', { code: selected, rate, source: data.source || 'fx', updated_at: Number(data.updated_at || 0), error: false });
    } else {
      set('home.fx', { code: selected, rate: Number(existing.rate || 1), source: data?.source || 'fx', updated_at: Number(data?.updated_at || 0), error: true });
    }
  } catch (_e) {
    set('home.fx', { code: selected, rate: Number(existing.rate || 1), source: existing.source || 'cached', updated_at: Number(existing.updated_at || 0), error: true });
  }
  renderConvertedBalances(container);
}

function languageSwitcher() {
  const locale = currentLocale();
  const options = SUPPORTED.map((code) => {
    const active = code === locale ? ' is-active' : '';
    return `<button type="button" class="home-lang-option${active}" data-home-set-locale="${escAttr(code)}" data-lang="${escAttr(code)}">
      <span>${LANG_FLAGS[code] || '🏳️'}</span><b>${esc(LANG_NAMES[code] || code.toUpperCase())}</b>
    </button>`;
  }).join('');
  return `<div class="home-lang-menu" data-home-lang-menu>
    <button class="home-lang-trigger" type="button" data-home-lang-trigger aria-expanded="false" title="Language">
      <span>${LANG_FLAGS[locale] || '🏳️'}</span>
      <b>${esc(LANG_NAMES[locale] || locale.toUpperCase())}</b>
      <i>${icons.chevronDown}</i>
    </button>
    <div class="home-lang-dropdown hidden" data-home-lang-dropdown>${options}</div>
  </div>`;
}

function closeHomeLang(container) {
  const dropdown = container.querySelector('[data-home-lang-dropdown]');
  const trigger = container.querySelector('[data-home-lang-trigger]');
  if (dropdown) dropdown.classList.add('hidden');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function updatePnlChart(container, pnlTotal, pnl24, suffix = '') {
  const value = container.querySelector('#home-pnl-chart-value');
  const spark = container.querySelector('#home-pnl-spark');
  if (value) {
    value.textContent = `${money(pnlTotal)}${suffix ? ' ' + suffix : ''}`;
    value.className = pnlTotal >= 0 ? 'text-buy' : 'text-sell';
  }
  if (spark) spark.innerHTML = pnlSparkline(pnlTotal, pnl24);
}

function pnlSparkline(total = 0, day = 0) {
  const base = Number(total || 0);
  const drift = Number(day || base || 1);
  const points = Array.from({ length: 12 }, (_, i) => {
    const wave = Math.sin((i + 1) * 0.9) * Math.max(12, Math.abs(drift) * 0.025);
    return base * (i / 11) + wave;
  });
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 1);
  const span = Math.max(1, max - min);
  const coords = points.map((v, i) => {
    const x = 5 + i * 10;
    const y = 54 - ((v - min) / span) * 44;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = base >= 0 ? 'var(--buy)' : 'var(--sell)';
  return `<svg viewBox="0 0 120 64" role="img" aria-label="PnL total chart" preserveAspectRatio="none">
    <path d="M0 54 H120" class="home-pnl-axis"></path>
    <polyline points="${coords}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
  </svg>`;
}

function walletCard(label, value, sub) {
  return `<div class="hero-metric-card">
    <div class="text-[10px] uppercase text-muted tracking-wide">${label}</div>
    <div class="text-base font-bold mt-1">${value}</div>
    <div class="text-[10px] text-muted">${sub || ''}</div>
  </div>`;
}

function supportStripCard(title, text, href, badgeClass) {
  return `<article class="card home-support-card">
    <span class="${badgeClass}">${esc(title)}</span>
    <strong>${esc(title)}</strong>
    <small>${esc(text)}</small>
    <a href="${href}" class="btn-ghost btn-sm mt-3">Open</a>
  </article>`;
}

function levelScrollItem(label, value, sub, progress = null) {
  const pctValue = progress == null ? null : Math.max(0, Math.min(100, Number(progress) || 0));
  return `<article class="home-level-item">
    <span>${esc(label)}</span>
    <strong>${esc(value)}</strong>
    <small>${esc(sub || '')}</small>
    ${pctValue == null ? '' : `<div class="home-level-meter" aria-label="${pctValue}%"><i style="width:${pctValue}%"></i></div>`}
  </article>`;
}

function copyScrollerPlaceholder(mode) {
  if (mode !== 'real') {
    return `<div class="relative min-h-[180px]">
      <div class="flex gap-4 overflow-x-auto pb-3 blur-[4px] opacity-50 pointer-events-none">
        ${Array(4).fill(0).map(() => `<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>`).join('')}
      </div>
      <div class="absolute inset-0 grid place-items-center">
        <div class="card-glass text-center p-6 max-w-sm">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3">${icons.lock}</span>
          <strong class="block">Real Account Only</strong>
          <p class="text-muted text-sm mt-1">Switch to Real and verify KYC to copy live signals.</p>
        </div>
      </div>
    </div>`;
  }
  return `<div class="flex gap-4 overflow-x-auto pb-3 snap-x" id="copy-scroller">
    ${Array(3).fill(0).map(() => `<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>`).join('')}
  </div>`;
}

function activeWallet() {
  const w = get('wallet') || {};
  const mode = get('mode');
  return mode === 'real' ? (w.real || { balance: 0, available: 0, currency: 'USDT' }) : (w.demo || { balance: 10000, available: 10000, currency: 'USDT_DEMO' });
}

function formatMarketPrice(value, type) {
  const n = Number(value || 0);
  return n > 0 ? price(n, type) : '--';
}

function quoteStateText(m) {
  const source = String(m.source || m.provider || '').toLowerCase();
  const timing = String(m.timing_class || '').toLowerCase();
  if (Number(m.price || m.q_price || 0) <= 0) return 'Unavailable';
  if (timing === 'stale' || m.is_stale) return 'Stale';
  if (m.delayed || source.includes('yahoo')) return 'Delayed';
  if (source.includes('binance') || source.includes('stream') || timing === 'live') return 'Live';
  return source ? source.replace(/_/g, ' ') : 'Cached';
}

function quoteStateClass(m) {
  const text = quoteStateText(m).toLowerCase();
  if (text === 'live') return 'status-chip-live';
  if (text === 'unavailable') return 'status-chip-locked';
  return 'status-chip-delayed';
}

function quoteStateChip(m) {
  return `<span data-quote-chip class="status-chip ${quoteStateClass(m)}">${quoteStateText(m)}</span>`;
}

function levelBadge(level) {
  const code = String(level?.level_code || level?.name_en || 'starter').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const label = level?.name || level?.name_en || level?.level_code || 'Starter';
  return `<span class="level-badge level-badge--${escAttr(code)}">${esc(label)}</span>`;
}

function miniSpark(symbol) {
  const seed = String(symbol || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return Array.from({ length: 12 }, (_, i) => {
    const h = 18 + ((seed + i * 13) % 26);
    return `<i style="height:${h}px"></i>`;
  }).join('');
}

function signalLevel(value, type) {
  const n = Number(value || 0);
  return n > 0 ? price(n, type) : '--';
}

function signalLevelsMissing(sig) {
  return !(Number(sig.entry || sig.entry_price || 0) > 0) || !(Number(sig.tp1 || sig.take_profit_1 || sig.take_profit || 0) > 0) || !(Number(sig.sl || sig.stop_loss || 0) > 0);
}

function signalLevelsSource(sig) {
  return sig.levels_source === 'live_derived'
    ? `<p class="text-[10px] text-spread mt-2">Live-derived desk levels</p>`
    : '';
}

// Human-readable asset name map for bot fallback names
const ASSET_DISPLAY = {
  BTC:'Bitcoin',ETH:'Ethereum',SOL:'Solana',XRP:'XRP',BNB:'BNB',
  DOGE:'Dogecoin',ADA:'Cardano',AVAX:'Avalanche',LINK:'Chainlink',DOT:'Polkadot',
  LTC:'Litecoin',MATIC:'Polygon',UNI:'Uniswap',ATOM:'Cosmos',ETC:'Ethereum Classic',
  XLM:'Stellar',TRX:'TRON',SHIB:'Shiba Inu',NEAR:'NEAR Protocol',VET:'VeChain',
  SAND:'Sandbox',MANA:'Decentraland',ALGO:'Algorand',AAVE:'Aave',ICP:'Internet Computer',
  FIL:'Filecoin',APT:'Aptos',ARB:'Arbitrum',OP:'Optimism',INJ:'Injective',
  SUI:'Sui',GRT:'The Graph',CRV:'Curve',MKR:'Maker',FET:'Fetch.ai',
  STX:'Stacks',COMP:'Compound',ZEC:'Zcash',DASH:'Dash',SNX:'Synthetix',
  EUR:'Euro',GBP:'Pound',JPY:'Yen',CHF:'Franc',AUD:'Australian Dollar',
  CAD:'Canadian Dollar',NZD:'New Zealand Dollar',SEK:'Swedish Krona',
  XAU:'Gold',XAG:'Silver',USOIL:'Crude Oil',AAPL:'Apple',TSLA:'Tesla',
  NVDA:'NVIDIA',MSFT:'Microsoft',GOOGL:'Alphabet',META:'Meta',AMZN:'Amazon',
};

function avalonBotName(item) {
  const explicit = String(item?.bot_name || item?.bot_name_en || '').trim();
  if (explicit) return explicit;
  const symbol = String(item?.symbol || item?.market_symbol || 'AI').toUpperCase();
  // Try to find a known asset name from the symbol prefix
  const assetKey = Object.keys(ASSET_DISPLAY).find((k) => symbol.startsWith(k));
  const asset = assetKey ? ASSET_DISPLAY[assetKey] : (symbol.replace(/(USDT|USD|_F|BUSD|FDUSD|USDC)$/i, '') || symbol);
  return `Avalon ${asset} AI Bot`;
}

function normalizeBotDirection(direction) {
  const dir = String(direction || 'BUY').toUpperCase();
  return ['BUY', 'SELL', 'NEUTRAL'].includes(dir) ? dir : 'BUY';
}

function botDirectionChip(direction) {
  const dir = normalizeBotDirection(direction);
  return `<span class="bot-direction-chip is-${dir.toLowerCase()}">${esc(dir)}</span>`;
}

/**
 * Scroll the level rail so the current level card is the first visible card.
 * Previous (completed) levels remain scrollable to the left.
 * @param {Element} rail  - the .pro-level-rail element
 * @param {boolean} smooth - use smooth scrolling (true after data refresh, false on mount)
 */
function scrollCurrentLevelRail(rail) {
  if (!rail) return;
  const card = rail.querySelector('[data-current-level-card="1"]');
  if (!card) return;
  const cards = Array.from(rail.children);
  const idx = cards.indexOf(card);
  const gap = 12;
  const cardW = 285;
  const target = Math.max(0, idx * (cardW + gap));
  // Defer scroll until the browser has fully laid out the new cards.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      rail.scrollLeft = target;
    });
  });
}
