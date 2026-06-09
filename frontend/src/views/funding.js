// Funding View - unified Deposit / Withdraw / History workspace
import { get, set } from '../state/store.js';
import { money, esc, escAttr } from '../utils/format.js';
import { navigate } from '../router.js';
import { api, formApi, postApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';

const fundingCache = globalThis.__MEX_FUNDING_CACHE__ || (globalThis.__MEX_FUNDING_CACHE__ = new Map());
const CACHE_TTL = 45_000;

const TABS = [
  { key: 'deposit', label: 'Deposit', icon: icons.deposit },
  { key: 'withdraw', label: 'Withdraw', icon: icons.withdraw },
  { key: 'history', label: 'History', icon: icons.wallet },
];

export function render(params = {}) {
  const activeTab = resolveTab(params);
  const wallet = get('wallet') || {};
  const kyc = get('kyc') || {};
  const level = get('level') || {};
  const mode = get('mode') === 'real' ? 'real' : 'demo';
  const activeBalance = mode === 'real' ? (wallet.real || {}) : (wallet.demo || {});
  const currentLevel = level.current || {};

  return `
    <div class="funds-workspace animate-fade-in" data-active-funding-tab="${escAttr(activeTab)}">
      <section class="funds-hero-pro">
        <div>
          <span class="badge-accent">Assets desk</span>
          <h1>Funds</h1>
          <p>Deposit, withdraw and audit wallet movements from one fast workspace powered by admin payment categories.</p>
        </div>
        <div class="funds-balance-pro">
          <span>${mode === 'real' ? 'Available balance' : 'Demo balance'}</span>
          <strong>${money(activeBalance.available || activeBalance.balance || 0)}</strong>
          <small>${esc(activeBalance.currency || (mode === 'real' ? 'USDT' : 'USDT_DEMO'))}</small>
        </div>
      </section>

      <section class="funds-tabs-pro" role="tablist" aria-label="Funding workspace tabs">
        ${TABS.map(tab => `
          <button type="button" class="${tab.key === activeTab ? 'active' : ''}" data-funding-tab="${tab.key}" role="tab" aria-selected="${tab.key === activeTab ? 'true' : 'false'}">
            <span>${tab.icon || ''}</span>${esc(tab.label)}
          </button>
        `).join('')}
      </section>

      ${mode !== 'real' && activeTab !== 'history' ? `<section class="funding-mode-warning">
        <span class="gate-icon">${icons.lock}</span>
        <div>
          <strong>Real account required</strong>
          <small>Methods are visible for preview. Switch to Real before submitting a live funding request.</small>
        </div>
        <button type="button" class="btn-primary btn-sm" data-switch-real>Switch to Real</button>
      </section>` : ''}

      ${activeTab === 'history' ? renderHistoryWorkspace() : renderFundingWorkspace(activeTab)}
    </div>`;
}

export function mount(container, params = {}) {
  const activeTab = resolveTab(params);

  container.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-funding-tab]');
    if (tab) {
      e.preventDefault();
      navigate('wallet', { action: tab.dataset.fundingTab || 'deposit' });
      return;
    }

    const category = e.target.closest('[data-funding-category]');
    if (category) {
      container.__fundingCategory = category.dataset.fundingCategory || '';
      container.__fundingSelectedMethodId = '';
      renderCategoryTabs(container);
      renderMethodCards(container);
      updateSelectedMethod(container);
      return;
    }

    const method = e.target.closest('[data-method]');
    if (method) {
      container.__fundingSelectedMethodId = method.dataset.method || '';
      updateSelectedMethod(container);
      return;
    }

    const filter = e.target.closest('[data-history-filter]');
    if (filter) {
      container.__fundingHistoryFilter = filter.dataset.historyFilter || 'all';
      renderCombinedHistory(container);
      return;
    }

    const copy = e.target.closest('[data-copy-address]');
    if (copy) {
      copyAddress(copy);
      return;
    }

    if (e.target.closest('[data-switch-real]')) {
      localStorage.setItem('vp_mode', 'real');
      set('mode', 'real');
      location.reload();
    }
  });

  container.addEventListener('input', (e) => {
    if (e.target.matches('input[name="amount"], [data-withdraw-field]')) updateSelectedMethod(container);
  });

  container.addEventListener('change', (e) => {
    const proof = e.target.closest('input[name="proof"]');
    if (!proof) return;
    const badge = container.querySelector('#proof-file-name');
    const file = proof.files?.[0];
    if (badge) badge.textContent = file ? `${file.name} - ${formatFileSize(file.size || 0)}` : 'Image or PDF up to 8MB';
  });

  container.querySelectorAll('[data-quick-amount]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = container.querySelector('input[name="amount"]');
      if (input) input.value = btn.dataset.quickAmount || '';
      updateSelectedMethod(container);
    });
  });

  if (activeTab === 'history') {
    loadCombinedHistory(container);
    return;
  }

  loadMethods(container, activeTab);
  loadRecentHistory(container, activeTab);
  container.querySelector('#funding-form')?.addEventListener('submit', (e) => handleSubmit(e, container, activeTab));
}

export function cleanup() {
  document.querySelectorAll('.funds-workspace').forEach((container) => clearCountdown(container));
}

