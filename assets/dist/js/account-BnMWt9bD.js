import{g as v,e as t,m as l,i as s,c as x}from"./main-Ca1FYfWG.js";function F(){const e=v("user")||{},a=v("kyc")||{},n=v("level")||{},o=v("wallet")||{},i=v("mode")==="real"?"real":"demo",c=n.current||e.user_level||{},r=n.next||e.next_level||null,f=Number(n.confirmed_deposit_total??e.confirmed_deposit_total??0),u=Number(r?.min_deposit_total||0),S=u>0?Math.min(100,Math.round(f/u*100)):100,w=e.live_account||e.accounts?.live||{},b=e.demo_account||e.accounts?.demo||{},T=i==="real"?w:b,L=i==="real"?o.real:o.demo,U=e.display_name||e.name||e.username||e.email||"Client",R=String(U).trim().charAt(0).toUpperCase()||"U",D=(a.status||"not submitted").replace(/_/g," "),k=u>0?Math.max(0,u-f):0,B=i==="real"?"Live internal execution":"Practice trading workspace",E=[a.status==="approved",!!(c?.level_code||c?.id),i==="real",!!e.email].filter(Boolean).length;return`
    <div class="space-y-5 animate-fade-in account-page">
      <section class="account-hero">
        <div class="account-hero-main">
          <div class="account-avatar">${t(R)}</div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xl lg:text-2xl font-black truncate">${t(U)}</h1>
              ${A(c)}
              <span class="status-chip ${i==="real"?"status-chip-live":"status-chip-derived"}">${i==="real"?"Real account":"Demo account"}</span>
            </div>
            <p class="text-muted text-sm truncate">${t(e.email||"No email attached")}</p>
            <div class="account-meta-grid">
              ${_("Account",T.account_no||"--",!!T.account_no)}
              ${_("KYC",M(D),!1,a.status==="approved"?"text-buy":"")}
              ${_("Available",`${l(L?.available||0)} ${t(L?.currency||"")}`)}
            </div>
          </div>
        </div>
        <div class="account-hero-side">
          <span class="text-[10px] uppercase tracking-wider text-muted">Customer tier</span>
          <strong>${t(c?.name||c?.name_en||"Starter")}</strong>
          <div class="level-progress">
            <span style="width:${S}%"></span>
          </div>
          <small>${r?`${l(k)} USDT to ${t(r.name||r.name_en||"next level")}`:"Top level unlocked"}</small>
        </div>
      </section>

      <section class="level-strip">
        ${(n.levels||[c].filter(Boolean)).map(d=>`
          <div class="level-pill ${P(d,c)?"is-current":""}">
            ${A(d)}
            <strong>${t(d.name||d.name_en||d.level_code||"Level")}</strong>
            <small>${l(d.min_deposit_total||0)} USDT deposits</small>
          </div>
        `).join("")}
      </section>

      <section class="card account-overview-card">
        <div class="panel-headline">
          <span class="badge-accent">Control center</span>
          <h2>Workspace overview</h2>
        </div>
        <div class="account-overview-grid">
          ${h("Workspace",i==="real"?"Real":"Demo",B,s.trade)}
          ${h("Unlocked",`${E}/4`,"Funding, copy desk, contracts, security",s.lock)}
          ${h("Progress",r?`${S}%`:"100%",r?`${l(k)} USDT to next tier`:"Top level active",s.earn)}
          ${h("Support",e.email?"Priority desk":"Email missing","Funding review and KYC follow-up",s.support)}
        </div>
      </section>

      <div class="account-grid">
        <section class="card account-panel">
          <div class="panel-headline">
            <span class="badge-accent">Identity</span>
            <h2>Account details</h2>
          </div>
          <div class="info-list">
            ${m("Username",e.username||"--")}
            ${m("Email",e.email||"--")}
            ${m("Live account",w.account_no||"--",w.account_no)}
            ${m("Demo account",b.account_no||"--",b.account_no)}
            ${m("Login provider",e.login_provider||"web")}
          </div>
        </section>

        <section class="card account-panel">
          <div class="panel-headline">
            <span class="badge-green">Security</span>
            <h2>Protection center</h2>
          </div>
          <div class="security-grid">
            ${$("KYC documents",M(D),s.kyc,a.status==="approved")}
            ${$("Email access",e.email?"Connected":"Missing",s.account,!!e.email)}
            ${$("Funding review","Manual admin approval",s.wallet,!0)}
            ${$("Risk controls","Internal execution",s.lock,!0)}
          </div>
        </section>
      </div>

      <div class="account-grid">
        <section class="card account-panel">
          <div class="panel-headline">
            <span class="badge-green">Progression</span>
            <h2>Level roadmap</h2>
          </div>
          <div class="account-roadmap">
            ${C("Current",c?.name||c?.name_en||"Starter","Enabled for your account today")}
            ${C("Confirmed deposits",`${l(f)} USDT`,r?`${l(k)} USDT remaining`:"Target reached")}
            ${C("Next tier",r?.name||r?.name_en||"Top level",r?`${l(u)} USDT threshold`:"No higher tier available")}
          </div>
        </section>

        <section class="card account-panel">
          <div class="panel-headline">
            <span class="badge-accent">Preferences</span>
            <h2>Client workspace</h2>
          </div>
          <div class="account-preference-list">
            ${y("Trading mode",i==="real"?"Real account selected":"Demo account selected")}
            ${y("Funding workflow","Manual deposits and withdrawals with admin review")}
            ${y("Copy desk access",a.status==="approved"&&i==="real"?"Eligible for real-only copy desk":"Locked until Real + KYC")}
            ${y("Contract access",c?.name||c?.name_en?`Mapped to ${c?.name||c?.name_en}`:"Starter access")}
          </div>
        </section>
      </div>

      <section class="card">
        <div class="panel-headline">
          <span class="badge-accent">Workspace</span>
          <h2>Quick actions</h2>
        </div>
        <div class="account-action-grid">
          ${p("#/trade",s.trade,"Trading desk","Open charts and execution controls")}
          ${p("#/wallet",s.wallet,"Funds","Deposit, withdraw, and ledger")}
          ${p("#/invest",s.earn,"Copy & contracts","Real-only copy desk and level contracts")}
          ${p("#/kyc",s.kyc,"KYC verification","Manage verification documents")}
          ${p("#/support",s.support,"Support center","Create and follow tickets")}
          ${p("#/news",s.news,"Market news","Platform updates and research desk")}
        </div>
      </section>

      <section class="card account-capability-panel">
        <div class="panel-headline">
          <span class="badge-green">Level benefits</span>
          <h2>Unlocked capabilities</h2>
        </div>
        <div class="account-capability-grid">
          ${g("Funding","Manual deposits and withdrawals",a.status==="approved",s.deposit)}
          ${g("Copy desk","Real-only copy trading signals",a.status==="approved"&&i==="real",s.earn)}
          ${g("Contracts","Tier-based managed contracts",!!(c?.level_code||c?.id),s.trade)}
          ${g("Security","KYC and account controls",a.status==="approved",s.lock)}
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
    </div>`}function K(e){e.querySelectorAll("[data-copy]").forEach(a=>{a.addEventListener("click",async()=>{const n=a.getAttribute("data-copy")||"";if(n)try{await navigator.clipboard.writeText(n),a.textContent="Copied",setTimeout(()=>{a.textContent="Copy"},1200)}catch{}})})}function M(e){return String(e||"").replace(/\b\w/g,a=>a.toUpperCase())}function P(e,a){return String(e?.level_code||e?.id||"")===String(a?.level_code||a?.id||"")}function A(e){const a=String(e?.level_code||e?.name_en||"starter").toLowerCase().replace(/[^a-z0-9]+/g,"-"),n=e?.name||e?.name_en||e?.level_code||"Starter";return`<span class="level-badge level-badge--${x(a)}">${t(n)}</span>`}function _(e,a,n=!1,o=""){return`<div class="account-mini-meta">
    <span>${t(e)}</span>
    <strong class="${o}">${t(a)}</strong>
    ${n?`<button type="button" data-copy="${x(a)}">Copy</button>`:""}
  </div>`}function m(e,a,n=""){return`<div class="info-row">
    <span>${t(e)}</span>
    <strong>${t(a)}</strong>
    ${n?`<button type="button" class="btn-ghost btn-xs" data-copy="${x(n)}">Copy</button>`:""}
  </div>`}function $(e,a,n,o){return`<div class="security-card ${o?"is-ok":"is-warn"}">
    <div class="security-icon">${n}</div>
    <div>
      <strong>${t(e)}</strong>
      <span>${t(a)}</span>
    </div>
  </div>`}function p(e,a,n,o){return`<a class="account-action-card" href="${e}">
    <span>${a}</span>
    <strong>${t(n)}</strong>
    <small>${t(o)}</small>
  </a>`}function g(e,a,n,o){return`<div class="account-capability-card ${n?"enabled":"locked"}">
    <span>${o}</span>
    <div>
      <strong>${t(e)}</strong>
      <small>${t(a)}</small>
    </div>
    <em>${n?"Ready":"Locked"}</em>
  </div>`}function h(e,a,n,o){return`<article class="account-overview-item">
    <span>${o}</span>
    <div>
      <small>${t(e)}</small>
      <strong>${t(a)}</strong>
      <p>${t(n)}</p>
    </div>
  </article>`}function C(e,a,n){return`<div class="roadmap-step">
    <span>${t(e)}</span>
    <strong>${t(a)}</strong>
    <small>${t(n)}</small>
  </div>`}function y(e,a){return`<div class="preference-row">
    <span>${t(e)}</span>
    <strong>${t(a)}</strong>
  </div>`}export{K as mount,F as render};
