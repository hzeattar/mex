// Portfolio View - Open positions, closed orders, PnL
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
            <h1>${t('trade.positions_history_title', 'Positions & History')}</h1>
            <p>${t('trade.positions_history_desc', 'Monitor live exposure, close trades, and review closed positions.')}</p>
          </div>
          <div class="portfolio-hero-actions">
            <span class="status-chip ${mode === 'real' ? 'status-chip-live' : 'status-chip-derived'}">${mode === 'real' ? t('workspace.real','Real workspace') : t('workspace.demo','Demo workspace')}</span>
            <button class="btn-ghost btn-sm" id="refresh-portfolio">${icons.refresh} ${t('trade.refresh','Refresh')}</button>
          </div>
        </div>
      </section>

      <section class="portfolio-metric-grid" id="portfolio-metrics">
        ${metricSkeleton()}${metricSkeleton()}${metricSkeleton()}${metricSkeleton()}
      </section>

      <div class="portfolio-workspace-grid">
      <section class="portfolio-pro-panel portfolio-positions-panel">
        <div class="portfolio-panel-head">
          <div><span>${t('trade.exposure','Exposure')}</span><h2>${t('trade.open_positions','Open Positions')}</h2></div>
          <span class="badge-green" id="pos-count">0 ${t('trade.open','open')}</span>
        </div>
        <div class="portfolio-table-shell" id="positions-table">
          <p class="text-muted text-sm text-center py-8">${t('trade.loading_positions','Loading positions...')}</p>
        </div>
      </section>

      <section class="portfolio-pro-panel portfolio-orders-panel">
        <div class="portfolio-panel-head">
          <div><span>${t('trade.execution','Execution')}</span><h2>${t('trade.pending_orders','Pending Orders')}</h2></div>
          <span class="text-xs text-muted" id="orders-count">0</span>
        </div>
        <div class="portfolio-table-shell" id="orders-table">
          <p class="text-muted text-sm text-center py-8">${t('trade.loading_orders','Loading orders...')}</p>
        </div>
      </section>
      </div>

      <section class="portfolio-pro-panel" style="margin-top:24px">
        <div class="portfolio-panel-head">
          <div><span>${t('trade.history','History')}</span><h2>${t('trade.closed_positions','Closed Positions')}</h2></div>
          <span class="text-xs text-muted" id="closed-count">0</span>
        </div>
        <div class="portfolio-table-shell" id="closed-table">
          <p class="text-muted text-sm text-center py-8">${t('trade.loading_history','Loading history...')}</p>
        </div>
      </section>
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
      api(`/trade/portfolio.php?fast=1&mode=${mode}`, { timeout: 0, retry: 1, cacheTtl: 8000 }),
      api(`/trade/orders.php?mode=${mode}&limit=100`, { timeout: 0, retry: 1, cacheTtl: 8000 }),
    ]);
    if (portfolio) renderPortfolioData(container, portfolio);
    if (orders) {
      const all = orders.items || orders.orders || [];
      const pending = all.filter((o) => /^(pending|open)$/i.test(o.status || ''));
      const closed = all.filter((o) => /^(closed|filled|cancelled)$/i.test(o.status || ''));
      renderOrders(container, pending);
      renderClosedOrders(container, closed);
    }
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
      ${metricCard(t('trade.equity','Equity'), money(equity), t('trade.equity_sub','Balance + open PnL'), icons.wallet)}
      ${metricCard(t('trade.open_pnl','Open PnL'), `${pnl >= 0 ? '+' : ''}${money(pnl)}`, t('trade.unrealized_pnl','Unrealized PnL'), icons.earn, pnl >= 0 ? 'is-positive' : 'is-negative')}
      ${metricCard(t('trade.margin_used','Margin Used'), money(margin), t('trade.margin_collateral','Locked as collateral'), icons.trade)}
      ${metricCard(t('trade.free_margin','Free Margin'), money(Math.max(0, free)), t('trade.available_trade','Available to trade'), icons.deposit)}
    `;
  }

  const count = container.querySelector('#pos-count');
  if (count) count.textContent = `${positions.length} ${t('trade.open','open')}`;

  const table = container.querySelector('#positions-table');
  if (!table) return;
  if (!positions.length) {
    table.innerHTML = `<p class="text-muted text-sm text-center py-8">${t('trade.no_open_positions','No open positions. Start trading to see them here.')}</p>`;
    return;
  }
  table.innerHTML = `
    <div class="portfolio-mobile-list md:hidden">
      ${positions.map((p, i) => posCard(p, i)).join('')}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2 px-2">${t('common.symbol','Symbol')}</th><th class="text-left py-2">${t('common.side','Side')}</th><th class="text-left py-2">${t('common.type','Type')}</th><th class="text-right py-2">${t('common.entry','Entry')}</th><th class="text-right py-2">${t('common.mark','Mark')}</th><th class="text-right py-2">${t('common.size','Size')}</th><th class="text-right py-2">${t('common.lev','Lev')}</th><th class="text-right py-2">${t('common.margin','Margin')}</th><th class="text-right py-2">${t('common.pnl','PnL')}</th><th class="text-right py-2 px-2">${t('common.action','Action')}</th>
        </tr></thead>
        <tbody>${positions.map(posRow).join('')}</tbody>
      </table>
    </div>`;
  delegate(table, '[data-close-pos]', 'click', (e, el) => closePosition(el.dataset.closePos, container, el));
  initExpandable(table);
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
  const tp = p.tp_price != null ? Number(p.tp_price) : null;
  const sl = p.sl_price != null ? Number(p.sl_price) : null;
  const liq = p.liquidation_price != null ? Number(p.liquidation_price) : null;
  const roe = Number(p.roe_pct || (margin > 0 ? (pnl / margin) * 100 : 0));
  const source = p.source || '';
  return { pnl, type, mark, id, symbol, side, entry, size, margin, leverage, opened, tp, sl, liq, roe, source };
}

function posRow(p) {
  const d = posData(p);
  const t = window.t || (() => '');
  return `<tr class="border-b border-line/50 hover:bg-panel-2/30">
    <td class="py-2.5 px-2 font-semibold">${esc(d.symbol)}</td>
    <td class="py-2.5"><span class="badge ${d.side === 'BUY' ? 'badge-green' : 'badge-red'}">${esc(d.side)}</span></td>
    <td class="py-2.5 text-xs text-muted">${esc(p.market_type || p.order_type || 'spot')}</td>
    <td class="py-2.5 text-right font-mono text-xs">${d.entry > 0 ? price(d.entry, d.type) : '--'}</td>
    <td class="py-2.5 text-right font-mono text-xs">${d.mark > 0 ? price(d.mark, d.type) : '--'}</td>
    <td class="py-2.5 text-right text-xs">${qty(d.size)}</td>
    <td class="py-2.5 text-right font-mono text-xs">${esc(String(d.leverage || 1))}x</td>
    <td class="py-2.5 text-right text-xs">${money(d.margin)}</td>
    <td class="py-2.5 text-right font-mono ${d.pnl >= 0 ? 'text-buy' : 'text-sell'}">${money(d.pnl)}</td>
    <td class="py-2.5 text-right px-2">${d.id ? `<button class="btn-ghost btn-sm text-red" data-close-pos="${escAttr(d.id)}">${t('trade.close','Close') || 'Close'}</button>` : ''}</td>
  </tr>`;
}

function posCard(p, idx) {
  const d = posData(p);
  const tfn = window.t || (() => '');
  const pnlSign = d.pnl >= 0 ? '+' : '';
  const pnlCls = d.pnl >= 0 ? 'pos-exp-pnl-up' : 'pos-exp-pnl-down';
  const sideCls = d.side === 'BUY' ? 'pos-exp-side-buy' : 'pos-exp-side-sell';
  const hasTp = d.tp != null && d.tp > 0;
  const hasSl = d.sl != null && d.sl > 0;
  return `
  <article class="pos-exp-card" data-card-idx="${idx}">
    <div class="pos-exp-summary" data-toggle-expand>
      <div class="pos-exp-info">
        <div class="pos-exp-row1">
          <strong class="pos-exp-symbol">${esc(d.symbol)}</strong>
          <span class="pos-exp-side ${sideCls}">${esc(d.side)}</span>
          ${d.source === 'trading_bot' ? '<span class="pos-exp-bot">BOT</span>' : ''}
          <span class="pos-exp-lev">${d.leverage}x</span>
        </div>
        <div class="pos-exp-row2">
          <span>${tfn('common.entry','Entry')} ${d.entry > 0 ? price(d.entry, d.type) : '--'}</span>
          <span class="pos-exp-dot">&#183;</span>
          <span>${tfn('common.mark','Mark')} ${d.mark > 0 ? price(d.mark, d.type) : '--'}</span>
          <span class="pos-exp-dot">&#183;</span>
          <span>${qty(d.size)}</span>
          ${hasTp ? `<span class="pos-exp-dot">&#183;</span><span class="pos-exp-safety" title="TP: ${price(d.tp, d.type)}">TP</span>` : ''}
          ${hasSl ? `<span class="pos-exp-dot">&#183;</span><span class="pos-exp-safety" title="SL: ${price(d.sl, d.type)}">SL</span>` : ''}
        </div>
      </div>
      <div class="pos-exp-right">
        <div class="pos-exp-pnl ${pnlCls}">${pnlSign}${money(d.pnl)}</div>
        <div class="pos-exp-roe ${pnlCls}">${d.roe >= 0 ? '+' : ''}${d.roe.toFixed(1)}%</div>
        <svg class="pos-exp-arrow" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
      </div>
    </div>
    <div class="pos-exp-detail">
      <div class="pos-exp-detail-grid">
        ${detailCell(tfn('common.entry','Entry Price'), d.entry > 0 ? price(d.entry, d.type) : '--')}
        ${detailCell(tfn('common.mark','Mark Price'), d.mark > 0 ? price(d.mark, d.type) : '--')}
        ${detailCell(tfn('common.size','Size / Qty'), qty(d.size))}
        ${detailCell(tfn('common.lev','Leverage'), d.leverage + 'x')}
        ${detailCell(tfn('common.margin','Margin'), money(d.margin))}
        ${detailCell(tfn('common.roe','ROE'), (d.roe >= 0 ? '+' : '') + d.roe.toFixed(2) + '%')}
        ${detailCell(tfn('common.tp','Take Profit'), hasTp ? price(d.tp, d.type) : '--')}
        ${detailCell(tfn('common.sl','Stop Loss'), hasSl ? price(d.sl, d.type) : '--')}
        ${detailCell(tfn('common.liquidation','Liquidation'), d.liq != null && d.liq > 0 ? price(d.liq, d.type) : '--')}
        ${detailCell(tfn('common.opened','Opened'), esc(String(d.opened || '--')))}
        ${detailCell(tfn('common.type','Type'), esc(d.type))}
        ${detailCell(tfn('common.source','Source'), d.source === 'trading_bot' ? 'Trading Bot' : 'Manual')}
      </div>
      ${d.id ? `<button class="pos-exp-close-btn" data-close-pos="${escAttr(d.id)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
        ${tfn('trade.close','Close Position')}
      </button>` : ''}
    </div>
  </article>`;
}

function detailCell(label, value) {
  return `<div class="pos-exp-cell"><small>${esc(label)}</small><strong>${value}</strong></div>`;
}

function renderOrders(container, orders) {
  const t = window.t || (() => '');
  const el = container.querySelector('#orders-table');
  const count = container.querySelector('#orders-count');
  if (count) count.textContent = `${orders.length}`;
  if (!el) return;
  if (!orders.length) {
    el.innerHTML = `<p class="text-muted text-sm text-center py-8">${t('trade.no_pending_orders','No pending orders.')}</p>`;
    return;
  }
  el.innerHTML = `
    <div class="portfolio-mobile-list md:hidden">
      ${orders.map((o, i) => orderCard(o, i)).join('')}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">${t('common.symbol','Symbol')}</th><th class="text-left py-2">${t('common.type','Type')}</th><th class="text-right py-2">${t('common.price','Price')}</th><th class="text-right py-2">${t('common.amount','Amount')}</th><th class="text-right py-2">${t('common.status','Status')}</th>
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
  initExpandable(el);
}

