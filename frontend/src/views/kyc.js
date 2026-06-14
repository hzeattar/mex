// KYC View
import { get } from '../state/store.js';
import { esc, escAttr } from '../utils/format.js';
import { api, formApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';
import { t } from '../utils/i18n.js';

export function render() {
  const user = get('user') || {};
  const fullName = user.display_name || user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
  const country = user.country_name || user.country_code || '';
  const phone = user.phone_e164 || [user.phone_dial_code, user.phone_number].filter(Boolean).join(' ');
  const birthDate = user.birth_date || '';

  return `
    <div class="space-y-6 animate-fade-in kyc-page">
      <section class="card">
        <div>
          <span class="badge-accent">${t('kyc.security', 'Security')}</span>
          <h1 class="text-xl font-bold mt-1">${t('kyc.verification', 'KYC Verification')}</h1>
          <p class="text-muted text-sm">${t('kyc.subtitle', 'Submit identity documents for compliance review. Required for real trading.')}</p>
        </div>
      </section>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section class="card" id="kyc-status-card">
          <h2 class="font-semibold mb-3">${t('kyc.verification_status', 'Verification Status')}</h2>
          <div id="kyc-status"><div class="skeleton h-24 rounded-lg"></div></div>
        </section>
        <section class="card">
          <h2 class="font-semibold mb-3">${t('kyc.submit_documents', 'Submit Documents')}</h2>
          <form class="space-y-4" id="kyc-form">
            <div class="kyc-prefill-grid">
              <label class="block"><span class="text-xs text-muted">${t('kyc.full_name', 'Full Name')}</span><input type="text" name="full_name" class="input mt-1" value="${escAttr(fullName)}" required /></label>
              <label class="block"><span class="text-xs text-muted">${t('kyc.country', 'Country')}</span><input type="text" name="country" class="input mt-1" value="${escAttr(country)}" required /></label>
              <label class="block"><span class="text-xs text-muted">${t('kyc.phone', 'Phone')}</span><input type="text" name="phone_e164" class="input mt-1" value="${escAttr(phone)}" readonly /></label>
              <label class="block"><span class="text-xs text-muted">${t('kyc.birth_date', 'Birth date')}</span><input type="text" name="birth_date" class="input mt-1" value="${escAttr(birthDate)}" readonly /></label>
            </div>
            <label class="block"><span class="text-xs text-muted">${t('kyc.document_type', 'Document Type')}</span>
              <select name="doc_type" class="input mt-1" required><option value="passport">${t('kyc.passport', 'Passport')}</option><option value="id_card">${t('kyc.id_card', 'ID Card')}</option><option value="driving_license">${t('kyc.driving_license', 'Driving License')}</option></select>
            </label>
            <label class="block"><span class="text-xs text-muted">${t('kyc.document_number', 'Document Number')}</span><input type="text" name="doc_number" class="input mt-1" required /></label>
            <div class="kyc-file-grid">
              ${fileField('front', t('kyc.front_document', 'Front document'), true, 'image/*,.pdf')}
              ${fileField('back', t('kyc.back_document', 'Back document'), false, 'image/*,.pdf')}
              ${fileField('selfie', t('kyc.selfie', 'Selfie'), true, 'image/*')}
              ${fileField('contract', t('kyc.signed_contract', 'Signed contract'), true, 'image/*,.pdf')}
              ${fileField('extra_files[]', t('kyc.extra_files', 'Extra files'), false, 'image/*,.pdf', true)}
            </div>
            <p class="kyc-contract-note">${icons.info || icons.kyc || ''}<span>${t('kyc.contract_note', 'To receive your contract copy, contact your account manager.')}</span></p>
            <div class="kyc-submit-actions">
              <button type="submit" class="btn-primary w-full">${t('kyc.submit', 'Submit KYC')}</button>
            </div>
            <p class="text-xs text-center" id="kyc-form-status"></p>
          </form>
        </section>
      </div>
    </div>`;
}

export function mount(container) {
  loadKycStatus(container);
  container.querySelector('#kyc-form')?.addEventListener('submit', (e) => submitKyc(e, container));
}

function fileField(name, label, required, accept, multiple = false) {
  return `<label class="kyc-file-field">
    <span>${esc(label)}${required ? ' *' : ''}</span>
    <input type="file" name="${escAttr(name)}" accept="${escAttr(accept)}" ${required ? 'required' : ''} ${multiple ? 'multiple' : ''} />
    <small>${multiple ? t('kyc.multiple_files_hint', 'You can upload multiple files.') : t('kyc.file_hint', 'Image or PDF up to 8MB.')}</small>
  </label>`;
}

async function loadKycStatus(container) {
  try {
    const data = await api('/kyc/status.php', { timeout: 6000 });
    const el = container.querySelector('#kyc-status');
    if (!el) return;
    const kyc = data?.kyc || data;
    if (!kyc || !kyc.status) { el.innerHTML = `<p class="text-muted text-sm">${t('kyc.no_submission', 'No KYC submission yet. Submit your documents to get verified.')}</p>`; return; }
    const statusColor = kyc.status === 'approved' ? 'text-green' : kyc.status === 'pending' ? 'text-gold' : 'text-red';
    el.innerHTML = `
      <div class="p-4 rounded-lg bg-panel-2/60 border border-line/50 space-y-2">
        <div class="flex justify-between"><span class="text-muted text-xs">${t('kyc.status', 'Status')}</span><span class="font-bold ${statusColor} uppercase">${esc(kyc.status)}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t('kyc.name', 'Name')}</span><span class="text-sm">${esc(kyc.full_name || '--')}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t('kyc.country', 'Country')}</span><span class="text-sm">${esc(kyc.country || '--')}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t('kyc.phone', 'Phone')}</span><span class="text-sm">${esc(kyc.phone_e164 || '--')}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t('kyc.birth_date', 'Birth date')}</span><span class="text-sm">${esc(kyc.birth_date || '--')}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t('kyc.document', 'Document')}</span><span class="text-sm">${esc(kyc.doc_type || '--')}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t('kyc.contract', 'Contract')}</span><span class="text-sm">${kyc.contract_path ? esc(t('common.uploaded', 'Uploaded')) : '--'}</span></div>
        ${kyc.admin_note ? `<div class="pt-2 border-t border-line/50"><span class="text-muted text-xs">${t('kyc.review_note', 'Review Note')}</span><p class="text-sm mt-1">${esc(kyc.admin_note)}</p></div>` : ''}
      </div>`;
  } catch (e) { /* silent */ }
}

async function submitKyc(e, container) {
  e.preventDefault();
  const status = container.querySelector('#kyc-form-status');
  try {
    if (status) { status.textContent = t('kyc.submitting', 'Submitting...'); status.className = 'text-xs text-center text-muted'; }
    const fd = new FormData(e.target);
    const res = await formApi('/kyc/submit.php', fd, { timeout: 30000 });
    if (res && res.ok !== false) {
      if (status) { status.textContent = t('kyc.submitted', 'KYC submitted!'); status.className = 'text-xs text-center text-green'; }
      loadKycStatus(container);
    } else {
      if (status) { status.textContent = res?.error || t('common.error', 'Failed'); status.className = 'text-xs text-center text-red'; }
    }
  } catch (err) {
    if (status) { status.textContent = err.message || t('kyc.submit_failed', 'Could not submit KYC right now.'); status.className = 'text-xs text-center text-red'; }
  }
}
