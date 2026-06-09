// Account View - compact client center
import { get } from '../state/store.js';
import { esc, escAttr, money } from '../utils/format.js';
import { icons } from '../components/common/Icons.js';

export function render() {
  const user = get('user') || {};
  const kyc = get('kyc') || {};
  const level = get('level') || {};
  const walletAll = get('wallet') || {};
  const brand = get('brand') || {};
  const support = get('support') || {};
  const mode = get('mode') === 'real' ? 'real' : 'demo';
  const wallet = mode === 'real' ? (walletAll.real || {}) : (walletAll.demo || {});
  const current = level.current || user.user_level || {};
  const next = level.next || user.next_level || null;
  const confirmed = Number(level.confirmed_deposit_total ?? user.confirmed_deposit_total ?? 0);
  const nextTarget = Number(next?.min_deposit_total || 0);
  const progress = nextTarget > 0 ? Math.min(100, Math.round((confirmed / nextTarget) * 100)) : 100;
  const remaining = nextTarget > 0 ? Math.max(0, nextTarget - confirmed) : 0;
  const name = user.display_name || user.name || user.username || user.email || 'Client';
  const initial = String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
  const kycStatus = String(kyc.status || 'not submitted').replace(/_/g, ' ');
  const whatsappUrl = brand.whatsapp_support_url || support.whatsapp_url || '';
  const whatsappReady = /^https?:\/\//i.test(String(whatsappUrl));

  return `
    <div class="account-page account-page-pro account-page-lean animate-fade-in">
      <a href="#/home" class="account-mobile-back">${icons.back}<span>Dashboard</span></a>

      <section class="account-hero account-hero-lean">
        <div class="account-hero-main">
          <div class="account-avatar">${esc(initial)}</div>
          <div class="min-w-0">
            <div class="account-title-row">
              <h1>${esc(name)}</h1>
              ${levelBadge(current)}
              <span class="status-chip ${mode === 'real' ? 'status-chip-live' : 'status-chip-derived'}">${mode === 'real' ? 'Real account' : 'Demo account'}</span>
            </div>
            <p class="text-muted text-sm truncate">${esc(user.email || 'No email attached')}</p>
            <div class="account-lean-metrics">
              ${metric('KYC', title(kycStatus), kyc.status === 'approved' ? 'text-buy' : '')}
              ${metric('Available', `${money(wallet.available || 0)} ${wallet.currency || 'USDT'}`)}
              ${metric('In use', `${money(wallet.holds || 0)} ${wallet.currency || 'USDT'}`)}
            </div>
          </div>
        </div>
        <div class="account-hero-side">
          <span>Level progress</span>
          <strong>${esc(current?.name || current?.name_en || current?.level_code || 'Starter')}</strong>
          <div class="level-progress"><span style="width:${progress}%"></span></div>
          <small>${next ? `${money(remaining)} USDT to ${esc(next.name || next.name_en || 'next level')}` : 'Top level unlocked'}</small>
        </div>
      </section>

      <section class="account-lean-grid">
        <article class="card account-lean-card">
          <span class="account-lean-icon">${icons.kyc}</span>
          <div>
            <span class="badge-accent">Verification</span>
            <h2>KYC status</h2>
            <p>${esc(title(kycStatus))}</p>
          </div>
          <a class="btn-ghost btn-sm" href="#/kyc">View KYC</a>
        </article>

        <article class="card account-lean-card account-wallet-summary">
          <span class="account-lean-icon">${icons.wallet}</span>
          <div>
            <span class="badge-green">Wallet</span>
            <h2>${esc(wallet.currency || 'USDT')}</h2>
            <p>${mode === 'real' ? 'Real wallet selected' : 'Demo wallet selected'}</p>
          </div>
          <div class="account-wallet-lines">
            <span><small>Total</small><b>${money(wallet.balance || 0)}</b></span>
            <span><small>Available</small><b>${money(wallet.available || 0)}</b></span>
            <span><small>In use</small><b>${money(wallet.holds || 0)}</b></span>
          </div>
        </article>

        <article class="card account-lean-card">
          <span class="account-lean-icon account-whatsapp-icon">${icons.whatsapp || icons.support}</span>
          <div>
            <span class="badge-green">Support</span>
            <h2>WhatsApp desk</h2>
            <p>${whatsappReady ? 'Open a direct support chat.' : 'WhatsApp support link is not configured yet.'}</p>
          </div>
          ${whatsappReady
            ? `<a class="btn-primary btn-sm" href="${escAttr(whatsappUrl)}" target="_blank" rel="noopener">Open WhatsApp</a>`
            : `<button class="btn-ghost btn-sm" disabled>Setup required</button>`}
        </article>

        <article class="card account-session-card account-lean-card">
          <span class="account-lean-icon">${icons.lock}</span>
          <div>
            <span class="badge-red">Session</span>
            <h2>Sign out</h2>
            <p>Close this client session safely.</p>
          </div>
          <a href="/logout.php" class="btn-danger btn-sm">Logout</a>
        </article>
      </section>
    </div>`;
}

export function mount() {}

function title(value) {
  return String(value || '').replace(/\b\w/g, ch => ch.toUpperCase());
}

function metric(label, value, cls = '') {
  return `<span><small>${esc(label)}</small><b class="${cls}">${esc(value)}</b></span>`;
}

function levelBadge(level) {
  const code = String(level?.level_code || level?.name_en || 'starter').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const label = level?.name || level?.name_en || level?.level_code || 'Starter';
  return `<span class="level-badge level-badge--${escAttr(code)}">${esc(label)}</span>`;
}
