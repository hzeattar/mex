import{j as g,l as se,k as M,g as v,v as n,h as $,m as y,e as P,t as pe,c as k,s as w,S as me,L as ee,b as te,x as he,q as Y,p as J,n as fe}from"./main-CYQDWk0e.js";import{marketIconPath as ve,marketInitial as be}from"./marketIcon-D-Yq8Sis.js";let q=null,L=[];const le=[{code:"USD",flag:"🇺🇸",name:"US Dollar"},{code:"EGP",flag:"🇪🇬",name:"Egyptian Pound"},{code:"SAR",flag:"🇸🇦",name:"Saudi Riyal"},{code:"AED",flag:"🇦🇪",name:"UAE Dirham"},{code:"KWD",flag:"🇰🇼",name:"Kuwaiti Dinar"},{code:"QAR",flag:"🇶🇦",name:"Qatari Riyal"},{code:"BHD",flag:"🇧🇭",name:"Bahraini Dinar"},{code:"OMR",flag:"🇴🇲",name:"Omani Rial"},{code:"JOD",flag:"🇯🇴",name:"Jordanian Dinar"},{code:"TRY",flag:"🇹🇷",name:"Turkish Lira"},{code:"EUR",flag:"🇪🇺",name:"Euro"},{code:"GBP",flag:"🇬🇧",name:"British Pound"}];function Xe(){const e=g("brand")||{},t=Z(),r=(g("portfolio")||{}).metrics||{},s=g("mode")==="real"?"real":"demo",o=K(),l=g("level")||{},c=l.current||{},i=l.next||{},u=Number(l.confirmed_deposit_total||l.total_deposits||l.deposit_total||0),p=Number(i.min_deposit_total||i.min_total_deposit||i.required_deposit||0),d=Math.max(0,p-u),f=p>0?Math.min(100,Math.round(u/p*100)):u>0?100:0,m=s==="demo"&&!se(),h=Number(t.balance||t.available||0),b=Number(r.total_balance??h),_=Number(r.available_balance??t.available??b??0),x=Number(r.in_use_balance??t.holds??t.locked??0),S=Number(r.pnl_24_live??0),C=Number(r.pnl_total_live??0),A=c.name||c.name_en||c.level_code||"Starter";return i.name||i.name_en,`
    <div class="pro-dashboard animate-fade-in pro-dashboard-compact">
      ${m?De():""}
      <section class="pro-card pro-balance-overview" aria-label="Account overview">
        <div class="pro-balance-topline">
          <div class="pro-hero-kicker">
            <span class="badge-accent">${v(e.name||"MEX Group")}</span>
            <span class="pro-pill ${s==="real"?"is-live":"is-demo"}"><i></i>${s==="real"?n("mode.real_workspace","Real workspace"):n("mode.demo_workspace","Demo workspace")}</span>
            ${s==="real"?ze(c):""}
          </div>
          <div class="pro-balance-actions">
            ${Ee()}
            <a href="#/trade" class="btn-primary">${n("nav.trade","Trade")}</a>
          </div>
        </div>
        <div class="pro-balance-main-row">
          <div class="pro-balance-total">
            <div class="pro-balance-total-head">
              <span>${n("balance.total","Total balance")}</span>
              <button class="pro-pnl-chart-btn" id="home-pnl-chart-toggle" type="button" aria-expanded="false" title="${$(n("balance.pnl_total_chart","PnL total chart"))}">
                ${M.trade}
              </button>
            </div>
            <strong id="home-balance-total" data-count-to="${b}">${y(b)}</strong>
            <small id="home-balance-currency">${v(t.currency||"USDT")}</small>
            ${Me()}
            <div class="home-pnl-chart-card hidden" id="home-pnl-chart-card">
              <div><span>${n("balance.pnl_total_live","PnL total live")}</span><b id="home-pnl-chart-value" class="text-buy">${y(0)}</b></div>
              <div class="home-pnl-spark" id="home-pnl-spark">${ie(0)}</div>
            </div>
          </div>
          <div class="pro-balance-metrics">
            <span><small>${n("balance.pnl_24_live","PnL 24 live")}</small><b id="home-pnl-24" class="${S>=0?"text-buy":"text-sell"}">${y(S)}</b></span>
            <span><small>${n("balance.pnl_total_live","PnL total live")}</small><b id="home-pnl-total" class="${C>=0?"text-buy":"text-sell"}">${y(C)}</b></span>
            <span><small>${n("balance.available","Available balance")}</small><b id="home-balance-available">${y(_)}</b></span>
            <span><small>${n("balance.in_use","In use balance")}</small><b id="home-balance-inuse">${y(x)}</b></span>
          </div>
        </div>
      </section>

      ${s==="real"?`<section class="pro-card pro-level-scroll-card">
        <div class="pro-section-head">
          <div><span>${n("level.program","Level program")}</span><h2>${v(A)} ${n("level.progress_suffix","progress")}</h2></div>
          <b class="pro-level-percent" id="home-level-percent">${f}%</b>
        </div>
        <div class="pro-progress"><i id="home-level-progress" style="width:${f}%"></i></div>
        <div class="pro-level-rail" aria-label="Level benefits and next tiers">
          ${ce(l,{currentLevel:c,nextLevel:i,remainingToNext:d,nextRequired:p,levelProgress:f,mode:s})}
        </div>
      </section>`:""}

      ${s==="real"?`<section class="pro-card pro-card-section pro-earn-rail-card blur-gate ${o?"blur-active":""}">
        <div class="pro-section-head">
          <div><span>${n("earn.desk","Earn desk")}</span><h2>${n("earn.copy_contracts","Copy trading & contracts")}</h2><p>${n("earn.dashboard_copy","Swipe through live signals, recommended copies and level-linked contracts.")}</p></div>
          ${o?`<button type="button" class="btn-ghost btn-sm" data-home-gate-trigger>${n("common.view_all","View all")}</button>`:`<a href="#/invest" class="btn-ghost btn-sm">${n("common.view_all","View all")}</a>`}
        </div>
        <div class="blur-gate-content relative" id="home-copy-section">
          ${Ue(s)}
        </div>
        ${o?`<div class="blur-gate-overlay">
          <button type="button" class="gate-card home-gate-card" data-home-gate-trigger>
            <span class="gate-icon">${M.lock}</span>
            <strong>${v(o.title)}</strong>
            <p>${v(o.body)}</p>
            <span class="btn-primary btn-sm">${v(o.action)}</span>
          </button>
        </div>`:""}
      </section>`:""}

      <section class="pro-main-layout pro-main-layout-single">
        <div class="pro-main-stack">
          <section class="pro-card pro-card-section">
            <div class="pro-section-head">
              <div><span>${n("nav.markets","Markets")}</span><h2>${n("market.live_watchlist","Watchlist")}</h2></div>
              <a href="#/trade" class="btn-ghost btn-sm">${n("nav.trade","Trade")}</a>
            </div>
            <div class="pro-market-tabs" id="home-market-tabs">
              ${[["all",n("common.all","All")],["crypto",n("markets.crypto","Crypto")],["forex",n("markets.forex","Forex")],["stocks",n("markets.stocks","Stocks")],["commodities",n("markets.commodities","Commodities")],["futures",n("markets.futures","Futures")],["arab",n("markets.arab","Arab")]].map(([R,U],D)=>`<button class="${D===0?"active":""}" data-home-tab="${R}">${v(U)}</button>`).join("")}
            </div>
            <div class="pro-market-grid" id="home-markets">
              ${Array(8).fill(0).map(()=>'<div class="skeleton h-20 rounded-xl"></div>').join("")}
            </div>
          </section>
        </div>
      </section>
    </div>`}function Ze(e){I(e,g("portfolio")),requestAnimationFrame(()=>{const o=e.querySelector(".pro-level-rail");o&&V(o,!1)});const t=()=>{const o=e.querySelector(".pro-level-rail");o&&V(o,!1)};window.addEventListener("resize",t),L.push(()=>window.removeEventListener("resize",t));const a=o=>{if(o.target.tagName==="IMG"&&o.target.dataset.fallback==="initial"){o.target.style.display="none";const l=o.target.nextElementSibling;l&&(l.style.display="grid")}};e.addEventListener("error",a,!0),L.push(()=>e.removeEventListener("error",a,!0)),setTimeout(()=>{e.querySelectorAll("#home-markets > *").forEach((o,l)=>{o.classList.add("stagger-item"),o.style.animationDelay=`${l*.05+.1}s`})},50);const r=o=>{if(o.target.closest("[data-home-gate-trigger]")){o.preventDefault();const h=K();h&&Pe(h);return}const c=o.target.closest("[data-home-gate-action]");if(c){o.preventDefault(),de(c.dataset.homeGateAction||K()?.kind);return}const i=o.target.closest("[data-home-lang-trigger]");if(i){o.preventDefault(),o.stopPropagation();const h=i.closest("[data-home-lang-menu]"),b=h?.querySelector("[data-home-lang-dropdown]"),_=h?.querySelector("[data-home-lang-overlay]"),x=b?.classList.toggle("hidden")===!1;_?.classList.toggle("hidden",!x),i.setAttribute("aria-expanded",x?"true":"false");return}if(o.target.closest("[data-home-lang-close]")){o.preventDefault(),o.stopPropagation(),j(e);return}const p=o.target.closest("[data-home-set-locale]");if(p){o.preventDefault(),o.stopPropagation();const h=p.dataset.homeSetLocale||p.dataset.lang;j(e),h&&h!==P()&&(p.disabled=!0,p.classList.add("is-loading"),pe(h));return}o.target.closest("[data-home-lang-menu]")||j(e);const d=o.target.closest("#home-pnl-chart-toggle");if(d){o.preventDefault();const b=e.querySelector("#home-pnl-chart-card")?.classList.toggle("hidden")===!1;d.setAttribute("aria-expanded",b?"true":"false");return}const f=o.target.closest("[data-home-tab]");if(!f)return;const m=f.dataset.homeTab;e.__homeMarketTab=m,e.querySelectorAll("[data-home-tab]").forEach(h=>{h.classList.toggle("active",h===f)}),G(e,m)};e.addEventListener("click",r),L.push(()=>e.removeEventListener("click",r));const s=o=>{const l=o.target.closest("#home-fx-select");if(!l)return;const c=E(l.value);localStorage.setItem("vp_home_currency",c),oe(e,c)};e.addEventListener("change",s),L.push(()=>e.removeEventListener("change",s)),q&&document.removeEventListener("click",q),q=o=>{e.contains(o.target)||j(e)},document.addEventListener("click",q),ae(e),oe(e,O()),e.__homeRefreshTimer=setInterval(()=>{ae(e)},6e3),L.push(()=>{e.__homeRefreshTimer&&(clearInterval(e.__homeRefreshTimer),e.__homeRefreshTimer=null)}),e.__homeQuoteRefreshTimer=setInterval(()=>{xe(e)},2500),L.push(()=>{e.__homeQuoteRefreshTimer&&(clearInterval(e.__homeQuoteRefreshTimer),e.__homeQuoteRefreshTimer=null)})}function et(){q&&(document.removeEventListener("click",q),q=null),L.forEach(e=>{try{e()}catch{}}),L=[]}async function ae(e){const t=g("mode")==="real"?"real":"demo";k("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:6e3}).then(a=>{(a?.real||a?.demo)&&(w("wallet",{real:a.real||{},demo:a.demo||{}}),I(e))}).catch(()=>I(e)),k(`/user/level.php?lang=${encodeURIComponent(P())}`,{timeout:0,retry:1,cacheTtl:3e4}).then(a=>{a?.ok!==!1&&(a?.current||Array.isArray(a?.levels))&&(w("level",a),ye(e))}).catch(()=>null),k("/markets.php?scope=home&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=50",{timeout:0,retry:1,cacheTtl:7e3}).then(a=>{if(a&&Array.isArray(a.items)&&a.items.length){e.__homeAllMarkets=a.items;const r=e.__homeMarketTab||"all";G(e,r)}else throw new Error("empty_markets")}).catch(()=>{k("/markets.php?scope=home&supported=1&lite=1&limit=30",{timeout:8e3,retry:0,cacheTtl:12e3}).then(a=>{if(a&&Array.isArray(a.items)&&a.items.length)e.__homeAllMarkets=a.items,G(e,e.__homeMarketTab||"all");else{const r=e.querySelector("#home-markets");r&&(r.innerHTML=`<p class="pro-empty">${n("market.reconnecting","Markets are reconnecting...")}</p>`)}}).catch(()=>{const a=e.querySelector("#home-markets");a&&(a.innerHTML=`<p class="pro-empty">${n("market.reconnecting","Markets are reconnecting...")}</p>`)})}),k(`/trade/portfolio.php?fast=1&mode=${t}`,{timeout:0,retry:1,cacheTtl:5e3}).then(a=>{a?.ok!==!1&&(w("portfolio",a),I(e,a))}).catch(()=>I(e)),Promise.allSettled([t==="real"?k(`/signals.php?bot=1&home=1&fast=1&lang=${encodeURIComponent(P())}`,{timeout:0,retry:1,cacheTtl:12e3}).catch(()=>null):Promise.resolve(null),k(`/invest/plans.php?kind=contract&home=1&lang=${encodeURIComponent(P())}`,{timeout:0,retry:1,cacheTtl:3e4}).catch(()=>null)]).then(([a,r])=>{const s=a.status==="fulfilled"?a.value:null,o=r.status==="fulfilled"?r.value:null;re(e,s?.items||[],o?.items||[])}).catch(()=>re(e,[],[]))}function I(e,t=g("portfolio")){const a=Z();g("mode");const r=t?.metrics||{},s=Number(a.balance||a.available||0),o=Number(r.total_balance??s),l=Number(r.available_balance??a.available??s??0),c=Number(r.in_use_balance??a.holds??a.locked??0),i=Number(r.pnl_24_live??0),u=Number(r.pnl_total_live??0);e.__homeBalanceValues={total:o,available:l,inUse:c,pnl24:i,pnlTotal:u,currency:a.currency||"USDT"},F(e)}function F(e){const t=e.__homeBalanceValues||{},a=Number(t.total||0),r=Number(t.available||0),s=Number(t.inUse||0),o=Number(t.pnl24||0),l=Number(t.pnlTotal||0),c=t.currency||Z().currency||"USDT",i=Ae(),u=E(i.code),p=Number(i.rate||0)>0?Number(i.rate):1,d=D=>Number(D||0)*p,f=u==="USD"?c:u,m=e.querySelector("#home-balance-total");m&&(m.dataset.countTo=String(a),m.textContent=y(d(a),N(u)));const h=e.querySelector("#home-balance-currency");h&&(h.textContent=u==="USD"?c:`${u} - base ${c}`);const b=e.querySelector("#home-balance-available");b&&(b.textContent=`${y(d(r),N(u))} ${f}`);const _=e.querySelector("#home-balance-inuse");_&&(_.textContent=`${y(d(s),N(u))} ${f}`);const x=e.querySelector("#home-pnl-24");x&&(x.textContent=`${y(d(o),N(u))} ${f}`,x.className=o>=0?"text-buy":"text-sell");const S=e.querySelector("#home-pnl-total");S&&(S.textContent=`${y(d(l),N(u))} ${f}`,S.className=l>=0?"text-buy":"text-sell");const C=e.querySelector("#home-fx-total");C&&(C.textContent=`${y(d(a),N(u))} ${f}`);const A=e.querySelector("#home-fx-rate");A&&(A.textContent=u==="USD"?`1 ${c} = 1 USD`:`1 ${c} ~= ${y(p,N(u))} ${u}`);const R=e.querySelector("#home-fx-note");if(R){const D=i.source?` - ${i.source}`:"";R.textContent=u==="USD"?n("home.base_currency_note","Showing account base currency"):`${n("home.converted_estimate","Converted estimate")}${D}`,R.classList.toggle("is-error",!!i.error)}const U=e.querySelector("#home-fx-select");U&&U.value!==u&&(U.value=u),Re(e,d(l),d(o),f)}function ye(e){const t=g("level")||{},a=t.current||{},r=t.next||{},s=Number(t.confirmed_deposit_total||t.total_deposits||t.deposit_total||0),o=Number(r.min_deposit_total||r.min_total_deposit||r.required_deposit||0),l=Math.max(0,o-s),c=o>0?Math.min(100,Math.round(s/o*100)):s>0?100:0,i=e.querySelector(".pro-level-scroll-card .pro-section-head h2");i&&(i.textContent=`${a.name||a.name_en||a.level_code||"Starter"} ${n("level.progress_suffix","progress")}`);const u=e.querySelector("#home-level-percent");u&&(u.textContent=`${c}%`);const p=e.querySelector("#home-level-progress");p&&(p.style.width=`${c}%`);const d=e.querySelector(".pro-level-rail");d&&(d.innerHTML=ce(t,{currentLevel:a,nextLevel:r,remainingToNext:l,nextRequired:o,levelProgress:c,mode:g("mode")==="real"?"real":"demo"}),setTimeout(()=>V(d),120))}function re(e,t=[],a=[]){const r=e.querySelector("#home-copy-section");if(!r)return;const s=g("mode")==="real"?"real":"demo",o=(t||[]).slice(0,6).map(ge).join(""),l=_e(a||[]);r.innerHTML=`
    <div class="pro-earn-rail-group">
      <div class="pro-rail-label-row">
        <span>${n("earn.copy_desk","Copy desk")}</span>
        <a href="#/invest" class="btn-ghost btn-xs">${n("earn.open_earn","Open Earn")}</a>
      </div>
      <div class="pro-earn-rail" id="copy-scroller">
        ${o||$e(s)}
      </div>
    </div>
    <div class="pro-earn-rail-group">
      <div class="pro-rail-label-row">
        <span>${n("earn.contracts","Contracts")}</span>
        <a href="#/invest" class="btn-ghost btn-xs">${n("earn.view_contracts","View contracts")}</a>
      </div>
      <div class="pro-earn-rail" id="contracts-scroller">
        ${l}
      </div>
    </div>`}function ge(e){const t=ue(e.direction),a=e.symbol||e.market_symbol||"--",r=Ke(e);return`<article class="copy-card pro-earn-card">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2 min-w-0">
        <span class="avalon-mini-mark" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg></span>
        <div class="min-w-0">
          <strong class="text-xs truncate block">${v(r)}</strong>
          <span class="text-[10px] text-muted truncate block">${v(a)} - ${n("bot.ai_copy_basket","AI copy basket")}</span>
        </div>
      </div>
      ${Qe(t)}
    </div>
    <div class="copy-card__quote py-2">
      <span class="status-chip ${Number(e.live_price||0)>0?"status-chip-live":"status-chip-locked"}">${Number(e.live_price||0)>0?n("market.live","LIVE"):n("funding.ready","READY")}</span>
      <strong>${Number(e.live_price||0)>0?"$"+y(e.live_price,e.type==="forex"?5:2):"--"}</strong>
      <span class="${Number(e.live_change_pct||0)>=0?"text-buy":"text-sell"}">${J(e.live_change_pct||0)}</span>
    </div>
    <div class="copy-card__perf mt-2">
      <div class="copy-card__perf-item"><small>${n("trade.entry","Entry")}</small><strong>${ne(e.entry||e.entry_price,e.type)}</strong></div>
      <div class="copy-card__perf-item ${Number(e.win_rate||0)>=60?"pos":""}"><small>${n("bot.win_rate","Win Rate")}</small><strong>${Number(e.win_rate||0)>0?Number(e.win_rate).toFixed(0)+"%":"--"}</strong></div>
      <div class="copy-card__perf-item pos"><small>TP</small><strong>${ne(e.tp1||e.take_profit_1||e.take_profit,e.type)}</strong></div>
    </div>
    ${We(e)?`<p class="text-[10px] text-muted mt-2">${n("bot.awaiting_desk_levels","Awaiting desk levels")}</p>`:Ge(e)}
    <a href="#/invest" class="btn-primary btn-sm w-full mt-3">${n("bot.open_copy_desk","Open copy desk")}</a>
  </article>`}function _e(e){const t=(e||[]).slice(0,4);return t.length?t.map(r=>{const s=r.required_level?.name||r.required_level?.name_en||r.level_name||n("level.starter","Starter"),o=Number(r.cycle_roi_percent||r.roi_percent||r.rate||0),l=Number(r.duration_days||r.term_days||0);return`<article class="pro-contract-card pro-earn-card">
      <div class="pro-contract-badge">${n("earn.contract","Contract")}</div>
      <strong>${v(r.name||r.name_en||n("earn.level_contract","Level contract"))}</strong>
      <small>${l>0?`${l} ${n("earn.day_term","day term")}`:n("earn.flexible_term","Flexible term")} - ${n("level.label","Level")}: ${v(s)}</small>
      <div class="pro-contract-rate"><span>${n("earn.target_return","Target return")}</span><b>${o>0?o.toFixed(2)+"%":n("earn.managed","Managed")}</b></div>
      <a href="#/invest" class="btn-ghost btn-sm w-full mt-3">${n("earn.view_contract","View contract")}</a>
    </article>`}).join(""):`<article class="pro-contract-card pro-earn-card pro-earn-empty-card">
      <div class="pro-contract-badge">${n("earn.contract","Contract")}</div>
      <strong>${n("earn.no_contracts","No contracts available currently.")}</strong>
      <small>${n("earn.check_back","Check back later for new contract offers.")}</small>
      <a href="#/invest" class="btn-ghost btn-sm w-full mt-3">${n("earn.view_contract","View contract")}</a>
    </article>`}function $e(e){return`<article class="copy-card pro-earn-card pro-earn-empty-card">
    <div class="pro-contract-badge">${n("earn.copy_desk","Copy desk")}</div>
    <strong>${e==="real"?n("bot.no_active_signals","No active signals yet"):n("earn.real_account_only","Real account only")}</strong>
    <small>${e==="real"?n("bot.desk_empty_copy","The desk will appear here once admin publishes live signals."):n("bot.switch_real_verify_copy","Switch to Real and verify KYC to copy live signals.")}</small>
    <a href="#/invest" class="btn-primary btn-sm w-full mt-3">${n("earn.open_earn","Open Earn")}</a>
  </article>`}function ke(e,t){const a=e.querySelector("#home-markets");a&&(a.innerHTML=t.map(r=>`
    <button class="home-market-card" data-symbol="${$(r.symbol)}" data-type="${$(r.type||"crypto")}">
      ${Le(r,"home-market-icon")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <div class="font-semibold text-sm truncate">${v(r.symbol)}</div>
        </div>
        <div class="text-[11px] text-muted truncate">${v(r.name||r.symbol)}</div>
        <div class="mini-spark" aria-hidden="true">${Oe(r.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold" data-home-price data-price="${$(Number(r.price||r.q_price||0))}">${Be(r.price||r.q_price,r.type)}</div>
        <div class="text-[11px] ${Number(r.change_pct||r.q_change||0)>=0?"text-buy":"text-sell"}" data-home-change>${J(r.change_pct||r.q_change||0)}</div>
      </div>
    </button>
  `).join(""),a.querySelectorAll("[data-symbol]").forEach(r=>{r.addEventListener("click",()=>{const s=String(r.dataset.symbol||"").toUpperCase(),o=B(r.dataset.type||"crypto"),l=we(o);if(s){w("symbol",s),w("type",o),w("market",l),w("activeQuote",null);try{localStorage.setItem("vp_symbol",s),localStorage.setItem("vp_type",o),localStorage.setItem("vp_market",l)}catch{}fe("trade",{symbol:s,type:o,market:l})}})}))}function G(e,t="all"){const a=Array.isArray(e.__homeAllMarkets)?e.__homeAllMarkets:[],r=String(t||"all").toLowerCase(),s=r==="commodity"?"commodities":r,l=(s==="all"?a:a.filter(i=>B(i.type)===s)).slice(0,s==="all"?16:30),c=e.querySelector("#home-markets");if(!l.length){c&&(c.innerHTML=`<p class="pro-empty">${n("market.no_markets_available","No markets available in this desk.")}</p>`);return}ke(e,l),Se(e,l)}async function xe(e){if(!e||document.hidden||e.__homeQuoteRefreshing)return;const t=[...e.querySelectorAll("#home-markets .home-market-card[data-symbol]")];if(!t.length)return;const a=new Map;if(t.slice(0,30).forEach(r=>{const s=String(r.dataset.symbol||"").toUpperCase(),o=B(r.dataset.type||"crypto");s&&(a.has(o)||a.set(o,[]),a.get(o).push(s))}),!!a.size){e.__homeQuoteRefreshing=!0;try{await Promise.all([...a.entries()].map(async([r,s])=>{const o=[...new Set(s)],l=r==="crypto"?18:6;for(let c=0;c<o.length;c+=l){const i=o.slice(c,c+l),u=await k(`/quotes.php?symbols=${encodeURIComponent(i.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist_tick&_=${Date.now()}`,{timeout:r==="crypto"?2200:3e3,retry:0,cacheTtl:250,cache:"no-store"}).catch(()=>null);u?.items?.length&&u.items.forEach(p=>z(e,p,r))}}))}finally{e.__homeQuoteRefreshing=!1}}}function B(e){const t=String(e||"crypto").toLowerCase();return t==="commodity"?"commodities":t==="stock"?"stocks":t==="future"?"futures":t==="fx"?"forex":t}function we(e){return B(e)==="futures"?"perp":"spot"}async function Se(e,t){const a=(t||[]).filter(o=>{if(!(Number(o?.price||o?.q_price||0)>0))return!0;const c=Fe(o);return c==="stale"||c==="unavailable"||c==="cached"});if(!a.length)return;const r=new Map;a.forEach(o=>{const l=String(o.symbol||"").toUpperCase(),c=o.type||"crypto";l&&(r.has(c)||r.set(c,[]),r.get(c).push(l))});const s=[];await Promise.all([...r.entries()].map(async([o,l])=>{const c=[...new Set(l)],i=o==="crypto"?30:8,u=new Set;for(let p=0;p<c.length;p+=i){const d=c.slice(p,p+i),f=await k(`/quotes.php?symbols=${encodeURIComponent(d.join(","))}&type=${encodeURIComponent(o)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:o==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);f?.items?.length&&f.items.forEach(m=>{u.add(String(m.symbol||"").toUpperCase()),z(e,m,o)})}l.forEach(p=>{const d=X(e,p),f=d&&d.querySelector("[data-home-price]")?.textContent!=="--";(!u.has(p)||!f)&&s.push({symbol:p,type:o})})})),Ce(e,s)}async function Ce(e,t){const a=new Map;t.forEach(r=>{!r.symbol||!r.type||(a.has(r.type)||a.set(r.type,[]),a.get(r.type).push(r.symbol))});for(const[r,s]of a.entries()){const o=r==="crypto"?12:2,l=r==="crypto"?12:4,c=[...new Set(s)].slice(0,l),i=[];for(let d=0;d<c.length;d+=o){const f=c.slice(d,d+o),m=await k(`/quotes.php?symbols=${encodeURIComponent(f.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);m?.items?.length&&m.items.forEach(h=>z(e,h,r)),f.forEach(h=>{const b=X(e,h);b&&b.querySelector("[data-home-price]")?.textContent!=="--"||i.push(h)})}const u=r==="crypto"?6:2,p=[...new Set(i)].slice(0,r==="crypto"?6:2);for(let d=0;d<p.length;d+=u){const f=p.slice(d,d+u),m=await k(`/quotes.php?symbols=${encodeURIComponent(f.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);m?.items?.length&&m.items.forEach(h=>z(e,h,r))}}}function z(e,t,a){const r=String(t.symbol||"").toUpperCase(),s=X(e,r);if(!s)return;const o=s.dataset.type||t.type||a,l=Number(t.price||t.q_price||0),c=Number(t.change_pct||t.q_change||0),i=s.querySelector("[data-home-price]"),u=s.querySelector("[data-home-change]");if(i&&l>0){const p=parseFloat(i.dataset.price||"0");if(i.textContent=Y(l,o),i.dataset.price=String(l),p>0&&l!==p){const d=l>p?"animate-price-up":"animate-price-down";i.classList.remove("animate-price-up","animate-price-down"),requestAnimationFrame(()=>{i.classList.add(d),setTimeout(()=>i.classList.remove(d),800)})}}u&&(u.textContent=J(c),u.className=`text-[11px] ${c>=0?"text-buy":"text-sell"}`)}function X(e,t){return[...e.querySelectorAll("[data-symbol]")].find(a=>String(a.dataset.symbol||"").toUpperCase()===String(t||"").toUpperCase())}function Le(e,t){const a=e.symbol||"--";return`<span class="${t}">
    <img src="${$(ve(e,e.type||"crypto"))}" alt="${$(a)}" loading="lazy" data-fallback="initial" />
    <b style="display:none">${v(be(a))}</b>
  </span>`}function ce(e,t){const a=Array.isArray(e?.levels)?e.levels:[],r=t.currentLevel?.id,s=String(t.currentLevel?.level_code||"").toLowerCase(),o=H(t.currentLevel),l=a.length?a:[t.currentLevel,t.nextLevel].filter(Boolean),c=new Map,i=new Set,u=m=>{if(!m||typeof m!="object")return;const h=H(m);h&&i.has(h)||(h&&i.add(h),c.set(h||`level-${c.size}`,m))};l.forEach(u),u(t.currentLevel),u(t.nextLevel);const p=Array.from(c.values()).sort((m,h)=>{const b=W(m)-W(h);return Math.abs(b)>1e-7?b:Number(m.sort_order||0)-Number(h.sort_order||0)}),d=p.findIndex(m=>{if(!m||typeof m!="object")return!1;const h=r&&Number(m.id)===Number(r),b=s&&String(m.level_code||"").toLowerCase()===s,_=o&&H(m)===o;return!!(h||b||_)}),f=[];return p.forEach((m,h)=>{if(!m||typeof m!="object")return;const b=h===d||r&&Number(m.id)===Number(r)||s&&String(m.level_code||"").toLowerCase()===s||o&&H(m)===o,_=d>=0&&h<d,x=W(m),S=b?t.levelProgress:_?100:0,C=m.name||m.name_en||m.level_code||`Tier ${h+1}`,A=t.nextLevel?.name||t.nextLevel?.name_en||"next tier";f.push(Ne({label:b?n("level.current_tier","Current tier"):_?n("level.completed","Completed tier"):n("level.locked","Locked tier"),title:C,sub:b?t.nextRequired>0?`${y(t.remainingToNext)} USDT ${n("level.to_next","to")} ${A}`:n("level.top_active","Top tier permissions are active"):_?n("level.unlocked_completed","Unlocked and completed"):x>0?`${y(x)} USDT ${n("level.required","required")}`:n("level.starter_access","Starter access"),progress:S,state:b?"current":_?"completed":"locked",isCurrent:b,perks:Te(m,qe(C,b,t.mode)),features:m.features||{}}))}),f.join("")}function H(e){return String(e?.id||e?.level_code||e?.name||e?.name_en||"").toLowerCase()}function W(e){return Number(e?.min_deposit_total||e?.min_total_deposit||e?.required_deposit||0)}function Ne({label:e,title:t,sub:a,progress:r,state:s,perks:o,isCurrent:l,features:c}){const i=r==null?null:Math.max(0,Math.min(100,Number(r)||0)),u=Array.isArray(o)?o:[String(o||"")].filter(Boolean),p=c||{},d=[];return p.trading&&d.push({key:"trading",icon:"📈",label:n("feat.trading","Trading")}),p.copy_bot&&d.push({key:"copy_bot",icon:"🤖",label:n("feat.copy_bot","Copy Bot")}),p.contracts&&d.push({key:"contracts",icon:"📋",label:n("feat.contracts","Contracts")}),p.support&&d.push({key:"support",icon:"🎧",label:n("feat.support","Support")}),p.portfolio_manager&&d.push({key:"portfolio_manager",icon:"👔",label:n("feat.portfolio_manager","Manager")}),`<article class="pro-level-rail-card is-${$(s)}"${l?' data-current-level-card="1"':""}>
    <div class="pro-level-card-row"><span>${v(e)}</span>${i==null?"":`<b>${i}%</b>`}</div>
    <strong>${v(t)}</strong>
    <small>${v(a||"")}</small>
    ${i==null?"":`<div class="pro-mini-progress"><i style="width:${i}%"></i></div>`}
    ${d.length?`<div class="pro-level-features">${d.map(f=>`<span class="pro-level-feat ${f.key}" title="${v(f.label)}">${f.icon} <small>${v(f.label)}</small></span>`).join("")}</div>`:""}
    <ul class="pro-level-benefits">
      ${u.slice(0,5).map(f=>`<li>${v(f)}</li>`).join("")}
    </ul>
  </article>`}function Te(e,t){const a=e?.perks||e?.perks_en||e?.features||e?.description||"",r=Array.isArray(t)?t:String(t||"").split("|");if(!a)return r.filter(Boolean);const s=String(a).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),o=s.split(/[\n\r,;|•·]+/).map(l=>l.trim()).filter(Boolean);return(o.length>1?o:[s]).slice(0,5)}function qe(e,t,a){const r=String(e||"").toLowerCase();return r.includes("vip")?["Priority account handling","Highest contract access","Premium copy desk limits"]:r.includes("platinum")?["Advanced copy desk access","Higher contract caps","Priority funding review"]:r.includes("gold")?["Premium copy desk","Higher contract caps","Dedicated account guidance"]:t&&a==="real"?["Live trading enabled","Wallet and funding access","Copy desk eligibility"]:["Market access","Watchlist and trade desk","Level progression benefits"]}function Me(){const e=O(),t=le.map(a=>`
    <option value="${$(a.code)}" ${a.code===e?"selected":""}>${a.flag} ${v(a.name)} (${a.code})</option>
  `).join("");return`<div class="home-fx-converter" aria-label="Local balance converter">
    <label class="home-fx-select-wrap">
      <span>${n("home.local_currency","Local currency")}</span>
      <select id="home-fx-select">${t}</select>
    </label>
    <div class="home-fx-preview">
      <small>${n("home.converted_total","Converted total")}</small>
      <b id="home-fx-total">${y(0)} USDT</b>
      <em id="home-fx-rate">1 USDT = 1 USD</em>
    </div>
    <p id="home-fx-note">${n("home.base_currency_note","Showing account base currency")}</p>
  </div>`}function O(){return E(localStorage.getItem("vp_home_currency")||"USD")}function E(e){const t=String(e||"USD").toUpperCase().replace(/[^A-Z]/g,"").slice(0,3);return le.some(a=>a.code===t)?t:"USD"}function N(e){return["JPY"].includes(e)?0:2}function Ae(){const e=O(),t=g("home.fx")||{};return E(t.code)===e&&Number(t.rate||0)>0?{code:e,rate:Number(t.rate),source:t.source||"",error:!!t.error}:{code:e,rate:1,source:e==="USD"?"base":"",error:!1}}async function oe(e,t=O()){const a=E(t);if(localStorage.setItem("vp_home_currency",a),a==="USD"){w("home.fx",{code:"USD",rate:1,source:"base",updated_at:Math.floor(Date.now()/1e3)}),F(e);return}const r=g("home.fx")||{};E(r.code)===a&&Number(r.rate||0)>0&&F(e);try{const s=await k(`/fx_rate.php?to=${encodeURIComponent(a)}`,{timeout:4e3,retry:1,cacheTtl:36e5}),o=Number(s?.rate||0);o>0?w("home.fx",{code:a,rate:o,source:s.source||"fx",updated_at:Number(s.updated_at||0),error:!1}):w("home.fx",{code:a,rate:Number(r.rate||1),source:s?.source||"fx",updated_at:Number(s?.updated_at||0),error:!0})}catch{w("home.fx",{code:a,rate:Number(r.rate||1),source:r.source||"cached",updated_at:Number(r.updated_at||0),error:!0})}F(e)}function Ee(){const e=P(),t=me.map(a=>`<button type="button" class="home-lang-option${a===e?" is-active":""}" data-home-set-locale="${$(a)}" data-lang="${$(a)}">
      <span>${ee[a]||"🏳️"}</span><b>${v(te[a]||a.toUpperCase())}</b>
    </button>`).join("");return`<div class="home-lang-menu" data-home-lang-menu>
    <button class="home-lang-trigger" type="button" data-home-lang-trigger aria-expanded="false" title="Language">
      <span>${ee[e]||"🏳️"}</span>
      <b>${v(te[e]||e.toUpperCase())}</b>
      <i>${M.chevronDown}</i>
    </button>
    <div class="home-lang-overlay hidden" data-home-lang-overlay></div>
    <div class="home-lang-dropdown hidden" data-home-lang-dropdown>
      <div class="home-lang-dropdown-header">
        <strong>${n("lang.select_language","Select Language")}</strong>
        <button type="button" class="home-lang-close" data-home-lang-close aria-label="Close">✕</button>
      </div>
      ${t}
    </div>
  </div>`}function j(e){const t=e.querySelector("[data-home-lang-dropdown]"),a=e.querySelector("[data-home-lang-overlay]"),r=e.querySelector("[data-home-lang-trigger]");t&&t.classList.add("hidden"),a&&a.classList.add("hidden"),r&&r.setAttribute("aria-expanded","false")}function Re(e,t,a,r=""){const s=e.querySelector("#home-pnl-chart-value"),o=e.querySelector("#home-pnl-spark");s&&(s.textContent=`${y(t)}${r?" "+r:""}`,s.className=t>=0?"text-buy":"text-sell"),o&&(o.innerHTML=ie(t,a))}function ie(e=0,t=0){const a=Number(e||0),r=Number(t||a||1),s=Array.from({length:12},(p,d)=>{const f=Math.sin((d+1)*.9)*Math.max(12,Math.abs(r)*.025);return a*(d/11)+f}),o=Math.min(...s,0),l=Math.max(...s,1),c=Math.max(1,l-o),i=s.map((p,d)=>{const f=5+d*10,m=54-(p-o)/c*44;return`${f.toFixed(1)},${m.toFixed(1)}`}).join(" "),u=a>=0?"var(--buy)":"var(--sell)";return`<svg viewBox="0 0 120 64" role="img" aria-label="PnL total chart" preserveAspectRatio="none">
    <path d="M0 54 H120" class="home-pnl-axis"></path>
    <polyline points="${i}" fill="none" stroke="${u}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
  </svg>`}function Ue(e){return e!=="real"?`<div class="relative min-h-[180px]">
      <div class="flex gap-4 overflow-x-auto pb-3 blur-[4px] opacity-50 pointer-events-none">
        ${Array(4).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
      </div>
      <div class="absolute inset-0 grid place-items-center">
        <div class="card-glass text-center p-6 max-w-sm">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3">${M.lock}</span>
          <strong class="block">Real Account Only</strong>
          <p class="text-muted text-sm mt-1">Switch to Real and verify KYC to copy live signals.</p>
        </div>
      </div>
    </div>`:`<div class="flex gap-4 overflow-x-auto pb-3 snap-x" id="copy-scroller">
    ${Array(3).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
  </div>`}function Z(){const e=g("wallet")||{};return g("mode")==="real"?e.real||{balance:0,available:0,currency:"USDT"}:e.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}function De(){return`<section class="home-kyc-banner">
    <span class="home-kyc-icon">${M.kyc}</span>
    <div>
      <strong>${n("kyc.banner_title","Verify your account")}</strong>
      <p>${n("kyc.banner_body","Your demo workspace is ready. Complete verification to unlock the real account, deposits, withdrawals, levels, copy trading, and contracts.")}</p>
    </div>
    <a href="#/kyc" class="btn-primary btn-sm">${n("earn.open_kyc","Open KYC")}</a>
  </section>`}function K(){return g("mode")!=="real"?{kind:"real",title:n("funding.real_required","Real account required"),body:n("earn.real_required_copy","Copies and contracts are visible in Demo, but activation requires an approved Real account."),action:n("earn.switch_real","Switch to Real")}:Ie()?null:{kind:"kyc",title:n("earn.kyc_required","KYC approval required"),body:n("earn.kyc_required_copy","Submit and approve KYC before copying signals or subscribing to contracts."),action:n("earn.open_kyc","Open KYC")}}function Ie(){return se()}function Pe(e){Q();const t=document.createElement("div");t.className="dialog-backdrop",t.setAttribute("data-home-gate-dialog","1"),t.innerHTML=`<div class="dialog-card">
    <button class="dialog-close" aria-label="${$(n("common.close","Close"))}" data-home-gate-close>${M.close}</button>
    <div class="text-center space-y-3">
      <span class="gate-icon mx-auto">${M.lock}</span>
      <h2 class="text-lg font-bold">${v(e.title)}</h2>
      <p class="text-sm text-muted">${v(e.body)}</p>
      <button class="btn-primary btn-sm" data-home-gate-action="${$(e.kind)}">${v(e.action)}</button>
    </div>
  </div>`,document.body.appendChild(t),t.addEventListener("click",a=>{(a.target===t||a.target.closest("[data-home-gate-close]"))&&Q();const r=a.target.closest("[data-home-gate-action]");r&&(a.preventDefault(),de(r.dataset.homeGateAction||e.kind))})}function Q(){document.querySelector("[data-home-gate-dialog]")?.remove()}function de(e){if(Q(),e==="real"){he("earn");return}location.hash="#/kyc"}function Be(e,t){const a=Number(e||0);return a>0?Y(a,t):"--"}function T(e){const t=Number(e||0);return t>0?t>1e12?Math.floor(t/1e3):Math.floor(t):0}function He(e){const t=Math.max(T(e.provider_updated_at),T(e.provider_ts),T(e.as_of),T(e.updated_at),T(e.cache_updated_at),T(e.received_at),T(e.ingested_at));return t>0?Math.max(0,Math.floor(Date.now()/1e3)-t):null}function je(e){const t=B(e);return t==="crypto"?90:["forex","commodities","futures"].includes(t)?180:["stocks","arab"].includes(t)?15*60:300}function Fe(e){const t=String(e.source||e.provider||"").toLowerCase(),a=String(e.timing_class||"").toLowerCase(),r=e.type||"crypto",s=He(e),o=je(r),l=o*3;return Number(e.price||e.q_price||0)<=0?"unavailable":a==="market_closed"?"closed":s===null||s<=o?"live":a==="stale"||e.is_stale?s<=l?"cached":"stale":e.delayed||a==="delayed"||t.includes("yahoo")?"cached":t.includes("binance")||t.includes("stream")||a==="live"?s<=l?"cached":"stale":"cached"}function ze(e){const t=String(e?.level_code||e?.name_en||"starter").toLowerCase().replace(/[^a-z0-9]+/g,"-"),a=e?.name||e?.name_en||e?.level_code||"Starter";return`<span class="level-badge level-badge--${$(t)}">${v(a)}</span>`}function Oe(e){const t=String(e||"").split("").reduce((a,r)=>a+r.charCodeAt(0),0);return Array.from({length:12},(a,r)=>`<i style="height:${18+(t+r*13)%26}px"></i>`).join("")}function ne(e,t){const a=Number(e||0);return a>0?Y(a,t):"--"}function We(e){return!(Number(e.entry||e.entry_price||0)>0)||!(Number(e.tp1||e.take_profit_1||e.take_profit||0)>0)||!(Number(e.sl||e.stop_loss||0)>0)}function Ge(e){return e.levels_source==="live_derived"?'<p class="text-[10px] text-spread mt-2">Live-derived desk levels</p>':""}function Ke(e){const t=String(e?.bot_name||e?.bot_name_en||"").trim();if(t)return t;const a=String(e?.symbol||e?.market_symbol||"AI").toUpperCase();return`Avalon ${a.replace(/(USDT|USD|_F)$/i,"")||a||"AI"} AI Bot`}function ue(e){const t=String(e||"BUY").toUpperCase();return["BUY","SELL","NEUTRAL"].includes(t)?t:"BUY"}function Qe(e){const t=ue(e);return`<span class="bot-direction-chip is-${t.toLowerCase()}">${v(t)}</span>`}function Ve(e,t){const a=e.clientWidth||e.getBoundingClientRect().width||window.innerWidth||360,r=t?.getBoundingClientRect?.().width||285,s=Math.max(2,Math.round((a-r)/2));return e.style.setProperty("--level-rail-side-pad",`${s}px`),{railW:a,cardW:r,sidePad:s}}function V(e,t=!1){if(!e)return;const a=e.querySelector('[data-current-level-card="1"]');if(!a)return;const r=()=>{Ve(e,a);const s=e.getBoundingClientRect(),o=a.getBoundingClientRect();if(!s.width||!o.width)return;const l=o.left+o.width/2-(s.left+s.width/2),c=e.scrollLeft+l,i=Math.max(0,e.scrollWidth-e.clientWidth),u=Math.max(0,Math.min(i,c));e.scrollTo({left:u,behavior:t?"smooth":"auto"})};setTimeout(r,80),setTimeout(r,350),requestAnimationFrame(()=>setTimeout(r,500))}export{et as cleanup,Ze as mount,Xe as render};
