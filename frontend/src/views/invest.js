// Earn View - Copy Trading + level-gated contracts only
import { get, set } from '../state/store.js';
import { money, pct, esc, escAttr } from '../utils/format.js';
import { delegate } from '../utils/dom.js';
import { api, postApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';
import { marketIconPath, marketInitial } from '../utils/marketIcon.js';
import { currentLocale, t } from '../utils/i18n.js';

// Listeners bound to the persistent #view container; disposed on cleanup to avoid accumulation.
let investDisposers = [];

export function render() {
  const tab = get('invest.tab') || localStorage.getItem('vp_earn_tab') || 'copy';
  const level = get('level') || {};
  const wallet = activeWallet();
  const current = level.current || {};
  const next = level.next || {};
  const mode = get('mode');

  return `
    <div class="space-y-4 animate-fade-in earn-page">
      <div class="earn-balance-bar">
        <span class="text-[10px] text-muted uppercase tracking-wider">${t('balance.available', 'Available Balance')}</span>
        <strong class="text-lg font-mono">${money(wallet.available)} <small class="text-muted text-xs font-normal">${esc(wallet.currency || 'USDT')}</small></strong>
        <span class="earn-mode-chip ${mode === 'real' ? 'is-real' : 'is-demo'}">${mode === 'real' ? t('mode.real', 'Real') : t('mode.demo', 'Demo')}</span>
      </div>

      <div class="segmented">
        <button class="${tab === 'copy' ? 'active' : ''}" data-earn-tab="copy">${t('earn.trading_bots', 'Trading Bots')}</button>
        <button class="${tab === 'contracts' ? 'active' : ''}" data-earn-tab="contracts">${t('earn.contracts', 'Contracts')}</button>
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
  // Position level strip to current level once on mount (instant)
  const strip = container.querySelector('.level-strip');
  if (strip) {
    const currentPill = strip.querySelector('.level-pill.is-current');
    if (currentPill) {
      requestAnimationFrame(() => {
        strip.scrollTo({ left: currentPill.offsetLeft - 8, behavior: 'auto' });
      });
    }
  }
  investDisposers.push(delegate(container, '[data-earn-tab]', 'click', (_e, el) => {
    set('invest.tab', el.dataset.earnTab);
    localStorage.setItem('vp_earn_tab', el.dataset.earnTab);
    renderContent(container);
  }));
  investDisposers.push(delegate(container, '[data-copy-signal]', 'click', (_e, btn) => openCopyDialog(btn.dataset.copySignal, container)));
  investDisposers.push(delegate(container, '[data-cancel-copy]', 'click', (_e, btn) => cancelCopySubscription(btn.dataset.cancelCopy, container)));
  investDisposers.push(delegate(container, '[data-contract-subscribe]', 'click', (_e, btn) => openContractDialog(btn.dataset.contractSubscribe, container)));
  investDisposers.push(delegate(container, '[data-switch-real]', 'click', () => {
    localStorage.setItem('vp_mode', 'real');
    set('mode', 'real');
    location.reload();
  }));
  investDisposers.push(delegate(container, '[data-open-kyc]', 'click', () => { location.hash = '#/kyc'; }));
}

export function cleanup() {
  investDisposers.forEach((d) => { try { d(); } catch (_e) {} });
  investDisposers = [];
}

async function loadInvest(container) {
  try {
    const [signals, contracts, copies, mine] = await Promise.all([
      api(`/signals.php?bot=1&home=1&lang=${encodeURIComponent(currentLocale())}`, { timeout: 8000 }).catch(() => ({ items: [] })),
      api(`/invest/contracts.php?lang=${encodeURIComponent(currentLocale())}`, { timeout: 8000 }).catch(() => ({ items: [] })),
      api(`/trading_bot/my.php?lang=${encodeURIComponent(currentLocale())}`, { timeout: 8000 }).catch(() => ({ items: [] })),
      api(`/invest/my.php?lang=${encodeURIComponent(currentLocale())}`, { timeout: 8000 }).catch(() => ({ items: [] })),
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
  // Update tab active states
  container.querySelectorAll('[data-earn-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.earnTab === tab);
  });
}

function copyView() {
  const signals = get('invest.signals') || [];
  const copies = get('invest.copies') || [];
  const activeCopies = copies.filter(copyIsActive);
  const closedCopies = copies.filter(item => !copyIsActive(item));
  return `
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-green">${t('bot.avalon_ai', 'Avalon AI')}</span>
          <h2>${t('bot.avalon_name', 'Avalon AI Trading Bot')}</h2>
          <p>${t('bot.avalon_copy', 'Real-only AI copy bots with admin-managed trade operations.')}</p>
        </div>
      </div>
      ${signals.length ? `<div class="copy-grid">${signals.map(signalCard).join('')}</div>` : emptyState(t('bot.no_signals', 'No bot trades available yet.'))}
    </section>
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-accent">${t('earn.your_desk', 'Your desk')}</span>
          <h2>${t('bot.my_avalon_copies', 'My Avalon copies')}</h2>
          <p>${t('bot.copies_separate_copy', 'Copied bot operations are kept here, separate from manual Trade activity.')}</p>
        </div>
      </div>
      <div class="copy-history-columns">
        <div>
          <div class="history-subtitle"><span>${t('trade.active', 'Active')}</span><b>${activeCopies.length}</b></div>
          ${activeCopies.length ? `<div class="history-grid">${activeCopies.map(copyHistoryCard).join('')}</div>` : emptyState(t('bot.no_active_copies', 'No active copies.'))}
        </div>
        <div>
          <div class="history-subtitle"><span>${t('trade.closed', 'Closed')}</span><b>${closedCopies.length}</b></div>
          ${closedCopies.length ? `<div class="history-grid">${closedCopies.map(copyHistoryCard).join('')}</div>` : emptyState(t('bot.no_closed_copies', 'No closed copies yet.'))}
        </div>
      </div>
    </section>`;
}

function contractsView() {
  const contracts = get('invest.contracts') || [];
  const mine = get('invest.mine.contracts') || [];
  return `
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-accent">${t('earn.contracts', 'Contracts')}</span>
          <h2>${t('earn.contracts_title', 'Perpetual and term contracts')}</h2>
          <p>${t('earn.contracts_copy', 'Level-gated contracts for approved Real wallets.')}</p>
        </div>
      </div>
      ${contracts.length ? `<div class="contract-grid">${contracts.map(contractCard).join('')}</div>` : emptyState(t('earn.no_contracts', 'No contracts available yet.'))}
    </section>
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-green">${t('earn.running', 'Running')}</span>
          <h2>${t('earn.my_contracts', 'My contracts')}</h2>
          <p>${t('earn.my_contracts_copy', 'Subscriptions funded from the Real wallet ledger.')}</p>
        </div>
      </div>
      ${mine.length ? `<div class="history-grid">${mine.map(contractHistoryCard).join('')}</div>` : emptyState(t('earn.no_active_contracts', 'No active contracts yet.'))}
    </section>`;
}

function signalCard(sig) {
  const symbol = sig.symbol || sig.market_symbol || '--';
  const dir = String(sig.direction || 'BUY').toUpperCase();
  const direction = normalizeDirection(dir);
  const type = sig.type || sig.market_type || 'crypto';
  const live = Number(sig.live_price || 0);
  const status = live > 0 ? t('market.live', 'LIVE') : t('market.unavailable', 'UNAVAILABLE');
  const chip = live > 0 ? 'status-chip-live' : 'status-chip-locked';
  const quote = live > 0 ? `$${money(live, type === 'forex' ? 5 : 2)}` : '--';
  const change = live > 0 ? pct(sig.live_change_pct || 0) : '0.00%';
  const minAmount = Number(sig.copy_min_amount || 100);
  const levelChip = sig.levels_source === 'live_derived' ? '<span class="status-chip status-chip-derived">Live derived levels</span>' : '';
  return `<article class="copy-card">
    <div class="copy-card__top">
      <div class="flex items-center gap-3 min-w-0">
        <span class="avalon-bot-mark" aria-hidden="true">&#129302;</span>
        <div class="min-w-0">
          <h3>${esc(sig.bot_name || sig.bot_name_en || `Avalon ${symbol} AI Bot`)}</h3>
          <p>${esc(symbol)} - ${t('bot.ai_trade_operation', 'AI trade operation')}</p>
        </div>
      </div>
      ${directionChip(direction)}
    </div>
    <div class="copy-card__quote">
      <span class="status-chip ${chip}">${status}</span>
      <strong>${quote}</strong>
      <span class="${Number(sig.live_change_pct || 0) >= 0 ? 'text-buy' : 'text-sell'}">${change}</span>
    </div>
    <div class="signal-metrics">
      ${metric(t('trade.entry', 'Entry'), priceValue(sig.entry ?? sig.entry_price))}
      ${metric(t('trade.stop_loss', 'Stop loss'), priceValue(sig.sl ?? sig.stop_loss))}
      ${metric(t('trade.take_profit', 'Take profit'), priceValue(sig.tp1 ?? sig.take_profit_1))}
      ${metric(t('bot.confidence', 'Confidence'), `${Number(sig.confidence || 0)}%`)}
    </div>
    <p class="copy-brief">${esc(sig.bot_brief || sig.note || t('bot.default_brief', 'Desk-managed setup with controlled entry, stop, and target.'))}</p>
    <div class="copy-card__chips">
      <span>${t('common.min', 'Min')} $${money(minAmount)}</span>
      <span>${Number(sig.copy_lock_days || 0)}${t('common.days_short', 'd')} ${t('bot.lock', 'lock')}</span>
      <span>${Number(sig.copy_profit_share_pct || 0)}% ${t('bot.share', 'share')}</span>
      <span>${Number(sig.subscribers || 0)} ${t('bot.followers', 'followers')}</span>
      ${levelChip}
    </div>
    <button class="btn-primary w-full mt-4" data-copy-signal="${escAttr(sig.id)}">${t('bot.copy_on_real', 'Copy on Real')}</button>
  </article>`;
}

function contractCard(c) {
  const eligible = c.eligible !== false;
  const term = Number(c.is_perpetual || 0) === 1 ? t('earn.perpetual', 'Perpetual') : `${Number(c.term_days || 0)}${t('common.days_short', 'd')}`;
  const min = Number(c.min_amount || 0);
  const badge = eligible ? t('earn.eligible', 'ELIGIBLE') : t('earn.level_locked', 'LEVEL LOCKED');
  return `<article class="contract-card ${eligible ? '' : 'locked'}">
    <div class="copy-card__top">
      <div>
        <span class="badge-accent">${esc(c.badge || c.risk || t('earn.contract', 'Contract'))}</span>
        <h3>${esc(c.name || c.name_en || t('earn.contract', 'Contract'))}</h3>
      </div>
      <span class="status-chip ${eligible ? 'status-chip-live' : 'status-chip-locked'}">${badge}</span>
    </div>
    <p class="copy-brief">${esc(c.desc || c.description || c.details || t('earn.contract_default_copy', 'Level managed contract product.'))}</p>
    <div class="signal-metrics">
      ${metric(t('earn.roi', 'ROI'), `${Number(c.roi_percent || 0)}%`)}
      ${metric(t('earn.term', 'Term'), term)}
      ${metric(t('earn.minimum', 'Minimum'), `$${money(min)}`)}
      ${metric(t('earn.schedule', 'Schedule'), c.payout_schedule || t('earn.end', 'end'))}
    </div>
    <div class="copy-card__chips">
      <span>${esc(c.required_level?.name || t('level.starter', 'Starter'))}</span>
      <span>${Number(c.early_exit_allowed || 0) ? t('earn.early_exit', 'Early exit') : t('earn.locked_term', 'Locked term')}</span>
      <span>${esc(c.product_kind || t('earn.contract', 'contract'))}</span>
    </div>
    <button class="${eligible ? 'btn-primary' : 'btn-ghost'} w-full mt-4" ${eligible ? `data-contract-subscribe="${escAttr(c.id)}"` : 'disabled'}>${eligible ? t('earn.subscribe', 'Subscribe') : t('earn.level_locked_label', 'Level locked')}</button>
  </article>`;
}

function copyStatusLabel(raw) {
  const s = String(raw || 'active').toLowerCase();
  const map = {
    active: t('bot.status_active', 'Active'),
    armed: t('bot.status_armed', 'Armed'),
    copied: t('bot.status_copied', 'Copied'),
    open: t('bot.status_open', 'Open'),
    running: t('bot.status_running', 'Running'),
    pending: t('bot.status_pending', 'Pending'),
    closed: t('bot.status_closed', 'Closed'),
    canceled: t('bot.status_canceled', 'Canceled'),
    cancelled: t('bot.status_canceled', 'Canceled'),
    expired: t('bot.status_expired', 'Expired'),
  };
  return map[s] || String(raw || '').toUpperCase();
}

function copyHistoryCard(item) {
  const symbol = item.symbol || item.market_symbol || '--';
  const status = copyStatusLabel(item.status);
  const active = copyIsActive(item);
  const openPositions = Array.isArray(item.open_positions) ? item.open_positions : [];
  const closedPositions = Array.isArray(item.closed_positions) ? item.closed_positions : [];
  const pnlTotal = Number(item.pnl_total || 0);
  return `<article class="history-card">
    <div class="flex items-center gap-3">
      <span class="avalon-mini-mark" aria-hidden="true">&#129302;</span>
      <div class="min-w-0">
        <h3>${esc(item.bot_name || item.bot_name_en || `Avalon ${symbol} AI Bot`)}</h3>
        <p>${esc(symbol)} - ${esc(item.status_group ? copyStatusLabel(item.status_group) : t('bot.copy_subscription', 'copy subscription'))}</p>
      </div>
      <span class="status-chip">${esc(status)}</span>
    </div>
    <div class="signal-metrics mt-3">
      ${metric(t('bot.reserved', 'Reserved'), `$${money(item.reserved_amount || 0)}`)}
      ${metric(t('trade.open', 'Open'), String(item.open_count ?? openPositions.length))}
      ${metric(t('trade.closed', 'Closed'), String(item.closed_count ?? closedPositions.length))}
      ${metric('PnL', `$${money(pnlTotal)}`)}
    </div>
    <details class="copy-details">
      <summary>${t('bot.trade_history', 'Bot trade history')}</summary>
      <div class="copy-details-list">
        ${openPositions.length ? `<strong>${t('trade.active_trades', 'Active trades')}</strong>${openPositions.map(copyPositionRow).join('')}` : ''}
        ${closedPositions.length ? `<strong>${t('trade.closed_trades', 'Closed trades')}</strong>${closedPositions.map(copyPositionRow).join('')}` : ''}
        ${!openPositions.length && !closedPositions.length ? `<p class="text-muted text-xs">${t('bot.no_child_trades', 'No child trades have been opened yet.')}</p>` : ''}
      </div>
    </details>
    ${active ? `<button class="btn-danger w-full mt-3" data-cancel-copy="${escAttr(item.id)}">${t('bot.cancel_copy_market', 'Cancel copy at market')}</button>` : ''}
  </article>`;
}

function contractHistoryCard(item) {
  return `<article class="history-card">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3>${esc(item.plan_name || t('earn.contract', 'Contract'))}</h3>
        <p>${esc(copyStatusLabel(item.status))} &middot; ${Number(item.is_perpetual || 0) ? t('earn.perpetual', 'Perpetual') : t('earn.term', 'Term')}</p>
      </div>
      <span class="status-chip status-chip-live">${esc(item.product_kind || t('earn.contract', 'contract'))}</span>
    </div>
    <div class="signal-metrics mt-3">
      ${metric(t('deposit.amount', 'Amount'), `$${money(item.amount || 0)}`)}
      ${metric(t('earn.expected', 'Expected'), `$${money(item.expected_return || 0)}`)}
      ${metric(t('earn.paid', 'Paid'), `$${money(item.paid_total || 0)}`)}
      ${metric(t('earn.roi', 'ROI'), `${Number(item.cycle_roi_percent || 0)}%`)}
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
        <span class="badge-green">${t('bot.avalon_ai', 'Avalon AI')}</span>
        <h2 class="text-lg font-bold mt-1">${esc(sig.bot_name || sig.bot_name_en || `Avalon ${sig.symbol || sig.market_symbol || 'AI'} Bot`)}</h2>
        <p class="text-xs text-muted">${esc(sig.bot_brief || sig.note || t('bot.admin_managed_operation', 'AI bot operation managed from admin.'))}</p>
      </div>
      <div class="signal-metrics">
        ${metric(t('trade.entry', 'Entry'), priceValue(sig.entry ?? sig.entry_price))}
        ${metric('SL', priceValue(sig.sl ?? sig.stop_loss))}
        ${metric('TP', priceValue(sig.tp1 ?? sig.take_profit_1))}
        ${metric(t('bot.share', 'Share'), `${Number(sig.copy_profit_share_pct || 0)}%`)}
      </div>
      <label class="block">
        <span class="text-xs text-muted">${t('bot.copy_amount_usdt', 'Copy amount (USDT)')}</span>
        <input class="input mt-1" name="amount" type="number" min="${minAmount}" step="0.01" value="${minAmount}" required />
      </label>
      <p class="dialog-note">${t('bot.copy_dialog_note', 'This uses your Real wallet and may reserve funds until the copy is closed or expires.')}</p>
      <p class="dialog-error hidden" id="copy-error"></p>
      <button class="btn-primary w-full" type="submit">${t('bot.confirm_copy', 'Confirm Copy')}</button>
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
        err.textContent = ex?.message || t('bot.copy_failed', 'Copy failed');
        err.classList.remove('hidden');
      }
    }
  });
}

