import { get, set } from '../state/store.js';
import { navigate } from '../router.js';
import { esc, escAttr } from './format.js';
import { icons } from '../components/common/Icons.js';
import { t } from './i18n.js';

export function isKycApproved(kyc = get('kyc')) {
  const status = String(kyc?.status || '').toLowerCase();
  return ['approved', 'accepted', 'verified'].includes(status);
}

export function closeKycGateDialog() {
  document.querySelector('[data-kyc-gate-dialog]')?.remove();
}

export function showKycGateDialog(options = {}) {
  closeKycGateDialog();
  const title = options.title || t('gate.kyc_required_title', 'Verification required');
  const body = options.body || t('gate.kyc_required_body', 'Verify your account to unlock the real workspace and live account services.');
  const action = options.action || t('gate.open_kyc', 'Open verification');
  const wrap = document.createElement('div');
  wrap.className = 'dialog-backdrop';
  wrap.setAttribute('data-kyc-gate-dialog', '1');
  wrap.innerHTML = `<div class="dialog-card">
    <button class="dialog-close" aria-label="${escAttr(t('common.close', 'Close'))}" data-kyc-gate-close>${icons.close}</button>
    <div class="text-center space-y-3">
      <span class="gate-icon mx-auto">${icons.lock}</span>
      <h2 class="text-lg font-bold">${esc(title)}</h2>
      <p class="text-sm text-muted">${esc(body)}</p>
      <button class="btn-primary btn-sm" data-kyc-gate-action>${esc(action)}</button>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', (event) => {
    if (event.target === wrap || event.target.closest('[data-kyc-gate-close]')) {
      closeKycGateDialog();
      return;
    }
    if (event.target.closest('[data-kyc-gate-action]')) {
      event.preventDefault();
      closeKycGateDialog();
      navigate('kyc');
    }
  });
}

export function trySwitchToReal(reason = 'mode') {
  if (isKycApproved()) {
    localStorage.setItem('vp_mode', 'real');
    set('mode', 'real');
    location.reload();
    return true;
  }
  const copy = {
    mode: t('gate.switch_real_body', 'Real mode is locked until your account verification is approved.'),
    funding: t('gate.funding_body', 'Deposits and withdrawals are available for verified real accounts only.'),
    trading: t('gate.trading_body', 'Live trading is available for verified real accounts only.'),
    earn: t('gate.earn_body', 'Copy trading, contracts, and levels require a verified real account.'),
  };
  showKycGateDialog({ body: copy[reason] || copy.mode });
  return false;
}
