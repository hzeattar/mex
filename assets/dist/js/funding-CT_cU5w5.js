import{s as P,g as v,i as p,m as f,e as i,a as M,b as x,h as H,j as E}from"./main-D-FkjeWD.js";function G(e){const a=(e._path||"deposit").includes("withdraw")?"withdraw":"deposit",s=a==="deposit",n=v("wallet")||{},t=v("kyc")||{},o=v("level")||{},r=n.real||{},l=n.demo||{},d=v("mode")==="real"?"real":"demo",u=o.current||{};return`
    <div class="space-y-5 animate-fade-in funding-page">
      <section class="funding-hero">
        <div>
          <span class="${s?"badge-green":"badge-accent"}">${s?"Deposit desk":"Withdrawal desk"}</span>
          <h1>${s?"Fund your live account":"Request a manual payout"}</h1>
          <p>${s?"Choose an approved payment rail, follow the instructions, and submit proof for admin review.":"Withdrawals are reviewed manually with ledger holds, KYC checks, and admin approval."}</p>
        </div>
        <div class="funding-balance-card">
          <span>${d==="real"?"Live available":"Demo balance"}</span>
          <strong>${f(d==="real"?r.available||0:l.available||0)}</strong>
          <small>${i(d==="real"?r.currency||"USDT":l.currency||"USDT_DEMO")}</small>
        </div>
      </section>

      ${d!=="real"?`<section class="funding-mode-warning">
        <span class="gate-icon">${p.lock}</span>
        <div>
          <strong>Real account required for live funding</strong>
          <small>Demo mode keeps this page visible for preview only. Switch to Real before submitting deposits or withdrawals for admin review.</small>
        </div>
        <button type="button" class="btn-primary btn-sm" data-switch-real>Switch to Real</button>
      </section>`:""}

      <section class="funding-steps">
        ${q("1",s?"Pick a method":"Choose payout rail",s?"Use only active methods shown by admin.":"Select where the funds should be sent.")}
        ${q("2",s?"Send funds":"Submit review",s?"Use the exact amount and reference when available.":"The amount is held while the desk checks it.")}
        ${q("3",s?"Upload proof":"Admin approval",s?"Receipts help the desk confirm faster.":"Approved payouts are recorded in the ledger.")}
      </section>

      <section class="funding-summary-grid">
        ${$("Account mode",d==="real"?"Real":"Demo",d==="real"?"Live funding enabled":"Preview only")}
        ${$("KYC",O(t.status||"not submitted"),t.status==="approved"?"Funding unlocked":"Approval required for live review")}
        ${$("Customer level",u.name||u.name_en||"Starter","Contracts and limits depend on tier")}
        ${$(s?"Deposit rail":"Payout rail",s?"Manual intake":"Manual payout","Handled by operations desk")}
      </section>

      <div class="funding-layout">
        <section class="card funding-form-card">
          <div class="panel-headline">
            <span class="badge-accent">${s?"New deposit":"New withdrawal"}</span>
            <h2>${s?"Create funding request":"Create payout request"}</h2>
          </div>
          <form class="space-y-4" id="funding-form" data-kind="${a}">
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
            ${s?`<label class="block" id="proof-field">
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

        <div class="space-y-4">
          <section class="card funding-sidebar-card">
            <div class="panel-headline">
              <span class="badge-green">${s?"Review flow":"Payout flow"}</span>
              <h2>${s?"Deposit checklist":"Withdrawal checklist"}</h2>
            </div>
            <div class="funding-checklist">
              ${w("Use active method only",!0)}
              ${w(s?"Upload a clear receipt or proof":"Use a valid payout destination",!0)}
              ${w("Real mode required",d==="real")}
              ${w("KYC approval recommended",t.status==="approved")}
            </div>
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
      </div>
    </div>`}function J(e,a){const s=e.querySelector("#funding-form")?.dataset.kind||"deposit";I(e,s),D(e,s),e.querySelector("#funding-form")?.addEventListener("submit",n=>j(n,e,s)),e.querySelector("#method-select")?.addEventListener("change",()=>S(e)),e.querySelector("[data-switch-real]")?.addEventListener("click",()=>{localStorage.setItem("vp_mode","real"),P("mode","real"),location.reload()})}async function I(e,a){try{const n=(await M("/payment_methods/list.php?kind="+a,{timeout:7e3}))?.items||[],t=e.querySelector("#method-select");t&&(t.innerHTML=n.map(o=>`<option value="${x(h(o))}">${i(o.title||o.name||o.code||"Method")}</option>`).join("")||'<option value="">No methods available</option>'),e.__fundingMethods=n,F(e,n),S(e)}catch{const n=e.querySelector("#method-cards");n&&(n.innerHTML='<p class="text-muted text-sm">Payment methods are temporarily unavailable.</p>')}}function F(e,a){const s=e.querySelector("#method-cards");if(s){if(!a.length){s.innerHTML='<div class="empty-state !m-0">No active methods are configured by admin yet.</div>';return}s.innerHTML=a.slice(0,8).map((n,t)=>`
    <button type="button" class="method-card ${t===0?"active":""}" data-method="${x(h(n))}">
      <span class="method-icon">${L(n)}</span>
      <strong>${i(n.title||n.name||n.code||"Method")}</strong>
      <small>${i([n.provider,n.currency].filter(Boolean).join(" - ")||"Manual desk")}</small>
      <em>${f(n.min_amount||0)}${n.max_amount?` - ${f(n.max_amount)}`:"+"}</em>
    </button>
  `).join(""),s.querySelectorAll("[data-method]").forEach(n=>{n.addEventListener("click",()=>{const t=e.querySelector("#method-select");t&&(t.value=n.dataset.method||""),S(e)})})}}function S(e){const a=e.querySelector("#method-select"),s=a?.value||"",n=e.__fundingMethods||[],t=n.find(c=>h(c)===s)||n[0]||null;a&&t&&!a.value&&(a.value=h(t)),e.querySelectorAll(".method-card").forEach(c=>c.classList.toggle("active",c.dataset.method===h(t||{})));const o=e.querySelector("#method-details"),r=e.querySelector("#proof-field"),l=e.querySelector('#funding-form button[type="submit"]'),d=String(t?.provider||t?.method_group||"").toLowerCase(),u=d.includes("stripe")||d.includes("card");if(r&&r.classList.toggle("hidden",u||!t?.proof_required),l&&t&&(l.textContent=u?t.checkout_label||"Continue to secure card checkout":e.querySelector("#funding-form")?.dataset.kind==="deposit"?"Submit deposit for review":"Submit withdrawal request"),!!o){if(!t){o.innerHTML='<p class="text-muted text-sm">No method selected.</p>';return}o.innerHTML=`
    <div class="method-details-head">
      <span>${L(t)}</span>
      <div>
        <strong>${i(t.title||t.name||t.code||"Payment method")}</strong>
        <small>${i(t.description||"Manual operations desk review")}</small>
      </div>
    </div>
    <div class="method-detail-grid">
      ${b("Currency",t.currency||"USDT")}
      ${b("Minimum",f(t.min_amount||0))}
      ${b("Maximum",t.max_amount?f(t.max_amount):"Desk limit")}
      ${b("Proof",t.proof_required?"Required":"Optional")}
    </div>
    ${u?`<div class="secure-checkout-strip">
      <i>${p.wallet}</i>
      <div>
        <strong>Secure hosted card checkout</strong>
        <small>Card details are collected by Stripe. VertexPluse only receives the payment confirmation.</small>
      </div>
    </div>`:""}
    ${t.payment_address?`<div class="copy-address"><span>${i(t.payment_address)}</span><button type="button" data-copy-address="${x(t.payment_address)}">Copy</button></div>`:""}
    ${t.instructions?`<p class="method-instructions">${i(t.instructions)}</p>`:""}
  `,o.querySelector("[data-copy-address]")?.addEventListener("click",async c=>{try{await navigator.clipboard.writeText(c.currentTarget.dataset.copyAddress||""),c.currentTarget.textContent="Copied",setTimeout(()=>{c.currentTarget.textContent="Copy"},1200)}catch{}})}}async function D(e,a){try{const n=await M(a==="deposit"?"/deposits/list.php":"/withdrawals/list.php",{timeout:7e3}),t=e.querySelector("#funding-history");if(!t||!n)return;const o=n.items||[];if(!o.length){t.innerHTML=`<div class="empty-state !m-0">No ${a} requests yet.</div>`;return}t.innerHTML=o.slice(0,12).map(r=>B(r,a)).join("")}catch{const n=e.querySelector("#funding-history");n&&(n.innerHTML='<p class="text-red text-sm text-center py-4">History unavailable.</p>')}}async function j(e,a,s){e.preventDefault();const n=e.target,t=a.querySelector("#form-status"),o=new FormData(n),r=K(a),l=s==="deposit",d=Number(o.get("amount")||0),u=String(o.get("notes")||"").trim(),c=String(r?.provider||r?.method_group||"").toLowerCase(),g=l&&(c.includes("stripe")||c.includes("card"));try{if(v("mode")!=="real"){t&&(t.textContent="Switch to Real before submitting live funding requests.",t.className="text-xs text-center text-spread");return}if(!r){t&&(t.textContent="Select an active payment method first.",t.className="text-xs text-center text-sell");return}if(!Number.isFinite(d)||d<=0){t&&(t.textContent="Enter a valid amount.",t.className="text-xs text-center text-sell");return}t&&(t.textContent=g?"Creating secure card checkout...":"Submitting request to operations desk...",t.className="text-xs text-center text-muted");const y=r.code||r.method||r.id||o.get("method")||"",_=r.currency||"USDT",A=l?{provider:r.provider||"",method:y,currency:_,amount:d,details:{notes:u}}:{method:y,currency:_,amount:d,destination:u,details:{notes:u}},N={"Idempotency-Key":W(l?"dep":"wd")},m=await H(g?"/deposits/stripe_checkout.php":l?"/deposits/create.php":"/withdrawals/create.php",A,{timeout:g?18e3:14e3,headers:N});if(m&&m.ok!==!1){if(g&&m.checkout_url){t&&(t.textContent="Redirecting to Stripe Checkout...",t.className="text-xs text-center text-buy"),window.location.assign(m.checkout_url);return}if(l){const C=n.querySelector('input[name="proof"]')?.files?.[0]||null,T=m.deposit?.id||m.id||m.deposit_id||null;if(C&&T){const k=new FormData;k.append("deposit_id",String(T)),k.append("proof",C),await E("/deposits/upload_proof.php",k,{timeout:18e3})}}t&&(t.textContent=l?"Deposit request submitted. Admin review is now pending.":"Withdrawal request submitted. Admin review is now pending.",t.className="text-xs text-center text-buy"),n.reset(),S(a),D(a,s)}else t&&(t.textContent=m?.error||"Request failed",t.className="text-xs text-center text-sell")}catch(y){t&&(t.textContent=y.message||"Request failed",t.className="text-xs text-center text-sell")}}function q(e,a,s){return`<div class="funding-step">
    <span>${i(e)}</span>
    <strong>${i(a)}</strong>
    <small>${i(s)}</small>
  </div>`}function h(e){return String(e?.id??e?.code??"")}function L(e){const a=String(e?.method_group||e?.provider||e?.code||"USDT").toUpperCase();return String(e?.image_url||"").trim()?`<img src="${x(e.image_url)}" alt="" />`:a.includes("STRIPE")||a.includes("CARD")?p.wallet:a.includes("BANK")?p.wallet:a.includes("TRC")||a.includes("USDT")||a.includes("CRYPTO")?p.deposit:p.wallet}function K(e){const s=e.querySelector("#method-select")?.value||"",n=e.__fundingMethods||[];return n.find(t=>h(t)===s)||n[0]||null}function W(e){const a=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;return`vp-${e}-${a}`}function b(e,a){return`<span><small>${i(e)}</small><strong>${i(a)}</strong></span>`}function B(e,a){const s=String(e.status||"pending").toLowerCase(),n=e.method_label||e.provider||e.method_code||e.method||"--";return`<article class="funding-history-card">
    <div class="funding-history-main">
      <span class="history-kind ${a==="deposit"?"is-deposit":"is-withdraw"}">${a==="deposit"?p.deposit:p.withdraw}</span>
      <div>
        <strong>${f(e.amount)} ${i(e.currency||"USDT")}</strong>
        <small>${i(n)} - ${i(e.created_at||"")}</small>
      </div>
    </div>
    <div class="status-flow">
      <i class="done"></i><i class="${R(s)?"done":""}"></i><i class="${U(s)?"done":""}"></i>
    </div>
    <span class="badge ${Y(s)}">${i(s)}</span>
  </article>`}function R(e){return["pending","requested","processing","review","approved","confirmed","completed","paid"].includes(e)}function U(e){return["approved","confirmed","completed","paid"].includes(e)}function Y(e){return U(e)?"badge-green":R(e)?"badge-accent":"badge-red"}function O(e){return String(e).replace(/_/g," ").replace(/\b\w/g,a=>a.toUpperCase())}function $(e,a,s){return`<article class="funding-summary-tile">
    <span>${i(e)}</span>
    <strong>${i(a)}</strong>
    <small>${i(s)}</small>
  </article>`}function w(e,a){return`<div class="funding-check-item ${a?"is-done":"is-pending"}">
    <i>${a?p.check:p.lock}</i>
    <div>
      <strong>${i(e)}</strong>
      <small>${a?"Ready":"Action required"}</small>
    </div>
  </div>`}export{J as mount,G as render};
