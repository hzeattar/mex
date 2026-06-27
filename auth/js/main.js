/* ================================================
   MEX Global Markets - Main JavaScript
   Pro Trading Terminal + Mobile Card + UI Wiring
   ================================================ */

(function () {
  'use strict';

  /* ---------- 0. INTRO OVERLAY (Logo Reveal) ---------- */
  function initIntro() {
    const overlay = document.getElementById('introOverlay');
    if (!overlay) {
      document.body.classList.remove('intro-loading');
      document.body.classList.add('intro-done');
      return;
    }
    const pc = document.getElementById('introParticles');
    if (pc) {
      let html = '';
      for (let i = 0; i < 22; i++) {
        const left = Math.random() * 100;
        const dur = 1.8 + Math.random() * 1.5;
        const delay = Math.random() * 1.5;
        const size = 2 + Math.random() * 2;
        html += `<span class="intro-particle" style="left:${left}%;bottom:0;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s;"></span>`;
      }
      pc.innerHTML = html;
    }
    const TOTAL = 2700;
    setTimeout(() => {
      document.body.classList.remove('intro-loading');
      document.body.classList.add('intro-done');
      setTimeout(() => overlay.remove(), 200);
    }, TOTAL);
    const skipIntro = () => {
      overlay.style.animation = 'introFadeOut 0.35s ease forwards';
      setTimeout(() => {
        document.body.classList.remove('intro-loading');
        document.body.classList.add('intro-done');
        overlay.remove();
      }, 350);
    };
    overlay.addEventListener('click', skipIntro, { once: true });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        skipIntro();
        document.removeEventListener('keydown', onEsc);
      }
    });
  }

  /* ---------- 1. PARTICLES (rising dots) ---------- */
  function generateParticles() {
    const c = document.getElementById('heroParticles');
    if (!c) return;
    let html = '';
    for (let i = 0; i < 28; i++) {
      const left = Math.random() * 100;
      const dur = 8 + Math.random() * 12;
      const delay = Math.random() * -15;
      const size = 1 + Math.random() * 2;
      const opacity = 0.3 + Math.random() * 0.5;
      html += `<span class="hero-particle" style="left:${left}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s;opacity:${opacity};"></span>`;
    }
    c.innerHTML = html;
  }

  /* ============================================================
     2. PRO TRADING TERMINAL - SHARED STATE & DATA MODEL
     ============================================================ */

  // Helper: get translation safely (falls back to provided default)
  const i18nT = function(key, fallback){
    try {
      if (window.MEXi18n && typeof window.MEXi18n.t === 'function'){
        const v = window.MEXi18n.t(key);
        if (v && v !== key) return v;
      }
    } catch(e){}
    return fallback || '';
  };

  // Asset profiles: realistic price levels + volatility per market
  const ASSETS = {
    EURUSD: {
      name: 'EUR/USD', subKey: 'hero.asset.eurusd.sub', icon: '€$',
      base: 1.0843, decimals: 4, spread: 0.0001, vol: 0.0008, drift: 0.00015,
      pip: 0.0001, signalKey: 'hero.asset.eurusd.signal', signalShortKey: 'hero.asset.eurusd.signal_short',
      margin: 22, contract: 100000
    },
    XAUUSD: {
      name: 'XAU/USD', subKey: 'hero.asset.xauusd.sub', icon: 'XAU',
      base: 2354.10, decimals: 2, spread: 0.18, vol: 1.4, drift: 0.25,
      pip: 0.01, signalKey: 'hero.asset.xauusd.signal', signalShortKey: 'hero.asset.xauusd.signal_short',
      margin: 47, contract: 100
    },
    BTCUSD: {
      name: 'BTC/USD', subKey: 'hero.asset.btcusd.sub', icon: '₿',
      base: 68420, decimals: 0, spread: 12, vol: 95, drift: 18,
      pip: 1, signalKey: 'hero.asset.btcusd.signal', signalShortKey: 'hero.asset.btcusd.signal_short',
      margin: 137, contract: 1
    },
    US30: {
      name: 'US30', subKey: 'hero.asset.us30.sub', icon: 'US',
      base: 39125, decimals: 1, spread: 1.5, vol: 28, drift: 4.5,
      pip: 0.1, signalKey: 'hero.asset.us30.signal', signalShortKey: 'hero.asset.us30.signal_short',
      margin: 78, contract: 1
    }
  };

  // Backwards-compat helpers: derive `sub` and `signal` from current language at read-time
  Object.keys(ASSETS).forEach(function(k){
    const a = ASSETS[k];
    Object.defineProperty(a, 'sub', { get: function(){ return i18nT(a.subKey, ''); }, configurable: true });
    Object.defineProperty(a, 'signal', { get: function(){ return i18nT(a.signalKey, ''); }, configurable: true });
    Object.defineProperty(a, 'signalShort', { get: function(){ return i18nT(a.signalShortKey, ''); }, configurable: true });
  });

  // Timeframe profiles: candle count + volatility multiplier
  const TIMEFRAMES = {
    M1:  { count: 60, volMul: 0.45, drift: 0.6, label: 'M1',  tickMs: 1300 },
    M5:  { count: 50, volMul: 0.7,  drift: 0.85, label: 'M5',  tickMs: 1500 },
    M15: { count: 42, volMul: 1.0,  drift: 1.0, label: 'M15', tickMs: 1700 },
    H1:  { count: 36, volMul: 1.6,  drift: 1.4, label: 'H1',  tickMs: 2100 },
    H4:  { count: 32, volMul: 2.4,  drift: 1.9, label: 'H4',  tickMs: 2500 },
    D1:  { count: 28, volMul: 3.6,  drift: 2.6, label: 'D1',  tickMs: 3200 }
  };

  // Centralized state shared between desktop & mobile
  const PT = {
    symbol: 'EURUSD',
    tf: 'M15',
    chartType: 'candles',
    paused: false,
    candles: [],         // Desktop OHLC
    series: [],          // Mobile line series
    listeners: { symbol: [], tf: [], paused: [] }
  };

  function genCandles(symbol, tf) {
    const a = ASSETS[symbol];
    const t = TIMEFRAMES[tf];
    const N = t.count;
    const vol = a.vol * t.volMul;
    const drift = a.drift * t.drift;
    const out = [];
    let price = a.base - drift * (N / 4) * (Math.random() * 0.6 + 0.2);
    for (let i = 0; i < N; i++) {
      const open = price;
      const dir = Math.random() > 0.45 ? 1 : -1;
      const mag = Math.random() * vol;
      const close = open + dir * mag;
      const high = Math.max(open, close) + Math.random() * vol * 0.6;
      const low  = Math.min(open, close) - Math.random() * vol * 0.6;
      const v = 30 + Math.random() * 70;
      out.push({ open, high, low, close, vol: v, t: i });
      price = close;
    }
    // Pull last close toward base
    out[N - 1].close = a.base + (Math.random() - 0.5) * vol * 0.6;
    out[N - 1].high = Math.max(out[N - 1].high, out[N - 1].close);
    out[N - 1].low  = Math.min(out[N - 1].low,  out[N - 1].close);
    return out;
  }

  function fmt(symbol, val) {
    const a = ASSETS[symbol];
    if (!a) return String(val);
    if (a.decimals === 0) {
      return Math.round(val).toLocaleString('en-US');
    }
    return Number(val).toLocaleString('en-US', {
      minimumFractionDigits: a.decimals, maximumFractionDigits: a.decimals
    });
  }

  function rebuild(symbol, tf) {
    PT.candles = genCandles(symbol, tf);
    PT.series = PT.candles.map(c => c.close);
  }

  function setSymbol(sym) {
    if (!ASSETS[sym] || sym === PT.symbol) return;
    PT.symbol = sym;
    rebuild(PT.symbol, PT.tf);
    PT.listeners.symbol.forEach(fn => fn(sym));
  }
  function setTf(tf) {
    if (!TIMEFRAMES[tf] || tf === PT.tf) return;
    PT.tf = tf;
    rebuild(PT.symbol, PT.tf);
    PT.listeners.tf.forEach(fn => fn(tf));
  }
  function setPaused(p) {
    PT.paused = !!p;
    PT.listeners.paused.forEach(fn => fn(PT.paused));
  }

  /* ============================================================
     3. PRO TERMINAL - DESKTOP (Interactive Pro Chart)
     ============================================================ */
  function initProDesktop() {
    const root = document.querySelector('.ptt--desktop');
    if (!root) return;
    const cv = document.getElementById('pcCanvas');
    const svg = document.getElementById('pcChart');
    const candlesG = document.getElementById('pcCandles');
    if (!cv || !svg || !candlesG) return;

    const lineEl = document.getElementById('pcLine');
    const areaEl = document.getElementById('pcArea');
    const maEl = document.getElementById('pcMa');
    const priceLine = document.getElementById('pcPriceLine');
    const lastDot = document.getElementById('pcLastDot');
    const lastPulse = document.getElementById('pcLastPulse');
    const yAxis = document.getElementById('pcAxisY');
    const priceTag = document.getElementById('pcPriceTag');
    const crossTag = document.getElementById('pcCrossTag');
    const volSvg = document.getElementById('pcVolume');
    const tooltip = document.getElementById('pcTooltip');
    const crossG = document.getElementById('pcCrosshair');
    const chX = document.getElementById('pcChX');
    const chY = document.getElementById('pcChY');
    const hint = document.getElementById('pcHint');

    const W = 800, H = 280, padL = 6, padR = 50, padT = 12, padB = 38;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    let scale = { min: 0, max: 0, range: 0, candleW: 0, bodyW: 0 };

    function render() {
      const candles = PT.candles;
      const N = candles.length;
      const a = ASSETS[PT.symbol];
      let min = Infinity, max = -Infinity, maxVol = 0;
      candles.forEach(c => {
        if (c.low < min) min = c.low;
        if (c.high > max) max = c.high;
        if (c.vol > maxVol) maxVol = c.vol;
      });
      const padR2 = (max - min) * 0.12;
      min -= padR2; max += padR2;
      const range = max - min || 1;
      const candleW = chartW / N;
      const bodyW = candleW * 0.62;
      scale = { min, max, range, candleW, bodyW };

      const yScale = (val) => padT + chartH - ((val - min) / range) * chartH;

      // Candles
      let cHtml = '';
      candles.forEach((c, i) => {
        const x = padL + i * candleW + candleW / 2;
        const isUp = c.close >= c.open;
        const cls = isUp ? 'pc-candle-up' : 'pc-candle-dn';
        const isCur = i === N - 1 ? ' pc-candle-current' : '';
        const yHigh = yScale(c.high);
        const yLow = yScale(c.low);
        const yOpen = yScale(c.open);
        const yClose = yScale(c.close);
        const yTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(Math.abs(yClose - yOpen), 1);
        cHtml += `<g class="${cls}${isCur}"><line x1="${x}" y1="${yHigh}" x2="${x}" y2="${yLow}"/><rect x="${x - bodyW / 2}" y="${yTop}" width="${bodyW}" height="${bodyH}"/></g>`;
      });
      candlesG.innerHTML = cHtml;

      // Line
      const linePts = [];
      candles.forEach((c, i) => {
        const x = padL + i * candleW + candleW / 2;
        const y = yScale(c.close);
        linePts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      });
      if (lineEl) lineEl.setAttribute('points', linePts.join(' '));

      // Area
      if (areaEl) {
        const last = linePts[linePts.length - 1].split(',');
        const first = linePts[0].split(',');
        const areaPts = [...linePts, `${last[0]},${padT + chartH}`, `${first[0]},${padT + chartH}`];
        areaEl.setAttribute('points', areaPts.join(' '));
      }

      // MA(7)
      const maPts = [];
      candles.forEach((c, i) => {
        const start = Math.max(0, i - 6);
        const slice = candles.slice(start, i + 1);
        const avg = slice.reduce((s, x) => s + x.close, 0) / slice.length;
        const x = padL + i * candleW + candleW / 2;
        maPts.push(`${x.toFixed(1)},${yScale(avg).toFixed(1)}`);
      });
      if (maEl) maEl.setAttribute('points', maPts.join(' '));

      // Last price
      const last = candles[N - 1];
      const lastY = yScale(last.close);
      const lastX = padL + (N - 1) * candleW + candleW / 2;
      if (priceLine) { priceLine.setAttribute('y1', lastY); priceLine.setAttribute('y2', lastY); }
      if (lastDot)   { lastDot.setAttribute('cx', lastX); lastDot.setAttribute('cy', lastY); }
      if (lastPulse) { lastPulse.setAttribute('cx', lastX); lastPulse.setAttribute('cy', lastY); }

      // Y-axis labels
      if (yAxis) {
        const labels = [];
        for (let i = 0; i < 5; i++) {
          const v = max - (range * i / 4);
          labels.push(`<span>${fmt(PT.symbol, v)}</span>`);
        }
        yAxis.innerHTML = labels.join('');
      }

      // Price tag (right side, follows last)
      if (priceTag) {
        priceTag.textContent = fmt(PT.symbol, last.close);
        priceTag.style.top = ((lastY / H) * 100) + '%';
      }

      // Volume bars
      if (volSvg) {
        let vHtml = '';
        const vH = 36;
        candles.forEach((c, i) => {
          const x = padL + i * candleW + candleW / 2 - bodyW / 2;
          const h = (c.vol / (maxVol || 1)) * (vH - 4);
          const y = vH - h;
          const isUp = c.close >= c.open;
          const fill = isUp ? '#22c993' : '#ff5b6b';
          vHtml += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bodyW.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" opacity="0.45"/>`;
        });
        volSvg.innerHTML = vHtml;
      }

      // Header OHLC
      const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      setText('pcO', fmt(PT.symbol, last.open));
      setText('pcH', fmt(PT.symbol, last.high));
      setText('pcL', fmt(PT.symbol, last.low));
      setText('pcC', fmt(PT.symbol, last.close));
      setText('pcV', (last.vol).toFixed(0));

      // Bottom bid/ask + signal
      setText('pttBid', fmt(PT.symbol, last.close));
      setText('pttAsk', fmt(PT.symbol, last.close + a.spread));
      setText('pmrMargin', a.margin);

      const sigEl = document.getElementById('pttSignalLabel');
      if (sigEl) sigEl.textContent = a.signal;

      const sym = document.getElementById('pcSymName'); if (sym) sym.textContent = a.name;
      const tfL = document.getElementById('pcTfLabel'); if (tfL) tfL.textContent = TIMEFRAMES[PT.tf].label;
    }

    /* ---------- Crosshair + Tooltip ---------- */
    function showCrosshair() {
      if (crossG) crossG.style.display = '';
      if (tooltip) tooltip.classList.add('is-show');
      if (crossTag) crossTag.classList.add('is-show');
      if (hint) hint.classList.add('is-hidden');
    }
    function hideCrosshair() {
      if (crossG) crossG.style.display = 'none';
      if (tooltip) tooltip.classList.remove('is-show');
      if (crossTag) crossTag.classList.remove('is-show');
    }

    function trackCursor(clientX, clientY) {
      const rect = cv.getBoundingClientRect();
      const xPx = clientX - rect.left;
      const yPx = clientY - rect.top;
      // Convert pixel to viewBox coords
      const vbX = (xPx / rect.width) * W;
      const vbY = (yPx / rect.height) * H;

      // Find closest candle
      const N = PT.candles.length;
      const candleW = chartW / N;
      let idx = Math.floor((vbX - padL) / candleW);
      idx = Math.max(0, Math.min(N - 1, idx));
      const c = PT.candles[idx];
      if (!c) return;

      const cx = padL + idx * candleW + candleW / 2;
      // Snap Y to candle close (or to cursor for free price)
      const yScale = (val) => padT + chartH - ((val - scale.min) / scale.range) * chartH;
      const cy = vbY; // Free Y for crosshair
      const cyClamped = Math.max(padT, Math.min(padT + chartH, cy));
      // Inverse to find price
      const pxToPrice = scale.max - ((cyClamped - padT) / chartH) * scale.range;

      if (chX) { chX.setAttribute('x1', cx); chX.setAttribute('x2', cx); chX.setAttribute('y1', padT); chX.setAttribute('y2', padT + chartH); }
      if (chY) { chY.setAttribute('x1', padL); chY.setAttribute('x2', padL + chartW); chY.setAttribute('y1', cyClamped); chY.setAttribute('y2', cyClamped); }

      // Crosshair price tag (follows cursor Y)
      if (crossTag) {
        crossTag.textContent = fmt(PT.symbol, pxToPrice);
        crossTag.style.top = ((cyClamped / H) * 100) + '%';
      }

      // Tooltip
      if (tooltip) {
        const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        const tfMin = { M1: 1, M5: 5, M15: 15, H1: 60, H4: 240, D1: 1440 }[PT.tf] || 15;
        const minutesAgo = (N - 1 - idx) * tfMin;
        const time = minutesAgo === 0 ? 'الآن' : (minutesAgo < 60 ? `قبل ${minutesAgo}د` : `قبل ${Math.floor(minutesAgo / 60)}س ${minutesAgo % 60 ? (minutesAgo % 60) + 'د' : ''}`);
        setT('pctTime', time);
        setT('pctO', fmt(PT.symbol, c.open));
        setT('pctH', fmt(PT.symbol, c.high));
        setT('pctL', fmt(PT.symbol, c.low));
        setT('pctC', fmt(PT.symbol, c.close));
        setT('pctV', c.vol.toFixed(0));

        // Position tooltip near cursor (in pixels relative to canvas)
        const tipW = 130, tipH = 110;
        let tx = xPx + 14;
        let ty = yPx - tipH / 2;
        if (tx + tipW > rect.width - 6) tx = xPx - tipW - 14;
        if (ty < 6) ty = 6;
        if (ty + tipH > rect.height - 6) ty = rect.height - tipH - 6;
        tooltip.style.left = tx + 'px';
        tooltip.style.top  = ty + 'px';
      }
    }

    cv.addEventListener('mouseenter', showCrosshair);
    cv.addEventListener('mouseleave', hideCrosshair);
    cv.addEventListener('mousemove', (e) => trackCursor(e.clientX, e.clientY));
    cv.addEventListener('touchstart', (e) => {
      if (!e.touches[0]) return;
      showCrosshair();
      trackCursor(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    cv.addEventListener('touchmove', (e) => {
      if (!e.touches[0]) return;
      trackCursor(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    cv.addEventListener('touchend', hideCrosshair);

    /* ---------- Mode (chart type) ---------- */
    function applyMode(type) {
      cv.classList.remove('pc-mode-candles', 'pc-mode-line', 'pc-mode-area');
      cv.classList.add('pc-mode-' + type);
      PT.chartType = type;
    }
    applyMode(PT.chartType);

    document.querySelectorAll('.pc-types .pct').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        document.querySelectorAll('.pc-types .pct').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        applyMode(type);
      });
    });

    /* ---------- Timeframes ---------- */
    document.querySelectorAll('.pc-tfs .pctf').forEach(btn => {
      btn.addEventListener('click', () => {
        const tf = btn.dataset.tf;
        document.querySelectorAll('.pc-tfs .pctf').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        setTf(tf);
      });
    });

    /* ---------- Actions: pause / reset / fullscreen ---------- */
    const playBtn = document.getElementById('pcPlayBtn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        const next = !PT.paused;
        setPaused(next);
        playBtn.setAttribute('aria-pressed', next ? 'false' : 'true');
      });
    }
    const resetBtn = document.getElementById('pcResetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        rebuild(PT.symbol, PT.tf);
        render();
      });
    }
    const fsBtn = document.getElementById('pcFsBtn');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        const el = root;
        if (!document.fullscreenElement) {
          if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
          else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        }
      });
    }

    /* ---------- Asset switcher ---------- */
    document.querySelectorAll('.ptt-asset').forEach(btn => {
      btn.addEventListener('click', () => {
        const sym = btn.dataset.symbol;
        document.querySelectorAll('.ptt-asset').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        setSymbol(sym);
      });
    });

    /* ---------- Live tick + new candle ---------- */
    let tickT = null;
    let bigT = null;
    function startTick() {
      if (tickT) clearInterval(tickT);
      if (bigT) clearInterval(bigT);
      const tf = TIMEFRAMES[PT.tf];
      const a = ASSETS[PT.symbol];
      tickT = setInterval(() => {
        if (PT.paused) return;
        const last = PT.candles[PT.candles.length - 1];
        if (!last) return;
        const change = (Math.random() - 0.5) * a.vol * tf.volMul * 0.3;
        last.close += change;
        last.high = Math.max(last.high, last.close);
        last.low  = Math.min(last.low,  last.close);
        last.vol  = Math.min(100, last.vol + Math.random() * 2);
        render();
      }, tf.tickMs);

      bigT = setInterval(() => {
        if (PT.paused) return;
        const last = PT.candles[PT.candles.length - 1];
        if (!last) return;
        const open = last.close;
        const dir = Math.random() > 0.45 ? 1 : -1;
        const mag = Math.random() * a.vol * tf.volMul;
        const close = open + dir * mag;
        const high = Math.max(open, close) + Math.random() * a.vol * tf.volMul * 0.5;
        const low  = Math.min(open, close) - Math.random() * a.vol * tf.volMul * 0.5;
        const v = 30 + Math.random() * 70;
        PT.candles.shift();
        PT.candles.push({ open, high, low, close, vol: v, t: 0 });
        render();
      }, tf.tickMs * 9);
    }

    PT.listeners.symbol.push(() => { render(); startTick(); });
    PT.listeners.tf.push(() => { render(); startTick(); });

    // Initial state
    rebuild(PT.symbol, PT.tf);
    render();
    startTick();

    // Hide hint after first interaction
    cv.addEventListener('mouseenter', () => { if (hint) hint.classList.add('is-hidden'); }, { once: true });
  }

  /* ============================================================
     4. PRO TERMINAL - LIVE ORDER FLOW
     ============================================================ */
  function initProFlow() {
    const list = document.getElementById('pfList');
    if (!list) return;
    const MAX_ROWS = 9;
    let counter = 0;

    function pushRow() {
      const candles = PT.candles;
      if (!candles.length) return;
      const last = candles[candles.length - 1];
      const a = ASSETS[PT.symbol];
      const isBuy = Math.random() > 0.5;
      const offset = (Math.random() - 0.5) * a.vol * 0.6;
      const price = last.close + offset;
      const volSize = a.decimals === 0 ? (Math.random() * 0.8 + 0.05).toFixed(2) : (0.05 + Math.random() * 1.95).toFixed(2);

      const row = document.createElement('div');
      row.className = 'pf-row ' + (isBuy ? 'buy' : 'sell');
      row.innerHTML = `
        <span class="pfr-side">${isBuy ? 'BUY' : 'SELL'}</span>
        <span class="pfr-vol">${volSize}</span>
        <span class="pfr-prc">${fmt(PT.symbol, price)}</span>
      `;
      list.insertBefore(row, list.firstChild);
      while (list.children.length > MAX_ROWS) list.removeChild(list.lastChild);
      counter++;
    }

    // Reset feed on symbol/tf change
    PT.listeners.symbol.push(() => { list.innerHTML = ''; for (let i = 0; i < MAX_ROWS; i++) pushRow(); });
    PT.listeners.tf.push(() => { list.innerHTML = ''; for (let i = 0; i < MAX_ROWS; i++) pushRow(); });

    for (let i = 0; i < MAX_ROWS; i++) pushRow();
    setInterval(() => { if (!PT.paused) pushRow(); }, 1300);

    // Throughput counter
    const cntEl = document.getElementById('pfCount');
    if (cntEl) {
      let prev = 0;
      setInterval(() => {
        const rate = counter - prev;
        prev = counter;
        cntEl.textContent = rate + '/s';
      }, 1000);
    }
  }

  /* ============================================================
     5. PRO TERMINAL - MOBILE (Interactive Compact Card)
     ============================================================ */
  function initProMobile() {
    const wrap = document.getElementById('pmcChartWrap');
    const svg = document.getElementById('pmcChart');
    if (!wrap || !svg) return;

    const lineEl = document.getElementById('pmcLine');
    const areaEl = document.getElementById('pmcArea');
    const dot = document.getElementById('pmcDot');
    const pulse = document.getElementById('pmcPulse');
    const tag = document.getElementById('pmcTag');
    const crossTag = document.getElementById('pmcCrossTag');
    const crossDot = document.getElementById('pmcCrossDot');
    const chY = document.getElementById('pmcChY');
    const chX = document.getElementById('pmcChX');

    const W = 320, H = 130, padL = 6, padR = 6, padT = 8, padB = 8;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    let scale = { min: 0, max: 0, range: 0, stepX: 0 };

    function render() {
      const series = PT.series;
      if (!series.length) return;
      const N = series.length;
      const a = ASSETS[PT.symbol];
      let min = Infinity, max = -Infinity;
      series.forEach(v => { if (v < min) min = v; if (v > max) max = v; });
      const padR2 = (max - min) * 0.18 || a.vol;
      const minP = min - padR2;
      const maxP = max + padR2;
      const range = maxP - minP || 1;
      const stepX = chartW / (N - 1);
      scale = { min: minP, max: maxP, range, stepX };

      const yScale = (val) => padT + chartH - ((val - minP) / range) * chartH;

      const pts = [];
      series.forEach((v, i) => {
        const x = padL + i * stepX;
        const y = yScale(v);
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      });
      if (lineEl) lineEl.setAttribute('points', pts.join(' '));
      if (areaEl) {
        const last = pts[pts.length - 1].split(',');
        const first = pts[0].split(',');
        const areaPts = [...pts, `${last[0]},${padT + chartH}`, `${first[0]},${padT + chartH}`];
        areaEl.setAttribute('points', areaPts.join(' '));
      }

      const lastV = series[N - 1];
      const lastX = padL + (N - 1) * stepX;
      const lastY = yScale(lastV);
      if (dot) { dot.setAttribute('cx', lastX); dot.setAttribute('cy', lastY); }
      if (pulse) { pulse.setAttribute('cx', lastX); pulse.setAttribute('cy', lastY); }

      // Header values
      const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      setT('pmcPrice', fmt(PT.symbol, lastV));
      setT('pmcBid', fmt(PT.symbol, lastV));
      setT('pmcAsk', fmt(PT.symbol, lastV + a.spread));
      if (tag) tag.textContent = fmt(PT.symbol, lastV);
      setT('pmcName', a.name);
      setT('pmcSub', a.sub);
      setT('pmcIcon', a.icon);
      setT('pmcAi', a.signalShort || a.signal);
      setT('pmcTfLbl', PT.tf);

      // Update name+sub line
      const subEl = document.getElementById('pmcSub');
      if (subEl) subEl.innerHTML = `${a.sub} · <span id="pmcTfLbl">${PT.tf}</span>`;

      // Change %
      const chgEl = document.getElementById('pmcChg');
      if (chgEl) {
        const start = series[0];
        const pct = ((lastV - start) / start) * 100;
        chgEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
        chgEl.classList.toggle('up', pct >= 0);
        chgEl.classList.toggle('dn', pct < 0);
        if (lineEl) lineEl.classList.toggle('dn', pct < 0);
      }
    }

    /* ---------- Touch / Mouse crosshair ---------- */
    function showCross() {
      if (chY) chY.style.display = '';
      if (chX) chX.style.display = '';
      if (crossDot) crossDot.style.display = '';
      if (crossTag) crossTag.classList.add('is-show');
    }
    function hideCross() {
      if (chY) chY.style.display = 'none';
      if (chX) chX.style.display = 'none';
      if (crossDot) crossDot.style.display = 'none';
      if (crossTag) crossTag.classList.remove('is-show');
    }
    function track(clientX, clientY) {
      const rect = wrap.getBoundingClientRect();
      const xPx = clientX - rect.left;
      const yPx = clientY - rect.top;
      const vbX = (xPx / rect.width) * W;
      const N = PT.series.length;
      const stepX = chartW / (N - 1);
      let idx = Math.round((vbX - padL) / stepX);
      idx = Math.max(0, Math.min(N - 1, idx));
      const v = PT.series[idx];
      const x = padL + idx * stepX;
      const yScale = (val) => padT + chartH - ((val - scale.min) / scale.range) * chartH;
      const y = yScale(v);
      if (chY) { chY.setAttribute('y1', y); chY.setAttribute('y2', y); }
      if (chX) { chX.setAttribute('x1', x); chX.setAttribute('x2', x); }
      if (crossDot) { crossDot.setAttribute('cx', x); crossDot.setAttribute('cy', y); }
      if (crossTag) {
        crossTag.textContent = fmt(PT.symbol, v);
        // Position relative to wrapper in pixels
        const tipW = 80;
        let tx = (x / W) * rect.width + 8;
        if (tx + tipW > rect.width - 4) tx = (x / W) * rect.width - tipW - 8;
        let ty = (y / H) * rect.height - 12;
        if (ty < 4) ty = 4;
        if (ty + 22 > rect.height - 4) ty = rect.height - 26;
        crossTag.style.left = tx + 'px';
        crossTag.style.top  = ty + 'px';
      }
    }
    wrap.addEventListener('mouseenter', showCross);
    wrap.addEventListener('mouseleave', hideCross);
    wrap.addEventListener('mousemove', (e) => track(e.clientX, e.clientY));
    wrap.addEventListener('touchstart', (e) => {
      if (!e.touches[0]) return;
      e.preventDefault();
      showCross();
      track(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    wrap.addEventListener('touchmove', (e) => {
      if (!e.touches[0]) return;
      e.preventDefault();
      track(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    wrap.addEventListener('touchend', hideCross);

    /* ---------- Asset chips (mobile) ---------- */
    document.querySelectorAll('.pmc-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const sym = btn.dataset.symbol;
        document.querySelectorAll('.pmc-chip').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        setSymbol(sym);
      });
    });

    /* ---------- Timeframe buttons (mobile) ---------- */
    document.querySelectorAll('.pmc-tf').forEach(btn => {
      btn.addEventListener('click', () => {
        const tf = btn.dataset.tf;
        document.querySelectorAll('.pmc-tf').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        setTf(tf);
      });
    });

    /* ---------- Live tick ---------- */
    let tickT = null;
    function startTick() {
      if (tickT) clearInterval(tickT);
      const tf = TIMEFRAMES[PT.tf];
      const a = ASSETS[PT.symbol];
      tickT = setInterval(() => {
        if (PT.paused) return;
        const last = PT.series[PT.series.length - 1];
        const drift = (Math.random() - 0.5) * a.vol * tf.volMul * 0.5;
        const next = last + drift;
        PT.series.shift();
        PT.series.push(next);
        // Keep PT.candles[N-1] roughly synced for desktop continuity if both visible
        if (PT.candles.length) {
          const c = PT.candles[PT.candles.length - 1];
          c.close = next;
          c.high = Math.max(c.high, next);
          c.low  = Math.min(c.low,  next);
        }
        render();
      }, tf.tickMs);
    }

    PT.listeners.symbol.push(() => { render(); startTick(); });
    PT.listeners.tf.push(() => {
      // Update active states across both versions
      document.querySelectorAll('.pmc-tf').forEach(b => b.classList.toggle('is-active', b.dataset.tf === PT.tf));
      document.querySelectorAll('.pc-tfs .pctf').forEach(b => b.classList.toggle('is-active', b.dataset.tf === PT.tf));
      render(); startTick();
    });
    // Sync mobile chip when desktop changes symbol & vice versa
    PT.listeners.symbol.push(() => {
      document.querySelectorAll('.pmc-chip').forEach(b => b.classList.toggle('is-active', b.dataset.symbol === PT.symbol));
      document.querySelectorAll('.ptt-asset').forEach(b => b.classList.toggle('is-active', b.dataset.symbol === PT.symbol));
    });

    render();
    startTick();
  }

  /* ============================================================
     6. STICKY HEADER STATE
     ============================================================ */
  function initHeader() {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    const onScroll = () => {
      if (window.scrollY > 50) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ============================================================
     7. NUMBER COUNTERS
     ============================================================ */
  function animateCounter(el, target, duration = 1800) {
    const start = performance.now();
    const isFloat = target % 1 !== 0;
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = isFloat ? value.toFixed(1) : Math.floor(value);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;
    const seen = new WeakSet();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !seen.has(entry.target)) {
          seen.add(entry.target);
          const target = parseFloat(entry.target.dataset.count);
          animateCounter(entry.target, target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(c => observer.observe(c));
  }

  /* ============================================================
     8. LIVE TICKER
     ============================================================ */
  function initTicker() {
    const track = document.getElementById('tickerTrack');
    if (!track) return;
    const original = track.innerHTML;
    track.innerHTML = original + original;
    const items = track.querySelectorAll('.tk');
    setInterval(() => {
      items.forEach(item => {
        const priceEl = item.querySelector('.tk__price');
        const chgEl = item.querySelector('.tk__chg');
        if (!priceEl || !chgEl) return;
        const priceText = priceEl.textContent.replace(/,/g, '');
        let price = parseFloat(priceText);
        if (isNaN(price)) return;
        const dataVol = parseFloat(item.dataset.vol);
        const volRatio = !isNaN(dataVol) && dataVol > 0
          ? dataVol
          : (price > 1000 ? 0.0008 : 0.0015);
        const vol = price * volRatio;
        const delta = (Math.random() - 0.5) * vol * 2;
        const newPrice = Math.max(0.01, price + delta);
        const decimals = parseInt(item.dataset.dec, 10);
        const dec = !isNaN(decimals) ? decimals : ((priceText.split('.')[1] || '').length);
        priceEl.textContent = dec > 0 ? newPrice.toFixed(dec) : Math.round(newPrice).toString();
        const chgText = chgEl.textContent.replace(/[▲▼\s]/g, '');
        let chg = parseFloat(chgText.replace(/[+%]/g, ''));
        if (isNaN(chg)) chg = 0;
        chg += (Math.random() - 0.5) * 0.05;
        chg = Math.max(-2.5, Math.min(2.5, chg));
        chgEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
        chgEl.classList.toggle('up', chg >= 0);
        chgEl.classList.toggle('dn', chg < 0);
        priceEl.style.transition = 'color .3s';
        priceEl.style.color = chg >= 0 ? '#22c993' : '#ff5b6b';
        setTimeout(() => { priceEl.style.color = ''; }, 600);
      });
    }, 3500);
  }

  /* ============================================================
     9. SMOOTH SCROLL FOR ANCHOR LINKS
     ============================================================ */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#' || href.length < 2) return;
        const parentLi = link.parentElement;
        const isToggle = parentLi
          && parentLi.classList.contains('has-mega')
          && parentLi.firstElementChild === link;
        const drawerOpen = document.querySelector('.main-nav.is-open');
        if (isToggle && drawerOpen) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        const offset = 90;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  /* ============================================================
     10. SCROLL REVEAL
     ============================================================ */
  function initReveal() {
    const reveals = document.querySelectorAll(
      '.product-card, .platform-card, .account-card, .why-card, .award, .tool, .trust__item'
    );
    if (!reveals.length) return;
    reveals.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = `opacity .7s ease ${(i % 6) * 0.08}s, transform .7s ease ${(i % 6) * 0.08}s`;
    });
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(el => obs.observe(el));
  }

  /* ============================================================
     11. MOBILE NAV
     ============================================================ */
  function initMobileNav() {
    const btn = document.getElementById('hamburger');
    const nav = document.querySelector('.main-nav');
    if (!btn || !nav) return;
    let savedScrollY = 0;
    let navOrigParent = null;
    let navOrigNextSibling = null;

    // Inject mobile-only drawer head/foot once
    if (!nav.querySelector('.mnav-head')) {
      const head = document.createElement('div');
      head.className = 'mnav-head';
      head.innerHTML = ''
        + '<a href="index.html" class="mnav-brand" aria-label="MEX Global Markets">'
        +   '<img src="assets/logo-mex.png" alt="MEX Global Markets">'
        + '</a>'
        + '<button type="button" class="mnav-close" aria-label="إغلاق القائمة">'
        +   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
        + '</button>';
      nav.insertBefore(head, nav.firstChild);
      head.querySelector('.mnav-close').addEventListener('click', () => closeNav());
    }

    // Add icons to top-level menu items (run once)
    if (!nav.dataset.iconified) {
      const iconMap = {
        'المنتجات':  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 6-6"/></svg>',
        'الحسابات':  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>',
        'عن MEX':    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
        'الأكاديمية':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
        'الشراكات':  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><circle cx="17" cy="11" r="3"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M21 21v-1a3 3 0 0 0-2-2.8"/></svg>',
        'الدعم':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/></svg>'
      };
      nav.querySelectorAll(':scope > ul > li > a').forEach(a => {
        const text = a.textContent.trim().replace(/▾/g, '').trim();
        for (const key in iconMap) {
          if (text.startsWith(key)) {
            const wrap = document.createElement('span');
            wrap.className = 'mnav-ico';
            wrap.innerHTML = iconMap[key];
            a.insertBefore(wrap, a.firstChild);
            break;
          }
        }
      });
      nav.dataset.iconified = '1';
    }

    // Inject drawer footer once
    if (!nav.querySelector('.mnav-foot')) {
      const foot = document.createElement('div');
      foot.className = 'mnav-foot';
      foot.innerHTML = ''
        + '<div class="mnav-cta">'
        +   '<a href="register.html" class="mnav-cta__primary" data-i18n="mnav.cta.primary">افتح حسابًا حقيقيًا</a>'
        +   '<a href="login.html" class="mnav-cta__ghost" data-i18n="mnav.cta.login">تسجيل الدخول</a>'
        + '</div>'
        + '<div class="mnav-meta">'
        +   '<a href="support.html" class="mnav-meta__item">'
        +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/></svg>'
        +     '<span data-i18n="mnav.meta.support">دعم 24/5</span>'
        +   '</a>'
        +   '<span class="mnav-meta__dot"></span>'
        +   '<a href="#" class="mnav-meta__item">'
        +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>'
        +     '<span>AR / EN</span>'
        +   '</a>'
        +   '<span class="mnav-meta__dot"></span>'
        +   '<a href="#" class="mnav-meta__item">'
        +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/></svg>'
        +     '<span data-i18n="mnav.meta.ib">شركاء IB</span>'
        +   '</a>' + '</div>';
      nav.appendChild(foot);
      // Re-apply translations now that new [data-i18n] elements were injected
      if (window.MEXi18n && typeof window.MEXi18n.apply === 'function') {
        try { window.MEXi18n.apply(); } catch(_){}
      }
    }

    const closeNav = () => {
      nav.classList.remove('is-open');
      btn.classList.remove('is-active');
      document.body.classList.remove('nav-open');
      document.body.style.top = '';
      btn.setAttribute('aria-expanded', 'false');
      nav.querySelectorAll('.has-mega.is-expanded').forEach(li => li.classList.remove('is-expanded'));
      // Restore nav back to its original place in the header
      if (navOrigParent && nav.parentElement !== navOrigParent) {
        if (navOrigNextSibling && navOrigNextSibling.parentElement === navOrigParent) {
          navOrigParent.insertBefore(nav, navOrigNextSibling);
        } else {
          navOrigParent.appendChild(nav);
        }
      }
      // Restore scroll position
      window.scrollTo(0, savedScrollY);
    };
    const openNav = () => {
      // Save current scroll position before locking body
      savedScrollY = window.pageYOffset || document.documentElement.scrollTop;
      // Move nav to <body> to escape the header's backdrop-filter containing block
      navOrigParent = nav.parentElement;
      navOrigNextSibling = nav.nextElementSibling;
      if (navOrigParent !== document.body) {
        document.body.appendChild(nav);
      }
      document.body.style.top = `-${savedScrollY}px`;
      nav.classList.add('is-open');
      btn.classList.add('is-active');
      document.body.classList.add('nav-open');
      btn.setAttribute('aria-expanded', 'true');
      // Reset drawer scroll to top
      nav.scrollTop = 0;
    };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (nav.classList.contains('is-open')) closeNav();
      else openNav();
    });
    nav.querySelectorAll('a').forEach(link => {
      const parentLi = link.parentElement;
      const isToggle = parentLi
        && parentLi.classList.contains('has-mega')
        && parentLi.firstElementChild === link;
      link.addEventListener('click', (e) => {
        if (!nav.classList.contains('is-open')) return;
        if (isToggle) {
          e.preventDefault();
          e.stopPropagation();
          nav.querySelectorAll('.has-mega.is-expanded').forEach(other => {
            if (other !== parentLi) other.classList.remove('is-expanded');
          });
          parentLi.classList.toggle('is-expanded');
        } else {
          closeNav();
        }
      });
    });
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || btn.contains(e.target)) return;
      closeNav();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) closeNav();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1100 && nav.classList.contains('is-open')) closeNav();
    });
  }

  /* ============================================================
     12. LATENCY METER (subtle authenticity)
     ============================================================ */
  function initLatency() {
    const a = document.getElementById('heroLatency');
    const b = document.getElementById('pttLatency');
    setInterval(() => {
      const ms = 2 + Math.floor(Math.random() * 6);
      const text = ms + 'ms';
      if (a) a.textContent = text;
      if (b) b.textContent = text;
    }, 2400);
  }

  /* ============================================================
     13. LIVE STATS (auto-incrementing counters)
     ============================================================ */
  function formatLiveValue(n, fmt) {
    if (fmt === 'money') {
      if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
      return '$' + Math.floor(n).toString();
    }
    // int
    return Math.floor(n).toLocaleString('en-US');
  }
  function initLiveStats() {
    const els = document.querySelectorAll('.lcard__val[data-live]');
    if (!els.length) return;

    els.forEach(el => {
      const fmt = el.dataset.fmt || 'int';
      const initVal = parseFloat(el.dataset.init);
      const stepMin = parseFloat(el.dataset.stepMin || '1');
      const stepMax = parseFloat(el.dataset.stepMax || '3');
      const tickMin = parseInt(el.dataset.tickMin || '1000', 10);
      const tickMax = parseInt(el.dataset.tickMax || '2000', 10);

      let current = isNaN(initVal) ? 0 : initVal;
      el.textContent = formatLiveValue(current, fmt);

      function tick() {
        const step = stepMin + Math.random() * Math.max(0, stepMax - stepMin);
        current += step;
        el.textContent = formatLiveValue(current, fmt);
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 750);
        const next = tickMin + Math.random() * Math.max(0, tickMax - tickMin);
        setTimeout(tick, next);
      }
      // Stagger initial tick so cards don't update in unison
      setTimeout(tick, 800 + Math.random() * 1800);
    });
  }

  function initLstatsCharts() {
    const charts = document.querySelectorAll('.lcard__chart');
    if (!charts.length) return;
    charts.forEach(chart => {
      const raw = (chart.dataset.values || '').split(',').map(parseFloat).filter(n => !isNaN(n));
      if (raw.length < 2) return;
      const W = 100, H = 36, PAD_X = 2, PAD_Y = 3;
      const min = Math.min(...raw), max = Math.max(...raw);
      const range = (max - min) || 1;
      const stepX = (W - PAD_X * 2) / (raw.length - 1);
      const pts = raw.map((v, i) => {
        const x = PAD_X + i * stepX;
        const y = H - PAD_Y - ((v - min) / range) * (H - PAD_Y * 2);
        return { x, y };
      });
      // Smooth curve via cubic bezier
      let line = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1];
        const cpx = (p0.x + p1.x) / 2;
        line += ` C ${cpx.toFixed(2)} ${p0.y.toFixed(2)}, ${cpx.toFixed(2)} ${p1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
      }
      const last = pts[pts.length - 1];
      const area = `${line} L ${last.x.toFixed(2)} ${H} L ${pts[0].x.toFixed(2)} ${H} Z`;
      const lineEl = chart.querySelector('.lcard__chart-line');
      const areaEl = chart.querySelector('.lcard__chart-area');
      const dotEl = chart.querySelector('.lcard__chart-dot');
      if (lineEl) lineEl.setAttribute('d', line);
      if (areaEl) areaEl.setAttribute('d', area);
      if (dotEl) { dotEl.setAttribute('cx', last.x.toFixed(2)); dotEl.setAttribute('cy', last.y.toFixed(2)); }
      // Set proper stroke dash length
      try {
        if (lineEl && lineEl.getTotalLength) {
          const len = lineEl.getTotalLength();
          lineEl.style.strokeDasharray = len;
          lineEl.style.strokeDashoffset = len;
          // Force reflow then trigger animation by adding class on parent card
          requestAnimationFrame(() => {
            const card = chart.closest('.lcard');
            if (card) {
              const io = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                  if (e.isIntersecting) {
                    card.classList.add('in-view');
                    lineEl.style.strokeDashoffset = '0';
                    io.disconnect();
                  }
                });
              }, { threshold: 0.25 });
              io.observe(card);
            }
          });
        }
      } catch (_) {}
    });
  }

  function initLstatsSlider() {
    const slider = document.querySelector('[data-slider]');
    if (!slider) return;
    const track = slider.querySelector('[data-slider-track]');
    const prevBtn = slider.querySelector('[data-slider-prev]');
    const nextBtn = slider.querySelector('[data-slider-next]');
    const dotsWrap = slider.querySelector('[data-slider-dots]');
    if (!track || !prevBtn || !nextBtn || !dotsWrap) return;
    const slides = Array.from(track.children);
    if (!slides.length) return;

    // Detect RTL direction dynamically — re-read on every update so that
    // language switches (lang:changed) flip the translate direction correctly.
    function isRTL(){ return getComputedStyle(slider).direction === 'rtl'; }

    let perView = 3;
    let index = 0;
    let autoTimer = null;

    function computePerView() {
      const w = window.innerWidth;
      if (w <= 768) return 1;
      if (w <= 1100) return 2;
      return 3;
    }

    function pageCount() {
      return Math.max(1, slides.length - perView + 1);
    }

    function renderDots() {
      dotsWrap.innerHTML = '';
      const n = pageCount();
      for (let i = 0; i < n; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lstats__dot' + (i === index ? ' active' : '');
        b.setAttribute('aria-label', 'الانتقال إلى الشريحة ' + (i + 1));
        b.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(b);
      }
    }

    function update() {
      const slide = slides[0];
      const slideW = slide.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 0) || 0;
      const offset = (slideW + gap) * index;
      track.style.transform = `translateX(${isRTL() ? offset : -offset}px)`;
      // Update dots
      Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle('active', i === index));
      // Update arrow disabled state
      prevBtn.disabled = (index >= pageCount() - 1);
      nextBtn.disabled = (index <= 0);
    }

    function goTo(i) {
      const max = pageCount() - 1;
      index = Math.max(0, Math.min(max, i));
      update();
      restartAuto();
    }

    function next() {
      const max = pageCount() - 1;
      index = (index + 1) > max ? 0 : index + 1;
      update();
    }

    // In RTL: visual "previous" arrow on right should advance forward
    prevBtn.addEventListener('click', () => { goTo(index + 1); });
    nextBtn.addEventListener('click', () => { goTo(index - 1); });

    function startAuto() {
      stopAuto();
      autoTimer = setInterval(next, 5500);
    }
    function stopAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }
    function restartAuto() {
      if (autoTimer) startAuto();
    }

    slider.addEventListener('mouseenter', stopAuto);
    slider.addEventListener('mouseleave', startAuto);

    // Touch / swipe
    let touchStartX = 0, touchDeltaX = 0, touching = false;
    track.addEventListener('touchstart', (e) => {
      touching = true; touchStartX = e.touches[0].clientX; touchDeltaX = 0;
      stopAuto();
    }, { passive: true });
    track.addEventListener('touchmove', (e) => {
      if (!touching) return;
      touchDeltaX = e.touches[0].clientX - touchStartX;
    }, { passive: true });
    track.addEventListener('touchend', () => {
      if (!touching) return;
      touching = false;
      if (Math.abs(touchDeltaX) > 40) {
        // RTL: swipe right = previous (which visually = forward in RTL = index+1)
        if (isRTL()) {
          if (touchDeltaX > 0) goTo(index + 1);
          else goTo(index - 1);
        } else {
          if (touchDeltaX > 0) goTo(index - 1);
          else goTo(index + 1);
        }
      }
      startAuto();
    });

    // Resize handling
    let resizeRaf = null;
    window.addEventListener('resize', () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        const newPV = computePerView();
        if (newPV !== perView) {
          perView = newPV;
          if (index > pageCount() - 1) index = pageCount() - 1;
          renderDots();
        }
        update();
      });
    });

    // Language change — re-apply transform so RTL/LTR direction flips correctly
    document.addEventListener('lang:changed', () => {
      requestAnimationFrame(update);
    });

    perView = computePerView();
    renderDots();
    update();
    startAuto();
  }

  function initRegulators() {
    const grid = document.querySelector('[data-regulators-grid]');
    const panel = document.querySelector('[data-regulators-panel]');
    if (!grid || !panel) return;

    const FLAG_BASE = 'https://hatscripts.github.io/circle-flags/flags/';
    const data = [
      {
        id:'au',
        code:'au', country:'أستراليا', abbr:'ASIC',
        authority:'هيئة الأوراق المالية والاستثمارات الأسترالية',
        company:'MEX AUSTRALIA (MEX Markets)',
        license:'AFSL 416279',
        desc:'MEX Australia Pty Ltd (MEX Markets) مرخصة من قبل هيئة الأوراق المالية والاستثمارات الأسترالية ("ASIC") برقم AFSL 416279. MEX Markets هو اسم تجاري مسجل لشركة MEX Australia Pty Ltd.',
        url:'https://connectonline.asic.gov.au/RegistrySearch/faces/landing/panelSearch.jspx?searchText=MEX+AUSTRALIA+PTY+LTD&searchType=OrgAndBusNm&_adf.ctrl-state=1nmujkdbk_15',
        countryKey:'reg.country.au'
      },
      {
        id:'de',
        code:'de', country:'ألمانيا', abbr:'BaFin',
        authority:'هيئة الرقابة المالية الفيدرالية الألمانية',
        company:'MEX ASSET MANAGEMENT (GERMANY)',
        license:'HRB 73406',
        desc:'شركة MEX Asset Management GmbH مرخصة من قبل هيئة الرقابة المالية الفيدرالية الألمانية ("BaFin") برقم ترخيص HRB 73406.',
        url:'https://portal.mvp.bafin.de/database/InstInfo/institutDetails.do?cmd=loadInstitutAction&institutId=119375&locale=en_GB',
        countryKey:'reg.country.de'
      },
      {
        id:'ae_ecma',
        code:'ae', country:'الإمارات', abbr:'ECMA',
        authority:'هيئة الأوراق المالية والسلع',
        company:'MEX GLOBAL FINANCIAL SERVICES LLC',
        license:'ECMA 20200000031',
        desc:'شركة MEX Global Financial Services LLC في الإمارات العربية المتحدة مرخصة من قبل هيئة الأوراق المالية والسلع في دولة الإمارات العربية المتحدة، بصفتها وسيط تداول من الفئة الأولى لعقود المشتقات وأسواق العملات العالمية، بموجب ترخيص ECMA رقم 20200000031.',
        url:'https://tradfi.multibankgroup.com/files/pdf/regulations/SCA_LIC-0005622_Certificate.pdf',
        countryKey:'reg.country.ae_ecma'
      },
      {
        id:'ae_vara',
        code:'ae', country:'الإمارات', abbr:'VARA',
        authority:'سُلطة تنظيم الأصول الافتراضية',
        company:'MBIO FZE',
        license:'VL/24/05/001',
        desc:'شركة MBIO FZE مرخصة ومنظمة من قبل سُلطة تنظيم الأصول الافتراضية (VARA) بموجب الترخيص رقم VL/24/05/001.',
        url:'https://www.vara.ae/en/licenses-and-register/public-register/mbio-fze-mbio/',
        countryKey:'reg.country.ae_vara'
      },
      {
        id:'cy',
        code:'cy', country:'قبرص', abbr:'CySEC',
        authority:'هيئة الأوراق المالية والبورصات القبرصية',
        company:'MEX Europe LTD',
        license:'430/23',
        desc:'شركة Mex Europe LTD هي شركة مرخصة من قبل هيئة الأوراق المالية والبورصات القبرصية ("CySEC") برقم ترخيص 430/23.',
        url:'https://www.cysec.gov.cy/en-GB/entities/investment-firms/cypriot/94970/',
        countryKey:'reg.country.cy'
      },
      {
        id:'at',
        code:'at', country:'النمسا', abbr:'FMA',
        authority:'هيئة الأسواق المالية',
        company:'MEX AUSTRIA',
        license:'491129z',
        desc:'إن فرع MEX Asset Management GmbH-Austria مرخص من قبل هيئة الأسواق المالية ("FMA") برقم ترخيص 491129z. يرجى النقر على الرابط للحصول على قائمة بالأنشطة المنظمة التي تقوم بها MEX Asset Management GmbH.',
        url:'https://www.fma.gv.at/en/search-company-database/?cname=MEX+Asset+Management&place=&bic=&category=&per_page=10&submitted=1',
        countryKey:'reg.country.at'
      },
      {
        id:'uk',
        code:'gb', country:'المملكة المتحدة', abbr:'FMC',
        authority:'الهيئات الرقابية في المملكة المتحدة',
        company:'MEX GLOBAL FINANCIAL SERVICES LLC',
        license:'FMC-2024-76492',
        desc:'شركة مرخصة من إحدى الهيئات الرقابية في المملكة المتحدة البريطانية برقم ترخيص FMC-2024-76492.',
        url:'https://fmc-gov.com/pages/companies.html',
        countryKey:'reg.country.uk'
      },
      {
        id:'sg',
        code:'sg', country:'سنغافورة', abbr:'MAS',
        authority:'سلطة النقد في سنغافورة',
        company:'MEX GLOBAL MARKETS PTE. LTD',
        license:'CMS101174',
        desc:'MEX Global Markets PTE. LTD. مرخصة من قبل سلطة النقد في سنغافورة ("MAS") برقم الترخيص CMS101174.',
        url:'https://tradfi.multibankgroup.com/files/pdf/regulations/mas_v2.pdf',
        countryKey:'reg.country.sg'
      },
      {
        id:'in',
        code:'in', country:'الهند', abbr:'FIU',
        authority:'قانون الشركات الهندي',
        company:'MEXD WORLDWIDE',
        license:'U62099UP2024FTC208582',
        desc:'شركة MEXD WORLDWIDE PRIVATE LIMITED مسجلة بموجب قانون الشركات في الهند (رقم التسجيل U62099UP2024FTC208582).',
        url:'https://tradfi.multibankgroup.com/files/pdf/regulations/mexdww-registration-license.pdf',
        countryKey:'reg.country.in'
      }
    ];

    function escapeHtml(s){return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

    // Translation helper: look up key in current language, fall back to Arabic, then to provided default
    function tr(key, fallback){
      try {
        const lang = (document.documentElement.getAttribute('data-lang')) || 'ar';
        const dict = (window.TRANSLATIONS && window.TRANSLATIONS[lang]) || {};
        if (dict[key] != null) return dict[key];
        const ar = (window.TRANSLATIONS && window.TRANSLATIONS.ar) || {};
        if (ar[key] != null) return ar[key];
      } catch(_){}
      return fallback != null ? fallback : key;
    }

    function trCountry(d){ return tr(d.countryKey, d.country); }
    function trAuthority(d){ return tr('reg.' + d.id + '.authority', d.authority); }
    function trDesc(d){ return tr('reg.' + d.id + '.desc', d.desc); }

    function renderGrid(activeIdx) {
      grid.innerHTML = data.map((d, i) => `
        <button type="button" class="regulator-flag${i===activeIdx?' active':''}" data-idx="${i}" aria-label="${escapeHtml(d.abbr)} - ${escapeHtml(trCountry(d))}">
          <span class="regulator-flag__circle" style="background-image:url(${FLAG_BASE}${d.code}.svg)"></span>
          <span class="regulator-flag__abbr">${escapeHtml(d.abbr)}</span>
          <span class="regulator-flag__country">${escapeHtml(trCountry(d))}</span>
        </button>
      `).join('');
    }

    function renderPanel(idx) {
      const d = data[idx];
      if (!d) return;
      const browseLabel = tr('reg.cta.browse', 'تصفح الترخيص');
      const unavailableLabel = tr('reg.cta.unavailable', 'الرابط غير متوفر حالياً');
      const licenseLabel = tr('reg.badge.license', 'رقم الترخيص');
      const ctaHtml = d.url
        ? `<a class="regpanel__cta" href="${escapeHtml(d.url)}" target="_blank" rel="noopener noreferrer">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
               <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
               <polyline points="15 3 21 3 21 9"/>
               <line x1="10" y1="14" x2="21" y2="3"/>
             </svg>
             ${escapeHtml(browseLabel)}
           </a>`
        : `<span class="regpanel__cta regpanel__cta--disabled">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
               <circle cx="12" cy="12" r="10"/>
               <line x1="12" y1="8" x2="12" y2="12"/>
               <line x1="12" y1="16" x2="12.01" y2="16"/>
             </svg>
             ${escapeHtml(unavailableLabel)}
           </span>`;
      panel.style.animation = 'none';
      // restart animation
      // eslint-disable-next-line no-unused-expressions
      panel.offsetHeight;
      panel.style.animation = '';
      panel.innerHTML = `
        <div class="regpanel__top">
          <span class="regpanel__flag" style="background-image:url(${FLAG_BASE}${d.code}.svg)" aria-hidden="true"></span>
          <div class="regpanel__head">
            <div class="regpanel__authority">${escapeHtml(d.abbr)} — ${escapeHtml(trAuthority(d))}</div>
            <div class="regpanel__country">${escapeHtml(trCountry(d))}</div>
          </div>
          <span class="regpanel__badge">${escapeHtml(licenseLabel)}: ${escapeHtml(d.license)}</span>
        </div>
        <div class="regpanel__company">${escapeHtml(d.company)}</div>
        <p class="regpanel__desc">${escapeHtml(trDesc(d))}</p>
        ${ctaHtml}
      `;
    }

    let activeIdx = 0;
    renderGrid(activeIdx);
    renderPanel(activeIdx);

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.regulator-flag');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      if (isNaN(idx) || idx === activeIdx) return;
      activeIdx = idx;
      Array.from(grid.children).forEach((el, i) => el.classList.toggle('active', i === idx));
      renderPanel(idx);
    });

    // Re-render when the language changes so dynamic content stays localized
    document.addEventListener('lang:changed', () => {
      renderGrid(activeIdx);
      renderPanel(activeIdx);
    });
  }

  function initProductsSlider() {
    const slider = document.querySelector('[data-pslider]');
    if (!slider) return;
    const track = slider.querySelector('[data-pslider-track]');
    const prevBtn = slider.querySelector('[data-pslider-prev]');
    const nextBtn = slider.querySelector('[data-pslider-next]');
    const dotsWrap = slider.querySelector('[data-pslider-dots]');
    if (!track || !prevBtn || !nextBtn || !dotsWrap) return;
    const slides = Array.from(track.children);
    if (!slides.length) return;

    const isRTL = () => getComputedStyle(slider).direction === 'rtl';
    let perView = 3;
    let index = 0;
    let autoTimer = null;

    function computePerView() {
      const w = window.innerWidth;
      if (w <= 768) return 1;
      if (w <= 1100) return 2;
      return 3;
    }
    function pageCount() {
      return Math.max(1, slides.length - perView + 1);
    }
    function renderDots() {
      dotsWrap.innerHTML = '';
      const n = pageCount();
      for (let i = 0; i < n; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pslider__dot' + (i === index ? ' active' : '');
        b.setAttribute('aria-label', 'الانتقال إلى الشريحة ' + (i + 1));
        b.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(b);
      }
    }
    function update() {
      const slide = slides[0];
      const slideW = slide.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 0) || 0;
      const offset = (slideW + gap) * index;
      track.style.transform = `translateX(${isRTL() ? offset : -offset}px)`;
      Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle('active', i === index));
      prevBtn.disabled = (index >= pageCount() - 1);
      nextBtn.disabled = (index <= 0);
    }
    function goTo(i) {
      const max = pageCount() - 1;
      index = Math.max(0, Math.min(max, i));
      update();
      restartAuto();
    }
    function next() {
      const max = pageCount() - 1;
      index = (index + 1) > max ? 0 : index + 1;
      update();
    }
    prevBtn.addEventListener('click', () => goTo(index + 1));
    nextBtn.addEventListener('click', () => goTo(index - 1));

    function startAuto(){ stopAuto(); autoTimer = setInterval(next, 6000); }
    function stopAuto(){ if (autoTimer){ clearInterval(autoTimer); autoTimer = null; } }
    function restartAuto(){ if (autoTimer) startAuto(); }

    slider.addEventListener('mouseenter', stopAuto);
    slider.addEventListener('mouseleave', startAuto);

    let touchStartX = 0, touchDeltaX = 0, touching = false;
    track.addEventListener('touchstart', (e) => {
      touching = true; touchStartX = e.touches[0].clientX; touchDeltaX = 0;
      stopAuto();
    }, { passive:true });
    track.addEventListener('touchmove', (e) => {
      if (!touching) return;
      touchDeltaX = e.touches[0].clientX - touchStartX;
    }, { passive:true });
    track.addEventListener('touchend', () => {
      if (!touching) return;
      touching = false;
      if (Math.abs(touchDeltaX) > 40) {
        if (isRTL()) {
          if (touchDeltaX > 0) goTo(index + 1);
          else goTo(index - 1);
        } else {
          if (touchDeltaX > 0) goTo(index - 1);
          else goTo(index + 1);
        }
      }
      startAuto();
    });

    let resizeRaf = null;
    window.addEventListener('resize', () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        const newPV = computePerView();
        if (newPV !== perView) {
          perView = newPV;
          if (index > pageCount() - 1) index = pageCount() - 1;
          renderDots();
        }
        update();
      });
    });

    // Language change — re-apply transform so RTL/LTR direction flips correctly
    document.addEventListener('lang:changed', () => {
      requestAnimationFrame(update);
    });

    perView = computePerView();
    renderDots();
    update();
    startAuto();

    // Live FX price ticker (subtle simulation)
    const fxPriceEl = document.querySelector('[data-fx-price]');
    if (fxPriceEl) {
      let basePrice = 1.08245;
      setInterval(() => {
        const drift = (Math.random() - 0.5) * 0.0006;
        basePrice = Math.max(1.0790, Math.min(1.0860, basePrice + drift));
        fxPriceEl.textContent = basePrice.toFixed(5);
      }, 1800);
    }
  }

  function initTiersSlider() {
    const slider = document.querySelector('[data-tslider]');
    if (!slider) return;
    const track = slider.querySelector('[data-tslider-track]');
    const prevBtn = slider.querySelector('[data-tslider-prev]');
    const nextBtn = slider.querySelector('[data-tslider-next]');
    const dotsWrap = slider.querySelector('[data-tslider-dots]');
    if (!track || !prevBtn || !nextBtn || !dotsWrap) return;
    const slides = Array.from(track.children);
    if (!slides.length) return;

    const isRTL = () => getComputedStyle(slider).direction === 'rtl';
    let perView = 3;
    let index = 0;
    let autoTimer = null;

    function computePerView() {
      const w = window.innerWidth;
      if (w <= 768) return 1;
      if (w <= 1100) return 2;
      return 3;
    }
    function pageCount() { return Math.max(1, slides.length - perView + 1); }

    function renderDots() {
      dotsWrap.innerHTML = '';
      const n = pageCount();
      for (let i = 0; i < n; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tslider__dot' + (i === index ? ' active' : '');
        b.setAttribute('aria-label', 'الانتقال إلى الشريحة ' + (i + 1));
        b.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(b);
      }
    }
    function update() {
      const slide = slides[0];
      const slideW = slide.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 0) || 0;
      const offset = (slideW + gap) * index;
      track.style.transform = `translateX(${isRTL() ? offset : -offset}px)`;
      Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle('active', i === index));
      prevBtn.disabled = (index >= pageCount() - 1);
      nextBtn.disabled = (index <= 0);
    }
    function goTo(i) {
      const max = pageCount() - 1;
      index = Math.max(0, Math.min(max, i));
      update(); restartAuto();
    }
    function next() {
      const max = pageCount() - 1;
      index = (index + 1) > max ? 0 : index + 1;
      update();
    }
    prevBtn.addEventListener('click', () => goTo(index + 1));
    nextBtn.addEventListener('click', () => goTo(index - 1));

    function startAuto(){ stopAuto(); autoTimer = setInterval(next, 6500); }
    function stopAuto(){ if (autoTimer){ clearInterval(autoTimer); autoTimer = null; } }
    function restartAuto(){ if (autoTimer) startAuto(); }
    slider.addEventListener('mouseenter', stopAuto);
    slider.addEventListener('mouseleave', startAuto);

    let touchStartX = 0, touchDeltaX = 0, touching = false;
    track.addEventListener('touchstart', (e) => {
      touching = true; touchStartX = e.touches[0].clientX; touchDeltaX = 0; stopAuto();
    }, { passive:true });
    track.addEventListener('touchmove', (e) => {
      if (!touching) return;
      touchDeltaX = e.touches[0].clientX - touchStartX;
    }, { passive:true });
    track.addEventListener('touchend', () => {
      if (!touching) return;
      touching = false;
      if (Math.abs(touchDeltaX) > 40) {
        if (isRTL()) {
          if (touchDeltaX > 0) goTo(index + 1); else goTo(index - 1);
        } else {
          if (touchDeltaX > 0) goTo(index - 1); else goTo(index + 1);
        }
      }
      startAuto();
    });

    let resizeRaf = null;
    window.addEventListener('resize', () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        const newPV = computePerView();
        if (newPV !== perView) {
          perView = newPV;
          if (index > pageCount() - 1) index = pageCount() - 1;
          renderDots();
        }
        update();
      });
    });

    // Language change — re-apply transform so RTL/LTR direction flips correctly
    document.addEventListener('lang:changed', () => {
      requestAnimationFrame(update);
    });

    perView = computePerView();
    renderDots(); update(); startAuto();

    // ===== Live tier counters =====
    const counters = slider.querySelectorAll('.tcard__live-count[data-tcount]');
    counters.forEach(el => {
      let val = parseInt(el.dataset.tcount, 10) || 0;
      const stepMin = parseInt(el.dataset.stepMin || '1', 10);
      const stepMax = parseInt(el.dataset.stepMax || '3', 10);
      const tickMin = parseInt(el.dataset.tickMin || '2000', 10);
      const tickMax = parseInt(el.dataset.tickMax || '5000', 10);
      const fmt = (n) => n.toLocaleString('en-US');
      function tick() {
        const inc = stepMin + Math.floor(Math.random() * (stepMax - stepMin + 1));
        val += inc;
        el.textContent = fmt(val);
        el.classList.add('bumped');
        setTimeout(() => el.classList.remove('bumped'), 450);
        const nextDelay = tickMin + Math.floor(Math.random() * (tickMax - tickMin + 1));
        setTimeout(tick, nextDelay);
      }
      const initialDelay = tickMin + Math.floor(Math.random() * (tickMax - tickMin + 1));
      setTimeout(tick, initialDelay);
    });
  }

  /* ---------- AWARDS MARQUEE ---------- */
  function initAwardsMarquee() {
    const track = document.querySelector('[data-awards-track]');
    if (!track) return;
    const originals = Array.from(track.children);
    if (!originals.length) return;

    // Clone all originals once for seamless loop, renaming SVG ids to avoid duplicates.
    let cloneIdx = 0;
    originals.forEach((card) => {
      cloneIdx++;
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');

      // Rename every element with an id and update url(#id) references inside this clone.
      const idMap = {};
      clone.querySelectorAll('[id]').forEach((el) => {
        const oldId = el.id;
        const newId = `${oldId}_m${cloneIdx}`;
        idMap[oldId] = newId;
        el.id = newId;
      });
      Object.keys(idMap).forEach((oldId) => {
        const newId = idMap[oldId];
        clone.querySelectorAll(`[fill="url(#${oldId})"]`).forEach((ref) => ref.setAttribute('fill', `url(#${newId})`));
        clone.querySelectorAll(`[stroke="url(#${oldId})"]`).forEach((ref) => ref.setAttribute('stroke', `url(#${newId})`));
      });

      track.appendChild(clone);
    });

    // Pause when offscreen to save CPU.
    const marquee = track.closest('[data-awards-marquee]');
    if (marquee && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          track.style.animationPlayState = entry.isIntersecting ? '' : 'paused';
        });
      }, { threshold: 0.05 });
      io.observe(marquee);
    }
  }

  /* ---------- PARTNERS STATS COUNTER (count-up on viewport enter) ---------- */
  function initPartnersStats() {
    const wrap = document.querySelector('[data-partners-stats]');
    if (!wrap) return;
    const items = wrap.querySelectorAll('[data-pstat-target]');
    if (!items.length) return;

    function formatNum(n, decimals) {
      if (decimals > 0) return n.toFixed(decimals);
      // Add comma thousand separators for big integers
      return Math.round(n).toLocaleString('en-US');
    }

    function animate(el) {
      if (el.dataset.pstatDone) return;
      el.dataset.pstatDone = '1';
      const target = parseFloat(el.getAttribute('data-pstat-target')) || 0;
      const decimals = parseInt(el.getAttribute('data-pstat-decimals') || '0', 10);
      const prefix = el.getAttribute('data-pstat-prefix') || '';
      const suffix = el.getAttribute('data-pstat-suffix') || '';
      const duration = 1800;
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        const cur = target * eased;
        el.textContent = prefix + formatNum(cur, decimals) + suffix;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = prefix + formatNum(target, decimals) + suffix;
      }
      requestAnimationFrame(tick);
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animate(e.target);
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.3 });
      items.forEach((el) => io.observe(el));
    } else {
      items.forEach(animate);
    }
  }

  /* ---------- BACK TO TOP (visibility + smooth scroll + progress) ---------- */
  function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    const bar = btn.querySelector('.back-to-top__progress-bar');
    // Circle circumference: 2 * PI * r (r=20 desktop, r=18 mobile via CSS)
    const CIRC = 2 * Math.PI * 20;
    let ticking = false;

    function update() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0;

      // Toggle visibility after 320px scroll
      if (scrollTop > 320) {
        btn.classList.add('is-visible');
      } else {
        btn.classList.remove('is-visible');
      }

      // Update progress ring
      if (bar) {
        bar.style.strokeDashoffset = String(CIRC * (1 - progress));
      }
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    btn.addEventListener('click', () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: reduce ? 'auto' : 'smooth'
      });
    });

    update();
  }

  /* ---------- TOOL MODALS (open/close + escape + focus trap-lite) ---------- */
  function initToolModals() {
    const triggers = document.querySelectorAll('[data-modal-target]');
    if (!triggers.length) return;

    let openModal = null;
    let lastFocused = null;

    function open(modal) {
      if (!modal) return;
      if (openModal) close(openModal);
      openModal = modal;
      lastFocused = document.activeElement;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('tool-modal-open');
      // Focus the close button for keyboard users
      const closer = modal.querySelector('.tool-modal__close');
      if (closer) {
        try { closer.focus({ preventScroll: true }); } catch (_) { closer.focus(); }
      }
    }

    function close(modal) {
      const target = modal || openModal;
      if (!target) return;
      target.classList.remove('is-open');
      target.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('tool-modal-open');
      if (lastFocused && typeof lastFocused.focus === 'function') {
        try { lastFocused.focus({ preventScroll: true }); } catch (_) { lastFocused.focus(); }
      }
      openModal = null;
      lastFocused = null;
    }

    triggers.forEach((t) => {
      t.addEventListener('click', (e) => {
        e.preventDefault();
        const id = t.getAttribute('data-modal-target');
        const modal = document.getElementById(id);
        open(modal);
      });
    });

    // Close on overlay or close-button click (any element with [data-modal-close])
    document.querySelectorAll('.tool-modal').forEach((m) => {
      m.setAttribute('aria-hidden', 'true');
      m.querySelectorAll('[data-modal-close]').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          close(m);
        });
      });
    });

    // Escape closes any open modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && openModal) close(openModal);
    });
  }

  /* ---------- SCROLL PROGRESS BAR ---------- */
  function initScrollProgress() {
    if (document.querySelector('.scroll-progress')) return;
    const wrap = document.createElement('div');
    wrap.className = 'scroll-progress';
    wrap.setAttribute('aria-hidden', 'true');
    const bar = document.createElement('div');
    bar.className = 'scroll-progress__bar';
    wrap.appendChild(bar);
    document.body.appendChild(wrap);

    let ticking = false;
    function update() {
      const h = document.documentElement;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      const pct = Math.min(100, Math.max(0, (h.scrollTop / max) * 100));
      bar.style.width = pct + '%';
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------- INIT ---------- */
  function init() {
    generateParticles();
    rebuild(PT.symbol, PT.tf);    // Seed shared state once
    initProDesktop();
    initProMobile();
    initProFlow();
    initHeader();
    initCounters();
    initTicker();
    initLiveStats();
    initLstatsCharts();
    initLstatsSlider();
    initRegulators();
    initProductsSlider();
    initTiersSlider();
    initAwardsMarquee();
    initToolModals();
    initPartnersStats();
    initBackToTop();
    initSmoothScroll();
    initReveal();
    initMobileNav();
    initLatency();
    initScrollProgress();

    // Re-render terminal labels when language changes
    document.addEventListener('lang:changed', function(){
      try {
        PT.listeners.symbol.forEach(function(fn){ fn(PT.symbol); });
      } catch(e){}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
