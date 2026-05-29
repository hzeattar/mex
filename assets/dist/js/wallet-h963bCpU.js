import{g as i,i as n,a as m,e as l,m as r}from"./main-D-FkjeWD.js";function h(){const e=i("level")||{},t=e.current||{},a=e.next||{},s=i("kyc")||{};return`
    <div class="space-y-5 animate-fade-in wallet-page">
      <section class="wallet-hero">
        <div>
          <span class="badge-accent">Assets desk</span>
          <h1>Wallet & ledger</h1>
          <p>Track live funds, demo balance, ledger movements, deposits, withdrawals, and admin review state.</p>
        </div>
        <div class="wallet-actions">
          <a href="#/deposit" class="btn-primary btn-sm">${n.deposit} Deposit</a>
          <a href="#/withdraw" class="btn-ghost btn-sm">${n.withdraw} Withdraw</a>
        </div>
      </section>

      <section class="wallet-summary-strip">
        ${o("Customer level",t.name||t.name_en||"Starter",a?.name?`Next: ${a.name}`:"Top tier active")}
        ${o("Funding status",s.status==="approved"?"Approved":"Review needed",s.status==="approved"?"Deposits and withdrawals are enabled":"Complete KYC for live funding")}
        ${o("Execution mode",i("mode")==="real"?"Real":"Demo",i("mode")==="real"?"Manual review active":"Practice wallet preview")}
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
          ${d("#/deposit",n.deposit,"New deposit","Submit proof and wait for admin confirmation.")}
          ${d("#/withdraw",n.withdraw,"New withdrawal","Request payout review from your real wallet.")}
          ${d("#/kyc",n.kyc,"KYC status","Verification unlocks real funding workflows.")}
          ${d("#/invest",n.earn,"Level contracts","Use confirmed deposits to unlock customer tiers.")}
        </div>
      </section>

      <section class="card">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div class="panel-headline !mb-0">
            <span class="badge-accent">Ledger</span>
            <h2>Latest transactions</h2>
          </div>
          <button class="btn-ghost btn-sm" id="refresh-wallet">${n.refresh} Refresh</button>
        </div>
        <div id="ledger-table">
          <p class="text-muted text-sm text-center py-8">Loading transactions...</p>
        </div>
      </section>
    </div>`}function b(e){p(e),e.querySelector("#refresh-wallet")?.addEventListener("click",()=>p(e))}async function p(e){try{const t=await m("/wallet/summary.php",{timeout:8e3});if(!t)return;const a=t.real||{},s=t.demo||{};e.querySelector("#real-wallet").innerHTML=u(a,"real"),e.querySelector("#demo-wallet").innerHTML=u(s,"demo");const c=await m("/wallet/ledger.php?limit=30",{timeout:7e3}).catch(()=>null);c&&c.items?v(e,c.items):e.querySelector("#ledger-table").innerHTML='<div class="empty-state !m-0">No transactions yet.</div>'}catch{const a=e.querySelector("#ledger-table");a&&(a.innerHTML='<p class="text-red text-sm text-center py-4">Wallet data unavailable.</p>')}}function u(e,t){const a=t==="real";return`
    <div class="wallet-balance-head">
      <div>
        <span>${a?"Real wallet":"Demo wallet"}</span>
        <strong>${r(e.balance||0)}</strong>
        <small>${l(e.currency||(a?"USDT":"USDT_DEMO"))}</small>
      </div>
      <div class="wallet-icon">${n.wallet}</div>
    </div>
    <div class="wallet-balance-metrics">
      <span><small>Available</small><strong>${r(e.available||0)}</strong></span>
      <span><small>Holds</small><strong>${r(e.holds||0)}</strong></span>
      <span><small>Status</small><strong>${a?"Manual review":"Practice funds"}</strong></span>
    </div>`}function v(e,t){const a=e.querySelector("#ledger-table");if(a){if(!t.length){a.innerHTML='<div class="empty-state !m-0">No ledger entries yet.</div>';return}a.innerHTML=`
    <div class="ledger-mobile-list md:hidden">
      ${t.slice(0,20).map(g).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">Type</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Balance</th><th class="text-right py-2">Date</th>
        </tr></thead>
        <tbody>${t.slice(0,20).map(s=>`<tr class="border-b border-line/50">
          <td class="py-2">${l(s.type||s.description||"--")}</td>
          <td class="py-2 text-right font-mono ${Number(s.amount)>=0?"text-green":"text-red"}">${r(s.amount)}</td>
          <td class="py-2 text-right font-mono text-muted">${r(s.balance_after||0)}</td>
          <td class="py-2 text-right text-xs text-muted">${l(s.created_at||"--")}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`}}function g(e){const t=Number(e.amount||0);return`<article class="ledger-card">
    <div>
      <strong>${l(e.type||e.description||"--")}</strong>
      <small>${l(e.created_at||"--")}</small>
    </div>
    <div class="text-right">
      <b class="${t>=0?"text-green":"text-red"}">${r(t)}</b>
      <span>${r(e.balance_after||0)}</span>
    </div>
  </article>`}function d(e,t,a,s){return`<a href="${e}" class="wallet-control-card">
    <span>${t}</span>
    <strong>${l(a)}</strong>
    <small>${l(s)}</small>
  </a>`}function o(e,t,a){return`<article class="wallet-summary-tile">
    <span>${l(e)}</span>
    <strong>${l(t)}</strong>
    <small>${l(a)}</small>
  </article>`}export{b as mount,h as render};