function renderClosedOrders(container, closed) {
  const t = window.t || (() => '');
  const el = container.querySelector('#closed-table');
  const count = container.querySelector('#closed-count');
  if (count) count.textContent = `${closed.length}`;
  if (!el) return;
  if (!closed.length) {
    el.innerHTML = `<p class="text-muted text-sm text-center py-8">${t('trade.no_closed_positions','No closed positions yet.')}</p>`;
    return;
  }
  el.innerHTML = `
    <div class="portfolio-mobile-list md:hidden">
      ${closed.map((o, i) => closedCard(o, i)).join('')}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">${t('common.symbol','Symbol')}</th><th class="text-left py-2">${t('common.side','Side')}</th><th class="text-right py-2">${t('common.fill','Fill')}</th><th class="text-right py-2">${t('common.qty','Qty')}</th><th class="text-right py-2">${t('common.pnl','PnL')}</th><th class="text-right py-2">${t('common.fee','Fee')}</th><th class="text-left py-2">${t('common.reason','Reason')}</th><th class="text-left py-2">${t('common.closed','Closed')}</th>
        </tr></thead>
        <tbody>${closed.map(closedRow).join('')}</tbody>
      </table>
    </div>`;
  initExpandable(el);
}

function closedRow(o) {
  const sym = String(o.symbol || '').replace('@R@', '');
  const side = String(o.side || 'buy').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  const pnl = Number(o.pnl_usd || 0);
  const fill = Number(o.fill_price || o.limit_price || o.price || 0);
  const q = Number(o.qty || o.amount || 0);
  const fee = Number(o.fee_paid || 0);
  const type = o.asset_type || o.type || 'crypto';
  return `<tr class="border-b border-line/50 hover:bg-panel-2/30">
    <td class="py-2 font-semibold">${esc(sym)}</td>
    <td class="py-2"><span class="badge ${side === 'BUY' ? 'badge-green' : 'badge-red'}">${esc(side)}</span></td>
    <td class="py-2 text-right font-mono text-xs">${fill > 0 ? price(fill, type) : '--'}</td>
    <td class="py-2 text-right text-xs">${qty(q)}</td>
    <td class="py-2 text-right font-mono ${pnl >= 0 ? 'text-buy' : 'text-sell'}">${money(pnl)}</td>
    <td class="py-2 text-right text-xs">${money(fee)}</td>
    <td class="py-2 text-xs text-muted">${esc(o.close_reason || o.status || '--')}</td>
    <td class="py-2 text-xs text-muted">${esc(o.closed_at || '--')}</td>
  </tr>`;
}