function renderFundingWorkspace(kind) {
  const isDeposit = kind === 'deposit';
  return `
    <section class="funding-flow-shell">
      <div class="funding-flow-main card ${isDeposit ? 'deposit-console-card' : ''}">
        <div class="panel-headline funding-panel-title">
          <span class="${isDeposit ? 'badge-green' : 'badge-accent'}">${isDeposit ? 'Deposit ticket' : 'Withdrawal ticket'}</span>
          <h2>${isDeposit ? 'Create deposit transfer' : 'Create withdrawal request'}</h2>
        </div>

        <form id="funding-form" data-kind="${kind}" class="funding-form-pro" novalidate>
          <div class="funding-step-block">
            <span class="field-label">1. Select section</span>
            <div class="funding-category-rail" id="funding-categories">
              ${Array.from({ length: 3 }).map(() => '<div class="skeleton h-16 rounded-lg"></div>').join('')}
            </div>
          </div>

          <div class="funding-step-block">
            <span class="field-label">2. Select method</span>
            <div id="method-cards" class="method-grid method-grid-rail">
              ${Array.from({ length: 4 }).map(() => '<div class="skeleton h-20 rounded-lg"></div>').join('')}
            </div>
          </div>

          ${isDeposit ? `<div id="deposit-transfer-panel" class="deposit-transfer-panel is-muted">
            ${emptyTransferPanel('Transfer details will appear here', 'Choose a method to unlock account details, QR code, wallet address and bank fields.')}
          </div>` : `<div id="withdraw-fields-panel" class="withdraw-fields-panel"></div>`}

          <div class="deposit-ticket-grid">
            <label class="block">
              <span class="field-label">${isDeposit ? '3. Amount' : 'Amount'}</span>
              <input type="number" name="amount" class="input mt-1" value="${isDeposit ? '' : '50'}" min="1" step="any" placeholder="${isDeposit ? 'Enter exact amount after copying the transfer details' : '50'}" required>
            </label>
            <label class="block">
              <span class="field-label">Currency</span>
              <input type="text" name="currency" class="input mt-1" value="USDT" readonly>
            </label>
          </div>

          ${isDeposit ? `<div class="quick-amount-rail" aria-label="Quick amount">
            ${[100, 250, 500, 1000, 2500].map(v => `<button type="button" class="quick-amount-chip" data-quick-amount="${v}">${money(v, 0)}</button>`).join('')}
          </div>
          <div id="deposit-proof-slot" class="deposit-proof-slot"></div>` : ''}

          <label class="block deposit-note-field">
            <span class="field-label">${isDeposit ? 'Reference / notes' : 'Additional notes'}</span>
            <textarea name="notes" class="input mt-1" rows="2" placeholder="${isDeposit ? 'Sender name, transaction hash, or bank reference...' : 'Optional note for the operations desk...'}"></textarea>
          </label>

          <div class="funding-submit-zone">
            <button type="submit" class="${isDeposit ? 'btn-primary' : 'btn-sell'} w-full py-3" id="funding-submit">
              ${isDeposit ? 'Confirm transfer' : 'Submit withdrawal request'}
            </button>
            <p class="text-xs text-center funding-form-status" id="form-status"></p>
          </div>
        </form>
      </div>

      <aside class="funding-side-stack">
        <section class="card funding-sidebar-card funding-guide-card">
          <div class="panel-headline">
            <span class="badge-green">${isDeposit ? 'Secure checklist' : 'Payout checklist'}</span>
            <h2>${isDeposit ? 'Before you confirm' : 'Before you request'}</h2>
          </div>
          <div class="funding-checklist">
            ${checkItem('Use the selected category and method only', true)}
            ${checkItem(isDeposit ? 'Send the exact amount shown' : 'Balance must cover payout amount', true)}
            ${checkItem(isDeposit ? 'Upload a clear receipt when required' : 'Provide payout destination', true)}
            ${checkItem('Real mode required', get('mode') === 'real')}
          </div>
        </section>

        <section class="card funding-history-panel">
          <div class="panel-headline-row">
            <div>
              <span class="badge-accent">Activity</span>
              <h2>Recent ${isDeposit ? 'deposits' : 'withdrawals'}</h2>
            </div>
            <button type="button" class="btn-ghost btn-sm" data-funding-tab="history">All history</button>
          </div>
          <div id="funding-history" class="funding-history-list">
            <p class="text-muted text-sm text-center py-8">Loading...</p>
          </div>
        </section>
      </aside>
    </section>`;
}

function renderHistoryWorkspace() {
  return `
    <section class="card funding-history-workspace">
      <div class="panel-headline-row">
        <div>
          <span class="badge-accent">Ledger</span>
          <h2>Funding history</h2>
        </div>
        <div class="history-filter-rail">
          ${['all', 'deposit', 'withdraw', 'ledger', 'pending', 'completed', 'failed'].map((key, index) => `
            <button type="button" class="${index === 0 ? 'active' : ''}" data-history-filter="${key}">${titleCase(key)}</button>
          `).join('')}
        </div>
      </div>
      <div id="funding-history-all" class="funding-history-stack">
        <p class="text-muted text-sm text-center py-10">Loading funding history...</p>
      </div>
    </section>`;
}

async function cachedApi(path, options = {}, ttl = CACHE_TTL) {
  const key = path;
  const now = Date.now();
  const cached = fundingCache.get(key);
  if (cached && now - cached.time < ttl) return cached.data;
  const data = await api(path, options);
  fundingCache.set(key, { time: now, data });
  return data;
}

async function loadMethods(container, kind) {
  try {
    const scope = get('mode') === 'real' ? 'real' : 'both';
    const data = await cachedApi(`/payment_methods/list.php?kind=${encodeURIComponent(kind)}&scope=${scope}&currency=*`, { timeout: 9000, retry: 1 }, 90_000);
    const items = data?.items || [];
    const categories = buildCategories(data?.categories || [], items);
    container.__fundingKind = kind;
    container.__fundingMethods = items;
    container.__fundingCategories = categories;
    container.__fundingCategory = categories[0]?.key || '';
    container.__fundingSelectedMethodId = '';
    renderCategoryTabs(container);
    renderMethodCards(container);
    updateSelectedMethod(container);
  } catch (_e) {
    const cats = container.querySelector('#funding-categories');
    const cards = container.querySelector('#method-cards');
    if (cats) cats.innerHTML = '<div class="empty-state empty-state--compact">Payment sections are temporarily unavailable.</div>';
    if (cards) cards.innerHTML = '';
  }
}

