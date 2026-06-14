import{j as d,k as r,v as t,h as l,c as p,g as i,i as m}from"./main-DzxtJ6CI.js";function f(){const e=d("user")||{},n=e.display_name||e.name||`${e.first_name||""} ${e.last_name||""}`.trim(),s=e.country_name||e.country_code||"",a=e.phone_e164||[e.phone_dial_code,e.phone_number].filter(Boolean).join(" "),c=e.birth_date||"";return`
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
              <label class="block"><span class="text-xs text-muted">${t("kyc.country","Country")}</span><input type="text" name="country" class="input mt-1" value="${l(s)}" required /></label>
              <label class="block"><span class="text-xs text-muted">${t("kyc.phone","Phone")}</span><input type="text" name="phone_e164" class="input mt-1" value="${l(a)}" readonly /></label>
              <label class="block"><span class="text-xs text-muted">${t("kyc.birth_date","Birth date")}</span><input type="text" name="birth_date" class="input mt-1" value="${l(c)}" readonly /></label>
            </div>
            <label class="block"><span class="text-xs text-muted">${t("kyc.document_type","Document Type")}</span>
              <select name="doc_type" class="input mt-1" required><option value="passport">${t("kyc.passport","Passport")}</option><option value="id_card">${t("kyc.id_card","ID Card")}</option><option value="driving_license">${t("kyc.driving_license","Driving License")}</option></select>
            </label>
            <label class="block"><span class="text-xs text-muted">${t("kyc.document_number","Document Number")}</span><input type="text" name="doc_number" class="input mt-1" required /></label>
            <div class="kyc-file-grid">
              ${o("front",t("kyc.front_document","Front document"),!0,"image/*,.pdf")}
              ${o("back",t("kyc.back_document","Back document"),!1,"image/*,.pdf")}
              ${o("selfie",t("kyc.selfie","Selfie"),!0,"image/*")}
              ${o("contract",t("kyc.signed_contract","Signed contract"),!0,"image/*,.pdf")}
              ${o("extra_files[]",t("kyc.extra_files","Extra files"),!1,"image/*,.pdf",!0)}
            </div>
            <p class="kyc-contract-note">${r.info||r.kyc}<span>${t("kyc.contract_note","To receive your contract copy, contact your account manager.")}</span></p>
            <div class="kyc-submit-actions">
              <button type="submit" class="btn-primary w-full">${t("kyc.submit","Submit KYC")}</button>
            </div>
            <p class="text-xs text-center" id="kyc-form-status"></p>
          </form>
        </section>
      </div>
    </div>`}function b(e){u(e),e.querySelector("#kyc-form")?.addEventListener("submit",n=>y(n,e))}function o(e,n,s,a,c=!1){return`<label class="kyc-file-field">
    <span>${i(n)}${s?" *":""}</span>
    <input type="file" name="${l(e)}" accept="${l(a)}" ${s?"required":""} ${c?"multiple":""} />
    <small>${c?t("kyc.multiple_files_hint","You can upload multiple files."):t("kyc.file_hint","Image or PDF up to 8MB.")}</small>
  </label>`}async function u(e){try{const n=await p("/kyc/status.php",{timeout:6e3}),s=e.querySelector("#kyc-status");if(!s)return;const a=n?.kyc||n;if(!a||!a.status){s.innerHTML=`<p class="text-muted text-sm">${t("kyc.no_submission","No KYC submission yet. Submit your documents to get verified.")}</p>`;return}const c=a.status==="approved"?"text-green":a.status==="pending"?"text-gold":"text-red";s.innerHTML=`
      <div class="p-4 rounded-lg bg-panel-2/60 border border-line/50 space-y-2">
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.status","Status")}</span><span class="font-bold ${c} uppercase">${i(a.status)}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.name","Name")}</span><span class="text-sm">${i(a.full_name||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.country","Country")}</span><span class="text-sm">${i(a.country||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.phone","Phone")}</span><span class="text-sm">${i(a.phone_e164||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.birth_date","Birth date")}</span><span class="text-sm">${i(a.birth_date||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.document","Document")}</span><span class="text-sm">${i(a.doc_type||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.contract","Contract")}</span><span class="text-sm">${a.contract_path?i(t("common.uploaded","Uploaded")):"--"}</span></div>
        ${a.admin_note?`<div class="pt-2 border-t border-line/50"><span class="text-muted text-xs">${t("kyc.review_note","Review Note")}</span><p class="text-sm mt-1">${i(a.admin_note)}</p></div>`:""}
      </div>`}catch{}}async function y(e,n){e.preventDefault();const s=n.querySelector("#kyc-form-status");try{s&&(s.textContent=t("kyc.submitting","Submitting..."),s.className="text-xs text-center text-muted");const a=new FormData(e.target),c=await m("/kyc/submit.php",a,{timeout:3e4});c&&c.ok!==!1?(s&&(s.textContent=t("kyc.submitted","KYC submitted!"),s.className="text-xs text-center text-green"),u(n)):s&&(s.textContent=c?.error||t("common.error","Failed"),s.className="text-xs text-center text-red")}catch(a){s&&(s.textContent=a.message||t("kyc.submit_failed","Could not submit KYC right now."),s.className="text-xs text-center text-red")}}export{b as mount,f as render};