function closedCard(o, idx) {
  const t = window.t || (() => '');
  const sym = String(o.symbol || '').replace('@R@', '');
  const side = String(o.side || 'buy').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  const pnlVal = Number(o.pnl_usd || 0);
  const fillPrice = Number(o.fill_price || o.limit_price || o.price || 0);
  const q = Number(o.qty || o.amount || 0);
  const lev = Number(o.leverage || 1);
  const status = String(o.status || 'closed');
  const reason = String(o.close_reason || '');
  const opened = String(o.created_at || '--');
  const closed = String(o.closed_at || '--');
  const fee = Number(o.fee_paid || 0);
  const type = o.asset_type || o.type || 'crypto';
  const pnlSign = pnlVal >= 0 ? '+' : '';
  const pnlCls = pnlVal >= 0 ? 'pos-exp-pnl-up' : 'pos-exp-pnl-down';
  const sideCls = side === 'BUY' ? 'pos-exp-side-buy' : 'pos-exp-side-sell';
  return `
  <article class="pos-exp-card pos-exp-card-closed" data-card-idx="${idx}">
    <div class="pos-exp-summary" data-toggle-expand>
      <div class="pos-exp-info">
        <div class="pos-exp-row1">
          <strong class="pos-exp-symbol">${esc(sym)}</strong>
          <span class="pos-exp-side ${sideCls}">${esc(side)}</span>
          <span class="pos-exp-status">${esc(status)}</span>
          <span class="pos-exp-lev">${lev}x</span>
        </div>
        <div class="pos-exp-row2">
          <span>${t('common.fill','Fill')} ${fillPrice > 0 ? price(fillPrice, type) : '--'}</span>
          <span class="pos-exp-dot">&#183;</span>
          <span>${qty(q)}</span>
          <span class="pos-exp-dot">&#183;</span>
          <span>${esc(reason || status)}</span>
        </div>
      </div>
      <div class="pos-exp-right">
        <div class="pos-exp-pnl ${pnlCls}">${pnlSign}${money(pnlVal)}</div>
        <svg class="pos-exp-arrow" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
      </div>
    </div>
    <div class="pos-exp-detail">
      <div class="pos-exp-detail-grid">
        ${detailCell(t('common.fill','Fill Price'), fillPrice > 0 ? price(fillPrice, type) : '--')}
        ${detailCell(t('common.qty','Size / Qty'), qty(q))}
        ${detailCell(t('common.lev','Leverage'), lev + 'x')}
        ${detailCell(t('common.pnl','Realized PnL'), pnlSign + money(pnlVal))}
        ${detailCell(t('common.fee','Fee'), money(fee))}
        ${detailCell(t('common.status','Status'), esc(status))}
        ${detailCell(t('common.reason','Close Reason'), esc(reason || '--'))}
        ${detailCell(t('common.opened','Opened'), esc(opened))}
        ${detailCell(t('common.closed','Closed'), esc(closed))}
        ${detailCell(t('common.type','Type'), esc(type))}
        ${detailCell(t('common.order_type','Order Type'), esc(o.order_type || '--'))}
        ${detailCell(t('common.side','Side'), esc(side))}
      </div>
    </div>
  </article>`;
}

