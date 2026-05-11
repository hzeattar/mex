const U="modulepreload",F=function(e){return"/assets/dist/"+e},S={},i=function(t,o,s){let r=Promise.resolve();if(o&&o.length>0){document.getElementsByTagName("link");const a=document.querySelector("meta[property=csp-nonce]"),d=a?.nonce||a?.getAttribute("nonce");r=Promise.allSettled(o.map(c=>{if(c=F(c),c in S)return;S[c]=!0;const v=c.endsWith(".css"),O=v?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${O}`))return;const u=document.createElement("link");if(u.rel=v?"stylesheet":U,v||(u.as="script"),u.crossOrigin="",u.href=c,d&&u.setAttribute("nonce",d),document.head.appendChild(u),v)return new Promise((H,N)=>{u.addEventListener("load",H),u.addEventListener("error",()=>N(new Error(`Unable to preload CSS for ${c}`)))})}))}function n(a){const d=new Event("vite:preloadError",{cancelable:!0});if(d.payload=a,window.dispatchEvent(d),!d.defaultPrevented)throw a}return r.then(a=>{for(const d of a||[])d.status==="rejected"&&n(d.reason);return t().catch(n)})},h=new Map;let b={};function q(e){return b=structuredClone(e),{get:p,set:m,subscribe:P,dispatch:z}}function p(e){return e?e.split(".").reduce((t,o)=>t&&t[o]!==void 0?t[o]:void 0,b):b}function m(e,t){const o=e.split("."),s=o.pop();let r=b;for(const a of o)(!r[a]||typeof r[a]!="object")&&(r[a]={}),r=r[a];const n=r[s];r[s]=t,n!==t&&W(e,t,n)}function P(e,t){return h.has(e)||h.set(e,new Set),h.get(e).add(t),()=>h.get(e)?.delete(t)}function z(e,t){const[o,s]=e.split("/"),r=Z.get(o);r&&r[s]&&r[s](t)}function W(e,t,o){h.forEach((s,r)=>{(e.startsWith(r)||r.startsWith(e)||r==="*")&&s.forEach(n=>{try{n(t,o,e)}catch(a){console.error(a)}})})}const Z=new Map,E=new Map;let f=null,Q=[];function l(e,t){E.set(e,{loader:t,module:null})}function R(e,t={}){const o=Object.keys(t).length?"?"+new URLSearchParams(t).toString():"";location.hash=`#/${e}${o}`}function L(){const e=(location.hash||"#/home").replace(/^#\/?/,""),[t,o=""]=e.split("?");return{path:t||"home",params:Object.fromEntries(new URLSearchParams(o))}}async function D(e){const t=async()=>{const{path:o,params:s}=L(),r=E.get(o)||E.get("home");if(r){for(const n of Q)if(n(o,s)===!1)return;try{if(r.module||(r.module=await r.loader()),f&&f.cleanup&&f.cleanup(),e.innerHTML="",f=r.module,r.module.render){const n=r.module.render(s);typeof n=="string"&&(e.innerHTML=n)}r.module.mount&&r.module.mount(e,s)}catch(n){console.error("Route error:",n),e.innerHTML=`<div class="p-8 text-center text-red">${n.message}</div>`}}};window.addEventListener("hashchange",t),await t()}const le=Object.freeze(Object.defineProperty({__proto__:null,currentPath:L,defineRoute:l,navigate:R,startRouter:D},Symbol.toStringTag,{value:"Module"})),I="/api",w=new Set;async function T(e,t={}){const o=new AbortController;w.add(o);const s=setTimeout(()=>o.abort(),t.timeout||8e3);try{const r=e.startsWith("http")?e:`${I}${e}`,n=await fetch(r,{method:t.method||"GET",headers:{Accept:"application/json",...t.headers||{}},body:t.body?JSON.stringify(t.body):void 0,signal:o.signal,credentials:"same-origin"});if(clearTimeout(s),!n.ok)throw new Error(`HTTP ${n.status}`);return await n.json()}catch(r){if(clearTimeout(s),r.name==="AbortError")throw r;if(t.retry&&t.retry>0)return await G(Math.min(1e3*(4-t.retry),3e3)),T(e,{...t,retry:t.retry-1});throw r}finally{w.delete(o)}}async function ie(e,t,o={}){return T(e,{...o,method:"POST",body:t,headers:{"Content-Type":"application/json",...o.headers||{}}})}async function de(e,t,o={}){const s=new AbortController;w.add(s);const r=setTimeout(()=>s.abort(),o.timeout||15e3);try{const n=await fetch(`${I}${e}`,{method:"POST",body:t,signal:s.signal,credentials:"same-origin"});if(clearTimeout(r),!n.ok)throw new Error(`HTTP ${n.status}`);return await n.json()}finally{clearTimeout(r),w.delete(s)}}function G(e){return new Promise(t=>setTimeout(t,e))}function ce(e,t=2){const o=Number(e||0);return o>=1e9?(o/1e9).toFixed(1)+"B":o>=1e6?(o/1e6).toFixed(1)+"M":o>=1e4?o.toLocaleString("en-US",{maximumFractionDigits:t}):o.toFixed(t)}function ue(e,t="crypto"){const o=Number(e||0);return o===0?"--":t==="crypto"?o>=1e3?o.toFixed(2):o>=1?o.toFixed(4):o.toFixed(6):t==="forex"?o.toFixed(5):o.toFixed(2)}function me(e){const t=Number(e||0);return`${t>=0?"+":""}${t.toFixed(2)}%`}function $(e){const t=document.createElement("div");return t.textContent=e||"",t.innerHTML}function pe(e){return String(e||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;")}function g(e,t=document){return t.querySelector(e)}function k(e,t=document){return[...t.querySelectorAll(e)]}function C(e,t,o,s){const r=n=>{const a=n.target.closest(t);a&&e.contains(a)&&s(n,a)};return e.addEventListener(o,r),()=>e.removeEventListener(o,r)}const x={home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"/></svg>',trade:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-5"/></svg>',portfolio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="16" height="12" rx="1"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M4 12h16"/></svg>',wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H5.5A2.5 2.5 0 0 1 3 16.5v-9Z"/><circle cx="16" cy="14" r="1.5"/></svg>',earn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M7 7h7.5a3.5 3.5 0 0 1 0 7H9.5a3.5 3.5 0 0 0 0 7H17"/></svg>',account:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',news:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>',support:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18v-6a7 7 0 0 1 14 0v6"/><path d="M5 13H3v4h2"/><path d="M19 13h2v4h-2"/></svg>',menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',deposit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 19h16"/></svg>',withdraw:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9m-5 5 5-5 5 5"/><path d="M4 5h16"/></svg>',kyc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="1"/><path d="M9 8h6M9 12h6M9 16h4"/><path d="m16 17 1 1 3-3"/></svg>',search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>',chevronDown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',arrowUp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m18 15-6-6-6 6"/></svg>',arrowDown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 0 0-9-9 9 9 0 0 0-7.5 4"/><path d="M3 12a9 9 0 0 0 9 9 9 9 0 0 0 7.5-4"/><path d="M4.5 7V3.5H8"/><path d="M19.5 17v3.5H16"/></svg>',star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/></svg>',lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'};let V=localStorage.getItem("vp_lang")||navigator.language?.slice(0,2)||"en",y={};const J=["en","ar","ru","de","fr","hi","zh"];async function K(e){J.includes(e)||(e="en"),V=e;try{const t=await fetch(`/assets/i18n/${e}.json`);t.ok?y=await t.json():y={}}catch{y={}}localStorage.setItem("vp_lang",e),document.documentElement.lang=e,document.documentElement.dir=e==="ar"?"rtl":"ltr"}function _(){return V}function X(e){K(e).then(()=>window.location.reload())}const Y=[{route:"home",label:"Home",icon:"home"},{route:"trade",label:"Trade",icon:"trade"},{route:"portfolio",label:"Portfolio",icon:"portfolio"},{route:"wallet",label:"Assets",icon:"wallet"},{route:"invest",label:"Earn",icon:"earn"},{route:"news",label:"News",icon:"news"},{route:"support",label:"Support",icon:"support"},{route:"account",label:"Account",icon:"account"}],ee=[{route:"home",label:"Home",icon:"home"},{route:"trade",label:"Trade",icon:"trade"},{route:"invest",label:"Earn",icon:"earn"},{route:"wallet",label:"Assets",icon:"wallet"}];function te(e){const t=p("brand");e.innerHTML=`
    <div class="flex min-h-screen">
      <!-- Desktop Sidebar -->
      <aside class="hidden lg:flex flex-col w-[240px] border-r border-line bg-panel/60 backdrop-blur-xl fixed inset-y-0 left-0 z-40 overflow-y-auto">
        <div class="p-5 border-b border-line">
          <a href="#/home" class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-green grid place-items-center text-white font-black text-sm">V</div>
            <strong class="text-base tracking-tight">${$(t.name)}</strong>
          </a>
        </div>
        <nav class="flex-1 p-3 space-y-1" id="sidebar-nav">
          ${Y.map(oe).join("")}
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
            <strong class="text-sm">${$(t.name)}</strong>
          </a>
          <div class="flex items-center gap-2">
            <button class="btn-ghost btn-sm" id="mode-toggle-mobile">
              <span class="w-2 h-2 rounded-full" id="mode-dot-mobile"></span>
              <span id="mode-label-mobile">${p("mode")==="real"?"Real":"Demo"}</span>
            </button>
            <button class="w-9 h-9 grid place-items-center rounded-lg border border-line" id="market-drawer-btn" aria-label="Markets">
              ${x.menu}
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
            <select class="input text-xs w-16 py-1" id="lang-select">
              <option value="en" ${_()==="en"?"selected":""}>EN</option>
              <option value="ar" ${_()==="ar"?"selected":""}>عربي</option>
              <option value="ru" ${_()==="ru"?"selected":""}>RU</option>
            </select>
            <button class="relative w-9 h-9 grid place-items-center rounded-lg border border-line hover:border-line-strong" id="notifications-btn">
              ${x.bell}
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
        ${ee.map(re).join("")}
      </nav>

      <!-- Market Drawer (mobile) -->
      <div class="fixed inset-0 z-[200] hidden" id="market-drawer-overlay">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" data-close-drawer></div>
        <div class="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-auto rounded-t-2xl border border-line bg-panel shadow-card animate-slide-up" id="market-drawer-sheet">
        </div>
      </div>
    </div>`,ne(e),j(),M(),P("mode",M),window.addEventListener("hashchange",j)}function oe(e){return`<a href="#/${e.route}" class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-text hover:bg-panel-2 transition-colors" data-nav="${e.route}">
    <span class="w-5 h-5 shrink-0">${x[e.icon]||""}</span>
    <span>${e.label}</span>
  </a>`}function re(e){return`<a href="#/${e.route}" class="mobile-nav-link flex flex-col items-center justify-center gap-1 py-2 text-muted hover:text-text transition-colors" data-nav="${e.route}">
    <span class="w-6 h-6">${x[e.icon]||""}</span>
    <span class="text-[10px] font-medium">${e.label}</span>
  </a>`}function ne(e){C(e,"[data-nav]","click",(o,s)=>{o.preventDefault(),R(s.dataset.nav)});const t=g("#market-drawer-btn",e);g("#market-drawer-overlay",e),t&&t.addEventListener("click",()=>A(!0)),C(e,"[data-close-drawer]","click",()=>A(!1)),k('[id^="mode-toggle"]',e).forEach(o=>{o.addEventListener("click",se)}),g("#lang-select",e)?.addEventListener("change",o=>X(o.target.value))}function A(e){const t=g("#market-drawer-overlay");t&&(t.classList.toggle("hidden",!e),document.body.classList.toggle("overflow-hidden",e))}function se(){const t=p("mode")==="real"?"demo":"real";set("mode",t),localStorage.setItem("vp_mode",t),M(),window.location.reload()}function j(){const{path:e}=L();k("[data-nav]").forEach(t=>{const o=t.dataset.nav===e;t.classList.toggle("text-text",o),t.classList.toggle("bg-accent-soft",o),t.classList.toggle("text-muted",!o)})}function M(){const t=p("mode")==="real";k('[id^="mode-dot"]').forEach(o=>{o.className=`w-2 h-2 rounded-full ${t?"bg-green":"bg-gold"}`}),k('[id^="mode-label"]').forEach(o=>{o.textContent=t?"Real":"Demo"})}const ae={booted:!1,user:null,brand:{name:"VertexPluse",tagline:"Professional trading workspace"},mode:localStorage.getItem("vp_mode")||"demo",route:"home",type:localStorage.getItem("vp_type")||"crypto",symbol:localStorage.getItem("vp_symbol")||"BTCUSDT",market:localStorage.getItem("vp_market")||"spot",tf:localStorage.getItem("vp_tf")||"1m",marketTab:localStorage.getItem("vp_tab")||"crypto",search:"",markets:{},activeQuote:null,visibleQuotes:{},orderType:"MARKET",amount:100,leverage:10,portfolio:null,orders:[],wallet:null,finance:{deposits:[],withdrawals:[]},kyc:null,level:null,invest:{tab:"copy",signals:[],copies:[],contracts:[],mine:[]},news:{items:[],loaded:!1},support:{items:[]},notifications:{items:[],unread:0,open:!1}};q(ae);l("home",()=>i(()=>import("./home-G6oVYZOw.js"),[]));l("trade",()=>i(()=>import("./trade-CwiVIkjl.js"),[]));l("portfolio",()=>i(()=>import("./portfolio-Ch3liDlL.js"),[]));l("wallet",()=>i(()=>import("./wallet-K7jtLPyi.js"),[]));l("deposit",()=>i(()=>import("./funding-Cj3Xxoqb.js"),[]));l("withdraw",()=>i(()=>import("./funding-Cj3Xxoqb.js"),[]));l("kyc",()=>i(()=>import("./kyc-C5cjPCT_.js"),[]));l("invest",()=>i(()=>import("./invest-BKikxp3g.js"),[]));l("news",()=>i(()=>import("./news-48CmYE3N.js"),[]));l("support",()=>i(()=>import("./support-qV_cF0Pb.js"),[]));l("account",()=>i(()=>import("./account-DcWDVUcH.js"),[]));async function B(){const e=document.getElementById("app");try{const t=await T("/bootstrap.php",{timeout:9e3});if(!t||t.ok===!1)throw new Error(t?.error||"Bootstrap failed");m("user",t.user||null),m("brand",{...p("brand"),...t.brand||{}}),m("wallet",t.wallet||null),m("level",t.level||null),m("kyc",t.kyc||null),t.markets&&m("markets",t.markets),m("booted",!0),te(e);const o=e.querySelector("#view");await D(o)}catch(t){e.innerHTML=`
      <div class="min-h-screen flex items-center justify-center p-8">
        <div class="card max-w-md text-center space-y-4">
          <h1 class="text-xl font-bold text-red">Connection Failed</h1>
          <p class="text-muted text-sm">${t.message}</p>
          <button class="btn-primary" onclick="location.reload()">Retry</button>
        </div>
      </div>`}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",B):B();export{i as _,T as a,me as b,pe as c,C as d,$ as e,ie as f,p as g,de as h,x as i,ce as m,R as n,ue as p,le as r,m as s};