function buildCategories(adminCategories, methods) {
  const methodKeys = new Set(methods.map(methodCategory).filter(Boolean));
  const categories = [];
  adminCategories.forEach((cat) => {
    const key = normalizeKey(cat.key || cat.key_slug || cat.label);
    if (!key || !methodKeys.has(key)) return;
    categories.push({
      key,
      label: cat.label || fallbackCategoryLabel(key),
      hint: cat.hint || fallbackCategoryHint(key),
      icon: cat.image_url ? `<img src="${escAttr(cat.image_url)}" alt="">` : categoryIcon(key, cat.icon),
    });
  });
  methodKeys.forEach((key) => {
    if (categories.some(cat => cat.key === key)) return;
    categories.push({ key, label: fallbackCategoryLabel(key), hint: fallbackCategoryHint(key), icon: categoryIcon(key) });
  });
  return categories;
}

function renderCategoryTabs(container) {
  const el = container.querySelector('#funding-categories');
  const categories = container.__fundingCategories || [];
  const selected = container.__fundingCategory || categories[0]?.key || '';
  if (!el) return;
  if (!categories.length) {
    el.innerHTML = '<div class="empty-state empty-state--compact">No active funding sections are configured by admin.</div>';
    return;
  }
  el.innerHTML = categories.map(cat => `
    <button type="button" class="${cat.key === selected ? 'active' : ''}" data-funding-category="${escAttr(cat.key)}">
      <i>${cat.icon || icons.wallet}</i>
      <strong>${esc(cat.label)}</strong>
      <small>${esc(cat.hint || '')}</small>
    </button>
  `).join('');
}

function renderMethodCards(container) {
  const el = container.querySelector('#method-cards');
  const methods = filteredMethods(container);
  if (!el) return;
  clearCountdown(container);
  if (!methods.length) {
    el.innerHTML = '<div class="empty-state empty-state--compact">No active methods under this section.</div>';
    container.__fundingSelectedMethodId = '';
    updateSelectedMethod(container);
    return;
  }
  if (!methods.some(method => methodId(method) === container.__fundingSelectedMethodId)) {
    container.__fundingSelectedMethodId = methodId(methods[0]);
  }
  el.innerHTML = methods.map((m) => {
    const id = methodId(m);
    return `<button type="button" class="method-card ${id === container.__fundingSelectedMethodId ? 'active' : ''}" data-method="${escAttr(id)}">
      <span class="method-icon">${methodIcon(m)}</span>
      <strong>${esc(m.title || m.name || m.code || 'Method')}</strong>
      <small>${esc([fallbackCategoryLabel(methodCategory(m)), m.currency].filter(Boolean).join(' - '))}</small>
      <span class="method-card-badges">${methodBadges(m)}</span>
      <em>${money(m.min_amount || 0)}${m.max_amount ? ` - ${money(m.max_amount)}` : '+'}</em>
    </button>`;
  }).join('');
}

function updateSelectedMethod(container) {
  const kind = container.__fundingKind || container.querySelector('#funding-form')?.dataset.kind || 'deposit';
  const isDeposit = kind === 'deposit';
  const selected = getSelectedMethod(container);
  const amount = Number(container.querySelector('input[name="amount"]')?.value || 0);
  const submit = container.querySelector('#funding-submit');
  const isStripe = selected ? isStripeMethod(selected) : false;
  const currencyInput = container.querySelector('input[name="currency"]');
  if (currencyInput) currencyInput.value = selected?.currency || 'USDT';

  container.querySelectorAll('.method-card').forEach(card => card.classList.toggle('active', card.dataset.method === methodId(selected || {})));
  if (submit && selected) {
    submit.disabled = false;
    submit.textContent = isStripe ? (selected.checkout_label || 'Continue to secure card checkout') : (isDeposit ? 'Confirm transfer' : 'Submit withdrawal request');
  }
  if (!selected) {
    renderDepositTransferPanel(container, null, amount, false, 'Choose an active method first.');
    renderDepositProofSlot(container, null, false);
    renderWithdrawFields(container, null);
    return;
  }

  if (isDeposit) {
    renderDepositTransferPanel(container, selected, amount, isStripe, validateAmount(selected, amount));
    renderDepositProofSlot(container, selected, isStripe);
  } else {
    renderWithdrawFields(container, selected);
  }
}

function renderMethodDetails(selected, isStripe, isDeposit) {
  return `
    <div class="method-details-head">
      <span>${methodIcon(selected)}</span>
      <div>
        <strong>${esc(selected.title || selected.name || selected.code || 'Payment method')}</strong>
        <small>${esc(selected.description || 'Configured funding route')}</small>
      </div>
    </div>
    <div class="method-detail-grid">
      ${detailPill('Section', fallbackCategoryLabel(methodCategory(selected)))}
      ${detailPill('Currency', selected.currency || 'USDT')}
      ${detailPill('Minimum', money(selected.min_amount || 0))}
      ${detailPill('Maximum', selected.max_amount ? money(selected.max_amount) : 'Flexible')}
      ${detailPill('Proof', isStripe ? 'Not needed' : (selected.proof_required || isDeposit ? 'Receipt' : 'Optional'))}
      ${detailPill('Window', isStripe ? 'Checkout' : `${Math.max(1, Number(selected.expires_hours || 24))}h`)}
    </div>
    ${isStripe ? `<div class="secure-checkout-strip">
      <i>${icons.wallet}</i>
      <div>
        <strong>Secure Stripe Checkout</strong>
        <small>Card details are collected by Stripe. You return to MEX after payment confirmation.</small>
      </div>
    </div>` : ''}
    ${selected.instructions ? `<p class="method-instructions">${esc(selected.instructions)}</p>` : ''}
  `;
}

