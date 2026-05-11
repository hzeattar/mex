import{g as e,i as a,e as i}from"./main-uNfiIqMk.js";function r(){const s=e("user")||{},c=e("kyc"),n=e("level");return`
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center text-white text-xl font-black">${i((s.username||s.email||"U")[0].toUpperCase())}</div>
          <div>
            <h1 class="text-xl font-bold">${i(s.username||s.email||"Account")}</h1>
            <p class="text-muted text-sm">${i(s.email||"")}</p>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section class="card space-y-3">
          <h2 class="font-semibold">Account Details</h2>
          <div class="space-y-2 text-sm">
            ${t("Username",s.username||"--")}
            ${t("Email",s.email||"--")}
            ${t("KYC Status",c?.status||"Not submitted")}
            ${t("Level",n?.current?.name_en||n?.current?.symbol||"Standard")}
            ${t("Mode",e("mode")==="real"?"Real":"Demo")}
          </div>
        </section>

        <section class="card space-y-3">
          <h2 class="font-semibold">Quick Links</h2>
          <div class="grid grid-cols-2 gap-2">
            <a href="#/kyc" class="btn-ghost btn-sm justify-start">${a.kyc} KYC Verification</a>
            <a href="#/deposit" class="btn-ghost btn-sm justify-start">${a.deposit} Deposit</a>
            <a href="#/withdraw" class="btn-ghost btn-sm justify-start">${a.withdraw} Withdraw</a>
            <a href="#/support" class="btn-ghost btn-sm justify-start">${a.support} Support</a>
          </div>
        </section>
      </div>

      <section class="card">
        <h2 class="font-semibold mb-3">Settings</h2>
        <div class="space-y-3">
          <label class="flex items-center justify-between">
            <span class="text-sm">Notifications</span>
            <input type="checkbox" class="w-4 h-4" checked />
          </label>
          <div class="pt-3 border-t border-line">
            <a href="/logout.php" class="btn-danger btn-sm">Logout</a>
          </div>
        </div>
      </section>
    </div>`}function l(s){}function t(s,c){return`<div class="flex justify-between py-2 border-b border-line/30"><span class="text-muted">${s}</span><span class="font-medium">${i(c)}</span></div>`}export{l as mount,r as render};
