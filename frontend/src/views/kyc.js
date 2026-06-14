// KYC View
import { get } from '../state/store.js';
import { esc, escAttr } from '../utils/format.js';
import { api, formApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';
import { t } from '../utils/i18n.js';

// [dialCode, countryCode, countryName]
const DIAL_CODES = [
  ['+1','US','United States'],['+1','CA','Canada'],['+7','RU','Russia'],['+20','EG','Egypt'],
  ['+27','ZA','South Africa'],['+30','GR','Greece'],['+31','NL','Netherlands'],['+32','BE','Belgium'],
  ['+33','FR','France'],['+34','ES','Spain'],['+36','HU','Hungary'],['+39','IT','Italy'],
  ['+40','RO','Romania'],['+41','CH','Switzerland'],['+43','AT','Austria'],['+44','GB','United Kingdom'],
  ['+45','DK','Denmark'],['+46','SE','Sweden'],['+47','NO','Norway'],['+48','PL','Poland'],
  ['+49','DE','Germany'],['+51','PE','Peru'],['+52','MX','Mexico'],['+54','AR','Argentina'],
  ['+55','BR','Brazil'],['+56','CL','Chile'],['+57','CO','Colombia'],['+58','VE','Venezuela'],
  ['+60','MY','Malaysia'],['+61','AU','Australia'],['+62','ID','Indonesia'],['+63','PH','Philippines'],
  ['+64','NZ','New Zealand'],['+65','SG','Singapore'],['+66','TH','Thailand'],['+81','JP','Japan'],
  ['+82','KR','South Korea'],['+84','VN','Vietnam'],['+86','CN','China'],['+90','TR','Turkey'],
  ['+91','IN','India'],['+92','PK','Pakistan'],['+94','LK','Sri Lanka'],['+98','IR','Iran'],
  ['+212','MA','Morocco'],['+213','DZ','Algeria'],['+216','TN','Tunisia'],['+218','LY','Libya'],
  ['+220','GM','Gambia'],['+221','SN','Senegal'],['+223','ML','Mali'],['+224','GN','Guinea'],
  ['+225','CI','Ivory Coast'],['+233','GH','Ghana'],['+234','NG','Nigeria'],['+237','CM','Cameroon'],
  ['+249','SD','Sudan'],['+250','RW','Rwanda'],['+251','ET','Ethiopia'],['+254','KE','Kenya'],
  ['+255','TZ','Tanzania'],['+256','UG','Uganda'],['+260','ZM','Zambia'],['+263','ZW','Zimbabwe'],
  ['+350','GI','Gibraltar'],['+351','PT','Portugal'],['+352','LU','Luxembourg'],['+353','IE','Ireland'],
  ['+354','IS','Iceland'],['+355','AL','Albania'],['+356','MT','Malta'],['+357','CY','Cyprus'],
  ['+358','FI','Finland'],['+359','BG','Bulgaria'],['+370','LT','Lithuania'],['+371','LV','Latvia'],
  ['+372','EE','Estonia'],['+373','MD','Moldova'],['+374','AM','Armenia'],['+375','BY','Belarus'],
  ['+380','UA','Ukraine'],['+381','RS','Serbia'],['+385','HR','Croatia'],['+386','SI','Slovenia'],
  ['+387','BA','Bosnia and Herzegovina'],['+420','CZ','Czech Republic'],['+421','SK','Slovakia'],
  ['+501','BZ','Belize'],['+502','GT','Guatemala'],['+503','SV','El Salvador'],['+504','HN','Honduras'],
  ['+505','NI','Nicaragua'],['+506','CR','Costa Rica'],['+507','PA','Panama'],['+509','HT','Haiti'],
  ['+591','BO','Bolivia'],['+592','GY','Guyana'],['+593','EC','Ecuador'],['+595','PY','Paraguay'],
  ['+597','SR','Suriname'],['+598','UY','Uruguay'],['+60','MY','Malaysia'],['+670','TL','Timor-Leste'],
  ['+673','BN','Brunei'],['+675','PG','Papua New Guinea'],['+676','TO','Tonga'],['+679','FJ','Fiji'],
  ['+850','KP','North Korea'],['+852','HK','Hong Kong'],['+853','MO','Macau'],['+855','KH','Cambodia'],
  ['+856','LA','Laos'],['+880','BD','Bangladesh'],['+886','TW','Taiwan'],['+960','MV','Maldives'],
  ['+961','LB','Lebanon'],['+962','JO','Jordan'],['+963','SY','Syria'],['+964','IQ','Iraq'],
  ['+965','KW','Kuwait'],['+966','SA','Saudi Arabia'],['+967','YE','Yemen'],['+968','OM','Oman'],
  ['+970','PS','Palestine'],['+971','AE','United Arab Emirates'],['+972','IL','Israel'],
  ['+973','BH','Bahrain'],['+974','QA','Qatar'],['+975','BT','Bhutan'],['+976','MN','Mongolia'],
  ['+977','NP','Nepal'],['+992','TJ','Tajikistan'],['+993','TM','Turkmenistan'],
  ['+994','AZ','Azerbaijan'],['+995','GE','Georgia'],['+996','KG','Kyrgyzstan'],['+998','UZ','Uzbekistan'],
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function dialOptions(selected) {
  return DIAL_CODES.map(([code, , name]) =>
    `<option value="${escAttr(code)}" ${selected === code ? 'selected' : ''}>${escAttr(name)} (${escAttr(code)})</option>`
  ).join('');
}

function dayOptions(selected) {
  return `<option value="">${t('kyc.day','Day')}</option>` +
    Array.from({length:31},(_,i)=>{const v=String(i+1).padStart(2,'0');return `<option value="${v}" ${selected===v?'selected':''}>${i+1}</option>`;}).join('');
}

function monthOptions(selected) {
  return `<option value="">${t('kyc.month','Month')}</option>` +
    MONTHS.map((m,i)=>{const v=String(i+1).padStart(2,'0');return `<option value="${v}" ${selected===v?'selected':''}>${m}</option>`;}).join('');
}

function yearOptions(selected) {
  return `<option value="">${t('kyc.year','Year')}</option>` +
    Array.from({length:106},(_,i)=>{const y=2010-i;return `<option value="${y}" ${selected===String(y)?'selected':''}>${y}</option>`;}).join('');
}

export function render() {
  const user = get('user') || {};
  const fullName = user.display_name || user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
  const country = user.country_name || user.country_code || '';

  // Parse phone
  const rawPhone = user.phone_e164 || '';
  let dialCode = user.phone_dial_code || '';
  let phoneNum = user.phone_number || '';
  if (!dialCode && rawPhone.startsWith('+')) {
    // Match longest dial code first
    const sorted = [...DIAL_CODES].sort((a,b) => b[0].length - a[0].length);
    const match = sorted.find(([code]) => rawPhone.startsWith(code));
    if (match) { dialCode = match[0]; phoneNum = rawPhone.slice(match[0].length); }
    else phoneNum = rawPhone;
  }

  // Parse birth date
  const birthDate = user.birth_date || '';
  const [birthYear='', birthMonth='', birthDay=''] = birthDate ? birthDate.split('-') : [];

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
            </div>

            <!-- Phone with dial code search -->
            <label class="block">
              <span class="text-xs text-muted">${t('kyc.phone', 'Phone')}</span>
              <div class="kyc-phone-row mt-1">
                <div class="kyc-dial-wrap">
                  <input type="text" class="input kyc-dial-search" placeholder="${escAttr(t('kyc.search_country','Search country...'))}" data-dial-search autocomplete="off" />
                  <select name="phone_dial_code" class="input kyc-dial-select" data-dial-select>
                    ${dialOptions(dialCode)}
                  </select>
                </div>
                <input type="tel" name="phone_number" class="input kyc-phone-number" value="${escAttr(phoneNum)}" placeholder="${escAttr(t('kyc.phone_number','Phone number'))}" />
              </div>
            </label>

            <!-- Birth date with 3 selects -->
            <label class="block">
              <span class="text-xs text-muted">${t('kyc.birth_date', 'Birth date')}</span>
              <div class="kyc-birth-row mt-1">
                <select name="birth_day" class="input">${dayOptions(birthDay)}</select>
                <select name="birth_month" class="input">${monthOptions(birthMonth)}</select>
                <select name="birth_year" class="input">${yearOptions(birthYear)}</select>
              </div>
            </label>

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

  // Dial code search: filter <select> options as user types
  const dialSearch = container.querySelector('[data-dial-search]');
  const dialSelect = container.querySelector('[data-dial-select]');
  if (dialSearch && dialSelect) {
    dialSearch.addEventListener('input', () => {
      const q = dialSearch.value.trim().toLowerCase();
      let firstVisible = null;
      Array.from(dialSelect.options).forEach(opt => {
        const match = !q || opt.text.toLowerCase().includes(q) || opt.value.includes(q);
        opt.hidden = !match;
        if (match && !firstVisible) firstVisible = opt.value;
      });
      if (firstVisible && !dialSelect.options[dialSelect.selectedIndex]?.hidden === false) {
        dialSelect.value = firstVisible;
      }
    });
  }
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
  } catch (e) {
    const el = container.querySelector('#kyc-status');
    if (el) el.innerHTML = `<p class="text-sm text-red">${t('kyc.status_error', 'Could not load KYC status.')}</p>`;
  }
}

async function submitKyc(e, container) {
  e.preventDefault();
  const form = e.target;
  const status = container.querySelector('#kyc-form-status');

  // Combine phone parts
  const dialCode = (form.phone_dial_code?.value || '').trim();
  const phoneNum = (form.phone_number?.value || '').trim().replace(/^0+/, '');
  const phone_e164 = dialCode && phoneNum ? `${dialCode}${phoneNum}` : (phoneNum || '');

  // Combine birth date parts
  const bd = form.birth_day?.value || '';
  const bm = form.birth_month?.value || '';
  const by = form.birth_year?.value || '';
  const birth_date = bd && bm && by ? `${by}-${bm}-${bd}` : '';

  try {
    if (status) { status.textContent = t('kyc.submitting', 'Submitting...'); status.className = 'text-xs text-center text-muted'; }
    const fd = new FormData(form);
    // Replace individual phone/birth fields with combined values
    fd.delete('phone_dial_code');
    fd.delete('phone_number');
    fd.delete('birth_day');
    fd.delete('birth_month');
    fd.delete('birth_year');
    if (phone_e164) fd.set('phone_e164', phone_e164);
    if (birth_date) fd.set('birth_date', birth_date);

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
