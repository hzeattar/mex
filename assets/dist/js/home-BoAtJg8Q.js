import{j as _,l as ie,k as S,g as v,v as n,h as k,m as y,e as P,t as ge,c as x,s as w,S as ye,L as re,b as oe,x as _e,q as X,p as Z,n as $e}from"./main-BN41O1Tf.js";import{marketIconPath as ke,marketInitial as xe}from"./marketIcon-D-Yq8Sis.js";let E=null,T=[];const de=[{code:"USD",flag:"🇺🇸",name:"US Dollar"},{code:"EGP",flag:"🇪🇬",name:"Egyptian Pound"},{code:"SAR",flag:"🇸🇦",name:"Saudi Riyal"},{code:"AED",flag:"🇦🇪",name:"UAE Dirham"},{code:"KWD",flag:"🇰🇼",name:"Kuwaiti Dinar"},{code:"QAR",flag:"🇶🇦",name:"Qatari Riyal"},{code:"BHD",flag:"🇧🇭",name:"Bahraini Dinar"},{code:"OMR",flag:"🇴🇲",name:"Omani Rial"},{code:"JOD",flag:"🇯🇴",name:"Jordanian Dinar"},{code:"TRY",flag:"🇹🇷",name:"Turkish Lira"},{code:"EUR",flag:"🇪🇺",name:"Euro"},{code:"GBP",flag:"🇬🇧",name:"British Pound"}];function st(){const e=_("brand")||{},t=ae(),r=(_("portfolio")||{}).metrics||{},s=_("mode")==="real"?"real":"demo",o=Y(),l=_("level")||{},c=pe(l),i=c.currentLevel,p=c.nextLevel,m=c.confirmedTotal,d=c.nextRequired,h=c.remainingToNext,b=c.levelProgress,u=s==="demo"&&!ie(),f=Number(t.balance||t.available||0),g=Number(r.total_balance??f),$=Number(r.available_balance??t.available??g??0),C=Number(r.in_use_balance??t.holds??t.locked??0),N=Number(r.pnl_24_live??0),L=Number(r.pnl_total_live??0),q=V(i,0);return`
    <div class="pro-dashboard animate-fade-in pro-dashboard-compact">
      ${u?Oe():""}
      <section class="pro-card pro-balance-overview" aria-label="Account overview">
        <div class="pro-balance-topline">
          <div class="pro-hero-kicker">
            <span class="badge-accent">${v(e.name||"MEX Group")}</span>
            <span class="pro-pill ${s==="real"?"is-live":"is-demo"}"><i></i>${s==="real"?n("mode.real_workspace","Real workspace"):n("mode.demo_workspace","Demo workspace")}</span>
            ${s==="real"?Xe(i):""}
          </div>
          <div class="pro-balance-actions">
            ${Fe()}
            <a href="#/trade" class="btn-primary">${n("nav.trade","Trade")}</a>
          </div>
        </div>
        <div class="pro-balance-main-row">
          <div class="pro-balance-total">
            <div class="pro-balance-total-head">
              <span>${n("balance.total","Total balance")}</span>
              <button class="pro-pnl-chart-btn" id="home-pnl-chart-toggle" type="button" aria-expanded="false" title="${k(n("balance.pnl_total_chart","PnL total chart"))}">
                ${S.trade}
              </button>
            </div>
            <strong id="home-balance-total" data-count-to="${g}">${y(g)}</strong>
            <small id="home-balance-currency">${v(t.currency||"USDT")}</small>
            ${Be()}
            <div class="home-pnl-chart-card hidden" id="home-pnl-chart-card">
              <div><span>${n("balance.pnl_total_live","PnL total live")}</span><b id="home-pnl-chart-value" class="text-buy">${y(0)}</b></div>
              <div class="home-pnl-spark" id="home-pnl-spark">${he(0)}</div>
            </div>
          </div>
          <div class="pro-balance-metrics">
            <span><small>${n("balance.pnl_24_live","PnL 24 live")}</small><b id="home-pnl-24" class="${N>=0?"text-buy":"text-sell"}">${y(N)}</b></span>
            <span><small>${n("balance.pnl_total_live","PnL total live")}</small><b id="home-pnl-total" class="${L>=0?"text-buy":"text-sell"}">${y(L)}</b></span>
            <span><small>${n("balance.available","Available balance")}</small><b id="home-balance-available">${y($)}</b></span>
            <span><small>${n("balance.in_use","In use balance")}</small><b id="home-balance-inuse">${y(C)}</b></span>
          </div>
        </div>
      </section>

      ${s==="real"?`<section class="pro-card pro-level-scroll-card">
        <div class="pro-section-head">
          <div><span>${n("level.program","Level program")}</span><h2>${v(q)} ${n("level.progress_suffix","progress")}</h2></div>
          <b class="pro-level-percent" id="home-level-percent">${b}%</b>
        </div>
        <div class="pro-progress"><i id="home-level-progress" style="width:${b}%"></i></div>
        <div class="pro-level-rail" aria-label="Level benefits and next tiers">
          ${ue(l,{currentLevel:i,nextLevel:p,confirmedTotal:m,remainingToNext:h,nextRequired:d,levelProgress:b,mode:s})}
        </div>
      </section>`:""}

      ${s==="real"?`<section class="pro-card pro-card-section pro-earn-rail-card blur-gate ${o?"blur-active":""}">
        <div class="pro-section-head">
          <div><span>${n("earn.desk","Earn desk")}</span><h2>${n("earn.copy_contracts","Copy trading & contracts")}</h2><p>${n("earn.dashboard_copy","Swipe through live signals, recommended copies and level-linked contracts.")}</p></div>
          ${o?`<button type="button" class="btn-ghost btn-sm" data-home-gate-trigger>${n("common.view_all","View all")}</button>`:`<a href="#/invest" class="btn-ghost btn-sm">${n("common.view_all","View all")}</a>`}
        </div>
        <div class="blur-gate-content relative" id="home-copy-section">
          ${Ge(s)}
        </div>
        ${o?`<div class="blur-gate-overlay">
          <button type="button" class="gate-card home-gate-card" data-home-gate-trigger>
            <span class="gate-icon">${S.lock}</span>
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
              ${[["all",n("common.all","All")],["crypto",n("markets.crypto","Crypto")],["forex",n("markets.forex","Forex")],["stocks",n("markets.stocks","Stocks")],["commodities",n("markets.commodities","Commodities")],["futures",n("markets.futures","Futures")],["arab",n("markets.arab","Arab")]].map(([D,R],be)=>`<button class="${be===0?"active":""}" data-home-tab="${D}">${v(R)}</button>`).join("")}
            </div>
            <div class="pro-market-grid" id="home-markets">
              ${Array(8).fill(0).map(()=>'<div class="skeleton h-20 rounded-xl"></div>').join("")}
            </div>
          </section>
        </div>
      </section>
    </div>`}function lt(e){I(e,_("portfolio")),requestAnimationFrame(()=>{const o=e.querySelector(".pro-level-rail");o&&J(o,!1)});const t=()=>{const o=e.querySelector(".pro-level-rail");o&&J(o,!1)};window.addEventListener("resize",t),T.push(()=>window.removeEventListener("resize",t));const a=o=>{if(o.target.tagName==="IMG"&&o.target.dataset.fallback==="initial"){o.target.style.display="none";const l=o.target.nextElementSibling;l&&(l.style.display="grid")}};e.addEventListener("error",a,!0),T.push(()=>e.removeEventListener("error",a,!0)),setTimeout(()=>{e.querySelectorAll("#home-markets > *").forEach((o,l)=>{o.classList.add("stagger-item"),o.style.animationDelay=`${l*.05+.1}s`})},50);const r=o=>{if(o.target.closest("[data-home-gate-trigger]")){o.preventDefault();const u=Y();u&&Ke(u);return}const c=o.target.closest("[data-home-gate-action]");if(c){o.preventDefault(),fe(c.dataset.homeGateAction||Y()?.kind);return}const i=o.target.closest("[data-home-lang-trigger]");if(i){o.preventDefault(),o.stopPropagation();const u=i.closest("[data-home-lang-menu]"),f=u?.querySelector("[data-home-lang-dropdown]"),g=u?.querySelector("[data-home-lang-overlay]"),$=f?.classList.toggle("hidden")===!1;g?.classList.toggle("hidden",!$),i.setAttribute("aria-expanded",$?"true":"false");return}if(o.target.closest("[data-home-lang-close]")){o.preventDefault(),o.stopPropagation(),z(e);return}const m=o.target.closest("[data-home-set-locale]");if(m){o.preventDefault(),o.stopPropagation();const u=m.dataset.homeSetLocale||m.dataset.lang;z(e),u&&u!==P()&&(m.disabled=!0,m.classList.add("is-loading"),ge(u));return}o.target.closest("[data-home-lang-menu]")||z(e);const d=o.target.closest("#home-pnl-chart-toggle");if(d){o.preventDefault();const f=e.querySelector("#home-pnl-chart-card")?.classList.toggle("hidden")===!1;d.setAttribute("aria-expanded",f?"true":"false");return}const h=o.target.closest("[data-home-tab]");if(!h)return;const b=h.dataset.homeTab;e.__homeMarketTab=b,e.querySelectorAll("[data-home-tab]").forEach(u=>{u.classList.toggle("active",u===h)}),Q(e,b)};e.addEventListener("click",r),T.push(()=>e.removeEventListener("click",r));const s=o=>{const l=o.target.closest("#home-fx-select");if(!l)return;const c=U(l.value);localStorage.setItem("vp_home_currency",c),le(e,c)};e.addEventListener("change",s),T.push(()=>e.removeEventListener("change",s)),E&&document.removeEventListener("click",E),E=o=>{e.contains(o.target)||z(e)},document.addEventListener("click",E),ne(e),le(e,K()),e.__homeRefreshTimer=setInterval(()=>{ne(e)},6e3),T.push(()=>{e.__homeRefreshTimer&&(clearInterval(e.__homeRefreshTimer),e.__homeRefreshTimer=null)}),e.__homeQuoteRefreshTimer=setInterval(()=>{Ne(e)},2500),T.push(()=>{e.__homeQuoteRefreshTimer&&(clearInterval(e.__homeQuoteRefreshTimer),e.__homeQuoteRefreshTimer=null)})}function ct(){E&&(document.removeEventListener("click",E),E=null),T.forEach(e=>{try{e()}catch{}}),T=[]}async function ne(e){const t=_("mode")==="real"?"real":"demo";x("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:6e3}).then(a=>{(a?.real||a?.demo)&&(w("wallet",{real:a.real||{},demo:a.demo||{}}),I(e))}).catch(()=>I(e)),x(`/user/level.php?lang=${encodeURIComponent(P())}`,{timeout:0,retry:1,cacheTtl:3e4}).then(a=>{a?.ok!==!1&&(a?.current||Array.isArray(a?.levels))&&(w("level",a),Se(e))}).catch(()=>null),x("/markets.php?scope=home&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=50",{timeout:0,retry:1,cacheTtl:7e3}).then(a=>{if(a&&Array.isArray(a.items)&&a.items.length){e.__homeAllMarkets=a.items;const r=e.__homeMarketTab||"all";Q(e,r)}else throw new Error("empty_markets")}).catch(()=>{x("/markets.php?scope=home&supported=1&lite=1&limit=30",{timeout:8e3,retry:0,cacheTtl:12e3}).then(a=>{if(a&&Array.isArray(a.items)&&a.items.length)e.__homeAllMarkets=a.items,Q(e,e.__homeMarketTab||"all");else{const r=e.querySelector("#home-markets");r&&(r.innerHTML=`<p class="pro-empty">${n("market.reconnecting","Markets are reconnecting...")}</p>`)}}).catch(()=>{const a=e.querySelector("#home-markets");a&&(a.innerHTML=`<p class="pro-empty">${n("market.reconnecting","Markets are reconnecting...")}</p>`)})}),x(`/trade/portfolio.php?fast=1&mode=${t}`,{timeout:0,retry:1,cacheTtl:5e3}).then(a=>{a?.ok!==!1&&(w("portfolio",a),I(e,a))}).catch(()=>I(e)),Promise.allSettled([t==="real"?x(`/signals.php?bot=1&home=1&fast=1&lang=${encodeURIComponent(P())}`,{timeout:0,retry:1,cacheTtl:12e3}).catch(()=>null):Promise.resolve(null),x(`/invest/plans.php?kind=contract&home=1&lang=${encodeURIComponent(P())}`,{timeout:0,retry:1,cacheTtl:3e4}).catch(()=>null)]).then(([a,r])=>{const s=a.status==="fulfilled"?a.value:null,o=r.status==="fulfilled"?r.value:null;se(e,s?.items||[],o?.items||[])}).catch(()=>se(e,[],[]))}function I(e,t=_("portfolio")){const a=ae();_("mode");const r=t?.metrics||{},s=Number(a.balance||a.available||0),o=Number(r.total_balance??s),l=Number(r.available_balance??a.available??s??0),c=Number(r.in_use_balance??a.holds??a.locked??0),i=Number(r.pnl_24_live??0),p=Number(r.pnl_total_live??0);e.__homeBalanceValues={total:o,available:l,inUse:c,pnl24:i,pnlTotal:p,currency:a.currency||"USDT"},G(e)}function G(e){const t=e.__homeBalanceValues||{},a=Number(t.total||0),r=Number(t.available||0),s=Number(t.inUse||0),o=Number(t.pnl24||0),l=Number(t.pnlTotal||0),c=t.currency||ae().currency||"USDT",i=je(),p=U(i.code),m=Number(i.rate||0)>0?Number(i.rate):1,d=R=>Number(R||0)*m,h=p==="USD"?c:p,b=e.querySelector("#home-balance-total");b&&(b.dataset.countTo=String(a),b.textContent=y(d(a),M(p)));const u=e.querySelector("#home-balance-currency");u&&(u.textContent=p==="USD"?c:`${p} - base ${c}`);const f=e.querySelector("#home-balance-available");f&&(f.textContent=`${y(d(r),M(p))} ${h}`);const g=e.querySelector("#home-balance-inuse");g&&(g.textContent=`${y(d(s),M(p))} ${h}`);const $=e.querySelector("#home-pnl-24");$&&($.textContent=`${y(d(o),M(p))} ${h}`,$.className=o>=0?"text-buy":"text-sell");const C=e.querySelector("#home-pnl-total");C&&(C.textContent=`${y(d(l),M(p))} ${h}`,C.className=l>=0?"text-buy":"text-sell");const N=e.querySelector("#home-fx-total");N&&(N.textContent=`${y(d(a),M(p))} ${h}`);const L=e.querySelector("#home-fx-rate");L&&(L.textContent=p==="USD"?`1 ${c} = 1 USD`:`1 ${c} ~= ${y(m,M(p))} ${p}`);const q=e.querySelector("#home-fx-note");if(q){const R=i.source?` - ${i.source}`:"";q.textContent=p==="USD"?n("home.base_currency_note","Showing account base currency"):`${n("home.converted_estimate","Converted estimate")}${R}`,q.classList.toggle("is-error",!!i.error)}const D=e.querySelector("#home-fx-select");D&&D.value!==p&&(D.value=p),ze(e,d(l),d(o),h)}function Se(e){const t=_("level")||{},a=pe(t),r=a.currentLevel,s=a.nextLevel,o=a.confirmedTotal,l=a.nextRequired,c=a.remainingToNext,i=a.levelProgress,p=e.querySelector(".pro-level-scroll-card .pro-section-head h2");p&&(p.textContent=`${V(r,0)} ${n("level.progress_suffix","progress")}`);const m=e.querySelector("#home-level-percent");m&&(m.textContent=`${i}%`);const d=e.querySelector("#home-level-progress");d&&(d.style.width=`${i}%`);const h=e.querySelector(".pro-level-rail");h&&(h.innerHTML=ue(t,{currentLevel:r,nextLevel:s,confirmedTotal:o,remainingToNext:c,nextRequired:l,levelProgress:i,mode:_("mode")==="real"?"real":"demo"}),setTimeout(()=>J(h),120))}function se(e,t=[],a=[]){const r=e.querySelector("#home-copy-section");if(!r)return;const s=_("mode")==="real"?"real":"demo",o=(t||[]).slice(0,6).map(we).join(""),l=Ce(a||[]);r.innerHTML=`
    <div class="pro-earn-rail-group">
      <div class="pro-rail-label-row">
        <span>${n("earn.copy_desk","Copy desk")}</span>
        <a href="#/invest" class="btn-ghost btn-xs">${n("earn.open_earn","Open Earn")}</a>
      </div>
      <div class="pro-earn-rail" id="copy-scroller">
        ${o||Le(s)}
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
    </div>`}function we(e){const t=ve(e.direction),a=e.symbol||e.market_symbol||"--",r=at(e);return`<article class="copy-card pro-earn-card">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2 min-w-0">
        <span class="avalon-mini-mark" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg></span>
        <div class="min-w-0">
          <strong class="text-xs truncate block">${v(r)}</strong>
          <span class="text-[10px] text-muted truncate block">${v(a)} - ${n("bot.ai_copy_basket","AI copy basket")}</span>
        </div>
      </div>
      ${rt(t)}
    </div>
    <div class="copy-card__quote py-2">
      <span class="status-chip ${Number(e.live_price||0)>0?"status-chip-live":"status-chip-locked"}">${Number(e.live_price||0)>0?n("market.live","LIVE"):n("funding.ready","READY")}</span>
      <strong>${Number(e.live_price||0)>0?"$"+y(e.live_price,e.type==="forex"?5:2):"--"}</strong>
      <span class="${Number(e.live_change_pct||0)>=0?"text-buy":"text-sell"}">${Z(e.live_change_pct||0)}</span>
    </div>
    <div class="copy-card__perf mt-2">
      <div class="copy-card__perf-item"><small>${n("trade.entry","Entry")}</small><strong>${ce(e.entry||e.entry_price,e.type)}</strong></div>
      <div class="copy-card__perf-item ${Number(e.win_rate||0)>=60?"pos":""}"><small>${n("bot.win_rate","Win Rate")}</small><strong>${Number(e.win_rate||0)>0?Number(e.win_rate).toFixed(0)+"%":"--"}</strong></div>
      <div class="copy-card__perf-item pos"><small>TP</small><strong>${ce(e.tp1||e.take_profit_1||e.take_profit,e.type)}</strong></div>
    </div>
    ${et(e)?`<p class="text-[10px] text-muted mt-2">${n("bot.awaiting_desk_levels","Awaiting desk levels")}</p>`:tt(e)}
    <a href="#/invest" class="btn-primary btn-sm w-full mt-3">${n("bot.open_copy_desk","Open copy desk")}</a>
  </article>`}function Ce(e){const t=(e||[]).slice(0,4);return t.length?t.map(r=>{const s=r.required_level?.name||r.required_level?.name_en||r.level_name||n("level.starter","Starter"),o=Number(r.cycle_roi_percent||r.roi_percent||r.rate||0),l=Number(r.duration_days||r.term_days||0);return`<article class="pro-contract-card pro-earn-card">
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
    </article>`}function Le(e){return`<article class="copy-card pro-earn-card pro-earn-empty-card">
    <div class="pro-contract-badge">${n("earn.copy_desk","Copy desk")}</div>
    <strong>${e==="real"?n("bot.no_active_signals","No active signals yet"):n("earn.real_account_only","Real account only")}</strong>
    <small>${e==="real"?n("bot.desk_empty_copy","The desk will appear here once admin publishes live signals."):n("bot.switch_real_verify_copy","Switch to Real and verify KYC to copy live signals.")}</small>
    <a href="#/invest" class="btn-primary btn-sm w-full mt-3">${n("earn.open_earn","Open Earn")}</a>
  </article>`}function Te(e,t){const a=e.querySelector("#home-markets");a&&(a.innerHTML=t.map(r=>`
    <button class="home-market-card" data-symbol="${k(r.symbol)}" data-type="${k(r.type||"crypto")}">
      ${Ee(r,"home-market-icon")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <div class="font-semibold text-sm truncate">${v(r.symbol)}</div>
        </div>
        <div class="text-[11px] text-muted truncate">${v(r.name||r.symbol)}</div>
        <div class="mini-spark" aria-hidden="true">${Ze(r.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold" data-home-price data-price="${k(Number(r.price||r.q_price||0))}">${Qe(r.price||r.q_price,r.type)}</div>
        <div class="text-[11px] ${Number(r.change_pct||r.q_change||0)>=0?"text-buy":"text-sell"}" data-home-change>${Z(r.change_pct||r.q_change||0)}</div>
      </div>
    </button>
  `).join(""),a.querySelectorAll("[data-symbol]").forEach(r=>{r.addEventListener("click",()=>{const s=String(r.dataset.symbol||"").toUpperCase(),o=j(r.dataset.type||"crypto"),l=qe(o);if(s){w("symbol",s),w("type",o),w("market",l),w("activeQuote",null);try{localStorage.setItem("vp_symbol",s),localStorage.setItem("vp_type",o),localStorage.setItem("vp_market",l)}catch{}$e("trade",{symbol:s,type:o,market:l})}})}))}function Q(e,t="all"){const a=Array.isArray(e.__homeAllMarkets)?e.__homeAllMarkets:[],r=String(t||"all").toLowerCase(),s=r==="commodity"?"commodities":r,l=(s==="all"?a:a.filter(i=>j(i.type)===s)).slice(0,s==="all"?16:30),c=e.querySelector("#home-markets");if(!l.length){c&&(c.innerHTML=`<p class="pro-empty">${n("market.no_markets_available","No markets available in this desk.")}</p>`);return}Te(e,l),Me(e,l)}async function Ne(e){if(!e||document.hidden||e.__homeQuoteRefreshing)return;const t=[...e.querySelectorAll("#home-markets .home-market-card[data-symbol]")];if(!t.length)return;const a=new Map;if(t.slice(0,30).forEach(r=>{const s=String(r.dataset.symbol||"").toUpperCase(),o=j(r.dataset.type||"crypto");s&&(a.has(o)||a.set(o,[]),a.get(o).push(s))}),!!a.size){e.__homeQuoteRefreshing=!0;try{await Promise.all([...a.entries()].map(async([r,s])=>{const o=[...new Set(s)],l=r==="crypto"?18:6;for(let c=0;c<o.length;c+=l){const i=o.slice(c,c+l),p=await x(`/quotes.php?symbols=${encodeURIComponent(i.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist_tick&_=${Date.now()}`,{timeout:r==="crypto"?2200:3e3,retry:0,cacheTtl:250,cache:"no-store"}).catch(()=>null);p?.items?.length&&p.items.forEach(m=>O(e,m,r))}}))}finally{e.__homeQuoteRefreshing=!1}}}function j(e){const t=String(e||"crypto").toLowerCase();return t==="commodity"?"commodities":t==="stock"?"stocks":t==="future"?"futures":t==="fx"?"forex":t}function qe(e){return j(e)==="futures"?"perp":"spot"}async function Me(e,t){const a=(t||[]).filter(o=>{if(!(Number(o?.price||o?.q_price||0)>0))return!0;const c=Je(o);return c==="stale"||c==="unavailable"||c==="cached"});if(!a.length)return;const r=new Map;a.forEach(o=>{const l=String(o.symbol||"").toUpperCase(),c=o.type||"crypto";l&&(r.has(c)||r.set(c,[]),r.get(c).push(l))});const s=[];await Promise.all([...r.entries()].map(async([o,l])=>{const c=[...new Set(l)],i=o==="crypto"?30:8,p=new Set;for(let m=0;m<c.length;m+=i){const d=c.slice(m,m+i),h=await x(`/quotes.php?symbols=${encodeURIComponent(d.join(","))}&type=${encodeURIComponent(o)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:o==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);h?.items?.length&&h.items.forEach(b=>{p.add(String(b.symbol||"").toUpperCase()),O(e,b,o)})}l.forEach(m=>{const d=ee(e,m),h=d&&d.querySelector("[data-home-price]")?.textContent!=="--";(!p.has(m)||!h)&&s.push({symbol:m,type:o})})})),Ae(e,s)}async function Ae(e,t){const a=new Map;t.forEach(r=>{!r.symbol||!r.type||(a.has(r.type)||a.set(r.type,[]),a.get(r.type).push(r.symbol))});for(const[r,s]of a.entries()){const o=r==="crypto"?12:2,l=r==="crypto"?12:4,c=[...new Set(s)].slice(0,l),i=[];for(let d=0;d<c.length;d+=o){const h=c.slice(d,d+o),b=await x(`/quotes.php?symbols=${encodeURIComponent(h.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);b?.items?.length&&b.items.forEach(u=>O(e,u,r)),h.forEach(u=>{const f=ee(e,u);f&&f.querySelector("[data-home-price]")?.textContent!=="--"||i.push(u)})}const p=r==="crypto"?6:2,m=[...new Set(i)].slice(0,r==="crypto"?6:2);for(let d=0;d<m.length;d+=p){const h=m.slice(d,d+p),b=await x(`/quotes.php?symbols=${encodeURIComponent(h.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);b?.items?.length&&b.items.forEach(u=>O(e,u,r))}}}function O(e,t,a){const r=String(t.symbol||"").toUpperCase(),s=ee(e,r);if(!s)return;const o=s.dataset.type||t.type||a,l=Number(t.price||t.q_price||0),c=Number(t.change_pct||t.q_change||0),i=s.querySelector("[data-home-price]"),p=s.querySelector("[data-home-change]");if(i&&l>0){const m=parseFloat(i.dataset.price||"0");if(i.textContent=X(l,o),i.dataset.price=String(l),m>0&&l!==m){const d=l>m?"animate-price-up":"animate-price-down";i.classList.remove("animate-price-up","animate-price-down"),requestAnimationFrame(()=>{i.classList.add(d),setTimeout(()=>i.classList.remove(d),800)})}}p&&(p.textContent=Z(c),p.className=`text-[11px] ${c>=0?"text-buy":"text-sell"}`)}function ee(e,t){return[...e.querySelectorAll("[data-symbol]")].find(a=>String(a.dataset.symbol||"").toUpperCase()===String(t||"").toUpperCase())}function Ee(e,t){const a=e.symbol||"--";return`<span class="${t}">
    <img src="${k(ke(e,e.type||"crypto"))}" alt="${k(a)}" loading="lazy" data-fallback="initial" />
    <b style="display:none">${v(xe(a))}</b>
  </span>`}function ue(e,t){const a=Array.isArray(e?.levels)?e.levels:[],r=t.currentLevel?.id,s=String(t.currentLevel?.level_code||"").toLowerCase(),o=F(t.currentLevel),l=a.filter(H),c=l.length?l:[t.currentLevel,t.nextLevel].filter(Boolean),i=new Map,p=new Set,m=u=>{if(!u||typeof u!="object"||!H(u))return;const f=F(u);f&&p.has(f)||(f&&p.add(f),i.set(f||`level-${i.size}`,u))};c.forEach(m),m(t.currentLevel),m(t.nextLevel);const d=Array.from(i.values()).sort((u,f)=>{const g=B(u)-B(f);return Math.abs(g)>1e-7?g:Number(u.sort_order||0)-Number(f.sort_order||0)}),h=d.findIndex(u=>{if(!u||typeof u!="object")return!1;const f=r&&Number(u.id)===Number(r),g=s&&String(u.level_code||"").toLowerCase()===s,$=o&&F(u)===o;return!!(f||g||$)}),b=[];return d.forEach((u,f)=>{if(!u||typeof u!="object")return;const g=f===h||r&&Number(u.id)===Number(r)||s&&String(u.level_code||"").toLowerCase()===s||o&&F(u)===o,$=h>=0&&f<h,C=B(u),N=g?t.levelProgress:$?100:0,L=V(u,f),q=t.nextLevel?V(t.nextLevel,f+1):n("level.next_tier","next tier");b.push(Ie({label:g?n("level.current_tier","Current tier"):$?n("level.completed","Completed tier"):n("level.locked","Locked tier"),title:L,sub:g?t.nextRequired>0?`${y(t.remainingToNext)} USDT ${n("level.to_next","to")} ${q}`:n("level.top_active","Top tier permissions are active"):$?n("level.unlocked_completed","Unlocked and completed"):C>0?Number(t.confirmedTotal)>0?`${y(Math.max(0,C-Number(t.confirmedTotal)))} USDT ${n("level.left_to_unlock","left to unlock")}`:`${y(C)} USDT ${n("level.required","required")}`:n("level.starter_access","Starter access"),progress:N,state:g?"current":$?"completed":"locked",isCurrent:g,perks:Pe(u,He(L,g,t.mode)),features:u.features||{}}))}),b.join("")}function pe(e){const a=(Array.isArray(e?.levels)?e.levels:[]).filter(H),r=e.current||{},s=e.next||{},o=Number(e.confirmed_deposit_total||e.total_deposits||e.deposit_total||0),l=s&&H(s)?s:a.find(d=>B(d)>o+1e-9)||null,c=r&&H(r)?r:a.reduce((d,h)=>{const b=B(h);return o+1e-9>=b?h:d},null)||a[0]||De(),i=Number(l?.min_deposit_total||l?.min_total_deposit||l?.required_deposit||0),p=Math.max(0,i-o),m=i>0?Math.min(100,Math.round(o/i*100)):o>0?100:0;return{currentLevel:c,nextLevel:l,confirmedTotal:o,nextRequired:i,remainingToNext:p,levelProgress:m}}function H(e){if(!e||typeof e!="object")return!1;const t=[e.level_code,e.name,e.name_en,e.name_ar,e.name_ru].map(me).filter(Boolean);return t.length?!t.some(te):!1}function F(e){return String(e?.id||e?.level_code||e?.name||e?.name_en||e?.name_ar||"").toLowerCase()}function B(e){return Number(e?.min_deposit_total||e?.min_total_deposit||e?.required_deposit||0)}function V(e,t){if(!e||typeof e!="object")return n("level.starter","Starter");const a=String(e.name||e.name_en||e.name_ar||e.name_ru||"").trim();if(a&&!te(a))return a;const r=Ue(e.level_code);return r||(t===0?n("level.starter","Starter"):`${n("level.label","Level")} ${t+1}`)}function me(e){return String(e||"").toLowerCase().replace(/[^a-z0-9]+/g,"")}function te(e){const t=me(e);return t==="tier1"||t==="level1"||/^(tier|level)[0-9]+$/.test(t)}function Ue(e){const t=String(e||"").trim();return!t||te(t)?"":t.replace(/[_-]+/g," ").replace(/\b\w/g,a=>a.toUpperCase())}function De(){return{id:0,level_code:"starter",name:n("level.starter","Starter"),name_en:"Starter",min_deposit_total:0,sort_order:0,features:{trading:!0}}}function Re(e){const t=e||{},a=[];return t.trading&&a.push({key:"trading",icon:S.trade,label:n("feat.trading","Trading")}),t.copy_bot&&a.push({key:"copy_bot",icon:S.refresh,label:n("feat.copy_bot","Copy Bot")}),t.contracts&&a.push({key:"contracts",icon:S.earn,label:n("feat.contracts","Contracts")}),t.support&&a.push({key:"support",icon:S.support,label:n("feat.support","Support")}),t.portfolio_manager&&a.push({key:"portfolio_manager",icon:S.account,label:n("feat.portfolio_manager","Manager")}),a}function Ie({label:e,title:t,sub:a,progress:r,state:s,perks:o,isCurrent:l,features:c}){const i=r==null?null:Math.max(0,Math.min(100,Number(r)||0)),p=Array.isArray(o)?o:[String(o||"")].filter(Boolean),m=Re(c);return`<article class="pro-level-rail-card is-${k(s)}"${l?' data-current-level-card="1"':""}>
    <div class="pro-level-card-row">
      <span class="pro-level-status">${v(e)}</span>
      ${i==null?"":`<b>${i}%</b>`}
    </div>
    <strong>${v(t)}</strong>
    <small>${v(a||"")}</small>
    ${i==null?"":`<div class="pro-mini-progress"><i style="width:${i}%"></i></div>`}
    ${m.length?`<div class="pro-level-features">${m.map(d=>`<span class="pro-level-feat ${d.key}" title="${k(d.label)}">${d.icon}<small>${v(d.label)}</small></span>`).join("")}</div>`:""}
    <ul class="pro-level-benefits">
      ${p.slice(0,6).map(d=>`<li>${v(d)}</li>`).join("")}
    </ul>
  </article>`}function Pe(e,t){const a=e?.perks||e?.perks_en||e?.features||e?.description||"",r=Array.isArray(t)?t:String(t||"").split("|");if(!a)return r.filter(Boolean);const s=String(a).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),o=s.split(/[\n\r,;|•·]+/).map(l=>l.trim()).filter(Boolean);return(o.length>1?o:[s]).slice(0,6)}function He(e,t,a){const r=String(e||"").toLowerCase();return r.includes("vip")?["Priority account handling","Highest contract access","Premium copy desk limits"]:r.includes("platinum")?["Advanced copy desk access","Higher contract caps","Priority funding review"]:r.includes("gold")?["Premium copy desk","Higher contract caps","Dedicated account guidance"]:t&&a==="real"?["Live trading enabled","Wallet and funding access","Copy desk eligibility"]:["Market access","Watchlist and trade desk","Level progression benefits"]}function Be(){const e=K(),t=de.map(a=>`
    <option value="${k(a.code)}" ${a.code===e?"selected":""}>${a.flag} ${v(a.name)} (${a.code})</option>
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
  </div>`}function K(){return U(localStorage.getItem("vp_home_currency")||"USD")}function U(e){const t=String(e||"USD").toUpperCase().replace(/[^A-Z]/g,"").slice(0,3);return de.some(a=>a.code===t)?t:"USD"}function M(e){return["JPY"].includes(e)?0:2}function je(){const e=K(),t=_("home.fx")||{};return U(t.code)===e&&Number(t.rate||0)>0?{code:e,rate:Number(t.rate),source:t.source||"",error:!!t.error}:{code:e,rate:1,source:e==="USD"?"base":"",error:!1}}async function le(e,t=K()){const a=U(t);if(localStorage.setItem("vp_home_currency",a),a==="USD"){w("home.fx",{code:"USD",rate:1,source:"base",updated_at:Math.floor(Date.now()/1e3)}),G(e);return}const r=_("home.fx")||{};U(r.code)===a&&Number(r.rate||0)>0&&G(e);try{const s=await x(`/fx_rate.php?to=${encodeURIComponent(a)}`,{timeout:4e3,retry:1,cacheTtl:36e5}),o=Number(s?.rate||0);o>0?w("home.fx",{code:a,rate:o,source:s.source||"fx",updated_at:Number(s.updated_at||0),error:!1}):w("home.fx",{code:a,rate:Number(r.rate||1),source:s?.source||"fx",updated_at:Number(s?.updated_at||0),error:!0})}catch{w("home.fx",{code:a,rate:Number(r.rate||1),source:r.source||"cached",updated_at:Number(r.updated_at||0),error:!0})}G(e)}function Fe(){const e=P(),t=ye.map(a=>`<button type="button" class="home-lang-option${a===e?" is-active":""}" data-home-set-locale="${k(a)}" data-lang="${k(a)}">
      <span>${re[a]||"🏳️"}</span><b>${v(oe[a]||a.toUpperCase())}</b>
    </button>`).join("");return`<div class="home-lang-menu" data-home-lang-menu>
    <button class="home-lang-trigger" type="button" data-home-lang-trigger aria-expanded="false" title="Language">
      <span>${re[e]||"🏳️"}</span>
      <b>${v(oe[e]||e.toUpperCase())}</b>
      <i>${S.chevronDown}</i>
    </button>
    <div class="home-lang-overlay hidden" data-home-lang-overlay></div>
    <div class="home-lang-dropdown hidden" data-home-lang-dropdown>
      <div class="home-lang-dropdown-header">
        <strong>${n("lang.select_language","Select Language")}</strong>
        <button type="button" class="home-lang-close" data-home-lang-close aria-label="Close">✕</button>
      </div>
      ${t}
    </div>
  </div>`}function z(e){const t=e.querySelector("[data-home-lang-dropdown]"),a=e.querySelector("[data-home-lang-overlay]"),r=e.querySelector("[data-home-lang-trigger]");t&&t.classList.add("hidden"),a&&a.classList.add("hidden"),r&&r.setAttribute("aria-expanded","false")}function ze(e,t,a,r=""){const s=e.querySelector("#home-pnl-chart-value"),o=e.querySelector("#home-pnl-spark");s&&(s.textContent=`${y(t)}${r?" "+r:""}`,s.className=t>=0?"text-buy":"text-sell"),o&&(o.innerHTML=he(t,a))}function he(e=0,t=0){const a=Number(e||0),r=Number(t||a||1),s=Array.from({length:12},(m,d)=>{const h=Math.sin((d+1)*.9)*Math.max(12,Math.abs(r)*.025);return a*(d/11)+h}),o=Math.min(...s,0),l=Math.max(...s,1),c=Math.max(1,l-o),i=s.map((m,d)=>{const h=5+d*10,b=54-(m-o)/c*44;return`${h.toFixed(1)},${b.toFixed(1)}`}).join(" "),p=a>=0?"var(--buy)":"var(--sell)";return`<svg viewBox="0 0 120 64" role="img" aria-label="PnL total chart" preserveAspectRatio="none">
    <path d="M0 54 H120" class="home-pnl-axis"></path>
    <polyline points="${i}" fill="none" stroke="${p}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
  </svg>`}function Ge(e){return e!=="real"?`<div class="relative min-h-[180px]">
      <div class="flex gap-4 overflow-x-auto pb-3 blur-[4px] opacity-50 pointer-events-none">
        ${Array(4).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
      </div>
      <div class="absolute inset-0 grid place-items-center">
        <div class="card-glass text-center p-6 max-w-sm">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3">${S.lock}</span>
          <strong class="block">Real Account Only</strong>
          <p class="text-muted text-sm mt-1">Switch to Real and verify KYC to copy live signals.</p>
        </div>
      </div>
    </div>`:`<div class="flex gap-4 overflow-x-auto pb-3 snap-x" id="copy-scroller">
    ${Array(3).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
  </div>`}function ae(){const e=_("wallet")||{};return _("mode")==="real"?e.real||{balance:0,available:0,currency:"USDT"}:e.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}function Oe(){return`<section class="home-kyc-banner">
    <span class="home-kyc-icon">${S.kyc}</span>
    <div>
      <strong>${n("kyc.banner_title","Verify your account")}</strong>
      <p>${n("kyc.banner_body","Your demo workspace is ready. Complete verification to unlock the real account, deposits, withdrawals, levels, copy trading, and contracts.")}</p>
    </div>
    <a href="#/kyc" class="btn-primary btn-sm">${n("earn.open_kyc","Open KYC")}</a>
  </section>`}function Y(){return _("mode")!=="real"?{kind:"real",title:n("funding.real_required","Real account required"),body:n("earn.real_required_copy","Copies and contracts are visible in Demo, but activation requires an approved Real account."),action:n("earn.switch_real","Switch to Real")}:Ve()?null:{kind:"kyc",title:n("earn.kyc_required","KYC approval required"),body:n("earn.kyc_required_copy","Submit and approve KYC before copying signals or subscribing to contracts."),action:n("earn.open_kyc","Open KYC")}}function Ve(){return ie()}function Ke(e){W();const t=document.createElement("div");t.className="dialog-backdrop",t.setAttribute("data-home-gate-dialog","1"),t.innerHTML=`<div class="dialog-card">
    <button class="dialog-close" aria-label="${k(n("common.close","Close"))}" data-home-gate-close>${S.close}</button>
    <div class="text-center space-y-3">
      <span class="gate-icon mx-auto">${S.lock}</span>
      <h2 class="text-lg font-bold">${v(e.title)}</h2>
      <p class="text-sm text-muted">${v(e.body)}</p>
      <button class="btn-primary btn-sm" data-home-gate-action="${k(e.kind)}">${v(e.action)}</button>
    </div>
  </div>`,document.body.appendChild(t),t.addEventListener("click",a=>{(a.target===t||a.target.closest("[data-home-gate-close]"))&&W();const r=a.target.closest("[data-home-gate-action]");r&&(a.preventDefault(),fe(r.dataset.homeGateAction||e.kind))})}function W(){document.querySelector("[data-home-gate-dialog]")?.remove()}function fe(e){if(W(),e==="real"){_e("earn");return}location.hash="#/kyc"}function Qe(e,t){const a=Number(e||0);return a>0?X(a,t):"--"}function A(e){const t=Number(e||0);return t>0?t>1e12?Math.floor(t/1e3):Math.floor(t):0}function Ye(e){const t=Math.max(A(e.provider_updated_at),A(e.provider_ts),A(e.as_of),A(e.updated_at),A(e.cache_updated_at),A(e.received_at),A(e.ingested_at));return t>0?Math.max(0,Math.floor(Date.now()/1e3)-t):null}function We(e){const t=j(e);return t==="crypto"?90:["forex","commodities","futures"].includes(t)?180:["stocks","arab"].includes(t)?15*60:300}function Je(e){const t=String(e.source||e.provider||"").toLowerCase(),a=String(e.timing_class||"").toLowerCase(),r=e.type||"crypto",s=Ye(e),o=We(r),l=o*3;return Number(e.price||e.q_price||0)<=0?"unavailable":a==="market_closed"?"closed":s===null||s<=o?"live":a==="stale"||e.is_stale?s<=l?"cached":"stale":e.delayed||a==="delayed"||t.includes("yahoo")?"cached":t.includes("binance")||t.includes("stream")||a==="live"?s<=l?"cached":"stale":"cached"}function Xe(e){const t=String(e?.level_code||e?.name_en||"starter").toLowerCase().replace(/[^a-z0-9]+/g,"-"),a=e?.name||e?.name_en||e?.level_code||"Starter";return`<span class="level-badge level-badge--${k(t)}">${v(a)}</span>`}function Ze(e){const t=String(e||"").split("").reduce((a,r)=>a+r.charCodeAt(0),0);return Array.from({length:12},(a,r)=>`<i style="height:${18+(t+r*13)%26}px"></i>`).join("")}function ce(e,t){const a=Number(e||0);return a>0?X(a,t):"--"}function et(e){return!(Number(e.entry||e.entry_price||0)>0)||!(Number(e.tp1||e.take_profit_1||e.take_profit||0)>0)||!(Number(e.sl||e.stop_loss||0)>0)}function tt(e){return e.levels_source==="live_derived"?'<p class="text-[10px] text-spread mt-2">Live-derived desk levels</p>':""}function at(e){const t=String(e?.bot_name||e?.bot_name_en||"").trim();if(t)return t;const a=String(e?.symbol||e?.market_symbol||"AI").toUpperCase();return`Avalon ${a.replace(/(USDT|USD|_F)$/i,"")||a||"AI"} AI Bot`}function ve(e){const t=String(e||"BUY").toUpperCase();return["BUY","SELL","NEUTRAL"].includes(t)?t:"BUY"}function rt(e){const t=ve(e);return`<span class="bot-direction-chip is-${t.toLowerCase()}">${v(t)}</span>`}function J(e,t=!1){if(!e)return;const a=e.querySelector('[data-current-level-card="1"]');if(!a)return;const r=()=>{if(!e.clientWidth||!a.getBoundingClientRect().width)return;const s=a.offsetLeft-Number.parseFloat(getComputedStyle(e).paddingInlineStart||"0"),o=Math.max(0,e.scrollWidth-e.clientWidth),l=Math.max(0,Math.min(o,s));e.scrollTo({left:l,behavior:t?"smooth":"auto"})};r(),setTimeout(r,120),setTimeout(r,400)}export{ct as cleanup,lt as mount,st as render};
