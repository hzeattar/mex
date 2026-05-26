import{s as C,g as p,i as r,m as u,e as i,a as w,b as g,j as _}from"./main-C8Tpj3-j.js";function H(e){const a=(e._path||"deposit").includes("withdraw")?"withdraw":"deposit",t=a==="deposit",n=p("wallet")||{},s=p("kyc")||{},o=p("level")||{},d=n.real||{},l=n.demo||{},c=p("mode")==="real"?"real":"demo",b=o.current||{};return`
    <div class="space-y-5 animate-fade-in funding-page">
      <section class="funding-hero">
        <div>
          <span class="${t?"badge-green":"badge-accent"}">${t?"Deposit desk":"Withdrawal desk"}</span>
          <h1>${t?"Fund your live account":"Request a manual payout"}</h1>
          <p>${t?"Choose an approved payment rail, follow the instructions, and submit proof for admin review.":"Withdrawals are reviewed manually with ledger holds, KYC checks, and admin approval."}</p>
        </div>
        <div class="funding-balance-card">
          <span>${c==="real"?"Live available":"Demo balance"}</span>
          <strong>${u(c==="real"?d.available||0:l.available||0)}</strong>
          <small>${i(c==="real"?d.currency||"USDT":l.currency||"USDT_DEMO")}</small>
        </div>
      </section>

      ${c!=="real"?`<section class="funding-mode-warning">
        <span class="gate-icon">${r.lock}</span>
        <div>
          <strong>Real account required for live funding</strong>
          <small>Demo mode keeps this page visible for preview only. Switch to Real before submitting deposits or withdrawals for admin review.</small>
        </div>
        <button type="button" class="btn-primary btn-sm" data-switch-real>Switch to Real</button>
      </section>`:""}

      <section class="funding-steps">
        ${y("1",t?"Pick a method":"Choose payout rail",t?"Use only active methods shown by admin.":"Select where the funds should be sent.")}
        ${y("2",t?"Send funds":"Submit review",t?"Use the exact amount and reference when available.":"The amount is held while the desk checks it.")}
        ${y("3",t?"Upload proof":"Admin approval",t?"Receipts help the desk confirm faster.":"Approved payouts are recorded in the ledger.")}
      </section>

      <section class="funding-summary-grid">
        ${f("Account mode",c==="real"?"Real":"Demo",c==="real"?"Live funding enabled":"Preview only")}
        ${f("KYC",U(s.status||"not submitted"),s.status==="approved"?"Funding unlocked":"Approval required for live review")}
        ${f("Customer level",b.name||b.name_en||"Starter","Contracts and limits depend on tier")}
        ${f(t?"Deposit rail":"Payout rail",t?"Manual intake":"Manual payout","Handled by operations desk")}
      </section>

      <div class="funding-layout">
        <section class="card funding-form-card">
          <div class="panel-headline">
            <span class="badge-accent">${t?"New deposit":"New withdrawal"}</span>
            <h2>${t?"Create funding request":"Create payout request"}</h2>
          </div>
          <form class="space-y-4" id="funding-form" data-kind="${a}">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="block">
                <span class="field-label">Amount (USDT)</span>
                <input type="number" name="amount" class="input mt-1" value="${t?"100":"50"}" min="10" step="1" required />
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
            ${t?`<label class="block">
              <span class="field-label">Receipt / proof</span>
              <input type="file" name="proof" accept="image/*,.pdf" class="input mt-1 py-1.5" />
            </label>`:""}
            <label class="block">
              <span class="field-label">${t?"Reference / notes":"Payout address and notes"}</span>
              <textarea name="notes" class="input mt-1" rows="3" placeholder="${t?"Transaction hash, sender name, or any desk note...":"Wallet address, bank reference, and payout notes..."}"></textarea>
            </label>
            <button type="submit" class="${t?"btn-primary":"btn-sell"} w-full py-3">${t?"Submit deposit for review":"Submit withdrawal request"}</button>
            <p class="text-xs text-center" id="form-status"></p>
          </form>
        </section>

        <div class="space-y-4">
          <section class="card funding-sidebar-card">
            <div class="panel-headline">
              <span class="badge-green">${t?"Review flow":"Payout flow"}</span>
              <h2>${t?"Deposit checklist":"Withdrawal checklist"}</h2>
            </div>
            <div class="funding-checklist">
              ${v("Use active method only",!0)}
              ${v(t?"Upload a clear receipt or proof":"Use a valid payout destination",!0)}
              ${v("Real mode required",c==="real")}
              ${v("KYC approval recommended",s.status==="approved")}
            </div>
          </section>

          <section class="card funding-history-panel">
            <div class="panel-headline">
              <span class="badge-green">Ledger trail</span>
              <h2>Recent ${t?"deposits":"withdrawals"}</h2>
            </div>
            <div id="funding-history" class="funding-history-list">
              <p class="text-muted text-sm text-center py-8">Loading...</p>
            </div>
          </section>
        </div>
      </div>
    </div>`}function N(e,a){const t=e.querySelector("#funding-form")?.dataset.kind||"deposit";T(e,t),x(e,t),e.querySelector("#funding-form")?.addEventListener("submit",n=>L(n,e,t)),e.querySelector("#method-select")?.addEventListener("change",()=>$(e)),e.querySelector("[data-switch-real]")?.addEventListener("click",()=>{localStorage.setItem("vp_mode","real"),C("mode","real"),location.reload()})}async function T(e,a){try{const n=(await w("/payment_methods/list.php?kind="+a,{timeout:7e3}))?.items||[],s=e.querySelector("#method-select");s&&(s.innerHTML=n.map(o=>`<option value="${g(m(o))}">${i(o.title||o.name||o.code||"Method")}</option>`).join("")||'<option value="">No methods available</option>'),e.__fundingMethods=n,M(e,n),$(e)}catch{const n=e.querySelector("#method-cards");n&&(n.innerHTML='<p class="text-muted text-sm">Payment methods are temporarily unavailable.</p>')}}function M(e,a){const t=e.querySelector("#method-cards");if(t){if(!a.length){t.innerHTML='<div class="empty-state !m-0">No active methods are configured by admin yet.</div>';return}t.innerHTML=a.slice(0,8).map((n,s)=>`
    <button type="button" class="method-card ${s===0?"active":""}" data-method="${g(m(n))}">
      <span class="method-icon">${S(n)}</span>
      <strong>${i(n.title||n.name||n.code||"Method")}</strong>
      <small>${i([n.provider,n.currency].filter(Boolean).join(" - ")||"Manual desk")}</small>
      <em>${u(n.min_amount||0)}${n.max_amount?` - ${u(n.max_amount)}`:"+"}</em>
    </button>
  `).join(""),t.querySelectorAll("[data-method]").forEach(n=>{n.addEventListener("click",()=>{const s=e.querySelector("#method-select");s&&(s.value=n.dataset.method||""),$(e)})})}}function $(e){const a=e.querySelector("#method-select"),t=a?.value||"",n=e.__fundingMethods||[],s=n.find(d=>m(d)===t)||n[0]||null;a&&s&&!a.value&&(a.value=m(s)),e.querySelectorAll(".method-card").forEach(d=>d.classList.toggle("active",d.dataset.method===m(s||{})));const o=e.querySelector("#method-details");if(o){if(!s){o.innerHTML='<p class="text-muted text-sm">No method selected.</p>';return}o.innerHTML=`
    <div class="method-details-head">
      <span>${S(s)}</span>
      <div>
        <strong>${i(s.title||s.name||s.code||"Payment method")}</strong>
        <small>${i(s.description||"Manual operations desk review")}</small>
      </div>
    </div>
    <div class="method-detail-grid">
      ${h("Currency",s.currency||"USDT")}
      ${h("Minimum",u(s.min_amount||0))}
      ${h("Maximum",s.max_amount?u(s.max_amount):"Desk limit")}
      ${h("Proof",s.proof_required?"Required":"Optional")}
    </div>
    ${s.payment_address?`<div class="copy-address"><span>${i(s.payment_address)}</span><button type="button" data-copy-address="${g(s.payment_address)}">Copy</button></div>`:""}
    ${s.instructions?`<p class="method-instructions">${i(s.instructions)}</p>`:""}
  `,o.querySelector("[data-copy-address]")?.addEventListener("click",async d=>{try{await navigator.clipboard.writeText(d.currentTarget.dataset.copyAddress||""),d.currentTarget.textContent="Copied",setTimeout(()=>{d.currentTarget.textContent="Copy"},1200)}catch{}})}}async function x(e,a){try{const n=await w(a==="deposit"?"/deposits/list.php":"/withdrawals/list.php",{timeout:7e3}),s=e.querySelector("#funding-history");if(!s||!n)return;const o=n.items||[];if(!o.length){s.innerHTML=`<div class="empty-state !m-0">No ${a} requests yet.</div>`;return}s.innerHTML=o.slice(0,12).map(d=>D(d,a)).join("")}catch{const n=e.querySelector("#funding-history");n&&(n.innerHTML='<p class="text-red text-sm text-center py-4">History unavailable.</p>')}}async function L(e,a,t){e.preventDefault();const n=e.target,s=a.querySelector("#form-status"),o=new FormData(n);o.append("kind",t);try{if(p("mode")!=="real"){s&&(s.textContent="Switch to Real before submitting live funding requests.",s.className="text-xs text-center text-spread");return}s&&(s.textContent="Submitting request to operations desk...",s.className="text-xs text-center text-muted");const l=await _(t==="deposit"?"/deposits/create.php":"/withdrawals/create.php",o,{timeout:14e3});l&&l.ok!==!1?(s&&(s.textContent="Request submitted. Admin review is now pending.",s.className="text-xs text-center text-buy"),x(a,t)):s&&(s.textContent=l?.error||"Request failed",s.className="text-xs text-center text-sell")}catch(d){s&&(s.textContent=d.message||"Request failed",s.className="text-xs text-center text-sell")}}function y(e,a,t){return`<div class="funding-step">
    <span>${i(e)}</span>
    <strong>${i(a)}</strong>
    <small>${i(t)}</small>
  </div>`}function m(e){return String(e?.id??e?.code??"")}function S(e){const a=String(e?.method_group||e?.provider||e?.code||"USDT").toUpperCase();return String(e?.image_url||"").trim()?`<img src="${g(e.image_url)}" alt="" />`:a.includes("BANK")?r.wallet:a.includes("TRC")||a.includes("USDT")||a.includes("CRYPTO")?r.deposit:r.wallet}function h(e,a){return`<span><small>${i(e)}</small><strong>${i(a)}</strong></span>`}function D(e,a){const t=String(e.status||"pending").toLowerCase(),n=e.method_label||e.provider||e.method_code||e.method||"--";return`<article class="funding-history-card">
    <div class="funding-history-main">
      <span class="history-kind ${a==="deposit"?"is-deposit":"is-withdraw"}">${a==="deposit"?r.deposit:r.withdraw}</span>
      <div>
        <strong>${u(e.amount)} ${i(e.currency||"USDT")}</strong>
        <small>${i(n)} - ${i(e.created_at||"")}</small>
      </div>
    </div>
    <div class="status-flow">
      <i class="done"></i><i class="${k(t)?"done":""}"></i><i class="${q(t)?"done":""}"></i>
    </div>
    <span class="badge ${R(t)}">${i(t)}</span>
  </article>`}function k(e){return["pending","requested","processing","review","approved","confirmed","completed","paid"].includes(e)}function q(e){return["approved","confirmed","completed","paid"].includes(e)}function R(e){return q(e)?"badge-green":k(e)?"badge-accent":"badge-red"}function U(e){return String(e).replace(/_/g," ").replace(/\b\w/g,a=>a.toUpperCase())}function f(e,a,t){return`<article class="funding-summary-tile">
    <span>${i(e)}</span>
    <strong>${i(a)}</strong>
    <small>${i(t)}</small>
  </article>`}function v(e,a){return`<div class="funding-check-item ${a?"is-done":"is-pending"}">
    <i>${a?r.check:r.lock}</i>
    <div>
      <strong>${i(e)}</strong>
      <small>${a?"Ready":"Action required"}</small>
    </div>
  </div>`}export{N as mount,H as render};