function orderCard(o, idx) {
  const t = window.t || (() => '');
  return `<article class="pos-exp-card" data-card-idx="${idx}">
    <div class="pos-exp-summary" data-toggle-expand>
      <div class="pos-exp-info">
        <div class="pos-exp-row1">
          <strong class="pos-exp-symbol">${esc(o.symbol || '--')}</strong>
          <span class="pos-exp-side ${o.side === 'BUY' ? 'pos-exp-side-buy' : 'pos-exp-side-sell'}">${esc(o.side || '')}</span>
          <span class="pos-exp-status">${esc(o.order_type || 'LIMIT')}</span>
        </div>
        <div class="pos-exp-row2">
          <span>${t('common.price','Price')} ${price(o.price || o.limit_price)}</span>
          <span class="pos-exp-dot">&#183;</span>
          <span>${money(o.amount)}</span>
        </div>
      </div>
      <div class="pos-exp-right">
        <span class="pos-exp-pending-badge">${esc(o.status || 'pending')}</span>
        <svg class="pos-exp-arrow" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
      </div>
    </div>
    <div class="pos-exp-detail">
      <div class="pos-exp-detail-grid">
        ${detailCell(t('common.symbol','Symbol'), esc(o.symbol || '--'))}
        ${detailCell(t('common.side','Side'), esc(o.side || '--'))}
        ${detailCell(t('common.type','Type'), esc(o.order_type || 'LIMIT'))}
        ${detailCell(t('common.price','Price'), price(o.price || o.limit_price))}
        ${detailCell(t('common.amount','Amount'), money(o.amount))}
        ${detailCell(t('common.status','Status'), esc(o.status || 'pending'))}
        ${detailCell(t('common.created','Created'), esc(o.created_at || '--'))}
      </div>
    </div>
  </article>`;
}

