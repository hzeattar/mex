// WhatsApp Support View
import { get } from '../state/store.js';
import { esc, escAttr } from '../utils/format.js';
import { icons } from '../components/common/Icons.js';

export function render() {
  const brand = get('brand') || {};
  const support = get('support') || {};
  const whatsappUrl = brand.whatsapp_support_url || support.whatsapp_url || '';
  const ready = /^https?:\/\//i.test(String(whatsappUrl));
  return `
    <div class="support-whatsapp-page animate-fade-in">
      <section class="card support-whatsapp-card">
        <span class="support-whatsapp-logo">${icons.whatsapp || icons.support}</span>
        <div>
          <span class="badge-green">Support</span>
          <h1>WhatsApp desk</h1>
          <p>${ready ? 'Open a direct support chat for funding, KYC, and trading help.' : 'WhatsApp support is not configured yet.'}</p>
        </div>
        ${ready
          ? `<a class="btn-primary" href="${escAttr(whatsappUrl)}" target="_blank" rel="noopener">Open WhatsApp</a>`
          : `<button class="btn-ghost" disabled>${esc('Setup required')}</button>`}
      </section>
    </div>`;
}

export function mount() {}
