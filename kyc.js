// KYC View
import { get } from '../state/store.js';
import { esc } from '../utils/format.js';
import { $ } from '../utils/dom.js';
import { api, formApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';

export function render() {
  return `
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div>
          <span class="badge-accent">Security</span>
          <h1 class="text-xl font-bold mt-1">KYC Verification</h1>
          <p class="text-muted text-sm">Submit identity documents for compliance review. Required for real trading.</p>
        </div>
      </section>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section class="card" id="kyc-status-card">
          <h2 class="font-semibold mb-3">Verification Status</h2>
          <div id="kyc-status"><div class="skeleton h-24 rounded-lg"></div></div>
        </section>
        <section class="card">
          <h2 class="font-semibold mb-3">Submit Documents</h2>
          <form class="space-y-4" id="kyc-form">
            <label class="block"><span class="text-xs text-muted">Full Name</span><input type="text" name="full_name" class="input mt-1" required /></label>
            <label class="block"><span class="text-xs text-muted">Country</span><input type="text" name="country" class="input mt-1" required /></label>
            <label class="block"><span class="text-xs text-muted">Document Type</span>
              <select name="doc_type" class="input mt-1"><option value="passport">Passport</option><option value="id_card">ID Card</option><option value="driving_license">Driving License</option></select>
            </label>
            <label class="block"><span class="text-xs text-muted">Document Number</span><input type="text" name="doc_number" class="input mt-1" required /></label>
            <label class="block"><span class="text-xs text-muted">Document Photo</span><input type="file" name="doc_file" accept="image/*,.pdf" class="input mt-1 py-1.5" required /></label>
            <button type="submit" class="btn-primary w-full">Submit KYC</button>
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

async function loadKycStatus(container) {
  try {
    const data = await api('/kyc/status.php', { timeout: 6000 });
    const el = container.querySelector('#kyc-status');
    if (!el) return;
    const kyc = data?.kyc || data;
    if (!kyc || !kyc.status) { el.innerHTML = `<p class="text-muted text-sm">No KYC submission yet. Submit your documents to get verified.</p>`; return; }
    const statusColor = kyc.status === 'approved' ? 'text-green' : kyc.status === 'pending' ? 'text-gold' : 'text-red';
    el.innerHTML = `
      <div class="p-4 rounded-lg bg-panel-2/60 border border-line/50 space-y-2">
        <div class="flex justify-between"><span class="text-muted text-xs">Status</span><span class="font-bold ${statusColor} uppercase">${esc(kyc.status)}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">Name</span><span class="text-sm">${esc(kyc.full_name || '--')}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">Country</span><span class="text-sm">${esc(kyc.country || '--')}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">Document</span><span class="text-sm">${esc(kyc.doc_type || '--')}</span></div>
        ${kyc.admin_note ? `<div class="pt-2 border-t border-line/50"><span class="text-muted text-xs">Review Note</span><p class="text-sm mt-1">${esc(kyc.admin_note)}</p></div>` : ''}
      </div>`;
  } catch (e) { /* silent */ }
}

async function submitKyc(e, container) {
  e.preventDefault();
  const status = container.querySelector('#kyc-form-status');
  try {
    if (status) status.textContent = 'Submitting...';
    const fd = new FormData(e.target);
    const res = await formApi('/kyc/submit.php', fd, { timeout: 15000 });
    if (res && res.ok !== false) {
      if (status) { status.textContent = 'KYC submitted!'; status.className = 'text-xs text-center text-green'; }
      loadKycStatus(container);
    } else {
      if (status) { status.textContent = res?.error || 'Failed'; status.className = 'text-xs text-center text-red'; }
    }
  } catch (err) {
    if (status) { status.textContent = err.message; status.className = 'text-xs text-center text-red'; }
  }
}
