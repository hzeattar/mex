// Earn View - Copy Trading + level-gated contracts only
import { get, set } from '../state/store.js';
import { money, pct, esc, escAttr } from '../utils/format.js';
import { delegate } from '../utils/dom.js';
import { api, postApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';
import { marketIconPath, marketInitial } from '../utils/marketIcon.js';

export function render() {
  const tab = get('invest.tab') || localStorage.getItem('vp_earn_tab') || 'copy';
  const level = get('level') || {};
  const wallet = activeWallet();
  const current = level.current || {};
  const next = level.next || {};
  const mode = get('mode');

  return `
    <div class="space-y-5 animate-fade-in">
      <section class="feature-hero">
        <div class="relative z-10">
          <span class="badge-accent">Earn desk</span>
          <h1 class="text-2xl lg:text-3xl font-black mt-2">Copy Trading & Contracts</h1>
          <p class="text-muted text-sm mt-2 max-w-2xl">Follow approved copy signals on Real accounts, or subscribe to level-gated contracts managed inside VertexPluse.</p>
        </div>
        <div class="feature-hero__stats">
          ${heroStat('Mode', mode === 'real' ? 'Real' : 'Demo', mode === 'real' ? 'Internal execution' : 'Preview only')}
          ${heroStat('Available', '$' + money(wallet.available), wallet.currency || 'USDT')}
          ${heroStat('Level', current.name || current.name_en || 'Level 1', next?.name ? `Next: ${next.name}` : 'Customer tier')}
        </div>
      </section>

      <section class="level-strip">
        ${levelPill('Current level', current.name || current.name_en || 'Level 1', 'Customer tier')}
        ${levelPill('Next level', next?.name || next?.name_en || 'Level 2', next?.min_deposit_total ? `$${money(next.min_deposit_total)} deposits` : 'Deposit progression')}
        ${levelPill('Real available', '$' + money(wallet.available), wallet.currency || 'USDT')}
        ${levelPill('Active copies', String((get('invest.copies') || []).length || 0), 'Real copy desk')}
        ${levelPill('Active contracts', String((get('invest.mine.contracts') || []).length || 0), 'Running')}
      </section>

      <div class="segmented">
        <button class="${tab === 'copy' ? 'active' : ''}" data-earn-tab="copy">Copy Trading</button>
        <button class="${tab === 'contracts' ? 'active' : ''}" data-earn-tab="contracts">Contracts</button>
      </div>

      <div id="invest-content">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="skeleton h-48 rounded-lg"></div>
          <div class="skeleton h-48 rounded-lg"></div>
        </div>
      </div>
    </div>`;
}

export function mount(container) {
  loadInvest(container);
  delegate(container, '[data-earn-tab]', 'click', (_e, el) => {
    set('invest.tab', el.dataset.earnTab);
    localStorage.setItem('vp_earn_tab', el.dataset.earnTab);
    renderContent(container);
  });
  delegate(container, '[data-copy-signal]', 'click', (_e, btn) => openCopyDialog(btn.dataset.copySignal, container));
  delegate(container, '[data-contract-subscribe]', 'click', (_e, btn) => openContractDialog(btn.dataset.contractSubscribe, container));
  delegate(container, '[data-switch-real]', 'click', () => {
    localStorage.setItem('vp_mode', 'real');
    set('mode', 'real');
    location.reload();
  });
  delegate(container, '[data-open-kyc]', 'click', () => { location.hash = '#/kyc'; });
}

async function loadInvest(container) {
  try {
    const [signals, contracts, copies, mine] = await Promise.all([
      api('/signals.php?bot=1&home=1&lang=en', { timeout: 8000 }).catch(() => ({ items: [] })),
      api('/invest/contracts.php?lang=en', { timeout: 8000 }).catch(() => ({ items: [] })),
      api('/trading_bot/my.php?lang=en', { timeout: 8000 }).catch(() => ({ items: [] })),
      api('/invest/my.php?lang=en', { timeout: 8000 }).catch(() => ({ items: [] })),
    ]);
    set('invest.signals', signals.items || []);
    set('invest.contracts', contracts.items || []);
    set('invest.copies', copies.items || []);
    set('invest.mine', { contracts: (mine.items || []).filter((x) => String(x.product_kind || '').toLowerCase() === 'contract') });
    renderContent(container);
  } catch (_e) {
    renderContent(container);
  }
}

function renderContent(container) {
  const el = container.querySelector('#invest-content');
  if (!el) return;
  const tab = get('invest.tab') || localStorage.getItem('vp_earn_tab') || 'copy';
  const gate = earnGate();
  const content = tab === 'copy' ? copyView() : contractsView();
  el.innerHTML = gate ? gatedWrap(content, gate) : content;
}

function copyView() {
  const signals = get('invest.signals') || [];
  const copies = get('invest.copies') || [];
  return `
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-green">Signal desk</span>
          <h2>Copy trading signals</h2>
          <p>Real-only subscriptions. KYC approval is required before copying.</p>
        </div>
      </div>
      ${signals.length ? `<div class="copy-grid">${signals.map(signalCard).join('')}</div>` : emptyState('No copy signals available yet.')}
    </section>
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-accent">Your desk</span>
          <h2>My copies</h2>
          <p>Active, armed, copied, and closed subscriptions.</p>
        </div>
      </div>
      ${copies.length ? `<div class="history-grid">${copies.map(copyHistoryCard).join('')}</div>` : emptyState('No copied signals yet.')}
    </section>`;
}

function contractsView() {
  const contracts = get('invest.contracts') || [];
  const mine = get('invest.mine.contracts') || [];
  return `
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-accent">Contracts</span>
          <h2>Perpetual and term contracts</h2>
          <p>Level-gated contracts for approved Real wallets.</p>
        </div>
      </div>
      ${contracts.length ? `<div class="contract-grid">${contracts.map(contractCard).join('')}</div>` : emptyState('No contracts available yet.')}
    </section>
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-green">Running</span>
          <h2>My contracts</h2>
          <p>Subscriptions funded from the Real wallet ledger.</p>
        </div>
      </div>
      ${mine.length ? `<div class="history-grid">${mine.map(contractHistoryCard).join('')}</div>` : emptyState('No active contracts yet.')}
    </section>`;
}

function signalCard(sig) {
  const symbol = sig.symbol || sig.market_symbol || '--';
  const dir = String(sig.direction || 'BUY').toUpperCase();
  const type = sig.type || sig.market_type || 'crypto';
  const live = Number(sig.live_price || 0);
  const status = live > 0 ? 'LIVE' : 'UNAVAILABLE';
  const chip = live > 0 ? 'status-chip-live' : 'status-chip-locked';
  const quote = live > 0 ? `$${money(live, type === 'forex' ? 5 : 2)}` : '--';
  const change = live > 0 ? pct(sig.live_change_pct || 0) : '0.00%';
  const minAmount = Number(sig.copy_min_amount || 100);
  return `<article class="copy-card">
    <div class="copy-card__top">
      <div class="flex items-center gap-3 min-w-0">
        ${marketLogo({ symbol, type }, 'market-logo')}
        <div class="min-w-0">
          <h3>${esc(symbol)}</h3>
          <p>${esc(sig.bot_name || sig.bot_name_en || sig.timeframe || 'Managed copy signal')}</p>
        </div>
      </div>
      <span class="badge-${dir === 'BUY' ? 'buy' : 'sell'}">${esc(dir)}</span>
    </div>
    <div class="copy-card__quote">
      <span class="status-chip ${chip}">${status}</span>
      <strong>${quote}</strong>
      <span class="${Number(sig.live_change_pct || 0) >= 0 ? 'text-buy' : 'text-sell'}">${change}</span>
    </div>
    <div class="signal-metrics">
      ${metric('Entry', priceValue(sig.entry ?? sig.entry_price))}
      ${metric('Stop loss', priceValue(sig.sl ?? sig.stop_loss))}
      ${metric('Take profit', priceValue(sig.tp1 ?? sig.take_profit_1))}
      ${metric('Confidence', `${Number(sig.confidence || 0)}%`)}
    </div>
    <p class="copy-brief">${esc(sig.bot_brief || sig.note || 'Admin-managed setup with controlled entry, stop, and target.')}</p>
    <div class="copy-card__chips">
      <span>Min $${money(minAmount)}</span>
      <span>${Number(sig.copy_lock_days || 0)}d lock</span>
      <span>${Number(sig.copy_profit_share_pct || 0)}% share</span>
      <span>${Number(sig.subscribers || 0)} followers</span>
    </div>
    <button class="btn-primary w-full mt-4" data-copy-signal="${escAttr(sig.id)}">Copy Real</button>
  </article>`;
}

function contractCard(c) {
  const eligible = c.eligible !== false;
  const term = Number(c.is_perpetual || 0) === 1 ? 'Perpetual' : `${Number(c.term_days || 0)}d`;
  const min = Number(c.min_amount || 0);
  const badge = eligible ? 'ELIGIBLE' : 'LEVEL LOCKED';
  return `<article class="contract-card ${eligible ? '' : 'locked'}">
    <div class="copy-card__top">
      <div>
        <span class="badge-accent">${esc(c.badge || c.risk || 'Contract')}</span>
        <h3>${esc(c.name || c.name_en || 'Contract')}</h3>
      </div>
      <span class="status-chip ${eligible ? 'status-chip-live' : 'status-chip-locked'}">${badge}</span>
    </div>
    <p class="copy-brief">${esc(c.desc || c.description || c.details || 'Level managed contract product.')}</p>
    <div class="signal-metrics">
      ${metric('ROI', `${Number(c.roi_percent || 0)}%`)}
      ${metric('Term', term)}
      ${metric('Minimum', `$${money(min)}`)}
      ${metric('Schedule', c.payout_schedule || 'end')}
    </div>
    <div class="copy-card__chips">
      <span>${esc(c.required_level?.name || 'Starter')}</span>
      <span>${Number(c.early_exit_allowed || 0) ? 'Early exit' : 'Locked term'}</span>
      <span>${esc(c.product_kind || 'contract')}</span>
    </div>
    <button class="${eligible ? 'btn-primary' : 'btn-ghost'} w-full mt-4" ${eligible ? `data-contract-subscribe="${escAttr(c.id)}"` : 'disabled'}>${eligible ? 'Subscribe' : 'Level locked'}</button>
  </article>`;
}

function copyHistoryCard(item) {
  const symbol = item.symbol || item.market_symbol || '--';
  const status = String(item.status || 'active').toUpperCase();
  return `<article class="history-card">
    <div class="flex items-center gap-3">
      ${marketLogo({ symbol, type: item.type }, 'market-logo')}
      <div class="min-w-0">
        <h3>${esc(symbol)}</h3>
        <p>${esc(item.bot_name || item.timeframe || 'Copy subscription')}</p>
      </div>
      <span class="status-chip">${esc(status)}</span>
    </div>
    <div class="signal-metrics mt-3">
      ${metric('Reserved', `$${money(item.reserved_amount || 0)}`)}
      ${metric('Live', item.live_price ? `$${money(item.live_price)}` : '--')}
      ${metric('Share', `${Number(item.profit_share_pct || 0)}%`)}
      ${metric('Leverage', `${Number(item.leverage || 1)}x`)}
    </div>
  </article>`;
}

function contractHistoryCard(item) {
  return `<article class="history-card">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3>${esc(item.plan_name || 'Contract')}</h3>
        <p>${esc(item.status || 'active')} · ${Number(item.is_perpetual || 0) ? 'Perpetual' : 'Term'}</p>
      </div>
      <span class="status-chip status-chip-live">${esc(item.product_kind || 'contract')}</span>
    </div>
    <div class="signal-metrics mt-3">
      ${metric('Amount', `$${money(item.amount || 0)}`)}
      ${metric('Expected', `$${money(item.expected_return || 0)}`)}
      ${metric('Paid', `$${money(item.paid_total || 0)}`)}
      ${metric('ROI', `${Number(item.cycle_roi_percent || 0)}%`)}
    </div>
  </article>`;
}

function openCopyDialog(id, container) {
  const sig = (get('invest.signals') || []).find((x) => String(x.id) === String(id));
  if (!sig) return;
  const gate = earnGate();
  if (gate) {
    showGateDialog(gate);
    return;
  }
  const minAmount = Number(sig.copy_min_amount || 100);
  showDialog(`
    <form class="space-y-4" id="copy-form">
      <div>
        <span class="badge-green">Copy real</span>
        <h2 class="text-lg font-bold mt-1">${esc(sig.symbol || sig.market_symbol || 'Signal')}</h2>
        <p class="text-xs text-muted">${esc(sig.bot_brief || sig.note || 'Admin-managed copy signal.')}</p>
      </div>
      <div class="signal-metrics">
        ${metric('Entry', priceValue(sig.entry ?? sig.entry_price))}
        ${metric('SL', priceValue(sig.sl ?? sig.stop_loss))}
        ${metric('TP', priceValue(sig.tp1 ?? sig.take_profit_1))}
        ${metric('Share', `${Number(sig.copy_profit_share_pct || 0)}%`)}
      </div>
      <label class="block">
        <span class="text-xs text-muted">Copy amount (USDT)</span>
        <input class="input mt-1" name="amount" type="number" min="${minAmount}" step="0.01" value="${minAmount}" required />
      </label>
      <p class="dialog-note">This uses your Real wallet and may reserve funds until the copy is closed or expires.</p>
      <p class="dialog-error hidden" id="copy-error"></p>
      <button class="btn-primary w-full" type="submit">Confirm Copy</button>
    </form>
  `);
  document.querySelector('#copy-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const err = form.querySelector('#copy-error');
    const amount = Number(new FormData(form).get('amount') || 0);
    try {
      await postApi('/trading_bot/copy.php', { signal_id: Number(id), amount, mode: 'real' }, { timeout: 12000 });
      closeDialog();
      await loadInvest(container);
    } catch (ex) {
      if (err) {
        err.textContent = ex?.message || 'Copy failed';
        err.classList.remove('hidden');
      }
    }
  });
}