function initExpandable(root) {
  root.querySelectorAll('[data-toggle-expand]').forEach((trigger) => {
    trigger.style.cursor = 'pointer';
    trigger.addEventListener('click', () => {
      const card = trigger.closest('.pos-exp-card');
      if (!card) return;
      card.classList.toggle('is-expanded');
      const arrow = card.querySelector('.pos-exp-arrow');
      if (arrow) arrow.style.transform = card.classList.contains('is-expanded') ? 'rotate(180deg)' : '';
    });
  });
}

async function closePosition(id, container, trigger = null) {
  if (!id) return;
  if (!trigger?.__confirmClose) {
    if (trigger) {
      const prev = trigger.textContent;
      trigger.__confirmClose = true;
      trigger.textContent = (t('trade.close','Close') || 'Close') + '?';
      trigger.classList.add('btn-danger');
      setTimeout(() => {
        if (trigger.__confirmClose) {
          trigger.__confirmClose = false;
          trigger.textContent = prev;
          trigger.classList.remove('btn-danger');
        }
      }, 4000);
    }
    return;
  }
  trigger.__confirmClose = false;
  const oldText = trigger?.textContent || '';
  if (trigger) { trigger.disabled = true; trigger.classList.remove('btn-danger'); trigger.textContent = t('trade.closing','Closing...'); }
  try {
    await postApi('/trade/close_position.php', { position_id: id });
    await loadPortfolio(container);
  } catch (e) {
    if (trigger) { trigger.disabled = false; trigger.textContent = e?.message || t('trade.could_not_close','Could not close'); setTimeout(() => { if(trigger) trigger.textContent = oldText || t('trade.close','Close'); }, 3000); }
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
