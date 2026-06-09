// Portfolio View - Open positions, orders, PnL
import { get } from '../state/store.js';
import { money, qty, price, esc, escAttr } from '../utils/format.js';
import { delegate } from '../utils/dom.js';
import { api, postApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';
import { t } from '../utils/i18n.js';

export function render() {
  const mode = get('mode');
  return `
    <div class="portfolio-page-pro animate-fade-in">
      <section class="portfolio-hero portfolio-pro-hero">
        <div class="portfolio-hero-content">
          <div>
            <span class="badge-accent">Portfolio</span>
            <h1>Positions & Orders</h1>
            <p>Monitor live exposure, margin usage, pending orders, and close trades from a cleaner asset desk.</p>
          </div>
          <div class="portfolio-hero-actions">
            <span class="status-chip ${mode === 'real' ? 'status-chip-live' : 'status-chip-derived'}">${mode === 'real' ? 'Real workspace' : 'Demo workspace'}</span>
            <button class="btn-ghost btn-sm" id="refresh-portfolio">${icons.refresh} Refresh</button>
          </div>
        </div>
      </section>

      <section class="portfolio-metric-grid" id="portfolio-metrics">
        ${metricSkeleton()}${metricSkeleton()}${metricSkeleton()}${metricSkeleton()}
      </section>

      <div class="portfolio-workspace-grid">
      <section class="portfolio-pro-panel portfolio-positions-panel">
        <div class="portfolio-panel-head">
          <div>
            <span>Exposure</span>
            <h2>Open Positions</h2>
          </div>
          <span class="badge-green" id="pos-count">0 open</span>
        </div>
        <div class="portfolio-table-shell" id="positions-table">
          <p class="text-muted text-sm text-center py-8">Loading positions...</p>
        </div>
      </section>

      <section class="portfolio-pro-panel portfolio-orders-panel">
        <div class="portfolio-panel-head">
          <div>
            <span>Execution</span>
            <h2>Pending Orders</h2>
          </div>
          <span class="text-xs text-muted" id="orders-count">0</span>
        </div>
        <div class="portfolio-table-shell" id="orders-table">
          <p class="text-muted text-sm text-center py-8">Loading orders...</p>
        </div>
      </section>
      </div>
    </div>`;
}

export function mount(container) {
  loadPortfolio(container);
  container.querySelector('#refresh-portfolio')?.addEventListener('click', () => loadPortfolio(container));
}

async function loadPortfolio(container) {
  try {
    const mode = get('mode');
    const [portfolio, orders] = await Promise.all([
      api(`/trade/portfolio.php?fast=1&mode=${mode}`, { timeout: 0, retry: 1, cacheTtl: 5000 }),
      api(`/trade/orders.php?mode=${mode}`, { timeout: 0, retry: 1, cacheTtl: 5000 }),
    ]);
    if (portfolio) {
      renderPortfolioData(container, portfolio);
    }
    if (orders) renderOrders(container, orders.items || orders.orders || []);
  } catch (e) {
    container.querySelector('#positions-table').innerHTML = `<p class="text-red text-sm text-center py-4">${esc(e.message)}</p>`;
  }
}

function renderPortfolioData(container, data) {
  const positions = data.positions || [];
  const balance = Number(data.balance || data.equity || 0);
  const pnl = Number(data.open_pnl || data.unrealized_pnl || 0);
  const equity = Number(data.equity || balance + pnl);
  const margin = Number(data.margin_used || data.margin || 0);
  const free = Number(data.free_margin || (balance - margin));

  const metrics = container.querySelector('#portfolio-metrics');
  if (metrics) {
    metrics.innerHTML = `
      ${metricCard('Equity', money(equity), 'Balance + open PnL', icons.wallet)}
      ${metricCard('Open PnL', `${pnl >= 0 ? '+' : ''}${money(pnl)}`, 'Unrealized profit/loss', icons.earn, pnl >= 0 ? 'is-positive' : 'is-negative')}
      ${metricCard('Margin Used', money(margin), 'Locked as collateral', icons.trade)}
      ${metricCard('Free Margin', money(Math.max(0, free)), 'Available to trade', icons.deposit)}
    `;
  }

  const count = container.querySelector('#pos-count');
  if (count) count.textContent = `${positions.length} open`;

  const table = container.querySelector('#positions-table');
  if (!table) return;
  if (!positions.length) {
    table.innerHTML = `<p class="text-muted text-sm text-center py-8">No open positions. Start trading to see them here.</p>`;
    return;
  }
  table.innerHTML = `
    <div class="portfolio-mobile-list md:hidden">
      ${positions.map(posCard).join('')}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2 px-2">Symbol</th><th class="text-left py-2">Side</th><th class="text-left py-2">Type</th><th class="text-right py-2">Entry</th><th class="text-right py-2">Mark</th><th class="text-right py-2">Size</th><th class="text-right py-2">Lev</th><th class="text-right py-2">Margin</th><th class="text-right py-2">PnL</th><th class="text-right py-2 px-2">Action</th>
        </tr></thead>
        <tbody>${positions.map(posRow).join('')}</tbody>
      </table>
    </div>`;
  delegate(table, '[data-close-pos]', 'click', (e, el) => closePosition(el.dataset.closePos, container, el));
}

function posData(p) {
  const pnl = Number(p.pnl || p.unrealized_pnl || 0);
  const type = p.asset_type || p.type || 'crypto';
  const mark = Number(p.mark_price || p.current_price || p.price || 0);
  const id = p.position_id || p.id || '';
  const symbol = String(p.symbol || '').replace('@R@', '');
  const side = String(p.side || 'buy').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  const entry = Number(p.entry_price || p.open_price || 0);
  const size = Number(p.qty || p.amount || p.size || p.units || 0);
  const margin = Number(p.margin_initial || p.margin || p.initial_margin || p.used_margin || 0);
  const leverage = Number(p.leverage || 1);
  const opened = p.opened_at_label || p.created_at || p.opened_at || p.updated_at || '';
  return { pnl, type, mark, id, symbol, side, entry, size, margin, leverage, opened };
}

function posRow(p) {
  const { pnl, type, mark, id, symbol, side, entry, size, margin, leverage } = posData(p);
  return `<tr class="border-b border-line/50 hover:bg-panel-2/30">
    <td class="py-2.5 px-2 font-semibold">${esc(symbol)}</td>
    <td class="py-2.5"><span class="badge ${side === 'BUY' ? 'badge-green' : 'badge-red'}">${esc(side)}</span></td>
    <td class="py-2.5 text-xs text-muted">${esc(p.market_type || p.order_type || 'spot')}</td>
    <td class="py-2.5 text-right font-mono text-xs">${entry > 0 ? price(entry, type) : '--'}</td>
    <td class="py-2.5 text-right font-mono text-xs">${mark > 0 ? price(mark, type) : '--'}</td>
    <td class="py-2.5 text-right text-xs">${qty(size)}</td>
    <td class="py-2.5 text-right font-mono text-xs">${esc(String(leverage || 1))}x</td>
    <td class="py-2.5 text-right text-xs">${money(margin)}</td>
    <td class="py-2.5 text-right font-mono ${pnl >= 0 ? 'text-buy' : 'text-sell'}">${money(pnl)}</td>
    <td class="py-2.5 text-right px-2">${id ? `<button class="btn-ghost btn-sm text-red" data-close-pos="${escAttr(id)}">Close</button>` : ''}</td>
  </tr>`;
}

function posCard(p) {
  const { pnl, type, mark, id, symbol, side, entry, size, margin, leverage, opened } = posData(p);
  return `<article class="portfolio-position-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <strong>${esc(symbol)}</strong>
          <span class="badge ${side === 'BUY' ? 'badge-green' : 'badge-red'}">${esc(side)}</span>
        </div>
        <small>${esc(p.market_type || p.order_type || 'spot')} - ${esc(opened || '')}</small>
      </div>
      <div class="text-right">
        <span class="text-[10px] text-muted">Open PnL</span>
        <b class="${pnl >= 0 ? 'text-buy' : 'text-sell'}">${money(pnl)}</b>
      </div>
    </div>
    <div class="portfolio-position-metrics">
      ${mobileMetric('Entry', entry > 0 ? price(entry, type) : '--')}
      ${mobileMetric('Mark', mark > 0 ? price(mark, type) : '--')}
      ${mobileMetric('Size', qty(size))}
      ${mobileMetric('Lev', `${esc(String(leverage || 1))}x`)}
      ${mobileMetric('Margin', money(margin))}
      ${mobileMetric('Mode', esc(p.mode || get('mode') || 'demo'))}
      ${mobileMetric('Opened', esc(opened || '--'))}
      ${mobileMetric('Type', esc(p.asset_type || p.type || '--'))}
    </div>
    ${id ? `<button class="btn-ghost btn-sm text-red w-full" data-close-pos="${escAttr(id)}">Close position</button>` : ''}
  </article>`;
}

function renderOrders(container, orders) {
  const el = container.querySelector('#orders-table');
  const count = container.querySelector('#orders-count');
  if (count) count.textContent = `${orders.length}`;
  if (!el) return;
  if (!orders.length) {
    el.innerHTML = `<p class="text-muted text-sm text-center py-8">No pending orders.</p>`;
    return;
  }
  el.innerHTML = `
    <div class="portfolio-mobile-list md:hidden">
      ${orders.map(orderCard).join('')}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">Symbol</th><th class="text-left py-2">Type</th><th class="text-right py-2">Price</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Status</th>
        </tr></thead>
        <tbody>${orders.map((o) => `<tr class="border-b border-line/50">
          <td class="py-2 font-semibold">${esc(o.symbol)}</td>
          <td class="py-2 text-xs">${esc(o.order_type || 'LIMIT')} ${esc(o.side)}</td>
          <td class="py-2 text-right font-mono text-xs">${price(o.price || o.limit_price)}</td>
          <td class="py-2 text-right">${money(o.amount)}</td>
          <td class="py-2 text-right"><span class="badge badge-accent">${esc(o.status || 'pending')}</span></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function orderCard(o) {
  return `<article class="order-mobile-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <strong>${esc(o.symbol || '--')}</strong>
        <small>${esc(o.order_type || 'LIMIT')} ${esc(o.side || '')}</small>
      </div>
      <span class="badge badge-accent">${esc(o.status || 'pending')}</span>
    </div>
    <div class="portfolio-position-metrics">
      ${mobileMetric('Price', price(o.price || o.limit_price))}
      ${mobileMetric('Amount', money(o.amount))}
      ${mobileMetric('Created', esc(o.created_at || '--'))}
      ${mobileMetric('Mode', esc(o.mode || get('mode') || 'demo'))}
      ${mobileMetric('Status', esc(o.status || 'pending'))}
      ${mobileMetric('Side', esc(o.side || '--'))}
    </div>
  </article>`;
}

function mobileMetric(label, value) {
  return `<span><small>${esc(label)}</small><strong>${value}</strong></span>`;
}

async function closePosition(id, container, trigger = null) {
  if (!id) return;
  if (!confirm(t('portfolio.close_confirm', 'Close this position now?'))) return;
  const oldText = trigger?.textContent || '';
  if (trigger) {
    trigger.disabled = true;
    trigger.textContent = 'Closing...';
  }
  try {
    await postApi('/trade/close_position.php', { position_id: id });
    await loadPortfolio(container);
  } catch (e) {
    if (trigger) {
      trigger.disabled = false;
      trigger.textContent = oldText || 'Close position';
    }
    alert(e?.message || 'Close position failed');
  }
}

function metricCard(label, value, sub, icon, state = '') {
  return `<article class="portfolio-metric ${state}">
    <div class="metric-icon">${icon}</div>
    <span>${esc(label)}</span>
    <strong>${esc(value)}</strong>
    <small>${esc(sub)}</small>
  </article>`;
}
function metricSkeleton() { return `<div class="skeleton h-24 rounded-lg"></div>`; }
