// Account View - compact client center
import { get } from '../state/store.js';
import { esc, escAttr, money } from '../utils/format.js';
import { icons } from '../components/common/Icons.js';
import { t } from '../utils/i18n.js';

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
      <a href="#/home" class="account-mobile-back">${icons.back}<span>${t('nav.home','Dashboard')}</span></a>

      <section class="account-hero account-hero-lean">
        <div class="account-hero-main">
          <div class="account-avatar">${esc(initial)}</div>
          <div class="min-w-0">
            <div class="account-title-row">
              <h1>${esc(name)}</h1>
              ${levelBadge(current)}
              <span class="status-chip ${mode === 'real' ? 'status-chip-live' : 'status-chip-derived'}">${mode === 'real' ? t('account.real_account','Real account') : t('account.demo_account','Demo account')}</span>
            </div>
            <p class="text-muted text-sm truncate">${esc(user.email || t('account.no_email','No email attached'))}</p>
            <div class="account-lean-metrics">
              ${metric(t('account.kyc','KYC'), title(kycStatus), kyc.status === 'approved' ? 'text-buy' : '')}
              ${metric(t('trade.available','Available'), `${money(wallet.available || 0)} ${wallet.currency || 'USDT'}`)}
              ${metric(t('account.in_use','In use'), `${money(wallet.holds || 0)} ${wallet.currency || 'USDT'}`)}
            </div>
          </div>
        </div>
        <div class="account-hero-side">
          <span>${t('account.level_progress','Level progress')}</span>
          <strong>${esc(current?.name || current?.name_en || current?.level_code || t('level.starter','Starter'))}</strong>
          <div class="level-progress"><span style="width:${progress}%"></span></div>
          <small>${next ? `${money(remaining)} USDT ${t('account.to','to')} ${esc(next.name || next.name_en || t('account.next_level','next level'))}` : t('account.top_level','Top level unlocked')}</small>
        </div>
      </section>

      <section class="account-lean-grid">
        <article class="card account-lean-card">
          <span class="account-lean-icon">${icons.kyc}</span>
          <div>
            <span class="badge-accent">${t('account.verification','Verification')}</span>
            <h2>${t('account.kyc_status','KYC status')}</h2>
            <p>${esc(title(kycStatus))}</p>
          </div>
          <a class="btn-ghost btn-sm" href="#/kyc">${t('account.view_kyc','View KYC')}</a>
        </article>

        <article class="card account-lean-card account-wallet-summary">
          <span class="account-lean-icon">${icons.wallet}</span>
          <div>
            <span class="badge-green">${t('account.wallet','Wallet')}</span>
            <h2>${esc(wallet.currency || 'USDT')}</h2>
            <p>${mode === 'real' ? t('account.real_wallet','Real wallet selected') : t('account.demo_wallet','Demo wallet selected')}</p>
          </div>
          <div class="account-wallet-lines">
            <span><small>${t('account.total','Total')}</small><b>${money(wallet.balance || 0)}</b></span>
            <span><small>${t('trade.available','Available')}</small><b>${money(wallet.available || 0)}</b></span>
            <span><small>${t('account.in_use','In use')}</small><b>${money(wallet.holds || 0)}</b></span>
          </div>
        </article>

        <article class="card account-lean-card">
          <span class="account-lean-icon account-whatsapp-icon">${icons.whatsapp || icons.support}</span>
          <div>
            <span class="badge-green">${t('account.support','Support')}</span>
            <h2>${t('account.whatsapp_desk','WhatsApp desk')}</h2>
            <p>${whatsappReady ? t('account.open_direct_chat','Open a direct support chat.') : t('account.whatsapp_not_configured','WhatsApp support link is not configured yet.')}</p>
          </div>
          ${whatsappReady
            ? `<a class="btn-primary btn-sm" href="${escAttr(whatsappUrl)}" target="_blank" rel="noopener">${t('account.open_whatsapp','Open WhatsApp')}</a>`
            : `<button class="btn-ghost btn-sm" disabled>${t('account.setup_required','Setup required')}</button>`}
        </article>

        <article class="card account-session-card account-lean-card">
          <span class="account-lean-icon">${icons.lock}</span>
          <div>
            <span class="badge-red">${t('account.session','Session')}</span>
            <h2>${t('account.sign_out','Sign out')}</h2>
            <p>${t('account.close_session','Close this client session safely.')}</p>
          </div>
          <a href="/logout.php" class="btn-danger btn-sm">${t('account.logout','Logout')}</a>
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
  const label = level?.name || level?.name_en || level?.level_code || t('level.starter','Starter');
  return `<span class="level-badge level-badge--${escAttr(code)}">${esc(label)}</span>`;
}
