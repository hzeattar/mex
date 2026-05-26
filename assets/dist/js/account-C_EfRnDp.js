import{g as d,e as n,m as h,i as s,b}from"./main-BjluwQko.js";function R(){const e=d("user")||{},a=d("kyc")||{},t=d("level")||{},c=d("wallet")||{},r=d("mode")==="real"?"real":"demo",o=t.current||e.user_level||{},p=t.next||e.next_level||null,_=Number(t.confirmed_deposit_total??e.confirmed_deposit_total??0),g=Number(p?.min_deposit_total||0),L=g>0?Math.min(100,Math.round(_/g*100)):100,$=e.live_account||e.accounts?.live||{},y=e.demo_account||e.accounts?.demo||{},w=r==="real"?$:y,k=r==="real"?c.real:c.demo,x=e.display_name||e.name||e.username||e.email||"Client",M=String(x).trim().charAt(0).toUpperCase()||"U",C=(a.status||"not submitted").replace(/_/g," ");return`
    <div class="space-y-5 animate-fade-in account-page">
      <section class="account-hero">
        <div class="account-hero-main">
          <div class="account-avatar">${n(M)}</div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xl lg:text-2xl font-black truncate">${n(x)}</h1>
              ${A(o)}
              <span class="status-chip ${r==="real"?"status-chip-live":"status-chip-derived"}">${r==="real"?"Real account":"Demo account"}</span>
            </div>
            <p class="text-muted text-sm truncate">${n(e.email||"No email attached")}</p>
            <div class="account-meta-grid">
              ${f("Account",w.account_no||"--",!!w.account_no)}
              ${f("KYC",S(C),!1,a.status==="approved"?"text-buy":"")}
              ${f("Available",`${h(k?.available||0)} ${n(k?.currency||"")}`)}
            </div>
          </div>
        </div>
        <div class="account-hero-side">
          <span class="text-[10px] uppercase tracking-wider text-muted">Customer tier</span>
          <strong>${n(o?.name||o?.name_en||"Starter")}</strong>
          <div class="level-progress">
            <span style="width:${L}%"></span>
          </div>
          <small>${p?`${h(Math.max(0,g-_))} USDT to ${n(p.name||p.name_en||"next level")}`:"Top level unlocked"}</small>
        </div>
      </section>

      <section class="level-strip">
        ${(t.levels||[o].filter(Boolean)).map(i=>`
          <div class="level-pill ${T(i,o)?"is-current":""}">
            ${A(i)}
            <strong>${n(i.name||i.name_en||i.level_code||"Level")}</strong>
            <small>${h(i.min_deposit_total||0)} USDT deposits</small>
          </div>
        `).join("")}
      </section>

      <div class="account-grid">
        <section class="card account-panel">
          <div class="panel-headline">
            <span class="badge-accent">Identity</span>
            <h2>Account details</h2>
          </div>
          <div class="info-list">
            ${u("Username",e.username||"--")}
            ${u("Email",e.email||"--")}
            ${u("Live account",$.account_no||"--",$.account_no)}
            ${u("Demo account",y.account_no||"--",y.account_no)}
            ${u("Login provider",e.login_provider||"web")}
          </div>
        </section>

        <section class="card account-panel">
          <div class="panel-headline">
            <span class="badge-green">Security</span>
            <h2>Protection center</h2>
          </div>
          <div class="security-grid">
            ${v("KYC documents",S(C),s.kyc,a.status==="approved")}
            ${v("Email access",e.email?"Connected":"Missing",s.account,!!e.email)}
            ${v("Funding review","Manual admin approval",s.wallet,!0)}
            ${v("Risk controls","Internal execution",s.lock,!0)}
          </div>
        </section>
      </div>

      <section class="card">
        <div class="panel-headline">
          <span class="badge-accent">Workspace</span>
          <h2>Quick actions</h2>
        </div>
        <div class="account-action-grid">
          ${l("#/trade",s.trade,"Trading desk","Open charts and execution controls")}
          ${l("#/wallet",s.wallet,"Funds","Deposit, withdraw, and ledger")}
          ${l("#/invest",s.earn,"Copy & contracts","Real-only copy desk and level contracts")}
          ${l("#/kyc",s.kyc,"KYC verification","Manage verification documents")}
          ${l("#/support",s.support,"Support center","Create and follow tickets")}
          ${l("#/news",s.news,"Market news","Platform updates and research desk")}
        </div>
      </section>

      <section class="card account-capability-panel">
        <div class="panel-headline">
          <span class="badge-green">Level benefits</span>
          <h2>Unlocked capabilities</h2>
        </div>
        <div class="account-capability-grid">
          ${m("Funding","Manual deposits and withdrawals",a.status==="approved",s.deposit)}
          ${m("Copy desk","Real-only copy trading signals",a.status==="approved"&&r==="real",s.earn)}
          ${m("Contracts","Tier-based managed contracts",!!(o?.level_code||o?.id),s.trade)}
          ${m("Security","KYC and account controls",a.status==="approved",s.lock)}
        </div>
      </section>

      <section class="card account-session-card">
        <div>
          <span class="badge-red">Session</span>
          <h2 class="font-black mt-2">Sign out safely</h2>
          <p class="text-sm text-muted mt-1">Use this when you finish from a shared device. Your trading session and client workspace will close safely.</p>
        </div>
        <a href="/logout.php" class="btn-danger btn-sm">Logout</a>
      </section>
    </div>`}function D(e){e.querySelectorAll("[data-copy]").forEach(a=>{a.addEventListener("click",async()=>{const t=a.getAttribute("data-copy")||"";if(t)try{await navigator.clipboard.writeText(t),a.textContent="Copied",setTimeout(()=>{a.textContent="Copy"},1200)}catch{}})})}function S(e){return String(e||"").replace(/\b\w/g,a=>a.toUpperCase())}function T(e,a){return String(e?.level_code||e?.id||"")===String(a?.level_code||a?.id||"")}function A(e){const a=String(e?.level_code||e?.name_en||"starter").toLowerCase().replace(/[^a-z0-9]+/g,"-"),t=e?.name||e?.name_en||e?.level_code||"Starter";return`<span class="level-badge level-badge--${b(a)}">${n(t)}</span>`}function f(e,a,t=!1,c=""){return`<div class="account-mini-meta">
    <span>${n(e)}</span>
    <strong class="${c}">${n(a)}</strong>
    ${t?`<button type="button" data-copy="${b(a)}">Copy</button>`:""}
  </div>`}function u(e,a,t=""){return`<div class="info-row">
    <span>${n(e)}</span>
    <strong>${n(a)}</strong>
    ${t?`<button type="button" class="btn-ghost btn-xs" data-copy="${b(t)}">Copy</button>`:""}
  </div>`}function v(e,a,t,c){return`<div class="security-card ${c?"is-ok":"is-warn"}">
    <div class="security-icon">${t}</div>
    <div>
      <strong>${n(e)}</strong>
      <span>${n(a)}</span>
    </div>
  </div>`}function l(e,a,t,c){return`<a class="account-action-card" href="${e}">
    <span>${a}</span>
    <strong>${n(t)}</strong>
    <small>${n(c)}</small>
  </a>`}function m(e,a,t,c){return`<div class="account-capability-card ${t?"enabled":"locked"}">
    <span>${c}</span>
    <div>
      <strong>${n(e)}</strong>
      <small>${n(a)}</small>
    </div>
    <em>${t?"Ready":"Locked"}</em>
  </div>`}export{D as mount,R as render};