async function cancelCopySubscription(id, container) {
  if (!id) return;
  const ok = window.confirm(t('bot.cancel_confirm', 'Cancel this Avalon copy and close its open trades at the current market price?'));
  if (!ok) return;
  try {
    await postApi('/trading_bot/cancel.php', { subscription_id: Number(id) }, { timeout: 15000 });
    await loadInvest(container);
  } catch (ex) {
    showDialog(`<div class="text-center space-y-3">
      <h2 class="text-lg font-bold">${t('bot.cancel_failed', 'Cancel failed')}</h2>
      <p class="text-sm text-muted">${esc(ex?.message || t('bot.cancel_failed_copy', 'Could not cancel this copy right now.'))}</p>
      <button class="btn-primary btn-sm" type="button" data-dialog-close>${t('common.close', 'Close')}</button>
    </div>`);
  }
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
        <span class="badge-accent">${t('earn.contract', 'Contract')}</span>
        <h2 class="text-lg font-bold mt-1">${esc(contract.name || contract.name_en || t('earn.contract', 'Contract'))}</h2>
        <p class="text-xs text-muted">${esc(contract.desc || contract.details || t('earn.contract_subscription_copy', 'Level-gated contract subscription.'))}</p>
      </div>
      <div class="signal-metrics">
        ${metric(t('earn.roi', 'ROI'), `${Number(contract.roi_percent || 0)}%`)}
        ${metric(t('earn.term', 'Term'), Number(contract.is_perpetual || 0) ? t('earn.perpetual', 'Perpetual') : `${Number(contract.term_days || 0)}${t('common.days_short', 'd')}`)}
        ${metric(t('earn.minimum', 'Minimum'), `$${money(minAmount)}`)}
        ${metric(t('earn.schedule', 'Schedule'), contract.payout_schedule || t('earn.end', 'end'))}
      </div>
      <label class="block">
        <span class="text-xs text-muted">${t('deposit.amount', 'Amount')} (USDT)</span>
        <input class="input mt-1" name="amount" type="number" min="${minAmount}" step="0.01" value="${minAmount}" required />
      </label>
      <p class="dialog-note">${t('earn.contract_dialog_note', 'Funds are debited through the ledger and the contract is managed internally.')}</p>
      <p class="dialog-error hidden" id="contract-error"></p>
      <button class="btn-primary w-full" type="submit">${t('earn.subscribe', 'Subscribe')}</button>
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
        err.textContent = ex?.message || t('earn.subscription_failed', 'Subscription failed');
        err.classList.remove('hidden');
      }
    }
  });
}

