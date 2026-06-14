// Funding View - unified Deposit / Withdraw / History workspace
import { get, set } from '../state/store.js';
import { money, esc, escAttr } from '../utils/format.js';
import { navigate } from '../router.js';
import { api, formApi, postApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';
import { t } from '../utils/i18n.js';
import { isKycApproved, showKycGateDialog, trySwitchToReal } from '../utils/gates.js';

const fundingCache = globalThis.__MEX_FUNDING_CACHE__ || (globalThis.__MEX_FUNDING_CACHE__ = new Map());
const CACHE_TTL = 45_000;
const PAYMENT_ASSET_BASE = '/assets/img/payment_methods/';

const PAYMENT_LOGO_STRIP = [
  { name: 'Google Pay', file: 'pm-google-pay.png' },
  { name: 'Apple Pay', file: 'pm-apple-pay.png' },
  { name: 'SII', file: 'pm-sii.png' },
  { name: 'American Express', file: 'pm-amex.png' },
  { name: 'Mastercard', file: 'pm-mastercard.png' },
  { name: 'Visa', file: 'pm-visa.png' },
  { name: 'USDT', file: 'pm-usdt-networks.svg' },
  { name: 'Bank transfer', file: 'pm-bank-transfer.png' },
];

// Listeners bound to the persistent #view container; disposed on cleanup to avoid accumulation.
let fundingDisposers = [];

const TABS = [
  { key: 'deposit', label: 'funding.deposit', fallback: 'Deposit', icon: icons.deposit },
  { key: 'withdraw', label: 'funding.withdraw', fallback: 'Withdraw', icon: icons.withdraw },
  { key: 'history', label: 'funding.history', fallback: 'History', icon: icons.wallet },
];

export function render(params = {}) {
  const activeTab = resolveTab(params);
  const wallet = get('wallet') || {};
  const mode = get('mode') === 'real' ? 'real' : 'demo';
  const needsKyc = !isKycApproved();
  const locked = activeTab !== 'history' && (mode !== 'real' || needsKyc);
  const activeBalance = mode === 'real' ? (wallet.real || {}) : (wallet.demo || {});

  return `
    <div class="funds-workspace animate-fade-in" data-active-funding-tab="${escAttr(activeTab)}">
      <section class="funds-hero-pro">
        <div>
          <span class="badge-accent">${t('funding.assets_desk', 'Assets desk')}</span>
          <h1>${t('nav.wallet', 'Funds')}</h1>
          <p>${t('funding.hero_copy', 'Deposit, withdraw and audit wallet movements from one fast workspace powered by admin payment categories.')}</p>
        </div>
        <div class="funds-balance-pro">
          <span>${mode === 'real' ? t('balance.available', 'Available balance') : t('funding.demo_balance', 'Demo balance')}</span>
          <strong>${money(activeBalance.available || activeBalance.balance || 0)}</strong>
          <small>${esc(activeBalance.currency || (mode === 'real' ? 'USDT' : 'USDT_DEMO'))}</small>
        </div>
      </section>

      ${activeTab === 'deposit' ? `<section class="funding-promo-banner" data-promo-banner>
        <span class="promo-coin-float">${icons.coin}</span>
        <div class="promo-banner-content">
          <span class="promo-badge"><b>+10%</b> ${t('funding.bonus', 'Bonus')}</span>
          <span class="promo-text">${t('funding.bonus_crypto', 'Get 10% bonus on every crypto deposit')}</span>
        </div>
        <button type="button" data-dismiss-promo aria-label="Dismiss">${icons.close}</button>
      </section>` : ''}

      <section class="funds-tabs-pro" role="tablist" aria-label="Funding workspace tabs">
        ${TABS.map(tab => `
          <button type="button" class="${tab.key === activeTab ? 'active' : ''}" data-funding-tab="${tab.key}" role="tab" aria-selected="${tab.key === activeTab ? 'true' : 'false'}">
            <span>${tab.icon || ''}</span>${esc(t(tab.label, tab.fallback))}
          </button>
        `).join('')}
      </section>

      ${locked ? `<section class="funding-mode-warning">
        <span class="gate-icon">${icons.lock}</span>
        <div>
          <strong>${mode !== 'real' ? t('funding.real_required', 'Real account required') : t('earn.kyc_required', 'KYC approval required')}</strong>
          <small>${t('funding.real_only_copy', 'Deposits and withdrawals are available for verified real accounts only.')}</small>
        </div>
        <button type="button" class="btn-primary btn-sm" data-switch-real>${t('earn.switch_real', 'Switch to Real')}</button>
      </section>` : ''}

      ${activeTab === 'history' ? renderHistoryWorkspace() : (locked ? fundingLockedWorkspace(renderFundingWorkspace(activeTab)) : renderFundingWorkspace(activeTab))}
    </div>`;
}

export function mount(container, params = {}) {
  const activeTab = resolveTab(params);

  reconcileStripeReturn(container, params);

  const onFundingClick = (e) => {
    const tab = e.target.closest('[data-funding-tab]');
    if (tab) {
      e.preventDefault();
      navigate('wallet', { action: tab.dataset.fundingTab || 'deposit' });
      return;
    }

    if (e.target.closest('[data-switch-real]')) {
      e.preventDefault();
      trySwitchToReal('funding');
      return;
    }

    if ((get('mode') !== 'real' || !isKycApproved()) && activeTab !== 'history' && e.target.closest('[data-funding-category], [data-method], [data-quick-amount], [data-copy-address], #funding-form, .funding-locked-shell')) {
      e.preventDefault();
      showKycGateDialog({ body: t('gate.funding_body', 'Deposits and withdrawals are available for verified real accounts only.') });
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

    const dismissPromo = e.target.closest('[data-dismiss-promo]');
    if (dismissPromo) {
      e.preventDefault();
      const banner = container.querySelector('[data-promo-banner]');
      if (banner) banner.style.display = 'none';
      return;
    }

    const filter = e.target.closest('[data-history-filter]');
    if (filter) {
      container.__fundingHistoryFilter = filter.dataset.historyFilter || 'all';
      renderCombinedHistory(container);
      return;
    }

    const historyToggle = e.target.closest('[data-funding-history-toggle]');
    if (historyToggle) {
      const card = historyToggle.closest('[data-funding-history-card]');
      if (card) {
        const expanded = !card.classList.contains('is-expanded');
        card.classList.toggle('is-expanded', expanded);
        historyToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      }
      return;
    }

    const copy = e.target.closest('[data-copy-address]');
    if (copy) {
      copyAddress(copy);
      return;
    }

  };
  container.addEventListener('click', onFundingClick);
  fundingDisposers.push(() => container.removeEventListener('click', onFundingClick));

  const onFundingInput = (e) => {
    if (e.target.matches('input[name="amount"], [data-withdraw-field]')) updateSelectedMethod(container);
  };
  container.addEventListener('input', onFundingInput);
  fundingDisposers.push(() => container.removeEventListener('input', onFundingInput));

  const onFundingChange = (e) => {
    const proof = e.target.closest('input[name="proof"]');
    if (!proof) return;
    const badge = container.querySelector('#proof-file-name');
    const file = proof.files?.[0];
    if (badge) badge.textContent = file ? `${file.name} - ${formatFileSize(file.size || 0)}` : t('funding.upload_file_hint', 'Image or PDF up to 8MB');
  };
  container.addEventListener('change', onFundingChange);
  fundingDisposers.push(() => container.removeEventListener('change', onFundingChange));

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
  container.querySelector('#funding-form')?.addEventListener('submit', (e) => {
    if (get('mode') !== 'real' || !isKycApproved()) {
      e.preventDefault();
      showKycGateDialog({ body: t('gate.funding_body', 'Deposits and withdrawals are available for verified real accounts only.') });
      return;
    }
    handleSubmit(e, container, activeTab);
  });
}

function fundingLockedWorkspace(content) {
  return `<section class="funding-locked-shell blur-gate blur-active">
    <div class="blur-gate-content">${content}</div>
    <div class="blur-gate-overlay">
      <button type="button" class="gate-card funding-lock-card" data-switch-real>
        <span class="gate-icon">${icons.lock}</span>
        <strong>${t('funding.real_only', 'Real account only')}</strong>
        <p>${t('funding.real_only_copy', 'Deposits and withdrawals are available for verified real accounts only.')}</p>
        <span class="btn-primary btn-sm">${t('earn.switch_real', 'Switch to Real')}</span>
      </button>
    </div>
  </section>`;
}

function reconcileStripeReturn(container, params) {
  const ret = params && params.stripe;
  if (!ret) return;
  // Clear the one-shot stripe params so reload / re-navigation does not re-trigger.
  try { window.history.replaceState(null, '', window.location.pathname + '#/wallet'); } catch (_e) {}

  const banner = document.createElement('div');
  banner.className = 'stripe-return-banner';
  container.prepend(banner);

  if (ret !== 'success') {
    banner.classList.add('is-cancel');
    banner.innerHTML = `<div><strong>${t('funding.payment_canceled', 'Card payment was canceled.')}</strong><small>${t('funding.payment_canceled_copy', 'You can start a new deposit whenever you are ready.')}</small></div>`;
    return;
  }

  const depositId = Number(params.deposit || 0);
  banner.classList.add('is-pending');
  banner.innerHTML = `<span class="stripe-return-spin"></span><div><strong>${t('funding.verifying_payment', 'Verifying card payment...')}</strong></div>`;

  (async () => {
    let status = '';
    if (depositId > 0) {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await postApi('/deposits/stripe_sync.php', { deposit_id: depositId }, { timeout: 15000 });
          status = String(res?.status || '');
          if (status === 'confirmed' || status === 'failed') break;
        } catch (_e) { /* retry */ }
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
    if (status === 'confirmed') {
      banner.className = 'stripe-return-banner is-success';
      banner.innerHTML = `<div><strong>${t('funding.deposit_confirmed', 'Payment confirmed. Funds credited to your wallet.')}</strong></div>`;
      try {
        const data = await api('/bootstrap.php');
        if (data && data.wallet) set('wallet', data.wallet);
      } catch (_e) { /* ignore */ }
      navigate('wallet', { action: 'history' });
    } else if (status === 'failed') {
      banner.className = 'stripe-return-banner is-cancel';
      banner.innerHTML = `<div><strong>${t('funding.deposit_failed', 'Payment was not completed.')}</strong></div>`;
    } else {
      banner.className = 'stripe-return-banner';
      banner.innerHTML = `<div><strong>${t('funding.payment_processing', 'Payment is processing. Your balance will update shortly.')}</strong></div>`;
    }
  })();
}

export function cleanup() {
  document.querySelectorAll('.funds-workspace').forEach((container) => clearCountdown(container));
  fundingDisposers.forEach((d) => { try { d(); } catch (_e) {} });
  fundingDisposers = [];
}

function renderPaymentLogosStrip() {
  return `
    <div class="payment-logos-strip">
      <div class="payment-logos-row">
        ${PAYMENT_LOGO_STRIP.map(l => `<span class="payment-logo" title="${escAttr(l.name)}">${paymentImage(paymentAsset(l.file), l.name, 'payment-logo-img')}</span>`).join('')}
      </div>
      <p class="payment-logos-caption">${t('funding.payment_methods_secure', 'We support all payment methods securely and quickly')}</p>
    </div>`;
}

function renderFundingWorkspace(kind) {
  const isDeposit = kind === 'deposit';
  return `
    <section class="funding-flow-shell">
      ${renderPaymentLogosStrip()}
      <div class="funding-flow-main card ${isDeposit ? 'deposit-console-card' : ''}">
        <div class="panel-headline funding-panel-title">
          <span class="${isDeposit ? 'badge-green' : 'badge-accent'}">${isDeposit ? t('funding.deposit_ticket', 'Deposit ticket') : t('funding.withdraw_ticket', 'Withdrawal ticket')}</span>
          <h2>${isDeposit ? t('funding.create_deposit', 'Create deposit transfer') : t('funding.create_withdraw', 'Create withdrawal request')}</h2>
        </div>

        <form id="funding-form" data-kind="${kind}" class="funding-form-pro" novalidate>
          <div class="funding-step-block">
            <span class="field-label">${t('funding.select_section', '1. Select section')}</span>
            <div class="funding-category-rail" id="funding-categories">
              ${Array.from({ length: 3 }).map(() => '<div class="skeleton h-16 rounded-lg"></div>').join('')}
            </div>
          </div>

          <div class="funding-step-block">
            <span class="field-label">${t('funding.select_method_step', '2. Select method')}</span>
            <div id="method-cards" class="method-grid method-grid-rail">
              ${Array.from({ length: 4 }).map(() => '<div class="skeleton h-20 rounded-lg"></div>').join('')}
            </div>
          </div>

          ${isDeposit ? `<div id="deposit-transfer-panel" class="deposit-transfer-panel is-muted">
            ${emptyTransferPanel(t('funding.transfer_details_waiting', 'Transfer details will appear here'), t('funding.transfer_details_waiting_copy', 'Choose a method to unlock account details, QR code, wallet address and bank fields.'))}
          </div>` : `<div id="withdraw-fields-panel" class="withdraw-fields-panel"></div>`}

          <div class="deposit-ticket-grid">
            <label class="block">
              <span class="field-label">${isDeposit ? t('funding.amount_step', '3. Amount') : t('deposit.amount', 'Amount')}</span>
              <input type="number" name="amount" class="input mt-1" value="${isDeposit ? '' : '50'}" min="1" step="any" placeholder="${isDeposit ? escAttr(t('funding.amount_placeholder', 'Enter exact amount after copying the transfer details')) : '50'}" required>
            </label>
            <label class="block">
              <span class="field-label">${t('funding.currency', 'Currency')}</span>
              <input type="text" name="currency" class="input mt-1" value="USDT" readonly>
            </label>
          </div>

          ${isDeposit ? `<div class="quick-amount-rail" aria-label="Quick amount">
            ${[100, 250, 500, 1000, 2500].map(v => `<button type="button" class="quick-amount-chip" data-quick-amount="${v}">${money(v, 0)}</button>`).join('')}
          </div>
          <div id="deposit-proof-slot" class="deposit-proof-slot"></div>` : ''}

          <label class="block deposit-note-field">
            <span class="field-label">${isDeposit ? t('funding.reference_notes', 'Reference / notes') : t('funding.additional_notes', 'Additional notes')}</span>
            <textarea name="notes" class="input mt-1" rows="2" placeholder="${isDeposit ? escAttr(t('funding.reference_placeholder', 'Sender name, transaction hash, or bank reference...')) : escAttr(t('funding.notes_placeholder', 'Optional note for the operations desk...'))}"></textarea>
          </label>

          <div class="funding-submit-zone">
            <button type="submit" class="${isDeposit ? 'btn-primary' : 'btn-sell'} w-full py-3" id="funding-submit">
              ${isDeposit ? t('funding.confirm_transfer', 'Confirm transfer') : t('funding.submit_withdraw', 'Submit withdrawal request')}
            </button>
            <p class="text-xs text-center funding-form-status" id="form-status"></p>
          </div>
        </form>
      </div>
    </section>`;
}

function renderHistoryWorkspace() {
  return `
    <section class="card funding-history-workspace">
      <div class="panel-headline-row">
        <div>
          <span class="badge-accent">${t('funding.history', 'History')}</span>
          <h2>${t('funding.history_title', 'Funding history')}</h2>
        </div>
        <div class="history-filter-rail">
          ${['all', 'deposit', 'withdraw', 'pending', 'completed', 'failed'].map((key, index) => `
            <button type="button" class="${index === 0 ? 'active' : ''}" data-history-filter="${key}">${esc(historyFilterLabel(key))}</button>
          `).join('')}
        </div>
      </div>
      <div id="funding-history-all" class="funding-history-stack">
        <p class="text-muted text-sm text-center py-10">${t('funding.loading_history', 'Loading funding history...')}</p>
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
    container.__fundingBonuses = {};
    if (kind === 'deposit') {
      await Promise.all(categories.map(async (cat) => {
        try {
          const b = await api(`/wallet/bonuses.php?method_key=${encodeURIComponent(cat.key)}`, { timeout: 4000 });
          if (b?.ok && b.bonus) container.__fundingBonuses[cat.key] = b.bonus;
        } catch (_e) {}
      }));
    }
    renderCategoryTabs(container);
    renderMethodCards(container);
    updateSelectedMethod(container);
  } catch (_e) {
    const cats = container.querySelector('#funding-categories');
    const cards = container.querySelector('#method-cards');
    if (cats) cats.innerHTML = `<div class="empty-state empty-state--compact">${t('funding.sections_unavailable', 'Payment sections are temporarily unavailable.')}</div>`;
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
      icon: cat.image_url ? paymentImage(cat.image_url, cat.label || fallbackCategoryLabel(key), 'funding-category-logo') : categoryIcon(key, cat.icon),
    });
  });
  methodKeys.forEach((key) => {
    if (categories.some(cat => cat.key === key)) return;
    categories.push({ key, label: fallbackCategoryLabel(key), hint: fallbackCategoryHint(key), icon: categoryIcon(key) });
  });
  // Enforce user-priority: card → bank → crypto → crypto_bot → everything else
  const priority = { card: 1, bank: 2, crypto: 3, crypto_bot: 4, manual: 99 };
  categories.sort((a, b) => (priority[a.key] || 99) - (priority[b.key] || 99));
  return categories;
}

function renderCategoryTabs(container) {
  const el = container.querySelector('#funding-categories');
  const categories = container.__fundingCategories || [];
  const selected = container.__fundingCategory || categories[0]?.key || '';
  if (!el) return;
  if (!categories.length) {
    el.innerHTML = `<div class="empty-state empty-state--compact">${t('funding.no_sections', 'No active funding sections are configured by admin.')}</div>`;
    return;
  }
  el.innerHTML = categories.map(cat => {
    const isDeposit = (container.__fundingKind || '') === 'deposit';
    const bonus = isDeposit ? container.__fundingBonuses?.[cat.key] : null;
    // Default crypto bonus if API not ready
    const showBonus = isDeposit ? (bonus || (cat.key === 'crypto' ? { amount: 10 } : null)) : null;
    const bonusCard = showBonus ? `
      <span class="bonus-card"><span>${t('funding.bonus', 'Bonus')}</span><b>+${formatBonusPercent(showBonus.amount || 0)}%</b></span>
    ` : '';
    return `
    <button type="button" class="${cat.key === selected ? 'active' : ''}" data-funding-category="${escAttr(cat.key)}">
      <i>${cat.icon || icons.wallet}</i>
      <strong>${esc(cat.label)}</strong>
      ${bonusCard}
    </button>`;
  }).join('');
}

function renderMethodCards(container) {
  const el = container.querySelector('#method-cards');
  const methods = filteredMethods(container);
  const isDeposit = (container.__fundingKind || container.querySelector('#funding-form')?.dataset.kind || 'deposit') === 'deposit';
  if (!el) return;
  clearCountdown(container);
  if (!methods.length) {
    el.innerHTML = `<div class="empty-state empty-state--compact">${t('funding.no_methods_section', 'No active methods under this section.')}</div>`;
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
      <span class="method-card-top">
        <span class="method-icon">${methodIcon(m)}</span>
        ${methodBrandStrip(m)}
      </span>
      <strong>${esc(m.title || m.name || m.code || t('funding.method', 'Method'))}</strong>
      <span class="method-card-badges">${methodBadges(m, isDeposit)}</span>
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
    submit.textContent = isStripe ? (selected.checkout_label || t('funding.continue_card_checkout', 'Continue to secure card checkout')) : (isDeposit ? t('funding.confirm_transfer', 'Confirm transfer') : t('funding.submit_withdraw', 'Submit withdrawal request'));
  }
  if (!selected) {
    renderDepositTransferPanel(container, null, amount, false, t('funding.choose_method_first', 'Choose an active method first.'));
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
        <strong>${esc(selected.title || selected.name || selected.code || t('funding.payment_method', 'Payment method'))}</strong>
        <small>${esc(selected.description || t('funding.configured_route', 'Configured funding route'))}</small>
      </div>
    </div>
    <div class="method-detail-grid">
      ${detailPill(t('funding.section', 'Section'), fallbackCategoryLabel(methodCategory(selected)))}
      ${detailPill(t('funding.currency', 'Currency'), selected.currency || 'USDT')}
      ${detailPill(t('funding.minimum', 'Minimum'), money(selected.min_amount || 0))}
      ${detailPill(t('funding.maximum', 'Maximum'), selected.max_amount ? money(selected.max_amount) : t('funding.flexible', 'Flexible'))}
      ${detailPill(t('funding.proof', 'Proof'), isStripe ? t('funding.not_needed', 'Not needed') : (selected.proof_required || isDeposit ? t('funding.receipt', 'Receipt') : t('funding.optional', 'Optional')))}
      ${detailPill(t('funding.window', 'Window'), isStripe ? t('funding.checkout', 'Checkout') : `${Math.max(1, Number(selected.expires_hours || 24))}h`)}
    </div>
    ${isStripe ? `<div class="secure-checkout-strip">
      <i>${icons.wallet}</i>
      <div>
        <strong>${t('funding.secure_stripe', 'Secure Stripe Checkout')}</strong>
        <small>${t('funding.secure_stripe_copy', 'Card details are collected by Stripe. You return to MEX after payment confirmation.')}</small>
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
    panel.innerHTML = emptyTransferPanel(t('funding.choose_method', 'Choose a method'), t('funding.choose_method_copy', 'Select a funding method to display transfer instructions, QR code and destination details.'));
    return;
  }
  if (isStripe) {
    panel.className = 'deposit-transfer-panel is-ready';
    panel.innerHTML = `
      <div class="deposit-transfer-ready">
        <div class="deposit-transfer-title">
          <span>${icons.wallet}</span>
          <div><strong>${t('funding.ready_card_checkout', 'Ready for card checkout')}</strong><small>${t('funding.ready_card_checkout_copy', 'Enter the amount and continue to Stripe Checkout. No receipt upload is required.')}</small></div>
        </div>
        ${renderFundingRouteSummary(selected, true)}
        <div class="secure-checkout-strip">
          <i>${icons.wallet}</i>
          <div>
            <strong>${t('funding.secure_stripe', 'Secure Stripe Checkout')}</strong>
            <small>${t('funding.secure_stripe_copy', 'Card details are collected by Stripe. You return to MEX after payment confirmation.')}</small>
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
          <strong>${hasValidAmount ? `${t('funding.transfer', 'Transfer')} ${money(amount)} ${esc(selected.currency || 'USDT')}` : esc(selected.title || selected.name || selected.code || t('funding.payment_method', 'Payment method'))}</strong>
          <small>${hasValidAmount ? t('funding.use_exact_details', 'Use only the details shown here before the timer ends.') : t('funding.scan_then_amount', 'Scan the QR or copy the destination first, then enter the exact amount below.')}</small>
        </div>
      </div>
      ${renderFundingRouteSummary(selected, false)}
      ${hasValidAmount ? `<div class="deposit-timer" data-deposit-deadline="${deadline}">
        <div><span>${t('funding.payment_window', 'Payment window')}</span><strong id="deposit-countdown">--:--:--</strong></div>
        <small>${t('funding.expires', 'Expires')} ${formatDeadline(deadline)}</small>
      </div>` : ''}
      ${renderQrBlock(selected)}
      ${selected.instructions ? `<div class="transfer-instruction-card">
        <strong>${t('funding.transfer_instructions', 'Transfer instructions')}</strong>
        <p>${esc(selected.instructions)}</p>
      </div>` : ''}
      ${renderMissingFundingDetails(selected)}
    </div>`;
  if (hasValidAmount) startCountdown(container, deadline);
}

function renderFundingRouteSummary(method, isStripe = false) {
  const max = method.max_amount ? money(method.max_amount) : t('funding.flexible', 'Flexible');
  return `<div class="funding-route-summary" aria-label="Selected funding route summary">
    ${routeSummaryPill(t('funding.section', 'Section'), fallbackCategoryLabel(methodCategory(method)))}
    ${routeSummaryPill(t('funding.currency', 'Currency'), method.currency || 'USDT')}
    ${routeSummaryPill(t('funding.limits', 'Limits'), `${money(method.min_amount || 0)} - ${max}`)}
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
      <div><strong>${t('funding.no_receipt_needed', 'No receipt upload needed')}</strong><small>${t('funding.card_checkout_copy', 'Card payments continue through Stripe Checkout.')}</small></div>
    </div>`;
    return;
  }
  slot.innerHTML = `<label class="deposit-file-drop">
    <input type="file" name="proof" accept="image/*,.pdf">
    <span>${icons.deposit}</span>
    <div><strong>${selected.proof_required ? t('funding.upload_transfer_proof', 'Upload transfer proof') : t('funding.upload_receipt_optional', 'Upload receipt if available')}</strong><small id="proof-file-name">${t('funding.upload_file_hint', 'Image or PDF up to 8MB')}</small></div>
  </label>`;
}

function renderWithdrawFields(container, selected) {
  const panel = container.querySelector('#withdraw-fields-panel');
  if (!panel) return;
  if (!selected) {
    panel.dataset.methodId = '';
    panel.innerHTML = `<p class="text-muted text-sm">${t('funding.select_withdraw_method_first', 'Select a withdrawal method first.')}</p>`;
    return;
  }
  const selectedId = methodId(selected);
  if (panel.dataset.methodId === selectedId && panel.querySelector('[data-withdraw-field]')) return;
  panel.dataset.methodId = selectedId;
  const fields = normalizeInputFields(selected.fields || []);
  if (!fields.length) {
    panel.innerHTML = `<label class="block">
      <span class="field-label">${t('funding.payout_destination', 'Payout destination')}</span>
      <textarea name="destination" data-withdraw-field class="input mt-1" rows="3" placeholder="${escAttr(t('funding.payout_destination_placeholder', 'Wallet address, bank reference, IBAN, or payout details...'))}" required></textarea>
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

function methodBadges(method, isDeposit = true) {
  const badges = [];
  if (isDeposit && (method?.bonus_amount || method?.bonus_type)) badges.push({ label: t('funding.badge_bonus', 'Bonus'), type: 'bonus' });
  if (methodQrUrl(method)) badges.push({ label: t('funding.badge_qr', 'QR'), type: 'qr' });
  if (method?.proof_required) badges.push({ label: t('funding.badge_receipt', 'Receipt'), type: 'receipt' });
  return badges.slice(0, 3).map(item => `<b class="${item.type === 'bonus' ? 'is-bonus' : ''}">${esc(item.label)}</b>`).join('');
}

function formatBonusPercent(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0';
  return amount.toFixed(amount % 1 === 0 ? 0 : 1).replace(/\.0$/, '');
}

function renderMethodPaymentPreview(method, isDeposit) {
  const address = String(method?.payment_address || '').trim();
  const qr = methodQrUrl(method);
  const fields = displayFields(method?.fields || {}).filter(row => String(row.value || '').trim() !== address);
  const needsSetup = isDeposit && !address && !fields.length;
  return `<div class="method-payment-preview ${needsSetup ? 'needs-setup' : ''}">
    <div class="method-payment-preview-main">
      ${qr ? `<img class="method-preview-qr" src="${escAttr(qr)}" alt="Payment QR">` : `<span class="method-preview-logo">${methodIcon(method)}</span>`}
      <div>
        <strong>${needsSetup ? t('funding.details_unavailable', 'Funding details unavailable') : (isDeposit ? t('funding.transfer_details_configured', 'Transfer details configured') : t('funding.payout_fields_configured', 'Payout fields configured'))}</strong>
        <small>${needsSetup ? t('funding.choose_another_method', 'Choose another method or try again shortly.') : t('funding.route_details_copy', 'These details are provided by the selected funding route.')}</small>
      </div>
    </div>
    ${address ? `<div class="method-payment-address"><span>${t('funding.address_destination', 'Address / destination')}</span><code>${esc(address)}</code><button type="button" data-copy-address="${escAttr(address)}">${t('common.copy', 'Copy')}</button></div>` : ''}
    ${fields.length ? `<div class="method-payment-fields">${fields.slice(0, 4).map(row => `<span><small>${esc(row.label)}</small><b>${esc(String(row.value))}</b></span>`).join('')}</div>` : ''}
  </div>`;
}

function renderTransferTargetGrid(method) {
  const address = String(method?.payment_address || '').trim();
  return `
    <div class="transfer-target-card"><span>${t('funding.method', 'Method')}</span><strong>${esc(method?.title || method?.name || method?.code || t('funding.payment_method', 'Payment method'))}</strong></div>
    ${renderTransferFields(method, address ? [address] : [])}
  `;
}

function renderQrBlock(method) {
  const qr = methodQrUrl(method);
  const address = String(method?.payment_address || '').trim();
  if (!qr && !address) return '';
  return `<div class="transfer-qr-card transfer-qr-card--centered">
    <strong>${t('funding.scan_qr', 'Scan QR code')}</strong>
    <small>${t('funding.scan_qr_copy', 'Scan with your wallet or banking app, then use the wallet address below if you prefer to copy it manually.')}</small>
    ${qr ? `<img src="${escAttr(qr)}" alt="Payment QR">` : ''}
    ${address ? `<div class="transfer-qr-address">
      <span>${t('funding.wallet_address', 'Wallet address')}</span>
      <code>${esc(address)}</code>
      <button type="button" data-copy-address="${escAttr(address)}">${t('funding.copy_address', 'Copy address')}</button>
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
  return `<div class="funding-method-warning">${icons.lock}<div><strong>${t('funding.route_unavailable', 'Funding route unavailable')}</strong><small>${t('funding.choose_another_method', 'Choose another method or try again shortly.')}</small></div></div>`;
}

function renderTransferFields(method, excludeValues = []) {
  const rows = displayFields(method?.fields || {});
  const exclude = new Set(excludeValues.map(v => String(v || '').trim()).filter(Boolean));
  return rows.filter(r => !exclude.has(String(r.value || '').trim())).slice(0, 8).map((r) => {
    const value = String(r.value);
    return `<div class="transfer-target-card ${value.length > 26 ? 'transfer-target-wide' : ''}"><span>${esc(r.label)}</span><strong>${esc(value)}</strong><button type="button" data-copy-address="${escAttr(value)}">${t('common.copy', 'Copy')}</button></div>`;
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
    if (get('mode') !== 'real') return setStatus(status, t('funding.switch_real_before_submit', 'Switch to Real before submitting live funding requests.'), 'error');
    if (!selected) return setStatus(status, t('funding.select_active_method_first', 'Select an active payment method first.'), 'error');
    const validation = validateAmount(selected, amount);
    if (validation) return setStatus(status, validation, 'error');

    const proof = form.querySelector('input[name="proof"]')?.files?.[0] || null;
    if (isDeposit && !isStripe && selected.proof_required && !proof) return setStatus(status, t('funding.upload_proof_before_confirm', 'Upload transfer proof before confirming.'), 'error');

    const withdrawFields = collectWithdrawFields(container);
    const destination = withdrawFields.destination || withdrawFields.wallet_address || withdrawFields.bank_account || withdrawFields.iban || withdrawFields.address || notes;
    if (!isDeposit && !String(destination || '').trim()) return setStatus(status, t('funding.enter_payout_destination', 'Enter payout destination details.'), 'error');

    container.__fundingSubmitting = true;
    if (submit) {
      submit.disabled = true;
      submit.dataset.originalText = submit.dataset.originalText || submit.textContent || '';
      submit.textContent = isDeposit ? (isStripe ? t('funding.opening_checkout', 'Opening checkout...') : t('funding.confirming', 'Confirming...')) : t('funding.submitting', 'Submitting...');
    }
    setStatus(status, isStripe ? t('funding.opening_secure_checkout', 'Opening secure checkout...') : (isDeposit ? t('funding.sending_transfer_confirmation', 'Sending transfer confirmation...') : t('funding.sending_payout_request', 'Sending payout request...')), 'info');

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

    if (!res || res.ok === false) return setStatus(status, res?.error || t('common.request_failed', 'Request failed'), 'error');
    if (isStripe && res.checkout_url) {
      setStatus(status, t('funding.redirecting_checkout', 'Redirecting to checkout...'), 'success');
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

    setStatus(status, isDeposit ? t('funding.transfer_confirmation_received', 'Transfer confirmation received. Your deposit is now being processed.') : t('funding.withdrawal_request_received', 'Withdrawal request received. You can track it from history.'), 'success');
    showSuccessPanel(container, isDeposit, amount, selected);
    fundingCache.delete(isDeposit ? '/deposits/list.php' : '/withdrawals/list.php');
  } catch (err) {
    setStatus(status, err.message || t('common.request_failed', 'Request failed'), 'error');
  } finally {
    container.__fundingSubmitting = false;
    if (submit) {
      submit.disabled = false;
      submit.textContent = submit.dataset.originalText || (isDeposit ? t('funding.confirm_transfer', 'Confirm transfer') : t('funding.submit_withdraw', 'Submit withdrawal request'));
    }
  }
}

async function loadCombinedHistory(container) {
  const el = container.querySelector('#funding-history-all');
  if (!el) return;
  const results = await Promise.allSettled([
    cachedApi('/deposits/list.php', { timeout: 8000, retry: 1 }, 20_000),
    cachedApi('/withdrawals/list.php', { timeout: 8000, retry: 1 }, 20_000),
  ]);
  container.__fundingHistoryItems = [
    ...(results[0].status === 'fulfilled' ? (results[0].value?.items || []).map(item => normalizeHistoryItem(item, 'deposit')) : []),
    ...(results[1].status === 'fulfilled' ? (results[1].value?.items || []).map(item => normalizeHistoryItem(item, 'withdraw')) : []),
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
    el.innerHTML = `<div class="empty-state empty-state--compact">${t('funding.no_matching_history', 'No matching funding history yet.')}</div>`;
    return;
  }
  el.innerHTML = `
    <div class="ledger-mobile-list md:hidden">${items.map(historyCard).join('')}</div>
    <div class="hidden md:block overflow-x-auto">
      <table class="funding-history-table">
        <thead><tr><th>${t('funding.type', 'Type')}</th><th>${t('funding.method', 'Method')}</th><th>${t('deposit.amount', 'Amount')}</th><th>${t('kyc.status', 'Status')}</th><th>${t('funding.date', 'Date')}</th></tr></thead>
        <tbody>${items.map(historyRow).join('')}</tbody>
      </table>
    </div>`;
}

function normalizeHistoryItem(item, kind) {
  const amount = Number(item.amount || 0);
  const created = item.created_at || item.updated_at || '';
  const status = kind === 'ledger' ? 'posted' : String(item.status || 'pending').toLowerCase();
  const reference = item.reference || item.ref || item.ref_id || item.txid || item.tx_hash || item.transaction_id || item.id || '';
  const note = item.note || item.notes || item.memo || item.description || '';
  return {
    kind,
    amount,
    currency: item.currency || 'USDT',
    status,
    method: historyMethodLabel(kind === 'ledger' ? (item.type || item.ref_type || 'ledger') : (item.method_label || item.provider || item.method_code || item.method || 'manual')),
    created,
    reference: String(reference || ''),
    note: String(note || ''),
    sortTime: timeValue(created),
  };
}

function historyCard(item) {
  const positive = item.kind === 'deposit' || (item.kind === 'ledger' && item.amount >= 0);
  const details = [
    [t('funding.method', 'Method'), item.method],
    [t('funding.date', 'Date'), formatHistoryTime(item.created)],
    [t('kyc.status', 'Status'), statusLabel(item.status)],
    item.reference ? [t('funding.reference', 'Reference'), item.reference] : null,
    item.note ? [t('funding.notes', 'Notes'), item.note] : null,
  ].filter(Boolean);
  return `<article class="funding-history-card funds-history-card ${positive ? 'is-positive' : 'is-negative'}" data-funding-history-card>
    <div class="funding-history-main">
      <span class="history-kind ${positive ? 'is-deposit' : 'is-withdraw'}">${item.kind === 'withdraw' ? icons.withdraw : icons.deposit}</span>
      <div><strong>${historyTitle(item.kind)}</strong><small>${esc(item.method)} - ${esc(formatHistoryTime(item.created))}</small></div>
      <button type="button" class="funding-history-toggle" data-funding-history-toggle aria-expanded="false" aria-label="${escAttr(t('common.details', 'Details'))}">${icons.chevronDown || '⌄'}</button>
    </div>
    <div class="funds-history-amount"><strong>${positive ? '+' : ''}${money(item.amount)} ${esc(item.currency)}</strong><span class="${statusBadge(item.status)}">${esc(statusLabel(item.status))}</span></div>
    <div class="funding-history-details">
      ${details.map(([label, value]) => `<span><small>${esc(label)}</small><b>${esc(value)}</b></span>`).join('')}
    </div>
  </article>`;
}

function historyRow(item) {
  const positive = item.kind === 'deposit' || (item.kind === 'ledger' && item.amount >= 0);
  return `<tr>
    <td>${esc(historyTitle(item.kind))}</td>
    <td>${esc(item.method)}</td>
    <td class="${positive ? 'text-buy' : 'text-sell'}">${positive ? '+' : ''}${money(item.amount)} ${esc(item.currency)}</td>
    <td><span class="${statusBadge(item.status)}">${esc(statusLabel(item.status))}</span></td>
    <td>${esc(formatHistoryTime(item.created))}</td>
  </tr>`;
}

function historyMatchesFilter(item, filter) {
  if (filter === 'all') return true;
  if (['deposit', 'withdraw'].includes(filter)) return item.kind === filter;
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

function paymentAsset(file) {
  return `${PAYMENT_ASSET_BASE}${file}`;
}

function normalizePaymentImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  const cleanPath = url.split(/[?#]/)[0].replace(/\\/g, '/').toLowerCase();
  if (cleanPath.endsWith('/cat-card.svg')) return paymentAsset('pm-card-logos.png');
  if (cleanPath.endsWith('/cat-bank.svg')) return paymentAsset('pm-bank-transfer.png');
  if (cleanPath.endsWith('/cat-crypto.svg')) return paymentAsset('pm-usdt-networks.svg');
  if (cleanPath.endsWith('/card-visa.svg')) return paymentAsset('pm-visa.svg');
  if (cleanPath.endsWith('/card-mastercard.svg')) return paymentAsset('pm-mastercard.svg');
  if (cleanPath.endsWith('/card-stripe.svg')) return paymentAsset('pm-card-logos.png');
  if (cleanPath.endsWith('/stripe-card.svg')) return paymentAsset('pm-card-logos.png');
  if (cleanPath.endsWith('/bank-transfer.svg')) return paymentAsset('pm-bank-transfer.png');
  if (cleanPath.endsWith('/bank-withdraw.svg')) return paymentAsset('pm-bank-transfer.png');
  if (cleanPath.endsWith('/crypto-withdraw.svg')) return paymentAsset('pm-usdt-networks.svg');
  return url;
}

function paymentImage(value, label = '', className = 'payment-asset-img') {
  const src = normalizePaymentImageUrl(value);
  if (!src) return '';
  return `<img class="${escAttr(className)}" src="${escAttr(src)}" alt="${escAttr(label)}" loading="lazy">`;
}

function isPaymentImageRef(value) {
  const ref = String(value || '').trim();
  if (!ref) return false;
  return /^data:image\//i.test(ref) || /^https?:\/\//i.test(ref) || /^\/.+\.(svg|png|jpe?g|webp|gif)([?#].*)?$/i.test(ref) || /\.(svg|png|jpe?g|webp|gif)([?#].*)?$/i.test(ref);
}

function methodSearchText(method) {
  return [
    method?.provider,
    method?.code,
    method?.title,
    method?.name,
    method?.method_group,
    method?.category_key,
  ].filter(Boolean).join(' ').toLowerCase();
}

function methodLogoFile(method) {
  const raw = methodSearchText(method);
  if (/visa/.test(raw)) return 'pm-visa.svg';
  if (/mastercard|master/.test(raw)) return 'pm-mastercard.svg';
  if (/amex|american express/.test(raw)) return 'pm-amex.svg';
  if (/apple\s*pay/.test(raw)) return 'pm-apple-pay.svg';
  if (/google\s*pay/.test(raw)) return 'pm-google-pay.svg';
  if (/withdraw/.test(raw) && /bank|wire|iban|swift/.test(raw)) return 'pm-bank-transfer.png';
  if (/bank|wire|iban|swift|ach|fedwire/.test(raw)) return 'pm-bank-transfer.png';
  if (/stripe/.test(raw)) return 'pm-stripe.svg';
  if (/card|credit|debit/.test(raw)) return 'pm-card-logos.png';
  if (/trc20/.test(raw)) return 'pm-usdt-networks.svg';
  if (/erc20/.test(raw)) return 'pm-usdt-networks.svg';
  if (/btc|bitcoin/.test(raw)) return 'btc.svg';
  if (/eth|ethereum/.test(raw)) return 'eth.svg';
  if (/usdt|tether/.test(raw)) return 'pm-usdt-networks.svg';
  if (/crypto_bot|bot|telegram/.test(raw)) return 'cat-crypto.svg';
  if (/crypto|wallet|blockchain/.test(raw)) return 'pm-usdt-networks.svg';
  const category = methodCategory(method);
  if (category === 'card') return 'pm-card-logos.png';
  if (category === 'bank') return 'pm-bank-transfer.png';
  if (category === 'crypto') return 'pm-usdt-networks.svg';
  return '';
}

function methodIcon(m) {
  const label = m?.title || m?.name || m?.code || t('funding.payment_method', 'Payment method');
  const uploaded = normalizePaymentImageUrl(m?.image_url);
  if (uploaded) return paymentImage(uploaded, label, 'payment-method-logo');
  const file = methodLogoFile(m);
  if (file) return paymentImage(paymentAsset(file), label, 'payment-method-logo');
  return categoryIcon(methodCategory(m));
}

function methodBrandStrip(method) {
  const raw = methodSearchText(method);
  let logos = [];
  if (/stripe|card|visa|mastercard|master|amex|credit|debit/.test(raw)) {
    return `<span class="method-brand-strip"><img src="${paymentAsset('pm-card-logos.png')}" alt="Card" class="method-brand-logo method-brand-logo-large" style="width:96px;height:56px;object-fit:contain;border-radius:8px;background:rgba(255,255,255,.96);border:1px solid rgba(255,255,255,.70);box-shadow:0 6px 14px rgba(0,0,0,.12);"></span>`;
  } else if (/bank|wire|iban|swift|ach|fedwire/.test(raw)) {
    logos = [];
  } else if (/crypto|wallet|usdt|tether|trc20|erc20|btc|bitcoin|eth|ethereum/.test(raw)) {
    if (/trc20/.test(raw)) logos = [{ name: 'USDT TRC20', file: 'usdt-trc20.svg' }];
    else if (/erc20/.test(raw)) logos = [{ name: 'USDT ERC20', file: 'usdt-erc20.svg' }];
    else logos = [
      { name: 'USDT TRC20', file: 'usdt-trc20.svg' },
      { name: 'USDT ERC20', file: 'usdt-erc20.svg' },
    ];
  }
  if (!logos.length) return '';
  return `<span class="method-brand-strip">${logos.map(l => paymentImage(paymentAsset(l.file), l.name, 'method-brand-logo')).join('')}</span>`;
}

function categoryIcon(key, configured = '') {
  const configuredRef = String(configured || '').trim();
  if (isPaymentImageRef(configuredRef)) return paymentImage(configuredRef, fallbackCategoryLabel(key), 'funding-category-logo');
  const files = {
    card: 'pm-card-logos.png',
    bank: 'pm-bank-transfer.png',
    crypto: 'pm-usdt-networks.svg',
    crypto_bot: 'pm-usdt-networks.svg',
    cash: 'pm-bank-transfer.png',
    manual: 'pm-bank-transfer.png',
  };
  if (files[key]) return paymentImage(paymentAsset(files[key]), fallbackCategoryLabel(key), 'funding-category-logo');
  if (configuredRef) return `<b>${esc(configuredRef)}</b>`;
  return icons.wallet;
}

function fallbackCategoryLabel(key) {
  const labels = {
    bank: t('funding.bank_transfer', 'Bank transfer'),
    crypto: t('funding.crypto', 'Crypto'),
    card: t('funding.card_visa', 'Card / Visa'),
    cash: t('funding.cash_desk', 'Cash desk'),
    crypto_bot: t('funding.crypto_bot', 'Crypto bot'),
    manual: t('funding.manual', 'Manual'),
  };
  return labels[key] || titleCase(key || 'Manual');
}

function fallbackCategoryHint(key) {
  const hints = {
    bank: t('funding.bank_hint', 'Wire and bank details'),
    crypto: t('funding.crypto_hint', 'Wallet networks and QR'),
    card: t('funding.card_hint', 'Stripe hosted checkout'),
    cash: t('funding.cash_hint', 'Desk review'),
    crypto_bot: t('funding.crypto_bot_hint', 'Automated wallet route'),
    manual: t('funding.manual_hint', 'Configured instructions'),
  };
  return hints[key] || t('funding.configured_route', 'Configured route');
}

function isStripeMethod(method) {
  const raw = [method?.provider, method?.method_group, method?.category_key, method?.code, method?.title].filter(Boolean).join(' ').toLowerCase();
  return /stripe|card|visa|master/.test(raw);
}

function validateAmount(method, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return t('funding.enter_amount_continue', 'Enter the amount to continue.');
  const min = Number(method?.min_amount || 0);
  const max = Number(method?.max_amount || 0);
  if (min > 0 && amount < min) return `${t('funding.minimum_for_method', 'Minimum for this method is')} ${money(min)} ${method.currency || 'USDT'}.`;
  if (max > 0 && amount > max) return `${t('funding.maximum_for_method', 'Maximum for this method is')} ${money(max)} ${method.currency || 'USDT'}.`;
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
  panel.innerHTML = `<div class="funding-success-panel"><span>${icons.deposit}</span><strong>${t('funding.transfer_confirmation_sent', 'Transfer confirmation sent')}</strong><small>${money(amount)} ${esc(method?.currency || 'USDT')} ${t('funding.via', 'via')} ${esc(method?.title || method?.code || t('funding.selected_method', 'selected method'))} ${t('funding.is_being_processed', 'is being processed.')}</small></div>`;
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
    btn.textContent = t('common.copied', 'Copied');
    setTimeout(() => { btn.textContent = t('common.copy', 'Copy'); }, 1200);
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
  const item = TABS.find(row => row.key === tab);
  return item ? t(item.label, item.fallback) : t('funding.deposit', 'Deposit');
}

function summaryTile(label, value, sub) {
  return `<article class="funding-summary-tile"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></article>`;
}

function checkItem(label, done) {
  return `<div class="funding-check-item ${done ? 'is-done' : 'is-pending'}"><i>${done ? icons.deposit : icons.lock}</i><div><strong>${esc(label)}</strong><small>${done ? t('funding.ready', 'Ready') : t('funding.required', 'Required')}</small></div></div>`;
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
  if (kind === 'withdraw') return t('funding.withdrawal', 'Withdrawal');
  if (kind === 'ledger') return t('funding.ledger_entry', 'Ledger entry');
  return t('funding.deposit_entry', 'Deposit');
}

function historyFilterLabel(key) {
  const labels = {
    all: t('common.all', 'All'),
    deposit: t('funding.deposit', 'Deposit'),
    withdraw: t('funding.withdraw', 'Withdraw'),
    ledger: t('funding.ledger', 'Ledger'),
    pending: t('funding.pending', 'Pending'),
    completed: t('funding.completed', 'Completed'),
    failed: t('funding.failed', 'Failed'),
  };
  return labels[key] || titleCase(key);
}

function statusLabel(status) {
  const s = String(status || '').toLowerCase();
  const labels = {
    approved: t('funding.status_approved', 'Approved'),
    confirmed: t('funding.status_confirmed', 'Confirmed'),
    completed: t('funding.status_completed', 'Completed'),
    paid: t('funding.status_paid', 'Paid'),
    posted: t('funding.status_posted', 'Posted'),
    pending: t('funding.status_pending', 'Pending'),
    requested: t('funding.status_requested', 'Requested'),
    processing: t('funding.status_processing', 'Processing'),
    review: t('funding.status_review', 'Under review'),
    rejected: t('funding.status_rejected', 'Rejected'),
    failed: t('funding.status_failed', 'Failed'),
    cancelled: t('funding.status_cancelled', 'Cancelled'),
    canceled: t('funding.status_cancelled', 'Cancelled'),
    'not submitted': t('funding.status_not_submitted', 'Not submitted'),
  };
  return labels[s] || titleCase(s || 'pending');
}

function historyMethodLabel(method) {
  const key = normalizeKey(method);
  const labels = {
    trade_open: t('funding.ledger_trade_open', 'Trade open'),
    trade_close: t('funding.ledger_trade_close', 'Trade close'),
    trade_pnl: t('funding.ledger_trade_pnl', 'Trade PnL'),
    deposit_credit: t('funding.ledger_deposit_credit', 'Deposit credit'),
    withdrawal: t('funding.withdrawal', 'Withdrawal'),
    withdraw: t('funding.withdrawal', 'Withdrawal'),
    invest_payout: t('funding.ledger_invest_payout', 'Investment payout'),
    ledger: t('funding.ledger_entry', 'Ledger entry'),
    stripe: t('funding.card_visa', 'Card / Visa'),
    bank: t('funding.bank_transfer', 'Bank transfer'),
    crypto: t('funding.crypto', 'Crypto'),
    manual: t('funding.manual', 'Manual'),
  };
  return labels[key] || titleCase(method || 'manual');
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
