import{a as c,e as i,m as p,j as u}from"./main-BotwwwQy.js";function h(s){const a=(s._path||"deposit").includes("withdraw")?"withdraw":"deposit",t=a==="deposit";return`
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div>
          <span class="badge-accent">${t?"Deposit":"Withdrawal"}</span>
          <h1 class="text-xl font-bold mt-1">${t?"Deposit Funds":"Withdraw Funds"}</h1>
          <p class="text-muted text-sm">${t?"Create a funding request. Follow payment instructions and upload proof.":"Submit a payout request. KYC and real balance required."}</p>
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Form -->
        <section class="card">
          <h2 class="font-semibold mb-4">New ${t?"Deposit":"Withdrawal"} Request</h2>
          <form class="space-y-4" id="funding-form" data-kind="${a}">
            <label class="block">
              <span class="text-xs text-muted">Amount (USDT)</span>
              <input type="number" name="amount" class="input mt-1" value="100" min="10" step="1" required />
            </label>
            <label class="block">
              <span class="text-xs text-muted">Payment Method</span>
              <select name="method" class="input mt-1" id="method-select">
                <option value="">Loading methods...</option>
              </select>
            </label>
            ${t?`<label class="block">
              <span class="text-xs text-muted">Proof (optional)</span>
              <input type="file" name="proof" accept="image/*,.pdf" class="input mt-1 py-1.5" />
            </label>`:""}
            <label class="block">
              <span class="text-xs text-muted">Notes</span>
              <textarea name="notes" class="input mt-1" rows="3" placeholder="Optional notes for admin..."></textarea>
            </label>
            <button type="submit" class="btn-primary w-full">Submit ${t?"Deposit":"Withdrawal"} Request</button>
            <p class="text-xs text-center" id="form-status"></p>
          </form>
        </section>

        <!-- History -->
        <section class="card">
          <h2 class="font-semibold mb-4">Recent ${t?"Deposits":"Withdrawals"}</h2>
          <div id="funding-history">
            <p class="text-muted text-sm text-center py-8">Loading...</p>
          </div>
        </section>
      </div>
    </div>`}function y(s,a){const t=s.querySelector("#funding-form")?.dataset.kind||"deposit";m(s,t),r(s,t),s.querySelector("#funding-form")?.addEventListener("submit",o=>f(o,s,t))}async function m(s,a){try{const t=await c("/payment_methods/list.php?kind="+a,{timeout:6e3}),o=s.querySelector("#method-select");if(!o||!t||!t.items)return;o.innerHTML=(t.items||[]).map(e=>`<option value="${i(e.id||e.code||"")}">${i(e.name||e.label||"Method")}</option>`).join("")||'<option value="">No methods available</option>'}catch{}}async function r(s,a){try{const o=await c(a==="deposit"?"/deposits/list.php":"/withdrawals/list.php",{timeout:6e3}),e=s.querySelector("#funding-history");if(!e||!o)return;const d=o.items||[];if(!d.length){e.innerHTML=`<p class="text-muted text-sm text-center py-4">No ${a} history.</p>`;return}e.innerHTML=`<div class="space-y-2">${d.slice(0,10).map(n=>`
      <div class="flex items-center justify-between p-3 rounded-lg bg-panel-2/50 border border-line/50">
        <div>
          <div class="text-sm font-semibold">${p(n.amount)} ${i(n.currency||"USDT")}</div>
          <div class="text-[11px] text-muted">${i(n.method_label||n.method||"--")} - ${i(n.created_at||"")}</div>
        </div>
        <span class="badge ${x(n.status)}">${i(n.status||"pending")}</span>
      </div>`).join("")}</div>`}catch{}}async function f(s,a,t){s.preventDefault();const o=s.target,e=a.querySelector("#form-status"),d=new FormData(o);d.append("kind",t);try{e&&(e.textContent="Submitting...");const l=await u(t==="deposit"?"/deposits/create.php":"/withdrawals/create.php",d,{timeout:12e3});l&&l.ok!==!1?(e&&(e.textContent="Request submitted!",e.className="text-xs text-center text-green"),r(a,t)):e&&(e.textContent=l?.error||"Failed",e.className="text-xs text-center text-red")}catch(n){e&&(e.textContent=n.message,e.className="text-xs text-center text-red")}}function x(s){const a=(s||"").toLowerCase();return["approved","confirmed","completed","paid"].includes(a)?"badge-green":["pending","requested","processing","review"].includes(a)?"badge-accent":"badge-red"}export{y as mount,h as render};