function renderDepositTransferPanel(container, selected, amount, isStripe, validation) {
  const panel = container.querySelector('#deposit-transfer-panel');
  if (!panel) return;
  clearCountdown(container);

  if (!selected) {
    panel.className = 'deposit-transfer-panel is-muted';
    panel.innerHTML = emptyTransferPanel('Choose a method', 'Select a funding method to display transfer instructions, QR code and destination details.');
    return;
  }
  if (isStripe) {
    panel.className = 'deposit-transfer-panel is-ready';
    panel.innerHTML = `
      <div class="deposit-transfer-ready">
        <div class="deposit-transfer-title">
          <span>${icons.wallet}</span>
          <div><strong>Ready for card checkout</strong><small>Enter the amount and continue to Stripe Checkout. No receipt upload is required.</small></div>
        </div>
        ${renderFundingRouteSummary(selected, true)}
        <div class="secure-checkout-strip">
          <i>${icons.wallet}</i>
          <div>
            <strong>Secure Stripe Checkout</strong>
            <small>Card details are collected by Stripe. You return to MEX after payment confirmation.</small>
          </div>
        </div>
      </div>`;
    return;
  }
  const hasValidAmount = !validation && amount > 0;
  const expiresHours = Math.max(1, Number(selected.expires_hours || 24));
  const deadline = hasValidAmount ? getDepositDeadline(selected, amount, expiresHours) : 0;
  panel.className = `deposit-transfer-panel is-ready${hasValidAmount ? '' : ' is-preview'}`;
  panel.innerHTML = `
    <div class="deposit-transfer-ready">
      <div class="deposit-transfer-title">
        <span>${icons.deposit}</span>
        <div>
          <strong>${hasValidAmount ? `Transfer ${money(amount)} ${esc(selected.currency || 'USDT')}` : esc(selected.title || selected.name || selected.code || 'Payment method')}</strong>
          <small>${hasValidAmount ? 'Use only the details shown here before the timer ends.' : 'Scan the QR or copy the destination first, then enter the exact amount below.'}</small>
        </div>
      </div>
      ${renderFundingRouteSummary(selected, false)}
      ${hasValidAmount ? `<div class="deposit-timer" data-deposit-deadline="${deadline}">
        <div><span>Payment window</span><strong id="deposit-countdown">--:--:--</strong></div>
        <small>Expires ${formatDeadline(deadline)}</small>
      </div>` : ''}
      ${renderQrBlock(selected)}
      ${selected.instructions ? `<div class="transfer-instruction-card">
        <strong>Transfer instructions</strong>
        <p>${esc(selected.instructions)}</p>
      </div>` : ''}
      <div class="transfer-target-grid">
        ${renderTransferTargetGrid(selected)}
      </div>
      ${renderMissingFundingDetails(selected)}
    </div>`;
  if (hasValidAmount) startCountdown(container, deadline);
}

function renderFundingRouteSummary(method, isStripe = false) {
  const max = method.max_amount ? money(method.max_amount) : 'Flexible';
  const proof = isStripe ? 'Not needed' : (method.proof_required ? 'Receipt required' : 'Optional');
  const windowLabel = isStripe ? 'Checkout' : `${Math.max(1, Number(method.expires_hours || 24))}h`;
  return `<div class="funding-route-summary" aria-label="Selected funding route summary">
    ${routeSummaryPill('Section', fallbackCategoryLabel(methodCategory(method)))}
    ${routeSummaryPill('Currency', method.currency || 'USDT')}
    ${routeSummaryPill('Limits', `${money(method.min_amount || 0)} - ${max}`)}
    ${routeSummaryPill('Proof', proof)}
    ${routeSummaryPill('Window', windowLabel)}
  </div>`;
}

function routeSummaryPill(label, value) {
  return `<span class="funding-route-pill"><small>${esc(label)}</small><b>${esc(value)}</b></span>`;
}

function renderDepositProofSlot(container, selected, isStripe) {
  const slot = container.querySelector('#deposit-proof-slot');
  if (!slot) return;
  if (!selected) {
    slot.dataset.methodId = '';
    slot.dataset.isStripe = '';
    slot.innerHTML = '';
    return;
  }
  const selectedId = methodId(selected);
  const stripeFlag = isStripe ? '1' : '0';
  if (slot.dataset.methodId === selectedId && slot.dataset.isStripe === stripeFlag && slot.innerHTML.trim() !== '') return;
  slot.dataset.methodId = selectedId;
  slot.dataset.isStripe = stripeFlag;
  if (isStripe) {
    slot.innerHTML = `<div class="deposit-proof-note">
      <span>${icons.wallet}</span>
      <div><strong>No receipt upload needed</strong><small>Card payments continue through Stripe Checkout.</small></div>
    </div>`;
    return;
  }
  slot.innerHTML = `<label class="deposit-file-drop">
    <input type="file" name="proof" accept="image/*,.pdf">
    <span>${icons.deposit}</span>
    <div><strong>${selected.proof_required ? 'Upload transfer proof' : 'Upload receipt if available'}</strong><small id="proof-file-name">Image or PDF up to 8MB</small></div>
  </label>`;
}

function renderWithdrawFields(container, selected) {
  const panel = container.querySelector('#withdraw-fields-panel');
  if (!panel) return;
  if (!selected) {
    panel.innerHTML = '<p class="text-muted text-sm">Select a withdrawal method first.</p>';
    return;
  }
  const fields = normalizeInputFields(selected.fields || []);
  if (!fields.length) {
    panel.innerHTML = `<label class="block">
      <span class="field-label">Payout destination</span>
      <textarea name="destination" data-withdraw-field class="input mt-1" rows="3" placeholder="Wallet address, bank reference, IBAN, or payout details..." required></textarea>
    </label>`;
    return;
  }
  panel.innerHTML = `<div class="withdraw-fields-grid">${fields.map(renderWithdrawField).join('')}</div>`;
}

