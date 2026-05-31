import{i as l,h as d,b as m,e as n,m as r}from"./main-BQ65LCvf.js";function b(){const e=d("level")||{},a=e.current||{},t=e.next||{},s=d("kyc")||{};return`
    <div class="space-y-5 animate-fade-in wallet-page">
      <section class="wallet-hero">
        <div>
          <span class="badge-accent">Assets desk</span>
          <h1>Wallet & ledger</h1>
          <p>Track live funds, demo balance, ledger movements, deposits, withdrawals, and admin review state.</p>
        </div>
        <div class="wallet-actions">
          <button id="toggle-balance" class="btn-ghost btn-sm" data-hidden="0">${l.eye}</button>
          <a href="#/deposit" class="btn-primary btn-sm">${l.deposit} Deposit</a>
          <a href="#/withdraw" class="btn-ghost btn-sm">${l.withdraw} Withdraw</a>
        </div>
      </section>

      <section class="wallet-summary-strip">
        ${o("Customer level",a.name||a.name_en||"Starter",t?.name?`Next: ${t.name}`:"Top tier active")}
        ${o("Funding status",s.status==="approved"?"Approved":"Review needed",s.status==="approved"?"Deposits and withdrawals are enabled":"Complete KYC for live funding")}
        ${o("Execution mode",d("mode")==="real"?"Real":"Demo",d("mode")==="real"?"Manual review active":"Practice wallet preview")}
      </section>

      <div class="wallet-balance-grid">
        <section class="wallet-balance-card is-real" id="real-wallet">
          <div class="skeleton h-32 rounded-lg"></div>
        </section>
        <section class="wallet-balance-card is-demo" id="demo-wallet">
          <div class="skeleton h-32 rounded-lg"></div>
        </section>
      </div>

      <section class="card">
        <div class="panel-headline">
          <span class="badge-green">Funding controls</span>
          <h2>Manual requests</h2>
        </div>
        <div class="wallet-control-grid">
          ${c("#/deposit",l.deposit,"New deposit","Submit proof and wait for admin confirmation.")}
          ${c("#/withdraw",l.withdraw,"New withdrawal","Request payout review from your real wallet.")}
          ${c("#/kyc",l.kyc,"KYC status","Verification unlocks real funding workflows.")}
          ${c("#/invest",l.earn,"Level contracts","Use confirmed deposits to unlock customer tiers.")}
        </div>
      </section>

      <section class="card">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div class="panel-headline !mb-0">
            <span class="badge-accent">Ledger</span>
            <h2>Latest transactions</h2>
          </div>
          <button class="btn-ghost btn-sm" id="refresh-wallet">${l.refresh} Refresh</button>
        </div>
        <div id="ledger-table">
          <p class="text-muted text-sm text-center py-8">Loading transactions...</p>
        </div>
      </section>
    </div>`}function w(e){u(e),e.querySelector("#refresh-wallet")?.addEventListener("click",()=>u(e)),e.addEventListener("click",a=>{const t=a.target.closest("#toggle-balance");if(!t)return;const s=t.dataset.hidden==="1";t.dataset.hidden=s?"0":"1",t.innerHTML=s?l.eye:l.eyeOff,e.querySelectorAll("[data-balance-value]").forEach(i=>{i.style.filter=s?"":"blur(6px)",i.style.userSelect=s?"":"none"})})}async function u(e){try{const a=await m("/wallet/summary.php",{timeout:8e3});if(!a)return;const t=a.real||{},s=a.demo||{};e.querySelector("#real-wallet").innerHTML=p(t,"real"),e.querySelector("#demo-wallet").innerHTML=p(s,"demo");const i=await m("/wallet/ledger.php?limit=30",{timeout:7e3}).catch(()=>null);i&&i.items?v(e,i.items):e.querySelector("#ledger-table").innerHTML='<div class="empty-state !m-0">No transactions yet.</div>'}catch{const t=e.querySelector("#ledger-table");t&&(t.innerHTML='<p class="text-red text-sm text-center py-4">Wallet data unavailable.</p>')}}function p(e,a){const t=a==="real";return`
    <div class="wallet-balance-head">
      <div>
        <span>${t?"Real wallet":"Demo wallet"}</span>
        <strong data-balance-value>${r(e.balance||0)}</strong>
        <small>${n(e.currency||(t?"USDT":"USDT_DEMO"))}</small>
      </div>
      <div class="wallet-icon">${l.wallet}</div>
    </div>
    <div class="wallet-balance-metrics">
      <span><small>Available</small><strong>${r(e.available||0)}</strong></span>
      <span><small>Holds</small><strong>${r(e.holds||0)}</strong></span>
      <span><small>Status</small><strong>${t?"Manual review":"Practice funds"}</strong></span>
    </div>`}function v(e,a){const t=e.querySelector("#ledger-table");if(t){if(!a.length){t.innerHTML='<div class="empty-state !m-0">No ledger entries yet.</div>';return}t.innerHTML=`
    <div class="ledger-mobile-list md:hidden">
      ${a.slice(0,20).map(g).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">Type</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Balance</th><th class="text-right py-2">Date</th>
        </tr></thead>
        <tbody>${a.slice(0,20).map(s=>`<tr class="border-b border-line/50">
          <td class="py-2">${n(s.type||s.description||"--")}</td>
          <td class="py-2 text-right font-mono ${Number(s.amount)>=0?"text-green":"text-red"}">${r(s.amount)}</td>
          <td class="py-2 text-right font-mono text-muted">${r(s.balance_after||0)}</td>
          <td class="py-2 text-right text-xs text-muted">${n(s.created_at||"--")}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`}}function g(e){const a=Number(e.amount||0);return`<article class="ledger-card">
    <div>
      <strong>${n(e.type||e.description||"--")}</strong>
      <small>${n(e.created_at||"--")}</small>
    </div>
    <div class="text-right">
      <b class="${a>=0?"text-green":"text-red"}">${r(a)}</b>
      <span>${r(e.balance_after||0)}</span>
    </div>
  </article>`}function c(e,a,t,s){return`<a href="${e}" class="wallet-control-card">
    <span>${a}</span>
    <strong>${n(t)}</strong>
    <small>${n(s)}</small>
  </a>`}function o(e,a,t){return`<article class="wallet-summary-tile">
    <span>${n(e)}</span>
    <strong>${n(a)}</strong>
    <small>${n(t)}</small>
  </article>`}export{w as mount,b as render};
