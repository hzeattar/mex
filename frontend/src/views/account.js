// Account View
import { get } from '../state/store.js';
import { esc, escAttr, money } from '../utils/format.js';
import { icons } from '../components/common/Icons.js';

export function render() {
  const user = get('user') || {};
  const kyc = get('kyc') || {};
  const level = get('level') || {};
  const wallet = get('wallet') || {};
  const mode = get('mode') === 'real' ? 'real' : 'demo';
  const current = level.current || user.user_level || {};
  const next = level.next || user.next_level || null;
  const confirmed = Number(level.confirmed_deposit_total ?? user.confirmed_deposit_total ?? 0);
  const nextTarget = Number(next?.min_deposit_total || 0);
  const progress = nextTarget > 0 ? Math.min(100, Math.round((confirmed / nextTarget) * 100)) : 100;
  const liveAccount = user.live_account || user.accounts?.live || {};
  const demoAccount = user.demo_account || user.accounts?.demo || {};
  const activeAccount = mode === 'real' ? liveAccount : demoAccount;
  const balance = mode === 'real' ? wallet.real : wallet.demo;
  const name = user.display_name || user.name || user.username || user.email || 'Client';
  const initial = String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
  const kycStatus = (kyc.status || 'not submitted').replace(/_/g, ' ');
  const depositGap = nextTarget > 0 ? Math.max(0, nextTarget - confirmed) : 0;
  const accountState = mode === 'real' ? 'Live internal execution' : 'Practice trading workspace';
  const capabilityCount = [
    kyc.status === 'approved',
    Boolean(current?.level_code || current?.id),
    mode === 'real',
    Boolean(user.email),
  ].filter(Boolean).length;

  return `
    <div class="space-y-5 animate-fade-in account-page">
      <section class="account-hero">
        <div class="account-hero-main">
          <div class="account-avatar">${esc(initial)}</div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xl lg:text-2xl font-black truncate">${esc(name)}</h1>
              ${levelBadge(current)}
              <span class="status-chip ${mode === 'real' ? 'status-chip-live' : 'status-chip-derived'}">${mode === 'real' ? 'Real account' : 'Demo account'}</span>
            </div>
            <p class="text-muted text-sm truncate">${esc(user.email || 'No email attached')}</p>
            <div class="account-meta-grid">
              ${miniMeta('Account', activeAccount.account_no || '--', activeAccount.account_no ? true : false)}
              ${miniMeta('KYC', title(kycStatus), false, kyc.status === 'approved' ? 'text-buy' : '')}
              ${miniMeta('Available', `${money(balance?.available || 0)} ${esc(balance?.currency || '')}`)}
            </div>
          </div>
        </div>
        <div class="account-hero-side">
          <span class="text-[10px] uppercase tracking-wider text-muted">Customer tier</span>
          <strong>${esc(current?.name || current?.name_en || 'Starter')}</strong>
          <div class="level-progress">
            <span style="width:${progress}%"></span>
          </div>
          <small>${next ? `${money(depositGap)} USDT to ${esc(next.name || next.name_en || 'next level')}` : 'Top level unlocked'}</small>
        </div>
      </section>

      <section class="level-strip">
        ${(level.levels || [current].filter(Boolean)).map(lvl => `
          <div class="level-pill ${sameLevel(lvl, current) ? 'is-current' : ''}">
            ${levelBadge(lvl)}
            <strong>${esc(lvl.name || lvl.name_en || lvl.level_code || 'Level')}</strong>
            <small>${money(lvl.min_deposit_total || 0)} USDT deposits</small>
          </div>
        `).join('')}
      </section>

      <section class="card account-overview-card">
        <div class="panel-headline">
          <span class="badge-accent">Control center</span>
          <h2>Workspace overview</h2>
        </div>
        <div class="account-overview-grid">
          ${overviewCard('Workspace', mode === 'real' ? 'Real' : 'Demo', accountState, icons.trade)}
          ${overviewCard('Unlocked', `${capabilityCount}/4`, 'Funding, copy desk, contracts, security', icons.lock)}
          ${overviewCard('Progress', next ? `${progress}%` : '100%', next ? `${money(depositGap)} USDT to next tier` : 'Top level active', icons.earn)}
          ${overviewCard('Support', user.email ? 'Priority desk' : 'Email missing', 'Funding review and KYC follow-up', icons.support)}
        </div>
      </section>

      <div class="account-grid">
        <section class="card account-panel">
          <div class="panel-headline">
            <span class="badge-accent">Identity</span>
            <h2>Account details</h2>
          </div>
          <div class="info-list">
            ${infoRow('Username', user.username || '--')}
            ${infoRow('Email', user.email || '--')}
            ${infoRow('Live account', liveAccount.account_no || '--', liveAccount.account_no)}
            ${infoRow('Demo account', demoAccount.account_no || '--', demoAccount.account_no)}
            ${infoRow('Login provider', user.login_provider || 'web')}
          </div>
        </section>

        <section class="card account-panel">
          <div class="panel-headline">
            <span class="badge-green">Security</span>
            <h2>Protection center</h2>
          </div>
          <div class="security-grid">
            ${securityCard('KYC documents', title(kycStatus), icons.kyc, kyc.status === 'approved')}
            ${securityCard('Email access', user.email ? 'Connected' : 'Missing', icons.account, Boolean(user.email))}
            ${securityCard('Funding review', 'Manual admin approval', icons.wallet, true)}
            ${securityCard('Risk controls', 'Internal execution', icons.lock, true)}
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
            ${roadmapStep('Current', current?.name || current?.name_en || 'Starter', 'Enabled for your account today')}
            ${roadmapStep('Confirmed deposits', `${money(confirmed)} USDT`, next ? `${money(depositGap)} USDT remaining` : 'Target reached')}
            ${roadmapStep('Next tier', next?.name || next?.name_en || 'Top level', next ? `${money(nextTarget)} USDT threshold` : 'No higher tier available')}
          </div>
        </section>

        <section class="card account-panel">
          <div class="panel-headline">
            <span class="badge-accent">Preferences</span>
            <h2>Client workspace</h2>
          </div>
          <div class="account-preference-list">
            ${preferenceRow('Trading mode', mode === 'real' ? 'Real account selected' : 'Demo account selected')}
            ${preferenceRow('Funding workflow', 'Manual deposits and withdrawals with admin review')}
            ${preferenceRow('Copy desk access', kyc.status === 'approved' && mode === 'real' ? 'Eligible for real-only copy desk' : 'Locked until Real + KYC')}
            ${preferenceRow('Contract access', current?.name || current?.name_en ? `Mapped to ${current?.name || current?.name_en}` : 'Starter access')}
          </div>
        </section>
      </div>

      <section class="card">
        <div class="panel-headline">
          <span class="badge-accent">Workspace</span>
          <h2>Quick actions</h2>
        </div>
        <div class="account-action-grid">
          ${actionLink('#/trade', icons.trade, 'Trading desk', 'Open charts and execution controls')}
          ${actionLink('#/wallet', icons.wallet, 'Funds', 'Deposit, withdraw, and ledger')}
          ${actionLink('#/invest', icons.earn, 'Copy & contracts', 'Real-only copy desk and level contracts')}
          ${actionLink('#/kyc', icons.kyc, 'KYC verification', 'Manage verification documents')}
          ${actionLink('#/support', icons.support, 'Support center', 'Create and follow tickets')}
          ${actionLink('#/news', icons.news, 'Market news', 'Platform updates and research desk')}
        </div>
      </section>

      <section class="card account-capability-panel">
        <div class="panel-headline">
          <span class="badge-green">Level benefits</span>
          <h2>Unlocked capabilities</h2>
        </div>
        <div class="account-capability-grid">
          ${capabilityCard('Funding', 'Manual deposits and withdrawals', kyc.status === 'approved', icons.deposit)}
          ${capabilityCard('Copy desk', 'Real-only copy trading signals', kyc.status === 'approved' && mode === 'real', icons.earn)}
          ${capabilityCard('Contracts', 'Tier-based managed contracts', Boolean(current?.level_code || current?.id), icons.trade)}
          ${capabilityCard('Security', 'KYC and account controls', kyc.status === 'approved', icons.lock)}
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
    </div>`;
}

