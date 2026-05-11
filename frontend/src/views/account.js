// Account View
import { get, set } from '../state/store.js';
import { esc } from '../utils/format.js';
import { icons } from '../components/common/Icons.js';
import { api } from '../services/api.js';

export function render() {
  const user = get('user') || {};
  const kyc = get('kyc');
  const level = get('level');
  return `
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center text-white text-xl font-black">${esc((user.username || user.email || 'U')[0].toUpperCase())}</div>
          <div>
            <h1 class="text-xl font-bold">${esc(user.username || user.email || 'Account')}</h1>
            <p class="text-muted text-sm">${esc(user.email || '')}</p>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section class="card space-y-3">
          <h2 class="font-semibold">Account Details</h2>
          <div class="space-y-2 text-sm">
            ${infoRow('Username', user.username || '--')}
            ${infoRow('Email', user.email || '--')}
            ${infoRow('KYC Status', kyc?.status || 'Not submitted')}
            ${infoRow('Level', level?.current?.name_en || level?.current?.symbol || 'Standard')}
            ${infoRow('Mode', get('mode') === 'real' ? 'Real' : 'Demo')}
          </div>
        </section>

        <section class="card space-y-3">
          <h2 class="font-semibold">Quick Links</h2>
          <div class="grid grid-cols-2 gap-2">
            <a href="#/kyc" class="btn-ghost btn-sm justify-start">${icons.kyc} KYC Verification</a>
            <a href="#/deposit" class="btn-ghost btn-sm justify-start">${icons.deposit} Deposit</a>
            <a href="#/withdraw" class="btn-ghost btn-sm justify-start">${icons.withdraw} Withdraw</a>
            <a href="#/support" class="btn-ghost btn-sm justify-start">${icons.support} Support</a>
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
    </div>`;
}

export function mount(container) {}

function infoRow(label, value) {
  return `<div class="flex justify-between py-2 border-b border-line/30"><span class="text-muted">${label}</span><span class="font-medium">${esc(value)}</span></div>`;
}
