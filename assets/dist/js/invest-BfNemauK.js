import{d as $,s as u,g as i,m as l,a as h,e as s,h as L,i as S,p as E,b as _}from"./main-CoCUWP4H.js";import{m as I,a as R}from"./marketIcon-BqfrwX_4.js";function z(){const t=i("invest.tab")||localStorage.getItem("vp_earn_tab")||"copy",e=i("level")||{},a=B(),o=e.current||{},n=e.next||{},r=i("mode");return`
    <div class="space-y-5 animate-fade-in">
      <section class="feature-hero">
        <div class="relative z-10">
          <span class="badge-accent">Earn desk</span>
          <h1 class="text-2xl lg:text-3xl font-black mt-2">Copy Trading & Contracts</h1>
          <p class="text-muted text-sm mt-2 max-w-2xl">Follow approved copy signals on Real accounts, or subscribe to level-gated contracts managed inside VertexPluse.</p>
        </div>
        <div class="feature-hero__stats">
          ${k("Mode",r==="real"?"Real":"Demo",r==="real"?"Internal execution":"Preview only")}
          ${k("Available","$"+l(a.available),a.currency||"USDT")}
          ${k("Level",o.name||o.name_en||"Level 1",n?.name?`Next: ${n.name}`:"Customer tier")}
        </div>
      </section>

      <section class="level-strip">
        ${g("Current level",o.name||o.name_en||"Level 1","Customer tier")}
        ${g("Next level",n?.name||n?.name_en||"Level 2",n?.min_deposit_total?`$${l(n.min_deposit_total)} deposits`:"Deposit progression")}
        ${g("Real available","$"+l(a.available),a.currency||"USDT")}
        ${g("Active copies",String((i("invest.copies")||[]).length||0),"Real copy desk")}
        ${g("Active contracts",String((i("invest.mine.contracts")||[]).length||0),"Running")}
      </section>

      <div class="segmented">
        <button class="${t==="copy"?"active":""}" data-earn-tab="copy">Copy Trading</button>
        <button class="${t==="contracts"?"active":""}" data-earn-tab="contracts">Contracts</button>
      </div>

      <div id="invest-content">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="skeleton h-48 rounded-lg"></div>
          <div class="skeleton h-48 rounded-lg"></div>
        </div>
      </div>
    </div>`}function W(t){C(t),$(t,"[data-earn-tab]","click",(e,a)=>{u("invest.tab",a.dataset.earnTab),localStorage.setItem("vp_earn_tab",a.dataset.earnTab),x(t)}),$(t,"[data-copy-signal]","click",(e,a)=>V(a.dataset.copySignal,t)),$(t,"[data-contract-subscribe]","click",(e,a)=>Y(a.dataset.contractSubscribe,t)),$(t,"[data-switch-real]","click",()=>{localStorage.setItem("vp_mode","real"),u("mode","real"),location.reload()}),$(t,"[data-open-kyc]","click",()=>{location.hash="#/kyc"})}async function C(t){try{const[e,a,o,n]=await Promise.all([h("/signals.php?bot=1&home=1&lang=en",{timeout:8e3}).catch(()=>({items:[]})),h("/invest/contracts.php?lang=en",{timeout:8e3}).catch(()=>({items:[]})),h("/trading_bot/my.php?lang=en",{timeout:8e3}).catch(()=>({items:[]})),h("/invest/my.php?lang=en",{timeout:8e3}).catch(()=>({items:[]}))]);u("invest.signals",e.items||[]),u("invest.contracts",a.items||[]),u("invest.copies",o.items||[]),u("invest.mine",{contracts:(n.items||[]).filter(r=>String(r.product_kind||"").toLowerCase()==="contract")}),x(t)}catch{x(t)}}function x(t){const e=t.querySelector("#invest-content");if(!e)return;const a=i("invest.tab")||localStorage.getItem("vp_earn_tab")||"copy",o=w(),n=a==="copy"?q():A();e.innerHTML=o?O(n,o):n}function q(){const t=i("invest.signals")||[],e=i("invest.copies")||[];return`
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-green">Signal desk</span>
          <h2>Copy trading signals</h2>
          <p>Real-only subscriptions. KYC approval is required before copying.</p>
        </div>
      </div>
      ${t.length?`<div class="copy-grid">${t.map(U).join("")}</div>`:f("No copy signals available yet.")}
    </section>
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-accent">Your desk</span>
          <h2>My copies</h2>
          <p>Active, armed, copied, and closed subscriptions.</p>
        </div>
      </div>
      ${e.length?`<div class="history-grid">${e.map(P).join("")}</div>`:f("No copied signals yet.")}
    </section>`}function A(){const t=i("invest.contracts")||[],e=i("invest.mine.contracts")||[];return`
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-accent">Contracts</span>
          <h2>Perpetual and term contracts</h2>
          <p>Level-gated contracts for approved Real wallets.</p>
        </div>
      </div>
      ${t.length?`<div class="contract-grid">${t.map(M).join("")}</div>`:f("No contracts available yet.")}
    </section>
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-green">Running</span>
          <h2>My contracts</h2>
          <p>Subscriptions funded from the Real wallet ledger.</p>
        </div>
      </div>
      ${e.length?`<div class="history-grid">${e.map(K).join("")}</div>`:f("No active contracts yet.")}
    </section>`}function U(t){const e=t.symbol||t.market_symbol||"--",a=String(t.direction||"BUY").toUpperCase(),o=t.type||t.market_type||"crypto",n=Number(t.live_price||0),r=n>0?"LIVE":"UNAVAILABLE",p=n>0?"status-chip-live":"status-chip-locked",d=n>0?`$${l(n,o==="forex"?5:2)}`:"--",b=n>0?E(t.live_change_pct||0):"0.00%",y=Number(t.copy_min_amount||100);return`<article class="copy-card">
    <div class="copy-card__top">
      <div class="flex items-center gap-3 min-w-0">
        ${T({symbol:e,type:o},"market-logo")}
        <div class="min-w-0">
          <h3>${s(e)}</h3>
          <p>${s(t.bot_name||t.bot_name_en||t.timeframe||"Managed copy signal")}</p>
        </div>
      </div>
      <span class="badge-${a==="BUY"?"buy":"sell"}">${s(a)}</span>
    </div>
    <div class="copy-card__quote">
      <span class="status-chip ${p}">${r}</span>
      <strong>${d}</strong>
      <span class="${Number(t.live_change_pct||0)>=0?"text-buy":"text-sell"}">${b}</span>
    </div>
    <div class="signal-metrics">
      ${c("Entry",v(t.entry??t.entry_price))}
      ${c("Stop loss",v(t.sl??t.stop_loss))}
      ${c("Take profit",v(t.tp1??t.take_profit_1))}
      ${c("Confidence",`${Number(t.confidence||0)}%`)}
    </div>
    <p class="copy-brief">${s(t.bot_brief||t.note||"Desk-managed setup with controlled entry, stop, and target.")}</p>
    <div class="copy-card__chips">
      <span>Min $${l(y)}</span>
      <span>${Number(t.copy_lock_days||0)}d lock</span>
      <span>${Number(t.copy_profit_share_pct||0)}% share</span>
      <span>${Number(t.subscribers||0)} followers</span>
    </div>
    <button class="btn-primary w-full mt-4" data-copy-signal="${_(t.id)}">Copy Real</button>
  </article>`}function M(t){const e=t.eligible!==!1,a=Number(t.is_perpetual||0)===1?"Perpetual":`${Number(t.term_days||0)}d`,o=Number(t.min_amount||0),n=e?"ELIGIBLE":"LEVEL LOCKED";return`<article class="contract-card ${e?"":"locked"}">
    <div class="copy-card__top">
      <div>
        <span class="badge-accent">${s(t.badge||t.risk||"Contract")}</span>
        <h3>${s(t.name||t.name_en||"Contract")}</h3>
      </div>
      <span class="status-chip ${e?"status-chip-live":"status-chip-locked"}">${n}</span>
    </div>
    <p class="copy-brief">${s(t.desc||t.description||t.details||"Level managed contract product.")}</p>
    <div class="signal-metrics">
      ${c("ROI",`${Number(t.roi_percent||0)}%`)}
      ${c("Term",a)}
      ${c("Minimum",`$${l(o)}`)}
      ${c("Schedule",t.payout_schedule||"end")}
    </div>
    <div class="copy-card__chips">
      <span>${s(t.required_level?.name||"Starter")}</span>
      <span>${Number(t.early_exit_allowed||0)?"Early exit":"Locked term"}</span>
      <span>${s(t.product_kind||"contract")}</span>
    </div>
    <button class="${e?"btn-primary":"btn-ghost"} w-full mt-4" ${e?`data-contract-subscribe="${_(t.id)}"`:"disabled"}>${e?"Subscribe":"Level locked"}</button>
  </article>`}function P(t){const e=t.symbol||t.market_symbol||"--",a=String(t.status||"active").toUpperCase();return`<article class="history-card">
    <div class="flex items-center gap-3">
      ${T({symbol:e,type:t.type},"market-logo")}
      <div class="min-w-0">
        <h3>${s(e)}</h3>
        <p>${s(t.bot_name||t.timeframe||"Copy subscription")}</p>
      </div>
      <span class="status-chip">${s(a)}</span>
    </div>
    <div class="signal-metrics mt-3">
      ${c("Reserved",`$${l(t.reserved_amount||0)}`)}
      ${c("Live",t.live_price?`$${l(t.live_price)}`:"--")}
      ${c("Share",`${Number(t.profit_share_pct||0)}%`)}
      ${c("Leverage",`${Number(t.leverage||1)}x`)}
    </div>
  </article>`}function K(t){return`<article class="history-card">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3>${s(t.plan_name||"Contract")}</h3>
        <p>${s(t.status||"active")} · ${Number(t.is_perpetual||0)?"Perpetual":"Term"}</p>
      </div>
      <span class="status-chip status-chip-live">${s(t.product_kind||"contract")}</span>
    </div>
    <div class="signal-metrics mt-3">
      ${c("Amount",`$${l(t.amount||0)}`)}
      ${c("Expected",`$${l(t.expected_return||0)}`)}
      ${c("Paid",`$${l(t.paid_total||0)}`)}
      ${c("ROI",`${Number(t.cycle_roi_percent||0)}%`)}
    </div>
  </article>`}function V(t,e){const a=(i("invest.signals")||[]).find(r=>String(r.id)===String(t));if(!a)return;const o=w();if(o){D(o);return}const n=Number(a.copy_min_amount||100);N(`
    <form class="space-y-4" id="copy-form">
      <div>
        <span class="badge-green">Copy real</span>
        <h2 class="text-lg font-bold mt-1">${s(a.symbol||a.market_symbol||"Signal")}</h2>
        <p class="text-xs text-muted">${s(a.bot_brief||a.note||"Desk-managed copy signal.")}</p>
      </div>
      <div class="signal-metrics">
        ${c("Entry",v(a.entry??a.entry_price))}
        ${c("SL",v(a.sl??a.stop_loss))}
        ${c("TP",v(a.tp1??a.take_profit_1))}
        ${c("Share",`${Number(a.copy_profit_share_pct||0)}%`)}
      </div>
      <label class="block">
        <span class="text-xs text-muted">Copy amount (USDT)</span>
        <input class="input mt-1" name="amount" type="number" min="${n}" step="0.01" value="${n}" required />
      </label>
      <p class="dialog-note">This uses your Real wallet and may reserve funds until the copy is closed or expires.</p>
      <p class="dialog-error hidden" id="copy-error"></p>
      <button class="btn-primary w-full" type="submit">Confirm Copy</button>
    </form>
  `),document.querySelector("#copy-form")?.addEventListener("submit",async r=>{r.preventDefault();const p=r.currentTarget,d=p.querySelector("#copy-error"),b=Number(new FormData(p).get("amount")||0);try{await L("/trading_bot/copy.php",{signal_id:Number(t),amount:b,mode:"real"},{timeout:12e3}),m(),await C(e)}catch(y){d&&(d.textContent=y?.message||"Copy failed",d.classList.remove("hidden"))}})}function Y(t,e){const a=(i("invest.contracts")||[]).find(r=>String(r.id)===String(t));if(!a)return;const o=w();if(o){D(o);return}const n=Number(a.min_amount||0);N(`
    <form class="space-y-4" id="contract-form">
      <div>
        <span class="badge-accent">Contract</span>
        <h2 class="text-lg font-bold mt-1">${s(a.name||a.name_en||"Contract")}</h2>
        <p class="text-xs text-muted">${s(a.desc||a.details||"Level-gated contract subscription.")}</p>
      </div>
      <div class="signal-metrics">
        ${c("ROI",`${Number(a.roi_percent||0)}%`)}
        ${c("Term",Number(a.is_perpetual||0)?"Perpetual":`${Number(a.term_days||0)}d`)}
        ${c("Minimum",`$${l(n)}`)}
        ${c("Schedule",a.payout_schedule||"end")}
      </div>
      <label class="block">
        <span class="text-xs text-muted">Amount (USDT)</span>
        <input class="input mt-1" name="amount" type="number" min="${n}" step="0.01" value="${n}" required />
      </label>
      <p class="dialog-note">Funds are debited through the ledger and the contract is managed internally.</p>
      <p class="dialog-error hidden" id="contract-error"></p>
      <button class="btn-primary w-full" type="submit">Subscribe</button>
    </form>
  `),document.querySelector("#contract-form")?.addEventListener("submit",async r=>{r.preventDefault();const p=r.currentTarget,d=p.querySelector("#contract-error"),b=Number(new FormData(p).get("amount")||0);try{await L("/invest/subscribe.php",{plan_id:String(t),amount:b},{timeout:12e3,headers:{"Idempotency-Key":F("contract")}}),m(),await C(e)}catch(y){d&&(d.textContent=y?.message||"Subscription failed",d.classList.remove("hidden"))}})}function w(){return i("mode")!=="real"?{title:"Real account required",body:"Copy trading and contracts are visible in Demo, but activation is Real-only.",action:"Switch to Real",attr:"data-switch-real"}:j()?null:{title:"KYC approval required",body:"Submit and approve KYC before copying signals or subscribing to contracts.",action:"Open KYC",attr:"data-open-kyc"}}function O(t,e){return`<div class="gate-wrap">
    <div class="gate-blur">${t}</div>
    <div class="gate-overlay">
      <div class="gate-card">
        <span class="gate-icon">${S.lock}</span>
        <strong>${s(e.title)}</strong>
        <p>${s(e.body)}</p>
        <button class="btn-primary btn-sm" ${e.attr}>${s(e.action)}</button>
      </div>
    </div>
  </div>`}function D(t){N(`<div class="text-center space-y-3">
    <span class="gate-icon mx-auto">${S.lock}</span>
    <h2 class="text-lg font-bold">${s(t.title)}</h2>
    <p class="text-sm text-muted">${s(t.body)}</p>
    <button class="btn-primary btn-sm" ${t.attr}>${s(t.action)}</button>
  </div>`),document.querySelector(`[${t.attr}]`)?.addEventListener("click",()=>{m(),t.attr==="data-switch-real"?(localStorage.setItem("vp_mode","real"),location.reload()):location.hash="#/kyc"})}function N(t){m();const e=document.createElement("div");e.className="dialog-backdrop",e.innerHTML=`<div class="dialog-card">
    <button class="dialog-close" aria-label="Close dialog">${S.close}</button>
    ${t}
  </div>`,document.body.appendChild(e),e.querySelector(".dialog-close")?.addEventListener("click",m),e.addEventListener("click",a=>{a.target===e&&m()})}function m(){document.querySelector(".dialog-backdrop")?.remove()}function T(t,e){const a=t.symbol||t.market_symbol||"--";return`<span class="${e}">
    <img src="${_(I(t,t.type||t.market_type||"crypto"))}" alt="${_(a)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b>${s(R(a))}</b>
  </span>`}function c(t,e){return`<div class="mini-metric"><span>${s(t)}</span><strong>${s(e??"--")}</strong></div>`}function k(t,e,a){return`<div class="hero-stat"><span>${s(t)}</span><strong>${s(e)}</strong><small>${s(a||"")}</small></div>`}function g(t,e,a){return`<div class="level-pill"><span>${s(t)}</span><strong>${s(e)}</strong><small>${s(a||"")}</small></div>`}function f(t){return`<div class="empty-state">${s(t)}</div>`}function v(t){const e=Number(t||0);return e>0?`$${l(e,e<10?4:2)}`:"--"}function j(){const t=String(i("kyc")?.status||"").toLowerCase();return["approved","verified","accepted"].includes(t)}function B(){const t=i("wallet")||{};return i("mode")==="real"?t.real||{balance:0,available:0,currency:"USDT"}:t.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}function F(t){return globalThis.crypto?.randomUUID?`${t}:${globalThis.crypto.randomUUID()}`:`${t}:${Date.now()}:${Math.random().toString(16).slice(2)}`}export{W as mount,z as render};