function earnGate() {
  const mode = get('mode');
  if (mode !== 'real') {
    return {
      title: t('funding.real_required', 'Real account required'),
      body: t('earn.real_required_copy', 'Avalon copies and contracts are visible in Demo, but activation requires an approved Real account.'),
      action: t('earn.switch_real', 'Switch to Real'),
      attr: 'data-switch-real',
    };
  }
  if (!kycApproved()) {
    return {
      title: t('earn.kyc_required', 'KYC approval required'),
      body: t('earn.kyc_required_copy', 'Submit and approve KYC before copying signals or subscribing to contracts.'),
      action: t('earn.open_kyc', 'Open KYC'),
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
  wrap.querySelector('[data-dialog-close]')?.addEventListener('click', closeDialog);
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

function levelPill(label, value, sub, isCurrent = false) {
  return `<div class="level-pill ${isCurrent ? 'is-current' : ''}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub || '')}</small></div>`;
}

function emptyState(text) {
  return `<div class="empty-state">${esc(text)}</div>`;
}


function normalizeDirection(direction) {
  const value = String(direction || 'BUY').toUpperCase();
  return ['BUY', 'SELL', 'NEUTRAL'].includes(value) ? value : 'BUY';
}

function directionChip(direction) {
  const value = normalizeDirection(direction);
  return `<span class="bot-direction-chip is-${value.toLowerCase()}">${esc(directionLabel(value))}</span>`;
}

function directionLabel(direction) {
  const value = normalizeDirection(direction);
  if (value === 'SELL') return t('trade.sell', 'SELL');
  if (value === 'NEUTRAL') return t('bot.neutral', 'NEUTRAL');
  return t('trade.buy', 'BUY');
}

function copyIsActive(item) {
  const status = String(item?.status_group || item?.status || '').toLowerCase();
  return ['active', 'armed', 'copied', 'open', 'running', 'pending'].some(x => status.includes(x));
}

function copyPositionRow(pos) {
  const side = normalizeDirection(pos.side || 'BUY');
  const pnl = Number(pos.pnl || pos.pnl_usd || pos.unrealized_pnl || 0);
  return `<div class="copy-position-row">
    <span>${esc(pos.symbol || '--')}</span>
    ${directionChip(side)}
    <b class="${pnl >= 0 ? 'text-buy' : 'text-sell'}">${money(pnl)}</b>
  </div>`;
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
