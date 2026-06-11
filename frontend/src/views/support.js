// Support View: WhatsApp desk + complaint tickets
import { get } from '../state/store.js';
import { esc, escAttr, timeAgo } from '../utils/format.js';
import { icons } from '../components/common/Icons.js';
import { t, currentLocale } from '../utils/i18n.js';
import { api, postApi } from '../services/api.js';

const REASONS = ['general', 'deposit', 'withdrawal', 'trading', 'account', 'complaint'];

function reasonLabel(code) {
  const map = {
    general: t('support.reason.general', 'General question'),
    deposit: t('support.reason.deposit', 'Deposit issue'),
    withdrawal: t('support.reason.withdrawal', 'Withdrawal issue'),
    trading: t('support.reason.trading', 'Trading issue'),
    account: t('support.reason.account', 'Account / KYC'),
    complaint: t('support.reason.complaint', 'Complaint'),
  };
  return map[code] || code;
}

function statusLabel(status) {
  const s = String(status || '').toLowerCase();
  const map = {
    open: t('support.status.open', 'Open'),
    pending: t('support.status.pending', 'Pending'),
    answered: t('support.status.answered', 'Answered'),
    resolved: t('support.status.resolved', 'Resolved'),
    closed: t('support.status.closed', 'Closed'),
  };
  return map[s] || s;
}

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'resolved' || s === 'closed') return 'is-closed';
  if (s === 'answered') return 'is-answered';
  return 'is-open';
}

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
          <span class="badge-green">${t('support.badge', 'Support')}</span>
          <h1>${t('support.whatsapp_desk', 'WhatsApp desk')}</h1>
          <p>${ready ? t('support.whatsapp_desc', 'Open a direct support chat for funding, KYC, and trading help.') : t('support.whatsapp_not_configured', 'WhatsApp support is not configured yet.')}</p>
        </div>
        ${ready
          ? `<a class="btn-primary" href="${escAttr(whatsappUrl)}" target="_blank" rel="noopener">${t('support.open_whatsapp', 'Open WhatsApp')}</a>`
          : `<button class="btn-ghost" disabled>${esc(t('support.setup_required', 'Setup required'))}</button>`}
      </section>

      <section class="card support-ticket-card">
        <div class="support-ticket-head">
          <h2>${t('support.new_ticket', 'Submit a complaint or request')}</h2>
          <p>${t('support.new_ticket_desc', 'Our team replies inside the platform. Track every ticket below.')}</p>
        </div>
        <form class="support-ticket-form" data-ticket-form>
          <label class="support-field">
            <span>${t('support.field.reason', 'Topic')}</span>
            <select name="reason_code" class="input">
              ${REASONS.map((r) => `<option value="${r}">${esc(reasonLabel(r))}</option>`).join('')}
            </select>
          </label>
          <label class="support-field">
            <span>${t('support.field.subject', 'Subject')}</span>
            <input name="subject" class="input" maxlength="190" placeholder="${escAttr(t('support.field.subject_ph', 'Short summary (optional)'))}" />
          </label>
          <label class="support-field">
            <span>${t('support.field.message', 'Message')}</span>
            <textarea name="message" class="input" rows="4" maxlength="4000" required placeholder="${escAttr(t('support.field.message_ph', 'Describe your issue in detail...'))}"></textarea>
          </label>
          <div class="support-form-foot">
            <span class="text-xs support-form-status" data-ticket-status></span>
            <button type="submit" class="btn-primary">${t('support.submit_ticket', 'Submit ticket')}</button>
          </div>
        </form>
      </section>

      <section class="card support-list-card">
        <div class="support-ticket-head">
          <h2>${t('support.my_tickets', 'My tickets')}</h2>
        </div>
        <div data-ticket-list>
          <p class="text-xs text-slate-400">${t('common.loading', 'Loading...')}</p>
        </div>
      </section>

      <section class="card support-detail-card" data-ticket-detail hidden></section>
    </div>`;
}

function setStatus(el, message, type = 'info') {
  if (!el) return;
  el.textContent = message;
  el.className = `text-xs support-form-status is-${type}`;
}

async function loadTickets(root) {
  const list = root.querySelector('[data-ticket-list]');
  if (!list) return;
  let res = null;
  try {
    res = await api('/support/list.php');
  } catch (_e) { /* ignore */ }
  if (!res || res.ok === false) {
    list.innerHTML = `<p class="text-xs text-red-400">${esc(res?.error || t('common.request_failed', 'Request failed'))}</p>`;
    return;
  }
  const items = Array.isArray(res.items) ? res.items : [];
  if (!items.length) {
    list.innerHTML = `<p class="text-xs text-slate-400">${t('support.no_tickets', 'No tickets yet. Your requests will appear here.')}</p>`;
    return;
  }
  list.innerHTML = items.map((it) => `
    <button type="button" class="support-ticket-row" data-ticket-id="${Number(it.id)}">
      <div class="support-ticket-row-main">
        <strong>#${Number(it.id)} · ${esc(it.subject || reasonLabel(it.reason_code))}</strong>
        <small>${esc(it.last_message_preview || '')}</small>
      </div>
      <div class="support-ticket-row-meta">
        <span class="support-status-pill ${statusClass(it.status)}">${esc(statusLabel(it.status))}</span>
        ${it.has_unread ? `<span class="support-unread-dot">${Number(it.unread_count) || ''}</span>` : ''}
        <small>${it.last_message_created_at ? esc(timeAgo(Number(it.last_message_created_at))) : ''}</small>
      </div>
    </button>`).join('');
  list.querySelectorAll('[data-ticket-id]').forEach((btn) => {
    btn.addEventListener('click', () => openTicket(root, Number(btn.dataset.ticketId)));
  });
}

async function openTicket(root, id) {
  const detail = root.querySelector('[data-ticket-detail]');
  if (!detail || !id) return;
  detail.hidden = false;
  detail.innerHTML = `<p class="text-xs text-slate-400">${t('common.loading', 'Loading...')}</p>`;
  let res = null;
  try {
    res = await api(`/support/get.php?id=${id}`);
  } catch (_e) { /* ignore */ }
  if (!res || res.ok === false) {
    detail.innerHTML = `<p class="text-xs text-red-400">${esc(res?.error || t('common.request_failed', 'Request failed'))}</p>`;
    return;
  }
  const ticket = res.ticket || {};
  const messages = Array.isArray(res.messages) ? res.messages : [];
  detail.innerHTML = `
    <div class="support-ticket-head support-detail-head">
      <div>
        <h2>#${Number(ticket.id)} · ${esc(ticket.subject || reasonLabel(ticket.reason_code))}</h2>
        <span class="support-status-pill ${statusClass(ticket.status)}">${esc(statusLabel(ticket.status))}</span>
      </div>
      <button type="button" class="btn-ghost support-detail-close" data-ticket-close>${t('common.close', 'Close')}</button>
    </div>
    <div class="support-thread">
      ${messages.map((m) => `
        <div class="support-msg ${m.sender === 'user' ? 'is-user' : 'is-admin'}">
          <small>${m.sender === 'user' ? t('support.you', 'You') : t('support.team', 'Support team')} · ${esc(timeAgo(Number(m.created_at)))}</small>
          <p>${esc(m.content)}</p>
        </div>`).join('')}
    </div>
    <form class="support-reply-form" data-reply-form>
      <textarea name="message" class="input" rows="2" maxlength="4000" required placeholder="${escAttr(t('support.reply_ph', 'Write a reply...'))}"></textarea>
      <div class="support-form-foot">
        <span class="text-xs support-form-status" data-reply-status></span>
        <button type="submit" class="btn-primary">${t('support.send_reply', 'Send reply')}</button>
      </div>
    </form>`;
  const thread = detail.querySelector('.support-thread');
  if (thread) thread.scrollTop = thread.scrollHeight;
  detail.querySelector('[data-ticket-close]')?.addEventListener('click', () => {
    detail.hidden = true;
    detail.innerHTML = '';
    loadTickets(root);
  });
  detail.querySelector('[data-reply-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const statusEl = detail.querySelector('[data-reply-status]');
    const message = String(new FormData(form).get('message') || '').trim();
    if (!message) return setStatus(statusEl, t('support.message_required', 'Message is required'), 'error');
    setStatus(statusEl, t('support.sending', 'Sending...'), 'info');
    let r = null;
    try {
      r = await postApi('/support/reply.php', { ticket_id: id, message });
    } catch (err) {
      return setStatus(statusEl, err?.message || t('common.request_failed', 'Request failed'), 'error');
    }
    if (!r || r.ok === false) return setStatus(statusEl, r?.error || t('common.request_failed', 'Request failed'), 'error');
    openTicket(root, id);
  });
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function mount(root) {
  const page = root || document;
  loadTickets(page);
  const form = page.querySelector('[data-ticket-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = page.querySelector('[data-ticket-status]');
    const fd = new FormData(form);
    const message = String(fd.get('message') || '').trim();
    if (!message) return setStatus(statusEl, t('support.message_required', 'Message is required'), 'error');
    setStatus(statusEl, t('support.sending', 'Sending...'), 'info');
    let res = null;
    try {
      res = await postApi('/support/create.php', {
        reason_code: String(fd.get('reason_code') || 'general'),
        subject: String(fd.get('subject') || '').trim(),
        message,
        lang: currentLocale(),
      });
    } catch (err) {
      return setStatus(statusEl, err?.message || t('common.request_failed', 'Request failed'), 'error');
    }
    if (!res || res.ok === false) return setStatus(statusEl, res?.error || t('common.request_failed', 'Request failed'), 'error');
    form.reset();
    setStatus(statusEl, t('support.ticket_created', 'Ticket submitted. Our team will reply soon.'), 'success');
    loadTickets(page);
    if (res.ticket_id) openTicket(page, Number(res.ticket_id));
  });
}
