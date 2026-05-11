import{d as b,s as o,g as n,i as l,a as r,h as f,e as i,m as y}from"./main-_2Sd1mKl.js";function S(){const t=n("mode"),e=n("invest.tab")||"copy";return`
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center justify-between">
          <div>
            <span class="badge-green">Earn</span>
            <h1 class="text-xl font-bold mt-1">Copy Trading & Contracts</h1>
            <p class="text-muted text-sm">Follow trading signals or subscribe to premium contracts.</p>
          </div>
          <button class="btn-ghost btn-sm" id="refresh-invest">${l.refresh} Refresh</button>
        </div>
      </section>

      <!-- Tabs -->
      <div class="flex gap-2 p-1 rounded-lg bg-panel-2 border border-line w-fit">
        <button class="px-4 py-2 rounded-md text-sm font-semibold transition-colors ${e==="copy"?"bg-accent-soft text-accent":"text-muted hover:text-text"}" data-earn-tab="copy">Copy Trading</button>
        <button class="px-4 py-2 rounded-md text-sm font-semibold transition-colors ${e==="contracts"?"bg-accent-soft text-accent":"text-muted hover:text-text"}" data-earn-tab="contracts">Contracts</button>
      </div>

      ${t!=="real"?_():""}

      <!-- Content -->
      <div id="invest-content">
        <div class="grid gap-4">
          <div class="skeleton h-40 rounded-lg"></div>
          <div class="skeleton h-40 rounded-lg"></div>
        </div>
      </div>
    </div>`}function T(t){d(t),b(t,"[data-earn-tab]","click",(e,s)=>{o("invest.tab",s.dataset.earnTab),localStorage.setItem("vp_earn_tab",s.dataset.earnTab),u(t)}),t.querySelector("#refresh-invest")?.addEventListener("click",()=>d(t))}async function d(t){try{const[e,s,m]=await Promise.all([r("/signals.php?bot=1&home=1&lang=en",{timeout:8e3}).catch(()=>({items:[]})),r("/invest/contracts.php?lang=en",{timeout:8e3}).catch(()=>({items:[]})),r("/trading_bot/my.php?lang=en",{timeout:8e3}).catch(()=>({items:[]}))]);o("invest.signals",e.items||[]),o("invest.contracts",s.items||[]),o("invest.copies",m.items||[]),u(t)}catch{}}function u(t){const e=t.querySelector("#invest-content");if(!e)return;const s=n("invest.tab")||"copy",c=n("mode")!=="real";if(s==="copy"){const a=n("invest.signals")||[];e.innerHTML=c?g(p(a)):p(a)}else{const a=n("invest.contracts")||[];e.innerHTML=c?g(v(a)):v(a)}c&&w(e),b(e,"[data-copy-signal]","click",(a,x)=>k(x.dataset.copySignal,t))}function p(t){return t.length?`<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${t.map(h).join("")}</div>`:'<p class="text-muted text-sm text-center py-12">No trading signals available yet.</p>'}function h(t){const e=(t.direction||"BUY").toUpperCase();return`<div class="card hover:border-accent/30 transition-colors">
    <div class="flex items-center gap-3 mb-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-green/20 grid place-items-center text-[11px] font-black">${i((t.market_symbol||"").slice(0,3))}</div>
      <div class="flex-1">
        <strong class="text-sm">${i(t.market_symbol||t.symbol||"--")}</strong>
        <div class="text-[11px] text-muted">${i(t.bot_name_en||t.timeframe||"")}</div>
      </div>
      <span class="badge ${e==="BUY"?"badge-green":"badge-red"}">${e}</span>
    </div>
    <div class="grid grid-cols-3 gap-2 text-[11px] mb-3">
      <div><span class="text-muted">Entry</span><div class="font-mono font-semibold">${t.entry_price||"--"}</div></div>
      <div><span class="text-muted">TP</span><div class="font-mono text-green">${t.take_profit_1||"--"}</div></div>
      <div><span class="text-muted">SL</span><div class="font-mono text-red">${t.stop_loss||"--"}</div></div>
    </div>
    <button class="btn-primary w-full btn-sm" data-copy-signal="${t.id||""}">Copy Signal</button>
  </div>`}function v(t){return t.length?`<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${t.map($).join("")}</div>`:'<p class="text-muted text-sm text-center py-12">No contracts available.</p>'}function $(t){return`<div class="card hover:border-accent/30 transition-colors">
    <div class="flex items-center justify-between mb-3">
      <strong class="text-sm">${i(t.name_en||t.name||"Contract")}</strong>
      <span class="badge-accent">${i(t.duration_label||t.duration_days+"d"||"--")}</span>
    </div>
    <p class="text-xs text-muted mb-3">${i(t.description_en||t.description||"")}</p>
    <div class="grid grid-cols-2 gap-2 text-[11px] mb-3">
      <div><span class="text-muted">Return</span><div class="font-semibold text-green">${t.return_pct||t.expected_return||"--"}%</div></div>
      <div><span class="text-muted">Min</span><div class="font-semibold">${y(t.min_amount||0)}</div></div>
    </div>
    <button class="btn-ghost w-full btn-sm">Subscribe</button>
  </div>`}function _(){return`<div class="card border-gold/30 bg-gold/5">
    <div class="flex items-center gap-3">
      <span class="w-8 h-8 rounded-lg bg-gold/20 grid place-items-center text-gold">${l.lock}</span>
      <div>
        <strong class="text-sm">Real Account Required</strong>
        <p class="text-xs text-muted">Copy trading and contracts are only available in Real mode with KYC verification.</p>
      </div>
    </div>
  </div>`}function g(t){return`<div class="relative min-h-[200px]">
    <div class="blur-[5px] saturate-75 opacity-40 pointer-events-none select-none">${t}</div>
    <div class="absolute inset-4 grid place-items-center z-10">
      <div class="card-glass text-center p-6 max-w-sm">
        <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3 text-white">${l.lock}</span>
        <strong class="block text-sm">Switch to Real</strong>
        <p class="text-muted text-xs mt-1">Verify KYC to access copy trading and contracts.</p>
        <button class="btn-primary btn-sm mt-3" data-switch-real>Switch to Real</button>
      </div>
    </div>
  </div>`}function w(t){t.querySelectorAll("[data-switch-real]").forEach(e=>{e.addEventListener("click",()=>{o("mode","real"),localStorage.setItem("vp_mode","real"),location.reload()})})}async function k(t,e){if(t)try{await f("/trading_bot/copy.php",{signal_id:t}),d(e)}catch{}}export{T as mount,S as render};
