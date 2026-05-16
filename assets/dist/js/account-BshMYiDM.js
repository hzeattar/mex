import{g as l,e as n,m as h,i as s,b as y}from"./main-Vy0nb4vq.js";function U(){const e=l("user")||{},t=l("kyc")||{},a=l("level")||{},c=l("wallet")||{},u=l("mode")==="real"?"real":"demo",r=a.current||e.user_level||{},p=a.next||e.next_level||null,_=Number(a.confirmed_deposit_total??e.confirmed_deposit_total??0),v=Number(p?.min_deposit_total||0),A=v>0?Math.min(100,Math.round(_/v*100)):100,g=e.live_account||e.accounts?.live||{},$=e.demo_account||e.accounts?.demo||{},b=u==="real"?g:$,x=u==="real"?c.real:c.demo,w=e.display_name||e.name||e.username||e.email||"Client",L=String(w).trim().charAt(0).toUpperCase()||"U",k=(t.status||"not submitted").replace(/_/g," ");return`
    <div class="space-y-5 animate-fade-in account-page">
      <section class="account-hero">
        <div class="account-hero-main">
          <div class="account-avatar">${n(L)}</div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xl lg:text-2xl font-black truncate">${n(w)}</h1>
              ${S(r)}
              <span class="status-chip ${u==="real"?"status-chip-live":"status-chip-derived"}">${u==="real"?"Real account":"Demo account"}</span>
            </div>
            <p class="text-muted text-sm truncate">${n(e.email||"No email attached")}</p>
            <div class="account-meta-grid">
              ${f("Account",b.account_no||"--",!!b.account_no)}
              ${f("KYC",C(k),!1,t.status==="approved"?"text-buy":"")}
              ${f("Available",`${h(x?.available||0)} ${n(x?.currency||"")}`)}
            </div>
          </div>
        </div>
        <div class="account-hero-side">
          <span class="text-[10px] uppercase tracking-wider text-muted">Customer tier</span>
          <strong>${n(r?.name||r?.name_en||"Starter")}</strong>
          <div class="level-progress">
            <span style="width:${A}%"></span>
          </div>
          <small>${p?`${h(Math.max(0,v-_))} USDT to ${n(p.name||p.name_en||"next level")}`:"Top level unlocked"}</small>
        </div>
      </section>

      <section class="level-strip">
        ${(a.levels||[r].filter(Boolean)).map(o=>`
          <div class="level-pill ${M(o,r)?"is-current":""}">
            ${S(o)}
            <strong>${n(o.name||o.name_en||o.level_code||"Level")}</strong>
            <small>${h(o.min_deposit_total||0)} USDT deposits</small>
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
            ${d("Username",e.username||"--")}
            ${d("Email",e.email||"--")}
            ${d("Live account",g.account_no||"--",g.account_no)}
            ${d("Demo account",$.account_no||"--",$.account_no)}
            ${d("Login provider",e.login_provider||"web")}
          </div>
        </section>

        <section class="card account-panel">
          <div class="panel-headline">
            <span class="badge-green">Security</span>
            <h2>Protection center</h2>
          </div>
          <div class="security-grid">
            ${m("KYC documents",C(k),s.kyc,t.status==="approved")}
            ${m("Email access",e.email?"Connected":"Missing",s.account,!!e.email)}
            ${m("Funding review","Manual admin approval",s.wallet,!0)}
            ${m("Risk controls","Internal execution",s.lock,!0)}
          </div>
        </section>
      </div>

      <section class="card">
        <div class="panel-headline">
          <span class="badge-accent">Workspace</span>
          <h2>Quick actions</h2>
        </div>
        <div class="account-action-grid">
          ${i("#/trade",s.trade,"Trading desk","Open charts and execution controls")}
          ${i("#/wallet",s.wallet,"Funds","Deposit, withdraw, and ledger")}
          ${i("#/invest",s.earn,"Copy & contracts","Real-only copy desk and level contracts")}
          ${i("#/kyc",s.kyc,"KYC verification","Manage verification documents")}
          ${i("#/support",s.support,"Support center","Create and follow tickets")}
          ${i("#/news",s.news,"Market news","Platform updates and research desk")}
        </div>
      </section>

      <section class="card account-session-card">
        <div>
          <span class="badge-red">Session</span>
          <h2 class="font-black mt-2">Sign out safely</h2>
          <p class="text-sm text-muted mt-1">Use this when you finish from a shared device. Admin access remains available only through /admin/.</p>
        </div>
        <a href="/logout.php" class="btn-danger btn-sm">Logout</a>
      </section>
    </div>`}function D(e){e.querySelectorAll("[data-copy]").forEach(t=>{t.addEventListener("click",async()=>{const a=t.getAttribute("data-copy")||"";if(a)try{await navigator.clipboard.writeText(a),t.textContent="Copied",setTimeout(()=>{t.textContent="Copy"},1200)}catch{}})})}function C(e){return String(e||"").replace(/\b\w/g,t=>t.toUpperCase())}function M(e,t){return String(e?.level_code||e?.id||"")===String(t?.level_code||t?.id||"")}function S(e){const t=String(e?.level_code||e?.name_en||"starter").toLowerCase().replace(/[^a-z0-9]+/g,"-"),a=e?.name||e?.name_en||e?.level_code||"Starter";return`<span class="level-badge level-badge--${y(t)}">${n(a)}</span>`}function f(e,t,a=!1,c=""){return`<div class="account-mini-meta">
    <span>${n(e)}</span>
    <strong class="${c}">${n(t)}</strong>
    ${a?`<button type="button" data-copy="${y(t)}">Copy</button>`:""}
  </div>`}function d(e,t,a=""){return`<div class="info-row">
    <span>${n(e)}</span>
    <strong>${n(t)}</strong>
    ${a?`<button type="button" class="btn-ghost btn-xs" data-copy="${y(a)}">Copy</button>`:""}
  </div>`}function m(e,t,a,c){return`<div class="security-card ${c?"is-ok":"is-warn"}">
    <div class="security-icon">${a}</div>
    <div>
      <strong>${n(e)}</strong>
      <span>${n(t)}</span>
    </div>
  </div>`}function i(e,t,a,c){return`<a class="account-action-card" href="${e}">
    <span>${t}</span>
    <strong>${n(a)}</strong>
    <small>${n(c)}</small>
  </a>`}export{D as mount,U as render};
