import{j as g,k as V,g as f,t as n,h as x,m as y,e as E,r as ie,c as $,s as L,S as de,L as J,b as X,p as Y,n as pe,o as G}from"./main-BtlORFUg.js";import{marketIconPath as ue,marketInitial as me}from"./marketIcon-D-Yq8Sis.js";let N=null,q=[];const re=[{code:"USD",flag:"🇺🇸",name:"US Dollar"},{code:"EGP",flag:"🇪🇬",name:"Egyptian Pound"},{code:"SAR",flag:"🇸🇦",name:"Saudi Riyal"},{code:"AED",flag:"🇦🇪",name:"UAE Dirham"},{code:"KWD",flag:"🇰🇼",name:"Kuwaiti Dinar"},{code:"QAR",flag:"🇶🇦",name:"Qatari Riyal"},{code:"BHD",flag:"🇧🇭",name:"Bahraini Dinar"},{code:"OMR",flag:"🇴🇲",name:"Omani Rial"},{code:"JOD",flag:"🇯🇴",name:"Jordanian Dinar"},{code:"TRY",flag:"🇹🇷",name:"Turkish Lira"},{code:"EUR",flag:"🇪🇺",name:"Euro"},{code:"GBP",flag:"🇬🇧",name:"British Pound"}];function je(){const e=g("brand")||{},t=W(),r=(g("portfolio")||{}).metrics||{},o=g("mode")==="real"?"real":"demo",s=g("level")||{},c=s.current||{},i=s.next||{},u=Number(s.confirmed_deposit_total||s.total_deposits||s.deposit_total||0),p=Number(i.min_deposit_total||i.min_total_deposit||i.required_deposit||0),h=Math.max(0,p-u),l=p>0?Math.min(100,Math.round(u/p*100)):u>0?100:0,m=Number(t.balance||t.available||0),d=Number(r.total_balance??m),v=Number(r.available_balance??t.available??d??0),b=Number(r.in_use_balance??t.holds??t.locked??0),_=Number(r.pnl_24_live??0),k=Number(r.pnl_total_live??0),S=c.name||c.name_en||c.level_code||"Starter";return i.name||i.name_en,`
    <div class="pro-dashboard animate-fade-in pro-dashboard-compact">
      <section class="pro-card pro-balance-overview" aria-label="Account overview">
        <div class="pro-balance-topline">
          <div class="pro-hero-kicker">
            <span class="badge-accent">${f(e.name||"MEX Group")}</span>
            <span class="pro-pill ${o==="real"?"is-live":"is-demo"}"><i></i>${o==="real"?n("mode.real_workspace","Real workspace"):n("mode.demo_workspace","Demo workspace")}</span>
            ${Ue(c)}
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
              <button class="pro-pnl-chart-btn" id="home-pnl-chart-toggle" type="button" aria-expanded="false" title="${x(n("balance.pnl_total_chart","PnL total chart"))}">
                ${V.trade}
              </button>
            </div>
            <strong id="home-balance-total" data-count-to="${d}">${y(d)}</strong>
            <small id="home-balance-currency">${f(t.currency||"USDT")}</small>
            ${Ce()}
            <div class="home-pnl-chart-card hidden" id="home-pnl-chart-card">
              <div><span>${n("balance.pnl_total_live","PnL total live")}</span><b id="home-pnl-chart-value" class="text-buy">${y(0)}</b></div>
              <div class="home-pnl-spark" id="home-pnl-spark">${ne(0)}</div>
            </div>
          </div>
          <div class="pro-balance-metrics">
            <span><small>${n("balance.pnl_24_live","PnL 24 live")}</small><b id="home-pnl-24" class="${_>=0?"text-buy":"text-sell"}">${y(_)}</b></span>
            <span><small>${n("balance.pnl_total_live","PnL total live")}</small><b id="home-pnl-total" class="${k>=0?"text-buy":"text-sell"}">${y(k)}</b></span>
            <span><small>${n("balance.available","Available balance")}</small><b id="home-balance-available">${y(v)}</b></span>
            <span><small>${n("balance.in_use","In use balance")}</small><b id="home-balance-inuse">${y(b)}</b></span>
          </div>
        </div>
      </section>

      <section class="pro-card pro-level-scroll-card">
        <div class="pro-section-head">
          <div><span>${n("level.program","Level program")}</span><h2>${f(S)} ${n("level.progress_suffix","progress")}</h2></div>
          <b class="pro-level-percent" id="home-level-percent">${l}%</b>
        </div>
        <div class="pro-progress"><i id="home-level-progress" style="width:${l}%"></i></div>
        <div class="pro-level-rail" aria-label="Level benefits and next tiers">
          ${oe(s,{currentLevel:c,nextLevel:i,remainingToNext:h,nextRequired:p,levelProgress:l,mode:o})}
        </div>
      </section>

      <section class="pro-card pro-card-section pro-earn-rail-card blur-gate ${o!=="real"?"blur-active":""}">
        <div class="pro-section-head">
          <div><span>${n("earn.desk","Earn desk")}</span><h2>${n("earn.copy_contracts","Copy trading & contracts")}</h2><p>${n("earn.dashboard_copy","Swipe through live signals, recommended copies and level-linked contracts.")}</p></div>
          <a href="#/invest" class="btn-ghost btn-sm">${n("common.view_all","View all")}</a>
        </div>
        <div class="blur-gate-content relative" id="home-copy-section">
          ${qe(o)}
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
              ${[["all",n("common.all","All")],["crypto",n("markets.crypto","Crypto")],["forex",n("markets.forex","Forex")],["stocks",n("markets.stocks","Stocks")],["commodities",n("markets.commodities","Commodities")],["futures",n("markets.futures","Futures")],["arab",n("markets.arab","Arab")]].map(([w,T],A)=>`<button class="${A===0?"active":""}" data-home-tab="${w}">${f(T)}</button>`).join("")}
            </div>
            <div class="pro-market-grid" id="home-markets">
              ${Array(8).fill(0).map(()=>'<div class="skeleton h-20 rounded-xl"></div>').join("")}
            </div>
          </section>
        </div>
      </section>
    </div>`}function Fe(e){U(e,g("portfolio")),requestAnimationFrame(()=>{const o=e.querySelector(".pro-level-rail");o&&ce(o)});const t=o=>{if(o.target.tagName==="IMG"&&o.target.dataset.fallback==="initial"){o.target.style.display="none";const s=o.target.nextElementSibling;s&&(s.style.display="grid")}};e.addEventListener("error",t,!0),q.push(()=>e.removeEventListener("error",t,!0)),setTimeout(()=>{e.querySelectorAll("#home-markets > *").forEach((o,s)=>{o.classList.add("stagger-item"),o.style.animationDelay=`${s*.05+.1}s`})},50);const a=o=>{const s=o.target.closest("[data-home-lang-trigger]");if(s){o.preventDefault(),o.stopPropagation();const l=s.closest("[data-home-lang-menu]"),m=l?.querySelector("[data-home-lang-dropdown]"),d=l?.querySelector("[data-home-lang-overlay]"),v=m?.classList.toggle("hidden")===!1;d?.classList.toggle("hidden",!v),s.setAttribute("aria-expanded",v?"true":"false");return}if(o.target.closest("[data-home-lang-close]")){o.preventDefault(),o.stopPropagation(),R(e);return}const i=o.target.closest("[data-home-set-locale]");if(i){o.preventDefault(),o.stopPropagation();const l=i.dataset.homeSetLocale||i.dataset.lang;R(e),l&&l!==E()&&(i.disabled=!0,i.classList.add("is-loading"),ie(l));return}o.target.closest("[data-home-lang-menu]")||R(e);const u=o.target.closest("#home-pnl-chart-toggle");if(u){o.preventDefault();const m=e.querySelector("#home-pnl-chart-card")?.classList.toggle("hidden")===!1;u.setAttribute("aria-expanded",m?"true":"false");return}const p=o.target.closest("[data-home-tab]");if(!p)return;const h=p.dataset.homeTab;e.__homeMarketTab=h,e.querySelectorAll("[data-home-tab]").forEach(l=>{l.classList.toggle("active",l===p)}),O(e,h)};e.addEventListener("click",a),q.push(()=>e.removeEventListener("click",a));const r=o=>{const s=o.target.closest("#home-fx-select");if(!s)return;const c=M(s.value);localStorage.setItem("vp_home_currency",c),te(e,c)};e.addEventListener("change",r),q.push(()=>e.removeEventListener("change",r)),N&&document.removeEventListener("click",N),N=o=>{e.contains(o.target)||R(e)},document.addEventListener("click",N),Z(e),te(e,B()),e.__homeRefreshTimer=setInterval(()=>{Z(e)},8e3),q.push(()=>{e.__homeRefreshTimer&&(clearInterval(e.__homeRefreshTimer),e.__homeRefreshTimer=null)})}function Oe(){N&&(document.removeEventListener("click",N),N=null),q.forEach(e=>{try{e()}catch{}}),q=[]}async function Z(e){const t=g("mode")==="real"?"real":"demo";$("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:6e3}).then(a=>{(a?.real||a?.demo)&&(L("wallet",{real:a.real||{},demo:a.demo||{}}),U(e))}).catch(()=>U(e)),$(`/user/level.php?lang=${encodeURIComponent(E())}`,{timeout:0,retry:1,cacheTtl:3e4}).then(a=>{a?.ok!==!1&&(a?.current||Array.isArray(a?.levels))&&(L("level",a),he(e))}).catch(()=>null),$("/markets.php?scope=home&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=50",{timeout:0,retry:1,cacheTtl:15e3}).then(a=>{if(a&&Array.isArray(a.items)&&a.items.length){e.__homeAllMarkets=a.items;const r=e.__homeMarketTab||"all";O(e,r)}else throw new Error("empty_markets")}).catch(()=>{$("/markets.php?scope=home&supported=1&lite=1&limit=30",{timeout:8e3,retry:0,cacheTtl:3e4}).then(a=>{if(a&&Array.isArray(a.items)&&a.items.length)e.__homeAllMarkets=a.items,O(e,e.__homeMarketTab||"all");else{const r=e.querySelector("#home-markets");r&&(r.innerHTML=`<p class="pro-empty">${n("market.reconnecting","Markets are reconnecting...")}</p>`)}}).catch(()=>{const a=e.querySelector("#home-markets");a&&(a.innerHTML=`<p class="pro-empty">${n("market.reconnecting","Markets are reconnecting...")}</p>`)})}),$(`/trade/portfolio.php?fast=1&mode=${t}`,{timeout:0,retry:1,cacheTtl:5e3}).then(a=>{a?.ok!==!1&&(L("portfolio",a),U(e,a))}).catch(()=>U(e)),Promise.allSettled([t==="real"?$(`/signals.php?bot=1&home=1&fast=1&lang=${encodeURIComponent(E())}`,{timeout:0,retry:1,cacheTtl:12e3}).catch(()=>null):Promise.resolve(null),$(`/invest/plans.php?kind=contract&home=1&lang=${encodeURIComponent(E())}`,{timeout:0,retry:1,cacheTtl:3e4}).catch(()=>null)]).then(([a,r])=>{const o=a.status==="fulfilled"?a.value:null,s=r.status==="fulfilled"?r.value:null;ee(e,o?.items||[],s?.items||[])}).catch(()=>ee(e,[],[]))}function U(e,t=g("portfolio")){const a=W();g("mode");const r=t?.metrics||{},o=Number(a.balance||a.available||0),s=Number(r.total_balance??o),c=Number(r.available_balance??a.available??o??0),i=Number(r.in_use_balance??a.holds??a.locked??0),u=Number(r.pnl_24_live??0),p=Number(r.pnl_total_live??0);e.__homeBalanceValues={total:s,available:c,inUse:i,pnl24:u,pnlTotal:p,currency:a.currency||"USDT"},P(e)}function P(e){const t=e.__homeBalanceValues||{},a=Number(t.total||0),r=Number(t.available||0),o=Number(t.inUse||0),s=Number(t.pnl24||0),c=Number(t.pnlTotal||0),i=t.currency||W().currency||"USDT",u=Le(),p=M(u.code),h=Number(u.rate||0)>0?Number(u.rate):1,l=j=>Number(j||0)*h,m=p==="USD"?i:p,d=e.querySelector("#home-balance-total");d&&(d.dataset.countTo=String(a),d.textContent=y(l(a),C(p)));const v=e.querySelector("#home-balance-currency");v&&(v.textContent=p==="USD"?i:`${p} - base ${i}`);const b=e.querySelector("#home-balance-available");b&&(b.textContent=`${y(l(r),C(p))} ${m}`);const _=e.querySelector("#home-balance-inuse");_&&(_.textContent=`${y(l(o),C(p))} ${m}`);const k=e.querySelector("#home-pnl-24");k&&(k.textContent=`${y(l(s),C(p))} ${m}`,k.className=s>=0?"text-buy":"text-sell");const S=e.querySelector("#home-pnl-total");S&&(S.textContent=`${y(l(c),C(p))} ${m}`,S.className=c>=0?"text-buy":"text-sell");const w=e.querySelector("#home-fx-total");w&&(w.textContent=`${y(l(a),C(p))} ${m}`);const T=e.querySelector("#home-fx-rate");T&&(T.textContent=p==="USD"?`1 ${i} = 1 USD`:`1 ${i} ~= ${y(h,C(p))} ${p}`);const A=e.querySelector("#home-fx-note");if(A){const j=u.source?` - ${u.source}`:"";A.textContent=p==="USD"?n("home.base_currency_note","Showing account base currency"):`${n("home.converted_estimate","Converted estimate")}${j}`,A.classList.toggle("is-error",!!u.error)}const H=e.querySelector("#home-fx-select");H&&H.value!==p&&(H.value=p),Te(e,l(c),l(s),m)}function he(e){const t=g("level")||{},a=t.current||{},r=t.next||{},o=Number(t.confirmed_deposit_total||t.total_deposits||t.deposit_total||0),s=Number(r.min_deposit_total||r.min_total_deposit||r.required_deposit||0),c=Math.max(0,s-o),i=s>0?Math.min(100,Math.round(o/s*100)):o>0?100:0,u=e.querySelector(".pro-level-scroll-card .pro-section-head h2");u&&(u.textContent=`${a.name||a.name_en||a.level_code||"Starter"} ${n("level.progress_suffix","progress")}`);const p=e.querySelector("#home-level-percent");p&&(p.textContent=`${i}%`);const h=e.querySelector("#home-level-progress");h&&(h.style.width=`${i}%`);const l=e.querySelector(".pro-level-rail");l&&(l.scrollLeft,l.innerHTML=oe(t,{currentLevel:a,nextLevel:r,remainingToNext:c,nextRequired:s,levelProgress:i,mode:g("mode")==="real"?"real":"demo"}),l.scrollLeft===0&&setTimeout(()=>ce(l),300))}function ee(e,t=[],a=[]){const r=e.querySelector("#home-copy-section");if(!r)return;const o=g("mode")==="real"?"real":"demo",s=(t||[]).slice(0,6).map(ve).join(""),c=fe(a||[]);r.innerHTML=`
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
        ${c}
      </div>
    </div>`}function ve(e){const t=le(e.direction),a=e.symbol||e.market_symbol||"--",r=Pe(e);return`<article class="copy-card pro-earn-card">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2 min-w-0">
        <span class="avalon-mini-mark" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg></span>
        <div class="min-w-0">
          <strong class="text-xs truncate block">${f(r)}</strong>
          <span class="text-[10px] text-muted truncate block">${f(a)} - ${n("bot.ai_copy_basket","AI copy basket")}</span>
        </div>
      </div>
      ${Ie(t)}
    </div>
    <div class="copy-card__quote py-2">
      <span class="status-chip ${Number(e.live_price||0)>0?"status-chip-live":"status-chip-locked"}">${Number(e.live_price||0)>0?n("market.live","LIVE"):n("funding.ready","READY")}</span>
      <strong>${Number(e.live_price||0)>0?"$"+y(e.live_price,e.type==="forex"?5:2):"--"}</strong>
      <span class="${Number(e.live_change_pct||0)>=0?"text-buy":"text-sell"}">${Y(e.live_change_pct||0)}</span>
    </div>
    <div class="copy-card__perf mt-2">
      <div class="copy-card__perf-item"><small>${n("trade.entry","Entry")}</small><strong>${ae(e.entry||e.entry_price,e.type)}</strong></div>
      <div class="copy-card__perf-item ${Number(e.win_rate||0)>=60?"pos":""}"><small>${n("bot.win_rate","Win Rate")}</small><strong>${Number(e.win_rate||0)>0?Number(e.win_rate).toFixed(0)+"%":"--"}</strong></div>
      <div class="copy-card__perf-item pos"><small>TP</small><strong>${ae(e.tp1||e.take_profit_1||e.take_profit,e.type)}</strong></div>
    </div>
    ${De(e)?`<p class="text-[10px] text-muted mt-2">${n("bot.awaiting_desk_levels","Awaiting desk levels")}</p>`:Re(e)}
    <a href="#/invest" class="btn-primary btn-sm w-full mt-3">${n("bot.open_copy_desk","Open copy desk")}</a>
  </article>`}function fe(e){const t=(e||[]).slice(0,4);return t.length?t.map(r=>{const o=r.required_level?.name||r.required_level?.name_en||r.level_name||n("level.starter","Starter"),s=Number(r.cycle_roi_percent||r.roi_percent||r.rate||0),c=Number(r.duration_days||r.term_days||0);return`<article class="pro-contract-card pro-earn-card">
      <div class="pro-contract-badge">${n("earn.contract","Contract")}</div>
      <strong>${f(r.name||r.name_en||n("earn.level_contract","Level contract"))}</strong>
      <small>${c>0?`${c} ${n("earn.day_term","day term")}`:n("earn.flexible_term","Flexible term")} - ${n("level.label","Level")}: ${f(o)}</small>
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
  </article>`}function ye(e,t){const a=e.querySelector("#home-markets");a&&(a.innerHTML=t.map(r=>`
    <button class="home-market-card" data-symbol="${x(r.symbol)}" data-type="${x(r.type||"crypto")}">
      ${xe(r,"home-market-icon")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <div class="font-semibold text-sm truncate">${f(r.symbol)}</div>
          ${Ae(r)}
        </div>
        <div class="text-[11px] text-muted truncate">${f(r.name||r.symbol)}</div>
        <div class="mini-spark" aria-hidden="true">${Ee(r.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold" data-home-price>${Me(r.price||r.q_price,r.type)}</div>
        <div class="text-[11px] ${Number(r.change_pct||r.q_change||0)>=0?"text-buy":"text-sell"}" data-home-change>${Y(r.change_pct||r.q_change||0)}</div>
        <div class="text-[9px] text-muted uppercase mt-1" data-home-source>${I(r)}</div>
      </div>
    </button>
  `).join(""),a.querySelectorAll("[data-symbol]").forEach(r=>{r.addEventListener("click",()=>pe("trade",{symbol:r.dataset.symbol,type:r.dataset.type}))}))}function O(e,t="all"){const a=Array.isArray(e.__homeAllMarkets)?e.__homeAllMarkets:[],r=String(t||"all").toLowerCase(),o=r==="commodity"?"commodities":r,c=(o==="all"?a:a.filter(u=>ge(u.type)===o)).slice(0,o==="all"?16:30),i=e.querySelector("#home-markets");if(!c.length){i&&(i.innerHTML=`<p class="pro-empty">${n("market.no_markets_available","No markets available in this desk.")}</p>`);return}ye(e,c),_e(e,c)}function ge(e){const t=String(e||"crypto").toLowerCase();return t==="commodity"?"commodities":t==="stock"?"stocks":t==="future"?"futures":t==="fx"?"forex":t}async function _e(e,t){const a=(t||[]).filter(s=>{if(!(Number(s?.price||s?.q_price||0)>0))return!0;const i=Q(s);return i==="stale"||i==="unavailable"});if(!a.length)return;const r=new Map;a.forEach(s=>{const c=String(s.symbol||"").toUpperCase(),i=s.type||"crypto";c&&(r.has(i)||r.set(i,[]),r.get(i).push(c))});const o=[];await Promise.all([...r.entries()].map(async([s,c])=>{const i=[...new Set(c)],u=s==="crypto"?30:8,p=new Set;for(let h=0;h<i.length;h+=u){const l=i.slice(h,h+u),m=await $(`/quotes.php?symbols=${encodeURIComponent(l.join(","))}&type=${encodeURIComponent(s)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:s==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);m?.items?.length&&m.items.forEach(d=>{p.add(String(d.symbol||"").toUpperCase()),z(e,d,s)})}c.forEach(h=>{const l=K(e,h),m=l&&l.querySelector("[data-home-price]")?.textContent!=="--";(!p.has(h)||!m)&&o.push({symbol:h,type:s})})})),$e(e,o)}async function $e(e,t){const a=new Map;t.forEach(r=>{!r.symbol||!r.type||(a.has(r.type)||a.set(r.type,[]),a.get(r.type).push(r.symbol))});for(const[r,o]of a.entries()){const s=r==="crypto"?12:2,c=r==="crypto"?12:4,i=[...new Set(o)].slice(0,c),u=[];for(let l=0;l<i.length;l+=s){const m=i.slice(l,l+s),d=await $(`/quotes.php?symbols=${encodeURIComponent(m.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);d?.items?.length&&d.items.forEach(v=>z(e,v,r)),m.forEach(v=>{const b=K(e,v);b&&b.querySelector("[data-home-price]")?.textContent!=="--"||u.push(v)})}const p=r==="crypto"?6:2,h=[...new Set(u)].slice(0,r==="crypto"?6:2);for(let l=0;l<h.length;l+=p){const m=h.slice(l,l+p),d=await $(`/quotes.php?symbols=${encodeURIComponent(m.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);d?.items?.length&&d.items.forEach(v=>z(e,v,r))}}}function z(e,t,a){const r=String(t.symbol||"").toUpperCase(),o=K(e,r);if(!o)return;const s=o.dataset.type||t.type||a,c=Number(t.price||t.q_price||0),i=Number(t.change_pct||t.q_change||0),u=o.querySelector("[data-home-price]"),p=o.querySelector("[data-home-change]"),h=o.querySelector("[data-home-source]");if(u&&c>0){const m=parseFloat(u.dataset.price||"0");if(u.textContent=G(c,s),u.dataset.price=String(c),m>0&&c!==m){const d=c>m?"animate-price-up":"animate-price-down";u.classList.remove("animate-price-up","animate-price-down"),requestAnimationFrame(()=>{u.classList.add(d),setTimeout(()=>u.classList.remove(d),800)})}}p&&(p.textContent=Y(i),p.className=`text-[11px] ${i>=0?"text-buy":"text-sell"}`),h&&c>0&&(h.textContent=I(t));const l=o.querySelector("[data-quote-chip]");l&&c>0&&(l.className=`status-chip ${se(t)}`,l.textContent=I(t))}function K(e,t){return[...e.querySelectorAll("[data-symbol]")].find(a=>String(a.dataset.symbol||"").toUpperCase()===String(t||"").toUpperCase())}function xe(e,t){const a=e.symbol||"--";return`<span class="${t}">
    <img src="${x(ue(e,e.type||"crypto"))}" alt="${x(a)}" loading="lazy" data-fallback="initial" />
    <b style="display:none">${f(me(a))}</b>
  </span>`}function oe(e,t){const a=Array.isArray(e?.levels)?e.levels:[],r=t.currentLevel?.id,o=String(t.currentLevel?.level_code||"").toLowerCase(),s=D(t.currentLevel),c=a.length?a:[t.currentLevel,t.nextLevel].filter(Boolean),i=new Map,u=new Set,p=d=>{if(!d||typeof d!="object")return;const v=D(d);v&&u.has(v)||(v&&u.add(v),i.set(v||`level-${i.size}`,d))};c.forEach(p),p(t.currentLevel),p(t.nextLevel);const h=Array.from(i.values()).sort((d,v)=>{const b=F(d)-F(v);return Math.abs(b)>1e-7?b:Number(d.sort_order||0)-Number(v.sort_order||0)}),l=h.findIndex(d=>{if(!d||typeof d!="object")return!1;const v=r&&Number(d.id)===Number(r),b=o&&String(d.level_code||"").toLowerCase()===o,_=s&&D(d)===s;return!!(v||b||_)}),m=[];return h.forEach((d,v)=>{if(!d||typeof d!="object")return;const b=v===l||r&&Number(d.id)===Number(r)||o&&String(d.level_code||"").toLowerCase()===o||s&&D(d)===s,_=l>=0&&v<l,k=F(d),S=b?t.levelProgress:_?100:0,w=d.name||d.name_en||d.level_code||`Tier ${v+1}`,T=t.nextLevel?.name||t.nextLevel?.name_en||"next tier";m.push(ke({label:b?n("level.current_tier","Current tier"):_?n("level.completed","Completed tier"):n("level.locked","Locked tier"),title:w,sub:b?t.nextRequired>0?`${y(t.remainingToNext)} USDT ${n("level.to_next","to")} ${T}`:n("level.top_active","Top tier permissions are active"):_?n("level.unlocked_completed","Unlocked and completed"):k>0?`${y(k)} USDT ${n("level.required","required")}`:n("level.starter_access","Starter access"),progress:S,state:b?"current":_?"completed":"locked",isCurrent:b,perks:Se(d,we(w,b,t.mode)),features:d.features||{}}))}),m.join("")}function D(e){return String(e?.id||e?.level_code||e?.name||e?.name_en||"").toLowerCase()}function F(e){return Number(e?.min_deposit_total||e?.min_total_deposit||e?.required_deposit||0)}function ke({label:e,title:t,sub:a,progress:r,state:o,perks:s,isCurrent:c,features:i}){const u=r==null?null:Math.max(0,Math.min(100,Number(r)||0)),p=Array.isArray(s)?s:[String(s||"")].filter(Boolean),h=i||{},l=[];return h.trading&&l.push({key:"trading",icon:"📈",label:n("feat.trading","Trading")}),h.copy_bot&&l.push({key:"copy_bot",icon:"🤖",label:n("feat.copy_bot","Copy Bot")}),h.contracts&&l.push({key:"contracts",icon:"📋",label:n("feat.contracts","Contracts")}),h.support&&l.push({key:"support",icon:"🎧",label:n("feat.support","Support")}),h.portfolio_manager&&l.push({key:"portfolio_manager",icon:"👔",label:n("feat.portfolio_manager","Manager")}),`<article class="pro-level-rail-card is-${x(o)}"${c?' data-current-level-card="1"':""}>
    <div class="pro-level-card-row"><span>${f(e)}</span>${u==null?"":`<b>${u}%</b>`}</div>
    <strong>${f(t)}</strong>
    <small>${f(a||"")}</small>
    ${u==null?"":`<div class="pro-mini-progress"><i style="width:${u}%"></i></div>`}
    ${l.length?`<div class="pro-level-features">${l.map(m=>`<span class="pro-level-feat ${m.key}" title="${f(m.label)}">${m.icon} <small>${f(m.label)}</small></span>`).join("")}</div>`:""}
    <ul class="pro-level-benefits">
      ${p.slice(0,5).map(m=>`<li>${f(m)}</li>`).join("")}
    </ul>
  </article>`}function Se(e,t){const a=e?.perks||e?.perks_en||e?.features||e?.description||"",r=Array.isArray(t)?t:String(t||"").split("|");if(!a)return r.filter(Boolean);const o=String(a).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),s=o.split(/[\n\r,;|•·]+/).map(c=>c.trim()).filter(Boolean);return(s.length>1?s:[o]).slice(0,5)}function we(e,t,a){const r=String(e||"").toLowerCase();return r.includes("vip")?["Priority account handling","Highest contract access","Premium copy desk limits"]:r.includes("platinum")?["Advanced copy desk access","Higher contract caps","Priority funding review"]:r.includes("gold")?["Premium copy desk","Higher contract caps","Dedicated account guidance"]:t&&a==="real"?["Live trading enabled","Wallet and funding access","Copy desk eligibility"]:["Market access","Watchlist and trade desk","Level progression benefits"]}function Ce(){const e=B(),t=re.map(a=>`
    <option value="${x(a.code)}" ${a.code===e?"selected":""}>${a.flag} ${f(a.name)} (${a.code})</option>
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
  </div>`}function B(){return M(localStorage.getItem("vp_home_currency")||"USD")}function M(e){const t=String(e||"USD").toUpperCase().replace(/[^A-Z]/g,"").slice(0,3);return re.some(a=>a.code===t)?t:"USD"}function C(e){return["JPY"].includes(e)?0:2}function Le(){const e=B(),t=g("home.fx")||{};return M(t.code)===e&&Number(t.rate||0)>0?{code:e,rate:Number(t.rate),source:t.source||"",error:!!t.error}:{code:e,rate:1,source:e==="USD"?"base":"",error:!1}}async function te(e,t=B()){const a=M(t);if(localStorage.setItem("vp_home_currency",a),a==="USD"){L("home.fx",{code:"USD",rate:1,source:"base",updated_at:Math.floor(Date.now()/1e3)}),P(e);return}const r=g("home.fx")||{};M(r.code)===a&&Number(r.rate||0)>0&&P(e);try{const o=await $(`/fx_rate.php?to=${encodeURIComponent(a)}`,{timeout:4e3,retry:1,cacheTtl:36e5}),s=Number(o?.rate||0);s>0?L("home.fx",{code:a,rate:s,source:o.source||"fx",updated_at:Number(o.updated_at||0),error:!1}):L("home.fx",{code:a,rate:Number(r.rate||1),source:o?.source||"fx",updated_at:Number(o?.updated_at||0),error:!0})}catch{L("home.fx",{code:a,rate:Number(r.rate||1),source:r.source||"cached",updated_at:Number(r.updated_at||0),error:!0})}P(e)}function Ne(){const e=E(),t=de.map(a=>`<button type="button" class="home-lang-option${a===e?" is-active":""}" data-home-set-locale="${x(a)}" data-lang="${x(a)}">
      <span>${J[a]||"🏳️"}</span><b>${f(X[a]||a.toUpperCase())}</b>
    </button>`).join("");return`<div class="home-lang-menu" data-home-lang-menu>
    <button class="home-lang-trigger" type="button" data-home-lang-trigger aria-expanded="false" title="Language">
      <span>${J[e]||"🏳️"}</span>
      <b>${f(X[e]||e.toUpperCase())}</b>
      <i>${V.chevronDown}</i>
    </button>
    <div class="home-lang-overlay hidden" data-home-lang-overlay></div>
    <div class="home-lang-dropdown hidden" data-home-lang-dropdown>
      <div class="home-lang-dropdown-header">
        <strong>${n("lang.select_language","Select Language")}</strong>
        <button type="button" class="home-lang-close" data-home-lang-close aria-label="Close">✕</button>
      </div>
      ${t}
    </div>
  </div>`}function R(e){const t=e.querySelector("[data-home-lang-dropdown]"),a=e.querySelector("[data-home-lang-overlay]"),r=e.querySelector("[data-home-lang-trigger]");t&&t.classList.add("hidden"),a&&a.classList.add("hidden"),r&&r.setAttribute("aria-expanded","false")}function Te(e,t,a,r=""){const o=e.querySelector("#home-pnl-chart-value"),s=e.querySelector("#home-pnl-spark");o&&(o.textContent=`${y(t)}${r?" "+r:""}`,o.className=t>=0?"text-buy":"text-sell"),s&&(s.innerHTML=ne(t,a))}function ne(e=0,t=0){const a=Number(e||0),r=Number(t||a||1),o=Array.from({length:12},(h,l)=>{const m=Math.sin((l+1)*.9)*Math.max(12,Math.abs(r)*.025);return a*(l/11)+m}),s=Math.min(...o,0),c=Math.max(...o,1),i=Math.max(1,c-s),u=o.map((h,l)=>{const m=5+l*10,d=54-(h-s)/i*44;return`${m.toFixed(1)},${d.toFixed(1)}`}).join(" "),p=a>=0?"var(--buy)":"var(--sell)";return`<svg viewBox="0 0 120 64" role="img" aria-label="PnL total chart" preserveAspectRatio="none">
    <path d="M0 54 H120" class="home-pnl-axis"></path>
    <polyline points="${u}" fill="none" stroke="${p}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
  </svg>`}function qe(e){return e!=="real"?`<div class="relative min-h-[180px]">
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
  </div>`}function W(){const e=g("wallet")||{};return g("mode")==="real"?e.real||{balance:0,available:0,currency:"USDT"}:e.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}function Me(e,t){const a=Number(e||0);return a>0?G(a,t):"--"}function Q(e){const t=String(e.source||e.provider||"").toLowerCase(),a=String(e.timing_class||"").toLowerCase();return Number(e.price||e.q_price||0)<=0?"unavailable":a==="stale"||e.is_stale?"stale":a==="market_closed"?"closed":e.delayed||a==="delayed"||t.includes("yahoo")?"delayed":t.includes("binance")||t.includes("stream")||a==="live"?"live":"cached"}function I(e){const t=Q(e);return{live:n("quote.live","Live"),delayed:n("quote.delayed","Delayed"),stale:n("quote.stale","Stale"),closed:n("quote.closed","Closed"),unavailable:n("quote.unavailable","Unavailable"),cached:n("quote.cached","Cached")}[t]||t}function se(e){const t=Q(e);return t==="live"?"status-chip-live":t==="unavailable"?"status-chip-locked":"status-chip-delayed"}function Ae(e){return`<span data-quote-chip class="status-chip ${se(e)}">${I(e)}</span>`}function Ue(e){const t=String(e?.level_code||e?.name_en||"starter").toLowerCase().replace(/[^a-z0-9]+/g,"-"),a=e?.name||e?.name_en||e?.level_code||"Starter";return`<span class="level-badge level-badge--${x(t)}">${f(a)}</span>`}function Ee(e){const t=String(e||"").split("").reduce((a,r)=>a+r.charCodeAt(0),0);return Array.from({length:12},(a,r)=>`<i style="height:${18+(t+r*13)%26}px"></i>`).join("")}function ae(e,t){const a=Number(e||0);return a>0?G(a,t):"--"}function De(e){return!(Number(e.entry||e.entry_price||0)>0)||!(Number(e.tp1||e.take_profit_1||e.take_profit||0)>0)||!(Number(e.sl||e.stop_loss||0)>0)}function Re(e){return e.levels_source==="live_derived"?'<p class="text-[10px] text-spread mt-2">Live-derived desk levels</p>':""}function Pe(e){const t=String(e?.bot_name||e?.bot_name_en||"").trim();if(t)return t;const a=String(e?.symbol||e?.market_symbol||"AI").toUpperCase();return`Avalon ${a.replace(/(USDT|USD|_F)$/i,"")||a||"AI"} AI Bot`}function le(e){const t=String(e||"BUY").toUpperCase();return["BUY","SELL","NEUTRAL"].includes(t)?t:"BUY"}function Ie(e){const t=le(e);return`<span class="bot-direction-chip is-${t.toLowerCase()}">${f(t)}</span>`}function ce(e){if(!e)return;const t=e.querySelector('[data-current-level-card="1"]');if(!t)return;const r=Array.from(e.children).indexOf(t),o=12,s=285,c=Math.max(0,r*(s+o)-e.clientWidth/2+s/2);setTimeout(()=>{e.scrollLeft=c},200)}export{Oe as cleanup,Fe as mount,je as render};