export function mount(container) {
  container.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.getAttribute('data-copy') || '';
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
      } catch (_e) {}
    });
  });
}

function title(value) {
  return String(value || '').replace(/\b\w/g, ch => ch.toUpperCase());
}

function sameLevel(a, b) {
  return String(a?.level_code || a?.id || '') === String(b?.level_code || b?.id || '');
}

function levelBadge(level) {
  const code = String(level?.level_code || level?.name_en || 'starter').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const label = level?.name || level?.name_en || level?.level_code || 'Starter';
  return `<span class="level-badge level-badge--${escAttr(code)}">${esc(label)}</span>`;
}

function miniMeta(label, value, copyable = false, cls = '') {
  return `<div class="account-mini-meta">
    <span>${esc(label)}</span>
    <strong class="${cls}">${esc(value)}</strong>
    ${copyable ? `<button type="button" data-copy="${escAttr(value)}">Copy</button>` : ''}
  </div>`;
}

function infoRow(label, value, copyableValue = '') {
  return `<div class="info-row">
    <span>${esc(label)}</span>
    <strong>${esc(value)}</strong>
    ${copyableValue ? `<button type="button" class="btn-ghost btn-xs" data-copy="${escAttr(copyableValue)}">Copy</button>` : ''}
  </div>`;
}

function securityCard(label, value, icon, ok) {
  return `<div class="security-card ${ok ? 'is-ok' : 'is-warn'}">
    <div class="security-icon">${icon}</div>
    <div>
      <strong>${esc(label)}</strong>
      <span>${esc(value)}</span>
    </div>
  </div>`;
}

function actionLink(href, icon, label, sub) {
  return `<a class="account-action-card" href="${href}">
    <span>${icon}</span>
    <strong>${esc(label)}</strong>
    <small>${esc(sub)}</small>
  </a>`;
}

function capabilityCard(titleText, body, enabled, icon) {
  return `<div class="account-capability-card ${enabled ? 'enabled' : 'locked'}">
    <span>${icon}</span>
    <div>
      <strong>${esc(titleText)}</strong>
      <small>${esc(body)}</small>
    </div>
    <em>${enabled ? 'Ready' : 'Locked'}</em>
  </div>`;
}

function overviewCard(label, value, sub, icon) {
  return `<article class="account-overview-item">
    <span>${icon}</span>
    <div>
      <small>${esc(label)}</small>
      <strong>${esc(value)}</strong>
      <p>${esc(sub)}</p>
    </div>
  </article>`;
}

function roadmapStep(label, value, sub) {
  return `<div class="roadmap-step">
    <span>${esc(label)}</span>
    <strong>${esc(value)}</strong>
    <small>${esc(sub)}</small>
  </div>`;
}

function preferenceRow(label, value) {
  return `<div class="preference-row">
    <span>${esc(label)}</span>
    <strong>${esc(value)}</strong>
  </div>`;
}
