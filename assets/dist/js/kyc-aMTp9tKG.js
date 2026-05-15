import{a as l,e as c,j as o}from"./main-CoCUWP4H.js";function d(){return`
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
    </div>`}function p(s){i(s),s.querySelector("#kyc-form")?.addEventListener("submit",a=>r(a,s))}async function i(s){try{const a=await l("/kyc/status.php",{timeout:6e3}),t=s.querySelector("#kyc-status");if(!t)return;const e=a?.kyc||a;if(!e||!e.status){t.innerHTML='<p class="text-muted text-sm">No KYC submission yet. Submit your documents to get verified.</p>';return}const n=e.status==="approved"?"text-green":e.status==="pending"?"text-gold":"text-red";t.innerHTML=`
      <div class="p-4 rounded-lg bg-panel-2/60 border border-line/50 space-y-2">
        <div class="flex justify-between"><span class="text-muted text-xs">Status</span><span class="font-bold ${n} uppercase">${c(e.status)}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">Name</span><span class="text-sm">${c(e.full_name||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">Country</span><span class="text-sm">${c(e.country||"--")}</span></div>
        <div class="flex justify-between"><span class="text-muted text-xs">Document</span><span class="text-sm">${c(e.doc_type||"--")}</span></div>
        ${e.admin_note?`<div class="pt-2 border-t border-line/50"><span class="text-muted text-xs">Review Note</span><p class="text-sm mt-1">${c(e.admin_note)}</p></div>`:""}
      </div>`}catch{}}async function r(s,a){s.preventDefault();const t=a.querySelector("#kyc-form-status");try{t&&(t.textContent="Submitting...");const e=new FormData(s.target),n=await o("/kyc/submit.php",e,{timeout:15e3});n&&n.ok!==!1?(t&&(t.textContent="KYC submitted!",t.className="text-xs text-center text-green"),i(a)):t&&(t.textContent=n?.error||"Failed",t.className="text-xs text-center text-red")}catch(e){t&&(t.textContent=e.message,t.className="text-xs text-center text-red")}}export{p as mount,d as render};
