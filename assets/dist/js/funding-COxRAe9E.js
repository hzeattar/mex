import{s as P,g as v,i as p,m as g,e as i,a as M,b as x,h as H,j as E}from"./main-DC6eObyD.js";function z(t){const s=t._path||"deposit",n=t.action||"",a=s.includes("withdraw")||n==="withdraw"?"withdraw":"deposit",e=a==="deposit",o=v("wallet")||{},d=v("kyc")||{},l=v("level")||{},c=o.real||{},u=o.demo||{},r=v("mode")==="real"?"real":"demo",m=l.current||{};return`
    <div class="space-y-5 animate-fade-in funding-page">
      <section class="funding-hero">
        <div>
          <span class="${e?"badge-green":"badge-accent"}">${e?"Deposit desk":"Withdrawal desk"}</span>
          <h1>${e?"Fund your live account":"Request a manual payout"}</h1>
          <p>${e?"Choose an approved payment rail, follow the instructions, and submit proof for admin review.":"Withdrawals are reviewed manually with ledger holds, KYC checks, and admin approval."}</p>
        </div>
        <div class="funding-balance-card">
          <span>${r==="real"?"Live available":"Demo balance"}</span>
          <strong>${g(r==="real"?c.available||0:u.available||0)}</strong>
          <small>${i(r==="real"?c.currency||"USDT":u.currency||"USDT_DEMO")}</small>
        </div>
      </section>

      ${r!=="real"?`<section class="funding-mode-warning">
        <span class="gate-icon">${p.lock}</span>
        <div>
          <strong>Real account required for live funding</strong>
          <small>Demo mode keeps this page visible for preview only. Switch to Real before submitting deposits or withdrawals for admin review.</small>
        </div>
        <button type="button" class="btn-primary btn-sm" data-switch-real>Switch to Real</button>
      </section>`:""}

      <section class="funding-steps">
        ${q("1",e?"Pick a method":"Choose payout rail",e?"Use only active methods shown by admin.":"Select where the funds should be sent.")}
        ${q("2",e?"Send funds":"Submit review",e?"Use the exact amount and reference when available.":"The amount is held while the desk checks it.")}
        ${q("3",e?"Upload proof":"Admin approval",e?"Receipts help the desk confirm faster.":"Approved payouts are recorded in the ledger.")}
      </section>

      <section class="funding-summary-grid">
        ${w("Account mode",r==="real"?"Real":"Demo",r==="real"?"Live funding enabled":"Preview only")}
        ${w("KYC",O(d.status||"not submitted"),d.status==="approved"?"Funding unlocked":"Approval required for live review")}
        ${w("Customer level",m.name||m.name_en||"Starter","Contracts and limits depend on tier")}
        ${w(e?"Deposit rail":"Payout rail",e?"Manual intake":"Manual payout","Handled by operations desk")}
      </section>

      <div class="funding-layout">
        <section class="card funding-form-card">
          <div class="panel-headline">
            <span class="badge-accent">${e?"New deposit":"New withdrawal"}</span>
            <h2>${e?"Create funding request":"Create payout request"}</h2>
          </div>
          <form class="space-y-4" id="funding-form" data-kind="${a}">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="block">
                <span class="field-label">Amount (USDT)</span>
                <input type="number" name="amount" class="input mt-1" value="${e?"100":"50"}" min="10" step="1" required />
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
            ${e?`<label class="block" id="proof-field">
              <span class="field-label">Receipt / proof</span>
              <input type="file" name="proof" accept="image/*,.pdf" class="input mt-1 py-1.5" />
            </label>`:""}
            <label class="block">
              <span class="field-label">${e?"Reference / notes":"Payout address and notes"}</span>
              <textarea name="notes" class="input mt-1" rows="3" placeholder="${e?"Transaction hash, sender name, or any desk note...":"Wallet address, bank reference, and payout notes..."}"></textarea>
            </label>
            <button type="submit" class="${e?"btn-primary":"btn-sell"} w-full py-3">${e?"Submit deposit for review":"Submit withdrawal request"}</button>
            <p class="text-xs text-center" id="form-status"></p>
          </form>
        </section>

        <div class="space-y-4">
          <section class="card funding-sidebar-card">
            <div class="panel-headline">
              <span class="badge-green">${e?"Review flow":"Payout flow"}</span>
              <h2>${e?"Deposit checklist":"Withdrawal checklist"}</h2>
            </div>
            <div class="funding-checklist">
              ${$("Use active method only",!0)}
              ${$(e?"Upload a clear receipt or proof":"Use a valid payout destination",!0)}
              ${$("Real mode required",r==="real")}
              ${$("KYC approval recommended",d.status==="approved")}
            </div>
          </section>

          <section class="card funding-history-panel">
            <div class="panel-headline">
              <span class="badge-green">Ledger trail</span>
              <h2>Recent ${e?"deposits":"withdrawals"}</h2>
            </div>
            <div id="funding-history" class="funding-history-list">
              <p class="text-muted text-sm text-center py-8">Loading...</p>
            </div>
          </section>
        </div>
      </div>
    </div>`}function J(t,s){const n=t.querySelector("#funding-form")?.dataset.kind||"deposit";I(t,n),D(t,n),t.querySelector("#funding-form")?.addEventListener("submit",a=>j(a,t,n)),t.querySelector("#method-select")?.addEventListener("change",()=>S(t)),t.querySelector("[data-switch-real]")?.addEventListener("click",()=>{localStorage.setItem("vp_mode","real"),P("mode","real"),location.reload()})}async function I(t,s){try{const a=(await M("/payment_methods/list.php?kind="+s,{timeout:7e3}))?.items||[],e=t.querySelector("#method-select");e&&(e.innerHTML=a.map(o=>`<option value="${x(f(o))}">${i(o.title||o.name||o.code||"Method")}</option>`).join("")||'<option value="">No methods available</option>'),t.__fundingMethods=a,F(t,a),S(t)}catch{const a=t.querySelector("#method-cards");a&&(a.innerHTML='<p class="text-muted text-sm">Payment methods are temporarily unavailable.</p>')}}function F(t,s){const n=t.querySelector("#method-cards");if(n){if(!s.length){n.innerHTML='<div class="empty-state !m-0">No active methods are configured by admin yet.</div>';return}n.innerHTML=s.slice(0,8).map((a,e)=>`
    <button type="button" class="method-card ${e===0?"active":""}" data-method="${x(f(a))}">
      <span class="method-icon">${L(a)}</span>
      <strong>${i(a.title||a.name||a.code||"Method")}</strong>
      <small>${i([a.provider,a.currency].filter(Boolean).join(" - ")||"Manual desk")}</small>
      <em>${g(a.min_amount||0)}${a.max_amount?` - ${g(a.max_amount)}`:"+"}</em>
    </button>
  `).join(""),n.querySelectorAll("[data-method]").forEach(a=>{a.addEventListener("click",()=>{const e=t.querySelector("#method-select");e&&(e.value=a.dataset.method||""),S(t)})})}}function S(t){const s=t.querySelector("#method-select"),n=s?.value||"",a=t.__fundingMethods||[],e=a.find(r=>f(r)===n)||a[0]||null;s&&e&&!s.value&&(s.value=f(e)),t.querySelectorAll(".method-card").forEach(r=>r.classList.toggle("active",r.dataset.method===f(e||{})));const o=t.querySelector("#method-details"),d=t.querySelector("#proof-field"),l=t.querySelector('#funding-form button[type="submit"]'),c=String(e?.provider||e?.method_group||"").toLowerCase(),u=c.includes("stripe")||c.includes("card");if(d&&d.classList.toggle("hidden",u||!e?.proof_required),l&&e&&(l.textContent=u?e.checkout_label||"Continue to secure card checkout":t.querySelector("#funding-form")?.dataset.kind==="deposit"?"Submit deposit for review":"Submit withdrawal request"),!!o){if(!e){o.innerHTML='<p class="text-muted text-sm">No method selected.</p>';return}o.innerHTML=`
    <div class="method-details-head">
      <span>${L(e)}</span>
      <div>
        <strong>${i(e.title||e.name||e.code||"Payment method")}</strong>
        <small>${i(e.description||"Manual operations desk review")}</small>
      </div>
    </div>
    <div class="method-detail-grid">
      ${b("Currency",e.currency||"USDT")}
      ${b("Minimum",g(e.min_amount||0))}
      ${b("Maximum",e.max_amount?g(e.max_amount):"Desk limit")}
      ${b("Proof",e.proof_required?"Required":"Optional")}
    </div>
    ${u?`<div class="secure-checkout-strip">
      <i>${p.wallet}</i>
      <div>
        <strong>Secure hosted card checkout</strong>
        <small>Card details are collected by Stripe. MEX Group only receives the payment confirmation.</small>
      </div>
    </div>`:""}
    ${e.payment_address?`<div class="copy-address"><span>${i(e.payment_address)}</span><button type="button" data-copy-address="${x(e.payment_address)}">Copy</button></div>`:""}
    ${e.instructions?`<p class="method-instructions">${i(e.instructions)}</p>`:""}
  `,o.querySelector("[data-copy-address]")?.addEventListener("click",async r=>{try{await navigator.clipboard.writeText(r.currentTarget.dataset.copyAddress||""),r.currentTarget.textContent="Copied",setTimeout(()=>{r.currentTarget.textContent="Copy"},1200)}catch{}})}}async function D(t,s){try{const a=await M(s==="deposit"?"/deposits/list.php":"/withdrawals/list.php",{timeout:7e3}),e=t.querySelector("#funding-history");if(!e||!a)return;const o=a.items||[];if(!o.length){e.innerHTML=`<div class="empty-state !m-0">No ${s} requests yet.</div>`;return}e.innerHTML=o.slice(0,12).map(d=>B(d,s)).join("")}catch{const a=t.querySelector("#funding-history");a&&(a.innerHTML='<p class="text-red text-sm text-center py-4">History unavailable.</p>')}}async function j(t,s,n){t.preventDefault();const a=t.target,e=s.querySelector("#form-status"),o=new FormData(a),d=K(s),l=n==="deposit",c=Number(o.get("amount")||0),u=String(o.get("notes")||"").trim(),r=String(d?.provider||d?.method_group||"").toLowerCase(),m=l&&(r.includes("stripe")||r.includes("card"));try{if(v("mode")!=="real"){e&&(e.textContent="Switch to Real before submitting live funding requests.",e.className="text-xs text-center text-spread");return}if(!d){e&&(e.textContent="Select an active payment method first.",e.className="text-xs text-center text-sell");return}if(!Number.isFinite(c)||c<=0){e&&(e.textContent="Enter a valid amount.",e.className="text-xs text-center text-sell");return}e&&(e.textContent=m?"Creating secure card checkout...":"Submitting request to operations desk...",e.className="text-xs text-center text-muted");const y=d.code||d.method||d.id||o.get("method")||"",_=d.currency||"USDT",U=l?{provider:d.provider||"",method:y,currency:_,amount:c,details:{notes:u}}:{method:y,currency:_,amount:c,destination:u,details:{notes:u}},N={"Idempotency-Key":W(l?"dep":"wd")},h=await H(m?"/deposits/stripe_checkout.php":l?"/deposits/create.php":"/withdrawals/create.php",U,{timeout:m?18e3:14e3,headers:N});if(h&&h.ok!==!1){if(m&&h.checkout_url){e&&(e.textContent="Redirecting to Stripe Checkout...",e.className="text-xs text-center text-buy"),window.location.assign(h.checkout_url);return}if(l){const C=a.querySelector('input[name="proof"]')?.files?.[0]||null,T=h.deposit?.id||h.id||h.deposit_id||null;if(C&&T){const k=new FormData;k.append("deposit_id",String(T)),k.append("proof",C),await E("/deposits/upload_proof.php",k,{timeout:18e3})}}e&&(e.textContent=l?"Deposit request submitted. Admin review is now pending.":"Withdrawal request submitted. Admin review is now pending.",e.className="text-xs text-center text-buy"),a.reset(),S(s),D(s,n)}else e&&(e.textContent=h?.error||"Request failed",e.className="text-xs text-center text-sell")}catch(y){e&&(e.textContent=y.message||"Request failed",e.className="text-xs text-center text-sell")}}function q(t,s,n){return`<div class="funding-step">
    <span>${i(t)}</span>
    <strong>${i(s)}</strong>
    <small>${i(n)}</small>
  </div>`}function f(t){return String(t?.id??t?.code??"")}function L(t){const s=String(t?.method_group||t?.provider||t?.code||"USDT").toUpperCase();return String(t?.image_url||"").trim()?`<img src="${x(t.image_url)}" alt="" />`:s.includes("STRIPE")||s.includes("CARD")?p.wallet:s.includes("BANK")?p.wallet:s.includes("TRC")||s.includes("USDT")||s.includes("CRYPTO")?p.deposit:p.wallet}function K(t){const n=t.querySelector("#method-select")?.value||"",a=t.__fundingMethods||[];return a.find(e=>f(e)===n)||a[0]||null}function W(t){const s=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;return`vp-${t}-${s}`}function b(t,s){return`<span><small>${i(t)}</small><strong>${i(s)}</strong></span>`}function B(t,s){const n=String(t.status||"pending").toLowerCase(),a=t.method_label||t.provider||t.method_code||t.method||"--";return`<article class="funding-history-card">
    <div class="funding-history-main">
      <span class="history-kind ${s==="deposit"?"is-deposit":"is-withdraw"}">${s==="deposit"?p.deposit:p.withdraw}</span>
      <div>
        <strong>${g(t.amount)} ${i(t.currency||"USDT")}</strong>
        <small>${i(a)} - ${i(t.created_at||"")}</small>
      </div>
    </div>
    <div class="status-flow">
      <i class="done"></i><i class="${R(n)?"done":""}"></i><i class="${A(n)?"done":""}"></i>
    </div>
    <span class="badge ${Y(n)}">${i(n)}</span>
  </article>`}function R(t){return["pending","requested","processing","review","approved","confirmed","completed","paid"].includes(t)}function A(t){return["approved","confirmed","completed","paid"].includes(t)}function Y(t){return A(t)?"badge-green":R(t)?"badge-accent":"badge-red"}function O(t){return String(t).replace(/_/g," ").replace(/\b\w/g,s=>s.toUpperCase())}function w(t,s,n){return`<article class="funding-summary-tile">
    <span>${i(t)}</span>
    <strong>${i(s)}</strong>
    <small>${i(n)}</small>
  </article>`}function $(t,s){return`<div class="funding-check-item ${s?"is-done":"is-pending"}">
    <i>${s?p.check:p.lock}</i>
    <div>
      <strong>${i(t)}</strong>
      <small>${s?"Ready":"Action required"}</small>
    </div>
  </div>`}export{J as mount,z as render};
