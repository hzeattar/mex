import{o as oe,i as y,j as H,f as v,m as b,s as S,c as _,d as D,g as $,S as ne,L as G,b as Y,p as F,n as se,l as O}from"./main-CrCNAud6.js";import{marketIconPath as ce,marketInitial as le}from"./marketIcon-D-Yq8Sis.js";let k=null;const X=[{code:"USD",flag:"🇺🇸",name:"US Dollar"},{code:"EGP",flag:"🇪🇬",name:"Egyptian Pound"},{code:"SAR",flag:"🇸🇦",name:"Saudi Riyal"},{code:"AED",flag:"🇦🇪",name:"UAE Dirham"},{code:"KWD",flag:"🇰🇼",name:"Kuwaiti Dinar"},{code:"QAR",flag:"🇶🇦",name:"Qatari Riyal"},{code:"BHD",flag:"🇧🇭",name:"Bahraini Dinar"},{code:"OMR",flag:"🇴🇲",name:"Omani Rial"},{code:"JOD",flag:"🇯🇴",name:"Jordanian Dinar"},{code:"TRY",flag:"🇹🇷",name:"Turkish Lira"},{code:"EUR",flag:"🇪🇺",name:"Euro"},{code:"GBP",flag:"🇬🇧",name:"British Pound"}];function Ie(){const e=y("brand")||{},t=V(),a=y("mode")==="real"?"real":"demo",r=y("level")||{},o=r.current||{},n=r.next||{},s=Number(r.confirmed_deposit_total||r.total_deposits||r.deposit_total||0),i=Number(n.min_deposit_total||n.min_total_deposit||n.required_deposit||0),d=Math.max(0,i-s),c=i>0?Math.min(100,Math.round(s/i*100)):s>0?100:0,m=Number(t.balance||t.available||0),l=Number(t.available||m||0),p=Number(t.holds||t.locked||0),u=o.name||o.name_en||o.level_code||"Starter";return n.name||n.name_en,`
    <div class="pro-dashboard animate-fade-in pro-dashboard-compact">
      <section class="pro-card pro-balance-overview" aria-label="Account overview">
        <div class="pro-balance-topline">
          <div class="pro-hero-kicker">
            <span class="badge-accent">${v(e.name||"MEX Group")}</span>
            <span class="pro-pill ${a==="real"?"is-live":"is-demo"}"><i></i>${a==="real"?"Real workspace":"Demo workspace"}</span>
            ${Te(o)}
          </div>
          <div class="pro-balance-actions">
            ${Ce()}
            <a href="#/trade" class="btn-primary">Trade</a>
          </div>
        </div>
        <div class="pro-balance-main-row">
          <div class="pro-balance-total">
            <div class="pro-balance-total-head">
              <span>Total balance</span>
              <button class="pro-pnl-chart-btn" id="home-pnl-chart-toggle" type="button" aria-expanded="false" title="PnL total chart">
                ${H.trade}
              </button>
            </div>
            <strong id="home-balance-total" data-count-to="${m}">${b(m)}</strong>
            <small id="home-balance-currency">${v(t.currency||"USDT")}</small>
            ${Se()}
            <div class="home-pnl-chart-card hidden" id="home-pnl-chart-card">
              <div><span>PnL total live</span><b id="home-pnl-chart-value" class="text-buy">${b(0)}</b></div>
              <div class="home-pnl-spark" id="home-pnl-spark">${te(0)}</div>
            </div>
          </div>
          <div class="pro-balance-metrics">
            <span><small>PnL 24 live</small><b id="home-pnl-24" class="text-buy">${b(0)}</b></span>
            <span><small>PnL total live</small><b id="home-pnl-total" class="text-buy">${b(0)}</b></span>
            <span><small>Available balance</small><b id="home-balance-available">${b(l)}</b></span>
            <span><small>In use balance</small><b id="home-balance-inuse">${b(p)}</b></span>
          </div>
        </div>
      </section>

      <section class="pro-card pro-level-scroll-card">
        <div class="pro-section-head">
          <div><span>Level program</span><h2>${v(u)} progress</h2></div>
          <b class="pro-level-percent" id="home-level-percent">${c}%</b>
        </div>
        <div class="pro-progress"><i id="home-level-progress" style="width:${c}%"></i></div>
        <div class="pro-level-rail" aria-label="Level benefits and next tiers">
          ${ee(r,{currentLevel:o,nextLevel:n,remainingToNext:d,nextRequired:i,levelProgress:c,mode:a})}
        </div>
      </section>

      <section class="pro-card pro-card-section pro-earn-rail-card blur-gate ${a!=="real"?"blur-active":""}">
        <div class="pro-section-head">
          <div><span>Earn desk</span><h2>Copy trading & contracts</h2><p>Swipe through live signals, recommended copies and level-linked contracts.</p></div>
          <a href="#/invest" class="btn-ghost btn-sm">View all</a>
        </div>
        <div class="blur-gate-content relative" id="home-copy-section">
          ${Le(a)}
        </div>
        ${a!=="real"?'<div class="blur-gate-overlay"><span class="badge">Real account only</span></div>':""}
      </section>

      <section class="pro-main-layout pro-main-layout-single">
        <div class="pro-main-stack">
          <section class="pro-card pro-card-section">
            <div class="pro-section-head">
              <div><span>Markets</span><h2>Live watchlist</h2></div>
              <a href="#/trade" class="btn-ghost btn-sm">Trade</a>
            </div>
            <div class="pro-market-tabs" id="home-market-tabs">
              ${["All","Crypto","Forex","Stocks","Commodities","Futures","Arab"].map((h,f)=>`<button class="${f===0?"active":""}" data-home-tab="${h.toLowerCase()}">${h}</button>`).join("")}
            </div>
            <div class="pro-market-grid" id="home-markets">
              ${Array(8).fill(0).map(()=>'<div class="skeleton h-20 rounded-xl"></div>').join("")}
            </div>
          </section>
        </div>
      </section>
    </div>`}function Be(e){e.addEventListener("error",t=>{if(t.target.tagName==="IMG"&&t.target.dataset.fallback==="initial"){t.target.style.display="none";const a=t.target.nextElementSibling;a&&(a.style.display="grid")}},!0),q()==="USD"&&e.querySelectorAll("[data-count-to]").forEach(t=>{ie(t,0,parseFloat(t.dataset.countTo)||0,900)}),setTimeout(()=>{e.querySelectorAll("#home-markets > *").forEach((t,a)=>{t.classList.add("stagger-item"),t.style.animationDelay=`${a*.05+.1}s`})},50),e.addEventListener("click",t=>{const a=t.target.closest("[data-home-lang-trigger]");if(a){t.preventDefault(),t.stopPropagation();const c=a.closest("[data-home-lang-menu]")?.querySelector("[data-home-lang-dropdown]")?.classList.toggle("hidden")===!1;a.setAttribute("aria-expanded",c?"true":"false");return}const r=t.target.closest("[data-home-set-locale]");if(r){t.preventDefault(),oe(r.dataset.homeSetLocale);return}t.target.closest("[data-home-lang-menu]")||Q(e);const o=t.target.closest("#home-pnl-chart-toggle");if(o){t.preventDefault();const d=e.querySelector("#home-pnl-chart-card")?.classList.toggle("hidden")===!1;o.setAttribute("aria-expanded",d?"true":"false");return}const n=t.target.closest("[data-home-tab]");if(!n)return;const s=n.dataset.homeTab;e.__homeMarketTab=s,e.querySelectorAll("[data-home-tab]").forEach(i=>{i.classList.toggle("active",i===n)}),Z(e,s)}),e.addEventListener("change",t=>{const a=t.target.closest("#home-fx-select");if(!a)return;const r=w(a.value);localStorage.setItem("vp_home_currency",r),W(e,r)}),k&&document.removeEventListener("click",k),k=t=>{e.contains(t.target)||Q(e)},document.addEventListener("click",k),de(e),W(e,q())}function je(){k&&(document.removeEventListener("click",k),k=null)}function ie(e,t,a,r){const o=performance.now(),n=a%1!==0;function s(i){const d=i-o,c=Math.min(d/r,1),m=1-Math.pow(1-c,3),l=t+(a-t)*m;e.textContent=n?l.toFixed(2):Math.round(l).toLocaleString(),c<1&&requestAnimationFrame(s)}requestAnimationFrame(s)}async function de(e){const t=y("mode")==="real"?"real":"demo";_("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:6e3}).then(a=>{(a?.real||a?.demo)&&(S("wallet",{real:a.real||{},demo:a.demo||{}}),A(e))}).catch(()=>A(e)),_(`/user/level.php?lang=${encodeURIComponent(D())}`,{timeout:0,retry:1,cacheTtl:3e4}).then(a=>{a?.ok!==!1&&(a?.current||Array.isArray(a?.levels))&&(S("level",a),ue(e))}).catch(()=>null),_("/markets.php?scope=home&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=30",{timeout:0,retry:1,cacheTtl:15e3}).then(a=>{if(a&&a.items){e.__homeAllMarkets=a.items;const r=e.__homeMarketTab||"all";Z(e,r)}}).catch(()=>{const a=e.querySelector("#home-markets");a&&(a.innerHTML='<p class="pro-empty">Markets are reconnecting...</p>')}),_(`/trade/portfolio.php?fast=1&mode=${t}`,{timeout:0,retry:1,cacheTtl:5e3}).then(a=>{a?.ok!==!1&&(S("portfolio",a),A(e,a))}).catch(()=>A(e)),Promise.allSettled([t==="real"?_(`/signals.php?bot=1&home=1&fast=1&lang=${encodeURIComponent(D())}`,{timeout:0,retry:1,cacheTtl:12e3}).catch(()=>null):Promise.resolve(null),_(`/invest/plans.php?kind=contract&home=1&lang=${encodeURIComponent(D())}`,{timeout:0,retry:1,cacheTtl:3e4}).catch(()=>null)]).then(([a,r])=>{const o=a.status==="fulfilled"?a.value:null,n=r.status==="fulfilled"?r.value:null;K(e,o?.items||[],n?.items||[])}).catch(()=>K(e,[],[]))}function A(e,t=y("portfolio")){const a=V();y("mode");const r=t?.metrics||{},o=Number(a.balance||a.available||0),n=Number(r.total_balance??o),s=Number(r.available_balance??a.available??o??0),i=Number(r.in_use_balance??a.holds??a.locked??0),d=Number(r.pnl_24_live??0),c=Number(r.pnl_total_live??0);e.__homeBalanceValues={total:n,available:s,inUse:i,pnl24:d,pnlTotal:c,currency:a.currency||"USDT"},E(e)}function E(e){const t=e.__homeBalanceValues||{},a=Number(t.total||0),r=Number(t.available||0),o=Number(t.inUse||0),n=Number(t.pnl24||0),s=Number(t.pnlTotal||0),i=t.currency||V().currency||"USDT",d=ke(),c=w(d.code),m=Number(d.rate||0)>0?Number(d.rate):1,l=I=>Number(I||0)*m,p=c==="USD"?i:c,u=e.querySelector("#home-balance-total");u&&(u.dataset.countTo=String(a),u.textContent=b(l(a),x(c)));const h=e.querySelector("#home-balance-currency");h&&(h.textContent=c==="USD"?i:`${c} - base ${i}`);const f=e.querySelector("#home-balance-available");f&&(f.textContent=`${b(l(r),x(c))} ${p}`);const g=e.querySelector("#home-balance-inuse");g&&(g.textContent=`${b(l(o),x(c))} ${p}`);const C=e.querySelector("#home-pnl-24");C&&(C.textContent=`${b(l(n),x(c))} ${p}`,C.className=n>=0?"text-buy":"text-sell");const L=e.querySelector("#home-pnl-total");L&&(L.textContent=`${b(l(s),x(c))} ${p}`,L.className=s>=0?"text-buy":"text-sell");const N=e.querySelector("#home-fx-total");N&&(N.textContent=`${b(l(a),x(c))} ${p}`);const U=e.querySelector("#home-fx-rate");U&&(U.textContent=c==="USD"?`1 ${i} = 1 USD`:`1 ${i} ~= ${b(m,x(c))} ${c}`);const R=e.querySelector("#home-fx-note");if(R){const I=d.source?` - ${d.source}`:"";R.textContent=c==="USD"?"Showing account base currency":`Converted estimate${I}`,R.classList.toggle("is-error",!!d.error)}const P=e.querySelector("#home-fx-select");P&&P.value!==c&&(P.value=c),we(e,l(s),l(n),p)}function ue(e){const t=y("level")||{},a=t.current||{},r=t.next||{},o=Number(t.confirmed_deposit_total||t.total_deposits||t.deposit_total||0),n=Number(r.min_deposit_total||r.min_total_deposit||r.required_deposit||0),s=Math.max(0,n-o),i=n>0?Math.min(100,Math.round(o/n*100)):o>0?100:0,d=e.querySelector(".pro-level-scroll-card .pro-section-head h2");d&&(d.textContent=`${a.name||a.name_en||a.level_code||"Starter"} progress`);const c=e.querySelector("#home-level-percent");c&&(c.textContent=`${i}%`);const m=e.querySelector("#home-level-progress");m&&(m.style.width=`${i}%`);const l=e.querySelector(".pro-level-rail");l&&(l.innerHTML=ee(t,{currentLevel:a,nextLevel:r,remainingToNext:s,nextRequired:n,levelProgress:i,mode:y("mode")==="real"?"real":"demo"}),requestAnimationFrame(()=>{const p=l.querySelector(".is-current");p&&p.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"})}))}function K(e,t=[],a=[]){const r=e.querySelector("#home-copy-section");if(!r)return;const o=y("mode")==="real"?"real":"demo",n=(t||[]).slice(0,6).map(pe).join(""),s=me(a||[]);r.innerHTML=`
    <div class="pro-earn-rail-group">
      <div class="pro-rail-label-row">
        <span>Copy desk</span>
        <a href="#/invest" class="btn-ghost btn-xs">Open Earn</a>
      </div>
      <div class="pro-earn-rail" id="copy-scroller">
        ${n||he(o)}
      </div>
    </div>
    <div class="pro-earn-rail-group">
      <div class="pro-rail-label-row">
        <span>Contracts</span>
        <a href="#/invest" class="btn-ghost btn-xs">View contracts</a>
      </div>
      <div class="pro-earn-rail" id="contracts-scroller">
        ${s}
      </div>
    </div>`}function pe(e){const t=re(e.direction),a=e.symbol||e.market_symbol||"--",r=De(e);return`<article class="copy-card pro-earn-card">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2 min-w-0">
        <span class="avalon-mini-mark" aria-hidden="true">🤖</span>
        <div class="min-w-0">
          <strong class="text-xs truncate block">${v(r)}</strong>
          <span class="text-[10px] text-muted truncate block">${v(a)} · AI copy basket</span>
        </div>
      </div>
      ${Ee(t)}
    </div>
    <div class="copy-card__quote py-2">
      <span class="status-chip ${Number(e.live_price||0)>0?"status-chip-live":"status-chip-locked"}">${Number(e.live_price||0)>0?"LIVE":"READY"}</span>
      <strong>${Number(e.live_price||0)>0?"$"+b(e.live_price,e.type==="forex"?5:2):"--"}</strong>
      <span class="${Number(e.live_change_pct||0)>=0?"text-buy":"text-sell"}">${F(e.live_change_pct||0)}</span>
    </div>
    <div class="copy-card__perf mt-2">
      <div class="copy-card__perf-item"><small>Entry</small><strong>${J(e.entry||e.entry_price,e.type)}</strong></div>
      <div class="copy-card__perf-item ${Number(e.win_rate||0)>=60?"pos":""}"><small>Win Rate</small><strong>${Number(e.win_rate||0)>0?Number(e.win_rate).toFixed(0)+"%":"--"}</strong></div>
      <div class="copy-card__perf-item pos"><small>TP</small><strong>${J(e.tp1||e.take_profit_1||e.take_profit,e.type)}</strong></div>
    </div>
    ${Ae(e)?'<p class="text-[10px] text-muted mt-2">Awaiting desk levels</p>':Me(e)}
    <a href="#/invest" class="btn-primary btn-sm w-full mt-3">Open copy desk</a>
  </article>`}function me(e){const t=(e||[]).slice(0,4);return(t.length?t:[{name:"Daily contract",cycle_roi_percent:1.8,duration_days:1,required_level:{name:"Starter"},status:"active"},{name:"Weekly contract",cycle_roi_percent:8.5,duration_days:7,required_level:{name:"Gold"},status:"active"},{name:"Monthly contract",cycle_roi_percent:18,duration_days:30,required_level:{name:"Platinum"},status:"active"}]).map(r=>{const o=r.required_level?.name||r.required_level?.name_en||r.level_name||"Starter",n=Number(r.cycle_roi_percent||r.roi_percent||r.rate||0),s=Number(r.duration_days||r.term_days||0);return`<article class="pro-contract-card pro-earn-card">
      <div class="pro-contract-badge">Contract</div>
      <strong>${v(r.name||r.name_en||"Level contract")}</strong>
      <small>${s>0?`${s} day term`:"Flexible term"} · ${v(o)} level</small>
      <div class="pro-contract-rate"><span>Target return</span><b>${n>0?n.toFixed(2)+"%":"Managed"}</b></div>
      <a href="#/invest" class="btn-ghost btn-sm w-full mt-3">View contract</a>
    </article>`}).join("")}function he(e){return`<article class="copy-card pro-earn-card pro-earn-empty-card">
    <div class="pro-contract-badge">Copy desk</div>
    <strong>${e==="real"?"No active signals yet":"Real account only"}</strong>
    <small>${e==="real"?"The desk will appear here once admin publishes live signals.":"Switch to Real and verify KYC to copy live signals."}</small>
    <a href="#/invest" class="btn-primary btn-sm w-full mt-3">Open Earn</a>
  </article>`}function ve(e,t){const a=e.querySelector("#home-markets");a&&(a.innerHTML=t.map(r=>`
    <button class="home-market-card" data-symbol="${$(r.symbol)}" data-type="${$(r.type||"crypto")}">
      ${ge(r,"home-market-icon")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <div class="font-semibold text-sm truncate">${v(r.symbol)}</div>
          ${qe(r)}
        </div>
        <div class="text-[11px] text-muted truncate">${v(r.name||r.symbol)}</div>
        <div class="mini-spark" aria-hidden="true">${Ue(r.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold" data-home-price>${Ne(r.price||r.q_price,r.type)}</div>
        <div class="text-[11px] ${Number(r.change_pct||r.q_change||0)>=0?"text-buy":"text-sell"}" data-home-change>${F(r.change_pct||r.q_change||0)}</div>
        <div class="text-[9px] text-muted uppercase mt-1" data-home-source>${T(r)}</div>
      </div>
    </button>
  `).join(""),a.querySelectorAll("[data-symbol]").forEach(r=>{r.addEventListener("click",()=>se("trade",{symbol:r.dataset.symbol,type:r.dataset.type}))}))}function Z(e,t="all"){const a=Array.isArray(e.__homeAllMarkets)?e.__homeAllMarkets:[],r=String(t||"all").toLowerCase(),o=r==="commodity"?"commodities":r,s=(o==="all"?a:a.filter(d=>fe(d.type)===o)).slice(0,o==="all"?16:30),i=e.querySelector("#home-markets");if(!s.length){i&&(i.innerHTML='<p class="pro-empty">No markets available in this desk.</p>');return}ve(e,s),be(e,s)}function fe(e){const t=String(e||"crypto").toLowerCase();return t==="commodity"?"commodities":t==="stock"?"stocks":t==="future"?"futures":t==="fx"?"forex":t}async function be(e,t){const a=new Map;t.forEach(o=>{const n=String(o.symbol||"").toUpperCase(),s=o.type||"crypto";n&&(a.has(s)||a.set(s,[]),a.get(s).push(n))});const r=[];await Promise.all([...a.entries()].map(async([o,n])=>{const s=[...new Set(n)],i=o==="crypto"?30:8,d=new Set;for(let c=0;c<s.length;c+=i){const m=s.slice(c,c+i),l=await _(`/quotes.php?symbols=${encodeURIComponent(m.join(","))}&type=${encodeURIComponent(o)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:o==="crypto"?2600:3400,cacheTtl:0,cache:"no-store"}).catch(()=>null);l?.items?.length&&l.items.forEach(p=>{d.add(String(p.symbol||"").toUpperCase()),j(e,p,o)})}n.forEach(c=>{const m=z(e,c),l=m&&m.querySelector("[data-home-price]")?.textContent!=="--";(!d.has(c)||!l)&&r.push({symbol:c,type:o})})})),ye(e,r)}async function ye(e,t){const a=new Map;t.forEach(r=>{!r.symbol||!r.type||(a.has(r.type)||a.set(r.type,[]),a.get(r.type).push(r.symbol))});for(const[r,o]of a.entries()){const n=r==="crypto"?12:2,s=r==="crypto"?12:4,i=[...new Set(o)].slice(0,s),d=[];for(let l=0;l<i.length;l+=n){const p=i.slice(l,l+n),u=await _(`/quotes.php?symbols=${encodeURIComponent(p.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:3400,cacheTtl:0,cache:"no-store"}).catch(()=>null);u?.items?.length&&u.items.forEach(h=>j(e,h,r)),p.forEach(h=>{const f=z(e,h);f&&f.querySelector("[data-home-price]")?.textContent!=="--"||d.push(h)})}const c=r==="crypto"?6:2,m=[...new Set(d)].slice(0,r==="crypto"?6:2);for(let l=0;l<m.length;l+=c){const p=m.slice(l,l+c),u=await _(`/quotes.php?symbols=${encodeURIComponent(p.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:3400,cacheTtl:0,cache:"no-store"}).catch(()=>null);u?.items?.length&&u.items.forEach(h=>j(e,h,r))}}}function j(e,t,a){const r=String(t.symbol||"").toUpperCase(),o=z(e,r);if(!o)return;const n=o.dataset.type||t.type||a,s=Number(t.price||t.q_price||0),i=Number(t.change_pct||t.q_change||0),d=o.querySelector("[data-home-price]"),c=o.querySelector("[data-home-change]"),m=o.querySelector("[data-home-source]");if(d&&s>0){const p=parseFloat(d.dataset.price||"0");if(d.textContent=O(s,n),d.dataset.price=String(s),p>0&&s!==p){const u=s>p?"animate-price-up":"animate-price-down";d.classList.remove("animate-price-up","animate-price-down"),requestAnimationFrame(()=>{d.classList.add(u),setTimeout(()=>d.classList.remove(u),800)})}}c&&(c.textContent=F(i),c.className=`text-[11px] ${i>=0?"text-buy":"text-sell"}`),m&&s>0&&(m.textContent=T(t));const l=o.querySelector("[data-quote-chip]");l&&s>0&&(l.className=`status-chip ${ae(t)}`,l.textContent=T(t))}function z(e,t){return[...e.querySelectorAll("[data-symbol]")].find(a=>String(a.dataset.symbol||"").toUpperCase()===String(t||"").toUpperCase())}function ge(e,t){const a=e.symbol||"--";return`<span class="${t}">
    <img src="${$(ce(e,e.type||"crypto"))}" alt="${$(a)}" loading="lazy" data-fallback="initial" />
    <b style="display:none">${v(le(a))}</b>
  </span>`}function ee(e,t){const a=Array.isArray(e?.levels)?e.levels:[],r=t.currentLevel?.id,o=String(t.currentLevel?.level_code||"").toLowerCase(),n=M(t.currentLevel),s=a.length?a:[t.currentLevel,t.nextLevel,{name:"Platinum",min_deposit_total:t.nextRequired?t.nextRequired*2:5e4,perks:"Higher contract limits and priority support"},{name:"VIP",min_deposit_total:t.nextRequired?t.nextRequired*4:1e5,perks:"Dedicated execution review and premium limits"}].filter(Boolean),i=new Map,d=new Set,c=u=>{if(!u||typeof u!="object")return;const h=M(u);h&&d.has(h)||(h&&d.add(h),i.set(h||`level-${i.size}`,u))};s.forEach(c),c(t.currentLevel),c(t.nextLevel);const m=Array.from(i.values()).sort((u,h)=>{const f=B(u)-B(h);return Math.abs(f)>1e-7?f:Number(u.sort_order||0)-Number(h.sort_order||0)}),l=m.findIndex(u=>{if(!u||typeof u!="object")return!1;const h=r&&Number(u.id)===Number(r),f=o&&String(u.level_code||"").toLowerCase()===o,g=n&&M(u)===n;return!!(h||f||g)}),p=[];return m.forEach((u,h)=>{if(!u||typeof u!="object")return;const f=h===l||r&&Number(u.id)===Number(r)||o&&String(u.level_code||"").toLowerCase()===o||n&&M(u)===n,g=l>=0&&h<l,C=B(u),L=f?t.levelProgress:g?100:0,N=u.name||u.name_en||u.level_code||`Tier ${h+1}`,U=t.nextLevel?.name||t.nextLevel?.name_en||"next tier";p.push(_e({label:f?"Current tier":g?"Completed tier":"Locked tier",title:N,sub:f?t.nextRequired>0?`${b(t.remainingToNext)} USDT to ${U}`:"Top tier permissions are active":g?"Unlocked and completed":C>0?`${b(C)} USDT required`:"Starter access",progress:L,state:f?"current":g?"completed":"locked",perks:$e(u,xe(N,f,t.mode))}))}),p.join("")}function M(e){return String(e?.id||e?.level_code||e?.name||e?.name_en||"").toLowerCase()}function B(e){return Number(e?.min_deposit_total||e?.min_total_deposit||e?.required_deposit||0)}function _e({label:e,title:t,sub:a,progress:r,state:o,perks:n}){const s=r==null?null:Math.max(0,Math.min(100,Number(r)||0)),i=Array.isArray(n)?n:[String(n||"")].filter(Boolean);return`<article class="pro-level-rail-card is-${$(o)}">
    <div class="pro-level-card-row"><span>${v(e)}</span>${s==null?"":`<b>${s}%</b>`}</div>
    <strong>${v(t)}</strong>
    <small>${v(a||"")}</small>
    ${s==null?"":`<div class="pro-mini-progress"><i style="width:${s}%"></i></div>`}
    <ul class="pro-level-benefits">
      ${i.slice(0,5).map(d=>`<li>${v(d)}</li>`).join("")}
    </ul>
  </article>`}function $e(e,t){const a=e?.perks||e?.perks_en||e?.features||e?.description||"",r=Array.isArray(t)?t:String(t||"").split("|");if(!a)return r.filter(Boolean);const o=String(a).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),n=o.split(/[\n\r,;|•·]+/).map(s=>s.trim()).filter(Boolean);return(n.length>1?n:[o]).slice(0,5)}function xe(e,t,a){const r=String(e||"").toLowerCase();return r.includes("vip")?["Priority account handling","Highest contract access","Premium copy desk limits"]:r.includes("platinum")?["Advanced copy desk access","Higher contract caps","Priority funding review"]:r.includes("gold")?["Premium copy desk","Higher contract caps","Dedicated account guidance"]:t&&a==="real"?["Live trading enabled","Wallet and funding access","Copy desk eligibility"]:["Market access","Watchlist and trade desk","Level progression benefits"]}function Se(){const e=q();return`<div class="home-fx-converter" aria-label="Local balance converter">
    <label class="home-fx-select-wrap">
      <span>Local currency</span>
      <select id="home-fx-select">${X.map(a=>`
    <option value="${$(a.code)}" ${a.code===e?"selected":""}>${a.flag} ${v(a.name)} (${a.code})</option>
  `).join("")}</select>
    </label>
    <div class="home-fx-preview">
      <small>Converted total</small>
      <b id="home-fx-total">${b(0)} USDT</b>
      <em id="home-fx-rate">1 USDT = 1 USD</em>
    </div>
    <p id="home-fx-note">Showing account base currency</p>
  </div>`}function q(){return w(localStorage.getItem("vp_home_currency")||"USD")}function w(e){const t=String(e||"USD").toUpperCase().replace(/[^A-Z]/g,"").slice(0,3);return X.some(a=>a.code===t)?t:"USD"}function x(e){return["JPY"].includes(e)?0:2}function ke(){const e=q(),t=y("home.fx")||{};return w(t.code)===e&&Number(t.rate||0)>0?{code:e,rate:Number(t.rate),source:t.source||"",error:!!t.error}:{code:e,rate:1,source:e==="USD"?"base":"",error:!1}}async function W(e,t=q()){const a=w(t);if(localStorage.setItem("vp_home_currency",a),a==="USD"){S("home.fx",{code:"USD",rate:1,source:"base",updated_at:Math.floor(Date.now()/1e3)}),E(e);return}const r=y("home.fx")||{};w(r.code)===a&&Number(r.rate||0)>0&&E(e);try{const o=await _(`/fx_rate.php?to=${encodeURIComponent(a)}`,{timeout:4e3,retry:1,cacheTtl:36e5}),n=Number(o?.rate||0);n>0?S("home.fx",{code:a,rate:n,source:o.source||"fx",updated_at:Number(o.updated_at||0),error:!1}):S("home.fx",{code:a,rate:Number(r.rate||1),source:o?.source||"fx",updated_at:Number(o?.updated_at||0),error:!0})}catch{S("home.fx",{code:a,rate:Number(r.rate||1),source:r.source||"cached",updated_at:Number(r.updated_at||0),error:!0})}E(e)}function Ce(){const e=D(),t=ne.map(a=>`<button type="button" class="home-lang-option${a===e?" is-active":""}" data-home-set-locale="${$(a)}">
      <span>${G[a]||"🏳️"}</span><b>${v(Y[a]||a.toUpperCase())}</b>
    </button>`).join("");return`<div class="home-lang-menu" data-home-lang-menu>
    <button class="home-lang-trigger" type="button" data-home-lang-trigger aria-expanded="false" title="Language">
      <span>${G[e]||"🏳️"}</span>
      <b>${v(Y[e]||e.toUpperCase())}</b>
      <i>${H.chevronDown}</i>
    </button>
    <div class="home-lang-dropdown hidden" data-home-lang-dropdown>${t}</div>
  </div>`}function Q(e){const t=e.querySelector("[data-home-lang-dropdown]"),a=e.querySelector("[data-home-lang-trigger]");t&&t.classList.add("hidden"),a&&a.setAttribute("aria-expanded","false")}function we(e,t,a,r=""){const o=e.querySelector("#home-pnl-chart-value"),n=e.querySelector("#home-pnl-spark");o&&(o.textContent=`${b(t)}${r?" "+r:""}`,o.className=t>=0?"text-buy":"text-sell"),n&&(n.innerHTML=te(t,a))}function te(e=0,t=0){const a=Number(e||0),r=Number(t||a||1),o=Array.from({length:12},(m,l)=>{const p=Math.sin((l+1)*.9)*Math.max(12,Math.abs(r)*.025);return a*(l/11)+p}),n=Math.min(...o,0),s=Math.max(...o,1),i=Math.max(1,s-n),d=o.map((m,l)=>{const p=5+l*10,u=54-(m-n)/i*44;return`${p.toFixed(1)},${u.toFixed(1)}`}).join(" "),c=a>=0?"var(--buy)":"var(--sell)";return`<svg viewBox="0 0 120 64" role="img" aria-label="PnL total chart" preserveAspectRatio="none">
    <path d="M0 54 H120" class="home-pnl-axis"></path>
    <polyline points="${d}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
  </svg>`}function Le(e){return e!=="real"?`<div class="relative min-h-[180px]">
      <div class="flex gap-4 overflow-x-auto pb-3 blur-[4px] opacity-50 pointer-events-none">
        ${Array(4).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
      </div>
      <div class="absolute inset-0 grid place-items-center">
        <div class="card-glass text-center p-6 max-w-sm">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3">${H.lock}</span>
          <strong class="block">Real Account Only</strong>
          <p class="text-muted text-sm mt-1">Switch to Real and verify KYC to copy live signals.</p>
        </div>
      </div>
    </div>`:`<div class="flex gap-4 overflow-x-auto pb-3 snap-x" id="copy-scroller">
    ${Array(3).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
  </div>`}function V(){const e=y("wallet")||{};return y("mode")==="real"?e.real||{balance:0,available:0,currency:"USDT"}:e.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}function Ne(e,t){const a=Number(e||0);return a>0?O(a,t):"--"}function T(e){const t=String(e.source||e.provider||"").toLowerCase(),a=String(e.timing_class||"").toLowerCase();return Number(e.price||e.q_price||0)<=0?"Unavailable":a==="stale"||e.is_stale?"Stale":e.delayed||t.includes("yahoo")?"Delayed":t.includes("binance")||t.includes("stream")||a==="live"?"Live":t?t.replace(/_/g," "):"Cached"}function ae(e){const t=T(e).toLowerCase();return t==="live"?"status-chip-live":t==="unavailable"?"status-chip-locked":"status-chip-delayed"}function qe(e){return`<span data-quote-chip class="status-chip ${ae(e)}">${T(e)}</span>`}function Te(e){const t=String(e?.level_code||e?.name_en||"starter").toLowerCase().replace(/[^a-z0-9]+/g,"-"),a=e?.name||e?.name_en||e?.level_code||"Starter";return`<span class="level-badge level-badge--${$(t)}">${v(a)}</span>`}function Ue(e){const t=String(e||"").split("").reduce((a,r)=>a+r.charCodeAt(0),0);return Array.from({length:12},(a,r)=>`<i style="height:${18+(t+r*13)%26}px"></i>`).join("")}function J(e,t){const a=Number(e||0);return a>0?O(a,t):"--"}function Ae(e){return!(Number(e.entry||e.entry_price||0)>0)||!(Number(e.tp1||e.take_profit_1||e.take_profit||0)>0)||!(Number(e.sl||e.stop_loss||0)>0)}function Me(e){return e.levels_source==="live_derived"?'<p class="text-[10px] text-spread mt-2">Live-derived desk levels</p>':""}function De(e){const t=String(e?.bot_name||e?.bot_name_en||"").trim();if(t)return t;const a=String(e?.symbol||e?.market_symbol||"AI").toUpperCase();return`Avalon ${a.replace(/(USDT|USD|_F)$/i,"")||a||"AI"} AI Bot`}function re(e){const t=String(e||"BUY").toUpperCase();return["BUY","SELL","NEUTRAL"].includes(t)?t:"BUY"}function Ee(e){const t=re(e);return`<span class="bot-direction-chip is-${t.toLowerCase()}">${v(t)}</span>`}export{je as cleanup,Be as mount,Ie as render};
