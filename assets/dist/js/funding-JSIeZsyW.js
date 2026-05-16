import{g as y,m as r,e as o,a as g,b as m,j as x,i as l}from"./main-Vy0nb4vq.js";function M(e){const n=(e._path||"deposit").includes("withdraw")?"withdraw":"deposit",s=n==="deposit",a=y("wallet")||{},t=a.real||{},i=a.demo||{},d=y("mode")==="real"?"real":"demo";return`
    <div class="space-y-5 animate-fade-in funding-page">
      <section class="funding-hero">
        <div>
          <span class="${s?"badge-green":"badge-accent"}">${s?"Deposit desk":"Withdrawal desk"}</span>
          <h1>${s?"Fund your live account":"Request a manual payout"}</h1>
          <p>${s?"Choose an approved payment rail, follow the instructions, and submit proof for admin review.":"Withdrawals are reviewed manually with ledger holds, KYC checks, and admin approval."}</p>
        </div>
        <div class="funding-balance-card">
          <span>${d==="real"?"Live available":"Demo balance"}</span>
          <strong>${r(d==="real"?t.available||0:i.available||0)}</strong>
          <small>${o(d==="real"?t.currency||"USDT":i.currency||"USDT_DEMO")}</small>
        </div>
      </section>

      <section class="funding-steps">
        ${h("1",s?"Pick a method":"Choose payout rail",s?"Use only active methods shown by admin.":"Select where the funds should be sent.")}
        ${h("2",s?"Send funds":"Submit review",s?"Use the exact amount and reference when available.":"The amount is held while the desk checks it.")}
        ${h("3",s?"Upload proof":"Admin approval",s?"Receipts help the desk confirm faster.":"Approved payouts are recorded in the ledger.")}
      </section>

      <div class="funding-layout">
        <section class="card funding-form-card">
          <div class="panel-headline">
            <span class="badge-accent">${s?"New deposit":"New withdrawal"}</span>
            <h2>${s?"Create funding request":"Create payout request"}</h2>
          </div>
          <form class="space-y-4" id="funding-form" data-kind="${n}">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="block">
                <span class="field-label">Amount (USDT)</span>
                <input type="number" name="amount" class="input mt-1" value="${s?"100":"50"}" min="10" step="1" required />
              </label>
              <label class="block">
                <span class="field-label">Payment method</span>
                <select name="method" class="input mt-1" id="method-select">
                  <option value="">Loading methods...</option>
                </select>
              </label>
            </div>
            <div id="method-cards" class="method-grid">
              ${Array.from({length:3}).map(()=>'<div class="skeleton h-20 rounded-lg"></div>').join("")}
            </div>
            <div id="method-details" class="method-details">
              <p class="text-muted text-sm">Select a method to see address, limits, and desk instructions.</p>
            </div>
            ${s?`<label class="block">
              <span class="field-label">Receipt / proof</span>
              <input type="file" name="proof" accept="image/*,.pdf" class="input mt-1 py-1.5" />
            </label>`:""}
            <label class="block">
              <span class="field-label">${s?"Reference / notes":"Payout address and notes"}</span>
              <textarea name="notes" class="input mt-1" rows="3" placeholder="${s?"Transaction hash, sender name, or any desk note...":"Wallet address, bank reference, and payout notes..."}"></textarea>
            </label>
            <button type="submit" class="${s?"btn-primary":"btn-sell"} w-full py-3">${s?"Submit deposit for review":"Submit withdrawal request"}</button>
            <p class="text-xs text-center" id="form-status"></p>
          </form>
        </section>

        <section class="card funding-history-panel">
          <div class="panel-headline">
            <span class="badge-green">Ledger trail</span>
            <h2>Recent ${s?"deposits":"withdrawals"}</h2>
          </div>
          <div id="funding-history" class="funding-history-list">
            <p class="text-muted text-sm text-center py-8">Loading...</p>
          </div>
        </section>
      </div>
    </div>`}function L(e,n){const s=e.querySelector("#funding-form")?.dataset.kind||"deposit";S(e,s),v(e,s),e.querySelector("#funding-form")?.addEventListener("submit",a=>_(a,e,s)),e.querySelector("#method-select")?.addEventListener("change",()=>f(e))}async function S(e,n){try{const a=(await g("/payment_methods/list.php?kind="+n,{timeout:7e3}))?.items||[],t=e.querySelector("#method-select");t&&(t.innerHTML=a.map(i=>`<option value="${m(c(i))}">${o(i.title||i.name||i.code||"Method")}</option>`).join("")||'<option value="">No methods available</option>'),e.__fundingMethods=a,q(e,a),f(e)}catch{const a=e.querySelector("#method-cards");a&&(a.innerHTML='<p class="text-muted text-sm">Payment methods are temporarily unavailable.</p>')}}function q(e,n){const s=e.querySelector("#method-cards");if(s){if(!n.length){s.innerHTML='<div class="empty-state !m-0">No active methods are configured by admin yet.</div>';return}s.innerHTML=n.slice(0,8).map((a,t)=>`
    <button type="button" class="method-card ${t===0?"active":""}" data-method="${m(c(a))}">
      <span class="method-icon">${b(a)}</span>
      <strong>${o(a.title||a.name||a.code||"Method")}</strong>
      <small>${o([a.provider,a.currency].filter(Boolean).join(" - ")||"Manual desk")}</small>
      <em>${r(a.min_amount||0)}${a.max_amount?` - ${r(a.max_amount)}`:"+"}</em>
    </button>
  `).join(""),s.querySelectorAll("[data-method]").forEach(a=>{a.addEventListener("click",()=>{const t=e.querySelector("#method-select");t&&(t.value=a.dataset.method||""),f(e)})})}}function f(e){const n=e.querySelector("#method-select"),s=n?.value||"",a=e.__fundingMethods||[],t=a.find(d=>c(d)===s)||a[0]||null;n&&t&&!n.value&&(n.value=c(t)),e.querySelectorAll(".method-card").forEach(d=>d.classList.toggle("active",d.dataset.method===c(t||{})));const i=e.querySelector("#method-details");if(i){if(!t){i.innerHTML='<p class="text-muted text-sm">No method selected.</p>';return}i.innerHTML=`
    <div class="method-details-head">
      <span>${b(t)}</span>
      <div>
        <strong>${o(t.title||t.name||t.code||"Payment method")}</strong>
        <small>${o(t.description||"Manual operations desk review")}</small>
      </div>
    </div>
    <div class="method-detail-grid">
      ${p("Currency",t.currency||"USDT")}
      ${p("Minimum",r(t.min_amount||0))}
      ${p("Maximum",t.max_amount?r(t.max_amount):"Desk limit")}
      ${p("Proof",t.proof_required?"Required":"Optional")}
    </div>
    ${t.payment_address?`<div class="copy-address"><span>${o(t.payment_address)}</span><button type="button" data-copy-address="${m(t.payment_address)}">Copy</button></div>`:""}
    ${t.instructions?`<p class="method-instructions">${o(t.instructions)}</p>`:""}
  `,i.querySelector("[data-copy-address]")?.addEventListener("click",async d=>{try{await navigator.clipboard.writeText(d.currentTarget.dataset.copyAddress||""),d.currentTarget.textContent="Copied",setTimeout(()=>{d.currentTarget.textContent="Copy"},1200)}catch{}})}}async function v(e,n){try{const a=await g(n==="deposit"?"/deposits/list.php":"/withdrawals/list.php",{timeout:7e3}),t=e.querySelector("#funding-history");if(!t||!a)return;const i=a.items||[];if(!i.length){t.innerHTML=`<div class="empty-state !m-0">No ${n} requests yet.</div>`;return}t.innerHTML=i.slice(0,12).map(d=>T(d,n)).join("")}catch{const a=e.querySelector("#funding-history");a&&(a.innerHTML='<p class="text-red text-sm text-center py-4">History unavailable.</p>')}}async function _(e,n,s){e.preventDefault();const a=e.target,t=n.querySelector("#form-status"),i=new FormData(a);i.append("kind",s);try{t&&(t.textContent="Submitting request to operations desk...",t.className="text-xs text-center text-muted");const u=await x(s==="deposit"?"/deposits/create.php":"/withdrawals/create.php",i,{timeout:14e3});u&&u.ok!==!1?(t&&(t.textContent="Request submitted. Admin review is now pending.",t.className="text-xs text-center text-buy"),v(n,s)):t&&(t.textContent=u?.error||"Request failed",t.className="text-xs text-center text-sell")}catch(d){t&&(t.textContent=d.message||"Request failed",t.className="text-xs text-center text-sell")}}function h(e,n,s){return`<div class="funding-step">
    <span>${o(e)}</span>
    <strong>${o(n)}</strong>
    <small>${o(s)}</small>
  </div>`}function c(e){return String(e?.id??e?.code??"")}function b(e){const n=String(e?.method_group||e?.provider||e?.code||"USDT").toUpperCase();return String(e?.image_url||"").trim()?`<img src="${m(e.image_url)}" alt="" />`:n.includes("BANK")?l.wallet:n.includes("TRC")||n.includes("USDT")||n.includes("CRYPTO")?l.deposit:l.wallet}function p(e,n){return`<span><small>${o(e)}</small><strong>${o(n)}</strong></span>`}function T(e,n){const s=String(e.status||"pending").toLowerCase(),a=e.method_label||e.provider||e.method_code||e.method||"--";return`<article class="funding-history-card">
    <div class="funding-history-main">
      <span class="history-kind ${n==="deposit"?"is-deposit":"is-withdraw"}">${n==="deposit"?l.deposit:l.withdraw}</span>
      <div>
        <strong>${r(e.amount)} ${o(e.currency||"USDT")}</strong>
        <small>${o(a)} - ${o(e.created_at||"")}</small>
      </div>
    </div>
    <div class="status-flow">
      <i class="done"></i><i class="${$(s)?"done":""}"></i><i class="${w(s)?"done":""}"></i>
    </div>
    <span class="badge ${k(s)}">${o(s)}</span>
  </article>`}function $(e){return["pending","requested","processing","review","approved","confirmed","completed","paid"].includes(e)}function w(e){return["approved","confirmed","completed","paid"].includes(e)}function k(e){return w(e)?"badge-green":$(e)?"badge-accent":"badge-red"}export{L as mount,M as render};
