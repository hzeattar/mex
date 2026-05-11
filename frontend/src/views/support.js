// Support View
import { get } from '../state/store.js';
import { esc } from '../utils/format.js';
import { $, delegate } from '../utils/dom.js';
import { api, postApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';

export function render() {
  return `
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center justify-between">
          <div>
            <span class="badge-accent">Support</span>
            <h1 class="text-xl font-bold mt-1">Help Center</h1>
            <p class="text-muted text-sm">Create tickets and get help from the support team.</p>
          </div>
          <a class="btn-ghost btn-sm" href="mailto:${esc(get('brand.support_email') || 'support@vertexpluse.com')}">Email</a>
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section class="card">
          <h2 class="font-semibold mb-4">New Ticket</h2>
          <form class="space-y-4" id="support-form">
            <label class="block"><span class="text-xs text-muted">Subject</span><input type="text" name="subject" class="input mt-1" maxlength="190" required /></label>
            <label class="block"><span class="text-xs text-muted">Priority</span>
              <select name="priority" class="input mt-1"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select>
            </label>
            <label class="block"><span class="text-xs text-muted">Message</span><textarea name="message" class="input mt-1" rows="5" required></textarea></label>
            <button type="submit" class="btn-primary w-full">Create Ticket</button>
            <p class="text-xs text-center" id="support-status"></p>
          </form>
        </section>

        <section class="card">
          <h2 class="font-semibold mb-4">Your Tickets</h2>
          <div id="tickets-list"><p class="text-muted text-sm text-center py-8">Loading...</p></div>
        </section>
      </div>
    </div>`;
}

export function mount(container) {
  loadTickets(container);
  container.querySelector('#support-form')?.addEventListener('submit', (e) => submitTicket(e, container));
}

async function loadTickets(container) {
  try {
    const data = await api('/support/list.php', { timeout: 6000 });
    const el = container.querySelector('#tickets-list');
    if (!el || !data) return;
    const items = data.items || [];
    if (!items.length) { el.innerHTML = `<p class="text-muted text-sm text-center py-4">No tickets yet.</p>`; return; }
    el.innerHTML = `<div class="space-y-2">${items.map((t) => `
      <div class="p-3 rounded-lg bg-panel-2/50 border border-line/50">
        <div class="flex justify-between items-start">
          <strong class="text-sm">${esc(t.subject || '--')}</strong>
          <span class="badge ${t.status === 'open' ? 'badge-green' : 'badge-accent'}">${esc(t.status || 'open')}</span>
        </div>
        <div class="text-[11px] text-muted mt-1">${esc(t.priority || 'normal')} - ${esc(t.updated_at || t.created_at || '')}</div>
      </div>`).join('')}</div>`;
  } catch (e) { /* silent */ }
}

async function submitTicket(e, container) {
  e.preventDefault();
  const form = e.target;
  const status = container.querySelector('#support-status');
  try {
    if (status) status.textContent = 'Submitting...';
    const body = Object.fromEntries(new FormData(form));
    const res = await postApi('/support/create.php', body);
    if (res && res.ok !== false) {
      if (status) { status.textContent = 'Ticket created!'; status.className = 'text-xs text-center text-green'; }
      form.reset();
      loadTickets(container);
    } else {
      if (status) { status.textContent = res?.error || 'Failed'; status.className = 'text-xs text-center text-red'; }
    }
  } catch (err) {
    if (status) { status.textContent = err.message; status.className = 'text-xs text-center text-red'; }
  }
}
