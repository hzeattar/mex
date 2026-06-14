// KYC View
import { get } from '../state/store.js';
import { esc } from '../utils/format.js';
import { $ } from '../utils/dom.js';
import { api, formApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';

const DIAL_CODES = [
  ['AE','+971','UAE'],['SA','+966','Saudi Arabia'],['EG','+20','Egypt'],['KW','+965','Kuwait'],
  ['QA','+974','Qatar'],['BH','+973','Bahrain'],['OM','+968','Oman'],['JO','+962','Jordan'],
  ['LB','+961','Lebanon'],['IQ','+964','Iraq'],['SY','+963','Syria'],['MA','+212','Morocco'],
  ['TN','+216','Tunisia'],['DZ','+213','Algeria'],['LY','+218','Libya'],['YE','+967','Yemen'],
  ['US','+1','USA'],['GB','+44','UK'],['DE','+49','Germany'],['FR','+33','France'],
  ['IN','+91','India'],['PK','+92','Pakistan'],['TR','+90','Turkey'],['NG','+234','Nigeria'],
  ['ZA','+27','South Africa'],['RU','+7','Russia'],['CN','+86','China'],['OTHER','','Other'],
];

const NOW_YEAR = new Date().getFullYear();

export function render() {
  const dialOptions = DIAL_CODES.map(([code,dial,name]) =>
    `<option value="${esc(dial)}">${esc(dial ? dial + ' ' : '')}${esc(name)}</option>`
  ).join('');

  const days   = Array.from({length:31},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
  const months = [
    [1,'January'],[2,'February'],[3,'March'],[4,'April'],[5,'May'],[6,'June'],
    [7,'July'],[8,'August'],[9,'September'],[10,'October'],[11,'November'],[12,'December']
  ].map(([n,m])=>`<option value="${n}">${m}</option>`).join('');
  const years  = Array.from({length:80},(_,i)=> NOW_YEAR - 18 - i)
    .map(y=>`<option value="${y}">${y}</option>`).join('');

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

            <label class="block">
              <span class="text-xs text-muted">Full Name</span>
              <input type="text" name="full_name" class="input mt-1" autocomplete="name" required />
            </label>

            <label class="block">
              <span class="text-xs text-muted">Country</span>
              <input type="text" name="country" class="input mt-1" autocomplete="country-name" required />
            </label>

            <div class="block">
              <span class="text-xs text-muted block mb-1">Phone Number</span>
              <div class="flex gap-2">
                <select id="kyc-dial" class="input w-32 shrink-0">
                  ${dialOptions}
                </select>
                <input type="text" id="kyc-phone-num" inputmode="tel" class="input flex-1"
                  placeholder="50 123 4567" autocomplete="tel-national" />
              </div>
            </div>

            <div class="block">
              <span class="text-xs text-muted block mb-1">Date of Birth</span>
              <div class="flex gap-2">
                <select id="kyc-bday" class="input flex-1" aria-label="Day">
                  <option value="">Day</option>${days}
                </select>
                <select id="kyc-bmonth" class="input flex-1" aria-label="Month">
                  <option value="">Month</option>${months}
                </select>
                <select id="kyc-byear" class="input flex-1" aria-label="Year">
                  <option value="">Year</option>${years}
                </select>
              </div>
            </div>

            <label class="block">
              <span class="text-xs text-muted">Document Type</span>
              <select name="doc_type" class="input mt-1">
                <option value="passport">Passport</option>
                <option value="id_card">National ID</option>
                <option value="driving_license">Driving License</option>
              </select>
            </label>

            <label class="block">
              <span class="text-xs text-muted">Document Number</span>
              <input type="text" name="doc_number" class="input mt-1" inputmode="text" required />
            </label>

            <label class="block">
              <span class="text-xs text-muted">Front Document Photo</span>
              <input type="file" name="doc_file" id="kyc-front"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                class="input mt-1 py-1.5" required />
            </label>

            <label class="block">
              <span class="text-xs text-muted">Selfie with Document</span>
              <input type="file" name="selfie" id="kyc-selfie"
                accept="image/jpeg,image/png,image/webp"
                class="input mt-1 py-1.5" required />
            </label>

            <label class="block">
              <span class="text-xs text-muted">Signed Contract / Agreement</span>
              <input type="file" name="contract" id="kyc-contract"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                class="input mt-1 py-1.5" required />
            </label>

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

  // Client-side file size validation (10 MB limit per file)
  ['kyc-front','kyc-selfie','kyc-contract'].forEach(id => {
    container.querySelector(`#${id}`)?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file && file.size > 10 * 1024 * 1024) {
        e.target.value = '';
        const st = container.querySelector('#kyc-form-status');
        if (st) { st.textContent = 'File too large (max 10 MB)'; st.className = 'text-xs text-center text-red'; }
      }
    });
  });
}