function openContractDialog(id, container) {
  const contract = (get('invest.contracts') || []).find((x) => String(x.id) === String(id));
  if (!contract) return;
  const gate = earnGate();
  if (gate) {
    showGateDialog(gate);
    return;
  }
  const minAmount = Number(contract.min_amount || 0);
  showDialog(`
    <form class="space-y-4" id="contract-form">
      <div>
        <span class="badge-accent">Contract</span>
        <h2 class="text-lg font-bold mt-1">${esc(contract.name || contract.name_en || 'Contract')}</h2>
        <p class="text-xs text-muted">${esc(contract.desc || contract.details || 'Level-gated contract subscription.')}</p>
      </div>
      <div class="signal-metrics">
        ${metric('ROI', `${Number(contract.roi_percent || 0)}%`)}
        ${metric('Term', Number(contract.is_perpetual || 0) ? 'Perpetual' : `${Number(contract.term_days || 0)}d`)}
        ${metric('Minimum', `$${money(minAmount)}`)}
        ${metric('Schedule', contract.payout_schedule || 'end')}
      </div>
      <label class="block">
        <span class="text-xs text-muted">Amount (USDT)</span>
        <input class="input mt-1" name="amount" type="number" min="${minAmount}" step="0.01" value="${minAmount}" required />
      </label>
      <p class="dialog-note">Funds are debited through the ledger and the contract is managed internally.</p>
      <p class="dialog-error hidden" id="contract-error"></p>
      <button class="btn-primary w-full" type="submit">Subscribe</button>
    </form>
  `);
  document.querySelector('#contract-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const err = form.querySelector('#contract-error');
    const amount = Number(new FormData(form).get('amount') || 0);
    try {
      await postApi('/invest/subscribe.php', { plan_id: String(id), amount }, {
        timeout: 12000,
        headers: { 'Idempotency-Key': makeIdempotencyKey('contract') },
      });
      closeDialog();
      await loadInvest(container);
    } catch (ex) {
      if (err) {
        err.textContent = ex?.message || 'Subscription failed';
        err.classList.remove('hidden');
      }
    }
  });
}

