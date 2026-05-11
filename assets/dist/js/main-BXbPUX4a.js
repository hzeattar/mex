const O="modulepreload",N=function(t){return"/assets/dist/"+t},M={},l=function(e,o,s){let r=Promise.resolve();if(o&&o.length>0){document.getElementsByTagName("link");const a=document.querySelector("meta[property=csp-nonce]"),d=a?.nonce||a?.getAttribute("nonce");r=Promise.allSettled(o.map(c=>{if(c=N(c),c in M)return;M[c]=!0;const v=c.endsWith(".css"),I=v?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${I}`))return;const u=document.createElement("link");if(u.rel=v?"stylesheet":O,v||(u.as="script"),u.crossOrigin="",u.href=c,d&&u.setAttribute("nonce",d),document.head.appendChild(u),v)return new Promise((V,H)=>{u.addEventListener("load",V),u.addEventListener("error",()=>H(new Error(`Unable to preload CSS for ${c}`)))})}))}function n(a){const d=new Event("vite:preloadError",{cancelable:!0});if(d.payload=a,window.dispatchEvent(d),!d.defaultPrevented)throw a}return r.then(a=>{for(const d of a||[])d.status==="rejected"&&n(d.reason);return e().catch(n)})},h=new Map;let g={};function F(t){return g=structuredClone(t),{get:p,set:m,subscribe:B,dispatch:U}}function p(t){return t?t.split(".").reduce((e,o)=>e&&e[o]!==void 0?e[o]:void 0,g):g}function m(t,e){const o=t.split("."),s=o.pop();let r=g;for(const a of o)(!r[a]||typeof r[a]!="object")&&(r[a]={}),r=r[a];const n=r[s];r[s]=e,n!==e&&q(t,e,n)}function B(t,e){return h.has(t)||h.set(t,new Set),h.get(t).add(e),()=>h.get(t)?.delete(e)}function U(t,e){const[o,s]=t.split("/"),r=z.get(o);r&&r[s]&&r[s](e)}function q(t,e,o){h.forEach((s,r)=>{(t.startsWith(r)||r.startsWith(t)||r==="*")&&s.forEach(n=>{try{n(e,o,t)}catch(a){console.error(a)}})})}const z=new Map,x=new Map;let f=null,j=[];function i(t,e){x.set(t,{loader:e,module:null})}function P(t,e={}){const o=Object.keys(e).length?"?"+new URLSearchParams(e).toString():"";location.hash=`#/${t}${o}`}function _(){const t=(location.hash||"#/home").replace(/^#\/?/,""),[e,o=""]=t.split("?");return{path:e||"home",params:Object.fromEntries(new URLSearchParams(o))}}function W(t){j.push(t)}async function R(t){const e=async()=>{const{path:o,params:s}=_(),r=x.get(o)||x.get("home");if(r){for(const n of j)if(n(o,s)===!1)return;try{if(r.module||(r.module=await r.loader()),f&&f.cleanup&&f.cleanup(),t.innerHTML="",f=r.module,r.module.render){const n=r.module.render(s);typeof n=="string"&&(t.innerHTML=n)}r.module.mount&&r.module.mount(t,s)}catch(n){console.error("Route error:",n),t.innerHTML=`<div class="p-8 text-center text-red">${n.message}</div>`}}};window.addEventListener("hashchange",e),await e()}const oe=Object.freeze(Object.defineProperty({__proto__:null,currentPath:_,defineRoute:i,navigate:P,onBeforeRoute:W,startRouter:R},Symbol.toStringTag,{value:"Module"})),D="/api",b=new Set;async function E(t,e={}){const o=new AbortController;b.add(o);const s=setTimeout(()=>o.abort(),e.timeout||8e3);try{const r=t.startsWith("http")?t:`${D}${t}`,n=await fetch(r,{method:e.method||"GET",headers:{Accept:"application/json",...e.headers||{}},body:e.body?JSON.stringify(e.body):void 0,signal:o.signal,credentials:"same-origin"});if(clearTimeout(s),!n.ok)throw new Error(`HTTP ${n.status}`);return await n.json()}catch(r){if(clearTimeout(s),r.name==="AbortError")throw r;if(e.retry&&e.retry>0)return await Z(Math.min(1e3*(4-e.retry),3e3)),E(t,{...e,retry:e.retry-1});throw r}finally{b.delete(o)}}async function re(t,e,o={}){return E(t,{...o,method:"POST",body:e,headers:{"Content-Type":"application/json",...o.headers||{}}})}async function ne(t,e,o={}){const s=new AbortController;b.add(s);const r=setTimeout(()=>s.abort(),o.timeout||15e3);try{const n=await fetch(`${D}${t}`,{method:"POST",body:e,signal:s.signal,credentials:"same-origin"});if(clearTimeout(r),!n.ok)throw new Error(`HTTP ${n.status}`);return await n.json()}finally{clearTimeout(r),b.delete(s)}}function Z(t){return new Promise(e=>setTimeout(e,t))}function se(t,e=2){const o=Number(t||0);return o>=1e9?(o/1e9).toFixed(1)+"B":o>=1e6?(o/1e6).toFixed(1)+"M":o>=1e4?o.toLocaleString("en-US",{maximumFractionDigits:e}):o.toFixed(e)}function ae(t,e="crypto"){const o=Number(t||0);return o===0?"--":e==="crypto"?o>=1e3?o.toFixed(2):o>=1?o.toFixed(4):o.toFixed(6):e==="forex"?o.toFixed(5):o.toFixed(2)}function ie(t){const e=Number(t||0);return`${e>=0?"+":""}${e.toFixed(2)}%`}function T(t){const e=document.createElement("div");return e.textContent=t||"",e.innerHTML}function le(t){return String(t||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;")}function y(t,e=document){return e.querySelector(t)}function w(t,e=document){return[...e.querySelectorAll(t)]}function L(t,e,o,s){const r=n=>{const a=n.target.closest(e);a&&t.contains(a)&&s(n,a)};return t.addEventListener(o,r),()=>t.removeEventListener(o,r)}const k={home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"/></svg>',trade:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-5"/></svg>',portfolio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="16" height="12" rx="1"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M4 12h16"/></svg>',wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H5.5A2.5 2.5 0 0 1 3 16.5v-9Z"/><circle cx="16" cy="14" r="1.5"/></svg>',earn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M7 7h7.5a3.5 3.5 0 0 1 0 7H9.5a3.5 3.5 0 0 0 0 7H17"/></svg>',account:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',news:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>',support:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18v-6a7 7 0 0 1 14 0v6"/><path d="M5 13H3v4h2"/><path d="M19 13h2v4h-2"/></svg>',menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',deposit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 19h16"/></svg>',withdraw:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9m-5 5 5-5 5 5"/><path d="M4 5h16"/></svg>',kyc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="1"/><path d="M9 8h6M9 12h6M9 16h4"/><path d="m16 17 1 1 3-3"/></svg>',search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>',chevronDown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',arrowUp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m18 15-6-6-6 6"/></svg>',arrowDown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 0 0-9-9 9 9 0 0 0-7.5 4"/><path d="M3 12a9 9 0 0 0 9 9 9 9 0 0 0 7.5-4"/><path d="M4.5 7V3.5H8"/><path d="M19.5 17v3.5H16"/></svg>',star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/></svg>',lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'},Q=[{route:"home",label:"Home",icon:"home"},{route:"trade",label:"Trade",icon:"trade"},{route:"portfolio",label:"Portfolio",icon:"portfolio"},{route:"wallet",label:"Assets",icon:"wallet"},{route:"invest",label:"Earn",icon:"earn"},{route:"news",label:"News",icon:"news"},{route:"support",label:"Support",icon:"support"},{route:"account",label:"Account",icon:"account"}],G=[{route:"home",label:"Home",icon:"home"},{route:"trade",label:"Trade",icon:"trade"},{route:"invest",label:"Earn",icon:"earn"},{route:"wallet",label:"Assets",icon:"wallet"}];function J(t){const e=p("brand");t.innerHTML=`
    <div class="flex min-h-screen">
      <!-- Desktop Sidebar -->
      <aside class="hidden lg:flex flex-col w-[240px] border-r border-line bg-panel/60 backdrop-blur-xl fixed inset-y-0 left-0 z-40 overflow-y-auto">
        <div class="p-5 border-b border-line">
          <a href="#/home" class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-green grid place-items-center text-white font-black text-sm">V</div>
            <strong class="text-base tracking-tight">${T(e.name)}</strong>
          </a>
        </div>
        <nav class="flex-1 p-3 space-y-1" id="sidebar-nav">
          ${Q.map(K).join("")}
        </nav>
        <div class="p-3 border-t border-line">
          <button class="w-full btn-ghost text-xs" id="mode-toggle-desktop">
            <span class="w-2 h-2 rounded-full" id="mode-dot-desktop"></span>
            <span id="mode-label-desktop">${p("mode")==="real"?"Real":"Demo"}</span>
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex-1 lg:ml-[240px] flex flex-col min-h-screen">
        <!-- Mobile Header -->
        <header class="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b border-line bg-panel/90 backdrop-blur-xl">
          <a href="#/home" class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-green grid place-items-center text-white font-black text-[10px]">V</div>
            <strong class="text-sm">${T(e.name)}</strong>
          </a>
          <div class="flex items-center gap-2">
            <button class="btn-ghost btn-sm" id="mode-toggle-mobile">
              <span class="w-2 h-2 rounded-full" id="mode-dot-mobile"></span>
              <span id="mode-label-mobile">${p("mode")==="real"?"Real":"Demo"}</span>
            </button>
            <button class="w-9 h-9 grid place-items-center rounded-lg border border-line" id="market-drawer-btn" aria-label="Markets">
              ${k.menu}
            </button>
          </div>
        </header>

        <!-- Top Bar (Desktop) -->
        <header class="hidden lg:flex items-center justify-between px-6 h-14 border-b border-line bg-panel/40 backdrop-blur-sm" id="topbar">
          <div id="topbar-title" class="text-sm text-muted"></div>
          <div class="flex items-center gap-3">
            <button class="btn-ghost btn-sm" id="mode-toggle-topbar">
              <span class="w-2 h-2 rounded-full" id="mode-dot-topbar"></span>
              <span id="mode-label-topbar">${p("mode")==="real"?"Real":"Demo"}</span>
            </button>
            <div class="text-right">
              <div class="text-[10px] text-muted uppercase" id="balance-currency">USDT</div>
              <div class="text-sm font-bold" id="balance-amount">0.00</div>
            </div>
            <button class="relative w-9 h-9 grid place-items-center rounded-lg border border-line hover:border-line-strong" id="notifications-btn">
              ${k.bell}
              <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red text-[9px] font-bold grid place-items-center hidden" id="notif-badge">0</span>
            </button>
          </div>
        </header>

        <!-- View container -->
        <main class="flex-1 p-4 lg:p-6 pb-24 lg:pb-6" id="view">
          <div class="flex items-center justify-center min-h-[50vh]">
            <div class="skeleton w-8 h-8 rounded-full"></div>
          </div>
        </main>
      </div>

      <!-- Mobile Bottom Nav -->
      <nav class="lg:hidden fixed bottom-0 inset-x-0 z-50 grid grid-cols-4 bg-panel/95 backdrop-blur-xl border-t border-line" style="padding-bottom: var(--safe-bottom)" id="bottom-nav">
        ${G.map(X).join("")}
      </nav>

      <!-- Market Drawer (mobile) -->
      <div class="fixed inset-0 z-[200] hidden" id="market-drawer-overlay">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" data-close-drawer></div>
        <div class="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-auto rounded-t-2xl border border-line bg-panel shadow-card animate-slide-up" id="market-drawer-sheet">
        </div>
      </div>
    </div>`,Y(t),$(),C(),B("mode",C),window.addEventListener("hashchange",$)}function K(t){return`<a href="#/${t.route}" class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-text hover:bg-panel-2 transition-colors" data-nav="${t.route}">
    <span class="w-5 h-5 shrink-0">${k[t.icon]||""}</span>
    <span>${t.label}</span>
  </a>`}function X(t){return`<a href="#/${t.route}" class="mobile-nav-link flex flex-col items-center justify-center gap-1 py-2 text-muted hover:text-text transition-colors" data-nav="${t.route}">
    <span class="w-6 h-6">${k[t.icon]||""}</span>
    <span class="text-[10px] font-medium">${t.label}</span>
  </a>`}function Y(t){L(t,"[data-nav]","click",(o,s)=>{o.preventDefault(),P(s.dataset.nav)});const e=y("#market-drawer-btn",t);y("#market-drawer-overlay",t),e&&e.addEventListener("click",()=>S(!0)),L(t,"[data-close-drawer]","click",()=>S(!1)),w('[id^="mode-toggle"]',t).forEach(o=>{o.addEventListener("click",ee)})}function S(t){const e=y("#market-drawer-overlay");e&&(e.classList.toggle("hidden",!t),document.body.classList.toggle("overflow-hidden",t))}async function ee(){const e=p("mode")==="real"?"demo":"real";set("mode",e),localStorage.setItem("vp_mode",e)}function $(){const{path:t}=_();w("[data-nav]").forEach(e=>{const o=e.dataset.nav===t;e.classList.toggle("text-text",o),e.classList.toggle("bg-accent-soft",o),e.classList.toggle("text-muted",!o)})}function C(){const e=p("mode")==="real";w('[id^="mode-dot"]').forEach(o=>{o.className=`w-2 h-2 rounded-full ${e?"bg-green":"bg-gold"}`}),w('[id^="mode-label"]').forEach(o=>{o.textContent=e?"Real":"Demo"})}const te={booted:!1,user:null,brand:{name:"VertexPluse",tagline:"Professional trading workspace"},mode:localStorage.getItem("vp_mode")||"demo",route:"home",type:localStorage.getItem("vp_type")||"crypto",symbol:localStorage.getItem("vp_symbol")||"BTCUSDT",market:localStorage.getItem("vp_market")||"spot",tf:localStorage.getItem("vp_tf")||"1m",marketTab:localStorage.getItem("vp_tab")||"crypto",search:"",markets:{},activeQuote:null,visibleQuotes:{},orderType:"MARKET",amount:100,leverage:10,portfolio:null,orders:[],wallet:null,finance:{deposits:[],withdrawals:[]},kyc:null,level:null,invest:{tab:"copy",signals:[],copies:[],contracts:[],mine:[]},news:{items:[],loaded:!1},support:{items:[]},notifications:{items:[],unread:0,open:!1}};F(te);i("home",()=>l(()=>import("./home-DAUSsfU-.js"),[]));i("trade",()=>l(()=>import("./trade-Bfuasd_h.js"),[]));i("portfolio",()=>l(()=>import("./portfolio-Df2Cttw7.js"),[]));i("wallet",()=>l(()=>import("./wallet-C9yZNd-3.js"),[]));i("deposit",()=>l(()=>import("./funding-BK3oQVcG.js"),[]));i("withdraw",()=>l(()=>import("./funding-BK3oQVcG.js"),[]));i("kyc",()=>l(()=>import("./kyc-Bq4z-wW0.js"),[]));i("invest",()=>l(()=>import("./invest-5_dGmExd.js"),[]));i("news",()=>l(()=>import("./news-WuX7FpfZ.js"),[]));i("support",()=>l(()=>import("./support-fnnsvUln.js"),[]));i("account",()=>l(()=>import("./account-BJAB0Y3B.js"),[]));async function A(){const t=document.getElementById("app");try{const e=await E("/bootstrap.php",{timeout:9e3});if(!e||e.ok===!1)throw new Error(e?.error||"Bootstrap failed");m("user",e.user||null),m("brand",{...p("brand"),...e.brand||{}}),m("wallet",e.wallet||null),m("level",e.level||null),m("kyc",e.kyc||null),e.markets&&m("markets",e.markets),m("booted",!0),J(t);const o=t.querySelector("#view");await R(o)}catch(e){t.innerHTML=`
      <div class="min-h-screen flex items-center justify-center p-8">
        <div class="card max-w-md text-center space-y-4">
          <h1 class="text-xl font-bold text-red">Connection Failed</h1>
          <p class="text-muted text-sm">${e.message}</p>
          <button class="btn-primary" onclick="location.reload()">Retry</button>
        </div>
      </div>`}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",A):A();export{l as _,E as a,ie as b,le as c,L as d,T as e,re as f,p as g,ne as h,k as i,se as m,P as n,ae as p,oe as r,m as s};
