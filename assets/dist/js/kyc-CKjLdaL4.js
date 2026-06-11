import{t,c as l,g as i,i as u}from"./main-v-tQbWh8.js";function m(){return`
    <div class="space-y-6 animate-fade-in">
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
            <label class="block"><span class="text-xs text-muted">${t("kyc.full_name","Full Name")}</span><input type="text" name="full_name" class="input mt-1" required /></label>
            <label class="block"><span class="text-xs text-muted">${t("kyc.country","Country")}</span><input type="text" name="country" class="input mt-1" required /></label>
            <label class="block"><span class="text-xs text-muted">${t("kyc.document_type","Document Type")}</span>
              <select name="doc_type" class="input mt-1"><option value="passport">${t("kyc.passport","Passport")}</option><option value="id_card">${t("kyc.id_card","ID Card")}</option><option value="driving_license">${t("kyc.driving_license","Driving License")}</option></select>
            </label>
            <label class="block"><span class="text-xs text-muted">${t("kyc.document_number","Document Number")}</span><input type="text" name="doc_number" class="input mt-1" required /></label>
            <label class="block"><span class="text-xs text-muted">${t("kyc.document_photo","Document Photo")}</span><input type="file" name="doc_file" accept="image/*,.pdf" class="input mt-1 py-1.5" required /></label>
            <button type="submit" class="btn-primary w-full">${t("kyc.submit","Submit KYC")}</button>
            <p class="text-xs text-center" id="kyc-form-status"></p>
          </form>
        </section>
      </div>
    </div>`}function p(a){o(a),a.querySelector("#kyc-form")?.addEventListener("submit",c=>r(c,a))}async function o(a){try{const c=await l("/kyc/status.php",{timeout:6e3}),e=a.querySelector("#kyc-status");if(!e)return;const s=c?.kyc||c;if(!s||!s.status){e.innerHTML=`<p class="text-muted text-sm">${t("kyc.no_submission","No KYC submission yet. Submit your documents to get verified.")}</p>`;return}const n=s.status==="approved"?"text-green":s.status==="pending"?"text-gold":"text-red";e.innerHTML=`
      <div class="p-4 rounded-lg bg-panel-2/60 border border-line/50 space-y-2">
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.status","Status")}</span><span class="font-bold ${n} uppercase">${i(s.status)}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.name","Name")}</span><span class="text-sm">${i(s.full_name||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.country","Country")}</span><span class="text-sm">${i(s.country||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">${t("kyc.document","Document")}</span><span class="text-sm">${i(s.doc_type||"--")}</span></div>
        ${s.admin_note?`<div class="pt-2 border-t border-line/50"><span class="text-muted text-xs">${t("kyc.review_note","Review Note")}</span><p class="text-sm mt-1">${i(s.admin_note)}</p></div>`:""}
      </div>`}catch{}}async function r(a,c){a.preventDefault();const e=c.querySelector("#kyc-form-status");try{e&&(e.textContent=t("kyc.submitting","Submitting..."));const s=new FormData(a.target),n=await u("/kyc/submit.php",s,{timeout:15e3});n&&n.ok!==!1?(e&&(e.textContent=t("kyc.submitted","KYC submitted!"),e.className="text-xs text-center text-green"),o(c)):e&&(e.textContent=n?.error||t("common.error","Failed"),e.className="text-xs text-center text-red")}catch(s){e&&(e.textContent=s.message,e.className="text-xs text-center text-red")}}export{p as mount,m as render};