function renderWithdrawField(field) {
  const name = normalizeFieldName(field.name || field.key || field.id || field.label || 'destination');
  const label = field.label || field.title || titleCase(name);
  const placeholder = field.placeholder || field.hint || '';
  const required = field.required || field.is_required ? 'required' : '';
  const type = String(field.type || 'text').toLowerCase();
  const options = normalizeOptions(field.options || field.values || []);
  if (type === 'textarea') {
    return `<label class="block sm:col-span-2"><span class="field-label">${esc(label)}</span><textarea name="${escAttr(name)}" data-withdraw-field class="input mt-1" rows="3" placeholder="${escAttr(placeholder)}" ${required}></textarea></label>`;
  }
  if (type === 'select' && options.length) {
    return `<label class="block"><span class="field-label">${esc(label)}</span><select name="${escAttr(name)}" data-withdraw-field class="input mt-1" ${required}>${options.map(opt => `<option value="${escAttr(opt.value)}">${esc(opt.label)}</option>`).join('')}</select></label>`;
  }
  const inputType = ['email', 'number', 'tel', 'url'].includes(type) ? type : 'text';
  return `<label class="block"><span class="field-label">${esc(label)}</span><input type="${inputType}" name="${escAttr(name)}" data-withdraw-field class="input mt-1" placeholder="${escAttr(placeholder)}" ${required}></label>`;
}

function emptyTransferPanel(title, text) {
  return `<div class="deposit-transfer-empty"><span>${icons.deposit}</span><strong>${esc(title)}</strong><small>${esc(text)}</small></div>`;
}

function methodBadges(method) {
  const badges = [];
  if (String(method?.image_url || '').trim()) badges.push('Logo');
  if (methodQrUrl(method)) badges.push('QR');
  if (String(method?.payment_address || '').trim() || displayFields(method?.fields || {}).length) badges.push('Details');
  if (method?.proof_required) badges.push('Receipt');
  if (!badges.length) badges.push('Needs setup');
  return badges.slice(0, 4).map(label => `<b>${esc(label)}</b>`).join('');
}

function renderMethodPaymentPreview(method, isDeposit) {
  const address = String(method?.payment_address || '').trim();
  const qr = methodQrUrl(method);
  const fields = displayFields(method?.fields || {}).filter(row => String(row.value || '').trim() !== address);
  const needsSetup = isDeposit && !address && !fields.length;
  return `<div class="method-payment-preview ${needsSetup ? 'needs-setup' : ''}">
    <div class="method-payment-preview-main">
      ${qr ? `<img src="${escAttr(qr)}" alt="Payment QR">` : `<span>${icons.deposit}</span>`}
      <div>
        <strong>${needsSetup ? 'Funding details unavailable' : (isDeposit ? 'Transfer details configured' : 'Payout fields configured')}</strong>
        <small>${needsSetup ? 'Choose another method or try again shortly.' : 'These details are provided by the selected funding route.'}</small>
      </div>
    </div>
    ${address ? `<div class="method-payment-address"><span>Address / destination</span><code>${esc(address)}</code><button type="button" data-copy-address="${escAttr(address)}">Copy</button></div>` : ''}
    ${fields.length ? `<div class="method-payment-fields">${fields.slice(0, 4).map(row => `<span><small>${esc(row.label)}</small><b>${esc(String(row.value))}</b></span>`).join('')}</div>` : ''}
  </div>`;
}

function renderTransferTargetGrid(method) {
  const address = String(method?.payment_address || '').trim();
  return `
    <div class="transfer-target-card"><span>Method</span><strong>${esc(method?.title || method?.name || method?.code || 'Payment method')}</strong></div>
    ${renderTransferFields(method, address ? [address] : [])}
  `;
}

function renderQrBlock(method) {
  const qr = methodQrUrl(method);
  const address = String(method?.payment_address || '').trim();
  if (!qr && !address) return '';
  return `<div class="transfer-qr-card transfer-qr-card--centered">
    <strong>Scan QR code</strong>
    <small>Scan with your wallet or banking app, then use the wallet address below if you prefer to copy it manually.</small>
    ${qr ? `<img src="${escAttr(qr)}" alt="Payment QR">` : ''}
    ${address ? `<div class="transfer-qr-address">
      <span>Wallet address</span>
      <code>${esc(address)}</code>
      <button type="button" data-copy-address="${escAttr(address)}">Copy address</button>
    </div>` : ''}
  </div>`;
}

