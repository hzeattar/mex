import{i as l,a as c,e as n,m as r}from"./main-BjluwQko.js";function h(){return`
    <div class="space-y-5 animate-fade-in wallet-page">
      <section class="wallet-hero">
        <div>
          <span class="badge-accent">Assets desk</span>
          <h1>Wallet & ledger</h1>
          <p>Track live funds, demo balance, ledger movements, deposits, withdrawals, and admin review state.</p>
        </div>
        <div class="wallet-actions">
          <a href="#/deposit" class="btn-primary btn-sm">${l.deposit} Deposit</a>
          <a href="#/withdraw" class="btn-ghost btn-sm">${l.withdraw} Withdraw</a>
        </div>
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
          ${i("#/deposit",l.deposit,"New deposit","Submit proof and wait for admin confirmation.")}
          ${i("#/withdraw",l.withdraw,"New withdrawal","Request payout review from your real wallet.")}
          ${i("#/kyc",l.kyc,"KYC status","Verification unlocks real funding workflows.")}
          ${i("#/invest",l.earn,"Level contracts","Use confirmed deposits to unlock customer tiers.")}
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
    </div>`}function g(e){o(e),e.querySelector("#refresh-wallet")?.addEventListener("click",()=>o(e))}async function o(e){try{const t=await c("/wallet/summary.php",{timeout:8e3});if(!t)return;const a=t.real||{},s=t.demo||{};e.querySelector("#real-wallet").innerHTML=m(a,"real"),e.querySelector("#demo-wallet").innerHTML=m(s,"demo");const d=await c("/wallet/ledger.php?limit=30",{timeout:7e3}).catch(()=>null);d&&d.items?p(e,d.items):e.querySelector("#ledger-table").innerHTML='<div class="empty-state !m-0">No transactions yet.</div>'}catch{const a=e.querySelector("#ledger-table");a&&(a.innerHTML='<p class="text-red text-sm text-center py-4">Wallet data unavailable.</p>')}}function m(e,t){const a=t==="real";return`
    <div class="wallet-balance-head">
      <div>
        <span>${a?"Real wallet":"Demo wallet"}</span>
        <strong>${r(e.balance||0)}</strong>
        <small>${n(e.currency||(a?"USDT":"USDT_DEMO"))}</small>
      </div>
      <div class="wallet-icon">${l.wallet}</div>
    </div>
    <div class="wallet-balance-metrics">
      <span><small>Available</small><strong>${r(e.available||0)}</strong></span>
      <span><small>Holds</small><strong>${r(e.holds||0)}</strong></span>
      <span><small>Status</small><strong>${a?"Manual review":"Practice funds"}</strong></span>
    </div>`}function p(e,t){const a=e.querySelector("#ledger-table");if(a){if(!t.length){a.innerHTML='<div class="empty-state !m-0">No ledger entries yet.</div>';return}a.innerHTML=`
    <div class="ledger-mobile-list md:hidden">
      ${t.slice(0,20).map(u).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">Type</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Balance</th><th class="text-right py-2">Date</th>
        </tr></thead>
        <tbody>${t.slice(0,20).map(s=>`<tr class="border-b border-line/50">
          <td class="py-2">${n(s.type||s.description||"--")}</td>
          <td class="py-2 text-right font-mono ${Number(s.amount)>=0?"text-green":"text-red"}">${r(s.amount)}</td>
          <td class="py-2 text-right font-mono text-muted">${r(s.balance_after||0)}</td>
          <td class="py-2 text-right text-xs text-muted">${n(s.created_at||"--")}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`}}function u(e){const t=Number(e.amount||0);return`<article class="ledger-card">
    <div>
      <strong>${n(e.type||e.description||"--")}</strong>
      <small>${n(e.created_at||"--")}</small>
    </div>
    <div class="text-right">
      <b class="${t>=0?"text-green":"text-red"}">${r(t)}</b>
      <span>${r(e.balance_after||0)}</span>
    </div>
  </article>`}function i(e,t,a,s){return`<a href="${e}" class="wallet-control-card">
    <span>${t}</span>
    <strong>${n(a)}</strong>
    <small>${n(s)}</small>
  </a>`}export{g as mount,h as render};