function earnGate() {
  const mode = get('mode');
  if (mode !== 'real') {
    return {
      title: 'Real account required',
      body: 'Copy trading and contracts are visible in Demo, but activation is Real-only.',
      action: 'Switch to Real',
      attr: 'data-switch-real',
    };
  }
  if (!kycApproved()) {
    return {
      title: 'KYC approval required',
      body: 'Submit and approve KYC before copying signals or subscribing to contracts.',
      action: 'Open KYC',
      attr: 'data-open-kyc',
    };
  }
  return null;
}

function gatedWrap(content, gate) {
  return `<div class="gate-wrap">
    <div class="gate-blur">${content}</div>
    <div class="gate-overlay">
      <div class="gate-card">
        <span class="gate-icon">${icons.lock}</span>
        <strong>${esc(gate.title)}</strong>
        <p>${esc(gate.body)}</p>
        <button class="btn-primary btn-sm" ${gate.attr}>${esc(gate.action)}</button>
      </div>
    </div>
  </div>`;
}

function showGateDialog(gate) {
  showDialog(`<div class="text-center space-y-3">
    <span class="gate-icon mx-auto">${icons.lock}</span>
    <h2 class="text-lg font-bold">${esc(gate.title)}</h2>
    <p class="text-sm text-muted">${esc(gate.body)}</p>
    <button class="btn-primary btn-sm" ${gate.attr}>${esc(gate.action)}</button>
  </div>`);
  document.querySelector(`[${gate.attr}]`)?.addEventListener('click', () => {
    closeDialog();
    if (gate.attr === 'data-switch-real') {
      localStorage.setItem('vp_mode', 'real');
      location.reload();
    } else {
      location.hash = '#/kyc';
    }
  });
}

