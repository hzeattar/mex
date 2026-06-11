import{j as _,k as V,g as b,t as n,h as S,m as y,e as E,r as ce,c as x,s as N,S as ie,L as J,b as X,p as Y,n as de,o as G}from"./main-DveN8zZZ.js";import{marketIconPath as ue,marketInitial as pe}from"./marketIcon-D-Yq8Sis.js";let q=null,D=[];const ae=[{code:"USD",flag:"🇺🇸",name:"US Dollar"},{code:"EGP",flag:"🇪🇬",name:"Egyptian Pound"},{code:"SAR",flag:"🇸🇦",name:"Saudi Riyal"},{code:"AED",flag:"🇦🇪",name:"UAE Dirham"},{code:"KWD",flag:"🇰🇼",name:"Kuwaiti Dinar"},{code:"QAR",flag:"🇶🇦",name:"Qatari Riyal"},{code:"BHD",flag:"🇧🇭",name:"Bahraini Dinar"},{code:"OMR",flag:"🇴🇲",name:"Omani Rial"},{code:"JOD",flag:"🇯🇴",name:"Jordanian Dinar"},{code:"TRY",flag:"🇹🇷",name:"Turkish Lira"},{code:"EUR",flag:"🇪🇺",name:"Euro"},{code:"GBP",flag:"🇬🇧",name:"British Pound"}];function je(){const e=_("brand")||{},a=Q(),r=(_("portfolio")||{}).metrics||{},o=_("mode")==="real"?"real":"demo",s=_("level")||{},l=s.current||{},c=s.next||{},p=Number(s.confirmed_deposit_total||s.total_deposits||s.deposit_total||0),d=Number(c.min_deposit_total||c.min_total_deposit||c.required_deposit||0),m=Math.max(0,d-p),i=d>0?Math.min(100,Math.round(p/d*100)):p>0?100:0,h=Number(a.balance||a.available||0),v=Number(r.total_balance??h),u=Number(r.available_balance??a.available??v??0),f=Number(r.in_use_balance??a.holds??a.locked??0),$=Number(r.pnl_24_live??0),g=Number(r.pnl_total_live??0),k=l.name||l.name_en||l.level_code||"Starter";return c.name||c.name_en,`
    <div class="pro-dashboard animate-fade-in pro-dashboard-compact">
      <section class="pro-card pro-balance-overview" aria-label="Account overview">
        <div class="pro-balance-topline">
          <div class="pro-hero-kicker">
            <span class="badge-accent">${b(e.name||"MEX Group")}</span>
            <span class="pro-pill ${o==="real"?"is-live":"is-demo"}"><i></i>${o==="real"?n("mode.real_workspace","Real workspace"):n("mode.demo_workspace","Demo workspace")}</span>
            ${Ue(l)}
          </div>
          <div class="pro-balance-actions">
            ${Ne()}
            <a href="#/trade" class="btn-primary">${n("nav.trade","Trade")}</a>
          </div>
        </div>
        <div class="pro-balance-main-row">
          <div class="pro-balance-total">
            <div class="pro-balance-total-head">
              <span>${n("balance.total","Total balance")}</span>
              <button class="pro-pnl-chart-btn" id="home-pnl-chart-toggle" type="button" aria-expanded="false" title="${S(n("balance.pnl_total_chart","PnL total chart"))}">
                ${V.trade}
              </button>
            </div>
            <strong id="home-balance-total" data-count-to="${v}">${y(v)}</strong>
            <small id="home-balance-currency">${b(a.currency||"USDT")}</small>
            ${Ce()}
            <div class="home-pnl-chart-card hidden" id="home-pnl-chart-card">
              <div><span>${n("balance.pnl_total_live","PnL total live")}</span><b id="home-pnl-chart-value" class="text-buy">${y(0)}</b></div>
              <div class="home-pnl-spark" id="home-pnl-spark">${oe(0)}</div>
            </div>
          </div>
          <div class="pro-balance-metrics">
            <span><small>${n("balance.pnl_24_live","PnL 24 live")}</small><b id="home-pnl-24" class="${$>=0?"text-buy":"text-sell"}">${y($)}</b></span>
            <span><small>${n("balance.pnl_total_live","PnL total live")}</small><b id="home-pnl-total" class="${g>=0?"text-buy":"text-sell"}">${y(g)}</b></span>
            <span><small>${n("balance.available","Available balance")}</small><b id="home-balance-available">${y(u)}</b></span>
            <span><small>${n("balance.in_use","In use balance")}</small><b id="home-balance-inuse">${y(f)}</b></span>
          </div>
        </div>
      </section>

      <section class="pro-card pro-level-scroll-card">
        <div class="pro-section-head">
          <div><span>${n("level.program","Level program")}</span><h2>${b(k)} ${n("level.progress_suffix","progress")}</h2></div>
          <b class="pro-level-percent" id="home-level-percent">${i}%</b>
        </div>
        <div class="pro-progress"><i id="home-level-progress" style="width:${i}%"></i></div>
        <div class="pro-level-rail" aria-label="Level benefits and next tiers">
          ${re(s,{currentLevel:l,nextLevel:c,remainingToNext:m,nextRequired:d,levelProgress:i,mode:o})}
        </div>
      </section>

      <section class="pro-card pro-card-section pro-earn-rail-card blur-gate ${o!=="real"?"blur-active":""}">
        <div class="pro-section-head">
          <div><span>${n("earn.desk","Earn desk")}</span><h2>${n("earn.copy_contracts","Copy trading & contracts")}</h2><p>${n("earn.dashboard_copy","Swipe through live signals, recommended copies and level-linked contracts.")}</p></div>
          <a href="#/invest" class="btn-ghost btn-sm">${n("common.view_all","View all")}</a>
        </div>
        <div class="blur-gate-content relative" id="home-copy-section">
          ${Te(o)}
        </div>
        ${o!=="real"?`<div class="blur-gate-overlay"><span class="badge">${n("earn.real_account_only","Real account only")}</span></div>`:""}
      </section>

      <section class="pro-main-layout pro-main-layout-single">
        <div class="pro-main-stack">
          <section class="pro-card pro-card-section">
            <div class="pro-section-head">
              <div><span>${n("nav.markets","Markets")}</span><h2>${n("market.live_watchlist","Live watchlist")}</h2></div>
              <a href="#/trade" class="btn-ghost btn-sm">${n("nav.trade","Trade")}</a>
            </div>
            <div class="pro-market-tabs" id="home-market-tabs">
              ${[["all",n("common.all","All")],["crypto",n("markets.crypto","Crypto")],["forex",n("markets.forex","Forex")],["stocks",n("markets.stocks","Stocks")],["commodities",n("markets.commodities","Commodities")],["futures",n("markets.futures","Futures")],["arab",n("markets.arab","Arab")]].map(([C,T],w)=>`<button class="${w===0?"active":""}" data-home-tab="${C}">${b(T)}</button>`).join("")}
            </div>
            <div class="pro-market-grid" id="home-markets">
              ${Array(8).fill(0).map(()=>'<div class="skeleton h-20 rounded-xl"></div>').join("")}
            </div>
          </section>
        </div>
      </section>
    </div>`}function Fe(e){U(e,_("portfolio")),requestAnimationFrame(()=>{const o=e.querySelector(".pro-level-rail");o&&le(o,!1)});const a=o=>{if(o.target.tagName==="IMG"&&o.target.dataset.fallback==="initial"){o.target.style.display="none";const s=o.target.nextElementSibling;s&&(s.style.display="grid")}};e.addEventListener("error",a,!0),D.push(()=>e.removeEventListener("error",a,!0)),setTimeout(()=>{e.querySelectorAll("#home-markets > *").forEach((o,s)=>{o.classList.add("stagger-item"),o.style.animationDelay=`${s*.05+.1}s`})},50);const t=o=>{const s=o.target.closest("[data-home-lang-trigger]");if(s){o.preventDefault(),o.stopPropagation();const h=s.closest("[data-home-lang-menu]")?.querySelector("[data-home-lang-dropdown]")?.classList.toggle("hidden")===!1;s.setAttribute("aria-expanded",h?"true":"false");return}const l=o.target.closest("[data-home-set-locale]");if(l){o.preventDefault(),o.stopPropagation();const m=l.dataset.homeSetLocale||l.dataset.lang;F(e),m&&m!==E()&&(l.disabled=!0,l.classList.add("is-loading"),ce(m));return}o.target.closest("[data-home-lang-menu]")||F(e);const c=o.target.closest("#home-pnl-chart-toggle");if(c){o.preventDefault();const i=e.querySelector("#home-pnl-chart-card")?.classList.toggle("hidden")===!1;c.setAttribute("aria-expanded",i?"true":"false");return}const p=o.target.closest("[data-home-tab]");if(!p)return;const d=p.dataset.homeTab;e.__homeMarketTab=d,e.querySelectorAll("[data-home-tab]").forEach(m=>{m.classList.toggle("active",m===p)}),O(e,d)};e.addEventListener("click",t),D.push(()=>e.removeEventListener("click",t));const r=o=>{const s=o.target.closest("#home-fx-select");if(!s)return;const l=M(s.value);localStorage.setItem("vp_home_currency",l),ee(e,l)};e.addEventListener("change",r),D.push(()=>e.removeEventListener("change",r)),q&&document.removeEventListener("click",q),q=o=>{e.contains(o.target)||F(e)},document.addEventListener("click",q),me(e),ee(e,I())}function Oe(){q&&(document.removeEventListener("click",q),q=null),D.forEach(e=>{try{e()}catch{}}),D=[]}async function me(e){const a=_("mode")==="real"?"real":"demo";x("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:6e3}).then(t=>{(t?.real||t?.demo)&&(N("wallet",{real:t.real||{},demo:t.demo||{}}),U(e))}).catch(()=>U(e)),x(`/user/level.php?lang=${encodeURIComponent(E())}`,{timeout:0,retry:1,cacheTtl:3e4}).then(t=>{t?.ok!==!1&&(t?.current||Array.isArray(t?.levels))&&(N("level",t),he(e))}).catch(()=>null),x("/markets.php?scope=home&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=50",{timeout:0,retry:1,cacheTtl:15e3}).then(t=>{if(t&&Array.isArray(t.items)&&t.items.length){e.__homeAllMarkets=t.items;const r=e.__homeMarketTab||"all";O(e,r)}else throw new Error("empty_markets")}).catch(()=>{x("/markets.php?scope=home&supported=1&lite=1&limit=30",{timeout:8e3,retry:0,cacheTtl:3e4}).then(t=>{if(t&&Array.isArray(t.items)&&t.items.length)e.__homeAllMarkets=t.items,O(e,e.__homeMarketTab||"all");else{const r=e.querySelector("#home-markets");r&&(r.innerHTML=`<p class="pro-empty">${n("market.reconnecting","Markets are reconnecting...")}</p>`)}}).catch(()=>{const t=e.querySelector("#home-markets");t&&(t.innerHTML=`<p class="pro-empty">${n("market.reconnecting","Markets are reconnecting...")}</p>`)})}),x(`/trade/portfolio.php?fast=1&mode=${a}`,{timeout:0,retry:1,cacheTtl:5e3}).then(t=>{t?.ok!==!1&&(N("portfolio",t),U(e,t))}).catch(()=>U(e)),Promise.allSettled([a==="real"?x(`/signals.php?bot=1&home=1&fast=1&lang=${encodeURIComponent(E())}`,{timeout:0,retry:1,cacheTtl:12e3}).catch(()=>null):Promise.resolve(null),x(`/invest/plans.php?kind=contract&home=1&lang=${encodeURIComponent(E())}`,{timeout:0,retry:1,cacheTtl:3e4}).catch(()=>null)]).then(([t,r])=>{const o=t.status==="fulfilled"?t.value:null,s=r.status==="fulfilled"?r.value:null;Z(e,o?.items||[],s?.items||[])}).catch(()=>Z(e,[],[]))}function U(e,a=_("portfolio")){const t=Q();_("mode");const r=a?.metrics||{},o=Number(t.balance||t.available||0),s=Number(r.total_balance??o),l=Number(r.available_balance??t.available??o??0),c=Number(r.in_use_balance??t.holds??t.locked??0),p=Number(r.pnl_24_live??0),d=Number(r.pnl_total_live??0);e.__homeBalanceValues={total:s,available:l,inUse:c,pnl24:p,pnlTotal:d,currency:t.currency||"USDT"},R(e)}function R(e){const a=e.__homeBalanceValues||{},t=Number(a.total||0),r=Number(a.available||0),o=Number(a.inUse||0),s=Number(a.pnl24||0),l=Number(a.pnlTotal||0),c=a.currency||Q().currency||"USDT",p=Le(),d=M(p.code),m=Number(p.rate||0)>0?Number(p.rate):1,i=B=>Number(B||0)*m,h=d==="USD"?c:d,v=e.querySelector("#home-balance-total");v&&(v.dataset.countTo=String(t),v.textContent=y(i(t),L(d)));const u=e.querySelector("#home-balance-currency");u&&(u.textContent=d==="USD"?c:`${d} - base ${c}`);const f=e.querySelector("#home-balance-available");f&&(f.textContent=`${y(i(r),L(d))} ${h}`);const $=e.querySelector("#home-balance-inuse");$&&($.textContent=`${y(i(o),L(d))} ${h}`);const g=e.querySelector("#home-pnl-24");g&&(g.textContent=`${y(i(s),L(d))} ${h}`,g.className=s>=0?"text-buy":"text-sell");const k=e.querySelector("#home-pnl-total");k&&(k.textContent=`${y(i(l),L(d))} ${h}`,k.className=l>=0?"text-buy":"text-sell");const C=e.querySelector("#home-fx-total");C&&(C.textContent=`${y(i(t),L(d))} ${h}`);const T=e.querySelector("#home-fx-rate");T&&(T.textContent=d==="USD"?`1 ${c} = 1 USD`:`1 ${c} ~= ${y(m,L(d))} ${d}`);const w=e.querySelector("#home-fx-note");if(w){const B=p.source?` - ${p.source}`:"";w.textContent=d==="USD"?n("home.base_currency_note","Showing account base currency"):`${n("home.converted_estimate","Converted estimate")}${B}`,w.classList.toggle("is-error",!!p.error)}const A=e.querySelector("#home-fx-select");A&&A.value!==d&&(A.value=d),qe(e,i(l),i(s),h)}function he(e){const a=_("level")||{},t=a.current||{},r=a.next||{},o=Number(a.confirmed_deposit_total||a.total_deposits||a.deposit_total||0),s=Number(r.min_deposit_total||r.min_total_deposit||r.required_deposit||0),l=Math.max(0,s-o),c=s>0?Math.min(100,Math.round(o/s*100)):o>0?100:0,p=e.querySelector(".pro-level-scroll-card .pro-section-head h2");p&&(p.textContent=`${t.name||t.name_en||t.level_code||"Starter"} ${n("level.progress_suffix","progress")}`);const d=e.querySelector("#home-level-percent");d&&(d.textContent=`${c}%`);const m=e.querySelector("#home-level-progress");m&&(m.style.width=`${c}%`);const i=e.querySelector(".pro-level-rail");i&&(i.innerHTML=re(a,{currentLevel:t,nextLevel:r,remainingToNext:l,nextRequired:s,levelProgress:c,mode:_("mode")==="real"?"real":"demo"}),requestAnimationFrame(()=>le(i,!0)))}function Z(e,a=[],t=[]){const r=e.querySelector("#home-copy-section");if(!r)return;const o=_("mode")==="real"?"real":"demo",s=(a||[]).slice(0,6).map(ve).join(""),l=fe(t||[]);r.innerHTML=`
    <div class="pro-earn-rail-group">
      <div class="pro-rail-label-row">
        <span>${n("earn.copy_desk","Copy desk")}</span>
        <a href="#/invest" class="btn-ghost btn-xs">${n("earn.open_earn","Open Earn")}</a>
      </div>
      <div class="pro-earn-rail" id="copy-scroller">
        ${s||be(o)}
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
    </div>`}function ve(e){const a=se(e.direction),t=e.symbol||e.market_symbol||"--",r=Pe(e);return`<article class="copy-card pro-earn-card">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2 min-w-0">
        <span class="avalon-mini-mark" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg></span>
        <div class="min-w-0">
          <strong class="text-xs truncate block">${b(r)}</strong>
          <span class="text-[10px] text-muted truncate block">${b(t)} - ${n("bot.ai_copy_basket","AI copy basket")}</span>
        </div>
      </div>
      ${Ie(a)}
    </div>
    <div class="copy-card__quote py-2">
      <span class="status-chip ${Number(e.live_price||0)>0?"status-chip-live":"status-chip-locked"}">${Number(e.live_price||0)>0?n("market.live","LIVE"):n("funding.ready","READY")}</span>
      <strong>${Number(e.live_price||0)>0?"$"+y(e.live_price,e.type==="forex"?5:2):"--"}</strong>
      <span class="${Number(e.live_change_pct||0)>=0?"text-buy":"text-sell"}">${Y(e.live_change_pct||0)}</span>
    </div>
    <div class="copy-card__perf mt-2">
      <div class="copy-card__perf-item"><small>${n("trade.entry","Entry")}</small><strong>${te(e.entry||e.entry_price,e.type)}</strong></div>
      <div class="copy-card__perf-item ${Number(e.win_rate||0)>=60?"pos":""}"><small>${n("bot.win_rate","Win Rate")}</small><strong>${Number(e.win_rate||0)>0?Number(e.win_rate).toFixed(0)+"%":"--"}</strong></div>
      <div class="copy-card__perf-item pos"><small>TP</small><strong>${te(e.tp1||e.take_profit_1||e.take_profit,e.type)}</strong></div>
    </div>
    ${De(e)?`<p class="text-[10px] text-muted mt-2">${n("bot.awaiting_desk_levels","Awaiting desk levels")}</p>`:Re(e)}
    <a href="#/invest" class="btn-primary btn-sm w-full mt-3">${n("bot.open_copy_desk","Open copy desk")}</a>
  </article>`}function fe(e){const a=(e||[]).slice(0,4);return a.length?a.map(r=>{const o=r.required_level?.name||r.required_level?.name_en||r.level_name||n("level.starter","Starter"),s=Number(r.cycle_roi_percent||r.roi_percent||r.rate||0),l=Number(r.duration_days||r.term_days||0);return`<article class="pro-contract-card pro-earn-card">
      <div class="pro-contract-badge">${n("earn.contract","Contract")}</div>
      <strong>${b(r.name||r.name_en||n("earn.level_contract","Level contract"))}</strong>
      <small>${l>0?`${l} ${n("earn.day_term","day term")}`:n("earn.flexible_term","Flexible term")} - ${n("level.label","Level")}: ${b(o)}</small>
      <div class="pro-contract-rate"><span>${n("earn.target_return","Target return")}</span><b>${s>0?s.toFixed(2)+"%":n("earn.managed","Managed")}</b></div>
      <a href="#/invest" class="btn-ghost btn-sm w-full mt-3">${n("earn.view_contract","View contract")}</a>
    </article>`}).join(""):`<article class="pro-contract-card pro-earn-card pro-earn-empty-card">
      <div class="pro-contract-badge">${n("earn.contract","Contract")}</div>
      <strong>${n("earn.no_contracts","No contracts available currently.")}</strong>
      <small>${n("earn.check_back","Check back later for new contract offers.")}</small>
      <a href="#/invest" class="btn-ghost btn-sm w-full mt-3">${n("earn.view_contract","View contract")}</a>
    </article>`}function be(e){return`<article class="copy-card pro-earn-card pro-earn-empty-card">
    <div class="pro-contract-badge">${n("earn.copy_desk","Copy desk")}</div>
    <strong>${e==="real"?n("bot.no_active_signals","No active signals yet"):n("earn.real_account_only","Real account only")}</strong>
    <small>${e==="real"?n("bot.desk_empty_copy","The desk will appear here once admin publishes live signals."):n("bot.switch_real_verify_copy","Switch to Real and verify KYC to copy live signals.")}</small>
    <a href="#/invest" class="btn-primary btn-sm w-full mt-3">${n("earn.open_earn","Open Earn")}</a>
  </article>`}function ye(e,a){const t=e.querySelector("#home-markets");t&&(t.innerHTML=a.map(r=>`
    <button class="home-market-card" data-symbol="${S(r.symbol)}" data-type="${S(r.type||"crypto")}">
      ${xe(r,"home-market-icon")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <div class="font-semibold text-sm truncate">${b(r.symbol)}</div>
          ${Ae(r)}
        </div>
        <div class="text-[11px] text-muted truncate">${b(r.name||r.symbol)}</div>
        <div class="mini-spark" aria-hidden="true">${Ee(r.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold" data-home-price>${Me(r.price||r.q_price,r.type)}</div>
        <div class="text-[11px] ${Number(r.change_pct||r.q_change||0)>=0?"text-buy":"text-sell"}" data-home-change>${Y(r.change_pct||r.q_change||0)}</div>
        <div class="text-[9px] text-muted uppercase mt-1" data-home-source>${P(r)}</div>
      </div>
    </button>
  `).join(""),t.querySelectorAll("[data-symbol]").forEach(r=>{r.addEventListener("click",()=>de("trade",{symbol:r.dataset.symbol,type:r.dataset.type}))}))}function O(e,a="all"){const t=Array.isArray(e.__homeAllMarkets)?e.__homeAllMarkets:[],r=String(a||"all").toLowerCase(),o=r==="commodity"?"commodities":r,l=(o==="all"?t:t.filter(p=>ge(p.type)===o)).slice(0,o==="all"?16:30),c=e.querySelector("#home-markets");if(!l.length){c&&(c.innerHTML=`<p class="pro-empty">${n("market.no_markets_available","No markets available in this desk.")}</p>`);return}ye(e,l),_e(e,l)}function ge(e){const a=String(e||"crypto").toLowerCase();return a==="commodity"?"commodities":a==="stock"?"stocks":a==="future"?"futures":a==="fx"?"forex":a}async function _e(e,a){const t=(a||[]).filter(s=>{if(!(Number(s?.price||s?.q_price||0)>0))return!0;const c=W(s);return c==="stale"||c==="unavailable"});if(!t.length)return;const r=new Map;t.forEach(s=>{const l=String(s.symbol||"").toUpperCase(),c=s.type||"crypto";l&&(r.has(c)||r.set(c,[]),r.get(c).push(l))});const o=[];await Promise.all([...r.entries()].map(async([s,l])=>{const c=[...new Set(l)],p=s==="crypto"?30:8,d=new Set;for(let m=0;m<c.length;m+=p){const i=c.slice(m,m+p),h=await x(`/quotes.php?symbols=${encodeURIComponent(i.join(","))}&type=${encodeURIComponent(s)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:s==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);h?.items?.length&&h.items.forEach(v=>{d.add(String(v.symbol||"").toUpperCase()),z(e,v,s)})}l.forEach(m=>{const i=K(e,m),h=i&&i.querySelector("[data-home-price]")?.textContent!=="--";(!d.has(m)||!h)&&o.push({symbol:m,type:s})})})),$e(e,o)}async function $e(e,a){const t=new Map;a.forEach(r=>{!r.symbol||!r.type||(t.has(r.type)||t.set(r.type,[]),t.get(r.type).push(r.symbol))});for(const[r,o]of t.entries()){const s=r==="crypto"?12:2,l=r==="crypto"?12:4,c=[...new Set(o)].slice(0,l),p=[];for(let i=0;i<c.length;i+=s){const h=c.slice(i,i+s),v=await x(`/quotes.php?symbols=${encodeURIComponent(h.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);v?.items?.length&&v.items.forEach(u=>z(e,u,r)),h.forEach(u=>{const f=K(e,u);f&&f.querySelector("[data-home-price]")?.textContent!=="--"||p.push(u)})}const d=r==="crypto"?6:2,m=[...new Set(p)].slice(0,r==="crypto"?6:2);for(let i=0;i<m.length;i+=d){const h=m.slice(i,i+d),v=await x(`/quotes.php?symbols=${encodeURIComponent(h.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);v?.items?.length&&v.items.forEach(u=>z(e,u,r))}}}function z(e,a,t){const r=String(a.symbol||"").toUpperCase(),o=K(e,r);if(!o)return;const s=o.dataset.type||a.type||t,l=Number(a.price||a.q_price||0),c=Number(a.change_pct||a.q_change||0),p=o.querySelector("[data-home-price]"),d=o.querySelector("[data-home-change]"),m=o.querySelector("[data-home-source]");if(p&&l>0){const h=parseFloat(p.dataset.price||"0");if(p.textContent=G(l,s),p.dataset.price=String(l),h>0&&l!==h){const v=l>h?"animate-price-up":"animate-price-down";p.classList.remove("animate-price-up","animate-price-down"),requestAnimationFrame(()=>{p.classList.add(v),setTimeout(()=>p.classList.remove(v),800)})}}d&&(d.textContent=Y(c),d.className=`text-[11px] ${c>=0?"text-buy":"text-sell"}`),m&&l>0&&(m.textContent=P(a));const i=o.querySelector("[data-quote-chip]");i&&l>0&&(i.className=`status-chip ${ne(a)}`,i.textContent=P(a))}function K(e,a){return[...e.querySelectorAll("[data-symbol]")].find(t=>String(t.dataset.symbol||"").toUpperCase()===String(a||"").toUpperCase())}function xe(e,a){const t=e.symbol||"--";return`<span class="${a}">
    <img src="${S(ue(e,e.type||"crypto"))}" alt="${S(t)}" loading="lazy" data-fallback="initial" />
    <b style="display:none">${b(pe(t))}</b>
  </span>`}function re(e,a){const t=Array.isArray(e?.levels)?e.levels:[],r=a.currentLevel?.id,o=String(a.currentLevel?.level_code||"").toLowerCase(),s=H(a.currentLevel),l=t.length?t:[a.currentLevel,a.nextLevel].filter(Boolean),c=new Map,p=new Set,d=u=>{if(!u||typeof u!="object")return;const f=H(u);f&&p.has(f)||(f&&p.add(f),c.set(f||`level-${c.size}`,u))};l.forEach(d),d(a.currentLevel),d(a.nextLevel);const m=Array.from(c.values()).sort((u,f)=>{const $=j(u)-j(f);return Math.abs($)>1e-7?$:Number(u.sort_order||0)-Number(f.sort_order||0)}),i=m.findIndex(u=>{if(!u||typeof u!="object")return!1;const f=r&&Number(u.id)===Number(r),$=o&&String(u.level_code||"").toLowerCase()===o,g=s&&H(u)===s;return!!(f||$||g)}),h=[],v=[];i>=0&&v.push({lvl:m[i],index:i,rel:"current"});for(let u=i+1;u<m.length;u++)v.push({lvl:m[u],index:u,rel:"after"});for(let u=i-1;u>=0;u--)v.push({lvl:m[u],index:u,rel:"before"});return v.forEach(({lvl:u,index:f,rel:$})=>{if(!u||typeof u!="object")return;const g=$==="current",k=i>=0&&f<i,C=j(u),T=g?a.levelProgress:k?100:0,w=u.name||u.name_en||u.level_code||`Tier ${f+1}`,A=a.nextLevel?.name||a.nextLevel?.name_en||"next tier";h.push(ke({label:g?n("level.current_tier","Current tier"):k?n("level.completed","Completed tier"):n("level.locked","Locked tier"),title:w,sub:g?a.nextRequired>0?`${y(a.remainingToNext)} USDT ${n("level.to_next","to")} ${A}`:n("level.top_active","Top tier permissions are active"):k?n("level.unlocked_completed","Unlocked and completed"):C>0?`${y(C)} USDT ${n("level.required","required")}`:n("level.starter_access","Starter access"),progress:T,state:g?"current":k?"completed":"locked",isCurrent:g,perks:Se(u,we(w,g,a.mode))}))}),h.join("")}function H(e){return String(e?.id||e?.level_code||e?.name||e?.name_en||"").toLowerCase()}function j(e){return Number(e?.min_deposit_total||e?.min_total_deposit||e?.required_deposit||0)}function ke({label:e,title:a,sub:t,progress:r,state:o,perks:s,isCurrent:l}){const c=r==null?null:Math.max(0,Math.min(100,Number(r)||0)),p=Array.isArray(s)?s:[String(s||"")].filter(Boolean);return`<article class="pro-level-rail-card is-${S(o)}"${l?' data-current-level-card="1"':""}>
    <div class="pro-level-card-row"><span>${b(e)}</span>${c==null?"":`<b>${c}%</b>`}</div>
    <strong>${b(a)}</strong>
    <small>${b(t||"")}</small>
    ${c==null?"":`<div class="pro-mini-progress"><i style="width:${c}%"></i></div>`}
    <ul class="pro-level-benefits">
      ${p.slice(0,5).map(d=>`<li>${b(d)}</li>`).join("")}
    </ul>
  </article>`}function Se(e,a){const t=e?.perks||e?.perks_en||e?.features||e?.description||"",r=Array.isArray(a)?a:String(a||"").split("|");if(!t)return r.filter(Boolean);const o=String(t).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),s=o.split(/[\n\r,;|•·]+/).map(l=>l.trim()).filter(Boolean);return(s.length>1?s:[o]).slice(0,5)}function we(e,a,t){const r=String(e||"").toLowerCase();return r.includes("vip")?["Priority account handling","Highest contract access","Premium copy desk limits"]:r.includes("platinum")?["Advanced copy desk access","Higher contract caps","Priority funding review"]:r.includes("gold")?["Premium copy desk","Higher contract caps","Dedicated account guidance"]:a&&t==="real"?["Live trading enabled","Wallet and funding access","Copy desk eligibility"]:["Market access","Watchlist and trade desk","Level progression benefits"]}function Ce(){const e=I(),a=ae.map(t=>`
    <option value="${S(t.code)}" ${t.code===e?"selected":""}>${t.flag} ${b(t.name)} (${t.code})</option>
  `).join("");return`<div class="home-fx-converter" aria-label="Local balance converter">
    <label class="home-fx-select-wrap">
      <span>${n("home.local_currency","Local currency")}</span>
      <select id="home-fx-select">${a}</select>
    </label>
    <div class="home-fx-preview">
      <small>${n("home.converted_total","Converted total")}</small>
      <b id="home-fx-total">${y(0)} USDT</b>
      <em id="home-fx-rate">1 USDT = 1 USD</em>
    </div>
    <p id="home-fx-note">${n("home.base_currency_note","Showing account base currency")}</p>
  </div>`}function I(){return M(localStorage.getItem("vp_home_currency")||"USD")}function M(e){const a=String(e||"USD").toUpperCase().replace(/[^A-Z]/g,"").slice(0,3);return ae.some(t=>t.code===a)?a:"USD"}function L(e){return["JPY"].includes(e)?0:2}function Le(){const e=I(),a=_("home.fx")||{};return M(a.code)===e&&Number(a.rate||0)>0?{code:e,rate:Number(a.rate),source:a.source||"",error:!!a.error}:{code:e,rate:1,source:e==="USD"?"base":"",error:!1}}async function ee(e,a=I()){const t=M(a);if(localStorage.setItem("vp_home_currency",t),t==="USD"){N("home.fx",{code:"USD",rate:1,source:"base",updated_at:Math.floor(Date.now()/1e3)}),R(e);return}const r=_("home.fx")||{};M(r.code)===t&&Number(r.rate||0)>0&&R(e);try{const o=await x(`/fx_rate.php?to=${encodeURIComponent(t)}`,{timeout:4e3,retry:1,cacheTtl:36e5}),s=Number(o?.rate||0);s>0?N("home.fx",{code:t,rate:s,source:o.source||"fx",updated_at:Number(o.updated_at||0),error:!1}):N("home.fx",{code:t,rate:Number(r.rate||1),source:o?.source||"fx",updated_at:Number(o?.updated_at||0),error:!0})}catch{N("home.fx",{code:t,rate:Number(r.rate||1),source:r.source||"cached",updated_at:Number(r.updated_at||0),error:!0})}R(e)}function Ne(){const e=E(),a=ie.map(t=>`<button type="button" class="home-lang-option${t===e?" is-active":""}" data-home-set-locale="${S(t)}" data-lang="${S(t)}">
      <span>${J[t]||"🏳️"}</span><b>${b(X[t]||t.toUpperCase())}</b>
    </button>`).join("");return`<div class="home-lang-menu" data-home-lang-menu>
    <button class="home-lang-trigger" type="button" data-home-lang-trigger aria-expanded="false" title="Language">
      <span>${J[e]||"🏳️"}</span>
      <b>${b(X[e]||e.toUpperCase())}</b>
      <i>${V.chevronDown}</i>
    </button>
    <div class="home-lang-dropdown hidden" data-home-lang-dropdown>${a}</div>
  </div>`}function F(e){const a=e.querySelector("[data-home-lang-dropdown]"),t=e.querySelector("[data-home-lang-trigger]");a&&a.classList.add("hidden"),t&&t.setAttribute("aria-expanded","false")}function qe(e,a,t,r=""){const o=e.querySelector("#home-pnl-chart-value"),s=e.querySelector("#home-pnl-spark");o&&(o.textContent=`${y(a)}${r?" "+r:""}`,o.className=a>=0?"text-buy":"text-sell"),s&&(s.innerHTML=oe(a,t))}function oe(e=0,a=0){const t=Number(e||0),r=Number(a||t||1),o=Array.from({length:12},(m,i)=>{const h=Math.sin((i+1)*.9)*Math.max(12,Math.abs(r)*.025);return t*(i/11)+h}),s=Math.min(...o,0),l=Math.max(...o,1),c=Math.max(1,l-s),p=o.map((m,i)=>{const h=5+i*10,v=54-(m-s)/c*44;return`${h.toFixed(1)},${v.toFixed(1)}`}).join(" "),d=t>=0?"var(--buy)":"var(--sell)";return`<svg viewBox="0 0 120 64" role="img" aria-label="PnL total chart" preserveAspectRatio="none">
    <path d="M0 54 H120" class="home-pnl-axis"></path>
    <polyline points="${p}" fill="none" stroke="${d}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
  </svg>`}function Te(e){return e!=="real"?`<div class="relative min-h-[180px]">
      <div class="flex gap-4 overflow-x-auto pb-3 blur-[4px] opacity-50 pointer-events-none">
        ${Array(4).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
      </div>
      <div class="absolute inset-0 grid place-items-center">
        <div class="card-glass text-center p-6 max-w-sm">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3">${V.lock}</span>
          <strong class="block">Real Account Only</strong>
          <p class="text-muted text-sm mt-1">Switch to Real and verify KYC to copy live signals.</p>
        </div>
      </div>
    </div>`:`<div class="flex gap-4 overflow-x-auto pb-3 snap-x" id="copy-scroller">
    ${Array(3).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
  </div>`}function Q(){const e=_("wallet")||{};return _("mode")==="real"?e.real||{balance:0,available:0,currency:"USDT"}:e.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}function Me(e,a){const t=Number(e||0);return t>0?G(t,a):"--"}function W(e){const a=String(e.source||e.provider||"").toLowerCase(),t=String(e.timing_class||"").toLowerCase();return Number(e.price||e.q_price||0)<=0?"unavailable":t==="stale"||e.is_stale?"stale":t==="market_closed"?"closed":e.delayed||t==="delayed"||a.includes("yahoo")?"delayed":a.includes("binance")||a.includes("stream")||t==="live"?"live":"cached"}function P(e){const a=W(e);return{live:n("quote.live","Live"),delayed:n("quote.delayed","Delayed"),stale:n("quote.stale","Stale"),closed:n("quote.closed","Closed"),unavailable:n("quote.unavailable","Unavailable"),cached:n("quote.cached","Cached")}[a]||a}function ne(e){const a=W(e);return a==="live"?"status-chip-live":a==="unavailable"?"status-chip-locked":"status-chip-delayed"}function Ae(e){return`<span data-quote-chip class="status-chip ${ne(e)}">${P(e)}</span>`}function Ue(e){const a=String(e?.level_code||e?.name_en||"starter").toLowerCase().replace(/[^a-z0-9]+/g,"-"),t=e?.name||e?.name_en||e?.level_code||"Starter";return`<span class="level-badge level-badge--${S(a)}">${b(t)}</span>`}function Ee(e){const a=String(e||"").split("").reduce((t,r)=>t+r.charCodeAt(0),0);return Array.from({length:12},(t,r)=>`<i style="height:${18+(a+r*13)%26}px"></i>`).join("")}function te(e,a){const t=Number(e||0);return t>0?G(t,a):"--"}function De(e){return!(Number(e.entry||e.entry_price||0)>0)||!(Number(e.tp1||e.take_profit_1||e.take_profit||0)>0)||!(Number(e.sl||e.stop_loss||0)>0)}function Re(e){return e.levels_source==="live_derived"?'<p class="text-[10px] text-spread mt-2">Live-derived desk levels</p>':""}function Pe(e){const a=String(e?.bot_name||e?.bot_name_en||"").trim();if(a)return a;const t=String(e?.symbol||e?.market_symbol||"AI").toUpperCase();return`Avalon ${t.replace(/(USDT|USD|_F)$/i,"")||t||"AI"} AI Bot`}function se(e){const a=String(e||"BUY").toUpperCase();return["BUY","SELL","NEUTRAL"].includes(a)?a:"BUY"}function Ie(e){const a=se(e);return`<span class="bot-direction-chip is-${a.toLowerCase()}">${b(a)}</span>`}function le(e,a=!1){if(!e)return;const t=e.querySelector('[data-current-level-card="1"]');if(!t)return;const r=e.getBoundingClientRect(),o=t.getBoundingClientRect(),s=e.scrollLeft+(o.left-r.left)-8;a?e.scrollTo({left:Math.max(0,s),behavior:"smooth"}):e.scrollLeft=Math.max(0,s)}export{Oe as cleanup,Fe as mount,je as render};
