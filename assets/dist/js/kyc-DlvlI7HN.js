import{j as $,k as f,v as t,h as l,c as _,g as r,i as g}from"./main-CYQDWk0e.js";const x=[["+1","US","United States"],["+1","CA","Canada"],["+7","RU","Russia"],["+20","EG","Egypt"],["+27","ZA","South Africa"],["+30","GR","Greece"],["+31","NL","Netherlands"],["+32","BE","Belgium"],["+33","FR","France"],["+34","ES","Spain"],["+36","HU","Hungary"],["+39","IT","Italy"],["+40","RO","Romania"],["+41","CH","Switzerland"],["+43","AT","Austria"],["+44","GB","United Kingdom"],["+45","DK","Denmark"],["+46","SE","Sweden"],["+47","NO","Norway"],["+48","PL","Poland"],["+49","DE","Germany"],["+51","PE","Peru"],["+52","MX","Mexico"],["+54","AR","Argentina"],["+55","BR","Brazil"],["+56","CL","Chile"],["+57","CO","Colombia"],["+58","VE","Venezuela"],["+60","MY","Malaysia"],["+61","AU","Australia"],["+62","ID","Indonesia"],["+63","PH","Philippines"],["+64","NZ","New Zealand"],["+65","SG","Singapore"],["+66","TH","Thailand"],["+81","JP","Japan"],["+82","KR","South Korea"],["+84","VN","Vietnam"],["+86","CN","China"],["+90","TR","Turkey"],["+91","IN","India"],["+92","PK","Pakistan"],["+94","LK","Sri Lanka"],["+98","IR","Iran"],["+212","MA","Morocco"],["+213","DZ","Algeria"],["+216","TN","Tunisia"],["+218","LY","Libya"],["+220","GM","Gambia"],["+221","SN","Senegal"],["+223","ML","Mali"],["+224","GN","Guinea"],["+225","CI","Ivory Coast"],["+233","GH","Ghana"],["+234","NG","Nigeria"],["+237","CM","Cameroon"],["+249","SD","Sudan"],["+250","RW","Rwanda"],["+251","ET","Ethiopia"],["+254","KE","Kenya"],["+255","TZ","Tanzania"],["+256","UG","Uganda"],["+260","ZM","Zambia"],["+263","ZW","Zimbabwe"],["+350","GI","Gibraltar"],["+351","PT","Portugal"],["+352","LU","Luxembourg"],["+353","IE","Ireland"],["+354","IS","Iceland"],["+355","AL","Albania"],["+356","MT","Malta"],["+357","CY","Cyprus"],["+358","FI","Finland"],["+359","BG","Bulgaria"],["+370","LT","Lithuania"],["+371","LV","Latvia"],["+372","EE","Estonia"],["+373","MD","Moldova"],["+374","AM","Armenia"],["+375","BY","Belarus"],["+380","UA","Ukraine"],["+381","RS","Serbia"],["+385","HR","Croatia"],["+386","SI","Slovenia"],["+387","BA","Bosnia and Herzegovina"],["+420","CZ","Czech Republic"],["+421","SK","Slovakia"],["+501","BZ","Belize"],["+502","GT","Guatemala"],["+503","SV","El Salvador"],["+504","HN","Honduras"],["+505","NI","Nicaragua"],["+506","CR","Costa Rica"],["+507","PA","Panama"],["+509","HT","Haiti"],["+591","BO","Bolivia"],["+592","GY","Guyana"],["+593","EC","Ecuador"],["+595","PY","Paraguay"],["+597","SR","Suriname"],["+598","UY","Uruguay"],["+60","MY","Malaysia"],["+670","TL","Timor-Leste"],["+673","BN","Brunei"],["+675","PG","Papua New Guinea"],["+676","TO","Tonga"],["+679","FJ","Fiji"],["+850","KP","North Korea"],["+852","HK","Hong Kong"],["+853","MO","Macau"],["+855","KH","Cambodia"],["+856","LA","Laos"],["+880","BD","Bangladesh"],["+886","TW","Taiwan"],["+960","MV","Maldives"],["+961","LB","Lebanon"],["+962","JO","Jordan"],["+963","SY","Syria"],["+964","IQ","Iraq"],["+965","KW","Kuwait"],["+966","SA","Saudi Arabia"],["+967","YE","Yemen"],["+968","OM","Oman"],["+970","PS","Palestine"],["+971","AE","United Arab Emirates"],["+972","IL","Israel"],["+973","BH","Bahrain"],["+974","QA","Qatar"],["+975","BT","Bhutan"],["+976","MN","Mongolia"],["+977","NP","Nepal"],["+992","TJ","Tajikistan"],["+993","TM","Turkmenistan"],["+994","AZ","Azerbaijan"],["+995","GE","Georgia"],["+996","KG","Kyrgyzstan"],["+998","UZ","Uzbekistan"]],S=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function C(s){return x.map(([n,,a])=>`<option value="${l(n)}" ${s===n?"selected":""}>${l(a)} (${l(n)})</option>`).join("")}function N(s){return`<option value="">${t("kyc.day","Day")}</option>`+Array.from({length:31},(n,a)=>{const e=String(a+1).padStart(2,"0");return`<option value="${e}" ${s===e?"selected":""}>${a+1}</option>`}).join("")}function M(s){return`<option value="">${t("kyc.month","Month")}</option>`+S.map((n,a)=>{const e=String(a+1).padStart(2,"0");return`<option value="${e}" ${s===e?"selected":""}>${n}</option>`}).join("")}function A(s){return`<option value="">${t("kyc.year","Year")}</option>`+Array.from({length:106},(n,a)=>{const e=2010-a;return`<option value="${e}" ${s===String(e)?"selected":""}>${e}</option>`}).join("")}function L(){const s=$("user")||{},n=s.display_name||s.name||`${s.first_name||""} ${s.last_name||""}`.trim(),a=s.country_name||s.country_code||"",e=s.phone_e164||"";let i=s.phone_dial_code||"",o=s.phone_number||"";if(!i&&e.startsWith("+")){const c=[...x].sort((d,k)=>k[0].length-d[0].length).find(([d])=>e.startsWith(d));c?(i=c[0],o=e.slice(c[0].length)):o=e}const u=s.birth_date||"",[m="",y="",b=""]=u?u.split("-"):[];return`
    <div class="space-y-6 animate-fade-in kyc-page">
      <section class="card">
        <div>
          <span class="badge-accent">${t("kyc.security","Security")}</span>
          <h1 class="text-xl font-bold mt-1">${t("kyc.verification","KYC Verification")}</h1>
          <p class="text-muted text-sm">${t("kyc.subtitle","Submit identity documents for compliance review. Required for real trading.")}</p>
        </div>
      </section>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section class="card" id="kyc-status-card">
          <h2 class="font-semibold mb-3">${t("kyc.verification_status","Verification Status")}</h2>
          <div id="kyc-status"><div class="skeleton h-24 rounded-lg"></div></div>
        </section>
        <section class="card">
          <h2 class="font-semibold mb-3">${t("kyc.submit_documents","Submit Documents")}</h2>
          <form class="space-y-4" id="kyc-form">
            <div class="kyc-prefill-grid">
              <label class="block"><span class="text-xs text-muted">${t("kyc.full_name","Full Name")}</span><input type="text" name="full_name" class="input mt-1" value="${l(n)}" required /></label>
              <label class="block"><span class="text-xs text-muted">${t("kyc.country","Country")}</span><input type="text" name="country" class="input mt-1" value="${l(a)}" required /></label>
            </div>

            <!-- Phone with dial code search -->
            <label class="block">
              <span class="text-xs text-muted">${t("kyc.phone","Phone")}</span>
              <div class="kyc-phone-row mt-1">
                <div class="kyc-dial-wrap">
                  <input type="text" class="input kyc-dial-search" placeholder="${l(t("kyc.search_country","Search country..."))}" data-dial-search autocomplete="off" />
                  <select name="phone_dial_code" class="input kyc-dial-select" data-dial-select>
                    ${C(i)}
                  </select>
                </div>
                <input type="tel" name="phone_number" class="input kyc-phone-number" value="${l(o)}" placeholder="${l(t("kyc.phone_number","Phone number"))}" />
              </div>
            </label>

            <!-- Birth date with 3 selects -->
            <label class="block">
              <span class="text-xs text-muted">${t("kyc.birth_date","Birth date")}</span>
              <div class="kyc-birth-row mt-1">
                <select name="birth_day" class="input">${N(b)}</select>
                <select name="birth_month" class="input">${M(y)}</select>
                <select name="birth_year" class="input">${A(m)}</select>
              </div>
            </label>

            <label class="block"><span class="text-xs text-muted">${t("kyc.document_type","Document Type")}</span>
              <select name="doc_type" class="input mt-1" required><option value="passport">${t("kyc.passport","Passport")}</option><option value="id_card">${t("kyc.id_card","ID Card")}</option><option value="driving_license">${t("kyc.driving_license","Driving License")}</option></select>
            </label>
            <label class="block"><span class="text-xs text-muted">${t("kyc.document_number","Document Number")}</span><input type="text" name="doc_number" class="input mt-1" required /></label>
            <div class="kyc-file-grid">
              ${p("front",t("kyc.front_document","Front document"),!0,"image/*,.pdf")}
              ${p("back",t("kyc.back_document","Back document"),!1,"image/*,.pdf")}
              ${p("selfie",t("kyc.selfie","Selfie"),!0,"image/*")}
              ${p("contract",t("kyc.signed_contract","Signed contract"),!0,"image/*,.pdf")}
              ${p("extra_files[]",t("kyc.extra_files","Extra files"),!1,"image/*,.pdf",!0)}
            </div>
            <p class="kyc-contract-note">${f.info||f.kyc}<span>${t("kyc.contract_note","To receive your contract copy, contact your account manager.")}</span></p>
            <div class="kyc-submit-actions">
              <button type="submit" class="btn-primary w-full">${t("kyc.submit","Submit KYC")}</button>
            </div>
            <p class="text-xs text-center" id="kyc-form-status"></p>
          </form>
        </section>
      </div>
    </div>`}function B(s){v(s),s.querySelector("#kyc-form")?.addEventListener("submit",e=>T(e,s));const n=s.querySelector("[data-dial-search]"),a=s.querySelector("[data-dial-select]");n&&a&&n.addEventListener("input",()=>{const e=n.value.trim().toLowerCase();let i=null;Array.from(a.options).forEach(o=>{const u=!e||o.text.toLowerCase().includes(e)||o.value.includes(e);o.hidden=!u,u&&!i&&(i=o.value)}),i&&a.options[a.selectedIndex]?.hidden&&(a.value=i)})}function p(s,n,a,e,i=!1){return`<label class="kyc-file-field">
    <span>${r(n)}${a?" *":""}</span>
    <input type="file" name="${l(s)}" accept="${l(e)}" ${a?"required":""} ${i?"multiple":""} />
    <small>${i?t("kyc.multiple_files_hint","You can upload multiple files."):t("kyc.file_hint","Image or PDF up to 8MB.")}</small>
  </label>`}async function v(s){try{const n=await _("/kyc/status.php",{timeout:6e3}),a=s.querySelector("#kyc-status");if(!a)return;const e=n?.kyc||n;if(!e||!e.status){a.innerHTML=`<p class="text-muted text-sm">${t("kyc.no_submission","No KYC submission yet. Submit your documents to get verified.")}</p>`;return}const i=e.status==="approved"?"text-green":e.status==="pending"?"text-gold":"text-red";a.innerHTML=`
      <div class="p-4 rounded-lg bg-panel-2/60 border border-line/50 space-y-2">
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.status","Status")}</span><span class="font-bold ${i} uppercase">${r(e.status)}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.name","Name")}</span><span class="text-sm">${r(e.full_name||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.country","Country")}</span><span class="text-sm">${r(e.country||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.phone","Phone")}</span><span class="text-sm">${r(e.phone_e164||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.birth_date","Birth date")}</span><span class="text-sm">${r(e.birth_date||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.document","Document")}</span><span class="text-sm">${r(e.doc_type||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.contract","Contract")}</span><span class="text-sm">${e.contract_path?r(t("common.uploaded","Uploaded")):"--"}</span></div>
        ${e.admin_note?`<div class="pt-2 border-t border-line/50"><span class="text-muted text-xs">${t("kyc.review_note","Review Note")}</span><p class="text-sm mt-1">${r(e.admin_note)}</p></div>`:""}
      </div>`}catch{const a=s.querySelector("#kyc-status");a&&(a.innerHTML=`<p class="text-sm text-red">${t("kyc.status_error","Could not load KYC status.")}</p>`)}}async function T(s,n){s.preventDefault();const a=s.target,e=n.querySelector("#kyc-form-status"),i=(a.phone_dial_code?.value||"").trim(),o=(a.phone_number?.value||"").trim().replace(/^0+/,""),u=i&&o?`${i}${o}`:o||"",m=a.birth_day?.value||"",y=a.birth_month?.value||"",b=a.birth_year?.value||"",h=m&&y&&b?`${b}-${y}-${m}`:"";try{e&&(e.textContent=t("kyc.submitting","Submitting..."),e.className="text-xs text-center text-muted");const c=new FormData(a);c.delete("phone_dial_code"),c.delete("phone_number"),c.delete("birth_day"),c.delete("birth_month"),c.delete("birth_year"),u&&c.set("phone_e164",u),h&&c.set("birth_date",h);const d=await g("/kyc/submit.php",c,{timeout:3e4});d&&d.ok!==!1?(e&&(e.textContent=t("kyc.submitted","KYC submitted!"),e.className="text-xs text-center text-green"),v(n)):e&&(e.textContent=d?.error||t("common.error","Failed"),e.className="text-xs text-center text-red")}catch(c){e&&(e.textContent=c.message||t("kyc.submit_failed","Could not submit KYC right now."),e.className="text-xs text-center text-red")}}export{B as mount,L as render};