function showDialog(content) {
  closeDialog();
  const wrap = document.createElement('div');
  wrap.className = 'dialog-backdrop';
  wrap.innerHTML = `<div class="dialog-card">
    <button class="dialog-close" aria-label="Close dialog">${icons.close}</button>
    ${content}
  </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('.dialog-close')?.addEventListener('click', closeDialog);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) closeDialog(); });
}

function closeDialog() {
  document.querySelector('.dialog-backdrop')?.remove();
}

function marketLogo(market, className) {
  const symbol = market.symbol || market.market_symbol || '--';
  return `<span class="${className}">
    <img src="${escAttr(marketIconPath(market, market.type || market.market_type || 'crypto'))}" alt="${escAttr(symbol)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b>${esc(marketInitial(symbol))}</b>
  </span>`;
}

function metric(label, value) {
  return `<div class="mini-metric"><span>${esc(label)}</span><strong>${esc(value ?? '--')}</strong></div>`;
}

function heroStat(label, value, sub) {
  return `<div class="hero-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub || '')}</small></div>`;
}

function levelPill(label, value, sub) {
  return `<div class="level-pill"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub || '')}</small></div>`;
}

function emptyState(text) {
  return `<div class="empty-state">${esc(text)}</div>`;
}

function priceValue(value) {
  const n = Number(value || 0);
  return n > 0 ? `$${money(n, n < 10 ? 4 : 2)}` : '--';
}

function kycApproved() {
  const status = String(get('kyc')?.status || '').toLowerCase();
  return ['approved', 'verified', 'accepted'].includes(status);
}

function activeWallet() {
  const w = get('wallet') || {};
  return get('mode') === 'real'
    ? (w.real || { balance: 0, available: 0, currency: 'USDT' })
    : (w.demo || { balance: 10000, available: 10000, currency: 'USDT_DEMO' });
}

function makeIdempotencyKey(scope) {
  if (globalThis.crypto?.randomUUID) return `${scope}:${globalThis.crypto.randomUUID()}`;
  return `${scope}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}
