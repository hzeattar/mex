import{j as l,k as r,t as a,g as t,m as o,h as y}from"./main-DhOMcNbC.js";function D(){const e=l("user")||{},c=l("kyc")||{},s=l("level")||{},$=l("wallet")||{},f=l("brand")||{},k=l("support")||{},i=l("mode")==="real"?"real":"demo",n=i==="real"?$.real||{}:$.demo||{},p=s.current||e.user_level||{},u=s.next||e.next_level||null,v=Number(s.confirmed_deposit_total??e.confirmed_deposit_total??0),d=Number(u?.min_deposit_total||0),S=d>0?Math.min(100,Math.round(v/d*100)):100,x=d>0?Math.max(0,d-v):0,h=e.display_name||e.name||e.username||e.email||"Client",A=String(h).trim().charAt(0).toUpperCase()||"U",b=String(c.status||"not submitted").replace(/_/g," "),g=f.whatsapp_support_url||k.whatsapp_url||"",_=/^https?:\/\//i.test(String(g));return`
    <div class="account-page account-page-pro account-page-lean animate-fade-in">
      <a href="#/home" class="account-mobile-back">${r.back}<span>${a("nav.home","Dashboard")}</span></a>

      <section class="account-hero account-hero-lean">
        <div class="account-hero-main">
          <div class="account-avatar">${t(A)}</div>
          <div class="min-w-0">
            <div class="account-title-row">
              <h1>${t(h)}</h1>
              ${C(p)}
              <span class="status-chip ${i==="real"?"status-chip-live":"status-chip-derived"}">${i==="real"?a("account.real_account","Real account"):a("account.demo_account","Demo account")}</span>
            </div>
            <p class="text-muted text-sm truncate">${t(e.email||a("account.no_email","No email attached"))}</p>
            <div class="account-lean-metrics">
              ${m(a("account.kyc","KYC"),w(b),c.status==="approved"?"text-buy":"")}
              ${m(a("trade.available","Available"),`${o(n.available||0)} ${n.currency||"USDT"}`)}
              ${m(a("account.in_use","In use"),`${o(n.holds||0)} ${n.currency||"USDT"}`)}
            </div>
          </div>
        </div>
        <div class="account-hero-side">
          <span>${a("account.level_progress","Level progress")}</span>
          <strong>${t(p?.name||p?.name_en||p?.level_code||a("level.starter","Starter"))}</strong>
          <div class="level-progress"><span style="width:${S}%"></span></div>
          <small>${u?`${o(x)} USDT ${a("account.to","to")} ${t(u.name||u.name_en||a("account.next_level","next level"))}`:a("account.top_level","Top level unlocked")}</small>
        </div>
      </section>

      <section class="account-lean-grid">
        <article class="card account-lean-card">
          <span class="account-lean-icon">${r.kyc}</span>
          <div>
            <span class="badge-accent">${a("account.verification","Verification")}</span>
            <h2>${a("account.kyc_status","KYC status")}</h2>
            <p>${t(w(b))}</p>
          </div>
          <a class="btn-ghost btn-sm" href="#/kyc">${a("account.view_kyc","View KYC")}</a>
        </article>

        <article class="card account-lean-card account-wallet-summary">
          <span class="account-lean-icon">${r.wallet}</span>
          <div>
            <span class="badge-green">${a("account.wallet","Wallet")}</span>
            <h2>${t(n.currency||"USDT")}</h2>
            <p>${i==="real"?a("account.real_wallet","Real wallet selected"):a("account.demo_wallet","Demo wallet selected")}</p>
          </div>
          <div class="account-wallet-lines">
            <span><small>${a("account.total","Total")}</small><b>${o(n.balance||0)}</b></span>
            <span><small>${a("trade.available","Available")}</small><b>${o(n.available||0)}</b></span>
            <span><small>${a("account.in_use","In use")}</small><b>${o(n.holds||0)}</b></span>
          </div>
        </article>

        <article class="card account-lean-card">
          <span class="account-lean-icon account-whatsapp-icon">${r.whatsapp}</span>
          <div>
            <span class="badge-green">${a("account.support","Support")}</span>
            <h2>${a("account.whatsapp_desk","WhatsApp desk")}</h2>
            <p>${_?a("account.open_direct_chat","Open a direct support chat."):a("account.whatsapp_not_configured","WhatsApp support link is not configured yet.")}</p>
          </div>
          ${_?`<a class="btn-primary btn-sm" href="${y(g)}" target="_blank" rel="noopener">${a("account.open_whatsapp","Open WhatsApp")}</a>`:`<button class="btn-ghost btn-sm" disabled>${a("account.setup_required","Setup required")}</button>`}
        </article>

        <article class="card account-session-card account-lean-card">
          <span class="account-lean-icon">${r.lock}</span>
          <div>
            <span class="badge-red">${a("account.session","Session")}</span>
            <h2>${a("account.sign_out","Sign out")}</h2>
            <p>${a("account.close_session","Close this client session safely.")}</p>
          </div>
          <a href="/logout.php" class="btn-danger btn-sm">${a("account.logout","Logout")}</a>
        </article>
      </section>
    </div>`}function T(){}function w(e){return String(e||"").replace(/\b\w/g,c=>c.toUpperCase())}function m(e,c,s=""){return`<span><small>${t(e)}</small><b class="${s}">${t(c)}</b></span>`}function C(e){const c=String(e?.level_code||e?.name_en||"starter").toLowerCase().replace(/[^a-z0-9]+/g,"-"),s=e?.name||e?.name_en||e?.level_code||a("level.starter","Starter");return`<span class="level-badge level-badge--${y(c)}">${t(s)}</span>`}export{T as mount,D as render};