async function loadKycStatus(container) {
  const el = container.querySelector('#kyc-status');
  try {
    const data = await api('/kyc/status.php', { timeout: 6000 });
    if (!el) return;
    const kyc = data?.kyc || data;
    if (!kyc || !kyc.status) {
      el.innerHTML = `<p class="text-muted text-sm">No KYC submission yet. Submit your documents to get verified.</p>`;
      return;
    }
    const statusColor = kyc.status === 'approved' ? 'text-green' : kyc.status === 'pending' ? 'text-gold' : 'text-red';
    el.innerHTML = `
      <div class="p-4 rounded-lg bg-panel-2/60 border border-line/50 space-y-2">
        <div class="flex justify-between"><span class="text-muted text-xs">Status</span><span class="font-bold ${statusColor} uppercase">${esc(kyc.status)}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">Name</span><span class="text-sm">${esc(kyc.full_name || '--')}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">Country</span><span class="text-sm">${esc(kyc.country || '--')}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">Document</span><span class="text-sm">${esc(kyc.doc_type || '--')}</span></div>
        ${kyc.admin_note ? `<div class="pt-2 border-t border-line/50"><span class="text-muted text-xs">Review Note</span><p class="text-sm mt-1">${esc(kyc.admin_note)}</p></div>` : ''}
      </div>`;
  } catch (e) {
    if (el) el.innerHTML = `<p class="text-red text-sm">Could not load KYC status. Please refresh.</p>`;
  }
}

async function submitKyc(e, container) {
  e.preventDefault();
  const status = container.querySelector('#kyc-form-status');
  try {
    if (status) { status.textContent = 'Submitting...'; status.className = 'text-xs text-center text-muted'; }

    const fd = new FormData(e.target);

    // Build phone_e164 from dial code + number
    const dial    = container.querySelector('#kyc-dial')?.value || '';
    const phoneNum = container.querySelector('#kyc-phone-num')?.value?.trim().replace(/\s+/g,'') || '';
    if (dial && phoneNum) {
      fd.append('phone_e164', dial + phoneNum);
    }

    // Build birth_date as YYYY-MM-DD
    const bday   = container.querySelector('#kyc-bday')?.value;
    const bmonth = container.querySelector('#kyc-bmonth')?.value;
    const byear  = container.querySelector('#kyc-byear')?.value;
    if (bday && bmonth && byear) {
      const mm = String(bmonth).padStart(2,'0');
      const dd = String(bday).padStart(2,'0');
      fd.append('birth_date', `${byear}-${mm}-${dd}`);
    }

    const res = await formApi('/kyc/submit.php', fd, { timeout: 30000 });
    if (res && res.ok !== false) {
      if (status) { status.textContent = 'KYC submitted successfully!'; status.className = 'text-xs text-center text-green'; }
      loadKycStatus(container);
    } else {
      if (status) { status.textContent = res?.error || 'Submission failed'; status.className = 'text-xs text-center text-red'; }
    }
  } catch (err) {
    if (status) { status.textContent = err.message; status.className = 'text-xs text-center text-red'; }
  }
}