function methodQrUrl(method) {
  const uploaded = String(method?.payment_qr_url || '').trim();
  if (uploaded) return uploaded;
  const address = String(method?.payment_address || '').trim();
  if (!address) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(address)}`;
}

function renderMissingFundingDetails(method) {
  if (isStripeMethod(method)) return '';
  const address = String(method?.payment_address || '').trim();
  const fields = displayFields(method?.fields || {});
  if (address || fields.length) return '';
  return `<div class="funding-method-warning">${icons.lock}<div><strong>Funding route unavailable</strong><small>Choose another method or try again shortly.</small></div></div>`;
}

function renderTransferFields(method, excludeValues = []) {
  const rows = displayFields(method?.fields || {});
  const exclude = new Set(excludeValues.map(v => String(v || '').trim()).filter(Boolean));
  return rows.filter(r => !exclude.has(String(r.value || '').trim())).slice(0, 8).map((r) => {
    const value = String(r.value);
    return `<div class="transfer-target-card ${value.length > 26 ? 'transfer-target-wide' : ''}"><span>${esc(r.label)}</span><strong>${esc(value)}</strong><button type="button" data-copy-address="${escAttr(value)}">Copy</button></div>`;
  }).join('');
}

function displayFields(fields) {
  const rows = [];
  if (Array.isArray(fields)) {
    fields.forEach((field) => {
      if (!field) return;
      const label = field.label || field.name || field.key || '';
      const value = field.value || field.default || field.text || '';
      if (label && value) rows.push({ label, value });
    });
  } else if (fields && typeof fields === 'object') {
    Object.entries(fields).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      if (typeof value === 'object') {
        const label = value.label || value.name || key;
        const val = value.value || value.text || value.default || '';
        if (val) rows.push({ label, value: val });
      } else {
        rows.push({ label: prettifyKey(key), value });
      }
    });
  }
  return rows;
}

function normalizeInputFields(fields) {
  if (Array.isArray(fields)) {
    return fields.filter(Boolean).map((field) => {
      const hasDisplayValue = field.value || field.default || field.text;
      return hasDisplayValue && !field.collect ? null : field;
    }).filter(Boolean);
  }
  if (!fields || typeof fields !== 'object') return [];
  return Object.entries(fields).map(([key, value]) => {
    if (value && typeof value === 'object') {
      const hasDisplayValue = value.value || value.default || value.text;
      return hasDisplayValue && !value.collect ? null : { name: key, ...value };
    }
    return null;
  }).filter(Boolean);
}

async function handleSubmit(e, container, kind) {
  e.preventDefault();
  if (container.__fundingSubmitting) return;
  const form = e.target;
  const status = container.querySelector('#form-status');
  const submit = container.querySelector('#funding-submit');
  const fd = new FormData(form);
  const selected = getSelectedMethod(container);
  const isDeposit = kind === 'deposit';
  const amount = Number(fd.get('amount') || 0);
  const notes = String(fd.get('notes') || '').trim();
  const isStripe = selected ? isStripeMethod(selected) : false;

  try {
    if (get('mode') !== 'real') return setStatus(status, 'Switch to Real before submitting live funding requests.', 'error');
    if (!selected) return setStatus(status, 'Select an active payment method first.', 'error');
    const validation = validateAmount(selected, amount);
    if (validation) return setStatus(status, validation, 'error');

    const proof = form.querySelector('input[name="proof"]')?.files?.[0] || null;
    if (isDeposit && !isStripe && selected.proof_required && !proof) return setStatus(status, 'Upload transfer proof before confirming.', 'error');

    const withdrawFields = collectWithdrawFields(container);
    const destination = withdrawFields.destination || withdrawFields.wallet_address || withdrawFields.bank_account || withdrawFields.iban || withdrawFields.address || notes;
    if (!isDeposit && !String(destination || '').trim()) return setStatus(status, 'Enter payout destination details.', 'error');

    container.__fundingSubmitting = true;
    if (submit) {
      submit.disabled = true;
      submit.dataset.originalText = submit.dataset.originalText || submit.textContent || '';
      submit.textContent = isDeposit ? (isStripe ? 'Opening checkout...' : 'Confirming...') : 'Submitting...';
    }
    setStatus(status, isStripe ? 'Opening secure checkout...' : (isDeposit ? 'Sending transfer confirmation...' : 'Sending payout request...'), 'info');

    const method = selected.code || selected.method || selected.id || '';
    const currency = selected.currency || 'USDT';
    const category = container.__fundingCategory || methodCategory(selected);
    const deadline = container.querySelector('[data-deposit-deadline]')?.dataset.depositDeadline || '';
    const details = {
      notes,
      category,
      method_title: selected.title || selected.name || selected.code || '',
      client_deadline_at: deadline ? Math.floor(Number(deadline) / 1000) : null,
      proof_attached: !!proof,
      fields: withdrawFields,
    };
    const endpoint = isStripe ? '/deposits/stripe_checkout.php' : (isDeposit ? '/deposits/create.php' : '/withdrawals/create.php');
    const body = isDeposit
      ? { provider: selected.provider || '', method, currency, amount, details }
      : { method, currency, amount, destination, details: { ...details, destination } };
    const res = await postApi(endpoint, body, { timeout: isStripe ? 18000 : 14000, headers: { 'Idempotency-Key': idempotencyKey(isDeposit ? 'dep' : 'wd') } });

    if (!res || res.ok === false) return setStatus(status, res?.error || 'Request failed', 'error');
    if (isStripe && res.checkout_url) {
      setStatus(status, 'Redirecting to checkout...', 'success');
      window.location.assign(res.checkout_url);
      return;
    }

    if (isDeposit && proof) {
      const depositId = res.deposit?.id || res.id || res.deposit_id || null;
      if (depositId) {
        const proofFd = new FormData();
        proofFd.append('deposit_id', String(depositId));
        proofFd.append('proof', proof);
        await formApi('/deposits/upload_proof.php', proofFd, { timeout: 18000 });
      }
    }

    setStatus(status, isDeposit ? 'Transfer confirmation received. Your deposit is now being processed.' : 'Withdrawal request received. You can track it from history.', 'success');
    showSuccessPanel(container, isDeposit, amount, selected);
    fundingCache.delete(isDeposit ? '/deposits/list.php' : '/withdrawals/list.php');
    loadRecentHistory(container, kind);
  } catch (err) {
    setStatus(status, err.message || 'Request failed', 'error');
  } finally {
    container.__fundingSubmitting = false;
    if (submit) {
      submit.disabled = false;
      submit.textContent = submit.dataset.originalText || (isDeposit ? 'Confirm transfer' : 'Submit withdrawal request');
    }
  }
}

async function loadRecentHistory(container, kind) {
  const el = container.querySelector('#funding-history');
  if (!el) return;
  try {
    const endpoint = kind === 'deposit' ? '/deposits/list.php' : '/withdrawals/list.php';
    const data = await cachedApi(endpoint, { timeout: 8000, retry: 1 }, 25_000);
    const items = (data?.items || []).slice(0, 10).map(item => normalizeHistoryItem(item, kind));
    if (!items.length) {
      el.innerHTML = `<div class="empty-state !m-0">No ${kind} requests yet.</div>`;
      return;
    }
    el.innerHTML = items.map(historyCard).join('');
  } catch (_e) {
    el.innerHTML = '<p class="text-red text-sm text-center py-4">History unavailable.</p>';
  }
}

async function loadCombinedHistory(container) {
  const el = container.querySelector('#funding-history-all');
  if (!el) return;
  const results = await Promise.allSettled([
    cachedApi('/deposits/list.php', { timeout: 8000, retry: 1 }, 20_000),
    cachedApi('/withdrawals/list.php', { timeout: 8000, retry: 1 }, 20_000),
    cachedApi('/wallet/ledger.php?per=50', { timeout: 8000, retry: 1 }, 20_000),
  ]);
  container.__fundingHistoryItems = [
    ...(results[0].status === 'fulfilled' ? (results[0].value?.items || []).map(item => normalizeHistoryItem(item, 'deposit')) : []),
    ...(results[1].status === 'fulfilled' ? (results[1].value?.items || []).map(item => normalizeHistoryItem(item, 'withdraw')) : []),
    ...(results[2].status === 'fulfilled' ? (results[2].value?.items || []).map(item => normalizeHistoryItem(item, 'ledger')) : []),
  ].sort((a, b) => b.sortTime - a.sortTime).slice(0, 80);
  renderCombinedHistory(container);
}

function renderCombinedHistory(container) {
  const el = container.querySelector('#funding-history-all');
  if (!el) return;
  const filter = container.__fundingHistoryFilter || 'all';
  container.querySelectorAll('[data-history-filter]').forEach(btn => btn.classList.toggle('active', btn.dataset.historyFilter === filter));
  const items = (container.__fundingHistoryItems || []).filter(item => historyMatchesFilter(item, filter));
  if (!items.length) {
    el.innerHTML = '<div class="empty-state empty-state--compact">No matching funding history yet.</div>';
    return;
  }
  el.innerHTML = `
    <div class="ledger-mobile-list md:hidden">${items.map(historyCard).join('')}</div>
    <div class="hidden md:block overflow-x-auto">
      <table class="funding-history-table">
        <thead><tr><th>Type</th><th>Method</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${items.map(historyRow).join('')}</tbody>
      </table>
    </div>`;
}

function normalizeHistoryItem(item, kind) {
  const amount = Number(item.amount || 0);
  const created = item.created_at || item.updated_at || '';
  const status = kind === 'ledger' ? 'posted' : String(item.status || 'pending').toLowerCase();
  return {
    kind,
    amount,
    currency: item.currency || 'USDT',
    status,
    method: kind === 'ledger' ? (item.type || item.ref_type || 'ledger') : (item.method_label || item.provider || item.method_code || item.method || 'manual'),
    created,
    sortTime: timeValue(created),
  };
}

function historyCard(item) {
  const positive = item.kind === 'deposit' || (item.kind === 'ledger' && item.amount >= 0);
  return `<article class="funding-history-card funds-history-card ${positive ? 'is-positive' : 'is-negative'}">
    <div class="funding-history-main">
      <span class="history-kind ${positive ? 'is-deposit' : 'is-withdraw'}">${item.kind === 'withdraw' ? icons.withdraw : icons.deposit}</span>
      <div><strong>${historyTitle(item.kind)}</strong><small>${esc(item.method)} - ${esc(formatHistoryTime(item.created))}</small></div>
    </div>
    <div class="funds-history-amount"><strong>${positive ? '+' : ''}${money(item.amount)} ${esc(item.currency)}</strong><span class="${statusBadge(item.status)}">${esc(item.status)}</span></div>
  </article>`;
}

function historyRow(item) {
  const positive = item.kind === 'deposit' || (item.kind === 'ledger' && item.amount >= 0);
  return `<tr>
    <td>${esc(historyTitle(item.kind))}</td>
    <td>${esc(item.method)}</td>
    <td class="${positive ? 'text-buy' : 'text-sell'}">${positive ? '+' : ''}${money(item.amount)} ${esc(item.currency)}</td>
    <td><span class="${statusBadge(item.status)}">${esc(item.status)}</span></td>
    <td>${esc(formatHistoryTime(item.created))}</td>
  </tr>`;
}

function historyMatchesFilter(item, filter) {
  if (filter === 'all') return true;
  if (['deposit', 'withdraw', 'ledger'].includes(filter)) return item.kind === filter;
  if (filter === 'pending') return ['pending', 'requested', 'processing', 'review'].includes(item.status);
  if (filter === 'completed') return ['approved', 'confirmed', 'completed', 'paid', 'posted'].includes(item.status);
  if (filter === 'failed') return ['rejected', 'failed', 'cancelled', 'canceled'].includes(item.status);
  return true;
}

function filteredMethods(container) {
  const category = container.__fundingCategory || '';
  return (container.__fundingMethods || []).filter(method => methodCategory(method) === category);
}

function getSelectedMethod(container) {
  const methods = filteredMethods(container);
  const selectedId = container.__fundingSelectedMethodId || '';
  return methods.find(method => methodId(method) === selectedId) || methods[0] || null;
}

function methodId(m) {
  return String(m?.id ?? m?.code ?? '');
}

function methodCategory(method) {
  const direct = normalizeKey(method?.category_key || '');
  if (direct) return direct;
  const group = normalizeKey(method?.method_group || '');
  if (group) return group;
  const raw = [method?.provider, method?.code, method?.title, method?.name].filter(Boolean).join(' ').toLowerCase();
  if (/stripe|card|visa|master/.test(raw)) return 'card';
  if (/bank|wire|iban|swift|ach|fedwire/.test(raw)) return 'bank';
  if (/crypto|usdt|btc|eth|trc|erc|bep|wallet|blockchain/.test(raw)) return 'crypto';
  if (/bot|telegram/.test(raw)) return 'crypto_bot';
  return 'manual';
}

function methodIcon(m) {
  if (String(m?.image_url || '').trim()) return `<img src="${escAttr(m.image_url)}" alt="">`;
  return categoryIcon(methodCategory(m));
}

function categoryIcon(key, configured = '') {
  if (configured) return `<b>${esc(configured)}</b>`;
  if (key === 'card') return icons.wallet;
  if (key === 'bank') return icons.wallet;
  if (key === 'crypto' || key === 'crypto_bot') return icons.deposit;
  return icons.wallet;
}

function fallbackCategoryLabel(key) {
  const labels = { bank: 'Bank transfer', crypto: 'Crypto', card: 'Card / Visa', cash: 'Cash desk', crypto_bot: 'Crypto bot', manual: 'Manual' };
  return labels[key] || titleCase(key || 'Manual');
}

function fallbackCategoryHint(key) {
  const hints = { bank: 'Wire and bank details', crypto: 'Wallet networks and QR', card: 'Stripe hosted checkout', cash: 'Desk review', crypto_bot: 'Automated wallet route', manual: 'Configured instructions' };
  return hints[key] || 'Configured route';
}

function isStripeMethod(method) {
  const raw = [method?.provider, method?.method_group, method?.category_key, method?.code, method?.title].filter(Boolean).join(' ').toLowerCase();
  return /stripe|card|visa|master/.test(raw);
}

function validateAmount(method, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter the amount to continue.';
  const min = Number(method?.min_amount || 0);
  const max = Number(method?.max_amount || 0);
  if (min > 0 && amount < min) return `Minimum for this method is ${money(min)} ${method.currency || 'USDT'}.`;
  if (max > 0 && amount > max) return `Maximum for this method is ${money(max)} ${method.currency || 'USDT'}.`;
  return '';
}

function collectWithdrawFields(container) {
  const fields = {};
  container.querySelectorAll('[data-withdraw-field]').forEach(field => { fields[field.name] = field.value; });
  return fields;
}

function showSuccessPanel(container, isDeposit, amount, method) {
  const panel = container.querySelector('#deposit-transfer-panel');
  if (!panel || !isDeposit) return;
  clearCountdown(container);
  panel.className = 'deposit-transfer-panel is-success';
  panel.innerHTML = `<div class="funding-success-panel"><span>${icons.deposit}</span><strong>Transfer confirmation sent</strong><small>${money(amount)} ${esc(method?.currency || 'USDT')} via ${esc(method?.title || method?.code || 'selected method')} is being processed.</small></div>`;
}

function setStatus(el, message, type = 'info') {
  if (!el) return;
  el.textContent = message;
  el.className = `text-xs text-center funding-form-status is-${type}`;
}

function getDepositDeadline(method, amount, hours) {
  const key = `mex_deposit_deadline_${methodId(method)}_${Number(amount).toFixed(2)}`;
  const now = Date.now();
  let deadline = Number(localStorage.getItem(key) || 0);
  if (!deadline || deadline <= now) {
    deadline = now + hours * 60 * 60 * 1000;
    localStorage.setItem(key, String(deadline));
  }
  return deadline;
}

function startCountdown(container, deadline) {
  const tick = () => {
    const el = container.querySelector('#deposit-countdown');
    if (!el) return;
    const left = Math.max(0, deadline - Date.now());
    el.textContent = formatDuration(left);
    container.querySelector('.deposit-timer')?.classList.toggle('is-expired', left <= 0);
    const submit = container.querySelector('#funding-submit');
    if (submit && left <= 0) submit.disabled = true;
  };
  tick();
  container.__depositTimer = setInterval(tick, 1000);
}

function clearCountdown(container) {
  if (container?.__depositTimer) clearInterval(container.__depositTimer);
  if (container) container.__depositTimer = null;
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((option) => {
    if (option && typeof option === 'object') return { value: String(option.value ?? option.key ?? option.label ?? ''), label: String(option.label ?? option.name ?? option.value ?? '') };
    return { value: String(option), label: String(option) };
  }).filter(option => option.value !== '');
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeFieldName(value) {
  return normalizeKey(value) || 'destination';
}

function copyAddress(btn) {
  navigator.clipboard?.writeText(btn.dataset.copyAddress || '').then(() => {
    btn.textContent = 'Copied';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
  }).catch(() => {});
}

function idempotencyKey(prefix) {
  const random = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return `vp-${prefix}-${random}`;
}

function resolveTab(params = {}) {
  const path = String(params._path || '');
  const action = String(params.action || params.tab || '').toLowerCase();
  if (TABS.some(tab => tab.key === action)) return action;
  if (path.includes('withdraw')) return 'withdraw';
  if (path.includes('deposit')) return 'deposit';
  return 'deposit';
}

function activeTabLabel(tab) {
  return TABS.find(item => item.key === tab)?.label || 'Deposit';
}

function summaryTile(label, value, sub) {
  return `<article class="funding-summary-tile"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></article>`;
}

function checkItem(label, done) {
  return `<div class="funding-check-item ${done ? 'is-done' : 'is-pending'}"><i>${done ? icons.deposit : icons.lock}</i><div><strong>${esc(label)}</strong><small>${done ? 'Ready' : 'Required'}</small></div></div>`;
}

function detailPill(label, value) {
  return `<span><small>${esc(label)}</small><strong>${esc(value)}</strong></span>`;
}

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (['approved', 'confirmed', 'completed', 'paid', 'posted'].includes(s)) return 'badge-green';
  if (['pending', 'requested', 'processing', 'review'].includes(s)) return 'badge-accent';
  if (['rejected', 'failed', 'cancelled', 'canceled'].includes(s)) return 'badge-red';
  return 'badge';
}

function historyTitle(kind) {
  if (kind === 'withdraw') return 'Withdrawal';
  if (kind === 'ledger') return 'Ledger entry';
  return 'Deposit';
}

function titleCase(value) {
  return String(value || '').replace(/[_-]/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function prettifyKey(key) {
  return titleCase(key);
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDeadline(ms) {
  const d = new Date(Number(ms));
  return d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes) {
  const b = Number(bytes || 0);
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}

function timeValue(value) {
  const raw = String(value || '').trim();
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n > 10_000_000_000 ? n : n * 1000;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatHistoryTime(value) {
  const ts = timeValue(value);
  if (!ts) return '--';
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
