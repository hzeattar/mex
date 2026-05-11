import{g as o,i,a as c,m as a,e as n}from"./main-DNMmzAdP.js";function p(){return o("mode"),`
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center justify-between">
          <div>
            <span class="badge-accent">Assets</span>
            <h1 class="text-xl font-bold mt-1">Wallet & Balances</h1>
            <p class="text-muted text-sm">View balances, transaction history, and manage funds.</p>
          </div>
          <div class="flex gap-2">
            <a href="#/deposit" class="btn-primary btn-sm">${i.deposit} Deposit</a>
            <a href="#/withdraw" class="btn-ghost btn-sm">${i.withdraw} Withdraw</a>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="card">
          <h3 class="text-sm font-semibold text-muted mb-3">Real Account</h3>
          <div class="space-y-2" id="real-wallet">
            <div class="skeleton h-16 rounded-lg"></div>
          </div>
        </div>
        <div class="card">
          <h3 class="text-sm font-semibold text-muted mb-3">Demo Account</h3>
          <div class="space-y-2" id="demo-wallet">
            <div class="skeleton h-16 rounded-lg"></div>
          </div>
        </div>
      </div>

      <section class="card">
        <h2 class="font-semibold mb-3">Transaction History</h2>
        <div class="overflow-x-auto" id="ledger-table">
          <p class="text-muted text-sm text-center py-8">Loading transactions...</p>
        </div>
      </section>
    </div>`}function u(t){m(t)}async function m(t){try{const e=await c("/wallet/summary.php",{timeout:8e3});if(!e)return;const d=e.real||{},s=e.demo||{};t.querySelector("#real-wallet").innerHTML=r(d,"real"),t.querySelector("#demo-wallet").innerHTML=r(s,"demo");const l=await c("/wallet/ledger.php?limit=20",{timeout:6e3}).catch(()=>null);l&&l.items?v(t,l.items):t.querySelector("#ledger-table").innerHTML='<p class="text-muted text-sm text-center py-4">No transactions yet.</p>'}catch{}}function r(t,e){return`
    <div class="p-4 rounded-lg bg-panel-2/60 border border-line/50">
      <div class="flex justify-between items-start">
        <div>
          <div class="text-[10px] uppercase text-muted">${e==="real"?"Real":"Demo"} Balance</div>
          <div class="text-2xl font-bold mt-1">${a(t.balance||0)}</div>
          <div class="text-xs text-muted">${n(t.currency||"USDT")}</div>
        </div>
        <div class="w-10 h-10 rounded-xl grid place-items-center ${e==="real"?"bg-green-soft text-green":"bg-accent-soft text-accent"}">
          ${i.wallet}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-line/50">
        <div><div class="text-[10px] text-muted">Available</div><div class="text-sm font-semibold">${a(t.available||0)}</div></div>
        <div><div class="text-[10px] text-muted">Holds</div><div class="text-sm font-semibold">${a(t.holds||0)}</div></div>
      </div>
    </div>`}function v(t,e){const d=t.querySelector("#ledger-table");!d||!e.length||(d.innerHTML=`<table class="w-full text-sm">
    <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
      <th class="text-left py-2">Type</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Balance</th><th class="text-right py-2">Date</th>
    </tr></thead>
    <tbody>${e.slice(0,15).map(s=>`<tr class="border-b border-line/50">
      <td class="py-2">${n(s.type||s.description||"--")}</td>
      <td class="py-2 text-right font-mono ${Number(s.amount)>=0?"text-green":"text-red"}">${a(s.amount)}</td>
      <td class="py-2 text-right font-mono text-muted">${a(s.balance_after||0)}</td>
      <td class="py-2 text-right text-xs text-muted">${s.created_at||"--"}</td>
    </tr>`).join("")}</tbody>
  </table>`)}export{u as mount,p as render};
