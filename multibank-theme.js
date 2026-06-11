(function(){

  window.refreshNotificationsData = window.refreshNotificationsData || function(){ return Promise.resolve([]); };
  window.notificationsUnreadCount = window.notificationsUnreadCount || function(){ return 0; };
  window.markNotificationsSeen = window.markNotificationsSeen || function(){};

  function safeT(key, fallback){
    try{
      const v = state && typeof state.t === 'function' ? state.t(key) : '';
      return (v && v !== key) ? v : fallback;
    }catch(e){ return fallback; }
  }

  function vpTr(en, ar, ru){
    try{
      return typeof tr === 'function' ? tr(en, ar, ru) : ((state && state.lang==='ar') ? ar : ((state && state.lang==='ru') ? ru : en));
    }catch(e){
      return (state && state.lang==='ar') ? ar : ((state && state.lang==='ru') ? ru : en);
    }
  }

  function vpSignalPriceDecimals(v){
    const n = Number(v || 0);
    return n > 0 && n < 1 ? 6 : 2;
  }

  function vpUpdateSignalCardLive(binding, live){
    if(!binding) return;
    const fallbackEntry = Number(binding?.sig?.entry || 0) || 0;
    const p = Number(live?.price || 0) || 0;
    const ch = Number(live?.changePct ?? live?.change_pct ?? 0);
    if(binding.priceEl) binding.priceEl.textContent = p > 0 ? money(p, vpSignalPriceDecimals(p)) : '—';
    if(binding.changeEl){
      binding.changeEl.textContent = p > 0 ? `${ch > 0 ? '+' : ''}${fmt(ch, 2)}%` : vpTr('Awaiting live feed','بانتظار السعر الحي','Ожидание живой цены');
      binding.changeEl.classList.toggle('up', p > 0 && ch > 0);
      binding.changeEl.classList.toggle('down', p > 0 && ch < 0);
    }
    if(binding.sourceEl){
      binding.sourceEl.textContent = p > 0 ? (live?.source ? `${vpTr('Live','لايف','Live')} • ${live.source}` : vpTr('Live feed','تغذية حية','Живой поток')) : vpTr('Waiting feed','بانتظار التغذية','Ожидание потока');
      binding.sourceEl.classList.toggle('is-live', p > 0);
      binding.sourceEl.classList.toggle('is-waiting', !(p > 0));
    }
    if(binding.noteEl){
      binding.noteEl.textContent = p > 0
        ? (live?.source ? `${vpTr('Source','المصدر','Источник')}: ${live.source}` : vpTr('Primary live quote','السعر الحي الأساسي','Основная живая цена'))
        : (fallbackEntry > 0 ? vpTr('Fallback to entry until live feed arrives','استخدام سعر الدخول لحين وصول السعر الحي','Цена входа используется до прихода живой цены') : vpTr('Live quote will appear as soon as the market feed answers.','سيظهر السعر الحي بمجرد استجابة مزود السوق.','Живая цена появится, как только ответит поток рынка.'));
    }
    if(binding.historyPriceEl){
      binding.historyPriceEl.textContent = p > 0 ? money(p, vpSignalPriceDecimals(p)) : '—';
      binding.historyPriceEl.classList.toggle('up', p > 0 && ch > 0);
      binding.historyPriceEl.classList.toggle('down', p > 0 && ch < 0);
    }
    if(binding.historySourceEl){
      binding.historySourceEl.textContent = p > 0 ? (live?.source ? `${vpTr('Live','لايف','Live')} • ${live.source}` : vpTr('Live feed','تغذية حية','Живой поток')) : vpTr('Waiting for feed','بانتظار التغذية','Ожидание потока');
    }
    if(binding.entryHintEl){
      const entry = Number(binding?.sig?.entry || 0);
      if(p > 0 && entry > 0){
        const diff = ((p - entry) / entry) * 100;
        binding.entryHintEl.textContent = `${vpTr('Vs entry','مقارنة بالدخول','От входа')}: ${diff > 0 ? '+' : ''}${fmt(diff, 2)}%`;
        binding.entryHintEl.classList.toggle('up', diff > 0);
        binding.entryHintEl.classList.toggle('down', diff < 0);
      } else {
        binding.entryHintEl.textContent = vpTr('Awaiting live feed','بانتظار تغذية السوق','Ожидание потока');
        binding.entryHintEl.classList.remove('up','down');
      }
    }
    try{
      if(p > 0 && typeof vpRememberLiveQuote === 'function'){
        vpRememberLiveQuote({ symbol: binding.symbol, type: binding.type, price: p, change_pct: ch, source: String(live?.source || '').trim(), updated_at: Math.floor(Date.now()/1000) });
      }
    }catch(e){}
  }
  try{ if(typeof window.updateSignalCardLive !== 'function') window.updateSignalCardLive = vpUpdateSignalCardLive; }catch(e){}

  function refreshTradingBotSignals(force=false){
    const now = Date.now();
    const ttl = Number(state.__tradingBotSignalsTtl || 0) || 12000;
    if(!force && Array.isArray(state.tradingBotSignals) && (now - Number(state.__tradingBotSignalsAt || 0)) < ttl) return Promise.resolve(state.tradingBotSignals);
    if(state.__tradingBotSignalsInflight) return state.__tradingBotSignalsInflight;
    const lang = encodeURIComponent(state.lang || 'en');
    const paths = [
      `/signals.php?bot=1&lang=${lang}`,
      `/signals.php?bot=1&home=1&lang=${lang}`,
      `/signals.php?home=1&lang=${lang}`,
      `/signals.php?lang=${lang}`
    ];
    const fallbackFromSubs = (subs)=>{
      const list = Array.isArray(subs) ? subs : [];
      const mapped = list.map(item=>({
        id: Number(item.signal_id || item.id || 0),
        symbol: String(item.market_symbol || item.symbol || item.bot_name || 'Signal').trim(),
        type: String(item.market_type || item.type || 'crypto').trim(),
        timeframe: String(item.timeframe || item.tf || '').trim(),
        direction: String(item.direction || item.side || 'BUY').trim(),
        entry: item.entry_price != null ? Number(item.entry_price) : (item.entry != null ? Number(item.entry) : null),
        sl: item.stop_loss != null ? Number(item.stop_loss) : (item.sl != null ? Number(item.sl) : null),
        tp1: item.take_profit_1 != null ? Number(item.take_profit_1) : (item.tp1 != null ? Number(item.tp1) : null),
        tp2: item.take_profit_2 != null ? Number(item.take_profit_2) : (item.tp2 != null ? Number(item.tp2) : null),
        bot_name: String(item.bot_name || item.market_symbol || item.symbol || '').trim(),
        bot_brief: String(item.bot_brief || item.note || '').trim(),
        note: String(item.note || item.bot_brief || '').trim(),
        copy_min_amount: Number(item.reserved_amount || item.copy_min_amount || item.amount || 100),
        copy_profit_share_pct: Number(item.profit_share_pct || item.copy_profit_share_pct || 0),
        copy_leverage: Number(item.copy_leverage || item.leverage || 1),
        subscribers: Number(item.subscribers || 1),
        source: String(item.source || '').trim(),
        status_hint: String(item.status || item.position_status || '').trim(),
        __fallback: true,
      })).filter(item=>item.id || item.symbol);
      const seen = new Set();
      return mapped.filter(item=>{
        const key = `${item.id}:${item.symbol}`;
        if(seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const load = async()=>{
      let lastItems = [];
      try{
        const settled = await Promise.allSettled(paths.map(path=>api(path, { timeoutMs: 4200 })));
        for(const result of settled){
          if(result.status !== 'fulfilled') continue;
          const items = Array.isArray(result.value?.items) ? result.value.items.filter(Boolean) : [];
          if(items.length) return items;
          lastItems = items;
        }
      }catch(e){}
      try{
        const subsResp = await api(`/trading_bot/my.php?lang=${lang}`, { timeoutMs: 4200 });
        const fallback = fallbackFromSubs(subsResp?.items);
        if(fallback.length) return fallback;
      }catch(e){}
      return lastItems;
    };
    state.__tradingBotSignalsInflight = load()
      .then(async(items)=>{
        let nextItems = Array.isArray(items) ? items : [];
        try{
          if(typeof window.enrichSignalsLiveQuotes === 'function') nextItems = await window.enrichSignalsLiveQuotes(nextItems, { timeoutMs: 4200 });
        }catch(e){}
        state.tradingBotSignals = Array.isArray(nextItems) ? nextItems : [];
        state.__tradingBotSignalsAt = Date.now();
        state.__tradingBotSignalsTtl = state.tradingBotSignals.length ? 45000 : 5000;
        return state.tradingBotSignals;
      })
      .catch(()=>[])
      .finally(()=>{ state.__tradingBotSignalsInflight = null; });
    return state.__tradingBotSignalsInflight;
  }

  function refreshMyTradingBotSubs(force=false){
    const now = Date.now();
    if(!force && Array.isArray(state.myTradingBotSubs) && (now - Number(state.__myTradingBotSubsAt || 0)) < 20000) return Promise.resolve(state.myTradingBotSubs);
    if(state.__myTradingBotSubsInflight) return state.__myTradingBotSubsInflight;
    state.__myTradingBotSubsInflight = api(`/trading_bot/my.php?lang=${encodeURIComponent(state.lang || 'en')}`)
      .then(r=>{
        state.myTradingBotSubs = Array.isArray(r?.items) ? r.items : [];
        state.__myTradingBotSubsAt = Date.now();
        return state.myTradingBotSubs;
      })
      .catch(()=>[])
      .finally(()=>{ state.__myTradingBotSubsInflight = null; });
    return state.__myTradingBotSubsInflight;
  }

  function refreshDashboardLevelData(force=false){
    const now = Date.now();
    if(!force && state.__dashboardLevelData && (now - Number(state.__dashboardLevelDataAt || 0)) < 30000) return Promise.resolve(state.__dashboardLevelData);
    if(state.__dashboardLevelDataInflight) return state.__dashboardLevelDataInflight;
    state.__dashboardLevelDataInflight = api(`/user/level.php?lang=${encodeURIComponent(state.lang || 'en')}`)
      .then(r=>{
        state.__dashboardLevelData = r || {};
        state.__dashboardLevelDataAt = Date.now();
        return state.__dashboardLevelData;
      })
      .catch(()=> state.__dashboardLevelData || null)
      .finally(()=>{ state.__dashboardLevelDataInflight = null; });
    return state.__dashboardLevelDataInflight;
  }


  function vpSignalTvSymbol(sig){
    try{
      if(typeof window.tvSymbolGuess === 'function') return window.tvSymbolGuess(String(sig?.symbol || ''), vpNormalizeAssetType(sig?.type || 'crypto'));
    }catch(e){}
    const sym = String(sig?.symbol || '').trim().toUpperCase();
    const type = vpNormalizeAssetType(sig?.type || 'crypto');
    const commodityAlias = {
      XAUUSD:'OANDA:XAUUSD', GOLD:'OANDA:XAUUSD', XAGUSD:'OANDA:XAGUSD', SILVER:'OANDA:XAGUSD',
      XPTUSD:'OANDA:XPTUSD', XPDUSD:'OANDA:XPDUSD', USOIL:'TVC:USOIL', UKOIL:'TVC:UKOIL', BRENT:'TVC:UKOIL',
      NGAS:'FX:NGAS', COPPER:'CAPITALCOM:COPPER', GLD:'AMEX:GLD', SLV:'AMEX:SLV'
    };
    if(type === 'crypto') return `BINANCE:${sym}`;
    if(type === 'forex') return `FX:${sym}`;
    if(type === 'stocks') return /^[A-Z]+$/.test(sym) ? `NASDAQ:${sym}` : `NYSE:${sym}`;
    if(type === 'commodities') return commodityAlias[sym] || 'OANDA:XAUUSD';
    return sym;
  }


  function vpSignalTvLocale(){
    return state.lang === 'ar' ? 'ar' : (state.lang === 'ru' ? 'ru' : 'en');
  }


  function vpLevelDisplayName(level, fallbackIndex){
    const rawName = String(level?.name || level?.title || '').trim();
    const code = String(level?.level_code || '').trim();
    const generic = /^(starter|start|مبتدئ|старт|base|basic)$/i.test(rawName) || /^(starter|start|base|basic)$/i.test(code);
    const codeMatch = code.match(/(\d+)/);
    const orderNum = Number(fallbackIndex || 0);
    if(rawName && !generic) return rawName;
    if(orderNum > 0) return `Level ${orderNum}`;
    if(codeMatch && Number(codeMatch[1]) > 0) return `Level ${Number(codeMatch[1])}`;
    if(rawName) return rawName;
    return vpTr('Level 0','المستوى 0','Уровень 0');
  }

  function vpLevelTone(level, fallbackIndex){
    const key = `${String(level?.tone_key || level?.accent_color || '').toLowerCase()} ${vpLevelDisplayName(level, fallbackIndex)}`;
    if(/diamond|violet|purple|royal|3|4|5/.test(key)) return 'violet';
    if(/gold|amber|elite|2/.test(key)) return 'gold';
    if(/emerald|green|pro/.test(key)) return 'emerald';
    return 'cyan';
  }

  function vpLevelPerks(level){
    return String(level?.perks || level?.features || '').split(/\r?\n|•|,/).map(x=>String(x||'').trim()).filter(Boolean).slice(0,5);
  }


  function vpSignalCounts(sig){
    try{
      if(typeof window.signalFeedbackTotals === 'function') return window.signalFeedbackTotals(sig) || {};
    }catch(e){}
    return {
      recommendCount: Math.max(0, Number(sig?.recommend_count || sig?.recommendCount || 0)),
      commentsCount: Math.max(0, Number(sig?.comments_count || sig?.commentsCount || 0)),
    };
  }

  function vpSignalCounters(sig){
    const counts = vpSignalCounts(sig);
    const recommendCount = Math.max(0, Number(counts.recommendCount || 0));
    const commentsCount = Math.max(0, Number(counts.commentsCount || 0));
    return h('div',{class:'mb-signal-counter-row'},
      h('button',{class:'mb-signal-counter-btn ghost', type:'button', onclick:()=>openTradingBotDetails(sig)}, `👍 ${vpTr('Recommend','التوصيات','Рекомендации')} • ${recommendCount}`),
      h('button',{class:'mb-signal-counter-btn ghost', type:'button', onclick:()=>openTradingBotDetails(sig)}, `💬 ${vpTr('Comments','التعليقات','Комментарии')} • ${commentsCount}`)
    );
  }


  function vpMountSignalMiniWidget(host, sig, opts={}){
    if(!host) return;
    const dash = !!opts.dash;
    const compact = opts.compact !== false;
    const direction = String(sig?.direction || 'BUY').toUpperCase();
    const tone = direction === 'SELL' ? 'down' : 'up';
    const label = String(sig?.symbol || '').toUpperCase() || vpTr('Market','السوق','Рынок');
    const sub = instrumentName(sig) || cleanSubtitle(sig) || vpAssetTypeLabel(sig?.type || 'crypto');
    const source = String(sig?.live_source || sig?.source || '').trim() || vpTr('Live quote','سعر حي','Живая цена');
    const initialPrice = Number(sig?.live_price || 0) || 0;
    const initialChange = Number(sig?.live_change_pct || sig?.change_pct || 0) || 0;
    host.innerHTML = '';
    host.appendChild(
      h('div',{class:`mb-signal-quote-shell${compact ? ' compact' : ''}${dash ? ' dash' : ''}`.trim(), 'data-home-live-symbol': label, 'data-home-live-type': vpNormalizeAssetType(sig?.type || 'crypto'), 'data-home-live-market': vpResolveLiveMarketForSymbol(label, vpNormalizeAssetType(sig?.type || 'crypto'), String(sig?.market || sig?.market_type_mode || ((vpNormalizeAssetType(sig?.type || 'crypto') === 'crypto' || vpNormalizeAssetType(sig?.type || 'crypto') === 'futures') ? 'perp' : 'spot')).toLowerCase())},
        h('div',{class:'mb-signal-quote-head'},
          h('div',{class:'mb-signal-quote-ident'},
            vpMarketAvatar(sig, label, dash ? 'sm popular' : 'sm'),
            h('div',{class:'mb-signal-quote-copy'},
              h('div',{class:'mb-signal-quote-symbol'}, label),
              h('div',{class:'mb-signal-quote-sub'}, sub)
            )
          ),
          h('div',{class:'mb-signal-quote-headside'},
            h('span',{class:'mb-signal-quote-pill ' + tone}, direction),
            h('span',{class:'mb-signal-quote-source' + (initialPrice > 0 ? ' is-live' : ' is-waiting'), 'data-signal-live-source':'1'}, initialPrice > 0 ? `${vpTr('Live','لايف','Live')} • ${source}` : vpTr('Waiting feed','بانتظار التغذية','Ожидание потока'))
          )
        ),
        h('div',{class:'mb-signal-quote-main compact-main'},
          h('div',{class:'mb-signal-quote-price', 'data-signal-live-price':'1'}, initialPrice > 0 ? money(initialPrice, vpSignalPriceDecimals(initialPrice)) : '—'),
          h('div',{class:'mb-signal-quote-change', 'data-signal-live-change':'1'}, initialPrice > 0 ? `${initialChange > 0 ? '+' : ''}${fmt(initialChange, 2)}%` : vpTr('Waiting…','بانتظار السعر…','Ожидание…'))
        ),
        h('div',{class:'mb-signal-quote-foot compact-foot'},
          h('div',{class:'mb-signal-quote-note', 'data-signal-live-note':'1'}, initialPrice > 0 ? (sig?.live_source ? `${vpTr('Source','المصدر','Источник')}: ${sig.live_source}` : vpTr('Primary live quote','السعر الحي الأساسي','Основная живая цена')) : vpTr('Live quote will appear as soon as the market feed answers.','سيظهر السعر الحي بمجرد استجابة مزود السوق.','Живая цена появится, как только ответит поток рынка.')),
          h('div',{class:'mb-signal-quote-entryhint', 'data-signal-entry-hint':'1'}, vpTr('Vs entry','مقارنة بالدخول','От входа'))
        )
      )
    );
  }

  
function vpBuildSignalDashboardCard(sig, sub){
    const copied = !!(sub && ['armed','copied','active','open'].includes(String(sub.status || sub.position_status || '').toLowerCase()));
    const direction = String(sig.direction || 'BUY').toUpperCase();
    const tone = direction === 'SELL' ? 'down' : 'up';
    const meta = `${String(sig.timeframe || '')}${sig.timeframe ? ' • ' : ''}${vpAssetTypeLabel(sig.type)}${sig.bot_name ? ' • ' + String(sig.bot_name) : ''}`;
    const brief = String(sig.bot_brief || sig.note || vpTr('Admin trade idea','صفقة من الإدارة','Сделка от администратора')).trim();
    const widgetHost = h('div',{class:'mb-signal-widget-shell premium quote-only compact dash', 'data-signal-tv-canvas':'1'});
    const card = h('div',{class:'mb-home-signal-card premium'},
      h('div',{class:'mb-home-signal-head premium'},
        h('div',{class:'mb-home-signal-headcopy'},
          h('div',{class:'mb-home-signal-title'}, String(sig.symbol || sig.bot_name || 'Signal')),
          h('div',{class:'mb-home-signal-sub'}, meta || vpTr('Platform signal','إشارة منصة','Сигнал платформы'))
        ),
        h('span',{class:'badge ' + tone}, copied ? vpTr('Copied','منسوخة','Скопирована') : direction)
      ),
      widgetHost,
      h('div',{class:'mb-home-signal-metrics'},
        h('div',{class:'mb-home-signal-metric'}, h('span',{}, vpTr('Entry','الدخول','Вход')), h('strong',{}, sig.entry ? money(sig.entry, vpSignalPriceDecimals(sig.entry)) : '—')),
        h('div',{class:'mb-home-signal-metric'}, h('span',{}, vpTr('Minimum','الحد الأدنى','Минимум')), h('strong',{}, money(Number(sig.copy_min_amount || 0), 0)))
      ),
      vpSignalCounters(sig),
      h('div',{class:'mb-home-signal-note'}, brief),
      h('div',{class:'mb-home-signal-actions'},
        h('button',{class:'btn outline small', type:'button', onclick:()=>openTradingBotDetails(sig)}, vpTr('Details','التفاصيل','Подробнее')),
        h('button',{class:'btn primary small', type:'button', onclick:()=>openTradingBotCopyDialog(sig)}, copied ? vpTr('Manage','إدارة','Управлять') : vpTr('Copy','نسخ','Копировать'))
      )
    );
    try{ vpMountSignalMiniWidget(widgetHost, sig, {dash:true, compact:true}); }catch(e){}
    try{ attachSignalLiveCard(card, sig); }catch(e){}
    return card;
  }

  function vpTradingBotCards(){
    const my = Array.isArray(state.myTradingBotSubs) ? state.myTradingBotSubs : [];
    const signalList = Array.isArray(state.tradingBotSignals) ? state.tradingBotSignals.slice() : [];
    const fallbackFromSubs = (!signalList.length && my.length)
      ? my.slice(0,4).map(item=>({
          id: Number(item.signal_id || item.id || 0),
          symbol: item.symbol,
          type: item.type,
          timeframe: item.timeframe,
          direction: item.direction,
          entry: item.entry,
          sl: item.sl,
          tp1: item.tp1,
          tp2: item.tp2,
          copy_min_amount: Number(item.reserved_amount || 0),
          copy_profit_share_pct: Number(item.profit_share_pct || 0),
          subscribers: 1,
          bot_brief: item.bot_brief,
          status_hint: item.status || item.position_status || ''
        }))
      : [];
    const signals = (signalList.length ? signalList : fallbackFromSubs).slice(0,4);
    const mine = new Map(my.map(item=>[Number(item.signal_id || 0), item]));
    if(!signals.length){
      if(!state.__tradingBotSignalsInflight){
        setTimeout(()=>{ try{ refreshTradingBotSignals(true).then(()=>render()).catch(()=>{}); }catch(e){} }, 0);
      }
      return [h('div',{class:'mb-bot-empty'},
        h('div',{class:'mb-empty-ico'}, state.__tradingBotSignalsInflight ? '◌' : '◎'),
        h('div',{class:'mb-empty-title'}, state.__tradingBotSignalsInflight ? vpTr('Loading signal desk…','جاري تحميل منصة الإشارات…','Загрузка сигнального стола…') : vpTr('No signal desk opportunities are live yet','لا توجد فرص نسخ نشطة حالياً','Пока нет активных сигналов для копирования')),
        h('div',{class:'mb-side-row-sub'}, state.__tradingBotSignalsInflight ? vpTr('Checking the latest admin signals for the dashboard.','جارٍ التحقق من أحدث صفقات الأدمن للداشبورد.','Проверяем последние сигналы администратора для панели.') : vpTr('Publish a desk signal from admin to expose it here on the dashboard.','انشر إشارة من لوحة الإدارة لتظهر هنا في الداشبورد.','Опубликуйте сигнал из админки, чтобы он появился здесь.'))
      )];
    }
    const grid = h('div',{class:'mb-home-signal-grid mb-home-signal-scroll'});
    signals.forEach(sig=>{
      try{ grid.appendChild(vpBuildSignalDashboardCard(sig, mine.get(Number(sig.id || 0)))); }catch(err){}
    });
    if(!grid.childNodes.length){
      return [h('div',{class:'mb-bot-empty'},
        h('div',{class:'mb-empty-ico'}, '◌'),
        h('div',{class:'mb-empty-title'}, vpTr('Signal desk is refreshing…','منصة الإشارات قيد التحديث…','Сигнальный стол обновляется…')),
        h('div',{class:'mb-side-row-sub'}, vpTr('Try opening the page again in a moment.','أعد فتح الصفحة بعد لحظات.','Откройте страницу снова через несколько секунд.'))
      )];
    }
    return [grid];
  }


  function vpSafeNode(factory, fallback){
    try{ return factory(); }catch(err){ return fallback || h('div',{class:'card mb-empty-box'}, h('div',{class:'mb-empty-title'}, vpTr('Section unavailable','القسم غير متاح مؤقتًا','Раздел временно недоступен'))); }
  }

  function vpTradingBotCard(){
    const demoLocked = String(state.tradeMode || 'demo').toLowerCase() !== 'real';
    const body = h('div',{class:'mb-home-signal-desk-body' + (demoLocked ? ' is-demo-locked' : ''), 'data-home-signal-desk-body':'1'}, ...vpTradingBotCards());
    const overlay = demoLocked ? h('div',{class:'mb-home-signal-desk-lock'},
      h('div',{class:'mb-home-signal-desk-lock-badge'}, vpTr('Real account only','الحساب الحقيقي فقط','Только реальный счёт')),
      h('div',{class:'mb-home-signal-desk-lock-title'}, vpTr('Copy trading opens after switching to the real account','نسخ الصفقات يتفتح بعد التحويل إلى الحساب الحقيقي','Копитрейдинг открывается после переключения на реальный счёт')),
      h('div',{class:'mb-home-signal-desk-lock-text'}, vpTr('Keep the dashboard preview visible on Demo, then switch to Real when you want to copy the live admin signals.','يمكنك مشاهدة المعاينة من الديمو، ثم التحويل إلى الحقيقي عندما تريد نسخ إشارات الأدمن الحية.','На Demo остаётся только предпросмотр. Переключитесь на real, когда захотите копировать live-сигналы администратора.')),
      h('button',{class:'btn primary small', type:'button', onclick:()=>{ try{ requireRealWorkflowAccess('copy'); }catch(e){} }}, vpTr('Open real access','فتح الحساب الحقيقي','Открыть real-доступ'))
    ) : null;
    return h('div',{class:'card mb-side-card mb-bot-card' + (demoLocked ? ' is-demo-locked' : ''), 'data-home-signal-desk-root':'1'},
      h('div',{class:'mb-side-head'},
        h('div',{class:'mb-card-title'}, vpTr('Signal desk','منصة الإشارات','Сигнальный стол')),
        h('a',{href:'#/trade', class:'mb-side-link'}, vpTr('Open trade','فتح التداول','Открыть торговлю'))
      ),
      h('div',{class:'mb-home-signal-desk-shell'}, body, overlay)
    );
  }

  let vpHomeSignalDeskTimer = null;
  let vpHomeSignalDeskInflight = false;
  const vpStopHomeSignalDesk = ()=>{
    try{ if(vpHomeSignalDeskTimer) clearInterval(vpHomeSignalDeskTimer); }catch(e){}
    vpHomeSignalDeskTimer = null;
    vpHomeSignalDeskInflight = false;
  };
  async function vpPatchHomeSignalDesk(root, force=false){
    if(vpHomeSignalDeskInflight || !root || !root.isConnected) return;
    if(String(location.hash || '#/home').indexOf('#/home') !== 0) return;
    const deskRoot = root.querySelector('[data-home-signal-desk-root]');
    const body = deskRoot ? deskRoot.querySelector('[data-home-signal-desk-body]') : null;
    if(!body) return;
    vpHomeSignalDeskInflight = true;
    try{
      await Promise.allSettled([
        refreshTradingBotSignals(!!force),
        refreshMyTradingBotSubs(!!force)
      ]);
      if(!body.isConnected) return;
      clearSignalLive();
      body.replaceChildren(...vpTradingBotCards());
    }catch(e){}
    finally{ vpHomeSignalDeskInflight = false; }
  }
  function vpStartHomeSignalDesk(root){
    vpStopHomeSignalDesk();
    if(!root) return;
    Promise.resolve().then(()=>vpPatchHomeSignalDesk(root, false));
    const every = vpIsMobile() ? 8000 : 10000;
    vpHomeSignalDeskTimer = setInterval(()=>{ try{ vpPatchHomeSignalDesk(root, true); }catch(e){} }, every);
    onCleanup(vpStopHomeSignalDesk);
  }


  function vpAssetTypeLabel(type){
    const kind = vpNormalizeAssetType(type || '');
    if(kind === 'forex') return vpLang4('Forex','الفوركس','Форекс','फॉरेक्स');
    if(kind === 'stocks') return vpLang4('Stocks','الأسهم','Акции','स्टॉक्स');
    if(kind === 'commodities') return vpLang4('Commodities','السلع','Товары','कमोडिटीज');
    return vpLang4('Crypto','الكريبتو','Крипто','क्रिप्टो');
  }

  function vpBalanceChipText(mode, amount){
    return `${vpLang4('Balance','الرصيد','Баланс','बैलेंस')} ${money(amount, 2)}`;
  }

  function mbLanguageChoices(){
    return [
      ['en','English','us','🇺🇸'],
      ['ar','العربية','ae','🇦🇪'],
      ['ru','Русский','ru','🇷🇺'],
      ['hi','हिन्दी','in','🇮🇳']
    ];
  }

  function mbLanguageOptionNodes(selected){
    return mbLanguageChoices().map(([value,label,flag,emoji])=>h('option',{value, selected: selected===value}, `${emoji} ${label}`));
  }

  function mbFlagNode(code, cls=''){
    return h('span',{class:`vp-flag ${code||'us'} ${cls}`.trim(),'aria-hidden':'true'});
  }

  function mbLanguageMenuNode(selected, cls=''){
    const current = mbLanguageChoices().find(([value])=>value===selected) || mbLanguageChoices()[0];
    const menu = h('details',{class:'vp-lang-menu ' + (cls || '')});
    const summary = h('summary',{class:'vp-lang-trigger', role:'button'},
      mbFlagNode(current[2],'vp-lang-flag'),
      h('span',{class:'vp-lang-name'}, current[1]),
      h('span',{class:'vp-lang-caret','aria-hidden':'true'}, '▾')
    );
    const panel = h('div',{class:'vp-lang-pop'});
    mbLanguageChoices().forEach(([value,label,flag])=>{
      panel.appendChild(h('button',{
        class:'vp-lang-opt ' + (selected===value ? 'active' : ''),
        type:'button',
        onclick:(e)=>{ e.preventDefault(); state.lang = value; localStorage.setItem('lang', state.lang); try{ menu.open = false; }catch(_e){} boot(); }
      }, mbFlagNode(flag,'vp-lang-opt-flag'), h('span',{class:'vp-lang-opt-label'}, label)));
    });
    menu.append(summary,panel);
    return menu;
  }


  function liveAccount(){
    const me = (state && state.me) || {};
    return me.live_account || me.accounts?.live || null;
  }

  function demoAccount(){
    const me = (state && state.me) || {};
    return me.demo_account || me.accounts?.demo || null;
  }

  function accountForMode(mode){
    return String(mode || '').toLowerCase() === 'demo' ? demoAccount() : liveAccount();
  }

  function accountNo(mode){
    const me = (state && state.me) || {};
    const acc = accountForMode(mode || 'live');
    return String(acc?.account_no || me.uid || me.id || me.telegram_id || '90447780');
  }

  function accNo(){
    return accountNo('live');
  }

  function accountLabel(mode){
    const acc = accountForMode(mode || 'live');
    return String(acc?.label || (String(mode).toLowerCase()==='demo' ? 'Demo' : 'Standard'));
  }

  function accountStatus(mode){
    const acc = accountForMode(mode || 'live');
    return String(acc?.status || 'active');
  }

  function userName(){
    const me = (state && state.me) || {};
    return String(
      me.name ||
      (((me.first_name || me.telegram_first_name || '') + ' ' + (me.last_name || '')).trim()) ||
      me.telegram_username ||
      'Trader'
    );
  }

  function modeLabel(mode){
    return mode === 'real' ? safeT('trade.mode_real', 'Standard') : safeT('trade.mode_demo', 'Demo');
  }

  function vpNum(val, fallback=0){
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }

  function portfolioSnapshot(mode){
    mode = mode === 'real' ? 'real' : 'demo';
    const pf = mode === 'real' ? (state.realPortfolio || {}) : (state.portfolio || {});
    const ws = (state.walletSummary && state.walletSummary.ok) ? state.walletSummary : {};
    const cur = mode === 'real'
      ? String((ws.real && ws.real.currency) || 'USDT').toUpperCase()
      : String((ws.demo && ws.demo.currency) || 'USDT_DEMO').toUpperCase();
    const walletBag = (pf && pf.wallet && typeof pf.wallet === 'object') ? pf.wallet : {};
    const wallet = mode === 'real'
      ? (walletBag[cur] || walletBag.USDT || {})
      : (walletBag[cur] || walletBag.USDT_DEMO || {});
    const walletSummaryNode = mode === 'real' ? (ws.real || {}) : (ws.demo || {});
    const walletBalance = vpNum(wallet.balance, 0);
    const walletAvailable = vpNum(wallet.available, walletBalance);
    const summaryBalance = vpNum(walletSummaryNode.balance, walletBalance);
    const summaryAvailable = vpNum(walletSummaryNode.available, walletAvailable);
    const balanceCash = summaryBalance > 0 ? summaryBalance : walletBalance;
    const availableCash = summaryAvailable > 0 ? summaryAvailable : walletAvailable;
    const positions = Array.isArray(pf.positions) ? pf.positions.filter(p=>String(p.status||'open').toLowerCase()==='open') : [];
    const margin = positions.reduce((acc, pos)=>{
      const mt = String(pos.market_type || 'spot').toLowerCase();
      const qty = Math.abs(Number(pos.qty || 0));
      const entry = Number(pos.entry_price || 0);
      const lev = Math.max(1, Number(pos.leverage || 1));
      const locked = Number(pos.margin_initial || 0);
      if(mt === 'perp') return acc + (locked > 0 ? locked : ((qty * entry) / lev));
      return acc + (locked > 0 ? locked : (qty * entry));
    }, 0);
    const investUsed = Number(pf.invest_in_use || 0);
    const inUse = Math.max(0, margin + investUsed);
    const unreal = Number(pf.unrealized_pnl || 0);
    const realized = Number(pf.realized_pnl || 0);
    const equity = Math.max(0, balanceCash + unreal);
    const freeMargin = Math.max(0, availableCash);
    return {
      pf,
      cur,
      wallet,
      positions,
      balanceCash,
      availableCash,
      displayAvailable: availableCash,
      margin,
      inUse,
      unreal,
      realized,
      equity,
      freeMargin,
      pnl: realized + unreal,
      marginLevel: margin > 0 ? (((availableCash + unreal) / margin) * 100) : 0,
      leverage: positions.length ? Math.max.apply(null, positions.map(p=>Math.max(1, Number(p.leverage || 1)))) : 500
    };
  }

  function knownMarketItems(preferredType){
    const merged = [];
    const seen = new Set();
    const normalizeType = (value)=>{
      try{ return vpNormalizeAssetType(value || 'crypto'); }catch(e){ return String(value || 'crypto').toLowerCase(); }
    };
    const push = (items)=>{
      if(!Array.isArray(items)) return;
      items.forEach(item=>{
        const sym = String(item?.symbol || '').toUpperCase();
        const itemType = normalizeType(item?.type || item?.asset_type || preferredType || state.selectedAssetType || 'crypto');
        const key = `${itemType}:${sym}`;
        if(!sym || seen.has(key)) return;
        seen.add(key);
        merged.push(Object.assign({}, item, {symbol:sym, type:itemType}));
      });
    };
    push(state.__vpHomeMarketPool);
    push(Array.isArray(state.markets) ? state.markets : []);
    const wanted = normalizeType(preferredType || state.selectedAssetType || 'crypto');
    const warmTypes = (wanted === 'all' || wanted === 'favorites')
      ? ['crypto','forex','stocks','arab','commodities','futures']
      : [wanted, normalizeType(state.selectedAssetType || wanted), 'crypto', 'commodities'];
    warmTypes.filter((v,i,a)=>v && a.indexOf(v)===i).forEach(type=>{
      try{ if(typeof warmMarketsFromLocal === 'function') push(warmMarketsFromLocal(type) || []); }catch(e){}
    });
    return merged;
  }

  function marketItemsByType(type){
    const mapped = String(type || 'all').toLowerCase();
    const items = knownMarketItems(mapped);
    if(mapped === 'all') return items;
    if(mapped === 'metals') return items.filter(x=>['metals','commodities'].includes(String(x.type||'').toLowerCase()));
    if(mapped === 'favorites'){
      const fav = getFavorites();
      return items.filter(x=>fav.includes(String(x.symbol||'').toUpperCase()));
    }
    const normalized = (()=>{ try{ return vpNormalizeAssetType(mapped); }catch(e){ return mapped; } })();
    return items.filter(x=>String(x.type||'').toLowerCase() === normalized);
  }

  function marketBySymbol(symbol){
    const sym = String(symbol || '').toUpperCase();
    if(!sym) return null;
    return knownMarketItems('all').find(x=>String(x.symbol||'').toUpperCase()===sym) || null;
  }

  function marketPrice(item){
    const n = Number(item?.price || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function marketHasLiveQuote(item){
    return marketPrice(item) > 0;
  }

  function marketAgeText(item){
    const ts = Number(item?.updated_at || item?.as_of || 0);
    if(!Number.isFinite(ts) || ts <= 0) return 'Live';
    const now = Math.floor(Date.now() / 1000);
    const age = Math.max(0, now - ts);
    if(age < 10) return 'Live';
    if(age < 60) return `${age}s ago`;
    if(age < 3600) return `${Math.round(age / 60)}m ago`;
    return `${Math.round(age / 3600)}h ago`;
  }

  function marketAgeSec(item){
    const ts = Number(item?.updated_at || item?.as_of || 0);
    if(!Number.isFinite(ts) || ts <= 0) return 0;
    return Math.max(0, Math.floor(Date.now() / 1000) - ts);
  }

  function marketFreshWindowSec(item){
    const type = String(item?.type || item?.asset_type || '').toLowerCase();
    if(type === 'crypto' || type === 'futures') return 18;
    if(type === 'arab') return 45;
    if(type === 'commodities') return 30;
    return 16;
  }

  function marketStatusTone(item){
    return marketAgeSec(item) <= marketFreshWindowSec(item) ? 'status-live' : 'status-stale';
  }

  function marketSourceText(item){
    const raw = String(item?.source || item?.provider || '').trim();
    return raw ? raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
  }

  function vpUpdateSignalCardLive(binding, live){
    if(!binding) return;
    const fallbackEntry = Number(binding?.sig?.entry || 0) || 0;
    const p = Number(live?.price || 0) || 0;
    const ch = Number(live?.changePct ?? live?.change_pct ?? 0);
    const source = String(live?.source || '').trim();
    const updatedAt = Number(live?.updatedAt || live?.updated_at || 0) || 0;
    const freshness = p > 0 ? marketAgeText({ updated_at: updatedAt }) : '';
    const freshWindow = (binding.type === 'crypto' || binding.type === 'futures') ? 18 : 12;
    const ageSec = updatedAt > 0 ? Math.max(0, Math.floor(Date.now() / 1000) - updatedAt) : 0;
    const isFresh = p > 0 && (!(updatedAt > 0) || ageSec <= freshWindow);
    const sourceText = p > 0
      ? (source ? `${freshness || vpTr('Live','Ù„Ø§ÙŠÙ','Live')} â€¢ ${source}` : (freshness || vpTr('Live feed','ØªØºØ°ÙŠØ© Ø­ÙŠØ©','Ð–Ð¸Ð²Ð¾Ð¹ Ð¿Ð¾Ñ‚Ð¾Ðº')))
      : vpTr('Waiting feed','Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„ØªØºØ°ÙŠØ©','ÐžÐ¶Ð¸Ð´Ð°Ð½Ð¸Ðµ Ð¿Ð¾Ñ‚Ð¾ÐºÐ°');
    const noteText = p > 0
      ? (source
          ? `${vpTr('Source','Ø§Ù„Ù…ØµØ¯Ø±','Ð˜ÑÑ‚Ð¾Ñ‡Ð½Ð¸Ðº')}: ${source}${freshness ? ` â€¢ ${freshness}` : ''}`
          : (freshness ? `${vpTr('Feed age','Ø¹Ù…Ø± Ø§Ù„ØªØºØ°ÙŠØ©','Ð’Ð¾Ð·Ñ€Ð°ÑÑ‚ Ð¿Ð¾Ñ‚Ð¾ÐºÐ°')}: ${freshness}` : vpTr('Primary live quote','Ø§Ù„Ø³Ø¹Ø± Ø§Ù„Ø­ÙŠ Ø§Ù„Ø£Ø³Ø§Ø³ÙŠ','ÐžÑÐ½Ð¾Ð²Ð½Ð°Ñ Ð¶Ð¸Ð²Ð°Ñ Ñ†ÐµÐ½Ð°')))
      : (fallbackEntry > 0 ? vpTr('Fallback to entry until live feed arrives','Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø³Ø¹Ø± Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù„Ø­ÙŠÙ† ÙˆØµÙˆÙ„ Ø§Ù„Ø³Ø¹Ø± Ø§Ù„Ø­ÙŠ','Ð¦ÐµÐ½Ð° Ð²Ñ…Ð¾Ð´Ð° Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐµÑ‚ÑÑ Ð´Ð¾ Ð¿Ñ€Ð¸Ñ…Ð¾Ð´Ð° Ð¶Ð¸Ð²Ð¾Ð¹ Ñ†ÐµÐ½Ñ‹') : vpTr('Live quote will appear as soon as the market feed answers.','Ø³ÙŠØ¸Ù‡Ø± Ø§Ù„Ø³Ø¹Ø± Ø§Ù„Ø­ÙŠ Ø¨Ù…Ø¬Ø±Ø¯ Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ù…Ø²ÙˆØ¯ Ø§Ù„Ø³ÙˆÙ‚.','Ð–Ð¸Ð²Ð°Ñ Ñ†ÐµÐ½Ð° Ð¿Ð¾ÑÐ²Ð¸Ñ‚ÑÑ, ÐºÐ°Ðº Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð¾Ñ‚Ð²ÐµÑ‚Ð¸Ñ‚ Ð¿Ð¾Ñ‚Ð¾Ðº Ñ€Ñ‹Ð½ÐºÐ°.'));
    const entry = Number(binding?.sig?.entry || 0);
    const diff = (p > 0 && entry > 0) ? (((p - entry) / entry) * 100) : 0;
    const entryText = (p > 0 && entry > 0)
      ? `${vpTr('Vs entry','Ù…Ù‚Ø§Ø±Ù†Ø© Ø¨Ø§Ù„Ø¯Ø®ÙˆÙ„','ÐžÑ‚ Ð²Ñ…Ð¾Ð´Ð°')}: ${diff > 0 ? '+' : ''}${fmt(diff, 2)}%`
      : vpTr('Awaiting live feed','Ø¨Ø§Ù†ØªØ¸Ø§Ø± ØªØºØ°ÙŠØ© Ø§Ù„Ø³ÙˆÙ‚','ÐžÐ¶Ð¸Ð´Ð°Ð½Ð¸Ðµ Ð¿Ð¾Ñ‚Ð¾ÐºÐ°');
    const nextSig = [p.toFixed(8), ch.toFixed(4), sourceText, noteText, entryText].join('|');
    if(binding.__lastLiveSig === nextSig) return;
    binding.__lastLiveSig = nextSig;
    if(binding.priceEl) binding.priceEl.textContent = p > 0 ? money(p, vpSignalPriceDecimals(p)) : 'â€”';
    if(binding.changeEl){
      binding.changeEl.textContent = p > 0 ? `${ch > 0 ? '+' : ''}${fmt(ch, 2)}%` : vpTr('Awaiting live feed','Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø³Ø¹Ø± Ø§Ù„Ø­ÙŠ','ÐžÐ¶Ð¸Ð´Ð°Ð½Ð¸Ðµ Ð¶Ð¸Ð²Ð¾Ð¹ Ñ†ÐµÐ½Ñ‹');
      binding.changeEl.classList.toggle('up', p > 0 && ch > 0);
      binding.changeEl.classList.toggle('down', p > 0 && ch < 0);
    }
    if(binding.sourceEl){
      binding.sourceEl.textContent = sourceText;
      binding.sourceEl.classList.toggle('is-live', p > 0 && isFresh);
      binding.sourceEl.classList.toggle('is-stale', p > 0 && !isFresh);
      binding.sourceEl.classList.toggle('is-waiting', !(p > 0));
    }
    if(binding.noteEl) binding.noteEl.textContent = noteText;
    if(binding.historyPriceEl){
      binding.historyPriceEl.textContent = p > 0 ? money(p, vpSignalPriceDecimals(p)) : 'â€”';
      binding.historyPriceEl.classList.toggle('up', p > 0 && ch > 0);
      binding.historyPriceEl.classList.toggle('down', p > 0 && ch < 0);
    }
    if(binding.historySourceEl){
      binding.historySourceEl.textContent = p > 0 ? sourceText : vpTr('Waiting for feed','Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„ØªØºØ°ÙŠØ©','ÐžÐ¶Ð¸Ð´Ð°Ð½Ð¸Ðµ Ð¿Ð¾Ñ‚Ð¾ÐºÐ°');
    }
    if(binding.entryHintEl){
      binding.entryHintEl.textContent = entryText;
      if(p > 0 && entry > 0){
        binding.entryHintEl.classList.toggle('up', diff > 0);
        binding.entryHintEl.classList.toggle('down', diff < 0);
      }else{
        binding.entryHintEl.classList.remove('up','down');
      }
    }
    try{
      if(p > 0 && typeof vpRememberLiveQuote === 'function'){
        vpRememberLiveQuote({ symbol: binding.symbol, type: binding.type, price: p, change_pct: ch, source, updated_at: updatedAt || Math.floor(Date.now() / 1000) });
      }
    }catch(e){}
  }

  function vpEpoch(ts){
    if(ts == null || ts === '') return 0;
    const raw = typeof ts === 'string' ? ts.trim() : ts;
    if(raw === '') return 0;
    const num = Number(raw);
    if(Number.isFinite(num) && num > 0){
      return num > 1e12 ? Math.floor(num / 1000) : Math.floor(num);
    }
    const parsed = Date.parse(String(raw));
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed / 1000) : 0;
  }

  function vpFmtDate(ts){
    const epoch = vpEpoch(ts);
    return epoch ? new Date(epoch * 1000).toLocaleString() : '—';
  }

  function hashQueryParams(){
    try{
      return new URLSearchParams(String(location.hash || '').split('?')[1] || '');
    }catch(e){
      return new URLSearchParams();
    }
  }

  function replaceHashQuery(baseHash, params, opts){
    try{
      opts = opts || {};
      const cleanBase = String(baseHash || '#/home').split('?')[0];
      const qs = params && typeof params.toString === 'function' ? params.toString() : '';
      const nextHash = cleanBase + (qs ? ('?' + qs) : '');
      const currentHash = String(location.hash || '');
      if(currentHash === nextHash) return nextHash;
      const currentBase = currentHash.split('?')[0] || '';
      const mode = String(opts.mode || '').toLowerCase();
      const silent = !!opts.silent || mode == 'silent';
      const replaceOnly = !!opts.replace || mode == 'replace';
      if(silent || replaceOnly){
        const url = new URL(window.location.href);
        url.hash = nextHash;
        history.replaceState(null, '', url.toString());
        return nextHash;
      }
      if(currentBase === cleanBase){
        location.hash = nextHash;
      }else{
        const url = new URL(window.location.href);
        url.hash = nextHash;
        history.pushState(null, '', url.toString());
        try{ window.dispatchEvent(new HashChangeEvent('hashchange', {oldURL: window.location.href, newURL: url.toString()})); }catch(_e){ try{ location.hash = nextHash; }catch(__e){} }
      }
      return nextHash;
    }catch(e){
      return '';
    }
  }

  function vpNormalizeTradeType(raw, fallback='crypto'){
    const value = String(raw || '').toLowerCase().trim();
    if(['crypto','forex','stocks','commodities','arab','futures'].includes(value)) return value;
    if(value === 'metals') return 'commodities';
    if(['perp','perpetual'].includes(value)) return 'futures';
    const base = String(fallback || '').toLowerCase().trim();
    if(['crypto','forex','stocks','commodities','arab','futures'].includes(base)) return base;
    if(base === 'metals') return 'commodities';
    return 'crypto';
  }

  function vpNormalizeTradeMarket(type, market='spot', symbol=''){
    const safeType = vpNormalizeTradeType(type, 'crypto');
    let safeMarket = String(market || '').toLowerCase().trim();
    if(!['spot','perp'].includes(safeMarket)) safeMarket = '';
    if(safeType === 'futures') return 'perp';
    if(safeType !== 'crypto') return 'spot';
    safeMarket = safeMarket || 'perp';
    try{
      if(typeof resolveLiveMarketForSymbol === 'function'){
        return String(resolveLiveMarketForSymbol(String(symbol || '').toUpperCase(), safeType, safeMarket) || safeMarket).toLowerCase();
      }
    }catch(e){}
    return safeMarket === 'spot' ? 'spot' : 'perp';
  }

  function vpNormalizeTradeWatch(raw){
    const value = String(raw || '').toLowerCase().trim();
    if(value === 'metals') return 'commodities';
    return ['favorites','all','crypto','futures','forex','stocks','arab','commodities'].includes(value) ? value : '';
  }

  function vpInferTradeType(symbol, fallback='crypto'){
    const sym = String(symbol || '').toUpperCase().trim();
    if(!sym) return vpNormalizeTradeType(fallback, 'crypto');
    try{
      const seed = (typeof resolveTradeSymbolSeed === 'function') ? resolveTradeSymbolSeed(sym, fallback) : null;
      const next = vpNormalizeTradeType(seed && seed.type, '');
      if(next) return next;
    }catch(e){}
    try{
      const row = typeof marketBySymbol === 'function' ? marketBySymbol(sym) : null;
      const next = vpNormalizeTradeType(row && row.type, '');
      if(next) return next;
    }catch(e){}
    try{
      const row = Array.isArray(state.markets) ? state.markets.find(x=>String(x && x.symbol || '').toUpperCase() === sym) : null;
      const next = vpNormalizeTradeType(row && row.type, '');
      if(next) return next;
    }catch(e){}
    return vpNormalizeTradeType(fallback, 'crypto');
  }

  function vpPeekPendingTradeRoute(maxAgeMs){
    try{
      const pending = state.__vpPendingTradeRoute;
      if(!pending || typeof pending !== 'object') return null;
      const age = Math.max(0, Date.now() - Number(pending.ts || 0));
      if(age > Math.max(250, Number(maxAgeMs || 1600))) return null;
      return pending;
    }catch(e){
      return null;
    }
  }


  function vpBuildTradeRouteSnapshot(opts){
    opts = opts || {};
    const q = opts.params instanceof URLSearchParams ? opts.params : hashQueryParams();
    const pending = opts.includePending === false ? null : vpPeekPendingTradeRoute(2200);
    const hashSymbolRaw = String(q.get('symbol') || '').toUpperCase().trim();
    const explicitType = String(q.get('type') || '').toLowerCase().trim();
    const shouldPreferPending = !!(pending && String(location.hash || '').indexOf('#/trade') === 0 && (!hashSymbolRaw || Date.now() < Number(state.__routeSettledUntil || 0)));
    const symbol = String(hashSymbolRaw || (shouldPreferPending ? pending.symbol : '') || localStorage.getItem('tradeSymbol') || state.selectedSymbol || 'BTCUSDT').toUpperCase().trim() || 'BTCUSDT';
    const fallbackType = vpNormalizeTradeType((shouldPreferPending ? pending.type : '') || state.selectedAssetType || localStorage.getItem('marketType') || 'crypto', 'crypto');
    const type = explicitType
      ? vpNormalizeTradeType(explicitType, fallbackType)
      : vpNormalizeTradeType((shouldPreferPending ? pending.type : '') || vpInferTradeType(symbol, fallbackType), fallbackType);
    const market = vpNormalizeTradeMarket(type, q.get('market') || (shouldPreferPending ? pending.market : '') || localStorage.getItem('tradeMarket') || (type === 'crypto' || type === 'futures' ? 'perp' : 'spot'), symbol);
    const watchRaw = String(q.get('watch') || (shouldPreferPending ? pending.watch : '') || state.__vpTradeWatchTab || localStorage.getItem('vp_watch_tab') || '').toLowerCase().trim();
    const watch = vpNormalizeTradeWatch(watchRaw);
    const ticketRaw = String(q.get('ticket') || (shouldPreferPending ? pending.ticket : '') || state.__vpTradeTicketTab || localStorage.getItem('vp_trade_ticket_tab') || 'positions').toLowerCase().trim();
    const ticket = ['positions','orders','history'].includes(ticketRaw) ? ticketRaw : 'positions';
    const search = String(q.get('q') || (shouldPreferPending ? pending.search : '') || state.__vpTradeWatchSearch || '').trim();
    return { symbol, type, market, watch, ticket, search };
  }

  const VPTradeRouteStore = (()=>{
    let current = null;
    const listeners = new Set();

    function applyRouteState(route){
      if(!route) return null;
      const next = {
        symbol: String(route.symbol || 'BTCUSDT').toUpperCase().trim() || 'BTCUSDT',
        type: vpNormalizeTradeType(route.type || 'crypto', 'crypto'),
        market: vpNormalizeTradeMarket(route.type || 'crypto', route.market || 'spot', route.symbol || 'BTCUSDT'),
        watch: vpNormalizeTradeWatch(route.watch || ''),
        ticket: ['positions','orders','history'].includes(String(route.ticket || '').toLowerCase()) ? String(route.ticket || '').toLowerCase() : 'positions',
        search: String(route.search || '').trim()
      };
      try{
        state.selectedSymbol = next.symbol;
        state.selectedAssetType = next.type;
        state.selectedMarketType = next.type;
        state.tradeMarket = next.market;
        state.currentTradeMarket = next.market;
        state.selectedMarket = next.market;
        state.__vpTradeWatchTab = next.watch;
        state.__vpTradeWatchSearch = next.search;
        state.__vpTradeTicketTab = next.ticket;
      }catch(e){}
      try{ localStorage.setItem('marketSymbol', next.symbol); }catch(e){}
      try{ localStorage.setItem('tradeSymbol', next.symbol); }catch(e){}
      try{ localStorage.setItem('marketType', next.type); }catch(e){}
      try{ localStorage.setItem('tradeMarket', next.market); }catch(e){}
      if(next.watch) try{ localStorage.setItem('vp_watch_tab', next.watch); }catch(e){}
      if(next.ticket) try{ localStorage.setItem('vp_trade_ticket_tab', next.ticket); }catch(e){}
      current = next;
      return next;
    }

    function buildHash(route){
      const params = new URLSearchParams();
      params.set('symbol', route.symbol);
      params.set('type', route.type);
      params.set('market', route.market);
      if(route.watch) params.set('watch', route.watch);
      if(route.search) params.set('q', route.search);
      if(route.ticket && route.ticket !== 'positions') params.set('ticket', route.ticket);
      return '#/trade?' + params.toString();
    }

    function notify(meta){
      const snapshot = get();
      listeners.forEach(fn=>{ try{ fn(snapshot, meta || {}); }catch(e){} });
      return snapshot;
    }

    function setRoute(partial, opts){
      partial = partial || {};
      opts = opts || {};
      const base = current || vpBuildTradeRouteSnapshot();
      const route = applyRouteState({
        symbol: partial.symbol || base.symbol,
        type: partial.type || base.type,
        market: partial.market || base.market,
        watch: partial.watch !== undefined ? partial.watch : base.watch,
        ticket: partial.ticket !== undefined ? partial.ticket : base.ticket,
        search: partial.search !== undefined ? partial.search : base.search
      });
      const nextHash = buildHash(route);
      try{ state.__vpPendingTradeRoute = Object.assign({ ts: Date.now() }, route); }catch(e){}
      try{ state.__routeSettledUntil = Date.now() + Math.max(900, Number(opts.settleMs || 1100)); }catch(e){}
      if(opts.writeHash !== false){
        const currentHash = String(location.hash || '');
        if(currentHash !== nextHash){
          try{ replaceHashQuery('#/trade', new URLSearchParams(nextHash.split('?')[1] || '')); }catch(e){ try{ location.hash = nextHash; }catch(_e){} }
        }
      }
      notify({ source: opts.source || 'setRoute', hash: nextHash });
      return route;
    }

    function hydrateFromHash(meta){
      const route = applyRouteState(vpBuildTradeRouteSnapshot({ includePending: true }));
      notify(Object.assign({ source: 'hash' }, meta || {}));
      return route;
    }

    function get(){
      if(current && current.symbol) return Object.assign({}, current);
      return Object.assign({}, applyRouteState(vpBuildTradeRouteSnapshot({ includePending: true })) || vpBuildTradeRouteSnapshot({ includePending: true }));
    }

    function subscribe(fn){
      if(typeof fn !== 'function') return ()=>{};
      listeners.add(fn);
      try{ fn(get(), { source: 'subscribe' }); }catch(e){}
      return ()=>{ try{ listeners.delete(fn); }catch(e){} };
    }

    return { get, setRoute, hydrateFromHash, subscribe, buildHash };
  })();
  try{ window.VPTradeRouteStore = VPTradeRouteStore; }catch(_e){}
  try{ VPTradeRouteStore.hydrateFromHash({ source:'boot' }); }catch(_e){}
  try{ window.addEventListener('hashchange', ()=>{ try{ VPTradeRouteStore.hydrateFromHash({ source:'hashchange' }); }catch(_e){}; }, {passive:true}); }catch(_e){}

  function vpReadTradeRouteState(){
    try{
      if(window.VPTradeRouteStore && typeof window.VPTradeRouteStore.get === 'function'){
        return window.VPTradeRouteStore.get();
      }
    }catch(e){}
    return vpBuildTradeRouteSnapshot({ includePending: true });
  }

  function vpCommitTradeRoute(partial, opts){
    partial = partial || {};
    opts = opts || {};
    try{
      if(window.VPTradeRouteStore && typeof window.VPTradeRouteStore.setRoute === 'function'){
        return window.VPTradeRouteStore.setRoute(partial, opts);
      }
    }catch(e){}
    return vpBuildTradeRouteSnapshot({ includePending: true });
  }
  try{ window.vpCommitTradeRoute = vpCommitTradeRoute; }catch(_e){}

  function vpApplyTradeSelection(item, opts){
    opts = opts || {};
    if(!item) return false;
    const base = vpReadTradeRouteState();
    const nextSymbol = String(item.symbol || base.symbol || state.selectedSymbol || 'BTCUSDT').toUpperCase().trim() || 'BTCUSDT';
    const nextType = vpNormalizeTradeType(item.type || base.type || state.selectedAssetType || 'crypto', 'crypto');
    const nextMarket = vpNormalizeTradeMarket(nextType, opts.market || base.market || localStorage.getItem('tradeMarket') || (nextType === 'crypto' || nextType === 'futures' ? 'perp' : 'spot'), nextSymbol);
    const nextWatch = vpNormalizeTradeWatch(opts.watchTab !== undefined ? opts.watchTab : (base.watch || state.__vpTradeWatchTab || localStorage.getItem('vp_watch_tab') || ''));
    const nextTicket = ['positions','orders','history'].includes(String(base.ticket || state.__vpTradeTicketTab || localStorage.getItem('vp_trade_ticket_tab') || 'positions').toLowerCase())
      ? String(base.ticket || state.__vpTradeTicketTab || localStorage.getItem('vp_trade_ticket_tab') || 'positions').toLowerCase()
      : 'positions';
    const nextSearch = String((opts.search !== undefined) ? opts.search : (base.search || state.__vpTradeWatchSearch || '')).trim();
    try{
      state.__tradeSeedQuote = {
        symbol: nextSymbol,
        type: nextType,
        market: nextMarket,
        price: Number(item.price || 0),
        change_pct: Number(item.change_pct ?? 0),
        updated_at: Number(item.updated_at || 0) || 0,
        source: String(item.source || item.provider || 'selection_seed').toLowerCase()
      };
    }catch(e){}
    try{ vpCommitTradeRoute({ symbol: nextSymbol, type: nextType, market: nextMarket, watch: nextWatch, ticket: nextTicket, search: nextSearch }, { source:'selection', settleMs: 1400 }); }catch(e){}
    try{
      if(state.__vpTradeSelectionRenderTimer) clearTimeout(state.__vpTradeSelectionRenderTimer);
      state.__vpTradeSelectionRenderTimer = setTimeout(()=>{
        try{
          if(typeof requestRender === 'function') requestRender(true);
          else if(typeof render === 'function') render(true);
        }catch(err){
          try{ if(typeof render === 'function') render(true); }catch(_err){}
        }
      }, 80);
    }catch(e){
      try{ if(typeof render === 'function') render(true); }catch(_e){}
    }
    return true;
  }
  try{ window.vpApplyTradeSelection = vpApplyTradeSelection; }catch(_e){}


  function fundingStatusTone(status){
    const v = String(status || '').toLowerCase();
    if(['approved','completed','confirmed','done','active'].includes(v)) return 'up';
    if(['rejected','cancelled','failed','blocked'].includes(v)) return 'down';
    if(['pending','review','requested','processing'].includes(v)) return 'warn';
    return '';
  }

  function fundingStatusLabel(status){
    const v = String(status || '').toLowerCase();
    if(!v) return 'Not started';
    return v.replace(/_/g, ' ');
  }

  function curatedMarketRows(type, opts){
    opts = opts || {};
    const limit = Math.max(1, Number(opts.limit || 999));
    const allowZeroChange = !!opts.allowZeroChange;
    const preferSignals = !!opts.preferSignals;
    const rows = marketItemsByType(type)
      .filter(Boolean)
      .filter(item=>marketHasLiveQuote(item))
      .filter(item=>allowZeroChange ? true : Number.isFinite(Number(item?.change_pct || 0)));

    rows.sort((a,b)=>{
      const aSig = Number(a?.signal_count || 0), bSig = Number(b?.signal_count || 0);
      const aFav = getFavorites().includes(String(a?.symbol || '').toUpperCase()) ? 1 : 0;
      const bFav = getFavorites().includes(String(b?.symbol || '').toUpperCase()) ? 1 : 0;
      const aCh = Math.abs(Number(a?.change_pct || 0));
      const bCh = Math.abs(Number(b?.change_pct || 0));
      const aUp = Number(a?.updated_at || a?.as_of || 0);
      const bUp = Number(b?.updated_at || b?.as_of || 0);
      if(preferSignals) return bSig - aSig || bFav - aFav || bCh - aCh || bUp - aUp;
      return bFav - aFav || bCh - aCh || bSig - aSig || bUp - aUp;
    });

    const seen = new Set();
    const out = [];
    for(const item of rows){
      const sym = String(item?.symbol || '').toUpperCase();
      if(!sym || seen.has(sym)) continue;
      seen.add(sym);
      out.push(item);
      if(out.length >= limit) break;
    }
    return out;
  }

  function marketPulseMetric(type, label){
    const rows = curatedMarketRows(type, {limit: 18, allowZeroChange: true});
    const leader = rows.slice().sort((a,b)=>Math.abs(Number(b?.change_pct || 0)) - Math.abs(Number(a?.change_pct || 0)))[0] || null;
    const signals = rows.reduce((acc,item)=>acc + Number(item?.signal_count || 0), 0);
    return h('button',{class:'mb-pulse-card', onclick:()=>openTradeType(type)},
      h('div',{class:'mb-pulse-top'},
        h('div',{class:'mb-pulse-k'}, label),
        h('span',{class:'pill'}, String(rows.length))
      ),
      h('div',{class:'mb-pulse-v'}, leader ? String(leader.symbol || '—') : '—'),
      h('div',{class:'mb-pulse-sub'}, leader ? `${percentText(leader.change_pct)} • ${money(leader.price, marketPrice(leader) < 1 ? 4 : 2)}` : 'Waiting for quotes'),
      h('div',{class:'mb-pulse-foot'}, signals > 0 ? `${signals} signals` : marketAgeText(leader))
    );
  }

  function instrumentName(item){
    return String(item?.name || item?.symbol || '—');
  }

  const VP_ARAB_COMMON_NAMES = {
    '2222':'Saudi Aramco',
    '1120':'Al Rajhi Bank',
    '2010':'SABIC',
    '7010':'stc',
    '1211':'Maaden',
    '1180':'SNB',
    '2310':'Sipchem',
    '2280':'Almarai',
    '4200':'Aldrees',
    '2380':'Petro Rabigh',
    '2080':'Kayan',
    '2330':'Advanced',
    '2350':'Saudi Kayan',
    '1210':'Bechem',
    '1010':'Riyad Bank',
    '1020':'Bank Aljazira',
    '1030':'Saudi Investment Bank',
    '1050':'BSF',
    '1060':'SAIB',
    '1080':'ANB',
    '1140':'Bank Albilad',
    '1150':'Alinma Bank',
    '1810':'Seera',
    '1830':'Saudi Human Resources',
    '4190':'Jarir',
    '4002':'Mouwasat',
    '4013':'Dr. Sulaiman Al Habib',
    '4004':'Dallah Healthcare',
    '4070':'Tihama'
  };

  function vpArabCommonName(symbol, fallback=''){
    const sym = String(symbol || '').trim().toUpperCase();
    return String(VP_ARAB_COMMON_NAMES[sym] || fallback || sym || '—');
  }

  function vpInstrumentDisplay(item){
    const type = vpNormalizeAssetType(item?.type || '');
    const symbol = String(item?.symbol || '').trim().toUpperCase();
    const rawName = String(item?.name || item?.title || '').trim();
    if(type === 'arab'){
      const common = vpArabCommonName(symbol, rawName);
      const secondary = symbol && common !== symbol ? symbol : (rawName && rawName !== common ? rawName : symbol);
      return {
        primary: common || symbol || '—',
        secondary: secondary || '',
        symbol,
        rawName: rawName || common || symbol || '—',
      };
    }
    return {
      primary: symbol || rawName || '—',
      secondary: rawName && rawName !== symbol ? rawName : (rawName || symbol || '—'),
      symbol,
      rawName: rawName || symbol || '—',
    };
  }

  try{ window.vpInstrumentName = instrumentName; }catch(_e){}
  try{ window.vpInstrumentDisplay = vpInstrumentDisplay; }catch(_e){}


  const VP_MAJOR_CRYPTO_RANK = {
    BTC:1, ETH:2, BNB:3, SOL:4, XRP:5, ADA:6, DOGE:7, TRX:8, TON:9, DOT:10,
    LTC:11, BCH:12, LINK:13, XLM:14, AVAX:15, UNI:16, ATOM:17, XMR:18, ETC:19, FIL:20
  };

  function vpBaseAssetCode(symbol, type){
    const sym = String(symbol || '').toUpperCase().replace(/[^A-Z0-9]/g,'');
    const kind = vpNormalizeAssetType(type || '');
    if(kind === 'crypto'){
      const pairs = ['USDT','USDC','USD','BUSD','EUR','BTC','ETH','PERP'];
      for(const suf of pairs){ if(sym.length > suf.length && sym.endsWith(suf)) return sym.slice(0, -suf.length) || sym; }
      return sym || 'VP';
    }
    if(kind === 'forex') return sym.slice(0, 3) || 'FX';
    if(kind === 'commodities'){
      if(sym.includes('XAU') || sym.includes('GOLD')) return 'XAU';
      if(sym.includes('XAG') || sym.includes('SILVER')) return 'XAG';
      if(sym.includes('OIL')) return 'OIL';
      return sym.slice(0, 3) || 'CMD';
    }
    return sym.slice(0, 4) || 'EQ';
  }

  function vpIconGlyph(base, kind){
    const key = String(base || '').toUpperCase();
    const glyphs = {
      BTC:'₿', ETH:'Ξ', BNB:'◆', SOL:'◎', XRP:'✕', ADA:'◈', DOGE:'Ð', TRX:'◉', TON:'◌', AVAX:'△', DOT:'●', LTC:'Ł', BCH:'Ƀ', XLM:'✦', LINK:'⬡', UNI:'◍', AAVE:'A', PEPE:'🐸', SHIB:'🐕', XAU:'Au', XAG:'Ag', OIL:'Oil', USD:'$', EUR:'€', JPY:'¥', GBP:'£', CHF:'₣'
    };
    if(glyphs[key]) return glyphs[key];
    if(kind === 'forex') return key.slice(0,1) || 'FX';
    if(kind === 'stocks') return key.slice(0,2) || 'EQ';
    if(kind === 'commodities') return key.slice(0,2) || 'Cm';
    return key.slice(0,3) || 'VP';
  }

  function vpIconTone(base, kind){
    const key = String(base || '').toUpperCase();
    if(kind === 'forex') return ['#1d4ed8','#60a5fa'];
    if(kind === 'stocks') return ['#047857','#34d399'];
    if(kind === 'commodities'){
      if(key === 'XAU') return ['#b45309','#fbbf24'];
      if(key === 'XAG') return ['#475569','#cbd5e1'];
      if(key === 'OIL') return ['#7c2d12','#fb923c'];
      return ['#92400e','#f59e0b'];
    }
    const map = {
      BTC:['#f97316','#facc15'], ETH:['#4338ca','#a78bfa'], BNB:['#ca8a04','#fde047'], SOL:['#7c3aed','#22d3ee'], XRP:['#0f172a','#38bdf8'], ADA:['#1d4ed8','#93c5fd'], DOGE:['#a16207','#fde68a'], TRX:['#b91c1c','#fb7185'], TON:['#0369a1','#38bdf8'], AVAX:['#b91c1c','#fb7185'], DOT:['#9d174d','#f472b6'], LTC:['#475569','#cbd5e1'], BCH:['#15803d','#86efac'], XLM:['#312e81','#a5b4fc'], LINK:['#1d4ed8','#60a5fa'], UNI:['#be185d','#f9a8d4'], AAVE:['#7c3aed','#c4b5fd'], PEPE:['#166534','#86efac'], SHIB:['#9a3412','#fdba74']
    };
    return map[key] || ['#1e3a8a','#60a5fa'];
  }

  function vpSvgDataUri(svg){
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  const VP_CRYPTO_ICON_SLUGS = {
    BTC:'btc', ETH:'eth', USDT:'usdt', USDC:'usdc', BNB:'bnb', SOL:'sol', XRP:'xrp', ADA:'ada', DOGE:'doge', TRX:'trx', TON:'ton', AVAX:'avax', DOT:'dot', LTC:'ltc', BCH:'bch', XLM:'xlm', LINK:'link', UNI:'uni', AAVE:'aave', ATOM:'atom', XMR:'xmr', ETC:'etc', FIL:'fil', SHIB:'shib', PEPE:'pepe', MATIC:'matic', NEAR:'near', ARB:'arb', OP:'op', APT:'apt', SUI:'sui', ICP:'icp'
  };

  function vpRemoteMarketIconCandidates(item, symbol){
    const urls = [];
    const push = (v)=>{
      const s = String(v || '').trim();
      if(s && !urls.includes(s)) urls.push(s);
    };
    push(item?.icon_url);
    push(item?.image_url);
    push(item?.logo_url);
    const kind = vpNormalizeAssetType(item?.type || '');
    const base = vpBaseAssetCode(symbol || item?.symbol, kind);
    if(kind === 'crypto'){
      const knownSlug = VP_CRYPTO_ICON_SLUGS[String(base || '').toUpperCase()];
      const slug = knownSlug ? String(knownSlug).trim() : '';
      if(slug){
        push(`https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${slug}.svg`);
        push(`https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/${slug}.png`);
      }
    }
    return urls;
  }

  function vpForexPairParts(symbol){
    const sym = String(symbol || '').toUpperCase().replace(/[^A-Z]/g,'');
    const m = sym.match(/^([A-Z]{3})([A-Z]{3})$/);
    if(m) return [m[1], m[2]];
    return [sym.slice(0,3) || 'FX', sym.slice(3,6) || 'PAIR'];
  }

  function vpCurrencyBadge(code){
    const key = String(code || '').toUpperCase();
    const map = { USD:'$', EUR:'€', GBP:'£', JPY:'¥', CHF:'₣', AUD:'A$', CAD:'C$', NZD:'NZ$', RUB:'₽', NOK:'kr', SEK:'kr', TRY:'₺', CNH:'¥' };
    return map[key] || key;
  }

  function vpSvgEscape(v){
    return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function vpCurrencyFlagMarkup(code, clipId, cx, cy, r){
    const key = String(code || '').toUpperCase();
    const x = cx - r, y = cy - r, size = r * 2;
    const half = y + size / 2;
    const third = size / 3;
    const quarter = size / 4;
    const sixth = size / 6;
    const pieces = [];
    const start = `<g clip-path="url(#${clipId})">`;
    const end = `</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1.6"/>`;
    if(key === 'USD'){
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#ffffff"/>`);
      for(let i=0;i<7;i+=1){ pieces.push(`<rect x="${x}" y="${y + i*(size/7)}" width="${size}" height="${size/14}" fill="#dc2626" opacity=".92"/>`); }
      pieces.push(`<rect x="${x}" y="${y}" width="${size*0.48}" height="${size*0.5}" fill="#1d4ed8"/>`);
      for(const dx of [0.18,0.33,0.48]) for(const dy of [0.18,0.34,0.50]) pieces.push(`<circle cx="${x + size*dx}" cy="${y + size*dy}" r="1.1" fill="#ffffff"/>`);
    }else if(key === 'EUR'){
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#1d4ed8"/>`);
      const stars = [[0, -0.36],[0.26,-0.26],[0.36,0],[0.26,0.26],[0,0.36],[-0.26,0.26],[-0.36,0],[-0.26,-0.26]];
      for(const [ox,oy] of stars){ pieces.push(`<circle cx="${cx + ox*r*1.05}" cy="${cy + oy*r*1.05}" r="1.55" fill="#facc15"/>`); }
    }else if(key === 'GBP'){
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#1e40af"/>`);
      pieces.push(`<path d="M ${x} ${y+3} L ${x+3} ${y} L ${x+size} ${y+size-3} L ${x+size-3} ${y+size} Z" fill="#ffffff" opacity=".95"/>`);
      pieces.push(`<path d="M ${x+size-3} ${y} L ${x+size} ${y+3} L ${x+3} ${y+size} L ${x} ${y+size-3} Z" fill="#ffffff" opacity=".95"/>`);
      pieces.push(`<path d="M ${x} ${cy-3.4} H ${x+size} V ${cy+3.4} H ${x} Z" fill="#ffffff"/>`);
      pieces.push(`<path d="M ${cx-3.4} ${y} V ${y+size} H ${cx+3.4} V ${y} Z" fill="#ffffff"/>`);
      pieces.push(`<path d="M ${x} ${cy-2} H ${x+size} V ${cy+2} H ${x} Z" fill="#dc2626"/>`);
      pieces.push(`<path d="M ${cx-2} ${y} V ${y+size} H ${cx+2} V ${y} Z" fill="#dc2626"/>`);
    }else if(key === 'JPY'){
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#ffffff"/>`);
      pieces.push(`<circle cx="${cx}" cy="${cy}" r="${r*0.38}" fill="#dc2626"/>`);
    }else if(key === 'CHF'){
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#dc2626"/>`);
      pieces.push(`<rect x="${cx-r*0.18}" y="${cy-r*0.5}" width="${r*0.36}" height="${r}" fill="#ffffff"/>`);
      pieces.push(`<rect x="${cx-r*0.5}" y="${cy-r*0.18}" width="${r}" height="${r*0.36}" fill="#ffffff"/>`);
    }else if(key === 'CAD'){
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#ffffff"/>`);
      pieces.push(`<rect x="${x}" y="${y}" width="${size*0.25}" height="${size}" fill="#dc2626"/>`);
      pieces.push(`<rect x="${x+size*0.75}" y="${y}" width="${size*0.25}" height="${size}" fill="#dc2626"/>`);
      pieces.push(`<path d="M ${cx} ${cy-r*0.44} L ${cx+r*0.14} ${cy-r*0.1} L ${cx+r*0.44} ${cy-r*0.1} L ${cx+r*0.18} ${cy+r*0.06} L ${cx+r*0.28} ${cy+r*0.38} L ${cx} ${cy+r*0.18} L ${cx-r*0.28} ${cy+r*0.38} L ${cx-r*0.18} ${cy+r*0.06} L ${cx-r*0.44} ${cy-r*0.1} L ${cx-r*0.14} ${cy-r*0.1} Z" fill="#dc2626"/>`);
    }else if(key === 'RUB'){
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${third}" fill="#ffffff"/>`);
      pieces.push(`<rect x="${x}" y="${y+third}" width="${size}" height="${third}" fill="#2563eb"/>`);
      pieces.push(`<rect x="${x}" y="${y+third*2}" width="${size}" height="${third}" fill="#dc2626"/>`);
    }else if(key === 'NOK'){
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#dc2626"/>`);
      pieces.push(`<rect x="${x + size*0.28}" y="${y}" width="${size*0.18}" height="${size}" fill="#ffffff"/>`);
      pieces.push(`<rect x="${x}" y="${y + size*0.4}" width="${size}" height="${size*0.18}" fill="#ffffff"/>`);
      pieces.push(`<rect x="${x + size*0.32}" y="${y}" width="${size*0.1}" height="${size}" fill="#1d4ed8"/>`);
      pieces.push(`<rect x="${x}" y="${y + size*0.44}" width="${size}" height="${size*0.1}" fill="#1d4ed8"/>`);
    }else if(key === 'SEK'){
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#1d4ed8"/>`);
      pieces.push(`<rect x="${x + size*0.3}" y="${y}" width="${size*0.14}" height="${size}" fill="#facc15"/>`);
      pieces.push(`<rect x="${x}" y="${y + size*0.43}" width="${size}" height="${size*0.14}" fill="#facc15"/>`);
    }else if(key === 'TRY'){
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#dc2626"/>`);
      pieces.push(`<circle cx="${cx-r*0.12}" cy="${cy}" r="${r*0.34}" fill="#ffffff"/>`);
      pieces.push(`<circle cx="${cx-r*0.03}" cy="${cy}" r="${r*0.26}" fill="#dc2626"/>`);
      pieces.push(`<polygon points="${cx+r*0.22},${cy} ${cx+r*0.06},${cy+r*0.08} ${cx+r*0.1},${cy-r*0.09} ${cx+r*0.1},${cy+r*0.09} ${cx+r*0.06},${cy-r*0.08}" fill="#ffffff"/>`);
    }else if(key === 'AUD' || key === 'NZD'){
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#1d4ed8"/>`);
      for(const pt of [[0.68,0.28],[0.78,0.48],[0.6,0.58],[0.78,0.7]]){ pieces.push(`<circle cx="${x + size*pt[0]}" cy="${y + size*pt[1]}" r="1.65" fill="#ffffff"/>`); }
      pieces.push(`<rect x="${x}" y="${y}" width="${size*0.5}" height="${size*0.5}" fill="#0f2f74"/>`);
      pieces.push(`<path d="M ${x} ${y+2} L ${x+2} ${y} L ${x+size*0.5} ${y+size*0.5-2} L ${x+size*0.5-2} ${y+size*0.5} Z" fill="#ffffff" opacity=".95"/>`);
      pieces.push(`<path d="M ${x+size*0.5-2} ${y} L ${x+size*0.5} ${y+2} L ${x+2} ${y+size*0.5} L ${x} ${y+size*0.5-2} Z" fill="#ffffff" opacity=".95"/>`);
      pieces.push(`<path d="M ${x} ${y+size*0.22} H ${x+size*0.5} V ${y+size*0.28} H ${x} Z" fill="#dc2626"/>`);
      pieces.push(`<path d="M ${x+size*0.22} ${y} V ${y+size*0.5} H ${x+size*0.28} V ${y} Z" fill="#dc2626"/>`);
    }else if(key === 'CNH' || key === 'CNY'){
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#dc2626"/>`);
      pieces.push(`<circle cx="${x + size*0.28}" cy="${y + size*0.28}" r="2.2" fill="#facc15"/>`);
      for(const pt of [[0.42,0.18],[0.48,0.28],[0.48,0.4],[0.4,0.48]]){ pieces.push(`<circle cx="${x + size*pt[0]}" cy="${y + size*pt[1]}" r="1" fill="#facc15"/>`); }
    }else{
      pieces.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#123a6b"/>`);
      pieces.push(`<text x="${cx}" y="${cy+4}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="900" fill="#ffffff">${vpSvgEscape(key.slice(0,2) || 'FX')}</text>`);
    }
    return `${start}${pieces.join('')}${end}`;
  }

  function vpGeneratedMarketIcon(item, symbol){
    const kind = vpNormalizeAssetType(item?.type || '');
    const base = vpBaseAssetCode(symbol || item?.symbol, kind);
    const glyph = vpIconGlyph(base, kind);
    const [c1,c2] = vpIconTone(base, kind);
    if(kind === 'forex'){
      const [left,right] = vpForexPairParts(symbol || item?.symbol || '');
      const leftCode = vpSvgEscape(left);
      const rightCode = vpSvgEscape(right);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#09142d"/><stop offset="100%" stop-color="#060f20"/></linearGradient><clipPath id="flag-a"><circle cx="20" cy="24" r="15.5"/></clipPath><clipPath id="flag-b"><circle cx="44" cy="24" r="15.5"/></clipPath></defs><rect x="1.5" y="1.5" width="61" height="61" rx="18" fill="url(#bg)" stroke="rgba(255,255,255,.12)"/>${vpCurrencyFlagMarkup(left,'flag-a',20,24,15.5)}${vpCurrencyFlagMarkup(right,'flag-b',44,24,15.5)}<rect x="8" y="45" width="48" height="9" rx="4.5" fill="rgba(255,255,255,.08)"/><text x="20" y="51.5" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="7" font-weight="900" fill="#dbeafe">${leftCode}</text><text x="44" y="51.5" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="7" font-weight="900" fill="#dbeafe">${rightCode}</text><path d="M32 13v22" stroke="rgba(255,255,255,.20)" stroke-width="1.8" stroke-linecap="round"/><path d="M30.4 24.4 L32 26 L33.6 24.4" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      return vpSvgDataUri(svg);
    }
    if(kind === 'commodities'){
      const label = base === 'XAU' ? 'Au' : (base === 'XAG' ? 'Ag' : (base === 'OIL' ? 'Oil' : (base || 'Cmd').slice(0,3)));
      const codeLabel = vpSvgEscape(label);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect x="1.5" y="1.5" width="61" height="61" rx="18" fill="#0a1329" stroke="rgba(255,255,255,.12)"/><circle cx="32" cy="26" r="21" fill="url(#ring)"/><circle cx="32" cy="26" r="14.6" fill="rgba(7,14,31,.22)"/><text x="32" y="31.5" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="17" font-weight="900" fill="#fff">${codeLabel}</text><rect x="11" y="46" width="42" height="7" rx="3.5" fill="rgba(255,255,255,.14)"/><rect x="18" y="47.5" width="28" height="4" rx="2" fill="rgba(255,255,255,.32)"/></svg>`;
      return vpSvgDataUri(svg);
    }
    if(kind === 'stocks'){
      const label = String(symbol || item?.symbol || base || 'EQ').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4) || 'EQ';
      const safeLabel = label.replace(/&/g,'&amp;').replace(/</g,'&lt;');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#071a33"/><stop offset="100%" stop-color="#0f2a43"/></linearGradient><linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#6ee7b7"/></linearGradient></defs><rect x="1.5" y="1.5" width="61" height="61" rx="18" fill="url(#g)" stroke="rgba(255,255,255,.12)"/><circle cx="32" cy="22" r="15" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.18)"/><text x="32" y="26.5" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="12.5" font-weight="900" fill="#eefbf6">${safeLabel}</text><path d="M13 47 L22 38 L30 41 L41 28 L51 32" fill="none" stroke="url(#l)" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="38" r="2.2" fill="#86efac"/><circle cx="41" cy="28" r="2.2" fill="#a7f3d0"/></svg>`;
      return vpSvgDataUri(svg);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect x="1.5" y="1.5" width="61" height="61" rx="18" fill="url(#g)" stroke="rgba(255,255,255,.18)"/><text x="32" y="36" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${glyph.length > 2 ? 18 : 26}" font-weight="800" fill="#ffffff">${String(glyph).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text></svg>`;
    return vpSvgDataUri(svg);
  }

  function vpMarketIconSources(item, symbol){
    const kind = vpNormalizeAssetType(item?.type || '');
    const fallback = vpGeneratedMarketIcon(item, symbol);
    if(kind !== 'crypto') return fallback ? [fallback] : [];
    const out = vpRemoteMarketIconCandidates(item, symbol).slice();
    if(fallback && !out.includes(fallback)) out.push(fallback);
    return out;
  }

  function vpMarketFallbackLabel(item, symbol){
    const kind = vpNormalizeAssetType(item?.type || '');
    const base = vpBaseAssetCode(symbol || item?.symbol, kind);
    if(kind === 'forex') return 'FX';
    if(kind === 'stocks') return 'EQ';
    if(kind === 'commodities'){
      if(base === 'XAU') return 'Au';
      if(base === 'XAG') return 'Ag';
      if(base === 'OIL') return 'Oil';
      return 'Cmd';
    }
    return (base || 'VP').slice(0, 3);
  }

  function vpMarketAvatar(item, symbol, cls){
    const kind = vpNormalizeAssetType(item?.type || '');
    const label = vpMarketFallbackLabel(item, symbol);
    const sources = vpMarketIconSources(item, symbol);
    const wrap = h('span',{class:'vp-market-avatar ' + (cls || '') + ' ' + kind});
    if(sources.length){
      const img = h('img',{src:sources[0], alt:label, loading:'lazy', decoding:'async', referrerpolicy:'no-referrer'});
      let idx = 0;
      img.onerror = ()=>{
        idx += 1;
        if(idx < sources.length){ img.src = sources[idx]; return; }
        try{
          wrap.innerHTML = '';
          wrap.appendChild(h('span',{class:'vp-market-avatar-fallback'}, label));
        }catch(_e){}
      };
      wrap.appendChild(img);
      return wrap;
    }
    wrap.appendChild(h('span',{class:'vp-market-avatar-fallback'}, label));
    return wrap;
  }

  function vpMarketRankValue(item){
    const rank = Number(item?.market_rank || item?.rank || 0);
    if(rank > 0) return rank;
    const kind = vpNormalizeAssetType(item?.type || '');
    if(kind === 'crypto'){
      const pr = Number(VP_MAJOR_CRYPTO_RANK[vpBaseAssetCode(item?.symbol, 'crypto')] || 0);
      if(pr > 0) return pr;
    }
    const sortOrder = Number(item?.sort_order || 0);
    if(sortOrder > 0) return sortOrder;
    return 999999;
  }

  function vpMarketSizeValue(item){
    const cap = Number(item?.market_cap ?? item?.marketCap ?? 0);
    if(cap > 0) return cap;
    const vol = Number(item?.volume ?? item?.quoteVolume ?? item?.turnover ?? item?.vol ?? 0);
    if(vol > 0) return vol;
    const rank = vpMarketRankValue(item);
    return rank > 0 && rank < 999999 ? (1 / rank) : 0;
  }

  function getFavorites(){
    try{
      const raw = JSON.parse(localStorage.getItem('vp_favorites') || '[]');
      return Array.isArray(raw) ? raw.map(x=>String(x).toUpperCase()) : [];
    }catch(e){ return []; }
  }

  function toggleFavorite(symbol){
    symbol = String(symbol || '').toUpperCase();
    const set = new Set(getFavorites());
    if(set.has(symbol)) set.delete(symbol); else set.add(symbol);
    localStorage.setItem('vp_favorites', JSON.stringify(Array.from(set)));
  }

  function setSymbolAndGo(item){
    if(!item) return;
    try{
      if(vpApplyTradeSelection(item)) return;
    }catch(e){}
    location.hash = '#/trade';
  }

  function openTradeType(type){
    const nextType = vpNormalizeAssetType(type || state.selectedAssetType || 'crypto');
    try{
      state.selectedAssetType = nextType;
      state.selectedMarketType = nextType;
      localStorage.setItem('marketType', nextType);
    }catch(e){}
    try{
      const pool = curatedMarketRows(nextType, {limit: 18, allowZeroChange: true});
      if(Array.isArray(pool) && pool.length){
        const pick = pool[0];
        try{ if(vpApplyTradeSelection(pick)) return; }catch(e){}
      }
    }catch(e){}
    location.hash = '#/trade';
  }

  function money(n, d){
    return '$' + fmt(Number(n || 0), d == null ? 2 : d);
  }

  function percentText(v){
    v = Number(v || 0);
    return (v >= 0 ? '+' : '') + fmt(v, 2) + '%';
  }

  function changeClass(v){
    v = Number(v || 0);
    return v >= 0 ? 'up' : 'down';
  }

  function miniMetric(title, value, sub, extraCls){
    return h('div',{class:'mb-mini-metric ' + (extraCls || '')},
      h('div',{class:'mb-mini-k'}, title),
      h('div',{class:'mb-mini-v'}, value),
      sub ? h('div',{class:'mb-mini-s'}, sub) : null
    );
  }

  function barCard(title, items, negative){
    const clean = (items || []).filter(Boolean).slice(0,5);
    const max = clean.reduce((m,x)=>Math.max(m, Math.abs(Number(x.change_pct || 0))), 1) || 1;
    return h('div',{class:'card mb-bars-card'},
      h('div',{class:'mb-card-title'}, title),
      h('div',{class:'mb-bars-grid'},
        ...clean.map(item=>{
          const ch = Math.abs(Number(item.change_pct || 0));
          const hgt = Math.max(22, Math.round((ch / max) * 160));
          return h('button',{
              class:'mb-bar-item',
              'data-home-live-symbol': String(item?.symbol || '').toUpperCase(),
              'data-home-live-type': vpNormalizeAssetType(item?.type || ''),
              'data-home-live-role': 'mover',
              onclick:()=>setSymbolAndGo(item)
            },
            h('div',{class:'mb-bar-pct ' + (negative ? 'down' : 'up'), 'data-home-live-change':'1'}, percentText(Number(item.change_pct || 0))),
            h('div',{class:'mb-bar-stick ' + (negative ? 'down' : 'up'), style:'height:' + hgt + 'px', 'data-home-live-stick':'1'}),
            h('div',{class:'mb-bar-price', 'data-home-live-price':'1'}, fmt(Number(item.price || 0), Number(item.price || 0) < 1 ? 4 : 2)),
            h('div',{class:'mb-bar-label'}, String(item.symbol || '').replace('USDT','').slice(0,8)),
            h('div',{class:'mb-bar-sub'}, instrumentName(item).slice(0,12))
          );
        })
      )
    );
  }

  function promoCard(){
    return h('div',{class:'card mb-promo-card'},
      h('div',{class:'mb-promo-copy'},
        h('div',{class:'mb-promo-title'}, 'LET’S MAKE IT OFFICIAL'),
        h('div',{class:'mb-promo-text'}, 'Submit your documents and unlock full trading access with VertexPluse.'),
        h('button',{class:'btn primary', onclick:()=>openKycFlow().catch(()=>{})}, safeT('kyc.open', 'Verify account'))
      ),
      h('div',{class:'mb-promo-art'},
        h('div',{class:'mb-promo-orb'}),
        h('div',{class:'mb-promo-card-art'})
      )
    );
  }

  function latestTradesCard(){
    const snap = portfolioSnapshot('real');
    const list = (Array.isArray(snap.positions) ? snap.positions.slice() : []).sort((a,b)=>{
      const bt = vpEpoch(b?.updated_at || b?.modified_at || b?.opened_at || b?.created_at || 0);
      const at = vpEpoch(a?.updated_at || a?.modified_at || a?.opened_at || a?.created_at || 0);
      return bt - at || Math.abs(Number(b?.unrealized_pnl || 0)) - Math.abs(Number(a?.unrealized_pnl || 0));
    }).slice(0,4);
    return h('div',{class:'card mb-side-card'},
      h('div',{class:'mb-side-head'},
        h('div',{class:'mb-card-title'}, 'My Latest Trades'),
        h('a',{href:'#/portfolio', class:'mb-side-link'}, 'Portfolio')
      ),
      list.length
        ? h('div',{class:'mb-side-list'},
            ...list.map(pos=>{
              const mk = marketBySymbol(String(pos.symbol||'').replace(/^@R@/,''));
              const mark = Number(pos.mark_price || mk?.price || pos.entry_price || 0);
              const pnl = Number(pos.unrealized_pnl || 0);
              return h('div',{class:'mb-side-row'},
                h('div',{},
                  h('div',{class:'mb-side-row-title'}, String(pos.symbol||'').replace(/^@R@/,'')),
                  h('div',{class:'mb-side-row-sub'}, `${String(pos.side||'BUY').toUpperCase()} • ${fmt(Number(pos.qty||0),4)} units`)
                ),
                h('div',{class:'mb-side-row-right'},
                  h('div',{class:'mb-side-row-price'}, money(mark, mark < 1 ? 4 : 2)),
                  h('div',{class:'mb-side-row-pnl ' + (pnl >= 0 ? 'up' : 'down')}, `${pnl >= 0 ? '+' : ''}${fmt(pnl,2)} USD`)
                )
              );
            })
          )
        : h('div',{class:'mb-empty-box'},
            h('div',{class:'mb-empty-ico'}, '◔'),
            h('div',{class:'mb-empty-title'}, 'You don’t have any open positions'),
            h('a',{href:'#/trade', class:'mb-side-link'}, 'Go to Trade')
          )
    );
  }

  function quickActionsPanel(){
    return h('div',{class:'card mb-quick-actions'},
      h('button',{class:'mb-quick-btn', onclick:()=>openKycFlow().catch(()=>{})},
        h('span',{class:'mb-quick-ico'}, '⟳'),
        h('span',{}, 'Open Live Account')
      ),
      h('button',{class:'mb-quick-btn', onclick:()=>location.hash='#/trade'},
        h('span',{class:'mb-quick-ico'}, '⚙'),
        h('span',{}, 'Trade on MT5')
      ),
      h('button',{class:'mb-quick-btn', onclick:()=>location.hash='#/invest'},
        h('span',{class:'mb-quick-ico'}, '▥'),
        h('span',{}, BRAND_NAME)
      )
    );
  }


  function routeMeta(){
    const hash = String((location && location.hash) || '#/home');
    if(hash.startsWith('#/trade')) return {key:'trade', title:safeT('nav.trade','Trade'), subtitle:'Chart-first execution with quick order entry and tighter risk controls.'};
    if(hash.startsWith('#/markets')) return {key:'markets', title:safeT('nav.markets','Markets'), subtitle:'Browse instruments, compare movers, and jump directly to the trade ticket.'};
    if(hash.startsWith('#/portfolio')) return {key:'portfolio', title:safeT('nav.portfolio','Portfolio'), subtitle:vpTr('Review open positions, pending orders, and recently closed trades.','راجع الصفقات المفتوحة والأوامر المعلقة والصفقات المغلقة حديثًا.','Просматривайте открытые позиции, отложенные ордера и недавно закрытые сделки.')};
    if(hash.startsWith('#/wallet')) return {key:'wallet', title:'Funds', subtitle:'Handle deposits, withdrawals, and request tracking from one place.'};
    if(hash.startsWith('#/kyc')) return {key:'kyc', title:safeT('kyc.title','Verification'), subtitle:'Review account verification status, admin notes, and document requirements from one dedicated page.'};
    if(hash.startsWith('#/support')) return {key:'support', title:safeT('support.title','Support'), subtitle:'Open a platform ticket, follow operations replies, and keep client support inside the dashboard.'};
    if(hash.startsWith('#/notifications')) return {key:'notifications', title:'Notifications', subtitle:'One operational feed for support replies, funding progress, verification changes, and platform updates.'};
    if(hash.startsWith('#/news')) return {key:'news', title:'News', subtitle:'Read platform updates, operational announcements, and maintenance notes in one feed.'};
    if(hash.startsWith('#/invest')) return {key:'invest', title:safeT('nav.invest','Invest'), subtitle:'Structured plans with a clean summary of active subscriptions and expected return.'};
    if(hash.startsWith('#/account')) return {key:'account', title:safeT('nav.account','Account'), subtitle:'Profile, onboarding, language, and secure access settings.'};
    return {key:'home', title:safeT('nav.home','Home'), subtitle:'Live overview of equity, onboarding progress, and platform actions.'};
  }

  function applyMobileMenuLock(open){
    try{ document.documentElement.classList.toggle('vp-mobile-menu-open', !!open); }catch(e){}
    try{ document.body.classList.toggle('vp-mobile-menu-open', !!open); }catch(e){}
    try{ document.documentElement.style.overflow = open ? 'hidden' : ''; }catch(e){}
    try{ document.body.style.overflow = open ? 'hidden' : ''; }catch(e){}
  }

  function setMobileShellMenu(open){
    state.__vpMobileMenuOpen = !!open;
    if(open){
      state.__vpMobileMenuSection = String(state.__vpMobileMenuSection || 'main');
    }else{
      state.__vpMobileMenuSection = 'main';
      state.__vpMenuAccountMode = null;
    }
    applyMobileMenuLock(!!open);
    render();
  }


  function vpOpenMainMobileMenu(evt){
    try{ if(evt){ evt.preventDefault(); evt.stopPropagation(); if(typeof evt.stopImmediatePropagation === 'function') evt.stopImmediatePropagation(); } }catch(e){}
    try{ vpOpenTradeSymbolsDrawer(false); }catch(e){}
    state.__vpMobileMenuSection = 'main';
    setMobileShellMenu(true);
  }

  function mobileMenuSetSection(section){
    state.__vpMobileMenuSection = String(section || 'main');
    render();
  }

  function mobileMenuClose(opts){
    const conf = opts && typeof opts === 'object' ? opts : {};
    state.__vpMobileMenuOpen = false;
    state.__vpMobileMenuSection = 'main';
    state.__vpMenuAccountMode = null;
    applyMobileMenuLock(false);
    if(conf.goHome && String(location.hash || '#/home').indexOf('#/home') !== 0){
      location.hash = '#/home';
    }
  }

  function mobileMenuGo(hash){
    mobileMenuClose();
    location.hash = hash;
  }

  function vpCurrentTradeMarket(assetType){
    const type = vpNormalizeAssetType(assetType || state.selectedAssetType || 'crypto');
    const fallback = (type === 'crypto' || type === 'futures') ? 'perp' : 'spot';
    const raw = String((state && (state.tradeMarket || state.currentTradeMarket)) || '' || '').toLowerCase();
    let chosen = raw;
    try{ if(!chosen) chosen = String(localStorage.getItem('tradeMarket') || '').toLowerCase(); }catch(e){}
    if(chosen !== 'spot' && chosen !== 'perp') chosen = fallback;
    return chosen;
  }

  function vpRenderMobileMenuFallback(err){
    try{ console.error('VertexPluse mobile menu render failed:', err); }catch(e){}
    const me = (state && state.me) || {};
    const displayName = String(me.name || [me.first_name, me.last_name].filter(Boolean).join(' ') || me.username || 'VertexPluse User');
    const email = String(me.email || 'No email attached');
    const phone = String(me.phone || me.mobile || me.telegram_phone || '—');
    const initials = displayName.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase() || 'VP';
    const snap = portfolioSnapshot(state.tradeMode === 'real' ? 'real' : 'demo');
    const activeAccountNo = state.tradeMode === 'real' ? accountNo('live') : accountNo('demo');
    const activeMode = state.tradeMode === 'real' ? safeT('trade.mode_real','Real') : safeT('trade.mode_demo','Demo');
    return h('div',{class:'mb-mobile-menu-wrap'},
      h('button',{class:'mb-mobile-menu-backdrop', type:'button', onclick:()=>{ mobileMenuClose(); render(); }, 'aria-label':'Close menu'}),
      h('aside',{class:'mb-mobile-drawer mb-mobile-account-drawer', onclick:(e)=>e.stopPropagation()},
        h('div',{class:'mb-account-menu-page'},
          h('div',{class:'mb-account-menu-top'},
            h('div',{class:'mb-account-menu-top-left'},
              h('span',{class:'mb-account-menu-mini'}, '◔'),
mbLanguageMenuNode(state.lang, 'mb-account-menu-lang-pop')
            ),
            h('button',{class:'mb-account-menu-close', type:'button', onclick:()=>{ mobileMenuClose(); render(); }, 'aria-label':'Close menu'}, '✕')
          ),
          h('div',{class:'mb-drawer-scroll mb-drawer-scroll-main', 'data-scroll-key':'mobile-menu-main'},
            h('div',{class:'mb-account-menu-accent'}),
            h('div',{class:'mb-account-menu-title'}, 'Account'),
            h('div',{class:'mb-account-menu-card ref-flat vp-account-menu-compact-card'},
              h('div',{class:'mb-account-menu-avatar'}, initials),
              h('div',{class:'mb-account-menu-meta'},
                h('div',{class:'mb-account-menu-name'}, displayName),
                h('div',{class:'mb-account-menu-email', title:email}, email)
              )
            ),
            h('div',{class:'vp-account-id-card ref-flat'},
              h('div',{class:'vp-account-id-copy'},
                h('div',{class:'k'}, 'Trading account number'),
                h('div',{class:'v', title:String(activeAccountNo || '—')}, String(activeAccountNo || '—'))
              ),
              h('button',{class:'vp-account-copy-btn', type:'button', onclick:()=>vpCopyText(String(activeAccountNo || ''), 'Account number copied')}, 'Copy')
            ),
            h('div',{class:'mb-account-menu-section-label'}, 'FUNDS'),
            h('div',{class:'mb-account-menu-list flat ref'},
              drawerActionRow('Deposit', 'Fund your live account', ()=>mobileMenuGo('#/wallet?tab=deposit'), '◫'),
              drawerActionRow('Withdrawals', 'Request payout review', ()=>mobileMenuGo('#/wallet?tab=withdraw'), '◎'),
                            
            ),
            h('div',{class:'mb-account-menu-section-label'}, 'MY PROFILE'),
            h('div',{class:'mb-account-menu-list flat ref'},
              drawerActionRow('Account', 'Profile, security, and personal settings', ()=>mobileMenuGo('#/account'), '◔'),
              drawerActionRow('Identity Verification', 'Review the KYC status and required documents', ()=>mobileMenuGo('#/kyc'), '◈')
            ),
            h('div',{class:'mb-account-menu-section-label'}, 'APPLICATION'),
            h('div',{class:'mb-account-menu-list flat ref'},
              drawerActionRow('Trading Accounts', 'Live and demo account details', ()=>mobileMenuGo('#/account'), '⇄'),
              ...((!state.newsConfig || state.newsConfig.menu_enabled !== false) ? [drawerActionRow('News', 'Read platform announcements and updates', ()=>mobileMenuGo('#/news'), '◌')] : [])
            ),
            h('div',{class:'mb-account-menu-section-label'}, 'ACCOUNT'),
            h('div',{class:'mb-account-menu-list flat ref'},
              drawerActionRow(safeT('settings.logout','Log Out'), 'Close the current session on this device', ()=>{ window.location.href='/logout.php'; }, '⇥', 'danger')
            ),
            h('div',{class:'mb-account-menu-logout-line'})
          )
        )
      )
    );
  }

  function mobileTradingAccountStats(mode){
    const resolved = String(mode || state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
    const snap = portfolioSnapshot(resolved);
    const wsum = (state.walletSummary && state.walletSummary.ok) ? state.walletSummary : null;
    const pnlStats = resolved === 'real' ? state.realPnlStats : state.pnlStats;
    const available = resolved === 'real'
      ? safeNum(wsum?.real?.available, snap.freeMargin)
      : safeNum(wsum?.demo?.available, snap.freeMargin);
    const accountNoValue = resolved === 'real'
      ? (state.me?.live_account?.account_no || accountNo('live'))
      : (state.me?.demo_account?.account_no || accountNo('demo'));
    return {
      mode: resolved,
      label: resolved === 'real' ? 'Live' : 'Demo',
      accountNo: String(accountNoValue || '—'),
      available,
      equity: safeNum(snap.equity, 0),
      pnl: safeNum(snap.pnl, safeNum(pnlStats?.total_pnl, 0)),
      margin: safeNum(snap.margin, 0),
      marginLevel: safeNum(snap.marginLevel, 0),
      freeMargin: safeNum(snap.freeMargin, 0),
      leverage: Math.max(1, Math.round(snap.leverage || 500)),
      rewards: 0,
      tone: safeNum(snap.pnl, safeNum(pnlStats?.total_pnl, 0)) >= 0 ? 'up' : 'down'
    };
  }

  function quickActionButton(label, cls, onClick){
    return h('button',{class:'btn ' + cls, onclick:onClick}, label);
  }

  function drawerNavItem(href, title, sub, ico){
    const active = location.hash === href || (href === '#/home' && (!location.hash || location.hash === '#'));
    return h('a', {
        href,
        class:'mb-drawer-link ' + (active ? 'active' : ''),
        onclick:()=>{ state.__vpMobileMenuOpen = false; }
      },
      h('div',{class:'mb-drawer-link-ico'}, ico || '•'),
      h('div',{class:'mb-drawer-link-copy'},
        h('strong',{}, title),
        h('span',{}, sub)
      ),
      h('span',{class:'mb-drawer-link-arrow'}, '›')
    );
  }

  function drawerActionRow(title, sub, onClick, ico, tone){
    return h('button',{
        class:'mb-account-menu-row ' + (tone || ''),
        type:'button',
        onclick:onClick
      },
      h('div',{class:'mb-account-menu-ico'}, ico || '•'),
      h('div',{class:'mb-account-menu-copy'},
        h('strong',{}, title),
        sub ? h('span',{}, sub) : null
      ),
      h('span',{class:'mb-account-menu-arrow'}, '›')
    );
  }

  function vpCopyText(text, okMsg){
    try{
      const raw = String(text || '').trim();
      if(!raw) return;
      const done = ()=>{ try{ toast(okMsg || vpLang4('Copied','تم النسخ','Скопировано','कॉपी हो गया')); }catch(e){} };
      const fallback = ()=>{
        try{
          const ta = document.createElement('textarea');
          ta.value = raw;
          ta.setAttribute('readonly','readonly');
          ta.style.position='fixed';
          ta.style.opacity='0';
          ta.style.pointerEvents='none';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          done();
        }catch(_e){}
      };
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(raw).then(done).catch(fallback);
      } else {
        fallback();
      }
    }catch(e){}
  }

  function desktopStat(title, value, tone, sub){
    return h('div',{class:'mb-desk-stat ' + (tone || '')},
      h('span',{class:'k'}, title),
      h('strong',{class:'v'}, value),
      sub ? h('span',{class:'s'}, sub) : null
    );
  }

  function desktopBalanceItem(title, value, sub, tone){
    return h('div',{class:'mb-shell-balance-item ' + (tone || '')},
      h('span',{class:'k'}, title),
      h('strong',{class:'v'}, value),
      sub ? h('span',{class:'s'}, sub) : null
    );
  }

  function vpHeaderModeToggle(opts={}){
    const current = String(opts?.mode || state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
    const compact = !!opts?.compact;
    const onAfter = typeof opts?.onAfter === 'function' ? opts.onAfter : null;
    const switchMode = async(nextMode, evt)=>{
      try{ if(evt){ evt.preventDefault(); evt.stopPropagation(); } }catch(e){}
      const target = String(nextMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
      if(target === String(state.tradeMode || 'demo').toLowerCase()) return false;
      try{
        const switched = (typeof requestTradeModeSwitch === 'function') ? await requestTradeModeSwitch(target) : (setTradeMode(target), true);
        if(!switched) return false;
      }catch(e){ return false; }
      try{ if(onAfter) onAfter(target); }catch(e){}
      try{ render(); }catch(e){}
      Promise.allSettled([
        refreshWalletSummary(true),
        target === 'real' ? refreshRealPortfolio(true) : refreshPortfolio(true),
        target === 'real' ? refreshRealPnlStats() : refreshPnlStats()
      ]).then(()=>{ try{ render(); }catch(e){}; });
      return false;
    };
    return h('div',{
        class:'mb-shell-mode-toggle' + (compact ? ' compact' : ''),
        role:'tablist',
        'aria-label':vpLang4('Platform mode','وضع المنصة','Режим платформы','प्लेटफॉर्म मोड')
      },
      h('button',{class: current === 'demo' ? 'active' : '', type:'button', onclick:(e)=>switchMode('demo', e)}, vpLang4('Demo','ديمو','Демо','डेमो')),
      h('button',{class: current === 'real' ? 'active' : '', type:'button', onclick:(e)=>switchMode('real', e)}, vpLang4('Real','حقيقي','Реал','रियल'))
    );
  }

  function vpDashboardAccountSwitcher(opts={}){
    const current = String(opts?.mode || state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
    const onAfter = typeof opts?.onAfter === 'function' ? opts.onAfter : null;
    const pendingTarget = String(state.__dashboardModeSwitchTarget || '').toLowerCase() === 'real' ? 'real' : (String(state.__dashboardModeSwitchTarget || '').toLowerCase() === 'demo' ? 'demo' : '');
    const pending = !!state.__dashboardModeSwitchPending;
    const statusText = current === 'real'
      ? vpLang4('Real account active','الحساب الحقيقي مفعل','Реальный счёт نشط','रियल अकाउंट एक्टिव')
      : vpLang4('Demo account active','حساب الديمو مفعل','Демо счёт активен','डेमो अकाउंट एक्टिव');
    const hintText = current === 'real'
      ? vpLang4('Balances, PnL, and actions now use the real wallet.','الأرصدة والأرباح والإجراءات تعمل الآن على المحفظة الحقيقية.','Баланс, PnL и действия الآن تستخدم real-кошелёк.','बैलेंस, PnL और एक्शन अब रियल वॉलेट से होंगे।')
      : vpLang4('Use Demo to explore safely without touching the real wallet.','استخدم الديمو للتجربة بأمان بدون لمس المحفظة الحقيقية.','Используйте Demo для безопасного режима без real-кошелька.','डेमो सेफ मोड में बिना रियल वॉलेट के इस्तेमाल करें।');
    const applyMode = async(nextMode, evt)=>{
      try{ if(evt){ evt.preventDefault(); evt.stopPropagation(); } }catch(e){}
      const target = String(nextMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
      if(pending) return false;
      if(target === String(state.tradeMode || 'demo').toLowerCase()) return false;
      try{
        state.__dashboardModeSwitchPending = true;
        state.__dashboardModeSwitchTarget = target;
        render();
      }catch(e){}
      let switched = false;
      try{
        switched = (typeof requestTradeModeSwitch === 'function') ? await requestTradeModeSwitch(target) : (setTradeMode(target), true);
      }catch(e){
        switched = false;
      }
      if(!switched){
        try{
          state.__dashboardModeSwitchPending = false;
          state.__dashboardModeSwitchTarget = '';
          render();
        }catch(e){}
        return false;
      }
      try{ if(onAfter) onAfter(target); }catch(e){}
      try{ render(); }catch(e){}
      Promise.allSettled([
        refreshWalletSummary(true),
        target === 'real' ? refreshRealPortfolio(true) : refreshPortfolio(true),
        target === 'real' ? refreshRealPnlStats() : refreshPnlStats()
      ]).then(()=>{
        try{
          state.__dashboardModeSwitchPending = false;
          state.__dashboardModeSwitchTarget = '';
          render();
        }catch(e){}
      });
      return false;
    };
    const badgeText = current === 'real' ? vpLang4('REAL','حقيقي','REAL','REAL') : vpLang4('DEMO','ديمو','DEMO','DEMO');
    const switchButton = (modeKey, title, sub)=>{
      const active = current === modeKey;
      const waiting = pending && pendingTarget === modeKey;
      return h('button',{
          class:'mb-home-account-switcher-option ' + modeKey + (active ? ' is-active' : '') + (waiting ? ' is-pending' : ''),
          type:'button',
          disabled: pending ? 'disabled' : null,
          'aria-pressed': active ? 'true' : 'false',
          onclick:(e)=>applyMode(modeKey, e)
        },
        h('span',{class:'mb-home-account-switcher-option-title'}, title),
        h('span',{class:'mb-home-account-switcher-option-sub'}, waiting ? vpLang4('Switching…','جارٍ التبديل…','Переключение…','स्विच हो रहा है…') : sub)
      );
    };
    return h('div',{class:'mb-home-account-switcher premium-switcher' + (pending ? ' is-busy' : '')},
      h('div',{class:'mb-home-account-switcher-label-row'},
        h('div',{class:'mb-home-account-switcher-label'}, vpLang4('Account mode','وضع الحساب','Режим счёта','अकाउंट मोड')),
        h('span',{class:'mb-home-account-switcher-pill ' + current, 'aria-hidden':'true'}, badgeText)
      ),
      h('div',{class:'mb-home-account-switcher-shell', role:'group', 'aria-label':vpLang4('Switch account mode','تبديل وضع الحساب','Сменить режим счёта','अकाउंट मोड बदलें')},
        h('span',{class:'mb-home-account-switcher-glow','aria-hidden':'true'}),
        h('div',{class:'mb-home-account-switcher-topline'},
          h('div',{class:'mb-home-account-switcher-status'}, statusText),
          h('div',{class:'mb-home-account-switcher-hint'}, hintText)
        ),
        h('div',{class:'mb-home-account-switcher-options'},
          switchButton('demo', vpLang4('Demo','ديمو','Демо','डेमो'), vpLang4('Safe testing mode','وضع تجريبي آمن','Безопасный тестовый режим','सुरक्षित टेस्ट मोड')),
          switchButton('real', vpLang4('Real','حقيقي','Реал','रियल'), vpLang4('Uses your live wallet','يستخدم محفظتك الحقيقية','Использует real-кошелёк','आपका लाइव वॉलेट इस्तेमाल करता है'))
        )
      )
    );
  }

  function desktopBalanceDropdown(opts){
    const mode = String(opts?.mode || 'real').toLowerCase() === 'real' ? 'real' : 'demo';
    const liveSnap = opts?.liveSnap || {};
    const demoSnap = opts?.demoSnap || {};
    const snap = opts?.snap || {};
    const activeAccountLabel = String(opts?.activeAccountLabel || vpLang4('Active account','الحساب الحالي','Активный счёт','सक्रिय अकाउंट'));
    const activeAccountNo = String(opts?.activeAccountNo || '—');
    const liveAvailable = Number(liveSnap.freeMargin || liveSnap.availableCash || liveSnap.equity || 0);
    const demoAvailable = Number(demoSnap.freeMargin || demoSnap.availableCash || demoSnap.equity || 0);
    const activeAvailable = Number(snap.freeMargin || snap.availableCash || snap.equity || 0);
    const primaryValue = mode === 'real' ? liveAvailable : activeAvailable;
    const primarySub = mode === 'real'
      ? vpLang4('Tap to view all balances','اضغط لعرض كل الأرصدة','Нажмите, чтобы увидеть все балансы','सभी बैलेंस देखने के लिए टैप करें')
      : vpLang4('Demo mode balance summary','ملخص رصيد الوضع التجريبي','Сводка по демо-балансу','डेमो मोड बैलेंस सारांश');
    const triggerLabel = `${activeAccountLabel} • ${activeAccountNo}`;
    const modeHint = mode === 'real'
      ? vpLang4('Live tools enabled on this account','الأدوات الحقيقية مفعلة على هذا الحساب','Live tools enabled on this account','इस अकाउंट पर लाइव टूल्स सक्रिय हैं')
      : vpLang4('Demo mode keeps live balances hidden','الديمو يعزل الأرصدة الحقيقية بالكامل','Demo mode keeps live balances isolated','डेमो मोड लाइव बैलेंस अलग रखता है');
    return h('details',{
        class:'mb-shell-balance',
        open: state.__vpHeaderBalancesOpen ? true : null,
        ontoggle:(e)=>{ try{ state.__vpHeaderBalancesOpen = !!(e.currentTarget && e.currentTarget.open); }catch(_e){} }
      },
      h('summary',{class:'mb-shell-balance-trigger', role:'button', 'aria-label':vpLang4('Open balances menu','افتح قائمة الأرصدة','Открыть меню балансов','बैलेंस मेन्यू खोलें')},
        h('div',{class:'mb-shell-balance-copy'},
          h('span',{class:'k'}, vpLang4('Available balance','الرصيد المتاح','Доступный баланс','उपलब्ध बैलेंस')),
          h('strong',{class:'v','data-topbar-balance-primary':'1'}, money(primaryValue, 2)),
          h('span',{class:'s compact','data-topbar-balance-trigger':'1'}, triggerLabel),
          h('div',{class:'mb-shell-balance-mode-inline'},
            h('span',{class:'mb-shell-balance-mode-hint'}, primarySub),
            vpHeaderModeToggle({mode, compact:true, onAfter:()=>{ try{ state.__vpHeaderBalancesOpen = true; }catch(e){} }})
          )
        ),
        h('div',{class:'mb-shell-balance-rail'},
          h('span',{class:'mb-shell-balance-hint'}, vpLang4('All balances','كل الأرصدة','Все балансы','सभी बैलेंस')),
          h('span',{class:'mb-shell-balance-arrow','aria-hidden':'true'}, '▾')
        )
      ),
      h('div',{class:'mb-shell-balance-pop'},
        h('div',{class:'mb-shell-balance-mode-block'},
          h('div',{class:'mb-shell-balance-mode-copy'},
            h('span',{class:'k'}, vpLang4('Platform mode','وضع المنصة','Режим платформы','प्लेटफॉर्म मोड')),
            h('strong',{class:'v'}, activeAccountLabel),
            h('span',{class:'s'}, `${activeAccountNo} • ${modeHint}`)
          ),
          vpHeaderModeToggle({mode, compact:true, onAfter:()=>{ try{ state.__vpHeaderBalancesOpen = true; }catch(e){} }})
        ),
        h('div',{'data-topbar-balance-live-available':'1'}, desktopBalanceItem(vpLang4('Live available','المتاح الحقيقي','Доступно на live','लाइव उपलब्ध'), money(liveAvailable,2), accountNo('live') || '—', 'up')),
        h('div',{'data-topbar-balance-live-equity':'1'}, desktopBalanceItem(vpLang4('Live equity','الإيكويتي الحقيقي','Live equity','लाइव इक्विटी'), money(Number(liveSnap.equity || 0),2), percentText(Number(state.realPnlStats?.pnl_24h || 0)), 'up')),
        h('div',{'data-topbar-balance-demo-equity':'1'}, desktopBalanceItem(vpLang4('Demo equity','الإيكويتي التجريبي','Demo equity','डेमो इक्विटी'), money(Number(demoSnap.equity || 0),2), accountNo('demo') || '—', 'ghost')),
        h('div',{'data-topbar-balance-active-equity':'1'}, desktopBalanceItem(activeAccountLabel, money(Number(snap.equity || 0),2), activeAccountNo, mode === 'real' ? 'up' : 'ghost')),
        h('div',{'data-topbar-balance-free-margin':'1'}, desktopBalanceItem(vpLang4('Free margin','الهامش الحر','Свободная маржа','फ्री मार्जिन'), money(Number(snap.freeMargin || snap.availableCash || snap.equity || 0),2), vpLang4('Ready for orders','جاهز للتنفيذ','Готово к ордерам','ऑर्डर के लिए तैयार'), '')),
        h('div',{'data-topbar-balance-pnl24':'1'}, desktopBalanceItem(vpLang4('24h change','تغير 24 ساعة','Изменение 24ч','24घं बदलाव'), percentText(Number(opts?.pnl24 || 0)), mode === 'real' ? vpLang4('Live account performance','أداء الحساب الحقيقي','Производительность live-счёта','लाइव अकाउंट प्रदर्शन') : vpLang4('Demo account performance','أداء الحساب التجريبي','Производительность демо-счёта','डेमो अकाउंट प्रदर्शन'), Number(opts?.pnl24 || 0) >= 0 ? 'up' : 'down'))
      )
    );
  }


  function desktopPrimaryNav(meta){
    return h('div',{class:'mb-header-nav mb-header-nav--hidden', 'aria-hidden':'true'});
  }

  function desktopModeSwitcher(){
    const current = String(state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
    const kycStatus = String(state.onboardingStatus?.kyc?.status || state.kycStatus?.status || state.kycStatus || 'none').toLowerCase();
    const liveReady = kycStatus === 'approved';
    return h('div',{class:'mb-shell-mode-card'},
      h('div',{class:'mb-shell-mode-copy'},
        h('span',{class:'k'}, vpLang4('Platform mode','وضع المنصة','Режим платформы','प्लेटफॉर्म मोड')),
        h('strong',{class:'v'}, current === 'real' ? vpLang4('Real account','الحساب الحقيقي','Реальный счёт','रियल अकाउंट') : vpLang4('Demo account','حساب الديمو','Демо счёт','डेमो अकाउंट')),
        h('span',{class:'s'}, current === 'real'
          ? (liveReady ? vpLang4('Live tools enabled','الأدوات الحقيقية مفعلة','Реальные инструменты включены','लाइव टूल्स सक्रिय') : vpLang4('KYC approval required','يلزم اعتماد KYC','Требуется одобрение KYC','KYC स्वीकृति आवश्यक'))
          : vpLang4('Funding and live-only actions stay disabled','التمويل والميزات الحقيقية معطلة','Финансирование и real-функции отключены','फंडिंग और लाइव फीचर बंद हैं'))
      ),
      vpHeaderModeToggle({mode:current})
    );
  }

  function desktopProfileDropdown(opts={}){

    try{
      const modeLabel = String(opts?.activeAccountLabel || vpLang4('Live','حقيقي','Live','Live'));
      const accountNoValue = String(opts?.activeAccountNo || '—');
      const me = state.me || {};
      const displayName = String(me.name || [me.first_name, me.last_name].filter(Boolean).join(' ') || me.username || vpLang4('VertexPluse User','مستخدم VertexPluse','Пользователь VertexPluse','VertexPluse उपयोगकर्ता'));
      const email = String(me.email || me.phone || me.mobile || vpLang4('No contact attached','لا توجد وسيلة تواصل','Нет контактов','कोई संपर्क नहीं'));
      const initials = displayName.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase() || 'VP';
      const closeProfile = ()=>{ try{ state.__vpHeaderProfileOpen = false; }catch(e){} };
      const go = (href)=>{ closeProfile(); location.hash = href; render(); };
      return h('details',{
          class:'mb-shell-profile',
          open: state.__vpHeaderProfileOpen ? true : null,
          ontoggle:(e)=>{ try{ state.__vpHeaderProfileOpen = !!(e.currentTarget && e.currentTarget.open); }catch(_e){} }
        },
        h('summary',{class:'mb-shell-profile-trigger', role:'button', 'aria-label':vpLang4('Open profile menu','افتح قائمة الحساب','Открыть меню профиля','प्रोफाइल मेन्यू खोलें')},
          h('span',{class:'mb-shell-profile-avatar','aria-hidden':'true'}, initials),
          h('span',{class:'mb-shell-profile-copy'},
            h('strong',{class:'n'}, displayName),
            h('span',{class:'s'}, `${modeLabel} • ${accountNoValue}`)
          ),
          h('span',{class:'mb-shell-profile-arrow','aria-hidden':'true'}, '▾')
        ),
        h('div',{class:'mb-shell-profile-pop'},
          h('div',{class:'mb-shell-profile-head'},
            h('div',{class:'mb-shell-profile-avatar lg','aria-hidden':'true'}, initials),
            h('div',{class:'mb-shell-profile-headcopy'},
              h('strong',{}, displayName),
              h('span',{}, email),
              h('span',{}, `${modeLabel} • ${accountNoValue}`)
            )
          ),
          h('div',{class:'mb-shell-profile-grid'},
            h('button',{class:'mb-shell-profile-link', type:'button', onclick:()=>go('#/account')},
              h('strong',{}, safeT('nav.account','Account')),
              h('span',{}, vpLang4('Profile, security, and account settings','الملف الشخصي والأمان وإعدادات الحساب','Профиль, безопасность и настройки счёта','प्रोफाइल, सुरक्षा और अकाउंट सेटिंग्स'))
            ),
            h('button',{class:'mb-shell-profile-link', type:'button', onclick:()=>go('#/wallet')},
              h('strong',{}, safeT('nav.transactions','Payments')),
              h('span',{}, vpLang4('Deposit, withdraw, and review funding history','إيداع وسحب ومراجعة سجل التمويل','Пополнение, вывод и история операций','जमा, निकासी और फंडिंग इतिहास'))
            ),
            h('button',{class:'mb-shell-profile-link', type:'button', onclick:()=>go('#/kyc')},
              h('strong',{}, safeT('kyc.title','Verification')),
              h('span',{}, vpLang4('Keep your live account fully verified','أكمل التحقق لحسابك الحقيقي','Держите счёт полностью верифицированным','अपने लाइव अकाउंट को पूरी तरह सत्यापित रखें'))
            ),
            h('button',{class:'mb-shell-profile-link', type:'button', onclick:()=>go('#/support')},
              h('strong',{}, safeT('support.title','Support')),
              h('span',{}, vpLang4('Open tickets and follow agent replies','افتح التذاكر وتابع ردود الدعم','Открывайте тикеты и отслеживайте ответы','टिकट खोलें और उत्तर देखें'))
            )
          ),
          h('div',{class:'mb-shell-profile-actions'},
            h('button',{class:'btn primary', type:'button', onclick:()=>{ closeProfile(); if(typeof requireRealWorkflowAccess === 'function' && !requireRealWorkflowAccess('deposit')) return; walletDepositFlow().catch(()=>{}); }}, safeT('wallet.deposit','Deposit')),
            mbLanguageMenuNode(state.lang, 'mb-shell-lang-menu profile-lang-menu')
          ),
          h('button',{class:'mb-shell-profile-logout', type:'button', onclick:()=>{ closeProfile(); window.location.href = '/logout.php'; }}, safeT('settings.logout','Log Out'))
        )
      );
    }catch(err){
      try{ console.warn('desktopProfileDropdown fallback', err); }catch(_e){}
      const modeLabel = String(opts?.activeAccountLabel || vpLang4('Live','حقيقي','Live','Live'));
      const accountNoValue = String(opts?.activeAccountNo || '—');
      const me = state.me || {};
      const displayName = String(me.name || [me.first_name, me.last_name].filter(Boolean).join(' ') || me.username || 'VP');
      const initials = displayName.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase() || 'VP';
      return h('button',{
        class:'mb-shell-profile-trigger mb-shell-profile-trigger--fallback',
        type:'button',
        onclick:()=>{ location.hash = '#/account'; render(); },
        title:vpLang4('Open account','افتح الحساب','Открыть аккаунт','अकाउंट खोलें')
      },
        h('span',{class:'mb-shell-profile-avatar','aria-hidden':'true'}, initials),
        h('span',{class:'mb-shell-profile-copy'},
          h('strong',{class:'n'}, displayName),
          h('span',{class:'s'}, `${modeLabel} • ${accountNoValue}`)
        )
      );
    }
  }

  function desktopNotificationButton(unread){
    return h('button',{
        class:'mb-shell-notify-btn' + (unread > 0 ? ' has-badge' : ''),
        type:'button',
        onclick:async()=>{ try{ await refreshNotificationsData(true); }catch(e){} location.hash = '#/notifications'; },
        title:vpLang4('Notifications','التنبيهات','Уведомления','सूचनाएं')
      },
      vpBellIcon(),
      unread > 0 ? h('span',{class:'mb-shell-notify-badge'}, String(unread > 99 ? '99+' : unread)) : null
    );
  }

  function vpBellIcon(){
    return h('svg',{viewBox:'0 0 24 24','aria-hidden':'true',class:'vp-bell-ico'},
      h('path',{d:'M12 3a4 4 0 0 0-4 4v1.3c0 .94-.32 1.84-.92 2.56L5.8 12.4A2.2 2.2 0 0 0 7.5 16h9a2.2 2.2 0 0 0 1.7-3.6l-1.28-1.54A4 4 0 0 1 16 8.3V7a4 4 0 0 0-4-4Z',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round'}),
      h('path',{d:'M10 18a2 2 0 0 0 4 0',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round'})
    );
  }

  function utilityPageMobileShell(meta){
    const isSupport = meta?.key === 'support';
    const isNotifications = meta?.key === 'notifications';
    if(!isSupport && !isNotifications) return null;
    const primaryCount = isSupport
      ? Number(Array.isArray(state.supportTickets) ? state.supportTickets.length : 0)
      : Number(Array.isArray(buildNotificationsFeed()) ? buildNotificationsFeed().length : 0);
    const secondaryCount = isSupport
      ? Number((typeof supportUnreadCount === 'function' ? supportUnreadCount() : 0) || 0)
      : Number(notificationsUnreadCount() || 0);
    const prevHash = String(state.__vpPrevHash || '#/home');
    const backHash = (!prevHash || prevHash.startsWith('#/support') || prevHash.startsWith('#/notifications')) ? '#/home' : prevHash;
    return h('div',{class:'mb-shell-mobile mb-shell-mobile-utility clean'},
      h('div',{class:'mb-mobile-utility-header'},
        h('button',{class:'mb-mobile-back-btn', type:'button', onclick:()=>{ location.hash = backHash; }, 'aria-label':vpLang4('Go back','رجوع','Назад','वापस')}, '‹'),
        h('div',{class:'mb-mobile-utility-headcopy'},
          h('div',{class:'mb-mobile-utility-title'}, isSupport ? safeT('support.title','Support') : vpLang4('Notifications','التنبيهات','Уведомления','सूचनाएं')),
          h('div',{class:'mb-mobile-utility-sub'}, isSupport ? vpLang4('Client tickets and reply tracking','تذاكر العميل وتتبع الردود','Клиентские тикеты и ответы','क्लाइंट टिकट और उत्तर') : vpLang4('Funding, KYC, support, and platform updates','تحديثات التمويل والتحقق والدعم والمنصة','Пополнения, KYC, поддержка и обновления','फंडिंग, KYC, सहायता और अपडेट'))
        ),
        h('div',{class:'mb-mobile-utility-headactions'},
          secondaryCount > 0 ? h('span',{class:'pill warn'}, String(secondaryCount)) : h('span',{}),
          h('button',{class:'mb-mobile-mini-action is-bell', type:'button', onclick:()=>{ if(!isNotifications){ location.hash = '#/notifications'; } }, title:vpLang4('Notifications','التنبيهات','Уведомления','सूचनाएं')}, vpBellIcon())
        )
      ),
      h('div',{class:'mb-mobile-utility-toolbar clean'},
        h('div',{class:'utility-switch-pair wide'},
          h('button',{class:'btn slim ' + (isSupport ? 'primary' : 'outline'), type:'button', onclick:()=>{ if(!isSupport){ location.hash = '#/support'; }}}, vpLang4('Support','الدعم','Поддержка','सपोर्ट')),
          h('button',{class:'btn slim ' + (isNotifications ? 'primary' : 'outline'), type:'button', onclick:()=>{ if(!isNotifications){ location.hash = '#/notifications'; }}}, vpLang4('Notifications','التنبيهات','Уведомления','सूचनाएं'))
        ),
        mbLanguageMenuNode(state.lang, 'utility-lang-menu')
      ),
      h('div',{class:'mb-mobile-strip mb-mobile-strip-utility mb-mobile-strip-utility-compact clean'},
        desktopStat(isSupport ? vpLang4('Open tickets','التذاكر المفتوحة','Открытые тикеты','ओपन टिकट') : vpLang4('Total items','إجمالي العناصر','Всего элементов','कुल आइटम'), String(primaryCount)),
        desktopStat(isSupport ? vpLang4('Unread replies','الردود غير المقروءة','Непрочитанные ответы','अनरीड रिप्लाइ') : vpLang4('Unread','غير مقروء','Непрочитано','अनरीड'), String(secondaryCount), secondaryCount > 0 ? 'warn' : '')
      )
    );
  }

  function topBar(){
    const meta = routeMeta();
    const isMenuOpen = !!state.__vpMobileMenuOpen;
    const mode = state.tradeMode === 'real' ? 'real' : 'demo';
    const snap = portfolioSnapshot(mode);
    const liveSnap = portfolioSnapshot('real');
    const demoSnap = portfolioSnapshot('demo');
    const pnl24 = mode === 'real' ? Number(state.realPnlStats?.pnl_24h || 0) : Number(state.pnlStats?.pnl_24h || 0);
    const activeAccountNo = state.tradeMode === 'real'
      ? (state.me?.live_account?.account_no || accNo())
      : (state.me?.demo_account?.account_no || accountNo('demo'));
    const activeAccountLabel = state.tradeMode === 'real'
      ? vpLang4('Live','حقيقي','Live','Live')
      : vpLang4('Demo','تجريبي','Demo','Demo');
    const shell = h('div',{class:'card vp-topbar mb-topbar ' + (isMenuOpen ? 'menu-open' : '')},
      h('div',{class:'mb-shell-desktop with-brand-shell compact-brand-shell'},
        h('button',{class:'mb-shell-brand compact-header-logo', type:'button', onclick:()=>{ location.hash = '#/home'; }, 'aria-label':vpLang4('Go to home','اذهب للرئيسية','Перейти на главную','होम पर जाएं')},
          h('span',{class:'mb-shell-brand-logo-wrap'},
            h('div',{id:'brandMarkDesktop', class:'vp-brandmark mb-shell-brandmark compact-header-brandmark'})
          )
        ),
        desktopModeSwitcher(),
        h('div',{class:'mb-shell-right desktop-pro-right'},
          h('div',{class:'mb-shell-balance-wrap primary-only'},
            (function(){ try{ return desktopBalanceDropdown({
              mode,
              liveSnap,
              demoSnap,
              snap,
              pnl24,
              activeAccountLabel,
              activeAccountNo
            }); }catch(err){ try{ console.warn('desktopBalanceDropdown fallback', err); }catch(_e){} return null; } })()
          ),
          h('div',{class:'mb-shell-right-actions'},
            quickActionButton(safeT('wallet.deposit','Deposit'), 'primary mb-shell-deposit-btn', ()=>{ if(typeof requireRealWorkflowAccess === 'function' && !requireRealWorkflowAccess('deposit')) return; walletDepositFlow().catch(()=>{}); }),
            desktopNotificationButton(notificationsUnreadCount()),
            desktopProfileDropdown({ activeAccountLabel, activeAccountNo })
          )
        )
      ),
      ((meta.key === 'support' || meta.key === 'notifications')
        ? utilityPageMobileShell(meta)
        : h('div',{class:'mb-shell-mobile ' + ((['wallet'].includes(meta.key)) ? 'mb-shell-mobile-utility' : '')},
            h('div',{class:'mb-mobile-row mb-mobile-row-shell vp-mobile-header-balanced'},
              h('button',{class:'mb-menu-toggle mb-head-slot-left vp-header-btn vp-header-left', type:'button', onclick:(e)=>{ try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){} vpOpenMainMobileMenu(); return false; }, 'aria-label':'Open menu'},
                h('span',{}), h('span',{}), h('span',{})
              ),
              h('div',{class:'mb-mobile-header-slot center vp-header-center'},
                h('div',{class:'mb-mobile-brand simple mb-head-slot-center vp-header-brand'},
                  h('div',{id:'brandMarkMobile', class:'vp-brandmark mb-mobile-brandmark vp-header-logo'})
                )
              ),
              h('button',{class:'mb-mobile-mini-action is-bell has-badge mb-head-slot-right vp-header-btn vp-header-right', type:'button', onclick:()=>{ location.hash = '#/notifications'; }, title:'Notifications'},
                vpBellIcon(),
                notificationsUnreadCount() > 0 ? h('span',{class:'mb-mini-action-badge'}, String(notificationsUnreadCount() > 99 ? '99+' : notificationsUnreadCount())) : null
              )
            ),
            (function(){
              if(meta.key === 'wallet'){
                const depItems = (state.depositsList && Array.isArray(state.depositsList.items)) ? state.depositsList.items : [];
                const wdrItems = (state.withdrawalsList && Array.isArray(state.withdrawalsList.items)) ? state.withdrawalsList.items : [];
                const isPending = (it)=>!['approved','completed','confirmed','done'].includes(String(it?.status || '').toLowerCase()) && !['rejected','cancelled','failed'].includes(String(it?.status || '').toLowerCase());
                return h('div',{class:'mb-mobile-strip mb-mobile-strip-utility'},
                  desktopStat('Live available', money(liveSnap.freeMargin || liveSnap.availableCash || liveSnap.equity || 0, 2), '', accountNo('live')),
                  desktopStat('Pending', String(depItems.filter(isPending).length + wdrItems.filter(isPending).length), '', 'Funding')
                );
              }
              return h('div',{class:'mb-mobile-strip'},
                h('div',{'data-home-mobile-topbar-equity':'1'}, desktopStat('Equity', money(snap.equity, 2), pnl24 >= 0 ? 'up' : 'down', percentText(pnl24))),
                h('div',{'data-home-mobile-topbar-account':'1'}, desktopStat('Account', String(activeAccountNo || '—'), '', accountLabel(state.tradeMode === 'real' ? 'live' : 'demo')))
              );
            })()
          )),
      isMenuOpen ? (function(){
        try{
        const me = state.me || {};
        const displayName = String(me.name || [me.first_name, me.last_name].filter(Boolean).join(' ') || me.username || 'VertexPluse User');
        const email = String(me.email || 'No email attached');
        const phone = String(me.phone || me.mobile || me.telegram_phone || '—');
        const initials = displayName.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase() || 'VP';
        const activeEq = money(snap.equity,2);
        const activeMode = state.tradeMode === 'real' ? safeT('trade.mode_real','Real') : safeT('trade.mode_demo','Demo');
        const menuSection = String(state.__vpMobileMenuSection || 'main');
        const previewMode = String(state.__vpMenuAccountMode || state.tradeMode || 'real').toLowerCase() === 'demo' ? 'demo' : 'real';
        const previewStats = mobileTradingAccountStats(previewMode);
        const kycStatus = String(state.onboardingStatus?.kyc?.status || state.kycStatus || 'none').toLowerCase();
        const needsLiveAccount = previewMode === 'real' && !['approved','pending','under_review'].includes(kycStatus);
        const drawerTop = h('div',{class:'mb-account-menu-top'},
          h('div',{class:'mb-account-menu-top-left'},
            h('span',{class:'mb-account-menu-mini'}, '◔'),
            h('select', {class:'input langSel mb-lang mb-account-menu-lang', onchange:(e)=>{state.lang=e.target.value; localStorage.setItem('lang', state.lang); mobileMenuClose(); boot();}},
                ...mbLanguageOptionNodes(state.lang)
              )
          ),
          h('button',{class:'mb-account-menu-close', type:'button', onclick:()=>{ mobileMenuClose(); render(); }, 'aria-label':'Close menu'}, '✕')
        );

        const divider = h('div',{class:'mb-account-menu-divider'});
        const menuRow = (title, sub, onClick, ico, tone)=>drawerActionRow(title, sub, onClick, ico, tone);
        const mainContent = h('div',{class:'mb-account-menu-page'},
          drawerTop,
          h('div',{class:'mb-drawer-scroll mb-drawer-scroll-main', 'data-scroll-key':'mobile-menu-main'},
            h('div',{class:'mb-account-menu-accent'}),
            h('div',{class:'mb-account-menu-title'}, safeT('nav.account','Account')),
            h('div',{class:'mb-account-menu-card ref-flat vp-account-menu-compact-card'},
              h('div',{class:'mb-account-menu-avatar'}, initials),
              h('div',{class:'mb-account-menu-meta'},
                h('div',{class:'mb-account-menu-name'}, displayName),
                h('div',{class:'mb-account-menu-email-single', title:email}, email)
              )
            ),
            divider,
            h('div',{class:'vp-account-no-card ref-flat'},
              h('div',{class:'vp-account-no-copy-wrap'},
                h('div',{class:'vp-account-no-k'}, 'Trading account number'),
                h('div',{class:'vp-account-no-v'}, String(activeAccountNo || '#####'))
              ),
              h('button',{class:'btn outline small vp-account-copy-btn', type:'button', onclick:()=>{ try{ navigator.clipboard && navigator.clipboard.writeText(String(activeAccountNo || '')); toast(vpLang4('Account number copied','تم نسخ رقم الحساب','Номер счёта скопирован','खाता संख्या कॉपी हो गई')); }catch(_e){} }}, 'Copy')
            ),
            h('div',{class:'mb-account-menu-section-label'}, 'FUNDS'),
            h('div',{class:'mb-account-menu-list flat ref'},
              menuRow('Deposit', 'Fund your live account', ()=>mobileMenuGo('#/wallet?tab=deposit'), '◫'),
              menuRow('Withdrawals', 'Request payout review', ()=>mobileMenuGo('#/wallet?tab=withdraw'), '◎'),
                            
            ),
            h('div',{class:'mb-account-menu-section-label'}, 'MY PROFILE'),
            h('div',{class:'mb-account-menu-list flat ref'},
              menuRow('Account', 'Profile, security, and personal settings', ()=>mobileMenuGo('#/account'), '◔'),
              menuRow('Identity Verification', 'Review the KYC status and required documents', ()=>mobileMenuGo('#/kyc'), '◈')
            ),
            h('div',{class:'mb-account-menu-section-label'}, 'APPLICATION'),
            h('div',{class:'mb-account-menu-list flat ref'},
              menuRow('Trading Accounts', 'Live and demo account details', ()=>{ state.__vpMenuAccountMode = state.tradeMode === 'real' ? 'real' : 'demo'; mobileMenuSetSection('trading-accounts'); }, '⇄')
            ),
            h('div',{class:'mb-account-menu-section-label'}, 'ACCOUNT'),
            h('div',{class:'mb-account-menu-list flat ref'},
              menuRow(safeT('settings.logout','Log Out'), 'Close the current session on this device', ()=>{ window.location.href='/logout.php'; }, '⇥', 'danger')
            ),
            h('div',{class:'mb-account-menu-logout-line'})
          )
        );

        const statRow = (label, value, suffix='')=>h('div',{class:'mb-account-stats-row'},
          h('span',{}, label),
          h('div',{class:'mb-account-stats-value'}, h('strong',{}, value), suffix ? h('small',{}, suffix) : null)
        );

        const tradingContent = h('div',{class:'mb-account-menu-page'},
          drawerTop,
          h('div',{class:'mb-drawer-scroll mb-account-drawer-scroll-tight', 'data-scroll-key':'mobile-menu-trading'},
            h('div',{class:'mb-account-menu-topnav'},
              h('button',{class:'mb-account-back-btn', type:'button', onclick:()=>mobileMenuSetSection('main')}, '‹'),
              h('div',{class:'mb-account-menu-title mb-account-menu-title-inline'}, 'Trading Accounts')
            ),
            h('div',{class:'mb-account-menu-hero-lite'},
              h('div',{class:'mb-account-menu-section-label'}, 'ACTIVE TRADING ACCOUNT'),
              h('div',{class:'mb-account-menu-hero-account'}, previewStats.accountNo),
              h('div',{class:'mb-account-menu-hero-mode'}, `${previewStats.label} • 1:${previewStats.leverage}`)
            ),
            h('div',{class:'mb-account-stats-card'},
              statRow('Available Balance', money(previewStats.available, 2)),
              statRow('Equity', money(previewStats.equity, 2)),
              statRow('P&L', `${previewStats.pnl >= 0 ? '+' : ''}${fmt(previewStats.pnl, 2)}`, 'USD'),
              statRow('Margin', money(previewStats.margin, 2)),
              statRow('Margin Level', fmt(previewStats.marginLevel, 2), '%'),
              statRow('Free Margin', money(previewStats.freeMargin, 2)),
              statRow('Rewards', fmt(previewStats.rewards, 0))
            ),
            h('div',{class:'mb-account-switch-label'}, 'Switch Account'),
            h('div',{class:'mb-account-switch-tabs'},
              h('button',{class:previewMode === 'real' ? 'active' : '', type:'button', onclick:()=>{ state.__vpMenuAccountMode = 'real'; render(); }}, 'Live'),
              h('button',{class:previewMode === 'demo' ? 'active' : '', type:'button', onclick:()=>{ state.__vpMenuAccountMode = 'demo'; render(); }}, 'Demo')
            ),
            h('div',{class:'mb-account-trading-card'},
              h('div',{class:'mb-account-trading-icon'}, '⇄'),
              h('div',{class:'mb-account-trading-title'}, needsLiveAccount ? 'Start earning real profits!' : `${previewMode === 'real' ? 'Live' : 'Demo'} account ready`),
              h('div',{class:'mb-account-trading-sub'}, needsLiveAccount
                ? 'Verify your identity to open a Live Account and keep your Demo Account for ongoing practice.'
                : (previewMode === 'real'
                  ? 'Use your live account for funding, execution, and real portfolio tracking.'
                  : 'Practice strategies on your demo account before switching to live execution.')),
              h('button',{class:'btn primary mb-account-open-live', type:'button', onclick:async()=>{
                if(needsLiveAccount){ mobileMenuClose(); openKycFlow().catch(()=>{}); return; }
                const switched = (typeof requestTradeModeSwitch === 'function') ? await requestTradeModeSwitch(previewMode) : (setTradeMode(previewMode), true); if(!switched) return;
                Promise.allSettled([
                  refreshWalletSummary(true),
                  refreshPortfolio({force:true, mode:'demo'}),
                  refreshRealPortfolio(true),
                  refreshPnlStats({mode:'demo'}),
                  refreshRealPnlStats()
                ]).then(()=>{ mobileMenuGo('#/trade'); render(); });
              }}, needsLiveAccount ? 'Open Live Account' : `Use ${previewMode === 'real' ? 'Live' : 'Demo'} Account`)
            )
          )
        );

        return h('div',{class:'mb-mobile-menu-wrap'},
          h('button',{class:'mb-mobile-menu-backdrop', type:'button', onclick:()=>{ mobileMenuClose(); render(); }, 'aria-label':'Close menu'}),
          h('aside',{class:'mb-mobile-drawer mb-mobile-account-drawer', onclick:(e)=>e.stopPropagation()},
            menuSection === 'trading-accounts' ? tradingContent : mainContent
          )
        );
        }catch(menuErr){
          return vpRenderMobileMenuFallback(menuErr);
        }
      })() : null
    );
    setTimeout(()=>{
      try{ mountLogo('brandMarkDesktop'); }catch(e){}
      try{ mountLogo('brandMarkMobile'); }catch(e){}
      try{ mountLogo('brandMarkDrawer'); }catch(e){}
    }, 0);
    return shell;
  }


  function vpIsNavActive(href){
    const hash = String(location.hash || '#/home');
    if(href === '#/home') return (!hash || hash === '#' || hash.startsWith('#/home'));
    if(href === '#/portfolio') return hash.startsWith('#/portfolio');
    if(href === '#/wallet') return hash.startsWith('#/wallet') || hash.startsWith('#/account');
    return hash.startsWith(href);
  }

  function vpNavIcon(kind){
    const common = {viewBox:'0 0 24 24','aria-hidden':'true'};
    const stroke = {fill:'none', stroke:'currentColor', 'stroke-width':'1.9', 'stroke-linecap':'round', 'stroke-linejoin':'round'};
    if(kind === 'home') return h('svg', common,
      h('path', Object.assign({d:'M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z'}, stroke))
    );
    if(kind === 'portfolio') return h('svg', common,
      h('path', Object.assign({d:'M5 18h14'}, stroke)),
      h('path', Object.assign({d:'M7 15V9'}, stroke)),
      h('path', Object.assign({d:'M12 15V6'}, stroke)),
      h('path', Object.assign({d:'M17 15v-4'}, stroke))
    );
    if(kind === 'markets') return h('svg', common,
      h('rect', Object.assign({x:'4', y:'5', width:'16', height:'14', rx:'3'}, stroke)),
      h('path', Object.assign({d:'M7 15l3-3 3 2 4-5'}, stroke))
    );
    if(kind === 'trade') return h('svg', common,
      h('path', Object.assign({d:'M7 7h10M7 12h10M7 17h10'}, stroke)),
      h('path', Object.assign({d:'M10 5L7 7l3 2'}, stroke)),
      h('path', Object.assign({d:'M14 10l3 2-3 2'}, stroke))
    );
    if(kind === 'invest') return h('svg', common,
      h('circle', {cx:'12', cy:'12', r:'8', fill:'none', stroke:'currentColor', 'stroke-width':'1.9'}),
      h('path', Object.assign({d:'M12 8v8M9 10.5c0-1 1.1-1.8 2.5-1.8s2.5.8 2.5 1.8-1 1.5-2.5 1.8-2.5.8-2.5 1.8 1.1 1.8 2.5 1.8 2.5-.8 2.5-1.8'}, stroke))
    );
    if(kind === 'wallet') return h('svg', common,
      h('path', Object.assign({d:'M5 8.5A2.5 2.5 0 0 1 7.5 6H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 1 5 15.5v-7z'}, stroke)),
      h('path', Object.assign({d:'M5 9h12.5'}, stroke)),
      h('circle', {cx:'16.5', cy:'13', r:'1.2', fill:'currentColor'})
    );
    return h('span',{class:'mb-nav-ico-dot'}, '•');
  }

  navLink = function(href, label){
    const active = vpIsNavActive(href);
    let kind = 'home';
    if(href === '#/portfolio') kind = 'portfolio';
    else if(href === '#/markets') kind = 'markets';
    else if(href === '#/trade') kind = 'trade';
    else if(href === '#/invest') kind = 'invest';
    else if(href === '#/wallet') kind = 'wallet';
    return h('a', {href, class: active ? 'active' : ''},
      h('span',{class:'mb-nav-ico'}, vpNavIcon(kind)),
      h('div', {class:'tiny'}, label)
    );
  };

  nav = function(){
    return h('div',{class:'nav mb-nav'},
      h('div',{class:'wrap'},
        h('div',{class:'mb-nav-brand'},
          h('div',{class:'mb-nav-brand-mark'}, 'V'),
          h('div',{class:'mb-nav-brand-name'}, 'Vertex')
        ),
        navLink('#/home', safeT('nav.home','Home')),
        navLink('#/portfolio', safeT('nav.portfolio','Portfolio')),
        navLink('#/trade', safeT('nav.trade','Trade')),
        navLink('#/invest', safeT('nav.earn', safeT('nav.invest','Earn'))),
        navLink('#/wallet', safeT('nav.assets', safeT('nav.funds','Assets')))
      )
    );
  };

  function popularRow(item){
    const ch = Number(item.change_pct || 0);
    return h('button',{class:'mb-popular-row', onclick:()=>setSymbolAndGo(item), 'data-home-live-symbol': String(item?.symbol || '').toUpperCase(), 'data-home-live-type': vpNormalizeAssetType(item?.type || ''), 'data-home-live-role':'popular'},
      h('div',{class:'mb-popular-left'},
        vpMarketAvatar(item, item?.symbol, 'sm popular'),
        h('div',{},
          h('div',{class:'mb-popular-title'}, String(item.symbol || '—')),
          h('div',{class:'mb-popular-sub'}, instrumentName(item))
        )
      ),
      h('div',{class:'mb-popular-right'},
        h('div',{class:'mb-popular-price', 'data-home-live-price':'1'}, money(Number(item.price || 0), Number(item.price || 0) < 1 ? 4 : 2)),
        h('div',{class:'mb-popular-change ' + (ch >= 0 ? 'up' : 'down'), 'data-home-live-change':'1'}, percentText(ch))
      )
    );
  }

  function vpPrimeWorkspace(flagKey, tasks){
    const flag = String(flagKey || '').trim();
    if(!flag || state[flag]) return;
    state[flag] = true;
    Promise.allSettled((Array.isArray(tasks) ? tasks : []).map(task=>{
      try{ return typeof task === 'function' ? task() : task; }catch(e){ return Promise.resolve(); }
    })).then(()=>{ try{ render(); }catch(e){} }).catch(()=>{}).finally(()=>{ state[flag] = false; });
  }

  function vpSortByRecent(items, selectors){
    const list = Array.isArray(items) ? items.slice() : [];
    const picks = Array.isArray(selectors) && selectors.length ? selectors : [it=>it?.updated_at || it?.created_at || 0];
    return list.sort((a,b)=>{
      const aTs = picks.reduce((out, pick)=> out || vpEpoch(typeof pick === 'function' ? pick(a) : 0), 0);
      const bTs = picks.reduce((out, pick)=> out || vpEpoch(typeof pick === 'function' ? pick(b) : 0), 0);
      return bTs - aTs;
    });
  }

  homePage = function(){
    const __vpSignalDeskNow = Date.now();
    vpPrimeWorkspace('__vpHomeDesktopPriming', [
      ()=> state.realPortfolio ? Promise.resolve(state.realPortfolio) : refreshRealPortfolio(),
      ()=> state.realPnlStats ? Promise.resolve(state.realPnlStats) : refreshRealPnlStats(),
      ()=> state.markets ? Promise.resolve(state.markets) : refreshMarkets(),
      ()=> state.newsFeed ? Promise.resolve(state.newsFeed) : refreshNewsFeed(),
      ()=> state.supportTickets ? Promise.resolve(state.supportTickets) : refreshSupportTickets(),
      ()=> state.__dashboardLevelData ? Promise.resolve(state.__dashboardLevelData) : refreshDashboardLevelData(true),
      ()=> ((!Array.isArray(state.tradingBotSignals) || !state.tradingBotSignals.length) && (!state.__homeSignalRefreshAt || (__vpSignalDeskNow - Number(state.__homeSignalRefreshAt || 0)) > 12000)) ? (state.__homeSignalRefreshAt = __vpSignalDeskNow, refreshTradingBotSignals(true)) : Promise.resolve(state.tradingBotSignals),
      ()=> Array.isArray(state.myTradingBotSubs) ? Promise.resolve(state.myTradingBotSubs) : refreshMyTradingBotSubs()
    ]);

    const snap = portfolioSnapshot('real');
    const liveRows = curatedMarketRows('all', {limit: 120, allowZeroChange: true});
    const gainers = liveRows.filter(x=>Number(x.change_pct || 0) > 0).sort((a,b)=>Number(b.change_pct||0)-Number(a.change_pct||0)).slice(0,5);
    const losers = liveRows.filter(x=>Number(x.change_pct || 0) < 0).sort((a,b)=>Number(a.change_pct||0)-Number(b.change_pct||0)).slice(0,5);
    const popularSeed = curatedMarketRows('favorites', {limit: 6, allowZeroChange: true}).concat(curatedMarketRows(state.selectedAssetType || 'crypto', {limit: 10, allowZeroChange: true, preferSignals: true}));
    const popular = [];
    const popularSeen = new Set();
    for(const item of popularSeed){
      const sym = String(item?.symbol || '').toUpperCase();
      if(!sym || popularSeen.has(sym)) continue;
      popularSeen.add(sym);
      popular.push(item);
      if(popular.length >= 8) break;
    }

    const ob = state.onboardingStatus || null;
    const levelData = state.__dashboardLevelData || {};
    const currentLevel = levelData?.current || state.me?.user_level || null;
    const nextLevel = levelData?.next || state.me?.next_level || null;
    const confirmedDeposits = Number(levelData?.confirmed_deposit_total ?? state.me?.confirmed_deposit_total ?? 0);
    const levelList = Array.isArray(levelData?.levels) ? levelData.levels.slice().sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)) : [];
    const currentIdx = currentLevel ? Math.max(0, levelList.findIndex(l=>String(l.id||'')===String(currentLevel.id||'') || String(l.level_code||'')===String(currentLevel.level_code||''))) : 0;
    const resolvedCurrent = currentLevel || levelList[currentIdx] || null;
    const resolvedNext = (nextLevel && String(nextLevel.id||'') !== String(resolvedCurrent?.id||'')) ? nextLevel : (levelList[currentIdx + 1] || null);
    const currentLevelName = vpLevelDisplayName(resolvedCurrent, currentIdx + 1);
    const currentTone = vpLevelTone(resolvedCurrent, currentIdx + 1);
    const currentMin = Number(resolvedCurrent?.min_deposit_total || 0);
    const nextMin = Number(resolvedNext?.min_deposit_total || currentMin || 0);
    const targetGap = Math.max(0, nextMin - currentMin);
    const levelProgress = resolvedNext ? Math.max(0, Math.min(100, targetGap > 0 ? ((confirmedDeposits - currentMin) / targetGap) * 100 : 100)) : 100;
    const desktopLevelCardNode = (lvl, opts={})=>{
      const idx = Number(opts.index || 1);
      const isLocked = !!opts.locked;
      const name = vpLevelDisplayName(lvl, idx);
      const tone = vpLevelTone(lvl, idx);
      const perks = vpLevelPerks(lvl);
      const minTotal = Number(lvl?.min_deposit_total || 0);
      const remain = Math.max(0, minTotal - confirmedDeposits);
      return h('div',{class:`mb-home-level-snap tone-${tone}${isLocked ? ' is-locked' : ' is-current'}`},
        h('div',{class:'mb-home-level-snap-top'},
          h('div',{class:'mb-home-level-snap-k'}, isLocked ? vpTr('Next level','المستوى التالي','Следующий уровень') : vpTr('Current level','المستوى الحالي','Текущий уровень')),
          h('span',{class:'mb-home-level-state ' + (isLocked ? 'locked' : 'active')}, isLocked ? vpTr('Locked','مقفول','Закрыт') : vpTr('Unlocked','مفتوح','Открыт'))
        ),
        h('div',{class:'mb-home-level-snap-name'}, name),
        h('div',{class:'mb-home-level-snap-sub'}, isLocked ? `${vpTr('Remaining','المتبقي','Осталось')}: ${money(remain, 2)}` : vpTr('Unlocked on your account','مفتوح على حسابك','Открыт на вашем счёте')),
        h('div',{class:'mb-home-level-snap-progress'}, h('span',{style:`width:${isLocked ? Math.max(4, levelProgress) : 100}%`})),
        h('div',{class:'mb-home-level-snap-chiprow'}, ...(perks.length ? perks.slice(0,2).map(perk=>h('span',{class:'mb-home-level-chip ' + (isLocked ? 'ghost ' : '') + 'tone-' + tone}, perk)) : [h('span',{class:'mb-home-level-chip ' + (isLocked ? 'ghost ' : '') + 'tone-' + tone}, isLocked ? vpTr('Unlocks later','يفتح لاحقاً','Откроется позже') : vpTr('Live access','متاح الآن','Доступ открыт'))]))
      );
    };
    const desktopLevelStrip = h('div',{class:'card mb-home-level-card strip-compact compact-premium horizontal'},
      h('div',{class:'mb-home-level-topline'},
        h('div',{class:'mb-home-level-kicker'}, vpTr('Access level','مستوى الوصول','Уровень доступа')),
        h('a',{href:'#/invest', class:'mb-home-level-link'}, vpTr('Open earn','فتح الربح','Открыть earn'))
      ),
      h('div',{class:'mb-home-level-scroll'},
        desktopLevelCardNode(resolvedCurrent || {name:currentLevelName}, {index: currentIdx + 1, locked:false}),
        resolvedNext ? desktopLevelCardNode(resolvedNext, {index: currentIdx + 2, locked:true}) : h('div',{class:'mb-home-level-snap tone-'+currentTone}, h('div',{class:'mb-home-level-snap-top'}, h('div',{class:'mb-home-level-snap-k'}, vpTr('Top tier','أعلى مستوى','Максимальный уровень')), h('span',{class:'mb-home-level-state active'}, vpTr('Max','الأعلى','Макс'))), h('div',{class:'mb-home-level-snap-name'}, currentLevelName), h('div',{class:'mb-home-level-snap-sub'}, vpTr('No higher level remains','لا يوجد مستوى أعلى','Более высокого уровня нет')))
      )
    );
    const nextStep = String(ob?.next_step || 'verify');
    const bannerTitle = nextStep === 'fund' ? 'Fund your live account' : (nextStep === 'trade' ? 'Go to trading terminal' : 'Verify your account');
    const bannerText = nextStep === 'fund'
      ? 'Your live account is ready. Add funds using the new in-dashboard funding journey and continue to the market.'
      : (nextStep === 'trade'
        ? 'Your onboarding is in a healthy state. Open the trading terminal, manage your portfolio, or review funding history.'
        : 'Secure your account and unlock the complete live-account workflow for funding, withdrawals, and trading.');
    const bannerAction = nextStep === 'fund'
      ? h('button',{class:'btn primary', onclick:()=>location.hash='#/wallet'}, vpTr('Open assets','فتح الأصول','Открыть активы'))
      : (nextStep === 'trade'
        ? h('button',{class:'btn primary', onclick:()=>location.hash='#/trade'}, 'Open Trade')
        : h('button',{class:'btn primary', onclick:()=>openKycFlow().catch(()=>{})}, 'Start Verification'));

    const root = h('div',{class:'mb-page', 'data-home-live-root':'1'},
      topBar(),
      h('div',{class:'mb-home-grid'},
        h('div',{class:'mb-home-main'},
          h('div',{class:'card mb-verify-banner'},
            h('div',{class:'mb-verify-copy'},
              h('div',{class:'mb-verify-welcome'}, `Welcome, ${userName()}`),
              h('div',{class:'mb-verify-title'}, bannerTitle),
              h('div',{class:'mb-verify-text'}, bannerText),
              bannerAction
            )
          ),
          h('div',{class:'card mb-equity-card'},
            h('div',{class:'mb-equity-top'},
              h('div',{},
                h('div',{class:'mb-equity-label'}, 'Live Available'),
                h('div',{class:'mb-equity-value'}, money(snap.displayAvailable, 2))
              ),
              h('div',{class:'mb-eye'}, '◌')
            ),
            h('div',{class:'mb-equity-grid'},
              miniMetric('Available Balance', money(snap.displayAvailable,2)),
              miniMetric('P&L', `${snap.pnl >= 0 ? '+' : ''}${fmt(snap.pnl,2)}` + ' USD', '', snap.pnl >= 0 ? 'up' : 'down'),
              miniMetric('Margin', money(snap.margin,2)),
              miniMetric('Margin Level', fmt(snap.marginLevel,2) + '%'),
              miniMetric('Free Margin', money(snap.displayAvailable,2)),
              miniMetric('Leverage', '1:' + Math.max(1, Math.round(snap.leverage || 500)))
            )
          ),
          desktopLevelStrip,
          h('div',{class:'mb-home-pulse'},
            marketPulseMetric('crypto', 'Crypto'),
            marketPulseMetric('forex', 'Forex'),
            marketPulseMetric('stocks', 'Stocks'),
            marketPulseMetric('commodities', 'Commodities')
          ),
          h('div',{class:'mb-home-two'},
            barCard('Top Gainers', gainers, false),
            barCard('Top Losers', losers, true)
          ),
          h('div',{class:'card mb-popular-card'},
            h('div',{class:'mb-side-head'},
              h('div',{class:'mb-card-title'}, vpTr('Popular','الأكثر تداولاً','Популярное')),
              h('a',{href:'#/trade', class:'mb-side-link'}, safeT('nav.trade','Trade'))
            ),
            h('div',{class:'mb-popular-grid'}, ...popular.map(popularRow))
          ),
          vpTradingBotCard()
        ),
        h('div',{class:'mb-home-side'},
          promoCard(),
          quickActionsPanel(),
          latestTradesCard(),
          h('div',{class:'card mb-side-card'},
            h('div',{class:'mb-side-head'},
              h('div',{class:'mb-card-title'}, vpTr('Notifications center','مركز التنبيهات','Центр уведомлений')),
              notificationsUnreadCount() > 0 ? h('span',{class:'pill warn'}, vpTr('Unread','غير مقروء','Непрочитано') + ' ' + notificationsUnreadCount()) : h('span',{class:'pill'}, vpTr('Seen','تمت القراءة','Просмотрено'))
            ),
            ...(buildNotificationsFeed().length ? buildNotificationsFeed().slice(0,3).map(it=>h('div',{class:'mb-side-row', style:'align-items:flex-start'},
              h('div',{class:'mb-side-row-main'},
                h('div',{class:'mb-side-row-title'}, String(it.title || notificationKindLabel(it.kind))),
                h('div',{class:'mb-side-row-sub'}, String(it.body || '').slice(0,110))
              ),
              (it.kind==='support' && Number(it.unread_count||0)>0) ? h('span',{class:'pill ok'}, '+' + Number(it.unread_count||0)) : (it.is_unread ? h('span',{class:'pill warn'}, 'New') : h('span',{}))
            )) : [h('div',{class:'mb-side-row-sub'}, 'No fresh notifications yet.')]),
            h('button',{class:'btn outline mt-2', onclick:()=>location.hash='#/notifications'}, 'Open Notifications')
          ),
          h('div',{class:'card mb-side-card'},
            h('div',{class:'mb-side-head'},
              h('div',{class:'mb-card-title'}, 'Support inbox'),
              supportUnreadCount() > 0 ? h('span',{class:'pill ok'}, 'Unread ' + supportUnreadCount()) : h('span',{class:'pill'}, 'Up to date')
            ),
            ...(Array.isArray(state.supportTickets) && state.supportTickets.length ? state.supportTickets.slice(0,2).map(it=>h('div',{class:'mb-side-row', style:'align-items:flex-start'},
              h('div',{class:'mb-side-row-main'},
                h('div',{class:'mb-side-row-title'}, String(it.subject||it.reason_code||('Ticket #' + it.id))),
                h('div',{class:'mb-side-row-sub'}, String(it.last_message_preview||''))
              ),
              Number(it.unread_count||0) > 0 ? h('span',{class:'pill ok'}, '+' + Number(it.unread_count||0)) : h('span',{})
            )) : [h('div',{class:'mb-side-row-sub'}, 'No support tickets yet.')]),
            h('button',{class:'btn outline mt-2', onclick:()=>location.hash='#/support'}, 'Open Support')
          ),
          h('div',{class:'card mb-side-card'},
            h('div',{class:'mb-side-head'},
              h('div',{class:'mb-card-title'}, 'Platform updates'),
              newsUnreadCount() > 0 ? h('span',{class:'pill warn'}, 'New ' + newsUnreadCount()) : h('span',{class:'pill'}, 'Seen')
            ),
            ...(Array.isArray(state.newsFeed) && state.newsFeed.length ? state.newsFeed.slice(0,3).map(it=>h('div',{class:'mb-side-row', style:'align-items:flex-start'}, h('div',{class:'mb-side-row-main'}, h('div',{class:'mb-side-row-title'}, String(it.title||'Update')), h('div',{class:'mb-side-row-sub'}, String(it.body||'').slice(0,110)))) ) : [h('div',{class:'mb-side-row-sub'}, 'No announcements published yet.')]),
            h('button',{class:'btn outline mt-2', onclick:()=>{ markNewsSeen(); location.hash='#/news'; render(); }}, 'Open News')
          ),
          h('div',{class:'card mb-side-card mb-ib-card'},
            h('div',{class:'mb-card-title'}, 'Become an IB'),
            h('div',{class:'mb-side-row-sub'}, 'Grow your network, invite clients, and manage rewards from one place.'),
            h('button',{class:'btn primary mt-2', onclick:()=>location.hash='#/invest'}, 'Open Plans')
          )
        )
      ),
      bottomNav()
    );
    setTimeout(()=>{
      try{ vpStartHomeLive(root); }catch(e){}
      try{ vpStartHomeSignalDesk(root); }catch(e){}
      try{ vpStartHomeAccountLive(root); }catch(e){}
    }, 0);
    return root;
  };

  function portfolioTableRow(cols, cls){
    return h('div',{class:'mb-table-row ' + (cls || '')}, ...cols.map(c=>h('div',{class:'mb-table-cell'}, c)));
  }

  portfolioPage = function(){
    const portfolioLiveMode = String(state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
    const portfolioDemoLocked = portfolioLiveMode !== 'real';
    const currentMode = portfolioDemoLocked ? 'demo' : 'real';
    const portfolioQuery = hashQueryParams();
    const allowedTabs = ['positions','orders','history'];
    const requestedTab = String(portfolioQuery.get('tab') || state.__vpPortfolioTab || 'positions').toLowerCase();
    let active = allowedTabs.includes(requestedTab) ? requestedTab : 'positions';
    state.__vpPortfolioTab = active;
    const initialSearch = String(portfolioQuery.get('q') || state.__vpPortfolioSearch || '').trim();
    if(!state.walletSummary) refreshWalletSummary(true).then(()=>render()).catch(()=>{});
    if(!state.realPortfolio) refreshRealPortfolio(true).then(()=>render()).catch(()=>{});
    state.__vpHistoryByMode = state.__vpHistoryByMode || {};
    state.__vpHistoryLoadingByMode = state.__vpHistoryLoadingByMode || {};
    if(!state.__vpHistoryLoadingByMode[currentMode] && !Array.isArray(state.__vpHistoryByMode[currentMode])){
      state.__vpHistoryLoadingByMode[currentMode] = true;
      tradeFetchOrders({limit:80, mode: currentMode}).then(items=>{ state.__vpHistoryByMode[currentMode] = items || []; }).catch(()=>{ state.__vpHistoryByMode[currentMode] = []; }).finally(()=>{ state.__vpHistoryLoadingByMode[currentMode] = false; render(); });
    }
    const snap = portfolioSnapshot(currentMode);
    const orders = Array.isArray(snap.pf.orders) ? snap.pf.orders : [];
    const openOrders = orders.filter(o=>!['closed','filled','done','completed','cancelled','canceled','rejected','failed'].includes(String(o.status||'').toLowerCase()));
    const history = Array.isArray(state.__vpHistoryByMode[currentMode]) ? state.__vpHistoryByMode[currentMode] : [];
    const searchVal = {value: initialSearch};

    const titleMap = {
      positions: 'Open Positions',
      orders: 'Pending Orders',
      history: 'Trade History'
    };

    function syncPortfolioHash(){
      const params = new URLSearchParams();
      if(active !== 'positions') params.set('tab', active);
      const q = String(searchVal.value || '').trim();
      if(q) params.set('q', q);
      replaceHashQuery('#/portfolio', params);
    }

    const content = h('div',{class:'card mb-portfolio-main'});
    const search = h('input',{class:'input mb-search-input', placeholder:'Search Positions', value: initialSearch});
    const titleEl = h('div',{class:'mb-portfolio-title'}, titleMap[active]);

    function filtered(list){
      const q = String(searchVal.value || '').trim().toUpperCase();
      if(!q) return list;
      return list.filter(it=>String(it.symbol || '').toUpperCase().replace(/^@R@|^@D@/,'').includes(q));
    }

    function renderBody(){
      content.innerHTML = '';
      titleEl.textContent = titleMap[active];
      search.value = String(searchVal.value || '');
      search.placeholder = active === 'positions'
        ? 'Search Positions'
        : (active === 'orders' ? 'Search Orders' : 'Search History');
      let rows = [];
      if(active === 'positions'){
        const latestPositions = filtered(Array.isArray(snap.positions) ? snap.positions.slice() : []).sort((a,b)=>{
          const bt = vpEpoch(b?.updated_at || b?.modified_at || b?.opened_at || b?.created_at || 0);
          const at = vpEpoch(a?.updated_at || a?.modified_at || a?.opened_at || a?.created_at || 0);
          return bt - at || Math.abs(Number(b?.unrealized_pnl || 0)) - Math.abs(Number(a?.unrealized_pnl || 0));
        });
        rows = latestPositions.map(pos=>{
          const sym = String(pos.symbol || '').replace(/^@R@|^@D@/,'');
          const mk = marketBySymbol(sym);
          const cur = Number(pos.mark_price || mk?.price || pos.entry_price || 0);
          const pnl = Number(pos.unrealized_pnl || 0);
          const roi = Number(pos.margin_initial || 0) > 0 ? (pnl / Number(pos.margin_initial || 1)) * 100 : 0;
          const side = String(pos.side || 'BUY').toUpperCase();
          return portfolioTableRow([
            h('div',{}, h('strong',{}, sym), h('div',{class:'tiny muted'}, `${side} • ${vpFmtDate(pos.updated_at || pos.opened_at || pos.created_at || 0)}`)),
            fmt(Number(pos.qty || 0), 4),
            money(Number(pos.entry_price || 0), Number(pos.entry_price || 0) < 1 ? 4 : 2),
            money(cur, cur < 1 ? 4 : 2),
            h('span',{class:pnl >= 0 ? 'up' : 'down'}, `${pnl >= 0 ? '+' : ''}${fmt(pnl,2)} USD`),
            h('span',{class:roi >= 0 ? 'up' : 'down'}, `${roi >= 0 ? '+' : ''}${fmt(roi,2)}%`)
          ]);
        });
      } else if(active === 'orders'){
        rows = filtered(openOrders).sort((a,b)=>vpEpoch(b?.updated_at || b?.created_at || 0) - vpEpoch(a?.updated_at || a?.created_at || 0)).map(ord=>portfolioTableRow([
          h('div',{}, h('strong',{}, String(ord.symbol || '').replace(/^@R@|^@D@/,'')), h('div',{class:'tiny muted'}, vpFmtDate(ord.updated_at || ord.created_at || 0))),
          fmt(Number(ord.qty || 0), 4),
          String(ord.order_type || 'LIMIT').toUpperCase(),
          money(Number(ord.limit_price || ord.fill_price || 0), Number(ord.limit_price || ord.fill_price || 0) < 1 ? 4 : 2),
          String(ord.side || 'BUY').toUpperCase(),
          String(ord.status || 'OPEN').toUpperCase()
        ]));
      } else {
        rows = filtered(history).slice().sort((a,b)=>vpEpoch(b?.updated_at || b?.closed_at || b?.created_at || 0) - vpEpoch(a?.updated_at || a?.closed_at || a?.created_at || 0)).slice(0,60).map(ord=>{
          const pnl = Number(ord.pnl_usd || 0);
          const roe = Number(ord.used_usdt || ord.usd_amount || 0) > 0 ? (pnl / Number(ord.used_usdt || ord.usd_amount || 1)) * 100 : 0;
          return portfolioTableRow([
            h('div',{}, h('strong',{}, String(ord.symbol || '').replace(/^@R@|^@D@/,'')), h('div',{class:'tiny muted'}, vpFmtDate(ord.updated_at || ord.closed_at || ord.created_at || 0))),
            fmt(Number(ord.qty || 0), 4),
            money(Number(ord.entry_price || ord.fill_price || 0), Number(ord.entry_price || ord.fill_price || 0) < 1 ? 4 : 2),
            money(Number(ord.exit_price || ord.limit_price || 0), Number(ord.exit_price || ord.limit_price || 0) < 1 ? 4 : 2),
            h('span',{class:pnl >= 0 ? 'up' : 'down'}, `${pnl >= 0 ? '+' : ''}${fmt(pnl,2)} USD`),
            h('span',{class:roe >= 0 ? 'up' : 'down'}, `${roe >= 0 ? '+' : ''}${fmt(roe,2)}%`)
          ]);
        });
      }

      const rowsCount = rows.length;
      const activeCount = active === 'positions' ? (Array.isArray(snap.positions) ? snap.positions.length : 0) : (active === 'orders' ? openOrders.length : history.length);
      content.appendChild(h('div',{class:'mb-portfolio-head'}, titleEl, search));
      content.appendChild(h('div',{class:'mb-portfolio-toolbar'},
        h('div',{class:'mb-portfolio-toolbar-left'},
          h('span',{class:'pill ghost'}, `${titleMap[active]}`),
          h('span',{class:'pill ghost'}, `${activeCount} ${vpLang4('total','إجمالي','всего','कुल')}`),
          searchVal.value ? h('span',{class:'pill warn'}, `${rowsCount} ${vpLang4('match','مطابق','совпадений','मैच')}`) : null
        ),
        h('div',{class:'mb-portfolio-toolbar-right'},
          h('button',{class:'btn outline slim', onclick:()=>location.hash='#/trade'}, vpLang4('Trade','تداول','Трейд','ट्रेड')),
          h('button',{class:'btn outline slim', onclick:()=>location.hash='#/wallet?tab=deposit'}, vpLang4('Fund','تمويل','Пополнить','फंड'))
        )
      ));
      content.appendChild(h('div',{class:'mb-table-head'},
        ...((active === 'orders') ? ['Symbol','Units','Type','Price','Side','Status'] : (active === 'history' ? ['Symbol','Units','Entry Price','Exit Price','P&L','ROI'] : ['Symbol','Units','Entry Price','Current Price','P&L','ROI'])).map(x=>h('div',{class:'mb-table-th'}, x))
      ));
      if(rows.length){
        content.appendChild(h('div',{class:'mb-table-body'}, ...rows));
      } else {
        content.appendChild(h('div',{class:'mb-empty-box large'},
          h('div',{class:'mb-empty-ico'}, '⌁'),
          h('div',{class:'mb-empty-title'}, active === 'positions' ? 'You don’t have any positions open' : (active === 'orders' ? 'No pending orders found' : 'No closed trades yet')),
          h('a',{href:'#/trade', class:'mb-side-link'}, 'Go to Trade')
        ));
      }
    }

    search.addEventListener('input', ()=>{
      searchVal.value = search.value || '';
      state.__vpPortfolioSearch = searchVal.value;
      syncPortfolioHash();
      renderBody();
    });

    const sideBtn = (key, title, sub, count)=>h('button',{class:'mb-portfolio-sidebtn ' + (active === key ? 'active' : ''), onclick:()=>{ active = key; state.__vpPortfolioTab = key; syncPortfolioHash(); render(); }},
      h('div',{class:'mb-portfolio-sideicon'}, key === 'positions' ? '◔' : (key === 'orders' ? '◉' : '◌')),
      h('div',{},
        h('div',{class:'mb-portfolio-side-title'}, title),
        h('div',{class:'mb-portfolio-side-sub'}, sub),
        h('div',{class:'tiny muted', style:'margin-top:6px; font-weight:700;'}, `${count} items`)
      )
    );

    const portfolioGateBanner = portfolioDemoLocked ? h('div',{class:'card vp-real-only-hero'},
      h('div',{class:'vp-real-only-copy'},
        h('div',{class:'vp-real-only-kicker'}, vpLang4('Real account only','الحساب الحقيقي فقط','Только реальный счёт','रियल अकाउंट ओनली')),
        h('div',{class:'vp-real-only-title'}, vpLang4('Portfolio, positions, and history open from the real account only','المحفظة والمراكز والسجل تعمل من الحساب الحقيقي فقط','Портфель, позиции и история доступны только с реального счёта','पोर्टफोलियो, पोज़िशन और हिस्ट्री सिर्फ रियल अकाउंट से खुलते हैं')),
        h('div',{class:'vp-real-only-text'}, vpLang4('While the platform is on Demo, this page stays as a locked preview. Switch to the real account to review positions, pending orders, and closed trades from the protected live workspace.','طالما المنصة على وضع الديمو ستظل هذه الصفحة مجرد معاينة مقفولة. حوّل إلى الحساب الحقيقي لمراجعة المراكز والأوامر المعلقة والصفقات المغلقة من مساحة الحساب الحقيقي المحمية.','Пока платформа находится в Demo, эта страница остаётся только заблокированным предпросмотром. Переключитесь на реальный счёт, чтобы просматривать позиции, отложенные ордера и закрытые сделки из защищённого live-пространства.','जब तक प्लेटफॉर्म डेमो पर है, यह पेज सिर्फ लॉक्ड प्रीव्यू रहेगा। रियल अकाउंट पर स्विच करके पोज़िशन, पेंडिंग ऑर्डर और क्लोज़्ड ट्रेड्स देखें।')),
        h('div',{class:'vp-real-only-meta'},
          h('span',{class:'pill ghost'}, `${vpLang4('Mode','الوضع','Режим','मोड')}: ${vpLang4('Demo','ديمو','Демо','डेमो')}`),
          h('span',{class:'pill ghost'}, `${vpLang4('Requested page','الصفحة المطلوبة','Запрошенная страница','रिक्वेस्टेड पेज')}: ${vpLang4('Portfolio','المحفظة','Портфель','पोर्टफолио')}`),
          h('span',{class:'pill ghost'}, `${vpLang4('Current KYC','حالة KYC الحالية','Текущий KYC','करंट KYC')}: ${typeof gateKycStatusLabel === 'function' ? gateKycStatusLabel(currentKycGateStatus()) : String(currentKycGateStatus() || '—')}`)
        ),
        h('div',{class:'vp-real-only-actions'},
          h('button',{class:'btn primary', type:'button', onclick:async()=>{ const ok = await requestTradeModeSwitch('real'); if(ok) render(true); }}, vpLang4('Switch to real','حوّل إلى الحقيقي','Переключить в real','रियल पर स्विच करें')),
          h('button',{class:'btn outline', type:'button', onclick:()=>{ try{ if(typeof openPortfolioRealOnlyDialog === 'function') openPortfolioRealOnlyDialog(); else if(typeof openRealAccountOnlyDialog === 'function') openRealAccountOnlyDialog({ pageLabel: vpLang4('Portfolio','المحفظة','Портфель','पोर्टफोलियो') }); }catch(e){} }}, vpLang4('Why is it locked?','لماذا هي مقفولة؟','Почему заблокировано?','यह लॉक क्यों है?'))
        )
      ),
      h('div',{class:'vp-real-only-preview'},
        h('div',{class:'vp-real-only-preview-top'},
          h('span',{class:'vp-real-only-preview-badge'}, vpLang4('Portfolio preview','معاينة المحفظة','Превью портфеля','पोर्टफोलियो प्रीव्यू')),
          h('span',{class:'vp-real-only-preview-dot'})
        ),
        h('div',{class:'vp-real-only-preview-grid'},
          h('div',{class:'vp-real-only-preview-card'}, h('strong',{}, vpLang4('Open positions','المراكز المفتوحة','Открытые позиции','ओपन पोज़िशन')), h('small',{}, vpLang4('Monitor current live exposure from one protected portfolio view.','راقب الانكشاف الحي الحالي من خلال عرض محفظة محمي واحد.','Следите за текущей live-экспозицией из одного защищённого окна портфеля.','एक सुरक्षित पोर्टफोलियो व्यू से लाइव एक्सपोजर मॉनिटर करें।'))),
          h('div',{class:'vp-real-only-preview-card'}, h('strong',{}, vpLang4('Pending orders','الأوامر المعلقة','Отложенные ордера','पेंडिंग ऑर्डर')), h('small',{}, vpLang4('Pending execution stays separated from Demo activity by design.','التنفيذات المعلقة تظل منفصلة عن نشاط الديمو بحكم التصميم.','Ожидающие исполнения ордера по дизайну отделены от Demo-активности.','पेंडिंग एक्जीक्यूशन डेमो एक्टिविटी से अलग रहता है।'))),
          h('div',{class:'vp-real-only-preview-card'}, h('strong',{}, vpLang4('Trade history','سجل التداول','История сделок','ट्रेड हिस्ट्री')), h('small',{}, vpLang4('Closed trades and ROI stay attached to the real account timeline only.','الصفقات المغلقة والعائد يظلان مرتبطين فقط بالخط الزمني للحساب الحقيقي.','Закрытые сделки и ROI остаются привязаны только к истории реального счёта.','क्लोज्ड ट्रेड्स और ROI सिर्फ रियल अकाउंट टाइमलाइन से जुड़े रहते हैं।'))),
          h('div',{class:'vp-real-only-preview-card'}, h('strong',{}, vpLang4('KYC aware','واعٍ بالتوثيق','С учётом KYC','KYC-aware')), h('small',{}, vpLang4('If verification still needs approval, the next step opens the KYC popup instead of forcing a redirect.','إذا كان التوثيق ما زال يحتاج موافقة فستظهر نافذة KYC في الخطوة التالية بدل فرض التحويل.','Если верификация ещё требует одобрения, следующим шагом откроется окно KYC вместо принудительного редиректа.','अगर वेरिफिकेशन पेंडिंग है तो अगला स्टेप KYC पॉपअप खोलेगा, जबरन रीडायरेक्ट नहीं।')))
        )
      )
    ) : null;

    const portfolioHero = h('div',{class:'card mb-portfolio-hero' + (portfolioDemoLocked ? ' vp-page-preview-lock' : '')},
      h('div',{class:'mb-portfolio-hero-copy'},
        h('div',{class:'mb-markets-kicker'}, vpLang4('Live portfolio','المحفظة الحية','Живой портфель','लाइव पोर्टफोलियो')),
        h('div',{class:'mb-portfolio-hero-title'}, vpLang4('Your active trading book','دفتر تداولك النشط','Ваш активный торговый портфель','आपकी सक्रिय ट्रेडिंग बुक')),
        h('div',{class:'mb-portfolio-hero-sub'}, `${vpLang4('Account','الحساب','Счёт','अकाउंट')} • ${String(accountNo('live') || state.me?.live_account?.account_no || '—')} • ${vpLang4('Real mode only','الحقيقي فقط','Только real','सिर्फ रियल')}`),
        h('div',{class:'mb-portfolio-hero-chips'},
          h('span',{class:'chip ghost'}, `${vpLang4('Open positions','المراكز المفتوحة','Открытые позиции','ओपन पोजीशन')} ${Array.isArray(snap.positions) ? snap.positions.length : 0}`),
          h('span',{class:'chip ghost'}, `${vpLang4('Pending orders','الأوامر المعلقة','Отложенные ордера','पेंडिंग ऑर्डर')} ${openOrders.length}`),
          h('span',{class:'chip ghost'}, `${vpLang4('History loaded','السجل المحمل','История загружена','हिस्ट्री लोडेड')} ${history.length}`),
          h('span',{class:'chip ghost'}, `${vpLang4('Last sync','آخر مزامنة','Последняя синхронизация','लास्ट सिंक')} ${vpFmtDate(Date.now())}`)
        )
      ),
      h('div',{class:'mb-portfolio-hero-side'},
        h('div',{class:'mb-portfolio-hero-kpi'},
          h('small',{}, vpLang4('Free margin','الهامش الحر','Свободная маржа','फ्री मार्जिन')),
          h('strong',{}, money(snap.displayAvailable, 2))
        ),
        h('div',{class:'mb-portfolio-hero-actions'},
          h('button',{class:'btn primary', onclick:()=>location.hash='#/trade'}, vpLang4('Open trade','فتح التداول','Открыть trade','ओपन ट्रेड')),
          h('button',{class:'btn outline', onclick:()=>location.hash='#/wallet?tab=deposit'}, vpLang4('Add funds','إضافة رصيد','Пополнить','फंड जोड़ें'))
        )
      )
    );

    const root = h('div',{class:`mb-page mb-portfolio-v24 vp-portfolio-page${portfolioDemoLocked ? ' is-demo-locked' : ''}`},
      topBar(),
      portfolioHero,
      h('div',{class:'mb-portfolio-shell' + (portfolioDemoLocked ? ' vp-page-preview-lock' : '')},
        h('div',{class:'mb-portfolio-side card'},
          h('div',{class:'mb-section-title'}, 'Portfolio'),
          sideBtn('positions','Open Positions','View all your open positions', Array.isArray(snap.positions) ? snap.positions.length : 0),
          sideBtn('orders','Pending Orders','View all your pending orders', openOrders.length),
          sideBtn('history','Trade History','View all your past trades', history.length)
        ),
        h('div',{class:'mb-portfolio-content'},
          h('div',{class:'mb-stat-strip'},
            miniMetric('Available Balance', money(snap.displayAvailable,2)),
            miniMetric('Equity', money(snap.equity,2)),
            miniMetric('P&L', `${snap.pnl >= 0 ? '+' : ''}${fmt(snap.pnl,2)} USD`, '', snap.pnl >= 0 ? 'up' : 'down'),
            miniMetric('Margin', money(snap.margin,2)),
            miniMetric('Margin Level', fmt(snap.marginLevel,2) + '%'),
            miniMetric('Free Margin', money(snap.displayAvailable,2))
          ),
          content
        )
      ),
      bottomNav()
    );

    renderBody();
    syncPortfolioHash();
    if(!portfolioDemoLocked){
      setTimeout(()=>{ try{ vpStartPortfolioLive(root); }catch(e){} }, 0);
    } else {
      const gateKey = `${String(location.hash || '#/portfolio')}::demo`;
      if(state.__vpPortfolioDemoGateShownFor !== gateKey){
        state.__vpPortfolioDemoGateShownFor = gateKey;
        setTimeout(()=>{
          try{
            if(String(location.hash || '').startsWith('#/portfolio') && String(state.tradeMode || 'demo').toLowerCase() !== 'real'){
              if(typeof openPortfolioRealOnlyDialog === 'function') openPortfolioRealOnlyDialog();
              else if(typeof openRealAccountOnlyDialog === 'function') openRealAccountOnlyDialog({ pageLabel: vpLang4('Portfolio','المحفظة','Портфель','पोर्टफोलियो') });
            }
          }catch(e){}
        }, 90);
      }
    }
    return root;
  };

walletPage = function(){
  const walletMode = String(state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
  const walletDemoLocked = walletMode !== 'real';
  if(walletDemoLocked){
    const demoSnap = portfolioSnapshot('demo');
    const demoAccountId = state.me?.demo_account?.account_no || accountNo('demo') || '—';
    const lockHero = h('div',{class:'card vp-real-only-hero vp-wallet-hero'},
      h('div',{class:'vp-real-only-copy'},
        h('div',{class:'vp-real-only-kicker'}, vpTr('Real account only','الحساب الحقيقي فقط','Только реальный счёт')),
        h('div',{class:'vp-real-only-title'}, vpTr('Assets, deposits, and withdrawals are locked while you are in Demo mode','الأصول والإيداعات والسحوبات مقفولة أثناء استخدام وضع الديمو','Активы, пополнения и выводы заблокированы, пока вы находитесь в Demo')),
        h('div',{class:'vp-real-only-text'}, vpTr('Switch the platform to the real account to open the funding center, manage deposits, submit withdrawals, and track request timelines. If the live account still needs approval, the verification popup will appear next instead of forcing a redirect.','حوّل المنصة إلى الحساب الحقيقي لفتح مركز التمويل وإدارة الإيداعات وإرسال السحوبات ومتابعة خط سير الطلبات. وإذا كان الحساب الحقيقي لا يزال يحتاج اعتمادًا، فستظهر نافذة التوثيق التالية بدل التحويل الإجباري.','Переключите платформу на реальный счёт, чтобы открыть центр финансирования, управлять пополнениями, отправлять выводы и отслеживать таймлайны заявок. Если live-счёт всё ещё ждёт одобрения, следующим шагом откроется окно верификации вместо принудительного редиректа.')),
        h('div',{class:'vp-real-only-meta'},
          h('span',{class:'pill ghost'}, `${vpTr('Mode','الوضع','Режим')}: ${vpTr('Demo','ديمو','Demo')}`),
          h('span',{class:'pill ghost'}, `${vpTr('Demo balance','رصيد الديمو','Demo баланс')}: ${money(Number(demoSnap?.available || demoSnap?.balance || 0), 2)}`),
          h('span',{class:'pill ghost'}, `${vpTr('Demo account','حساب الديمو','Demo счёт')}: ${demoAccountId}`)
        ),
        h('div',{class:'vp-real-only-actions'},
          h('button',{class:'btn primary', type:'button', onclick:()=>{ if(typeof openWalletRealOnlyDialog === 'function') openWalletRealOnlyDialog(); }}, vpTr('Switch to Real','حوّل إلى الحقيقي','Переключить в Real')),
          h('button',{class:'btn outline', type:'button', onclick:()=>{ try{ closeDialog(); }catch(e){} }}, vpTr('Close window','إغلاق النافذة','Закрыть окно'))
        )
      ),
      h('div',{class:'vp-real-only-preview'},
        h('div',{class:'vp-real-only-preview-top'},
          h('span',{class:'vp-real-only-preview-badge'}, vpTr('Funding preview','معاينة التمويل','Превью финансирования')),
          h('span',{class:'vp-real-only-preview-dot'})
        ),
        h('div',{class:'vp-real-only-preview-grid'},
          h('div',{class:'vp-real-only-preview-card'}, h('strong',{}, vpTr('Deposits','الإيداعات','Пополнения')), h('small',{}, vpTr('Open configured payment routes from the live account workspace.','افتح مسارات الدفع المجهزة من مساحة الحساب الحقيقي.','Открывайте настроенные платёжные маршруты из real-пространства.'))),
          h('div',{class:'vp-real-only-preview-card'}, h('strong',{}, vpTr('Withdrawals','السحوبات','Выводы')), h('small',{}, vpTr('Keep payout requests isolated from demo balances and previews.','اعزل طلبات السحب عن أرصدة ومعاينات الديمو.','Изолируйте заявки на вывод от demo-балансов и предпросмотров.'))),
          h('div',{class:'vp-real-only-preview-card'}, h('strong',{}, vpTr('Request history','سجل الطلبات','История заявок')), h('small',{}, vpTr('Track review timelines and status updates from one protected page.','تابع خط سير المراجعة وتحديثات الحالة من صفحة محمية واحدة.','Отслеживайте ход проверки и статусы из одной защищённой страницы.'))),
          h('div',{class:'vp-real-only-preview-card'}, h('strong',{}, vpTr('KYC aware','واعٍ بالتوثيق','С учётом KYC')), h('small',{}, vpTr('If approval is pending, the next step opens verification as a popup.','إذا كانت الموافقة معلقة فستظهر نافذة التوثيق في الخطوة التالية.','Если одобрение ещё в процессе, следующим шагом откроется окно верификации.')))
        )
      )
    );
    const previewMain = h('div',{class:'card mb-funds-main vp-wallet-panel vp-page-preview-lock'},
      h('div',{class:'mb-funds-content'},
        h('div',{class:'mb-funds-top-tabs'},
          h('button',{class:'mb-funds-top-tab active', type:'button'}, vpTr('Deposit','إيداع','Пополнение')),
          h('button',{class:'mb-funds-top-tab', type:'button'}, vpTr('Withdraw','سحب','Вывод')),
          h('button',{class:'mb-funds-top-tab', type:'button'}, vpTr('History','السجل','История'))
        ),
        h('div',{class:'vp-wallet-preview-grid'},
          h('div',{class:'vp-wallet-preview-block tall'},
            h('div',{class:'vp-wallet-preview-k'}, vpTr('Choose funding category','اختر فئة التمويل','Выберите категорию пополнения')),
            h('div',{class:'vp-wallet-preview-tiles'},
              h('div',{class:'vp-wallet-preview-tile'}, h('span',{class:'ico'}, '₿'), h('strong',{}, vpTr('Crypto','كريبتو','Крипто')), h('small',{}, vpTr('Wallet routes','مسارات المحافظ','Маршруты кошельков'))),
              h('div',{class:'vp-wallet-preview-tile'}, h('span',{class:'ico'}, '🏦'), h('strong',{}, vpTr('Bank','بنك','Банк')), h('small',{}, vpTr('Wire routes','تحويلات بنكية','Банковские переводы'))),
              h('div',{class:'vp-wallet-preview-tile'}, h('span',{class:'ico'}, '💳'), h('strong',{}, vpTr('Card','بطاقة','Карта')), h('small',{}, vpTr('Card processors','معالجات البطاقات','Карточные процессоры')))
            )
          ),
          h('div',{class:'vp-wallet-preview-block'}, h('div',{class:'vp-wallet-preview-k'}, vpTr('Funding steps','خطوات التمويل','Шаги пополнения')), h('div',{class:'vp-wallet-preview-lines'}, h('span',{}), h('span',{}), h('span',{}), h('span',{}))),
          h('div',{class:'vp-wallet-preview-block'}, h('div',{class:'vp-wallet-preview-k'}, vpTr('Request tracking','تتبع الطلبات','Отслеживание заявок')), h('div',{class:'vp-wallet-preview-lines'}, h('span',{}), h('span',{}), h('span',{}))),
          h('div',{class:'vp-wallet-preview-block'}, h('div',{class:'vp-wallet-preview-k'}, vpTr('Proof and notes','الإثباتات والملاحظات','Подтверждения и заметки')), h('div',{class:'vp-wallet-preview-lines'}, h('span',{}), h('span',{}), h('span',{})))
        )
      )
    );
    const previewSide = h('div',{class:'card mb-funds-side vp-wallet-panel vp-page-preview-lock'},
      h('div',{class:'mb-card-title'}, vpTr('Live funding snapshot','ملخص التمويل الحقيقي','Снимок live-финансирования')),
      h('div',{class:'vp-wallet-preview-side-grid'},
        miniMetric(vpTr('Demo balance','رصيد الديمو','Баланс Demo'), money(demoSnap.displayAvailable || demoSnap.availableCash || 0,2), demoAccountId),
        miniMetric(vpTr('Live funding routes','مسارات التمويل الحقيقي','Маршруты live-финансирования'), '••••', vpTr('Locked in demo','مقفولة في الديمو','Заблокировано в demo')),
        miniMetric(vpTr('KYC gate','بوابة KYC','Шлюз KYC'), gateKycStatusLabel(currentKycGateStatus()), vpTr('Checked when you switch','يتم فحصه عند التحويل','Проверяется при переключении')),
        miniMetric(vpTr('Request history','سجل الطلبات','История заявок'), '••', vpTr('Visible on the real account only','تظهر على الحساب الحقيقي فقط','Доступно только на реальном счёте'))
      )
    );
    const previewMenu = h('div',{class:'mb-portfolio-side card vp-wallet-panel vp-page-preview-lock'},
      h('div',{class:'mb-section-title'}, vpTr('Wallet','المحفظة','Кошелёк')),
      h('button',{class:'mb-portfolio-sidebtn active', type:'button'}, h('div',{class:'mb-portfolio-sideicon'}, '◫'), h('div',{}, h('div',{class:'mb-portfolio-side-title'}, vpTr('Deposit','إيداع','Пополнение')), h('div',{class:'mb-portfolio-side-sub'}, vpTr('Live-account funding flow','مسار تمويل الحساب الحقيقي','Поток пополнения real-счёта')))),
      h('button',{class:'mb-portfolio-sidebtn', type:'button'}, h('div',{class:'mb-portfolio-sideicon'}, '◎'), h('div',{}, h('div',{class:'mb-portfolio-side-title'}, vpTr('Withdraw','سحب','Вывод')), h('div',{class:'mb-portfolio-side-sub'}, vpTr('Payout review flow','مسار مراجعة السحب','Поток проверки вывода')))),
      h('button',{class:'mb-portfolio-sidebtn', type:'button'}, h('div',{class:'mb-portfolio-sideicon'}, '◍'), h('div',{}, h('div',{class:'mb-portfolio-side-title'}, vpTr('History','السجل','История')), h('div',{class:'mb-portfolio-side-sub'}, vpTr('Timeline, notes, and proof uploads','الخط الزمني والملاحظات والإثباتات','Таймлайн, заметки и подтверждения'))))
    );
    const mobilePreview = h('div',{class:'card mb-wallet-mobile-main compact-wallet-shell vp-wallet-panel vp-page-preview-lock'}, previewMain.cloneNode(true));
    try{
      const gateKey = `${String(location.hash || '#/wallet')}::demo`;
      if(state.__vpWalletDemoGateShownFor !== gateKey){
        state.__vpWalletDemoGateShownFor = gateKey;
        setTimeout(()=>{
          try{
            if(String(location.hash || '').startsWith('#/wallet') && String(state.tradeMode || 'demo').toLowerCase() !== 'real' && typeof openWalletRealOnlyDialog === 'function'){
              openWalletRealOnlyDialog();
            }
          }catch(e){}
        }, 60);
      }
    }catch(e){}
    if(vpIsMobile()){
      return h('div',{class:'mb-page mb-wallet-mobile-ref mb-wallet-v25 vp-wallet-page'},
        topBar(),
        h('div',{class:'card mb-wallet-mobile-snapshot vp-wallet-panel'},
          h('div',{class:'mb-side-head'},
            h('div',{class:'mb-card-title'}, vpTr('Demo preview only','معاينة فقط في الديمو','Только demo-превью')),
            h('span',{class:'chip ghost'}, vpTr('Real account required','الحساب الحقيقي مطلوب','Требуется реальный счёт'))
          ),
          h('div',{class:'mb-wallet-mobile-snapshot-grid'},
            h('div',{class:'mb-wallet-mobile-snapshot-item'}, h('span',{class:'k'}, vpTr('Demo available','المتاح في الديمو','Доступно в demo')), h('strong',{}, money(demoSnap.displayAvailable || demoSnap.availableCash || 0,2)), h('small',{}, demoAccountId)),
            h('div',{class:'mb-wallet-mobile-snapshot-item'}, h('span',{class:'k'}, vpTr('Live funding access','وصول التمويل الحقيقي','Доступ к live-финансированию')), h('strong',{}, '••••'), h('small',{}, vpTr('Locked until you switch','مقفول حتى تتحول','Заблокировано до переключения')))
          )
        ),
        mobilePreview,
        bottomNav()
      );
    }
    return h('div',{class:'mb-page mb-wallet-v25 vp-wallet-page'},
      topBar(),
      h('div',{class:'mb-funds-shell vp-wallet-preview-shell'}, previewMenu, previewMain, previewSide),
      bottomNav()
    );
  }
  try{ state.__vpWalletDemoGateShownFor = null; }catch(e){}
  if((!state.walletSummary || !state.ledger || !state.depositsList || !state.withdrawalsList || !state.onboardingStatus || !state.realPortfolio) && !state.__vpWalletPriming){
    state.__vpWalletPriming = true;
    Promise.allSettled([
      state.walletSummary ? Promise.resolve(state.walletSummary) : refreshWalletSummary(),
      state.ledger ? Promise.resolve(state.ledger) : refreshLedger(1),
      state.depositsList ? Promise.resolve(state.depositsList) : refreshDepositsList(),
      state.withdrawalsList ? Promise.resolve(state.withdrawalsList) : refreshWithdrawalsList(),
      state.onboardingStatus ? Promise.resolve(state.onboardingStatus) : refreshOnboardingStatus(),
      state.realPortfolio ? Promise.resolve(state.realPortfolio) : refreshRealPortfolio(true)
    ]).then(()=>{ render(); }).catch(()=>{}).finally(()=>{ state.__vpWalletPriming = false; });
  }

  const snap = portfolioSnapshot('real');
  const walletQuery = (()=>{ try{ return new URLSearchParams(String(location.hash||'').split('?')[1] || ''); }catch(e){ return new URLSearchParams(); }})();
  const allowedTabs = ['deposit','withdraw','history'];
  let active = allowedTabs.includes(String(walletQuery.get('tab') || '').toLowerCase())
    ? String(walletQuery.get('tab') || '').toLowerCase()
    : (state.__vpFundsTab || 'deposit');
  if(['transfer','banking'].includes(active)) active = 'history';
  if(!allowedTabs.includes(active)) active = 'deposit';

  const flow = state.__vpFundingFlow || {
    currentRequestType:'',
    currentRequestId:0,
    deposit:{ amount:'50', details:{}, stage:1 },
    withdraw:{ amount:'', details:{}, stage:1 }
  };
  state.__vpFundingFlow = flow;

  const depositFlow = (flow.deposit && typeof flow.deposit === 'object') ? flow.deposit : (flow.deposit = {amount:'50', details:{}, stage:1});
  const withdrawFlow = (flow.withdraw && typeof flow.withdraw === 'object') ? flow.withdraw : (flow.withdraw = {amount:'', details:{}, stage:1});
  if(!depositFlow.details || typeof depositFlow.details !== 'object') depositFlow.details = {};
  if(!withdrawFlow.details || typeof withdrawFlow.details !== 'object') withdrawFlow.details = {};
  depositFlow.stage = Math.max(1, Math.min(3, Number(depositFlow.stage || 1)));
  withdrawFlow.stage = Math.max(1, Math.min(3, Number(withdrawFlow.stage || 1)));

  const qKind = String(walletQuery.get('kind') || '').toLowerCase();
  const qId = Number(walletQuery.get('id') || 0);
  const qStage = Math.max(0, Math.min(3, Number(walletQuery.get('stage') || 0)));
  const explicitTab = String(walletQuery.get('tab') || '').toLowerCase();
  if((qKind === 'deposit' || qKind === 'withdraw') && qId > 0){
    flow.currentRequestType = qKind;
    flow.currentRequestId = qId;
    active = 'history';
  } else if((explicitTab === 'deposit' || explicitTab === 'withdraw') && qStage <= 0){
    const targetBucket = explicitTab === 'withdraw' ? withdrawFlow : depositFlow;
    targetBucket.stage = 1;
    targetBucket.details = {};
    if(flow.currentRequestType === explicitTab){
      flow.currentRequestType = '';
      flow.currentRequestId = 0;
    }
    if(active !== 'history') active = explicitTab;
  }
  if(qStage >= 1){
    if(active === 'deposit') depositFlow.stage = qStage;
    if(active === 'withdraw') withdrawFlow.stage = qStage;
  }

  const main = h('div',{class:'card mb-funds-main'});
  let depositMethods = Array.isArray(state.__vpDepositMethods) ? state.__vpDepositMethods : null;
  let withdrawMethods = Array.isArray(state.__vpWithdrawMethods) ? state.__vpWithdrawMethods : null;

  function persistFlow(){ state.__vpFundingFlow = flow; }
  function moneyLine(v, cur){ return money(v,2) + (cur ? ' ' + cur : ''); }
  function statusBadge(st){
    const v = String(st || '').toLowerCase();
    const cls = ['approved','completed','confirmed','done','active'].includes(v) ? 'up' : (['rejected','cancelled','failed'].includes(v) ? 'down' : '');
    return h('span',{class:'badge ' + cls}, String(v || 'pending').toUpperCase());
  }
  function currentBucket(kind){ return kind === 'withdraw' ? withdrawFlow : depositFlow; }
  function syncWalletHash(){
    try{
      const params = new URLSearchParams();
      params.set('tab', active);
      const activeStage = Number(currentBucket(active)?.stage || 1);
      if(active !== 'history' && activeStage > 1) params.set('stage', String(activeStage));
      const shouldPinRequest = !!(flow.currentRequestId && flow.currentRequestType && (active === 'history' || (active === flow.currentRequestType && Number(currentBucket(flow.currentRequestType)?.stage || 1) >= 3)));
      if(shouldPinRequest){
        params.set('kind', String(flow.currentRequestType));
        params.set('id', String(flow.currentRequestId));
      }
      const nextHash = '#/wallet' + (params.toString() ? ('?' + params.toString()) : '');
      const url = new URL(window.location.href);
      if(url.hash !== nextHash){
        url.hash = nextHash;
        history.replaceState(null, '', url.toString());
      }
    }catch(e){}
  }
  function clearSelectedRequest(){
    flow.currentRequestType = '';
    flow.currentRequestId = 0;
    state.__vpDepositDetail = null;
    state.__vpWithdrawDetail = null;
    persistFlow();
  }
  function setActiveTab(tab, opts={}){
    active = allowedTabs.includes(tab) ? tab : 'deposit';
    state.__vpFundsTab = active;
    if(opts.resetStage){ currentBucket(active).stage = 1; }
    if(opts.clearRequest){ clearSelectedRequest(); }
    persistFlow();
    syncWalletHash();
    render();
  }
  function startNew(kind){
    const bucket = currentBucket(kind);
    bucket.amount = kind === 'deposit' ? '50' : '';
    bucket.details = {};
    bucket.stage = 1;
    clearSelectedRequest();
    active = kind;
    state.__vpFundsTab = kind;
    persistFlow();
    syncWalletHash();
    render();
  }
  function setStage(kind, stage, opts={}){
    const bucket = currentBucket(kind);
    bucket.stage = Math.max(1, Math.min(3, Number(stage || 1)));
    active = kind;
    state.__vpFundsTab = kind;
    if(opts.clearRequest) clearSelectedRequest();
    persistFlow();
    syncWalletHash();
    render();
  }
  function statusMeta(kind, rawStatus){
    const status = String(rawStatus || '').toLowerCase();
    if(['approved','completed','confirmed','done'].includes(status)) return {step:3, tone:'up', title: kind === 'deposit' ? 'Funds confirmed' : 'Payout completed', text: kind === 'deposit' ? 'This request reached the final stage and was credited by operations.' : 'This withdrawal completed and the payout was released.'};
    if(['rejected','cancelled','failed'].includes(status)) return {step:3, tone:'down', title:'Request closed', text:'Operations closed this request. Review the admin note and submit a new request if needed.'};
    return {step:2, tone:'warn', title:'Under review', text: kind === 'deposit' ? 'Upload proof if needed and wait for the operations team to confirm your payment.' : 'Operations are validating the payout details and available balance before release.'};
  }
  function wizardStepper(kind, step){
    const labels = kind === 'deposit'
      ? ['Choose method','Review details','Track request']
      : ['Choose method','Review payout','Track request'];
    return h('div',{class:'mb-flow-stepper'}, ...labels.map((label, idx)=>{
      const pos = idx + 1;
      return h('div',{class:'mb-flow-step ' + (pos <= step ? 'done' : '')}, h('span',{}, String(pos)), h('strong',{}, label));
    }));
  }
  function requestStageStepper(kind, meta){
    const labels = kind === 'deposit'
      ? ['Request created','Under review','Credited / closed']
      : ['Request created','Compliance review','Paid out / closed'];
    return h('div',{class:'mb-flow-stepper'}, ...labels.map((label, idx)=>{
      const pos = idx + 1;
      return h('div',{class:'mb-flow-step ' + (pos <= (meta?.step || 1) ? 'done' : '')}, h('span',{}, String(pos)), h('strong',{}, label));
    }));
  }

  function fundingJourneyBox(kind, method){
    const isDeposit = kind === 'deposit';
    const title = isDeposit ? 'Funding journey' : 'Withdrawal journey';
    const sub = isDeposit
      ? 'Keep everything inside the client area: choose the method, review the limits, submit the request, then track proof and approval from one timeline.'
      : 'Choose an approved payout method, review the payout destination, submit the request, then follow the review timeline until operations release the payout.';
    const steps = isDeposit
      ? ['Select a live-account method', 'Review limits and instructions', 'Enter amount and any required references', 'Submit the request', 'Upload proof if requested', 'Track approval and balance credit']
      : ['Select a payout method', 'Review limits and available balance', 'Enter amount and payout details', 'Submit the request', 'Track review status and admin notes', 'Wait for payout completion'];
    return h('div',{class:'mb-journey-box'},
      h('div',{class:'mb-card-title'}, title),
      h('div',{class:'mb-funds-help'}, sub),
      method ? h('div',{class:'mb-journey-chip-row'},
        h('span',{class:'pill'}, String(method.title || method.code || 'Method')),
        h('span',{class:'pill'}, `Min ${fmt(Number(method.min_amount || 0),2)}`),
        Number(method.max_amount || 0) > 0 ? h('span',{class:'pill'}, `Max ${fmt(Number(method.max_amount || 0),2)}`) : h('span',{class:'pill'}, 'No max')
      ) : null,
      h('div',{class:'mb-journey-list'}, ...steps.map((step, idx)=>h('div',{class:'mb-journey-step'},
        h('span',{class:'no'}, String(idx + 1)),
        h('div',{}, step)
      )))
    );
  }

  function requestNextActionBox(kind, status){
    const v = String(status || 'pending').toLowerCase();
    let title = 'What happens next';
    let text = kind === 'deposit'
      ? 'Operations review your request, validate the transfer details, then credit the live account once the payment is confirmed.'
      : 'Operations validate your payout details, review available balance and KYC status, then release the withdrawal.';
    if(['approved','completed','confirmed','done'].includes(v)){
      title = kind === 'deposit' ? 'Funds confirmed' : 'Payout completed';
      text = kind === 'deposit' ? 'This request is completed and the live account should already reflect the credited funds.' : 'This payout is completed. Keep the request as your audit trail inside the dashboard.';
    } else if(['rejected','cancelled','failed'].includes(v)){
      title = 'Request closed';
      text = 'Review the operations note, adjust the details if needed, and submit a new request from the correct method.';
    }
    return h('div',{class:'mb-next-box'}, h('div',{class:'mb-card-title'}, title), h('div',{class:'mb-funds-help'}, text));
  }

  function fundingSummaryCard(kind, method, amountValue){
    const amountNum = Number(amountValue || 0);
    const isDeposit = kind === 'deposit';
    const limits = [
      `Min ${fmt(Number(method?.min_amount || 0), 2)}`,
      Number(method?.max_amount || 0) > 0 ? `Max ${fmt(Number(method.max_amount), 2)}` : 'No max'
    ].join(' • ');
    return h('div',{class:'mb-funding-summary'},
      h('div',{class:'mb-side-head'},
        h('div',{class:'mb-card-title'}, isDeposit ? 'Final review before submit' : 'Payout review'),
        h('span',{class:'pill'}, isDeposit ? 'Live funding' : 'Payout')
      ),
      h('div',{class:'mb-summary-grid'},
        h('div',{class:'mb-summary-box'},
          h('span',{class:'k'}, 'Method'),
          h('div',{class:'mb-summary-method'}, fundingMethodLogo(method, 'inline'), h('strong',{}, String(method?.title || method?.code || 'Method'))),
          h('small',{}, limits)
        ),
        h('div',{class:'mb-summary-box'}, h('span',{class:'k'}, 'Trading account'), h('strong',{}, `${accountLabel('live')} • ${accountNo('live')}`), h('small',{}, 'Requests stay linked to the live account dashboard history.')),
        h('div',{class:'mb-summary-box'}, h('span',{class:'k'}, isDeposit ? 'Funding amount' : 'Withdrawal amount'), h('strong',{}, amountNum > 0 ? `${fmt(amountNum,2)} USDT` : 'Enter amount'), h('small',{}, isDeposit ? 'Submit first, then follow the request instructions and upload proof if requested.' : 'Operations review the request, then release the payout to the selected method.')),
        h('div',{class:'mb-summary-box'}, h('span',{class:'k'}, 'Status after submit'), h('strong',{}, 'Pending review'), h('small',{}, isDeposit ? 'The request appears instantly in history with timeline, notes, and proof actions.' : 'The request appears instantly in history with status, admin notes, and payout progress.'))
      )
    );
  }

  function configuredFundingCategories(kind){
    const list = Array.isArray(state.__vpFundingCategories?.[String(kind || 'deposit').toLowerCase()])
      ? state.__vpFundingCategories[String(kind || 'deposit').toLowerCase()]
      : [];
    return list.map((cat, idx)=>({
      key: String(cat?.key || cat?.category_key || '').trim().toLowerCase(),
      label: String(cat?.label || cat?.title || '').trim(),
      hint: String(cat?.hint || cat?.description || '').trim(),
      icon: String(cat?.icon || '').trim(),
      image_url: String(cat?.image_url || '').trim(),
      sort_order: Number(cat?.sort_order ?? idx)
    })).filter(cat=>cat.key);
  }
  function fundingCategoryMeta(cat, kind){
    const key = String(cat || 'crypto').trim().toLowerCase();
    const configured = configuredFundingCategories(kind).find(item=>item.key === key);
    if(configured) return configured;
    if(key === 'bank') return {key, label:'Bank', hint:'Wire and local banking routes', icon:'🏦', image_url:'', sort_order:20};
    if(key === 'card') return {key, label:'Card', hint:'Visa, MasterCard, and card processors', icon:'💳', image_url:'', sort_order:30};
    if(key === 'crypto_bot') return {key, label:'Crypto Bot', hint:'Telegram bot checkout', icon:'🤖', image_url:'', sort_order:40};
    return {key:'crypto', label:'Crypto', hint:'Wallet and stablecoin routes', icon:'₿', image_url:'', sort_order:10};
  }
  function detectFundingCategory(method, kind){
    const explicit = String(method?.category_key || method?.method_group || '').toLowerCase().trim();
    if(['crypto','bank','card','crypto_bot'].includes(explicit)) return explicit;
    if(explicit) return explicit;
    const raw = `${String(method?.provider||'')} ${String(method?.code||'')} ${String(method?.title||'')}`.toLowerCase();
    if(/telegram|crypto\s*bot|tg|bot/.test(raw)) return 'crypto_bot';
    if(/bank|iban|swift|wire|sepa|local bank|account/.test(raw)) return 'bank';
    if(/card|visa|master|amex|apple pay|gpay|google pay|checkout|skrill|neteller/.test(raw)) return 'card';
    return 'crypto';
  }
  function categoryStateKey(kind){ return kind === 'withdraw' ? '__vpWithdrawCategory' : '__vpDepositCategory'; }
  function categoryMethods(kind){
    const all = kind === 'withdraw' ? (withdrawMethods || []) : (depositMethods || []);
    if(!all.length) return [];
    const key = categoryStateKey(kind);
    const cats = Array.from(new Set(all.map(m=>detectFundingCategory(m, kind))));
    let current = String(state[key] || '');
    if(!cats.includes(current)) current = cats[0] || 'crypto';
    state[key] = current;
    return all.filter(m=>detectFundingCategory(m, kind) === current);
  }
  function availableCategories(kind){
    const all = kind === 'withdraw' ? (withdrawMethods || []) : (depositMethods || []);
    const counts = {};
    all.forEach(m=>{ const catKey = detectFundingCategory(m, kind); counts[catKey] = (counts[catKey] || 0) + 1; });
    const configured = configuredFundingCategories(kind).slice().sort((a,b)=>Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const out = [];
    configured.forEach(cat=>{
      const count = Number(counts[cat.key] || 0);
      if(count > 0 || !all.length) out.push({...cat, count});
      delete counts[cat.key];
    });
    Object.keys(counts).forEach(catKey=>out.push({...fundingCategoryMeta(catKey, kind), count:Number(counts[catKey] || 0)}));
    return out.sort((a,b)=>Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }
  function currentCategory(kind){
    const key = categoryStateKey(kind);
    const cats = availableCategories(kind);
    let current = String(state[key] || '');
    if(!cats.some(c=>c.key === current)) current = cats[0]?.key || 'crypto';
    state[key] = current;
    return current;
  }
  function setCurrentCategory(kind, cat){
    state[categoryStateKey(kind)] = String(cat || 'crypto');
    const codeKey = kind === 'withdraw' ? '__vpWithdrawMethodCode' : '__vpDepositMethodCode';
    const nextMethods = categoryMethods(kind);
    state[codeKey] = nextMethods[0] ? String(nextMethods[0].code || '') : '';
    currentBucket(kind).stage = 1;
    persistFlow();
    render();
  }
  function proofRequiredForMethod(method){
    if(typeof method?.proof_required === 'boolean') return method.proof_required;
    return detectFundingCategory(method, 'deposit') !== 'crypto_bot';
  }
  function countdownNode(hours){
    const total = Math.max(1, Number(hours || 24)) * 3600;
    const start = Date.now();
    const el = h('div',{class:'mb-countdown-pill'}, '24:00:00');
    const paint = ()=>{
      const remain = Math.max(0, total - Math.floor((Date.now() - start) / 1000));
      const hh = String(Math.floor(remain / 3600)).padStart(2,'0');
      const mm = String(Math.floor((remain % 3600) / 60)).padStart(2,'0');
      const ss = String(remain % 60).padStart(2,'0');
      el.textContent = `${hh}:${mm}:${ss}`;
    };
    paint();
    try{ const t = setInterval(()=>{ if(!document.body.contains(el)) return clearInterval(t); paint(); },1000); }catch(e){}
    return el;
  }
  function paymentStepBox(method, amountValue){
    const cat = detectFundingCategory(method);
    const amountNum = Number(amountValue || 0);
    const cur = String(method?.currency || 'USDT').toUpperCase();
    const address = String(method?.payment_address || '').trim();
    const qr = String(method?.payment_qr_url || '').trim();
    const hours = Math.max(1, Number(method?.expires_hours || 24));
    const wrap = h('div',{class:'mb-payment-step-box'},
      h('div',{class:'mb-side-head'},
        h('div',{}, h('div',{class:'mb-card-title'}, cat === 'crypto_bot' ? 'Bot handoff' : 'Payment details'), h('div',{class:'mb-funds-help'}, cat === 'crypto_bot' ? 'Use the bot flow after entering the amount. The request still appears in your funding history.' : 'Complete the payment first, then confirm the request with proof inside this flow.')),
        h('div',{class:'mb-payment-meta'},
          h('span',{class:'pill'}, `${fmt(amountNum || 0,2)} ${cur}`),
          h('span',{class:'pill ghost'}, 'Window'),
          countdownNode(hours)
        )
      )
    );
    if(qr || address){
      wrap.appendChild(h('div',{class:'mb-payment-panel'},
        qr ? h('div',{class:'mb-payment-qr'}, h('img',{src:qr, alt:'QR', loading:'lazy', referrerpolicy:'no-referrer'})) : null,
        h('div',{class:'mb-payment-copy'},
          h('div',{class:'mb-field-label'}, cat === 'bank' ? 'Destination details' : 'Payment address'),
          h('div',{class:'mb-payment-address'}, address || 'Configured in admin instructions'),
          address ? h('button',{class:'btn outline btn-xs', type:'button', onclick:async()=>{ try{ await navigator.clipboard.writeText(address); toast('Copied'); }catch(e){} }}, 'Copy') : null
        )
      ));
    }
    if(method?.instructions){ wrap.appendChild(h('div',{class:'mb-warning-box subtle'}, String(method.instructions))); }
    return wrap;
  }
  function fieldValue(kind, key){ return String((currentBucket(kind).details && currentBucket(kind).details[key]) || ''); }
  function setFieldValue(kind, key, value){ if(!currentBucket(kind).details) currentBucket(kind).details = {}; currentBucket(kind).details[key] = value; persistFlow(); }
  function currentMethods(kind){ return categoryMethods(kind); }
  function ensureMethod(kind){
    const list = currentMethods(kind);
    const key = kind === 'withdraw' ? '__vpWithdrawMethodCode' : '__vpDepositMethodCode';
    const curCode = String(state[key] || '');
    let method = list.find(m=>String(m.code||'') === curCode) || list[0] || null;
    if(method) state[key] = String(method.code || '');
    return method;
  }
  async function loadMethods(){
    const jobs = [];
    if(!depositMethods) jobs.push(loadPaymentMethods('deposit','*','real').then(items=>{ state.__vpDepositMethods = items; depositMethods = items; }));
    if(!withdrawMethods) jobs.push(loadPaymentMethods('withdraw','*','real').then(items=>{ state.__vpWithdrawMethods = items; withdrawMethods = items; }));
    if(jobs.length){ Promise.allSettled(jobs).then(()=>render()).catch(()=>{}); }
  }
  loadMethods();

  async function refreshFundingWorkspace(force=true){
    const detailKind = String(flow.currentRequestType || '').toLowerCase();
    const detailId = Number(flow.currentRequestId || 0);
    if(force){
      if(detailKind === 'deposit') state.__vpDepositDetail = null;
      if(detailKind === 'withdraw') state.__vpWithdrawDetail = null;
    }
    await Promise.allSettled([
      refreshWalletSummary(true),
      refreshLedger(Number(state.ledgerPage || 1) || 1),
      refreshDepositsList(),
      refreshWithdrawalsList(),
      refreshOnboardingStatus(),
      refreshRealPortfolio(true)
    ]);
    if(detailId > 0 && (detailKind === 'deposit' || detailKind === 'withdraw')){
      const cacheKey = detailKind === 'deposit' ? '__vpDepositDetail' : '__vpWithdrawDetail';
      try{
        const r = await api(`/${detailKind === 'deposit' ? 'deposits' : 'withdrawals'}/get.php?id=${encodeURIComponent(detailId)}`);
        state[cacheKey] = r[detailKind === 'deposit' ? 'deposit' : 'withdrawal'];
      }catch(e){}
    }
  }

  function openRequest(kind, id){
    flow.currentRequestType = kind;
    flow.currentRequestId = Number(id || 0);
    state.__vpFundsTab = 'history';
    active = 'history';
    persistFlow();
    syncWalletHash();
    render();
  }

  function validateFunding(kind, method, amountEl){
    const amt = Number(amountEl.value || 0);
    if(!(amt > 0)) return {ok:false, error:'Enter a valid amount'};
    const minAmount = Number(method?.min_amount || 0);
    const maxAmount = Number(method?.max_amount || 0);
    if(minAmount > 0 && amt + 1e-9 < minAmount) return {ok:false, error:`Minimum amount is ${fmt(minAmount,2)} ${String(method?.currency || 'USDT').toUpperCase()}`};
    if(maxAmount > 0 && amt - 1e-9 > maxAmount) return {ok:false, error:`Maximum amount is ${fmt(maxAmount,2)} ${String(method?.currency || 'USDT').toUpperCase()}`};
    const details = {};
    for(const field of (Array.isArray(method?.fields) ? method.fields : [])){
      const key = String(field?.key || '').trim();
      if(!key) continue;
      const value = String((currentBucket(kind).details && currentBucket(kind).details[key]) || '').trim();
      if(field?.required && value === '') return {ok:false, error:(field.label || key) + ' is required'};
      if(value !== '') details[key] = value;
    }
    const destination = kind === 'withdraw'
      ? String(details.destination || details.wallet_address || details.bank_account || Object.values(details)[0] || '').trim()
      : '';
    if(kind === 'withdraw' && !destination) return {ok:false, error:'Payout details are required'};
    return {ok:true, amt, details, destination};
  }

  function summaryCard(kind, item){
    const methodKey = kind === 'deposit' ? 'method_code' : 'method';
    const status = String(item.status || 'pending').toLowerCase();
    const subtitle = `${String(item[methodKey] || item.provider || '').toUpperCase()} • ${String(item.currency || 'USDT').toUpperCase()} • ${vpFmtDate(item.created_at)}`;
    const note = item.admin_note ? String(item.admin_note) : (kind === 'deposit' ? (item.proof_available ? 'Proof uploaded • open request for details' : 'Proof pending • open request for details') : 'Open request for status timeline and admin notes');
    return h('button',{class:'mb-history-item', onclick:()=>openRequest(kind, item.id)},
      h('div',{class:'mb-history-main'},
        h('div',{class:'mb-history-top'},
          h('strong',{}, `${kind === 'deposit' ? 'Deposit' : 'Withdrawal'} #${item.id || '—'}`),
          statusBadge(status)
        ),
        h('div',{class:'mb-history-sub'}, subtitle),
        h('div',{class:'mb-history-note'}, note)
      ),
      h('div',{class:'mb-history-amt ' + (kind === 'deposit' ? 'up' : 'down')}, `${kind === 'deposit' ? '+' : '-'}${fmt(Number(item.amount || 0),2)}`)
    );
  }

  function onboardingPanel(){
    const ob = state.onboardingStatus;
    const steps = Array.isArray(ob?.steps) ? ob.steps : [];
    const total = steps.length || 4;
    const done = steps.filter(step=>['done','ready'].includes(String(step.status || '').toLowerCase())).length;
    const progress = Math.max(8, Math.min(100, Math.round((done / total) * 100)));
    const nextStep = String(ob?.next_step || 'verify');
    const nextAction = nextStep === 'fund'
      ? {label:'Fund Live Account', click:()=>startNew('deposit')}
      : (nextStep === 'trade'
        ? {label:'Open Trade', click:()=>{ location.hash = '#/trade'; }}
        : {label:'Open KYC', click:()=>openKycFlow().catch(()=>{})});

    return h('div',{class:'mb-onboarding-card'},
      h('div',{class:'mb-side-head'},
        h('div',{class:'mb-card-title'}, 'Onboarding'),
        h('span',{class:'pill'}, progress + '%')
      ),
      h('div',{class:'mb-onboarding-progress'}, h('div',{class:'mb-onboarding-progress-bar', style:'width:' + progress + '%'})),
      h('div',{class:'mb-side-row-sub'}, ob ? `Next step: ${String(ob.next_step || 'fund').replace('_',' ')}` : 'Complete your profile, verification, and live funding journey.'),
      h('div',{class:'mb-onboarding-list'},
        ...(steps.length ? steps.map(step=>h('div',{class:'mb-onboarding-step ' + String(step.status || '')},
          h('span',{class:'dot'}, ['done','ready'].includes(String(step.status||'').toLowerCase()) ? '✓' : (String(step.status||'').toLowerCase() === 'pending' ? '…' : '•')),
          h('div',{},
            h('div',{class:'ttl'}, String(step.title || step.key || 'Step')),
            h('div',{class:'sub'}, String(step.status || 'todo').toUpperCase())
          )
        )) : [h('div',{class:'muted small'}, 'Loading onboarding status…')])
      ),
      h('div',{class:'row mt-2 wrap'},
        h('button',{class:'btn primary', onclick:nextAction.click}, nextAction.label),
        h('button',{class:'btn outline', onclick:()=>location.hash='#/account'}, 'Profile')
      )
    );
  }

  function fundingMethodLogo(method, cls){
    const url = String(method?.image_url || method?.icon_url || '').trim();
    const label = String(method?.title || method?.code || 'PM').replace(/[^A-Z0-9]/gi,'').slice(0,3).toUpperCase() || 'PM';
    const wrap = h('span',{class:'mb-method-logo ' + (cls || '')});
    if(url){
      const img = h('img',{src:url, alt:label, loading:'lazy', referrerpolicy:'no-referrer'});
      img.onerror = ()=>{
        try{ img.remove(); }catch(_e){}
        if(!wrap.querySelector('.mb-method-logo-fallback')){
          wrap.appendChild(h('span',{class:'mb-method-logo-fallback'}, label));
        }
      };
      wrap.appendChild(img);
    }else{
      wrap.appendChild(h('span',{class:'mb-method-logo-fallback'}, label));
    }
    return wrap;
  }

  function fundingCategoryBadge(cat){
    const imageUrl = String(cat?.image_url || '').trim();
    if(imageUrl){
      const wrap = h('div',{class:'mb-method-category-image'});
      const img = h('img',{src:imageUrl, alt:String(cat?.label || cat?.key || 'Category'), loading:'lazy', referrerpolicy:'no-referrer'});
      img.onerror = ()=>{
        try{ wrap.replaceWith(h('div',{class:'mb-method-category-icon'}, cat?.icon || '•')); }catch(_e){}
      };
      wrap.appendChild(img);
      return wrap;
    }
    return h('div',{class:'mb-method-category-icon'}, cat?.icon || '•');
  }

  function methodChooser(kind, selected, onPick){
    const categories = availableCategories(kind);
    const activeCat = currentCategory(kind);
    const list = currentMethods(kind);
    const all = kind === 'withdraw' ? (withdrawMethods || []) : (depositMethods || []);
    const countForCat = (key)=>all.filter(m=>detectFundingCategory(m, kind) === key).length;
    if(!list.length) return h('div',{class:'mb-empty-box'}, h('div',{class:'mb-empty-title'}, `No active ${kind} methods found in admin.`));
    return h('div',{},
      h('div',{class:'mb-method-category-row'}, ...categories.map(cat=>h('button',{class:'mb-method-category ' + (activeCat === cat.key ? 'active' : ''), type:'button', onclick:()=>setCurrentCategory(kind, cat.key)},
        fundingCategoryBadge(cat),
        h('strong',{}, cat.label),
        h('span',{}, cat.hint),
        h('em',{class:'mb-method-category-count'}, String(cat.count ?? countForCat(cat.key)))
      ))),
      h('div',{class:'mb-method-grid'}, ...list.map(m=>{
        const isActive = String(selected?.code || '') === String(m.code || '');
        const activeCls = isActive ? 'active' : '';
        return h('button',{class:'mb-method-card ' + activeCls, type:'button', onclick:()=>onPick(m)},
          h('div',{class:'mb-method-head'},
            h('div',{class:'mb-method-media'},
              fundingMethodLogo(m),
              h('div',{class:'mb-method-head-copy'},
                h('strong',{}, String(m.title || m.code || 'Method')),
                h('div',{class:'mb-method-code'}, String(m.code || '').toUpperCase() || fundingCategoryMeta(detectFundingCategory(m, kind), kind).label)
              )
            ),
            h('span',{class:'pill'}, String(m.currency || 'USDT').toUpperCase())
          ),
          h('div',{class:'mb-method-desc'}, String(m.description || m.instructions || fundingCategoryMeta(detectFundingCategory(m, kind), kind).hint || '')),
          h('div',{class:'mb-method-foot'},
            h('div',{class:'mb-method-limits'}, `Min ${fmt(Number(m.min_amount || 0),2)} • ${Number(m.max_amount || 0) > 0 ? ('Max ' + fmt(Number(m.max_amount || 0),2)) : 'No max'}`),
            h('span',{class:'mb-method-check ' + (isActive ? 'active' : '')}, isActive ? 'Selected' : 'Tap to select')
          )
        );
      }))
    );
  }

  function renderDynamicFields(kind, method){
    const fields = Array.isArray(method?.fields) ? method.fields : [];
    if(!fields.length) return h('div',{class:'muted small'}, 'No additional fields required for this method.');
    return h('div',{class:'mb-dynamic-fields'}, ...fields.map(field=>{
      const key = String(field?.key || '').trim();
      const type = String(field?.type || 'text').toLowerCase();
      const label = String(field?.label || key || 'Field');
      const placeholder = String(field?.placeholder || '');
      const required = !!field?.required;
      let input;
      if(type === 'textarea'){
        input = h('textarea',{class:'input', placeholder, oninput:(e)=>setFieldValue(kind, key, e.target.value)}, fieldValue(kind, key));
      } else if(type === 'select'){
        const opts = Array.isArray(field?.options) ? field.options : [];
        input = h('select',{class:'input', onchange:(e)=>setFieldValue(kind, key, e.target.value)},
          h('option',{value:''}, placeholder || label),
          ...opts.map(opt=>{
            const value = typeof opt === 'object' ? String(opt.value ?? opt.label ?? '') : String(opt);
            const text = typeof opt === 'object' ? String(opt.label ?? opt.value ?? '') : String(opt);
            return h('option',{value, selected:fieldValue(kind, key) === value}, text);
          })
        );
      } else {
        input = h('input',{class:'input', type:type === 'number' ? 'number' : 'text', step:type === 'number' ? '0.01' : undefined, value:fieldValue(kind, key), placeholder, oninput:(e)=>setFieldValue(kind, key, e.target.value)});
      }
      return h('div',{class:'mb-field-card'},
        h('div',{class:'mb-field-label'}, label + (required ? ' *' : '')),
        input
      );
    }));
  }

  async function submitDeposit(method, amountEl, proofInput){
    const check = validateFunding('deposit', method, amountEl);
    if(!check.ok) return toast(check.error);
    try{
      const r = await api('/deposits/create.php', {method:'POST', headers:{'Idempotency-Key': (crypto?.randomUUID ? crypto.randomUUID() : ('dep_'+Date.now()))}, body:{provider: method.provider || 'manual', method: method.code, currency: method.currency || 'USDT', amount: check.amt, details: check.details}});
      const depId = Number(r?.deposit?.id || 0);
      if(depId > 0 && proofInput && proofInput.files && proofInput.files[0]){
        const fd = new FormData();
        fd.append('deposit_id', String(depId));
        fd.append('proof', proofInput.files[0]);
        try{ await api('/deposits/upload_proof.php', {method:'POST', body:fd, isFormData:true, timeoutMs:30000}); }catch(e){ toast('Proof upload failed. You can upload it from request details.'); }
      }
      flow.currentRequestType = 'deposit';
      flow.currentRequestId = Number(r?.deposit?.id || 0);
      depositFlow.amount = '50';
      depositFlow.details = {};
      depositFlow.stage = 3;
      state.__vpFundingFlash = {kind:'deposit', id:flow.currentRequestId, text:'Deposit request submitted. Continue with proof upload and track the status below.'};
      state.__vpDepositDetail = null;
      persistFlow();
      active = 'history';
      state.__vpFundsTab = 'history';
      tpSync.invalidate('deposit-created');
      await Promise.allSettled([refreshDepositsList(), refreshLedger(1), refreshWalletSummary(true), refreshOnboardingStatus()]);
      syncWalletHash();
      render();
    }catch(e){ toast('❌ ' + (e.message || 'Deposit request failed')); }
  }

  async function submitWithdrawal(method, amountEl){
    const check = validateFunding('withdraw', method, amountEl);
    if(!check.ok) return toast(check.error);
    try{
      const r = await api('/withdrawals/create.php', {method:'POST', headers:{'Idempotency-Key': (crypto?.randomUUID ? crypto.randomUUID() : ('wdr_'+Date.now()))}, body:{method: method.code, currency: method.currency || 'USDT', amount: check.amt, destination: check.destination, details: check.details}});
      flow.currentRequestType = 'withdraw';
      flow.currentRequestId = Number(r?.withdrawal?.id || 0);
      withdrawFlow.amount = '';
      withdrawFlow.details = {};
      withdrawFlow.stage = 3;
      state.__vpFundingFlash = {kind:'withdraw', id:flow.currentRequestId, text:'Withdrawal request submitted. Operations will review the payout details and update the status here.'};
      state.__vpWithdrawDetail = null;
      persistFlow();
      active = 'history';
      state.__vpFundsTab = 'history';
      tpSync.invalidate('withdrawal-created');
      await Promise.allSettled([refreshWithdrawalsList(), refreshLedger(1), refreshWalletSummary(true), refreshOnboardingStatus()]);
      syncWalletHash();
      render();
    }catch(e){ toast('❌ ' + (e.message || 'Withdrawal request failed')); }
  }

  function requestTimeline(kind, data){
    const status = String((data && data.status) || 'pending').toLowerCase();
    const finalDone = ['approved','completed','confirmed','done'].includes(status);
    const closed = ['rejected','cancelled','failed'].includes(status);
    const steps = [
      {label:'Request created', ts:data?.created_at, done:true, sub:'The request is now stored in your funding center.'},
      {label:kind === 'deposit' ? 'Operations review' : 'Compliance & payout review', ts:data?.updated_at || data?.created_at, done:!closed || finalDone, sub:kind === 'deposit' ? 'Review the transfer details, method, and proof if provided.' : 'Review the payout route, balance, KYC status, and destination details.'},
      {label:kind === 'deposit' ? (closed ? 'Request closed' : 'Funds credited') : (closed ? 'Request closed' : 'Payout completed'), ts:(data?.confirmed_at || data?.completed_at || data?.updated_at || 0), done:finalDone || closed, sub:closed ? 'The request was closed before completion. Review the note below.' : (kind === 'deposit' ? 'The live account balance should reflect the credited funds.' : 'The payout was released through the selected method.')}
    ];
    return h('div',{class:'mb-timeline'}, ...steps.map(step=>h('div',{class:'mb-timeline-step ' + (step.done ? 'done' : '')},
      h('span',{class:'node'}, step.done ? '✓' : '•'),
      h('div',{},
        h('div',{class:'ttl'}, step.label),
        h('div',{class:'sub'}, step.ts ? vpFmtDate(step.ts) : 'Pending'),
        step.sub ? h('div',{class:'sub'}, step.sub) : null
      )
    )));
  }

  function renderRequestDetail(kind){
    const id = Number(flow.currentRequestId || 0);
    if(!id || flow.currentRequestType !== kind){
      return h('div',{class:'mb-empty-box'}, h('div',{class:'mb-empty-title'}, `No ${kind} request selected`), h('div',{class:'mb-empty-sub'}, 'Open one from the history list to review its full timeline, method instructions, and admin notes.'));
    }
    const cacheKey = kind === 'deposit' ? '__vpDepositDetail' : '__vpWithdrawDetail';
    const detail = state[cacheKey] && Number(state[cacheKey].id || 0) === id ? state[cacheKey] : null;
    if(!detail){
      api(`/${kind === 'deposit' ? 'deposits' : 'withdrawals'}/get.php?id=${encodeURIComponent(id)}`).then(r=>{
        state[cacheKey] = r[kind === 'deposit' ? 'deposit' : 'withdrawal'];
        render();
      }).catch(()=>{});
      return h('div',{class:'mb-empty-box'}, h('div',{class:'mb-empty-title'}, 'Loading request details…'));
    }
    const data = detail;
    const meta = statusMeta(kind, data.status);
    const methodInstructions = String(data.method?.instructions || data.method?.description || '').trim();
    const metricBoxes = h('div',{class:'mb-summary-grid'},
      h('div',{class:'mb-summary-box'}, h('span',{class:'k'}, 'Request ID'), h('strong',{}, `#${data.id}`), h('small',{}, `Created ${vpFmtDate(data.created_at)}`)),
      h('div',{class:'mb-summary-box'},
        h('span',{class:'k'}, 'Method'),
        h('div',{class:'mb-summary-method'}, fundingMethodLogo(data.method || {title:data.method_code}, 'inline'), h('strong',{}, String(data.method?.title || data.method?.code || data.method_code || '—'))),
        h('small',{}, String(data.currency || 'USDT').toUpperCase())
      ),
      h('div',{class:'mb-summary-box'}, h('span',{class:'k'}, 'Amount'), h('strong',{}, `${fmt(Number(data.amount || 0),2)} ${String(data.currency || 'USDT').toUpperCase()}`), h('small',{}, kind === 'deposit' ? 'Live account funding request' : 'Requested payout amount')),
      h('div',{class:'mb-summary-box'}, h('span',{class:'k'}, 'Last update'), h('strong',{}, vpFmtDate(data.updated_at || data.completed_at || data.confirmed_at || data.created_at)), h('small',{}, String(data.status || 'pending').toUpperCase()))
    );
    const body = h('div',{class:'mb-request-detail'},
      h('div',{class:'mb-request-head'},
        h('div',{},
          h('div',{class:'mb-funds-form-title'}, `${kind === 'deposit' ? 'Deposit' : 'Withdrawal'} #${data.id}`),
          h('div',{class:'mb-funds-help'}, `${String(data.currency || 'USDT').toUpperCase()} • ${fmt(Number(data.amount || 0),2)} • ${vpFmtDate(data.created_at)}`)
        ),
        statusBadge(data.status || 'pending')
      ),
      requestStageStepper(kind, meta),
      metricBoxes,
      h('div',{class:'mb-status-box ' + (meta.tone || 'warn')},
        h('div',{class:'mb-card-title'}, meta.title),
        h('div',{class:'mb-funds-help'}, meta.text)
      ),
      requestNextActionBox(kind, data.status),
      data.method ? h('div',{class:'mb-request-method-box'},
        h('div',{class:'row wrap', style:'justify-content:space-between;gap:10px'},
          h('div',{class:'mb-card-title'}, String(data.method.title || data.method.code || 'Method')),
          methodInstructions ? h('button',{class:'btn outline btn-xs', onclick:async()=>{ try{ await navigator.clipboard.writeText(methodInstructions); toast('Instructions copied'); }catch(e){ toast('Copy failed'); } }}, 'Copy instructions') : null
        ),
        h('div',{class:'mb-funds-help'}, methodInstructions || 'No extra method instructions provided.')
      ) : null,
      requestTimeline(kind, data),
      data.admin_note ? h('div',{class:'mb-warning-box subtle'}, data.admin_note) : null,
      (data.details && Object.keys(data.details || {}).filter(k=>!String(k).startsWith('proof_')).length) ? h('div',{class:'mb-request-kv-grid'},
        ...Object.entries(data.details || {}).filter(([k])=>!String(k).startsWith('proof_')).map(([k,v])=>h('div',{class:'mb-kv-item'}, h('span',{class:'k'}, String(k).replace(/_/g,' ')), h('span',{class:'v'}, String(v))))
      ) : null
    );
    if(kind === 'deposit'){
      const hasProof = !!(data.proof_available || data.details?.proof_path);
      const proofEditable = ['pending','requested','review','under_review'].includes(String(data.status || '').toLowerCase());
      const proofOpenUrl = data.details?.proof_view_url || ('/api/deposits/proof.php?id=' + data.id);
      const editOpen = !hasProof || Number(state.__vpDepositProofEdit || 0) === Number(data.id);
      const fileInput = h('input',{type:'file', accept:'.jpg,.jpeg,.png,.webp,.pdf'});
      body.appendChild(h('div',{class:'mb-proof-box'},
        h('div',{class:'mb-card-title'}, 'Proof of payment'),
        h('div',{class:'mb-funds-help'}, hasProof ? 'Proof has already been uploaded for this request. Review it below, or replace it only if operations ask you to update the receipt.' : 'Upload a receipt, transfer screenshot, or payment confirmation for the operations team.'),
        hasProof ? h('div',{class:'row mt-2 wrap'},
          h('a',{class:'btn outline', href:proofOpenUrl, target:'_blank'}, 'Open current proof'),
          proofEditable ? h('button',{class:'btn outline', type:'button', onclick:()=>{ state.__vpDepositProofEdit = editOpen ? 0 : Number(data.id); render(); }}, editOpen ? 'Cancel replace' : 'Replace proof') : null
        ) : null,
        editOpen ? h('div',{class:'row mt-2 wrap'},
          fileInput,
          h('button',{class:'btn primary', onclick:async()=>{
            const file = fileInput.files && fileInput.files[0];
            if(!file) return toast('Choose a proof file first');
            const fd = new FormData();
            fd.append('deposit_id', String(data.id));
            fd.append('proof', file);
            try{
              await api('/deposits/upload_proof.php', {method:'POST', body:fd, isFormData:true, timeoutMs:30000});
              state.__vpDepositDetail = null;
              state.__vpDepositProofEdit = 0;
              await Promise.allSettled([refreshDepositsList(), refreshOnboardingStatus()]);
              toast('Proof uploaded');
              render();
            }catch(e){ toast('❌ ' + (e.message || 'Upload failed')); }
          }}, hasProof ? 'Update proof' : 'Upload proof')
        ) : null
      ));
    }
    body.appendChild(h('div',{class:'row mt-2 wrap'},
      h('button',{class:'btn outline', onclick:()=>setActiveTab('history')}, 'Back to history'),
      h('button',{class:'btn outline', onclick:async()=>{ await refreshFundingWorkspace(true); render(); }}, 'Refresh request'),
      h('button',{class:'btn', onclick:()=>startNew(kind)}, kind === 'deposit' ? 'New deposit request' : 'New withdrawal request'),
      h('button',{class:'btn', onclick:()=>{ clearSelectedRequest(); syncWalletHash(); render(); }}, 'Clear selection')
    ));
    return body;
  }

  function stageHeader(title, sub){
    return h('div',{}, h('div',{class:'mb-funds-form-title'}, title), h('div',{class:'mb-funds-help'}, sub));
  }


  function quickAmountRow(kind, amountEl){
    const presetValues = [50, 100, 250, 500, 1000];
    const current = currentBucket(kind);
    const syncAmount = (val)=>{
      const next = String(val || '');
      current.amount = next;
      persistFlow();
      try{ amountEl.value = next; }catch(e){}
      try{ amountEl.dispatchEvent(new Event('input', {bubbles:true})); }catch(e){}
      try{ render(); }catch(e){}
    };
    return h('div',{class:'mb-quick-amount-row'},
      ...presetValues.map(v=>h('button',{class:'mb-quick-amount-btn ' + (String(current.amount || '') === String(v) ? 'active' : ''), type:'button', onclick:()=>syncAmount(v)}, `${v} USDT`))
    );
  }

  function renderDepositForm(){
    const selected = ensureMethod('deposit');
    const bucket = currentBucket('deposit');
    const cat = currentCategory('deposit');
    if(!selected) return h('div',{class:'mb-empty-box'}, h('div',{class:'mb-empty-title'}, 'No active deposit methods found in admin.'));
    const amountEl = h('input',{class:'input', type:'number', step:'0.01', min:'0', value:String(bucket.amount || '50'), oninput:(e)=>{ bucket.amount = e.target.value; persistFlow(); }});
    const proofInput = h('input',{class:'input', type:'file', accept:'image/*,.pdf'});
    const requiresProof = proofRequiredForMethod(selected);
    const submit = ()=>submitDeposit(selected, amountEl, proofInput);
    if(Number(bucket.stage || 1) >= 3 && flow.currentRequestType === 'deposit' && flow.currentRequestId){
      return h('div',{}, wizardStepper('deposit', 3), renderRequestDetail('deposit'));
    }
    if(Number(bucket.stage || 1) === 1){
      return h('div',{},
        wizardStepper('deposit', 1),
        stageHeader(vpTr('Choose funding category','اختر فئة الإيداع','Выберите категорию пополнения'), vpTr('Select category first, then pick the exact route configured in admin.','اختر الفئة أولاً ثم اختر المسار المضبوط من الإدارة.','Сначала выберите категорию, затем точный маршрут из админки.')),
        methodChooser('deposit', selected, (m)=>{ state.__vpDepositMethodCode = String(m.code || ''); persistFlow(); render(); }),
        h('div',{class:'row mt-2 wrap'},
          h('button',{class:'btn primary', onclick:()=>setStage('deposit', 2, {clearRequest:true})}, vpTr('Continue','متابعة','Продолжить')),
          h('button',{class:'btn outline', onclick:()=>setActiveTab('history')}, vpTr('History','السجل','История'))
        )
      );
    }
    return h('div',{},
      wizardStepper('deposit', 2),
      stageHeader(cat === 'crypto_bot' ? vpTr('Bot checkout','إكمال عبر البوت','Оплата عبر бота') : vpTr('Payment details','تفاصيل الدفع','Платёжные данные'), cat === 'crypto_bot' ? vpTr('Enter the amount and continue. The request still appears in funding history for tracking.','أدخل المبلغ ثم أكمل. سيظهر الطلب أيضاً في سجل التمويل للمتابعة.','Введите сумму и продолжите. Заявка также появится в истории финансирования.') : vpTr('Review the amount, payment destination, and proof before you confirm the deposit request.','راجع المبلغ وبيانات الدفع وإثبات التحويل قبل تأكيد طلب الإيداع.','Проверьте сумму, реквизиты оплаты и подтверждение перед отправкой заявки.')),
      h('div',{class:'mb-inline-grid'},
        h('div',{class:'mb-field-card'}, h('div',{class:'mb-field-label'}, vpTr('Method','الوسيلة','Метод')), h('div',{class:'mb-summary-method'}, fundingMethodLogo(selected,'inline'), h('strong',{}, String(selected.title || selected.code || 'Method'))), h('div',{class:'mb-funds-help'}, String(selected.description || selected.instructions || ''))),
        h('div',{class:'mb-field-card'}, h('div',{class:'mb-field-label'}, `${vpTr('Amount','المبلغ','Сумма')} (${String(selected.currency || 'USDT').toUpperCase()})`), amountEl, quickAmountRow('deposit', amountEl))
      ),
      paymentStepBox(selected, bucket.amount),
      renderDynamicFields('deposit', selected),
      requiresProof ? h('div',{class:'mb-field-card'}, h('div',{class:'mb-field-label'}, vpTr('Payment proof *','إثبات الدفع *','Подтверждение оплаты *')), proofInput, h('div',{class:'mb-funds-help'}, vpTr('Upload the transfer screenshot or receipt before confirming the deposit.','ارفع صورة التحويل أو الإيصال قبل تأكيد الإيداع.','Загрузите скриншот перевода или квитанцию перед подтверждением пополнения.'))) : null,
      h('div',{class:'row mt-2 wrap'},
        h('button',{class:'btn outline', onclick:()=>setStage('deposit', 1, {clearRequest:true})}, vpTr('Back','رجوع','Назад')),
        h('button',{class:'btn primary', onclick:()=>{ if(requiresProof && !(proofInput.files && proofInput.files[0])) return toast(vpTr('Upload payment proof first','ارفع إثبات الدفع أولاً','Сначала загрузите подтверждение оплаты')); submit(); }}, cat === 'crypto_bot' ? vpTr('Continue with bot','المتابعة عبر البوت','Продолжить через бота') : vpTr('Confirm deposit','تأكيد الإيداع','Подтвердить пополнение')),
        h('button',{class:'btn outline', onclick:()=>setActiveTab('history')}, vpTr('History','السجل','История'))
      )
    );
  }

  function renderWithdrawForm(){
    const selected = ensureMethod('withdraw');
    const bucket = currentBucket('withdraw');
    if(!selected) return h('div',{class:'mb-empty-box'}, h('div',{class:'mb-empty-title'}, 'No active withdrawal methods found in admin.'));
    const amountEl = h('input',{class:'input', type:'number', step:'0.01', min:'0', value:String(bucket.amount || ''), oninput:(e)=>{ bucket.amount = e.target.value; persistFlow(); }});
    const submit = ()=>submitWithdrawal(selected, amountEl);
    if(Number(bucket.stage || 1) >= 3 && flow.currentRequestType === 'withdraw' && flow.currentRequestId){
      return h('div',{}, wizardStepper('withdraw', 3), renderRequestDetail('withdraw'));
    }
    if(Number(bucket.stage || 1) === 1){
      return h('div',{},
        wizardStepper('withdraw', 1),
        stageHeader(vpTr('Choose payout category','اختر فئة السحب','Выберите категорию выплаты'), vpTr('Select category first, then choose the exact payout route configured in admin.','اختر الفئة أولاً ثم اختر مسار السحب المضبوط من الإدارة.','Сначала выберите категорию, затем точный маршрут выплаты из админки.')),
        h('div',{class:'mb-warning-box subtle'}, `${vpTr('Available live balance','الرصيد الحقيقي المتاح','Доступный баланс')} : ${money(snap.freeMargin,2)} USDT`),
        methodChooser('withdraw', selected, (m)=>{ state.__vpWithdrawMethodCode = String(m.code || ''); persistFlow(); render(); }),
        h('div',{class:'row mt-2 wrap'},
          h('button',{class:'btn primary', onclick:()=>setStage('withdraw', 2, {clearRequest:true})}, vpTr('Continue','متابعة','Продолжить')),
          h('button',{class:'btn outline', onclick:()=>setActiveTab('history')}, vpTr('History','السجل','История'))
        )
      );
    }
    return h('div',{},
      wizardStepper('withdraw', 2),
      stageHeader(vpTr('Review withdrawal','مراجعة السحب','Проверка вывода'), vpTr('Confirm the amount and destination exactly as required by the selected method before submission.','أكد المبلغ ووجهة السحب كما تطلبها الوسيلة المحددة قبل الإرسال.','Подтвердите сумму и реквизиты точно так, как требует выбранный метод, перед отправкой.')),
      h('div',{class:'mb-inline-grid'},
        h('div',{class:'mb-field-card'}, h('div',{class:'mb-field-label'}, vpTr('Method','الوسيلة','Метод')), h('div',{class:'mb-summary-method'}, fundingMethodLogo(selected,'inline'), h('strong',{}, String(selected.title || selected.code || 'Method'))), h('div',{class:'mb-funds-help'}, String(selected.description || selected.instructions || ''))),
        h('div',{class:'mb-field-card'}, h('div',{class:'mb-field-label'}, vpTr('Amount','المبلغ','Сумма') + ' (USDT)'), amountEl, quickAmountRow('withdraw', amountEl))
      ),
      h('div',{class:'mb-warning-box subtle'}, `${vpTr('Available live balance','الرصيد الحقيقي المتاح','Доступный баланс')} : ${money(snap.freeMargin,2)} USDT`),
      renderDynamicFields('withdraw', selected),
      h('div',{class:'row mt-2 wrap'},
        h('button',{class:'btn outline', onclick:()=>setStage('withdraw', 1, {clearRequest:true})}, vpTr('Back','رجوع','Назад')),
        h('button',{class:'btn primary', onclick:submit}, vpTr('Confirm withdrawal','تأكيد السحب','Подтвердить вывод')),
        h('button',{class:'btn outline', onclick:()=>setActiveTab('history')}, vpTr('History','السجل','История'))
      )
    );
  }

  function renderHistory(){
    const depItems = (state.depositsList && Array.isArray(state.depositsList.items)) ? state.depositsList.items.map(it=>Object.assign({kind:'deposit'}, it)) : [];
    const wdrItems = (state.withdrawalsList && Array.isArray(state.withdrawalsList.items)) ? state.withdrawalsList.items.map(it=>Object.assign({kind:'withdraw'}, it)) : [];
    const activeFilter = ['all','deposit','withdraw'].includes(String(state.__vpFundingHistoryKind || 'all')) ? String(state.__vpFundingHistoryKind || 'all') : 'all';
    const searchState = { value: String(state.__vpFundingHistorySearch || '').trim() };
    const rows = depItems.concat(wdrItems).sort((a,b)=>vpEpoch(b.updated_at || b.created_at || 0) - vpEpoch(a.updated_at || a.created_at || 0));
    const selectedKind = String(flow.currentRequestType || '').toLowerCase();
    const selectedId = Number(flow.currentRequestId || 0);
    const searchNeedle = String(searchState.value || '').trim().toUpperCase();
    const matchesHistorySearch = (item)=>{
      if(!searchNeedle) return true;
      const hay = [
        item?.kind,
        item?.id,
        item?.method_code,
        item?.method,
        item?.provider,
        item?.currency,
        item?.status,
        item?.admin_note,
        item?.amount
      ].map(v=>String(v ?? '')).join(' ').toUpperCase();
      return hay.includes(searchNeedle);
    };
    const byKind = activeFilter === 'all' ? rows : rows.filter(item=>String(item.kind || '') === activeFilter);
    const filtered = byKind.filter(matchesHistorySearch).sort((a,b)=>{
      const aSel = (selectedId > 0 && String(a?.kind || '') === selectedKind && Number(a?.id || 0) === selectedId) ? 1 : 0;
      const bSel = (selectedId > 0 && String(b?.kind || '') === selectedKind && Number(b?.id || 0) === selectedId) ? 1 : 0;
      if(aSel !== bSel) return bSel - aSel;
      return vpEpoch(b.updated_at || b.created_at || 0) - vpEpoch(a.updated_at || a.created_at || 0);
    });
    const selected = (selectedId > 0 && (selectedKind === 'deposit' || selectedKind === 'withdraw'))
      ? rows.find(item=>String(item.kind || '') === selectedKind && Number(item.id || 0) === selectedId) || null
      : null;
    const filterBtn = (key, label)=>h('button',{class:'btn ' + (activeFilter === key ? 'primary' : 'outline'), onclick:()=>{ state.__vpFundingHistoryKind = key; render(); }}, label);
    const searchInput = h('input',{class:'input mb-history-search-input', placeholder:vpTr('Search request, method, currency, or status','ابحث بالطلب أو الوسيلة أو العملة أو الحالة','Поиск по заявке, методу, валюте или статусу'), value:searchState.value});
    searchInput.addEventListener('input', ()=>{ state.__vpFundingHistorySearch = searchInput.value || ''; render(); });
    const clearSearchBtn = searchState.value
      ? h('button',{class:'btn outline', onclick:()=>{ state.__vpFundingHistorySearch = ''; render(); }}, vpTr('Clear','مسح','Очистить'))
      : null;
    const list = filtered.length
      ? filtered.map(item=>summaryCard(item.kind, item))
      : [h('div',{class:'mb-empty-box'}, h('div',{class:'mb-empty-title'}, searchState.value ? vpTr('No requests match this search','لا توجد طلبات مطابقة لهذا البحث','Нет заявок по этому поиску') : 'No funding requests yet'), h('div',{class:'mb-empty-sub'}, searchState.value ? vpTr('Try another keyword or clear the search field.','جرّب كلمة أخرى أو امسح حقل البحث.','Попробуйте другое слово или очистите поиск.') : 'Create a deposit or withdrawal request and the full timeline will appear here.'))];
    const selectedSummary = selected
      ? h('div',{class:'mb-history-selected-bar'},
          h('div',{class:'mb-history-selected-copy'},
            h('span',{class:'pill ' + (selected.kind === 'deposit' ? 'ok' : 'ghost')}, selected.kind === 'deposit' ? vpTr('Deposit selected','تم تحديد الإيداع','Выбрано пополнение') : vpTr('Withdrawal selected','تم تحديد السحب','Выбран вывод')),
            h('strong',{}, `${selected.kind === 'deposit' ? vpTr('Request','الطلب','Заявка') : vpTr('Request','الطلب','Заявка')} #${selected.id}`),
            h('span',{class:'muted small'}, `${fundingStatusLabel(selected.status)} • ${vpFmtDate(selected.updated_at || selected.created_at || 0)}`)
          ),
          h('div',{class:'mb-history-selected-actions'},
            h('button',{class:'btn outline slim', onclick:()=>openRequest(selected.kind, selected.id)}, vpTr('Open detail','فتح التفاصيل','Открыть')),
            h('button',{class:'btn outline slim', onclick:()=>{ clearSelectedRequest(); syncWalletHash(); render(); }}, vpTr('Clear','مسح','Очистить'))
          )
        )
      : null;
    return h('div',{class:'mb-history-shell'},
      h('div',{class:'mb-funds-form-title'}, vpTr('Funding history','سجل التمويل','История финансирования')),
      h('div',{class:'mb-funds-help'}, vpTr('Track every deposit and withdrawal request, including proof uploads, admin notes, and status changes.','تابع كل طلبات الإيداع والسحب، بما في ذلك الإثباتات وملاحظات الإدارة وتغيّرات الحالة.','Отслеживайте все заявки на пополнение и вывод, включая подтверждения, заметки администрации и смену статуса.')),
      selectedSummary,
      h('div',{class:'mb-history-toolbar'},
        h('div',{class:'row wrap mt-2 mb-history-filters'},
          filterBtn('all', vpTr('All','الكل','Все')),
          filterBtn('deposit', vpTr('Deposits','الإيداعات','Пополнения')),
          filterBtn('withdraw', vpTr('Withdrawals','السحوبات','Выводы')),
          h('button',{class:'btn outline', onclick:async()=>{ await refreshFundingWorkspace(true); render(); }}, vpTr('Refresh','تحديث','Обновить'))
        ),
        h('div',{class:'mb-history-toolbar-right'},
          searchInput,
          clearSearchBtn,
          h('span',{class:'pill ghost'}, `${filtered.length} ${vpTr('items','عناصر','элементов')}`)
        )
      ),
      h('div',{class:'mb-funds-shell mb-funds-history-layout'},
        h('div',{class:'card mb-funds-main'},
          h('div',{class:'mb-history-list'}, ...list)
        ),
        h('div',{class:'card mb-funds-side'},
          selected ? renderRequestDetail(selected.kind) : h('div',{class:'mb-empty-box'}, h('div',{class:'mb-empty-title'}, vpTr('Select a request','اختر طلباً','Выберите заявку')), h('div',{class:'mb-empty-sub'}, vpTr('Open any funding item from the list to review the timeline, method instructions, proof upload, and admin notes.','افتح أي عنصر من القائمة لمراجعة الخط الزمني وتعليمات الوسيلة ورفع الإثبات وملاحظات الإدارة.','Откройте любую заявку из списка, чтобы увидеть таймлайн, инструкции метода, подтверждение и заметки администрации.')))
        )
      )
    );
  }

  function renderFundsMain(){
    main.innerHTML = '';
    const tabTop = h('div',{class:'mb-funds-top-tabs'},
      h('button',{class:'mb-funds-top-tab ' + (active === 'deposit' ? 'active' : ''), onclick:()=>startNew('deposit')}, 'Deposit'),
      h('button',{class:'mb-funds-top-tab ' + (active === 'withdraw' ? 'active' : ''), onclick:()=>startNew('withdraw')}, 'Withdraw'),
      h('button',{class:'mb-funds-top-tab ' + (active === 'history' ? 'active' : ''), onclick:()=>setActiveTab('history')}, 'History')
    );
    let body = h('div',{});
    if(active === 'deposit') body = renderDepositForm();
    else if(active === 'withdraw') body = renderWithdrawForm();
    else body = renderHistory();
    main.appendChild(h('div',{class:'mb-funds-content'}, tabTop, body));
  }

  renderFundsMain();

  const depItems = (state.depositsList && Array.isArray(state.depositsList.items)) ? state.depositsList.items : [];
  const wdrItems = (state.withdrawalsList && Array.isArray(state.withdrawalsList.items)) ? state.withdrawalsList.items : [];
  const pendingDeposits = depItems.filter(it=>!['approved','completed','confirmed','done'].includes(String(it.status || '').toLowerCase()) && !['rejected','cancelled','failed'].includes(String(it.status || '').toLowerCase())).length;
  const pendingWithdrawals = wdrItems.filter(it=>!['approved','completed','confirmed','done'].includes(String(it.status || '').toLowerCase()) && !['rejected','cancelled','failed'].includes(String(it.status || '').toLowerCase())).length;
  const pendingFundingTotal = pendingDeposits + pendingWithdrawals;
  const fundingMerged = depItems.map(it=>Object.assign({kind:'deposit'}, it)).concat(wdrItems.map(it=>Object.assign({kind:'withdraw'}, it))).sort((a,b)=>vpEpoch(b.updated_at || b.created_at || 0)-vpEpoch(a.updated_at || a.created_at || 0));
  const latestFunding = fundingMerged[0] || null;
  const ob = state.onboardingStatus || null;
  const kycStatus = String(ob?.kyc?.status || 'none').toLowerCase();
  const kycApproved = kycStatus === 'approved';
  const fundsHero = h('div',{class:'card mb-funds-hero'},
    h('div',{class:'mb-funds-hero-copy'},
      h('div',{class:'mb-card-title'}, vpTr('Funding Command Center','مركز إدارة التمويل','Центр управления финансированием')),
      h('div',{class:'mb-side-row-sub'}, vpTr('Choose a route, finish the guided review step, and keep every request timeline, proof upload, and admin note in one funding workspace.','اختر المسار المناسب، وأكمل خطوة المراجعة الإرشادية، واحتفظ بكل خط زمني للطلبات ورفع الإثباتات وملاحظات الإدارة داخل مساحة تمويل واحدة.','Выберите маршрут, завершите пошаговую проверку и храните все таймлайны заявок, загрузки подтверждений и заметки администрации в одном рабочем пространстве.')),
      h('div',{class:'mb-funds-hero-actions'},
        h('button',{class:'btn primary', onclick:()=>startNew('deposit')}, 'Deposit'),
        h('button',{class:'btn outline', onclick:()=>startNew('withdraw')}, 'Withdraw'),
        h('button',{class:'btn outline', onclick:()=>setActiveTab('history')}, 'History'),
        h('button',{class:'btn outline', onclick:async()=>{ await refreshFundingWorkspace(true); render(); }}, 'Refresh')
      )
    ),
    h('div',{class:'mb-funds-hero-grid'},
      miniMetric('Live available', money(snap.displayAvailable,2)),
      miniMetric('Pending review', String(pendingFundingTotal), pendingFundingTotal ? `${pendingDeposits} deposits • ${pendingWithdrawals} withdrawals` : 'No requests waiting for review'),
      miniMetric('Verification', String(fundingStatusLabel(kycStatus)).toUpperCase(), '', fundingStatusTone(kycStatus)),
      miniMetric('Funding activity', String(fundingMerged.length), latestFunding ? `Last ${latestFunding.kind} #${latestFunding.id}` : 'No requests yet')
    )
  );
  const side = h('div',{class:'card mb-funds-side'},
    h('div',{class:'mb-card-title'}, vpTr('Account Details','تفاصيل الحساب','Детали счёта')),
    h('div',{class:'mb-account-detail-card'},
      h('div',{class:'mb-account-id'}, accountNo('live')),
      h('div',{class:'mb-account-mode'}, `${accountLabel('live')} • ${accountStatus('live')}`),
      h('div',{class:'mb-account-balance'}, money(snap.displayAvailable,2))
    ),
    h('div',{class:'mb-funding-stat-grid'},
      miniMetric('Equity', money(snap.equity,2)),
      miniMetric('Free Margin', money(snap.displayAvailable,2)),
      miniMetric('Margin', money(snap.margin,2)),
      miniMetric('Pending Deposits', String(pendingDeposits)),
      miniMetric('Pending Withdrawals', String(pendingWithdrawals)),
      miniMetric('History Rows', String(depItems.length + wdrItems.length))
    ),
    onboardingPanel(),
    h('div',{class:'mb-side-stack'},
      h('div',{class:'mb-side-highlight ' + (kycApproved ? 'ok' : 'warn')},
        h('div',{class:'mb-card-title'}, kycApproved ? 'Verification ready' : 'Verification action required'),
        h('div',{class:'mb-side-row-sub'}, kycApproved ? 'Withdrawals and funding reviews can continue without a pending KYC blocker.' : 'Submit or finish KYC to reduce friction on withdrawals and compliance checks.'),
        h('div',{class:'row mt-2 wrap'},
          h('button',{class:'btn ' + (kycApproved ? 'outline' : 'primary'), onclick:()=>openKycFlow().catch(()=>{})}, kycApproved ? 'Review KYC' : 'Open KYC'),
          h('button',{class:'btn outline', onclick:()=>location.hash='#/account'}, 'Profile')
        )
      ),
      latestFunding ? h('div',{class:'mb-side-highlight'},
        h('div',{class:'mb-card-title'}, 'Latest funding activity'),
        h('div',{class:'mb-side-row-sub'}, `${latestFunding.kind === 'deposit' ? 'Deposit' : 'Withdrawal'} #${latestFunding.id} • ${vpFmtDate(latestFunding.updated_at || latestFunding.created_at)}`),
        h('div',{class:'mb-side-row-sub'}, `${String(latestFunding.currency || 'USDT').toUpperCase()} • ${fmt(Number(latestFunding.amount || 0),2)} • ${fundingStatusLabel(latestFunding.status)}`),
        h('div',{class:'row mt-2 wrap'},
          h('button',{class:'btn outline', onclick:()=>openRequest(latestFunding.kind, latestFunding.id)}, 'Open request')
        )
      ) : h('div',{class:'mb-side-highlight'},
        h('div',{class:'mb-card-title'}, 'Latest funding activity'),
        h('div',{class:'mb-side-row-sub'}, 'No deposit or withdrawal requests were found yet. Start with a deposit request to populate your audit trail.')
      )
    ),
  );

  const menuBtn = (key, title, sub)=>h('button',{class:'mb-portfolio-sidebtn ' + (active === key ? 'active' : ''), onclick:()=>setActiveTab(key)},
    h('div',{class:'mb-portfolio-sideicon'}, key === 'deposit' ? '◫' : (key === 'withdraw' ? '◎' : '◍')),
    h('div',{}, h('div',{class:'mb-portfolio-side-title'}, title), h('div',{class:'mb-portfolio-side-sub'}, sub))
  );

  const depositsCount = Array.isArray(state.depositsList?.items) ? state.depositsList.items.length : 0;
  const withdrawalsCount = Array.isArray(state.withdrawalsList?.items) ? state.withdrawalsList.items.length : 0;
  const mobileFundingStrip = h('div',{class:'card mb-wallet-mobile-snapshot'},
    h('div',{class:'mb-side-head'},
      h('div',{class:'mb-card-title'}, vpLang4('Funding snapshot','ملخص التمويل','Снимок финансирования','फंडिंग स्नैपशॉट')),
      h('span',{class:'chip ghost'}, vpLang4('Live account','الحساب الحقيقي','Реальный счёт','लाइव अकाउंट'))
    ),
    h('div',{class:'mb-wallet-mobile-snapshot-grid'},
      h('div',{class:'mb-wallet-mobile-snapshot-item'}, h('span',{class:'k'}, vpLang4('Available','المتاح','Доступно','उपलब्ध')), h('strong',{}, money(snap.displayAvailable || snap.availableCash || 0,2)), h('small',{}, vpLang4('Ready for withdrawal or margin use','جاهز للسحب أو استخدام الهامش','Готово к выводу или марже','निकासी या मार्जिन हेतु तैयार'))),
      h('div',{class:'mb-wallet-mobile-snapshot-item'}, h('span',{class:'k'}, vpLang4('In review','قيد المراجعة','На проверке','रिव्यू में')), h('strong',{}, String(pendingFundingTotal)), h('small',{}, vpLang4('Only requests still waiting for operations review','الطلبات التي ما زالت تنتظر مراجعة الإدارة فقط','Только заявки, которые ещё ждут проверки','सिर्फ वे अनुरोध जो अभी समीक्षा में हैं')))
    ),
    h('div',{class:'mb-wallet-mobile-snapshot-actions'},
      h('button',{class:'btn primary', onclick:()=>startNew('deposit')}, vpLang4('Deposit','إيداع','Пополнение','जमा')),
      h('button',{class:'btn outline', onclick:()=>startNew('withdraw')}, vpLang4('Withdraw','سحب','Вывод','निकासी')),
      h('button',{class:'btn outline', onclick:()=>setActiveTab('history')}, vpLang4('History','السجل','История','हिस्ट्री'))
    )
  );

  let fundingRefreshBusy = false;
  const refreshFundingView = ()=>{
    if(fundingRefreshBusy) return;
    if(String(location.hash || '').indexOf('#/wallet') !== 0) return;
    if(document.hidden) return;
    if(active !== 'history' || !flow.currentRequestType || !flow.currentRequestId) return;
    fundingRefreshBusy = true;
    refreshFundingWorkspace(true).then(()=>render()).catch(()=>{}).finally(()=>{ fundingRefreshBusy = false; });
  };
  const fundingViewTimer = setInterval(refreshFundingView, 15000);
  onCleanup(()=>{ try{ clearInterval(fundingViewTimer); }catch(e){} });
  const onFundingVis = ()=>refreshFundingView();
  try{ document.addEventListener('visibilitychange', onFundingVis, {passive:true}); }catch(e){}
  onCleanup(()=>{ try{ document.removeEventListener('visibilitychange', onFundingVis, {passive:true}); }catch(e){} });

  syncWalletHash();

  if(vpIsMobile()){
    return h('div',{class:'mb-page mb-wallet-mobile-ref mb-wallet-v25'},
      topBar(),
      mobileFundingStrip,
      h('div',{class:'card mb-wallet-mobile-main compact-wallet-shell'},
        main
      ),
      bottomNav()
    );
  }

  return h('div',{class:'mb-page mb-wallet-v25'},
    topBar(),
    fundsHero,
    h('div',{class:'mb-funds-shell'},
      h('div',{class:'mb-portfolio-side card'},
        h('div',{class:'mb-section-title'}, vpTr('Wallet','المحفظة','Кошелёк')),
        menuBtn('deposit','Deposit','Guided live-account funding flow'),
        menuBtn('withdraw','Withdraw','Guided payout review flow'),
        menuBtn('history','History','Track every request, note, and proof upload')
      ),
      main,
      side
    ),
    bottomNav()
  );
};

  accountPage = function(){
    async function refreshAccountWorkspace(force=false){
      await Promise.allSettled([
        refreshWalletSummary(true),
        refreshOnboardingStatus(),
        refreshDepositsList(),
        refreshWithdrawalsList(),
        refreshRealPortfolio(true),
        (force ? refreshPortfolio({force:true, mode:'demo'}) : Promise.resolve(state.portfolio)),
        refreshSupportTickets(true),
        refreshNewsFeed(true),
        refreshNotificationsData(true)
      ]);
    }
    vpPrimeWorkspace('__vpAccountPriming', [
      ()=> state.walletSummary ? Promise.resolve(state.walletSummary) : refreshWalletSummary(),
      ()=> state.onboardingStatus ? Promise.resolve(state.onboardingStatus) : refreshOnboardingStatus(),
      ()=> state.depositsList ? Promise.resolve(state.depositsList) : refreshDepositsList(),
      ()=> state.withdrawalsList ? Promise.resolve(state.withdrawalsList) : refreshWithdrawalsList(),
      ()=> state.realPortfolio ? Promise.resolve(state.realPortfolio) : refreshRealPortfolio(true),
      ()=> state.portfolio ? Promise.resolve(state.portfolio) : refreshPortfolio({force:true, mode:'demo'}),
      ()=> state.supportTickets ? Promise.resolve(state.supportTickets) : refreshSupportTickets(),
      ()=> state.newsFeed ? Promise.resolve(state.newsFeed) : refreshNewsFeed(),
      ()=> state.notifications ? Promise.resolve(state.notifications) : refreshNotificationsData()
    ]);
    const snapLive = portfolioSnapshot('real');
    const snapDemo = portfolioSnapshot('demo');
    const me = state.me || {};
    const name = userName();
    const uname = me.telegram_username ? '@' + me.telegram_username : (String(me.email || '').trim() || ('#' + accountNo('live')));
    const provider = String(me.login_provider || 'web').toLowerCase();
    const providerLabel = provider === 'telegram' ? 'Telegram login' : 'Web login';
    const ob = state.onboardingStatus || null;
    const nextStep = String(ob?.next_step || 'verify').replace('_',' ');
    const identities = ob?.user?.identities || {};
    const identityParts = [];
    if(identities.email || String(me.email || '').trim()) identityParts.push('Email');
    if(identities.telegram || String(me.telegram_username || me.telegram_id || '').trim()) identityParts.push('Telegram');
    const identityCount = identityParts.length;
    const identityText = identityParts.length ? identityParts.join(' • ') : 'No linked identity detected yet';
    const kycStatus = String(ob?.kyc?.status || 'none').toLowerCase();
    const kycStatusLabel = fundingStatusLabel(kycStatus);
    const kycStatusText = kycStatus === 'approved'
      ? 'Your account can continue with funding and withdrawals without extra onboarding blockers.'
      : kycStatus === 'pending'
        ? 'Documents are under review. Operations will update the status here once checks finish.'
        : 'Upload verification documents to unlock a cleaner funding and withdrawal flow.';
    const depItems = (state.depositsList && Array.isArray(state.depositsList.items)) ? state.depositsList.items : [];
    const wdrItems = (state.withdrawalsList && Array.isArray(state.withdrawalsList.items)) ? state.withdrawalsList.items : [];
    const totalFundingRequests = depItems.length + wdrItems.length;
    const pendingFundingRequests = depItems.concat(wdrItems).filter(it=>!['approved','completed','confirmed','done'].includes(String(it?.status || '').toLowerCase()) && !['rejected','cancelled','failed'].includes(String(it?.status || '').toLowerCase())).length;
    const latestFunding = vpSortByRecent(depItems.map(it=>Object.assign({kind:'deposit'}, it)).concat(wdrItems.map(it=>Object.assign({kind:'withdraw'}, it))), [it=>it?.updated_at, it=>it?.created_at])[0] || null;
    const latestTicket = vpSortByRecent(Array.isArray(state.supportTickets) ? state.supportTickets.slice() : [], [it=>it?.updated_at, it=>it?.created_at])[0] || null;
    const latestNews = vpSortByRecent(Array.isArray(state.newsFeed) ? state.newsFeed.slice() : [], [it=>it?.published_at, it=>it?.updated_at, it=>it?.created_at])[0] || null;
    const overview = h('div',{class:'card mb-account-overview'},
      h('div',{class:'mb-account-overview-copy'},
        h('div',{class:'mb-card-title'}, vpTr('Client Area Health','حالة منطقة العميل','Состояние клиентской зоны')),
        h('div',{class:'mb-side-row-sub'}, vpTr('A quick read on your accounts, verification, and funding workflow before you continue trading.','نظرة سريعة على حساباتك وحالة التحقق وسير التمويل قبل متابعة التداول.','Краткий обзор ваших счетов, верификации и финансового процесса перед продолжением торговли.')),
        h('div',{class:'mb-account-overview-actions'},
          h('button',{class:'btn primary', onclick:()=>location.hash='#/wallet'}, vpTr('Open assets','فتح الأصول','Открыть активы')),
          h('button',{class:'btn outline', onclick:()=>location.hash='#/trade'}, 'Open Trade'),
          h('button',{class:'btn outline', onclick:async()=>{ await refreshAccountWorkspace(); render(); }}, 'Refresh workspace')
        )
      ),
      h('div',{class:'mb-account-overview-grid'},
        miniMetric('Live equity', money(snapLive.equity,2)),
        miniMetric('Demo equity', money(snapDemo.equity,2)),
        miniMetric('Verification', String(kycStatusLabel).toUpperCase(), '', fundingStatusTone(kycStatus)),
        miniMetric('Pending funding', String(pendingFundingRequests), totalFundingRequests ? `${totalFundingRequests} total request(s)` : 'No funding requests yet')
      )
    );
    const opsSummary = h('div',{class:'mb-account-ops-strip'},
      miniMetric('Support', String(Array.isArray(state.supportTickets) ? state.supportTickets.length : 0), latestTicket ? String(latestTicket.status || 'open').toUpperCase() : 'No ticket'),
      miniMetric('News', String(Array.isArray(state.newsFeed) ? state.newsFeed.length : 0), latestNews ? vpFmtDate(latestNews.published_at || latestNews.updated_at || latestNews.created_at || 0) : 'No update'),
      miniMetric('Alerts', String(notificationsUnreadCount()), notificationsUnreadCount() > 0 ? 'Needs review' : 'All clear', notificationsUnreadCount() > 0 ? 'warn' : ''),
      miniMetric('Funding', String(totalFundingRequests), pendingFundingRequests > 0 ? `${pendingFundingRequests} pending` : 'No pending request', pendingFundingRequests > 0 ? 'warn' : 'up')
    );
    const operationsGrid = h('div',{class:'mb-account-grid'},
      h('div',{class:'card mb-side-highlight'},
        h('div',{class:'mb-card-title'}, 'Latest funding'),
        latestFunding ? h('div',{},
          h('div',{class:'mb-side-row-sub'}, `${latestFunding.kind === 'deposit' ? 'Deposit' : 'Withdrawal'} #${latestFunding.id} • ${vpFmtDate(latestFunding.updated_at || latestFunding.created_at)}`),
          h('div',{class:'mb-side-row-sub'}, `${String(latestFunding.currency || 'USDT').toUpperCase()} • ${fmt(Number(latestFunding.amount || 0),2)} • ${fundingStatusLabel(latestFunding.status)}`),
          h('div',{class:'row mt-2 wrap'},
            h('button',{class:'btn outline', onclick:()=>{ location.hash = `#/wallet?tab=history&kind=${encodeURIComponent(String(latestFunding.kind || 'deposit'))}&id=${encodeURIComponent(String(latestFunding.id || 0))}`; }}, 'Open request')
          )
        ) : h('div',{class:'mb-side-row-sub'}, 'No funding requests were found yet.')
      ),
      h('div',{class:'card mb-side-highlight'},
        h('div',{class:'mb-card-title'}, safeT('support.title','Support')),
        latestTicket ? h('div',{},
          h('div',{class:'mb-side-row-sub'}, `${String(latestTicket.subject || latestTicket.reason_label || 'Support ticket')} • ${vpFmtDate(latestTicket.updated_at || latestTicket.created_at)}`),
          h('div',{class:'mb-side-row-sub'}, `${String(latestTicket.status || 'open').toUpperCase()} • ${Number(latestTicket.unread_count || 0)} unread`),
          h('div',{class:'row mt-2 wrap'},
            h('button',{class:'btn outline', onclick:()=>{ location.hash = `#/support?ticket=${encodeURIComponent(String(latestTicket.id || 0))}`; }}, 'Open ticket')
          )
        ) : h('div',{class:'mb-side-row-sub'}, 'No support tickets have been opened yet.')
      ),
      h('div',{class:'card mb-side-highlight'},
        h('div',{class:'mb-card-title'}, 'Latest announcement'),
        latestNews ? h('div',{},
          h('div',{class:'mb-side-row-sub'}, `${String(latestNews.title || 'Update')} • ${vpFmtDate(latestNews.published_at || latestNews.updated_at)}`),
          h('div',{class:'mb-side-row-sub'}, `${String(latestNews.body || '').slice(0, 140)}${String(latestNews.body || '').length > 140 ? '…' : ''}`),
          h('div',{class:'row mt-2 wrap'},
            h('button',{class:'btn outline', onclick:()=>location.hash='#/news'}, 'Open news')
          )
        ) : h('div',{class:'mb-side-row-sub'}, 'No platform announcement has been published yet.')
      )
    );

    return h('div',{class:'mb-page'},
      topBar(),
      overview,
      opsSummary,
      h('div',{class:'mb-account-grid'},
        h('div',{class:'card mb-account-profile'},
          h('div',{class:'mb-account-avatar'}, (String(name).trim().slice(0,2) || 'VP').toUpperCase()),
          h('div',{class:'mb-account-name'}, name),
          h('div',{class:'mb-account-user'}, uname),
          h('div',{class:'mb-account-chip-list'},
            h('span',{class:'chip'}, `${providerLabel}`),
            h('span',{class:'chip ghost'}, `Next • ${nextStep}`)
          ),
          h('div',{class:'mb-account-actions'},
            h('button',{class:'btn primary', onclick:()=>openKycFlow().catch(()=>{})}, safeT('kyc.open','Open KYC')),
            h('button',{class:'btn', onclick:()=>location.hash='#/wallet'}, vpTr('Open assets','فتح الأصول','Открыть активы')),
            h('button',{class:'btn outline', onclick:()=>location.hash='#/notifications'}, 'Notifications'),
            h('button',{class:'btn outline', onclick:()=>openSupportBot()}, safeT('support.title','Support')),
            h('button',{class:'btn outline', onclick:()=>location.hash='#/news'}, 'News')
          )
        ),
        h('div',{class:'card mb-account-settings'},
          h('div',{class:'mb-card-title'}, safeT('settings.title', 'Settings')),
          h('div',{class:'mb-account-card-grid'},
            h('div',{class:'mb-account-info-card'},
              h('div',{class:'k'}, 'Live account'),
              h('div',{class:'v'}, accountNo('live')),
              h('div',{class:'sub'}, `${accountLabel('live')} • ${money(snapLive.equity,2)} • ${accountStatus('live')}`)
            ),
            h('div',{class:'mb-account-info-card'},
              h('div',{class:'k'}, 'Demo account'),
              h('div',{class:'v'}, accountNo('demo')),
              h('div',{class:'sub'}, `${accountLabel('demo')} • ${money(snapDemo.equity,2)} • ${accountStatus('demo')}`)
            ),
            h('div',{class:'mb-account-info-card'},
              h('div',{class:'k'}, 'Verification'),
              h('div',{class:'v'}, String(kycStatusLabel).toUpperCase()),
              h('div',{class:'sub'}, kycStatusText)
            ),
            h('div',{class:'mb-account-info-card'},
              h('div',{class:'k'}, 'Funding activity'),
              h('div',{class:'v'}, String(totalFundingRequests)),
              h('div',{class:'sub'}, pendingFundingRequests > 0 ? `${pendingFundingRequests} request(s) still under review` : 'No pending funding requests right now')
            ),
            h('div',{class:'mb-account-info-card'},
              h('div',{class:'k'}, 'Notifications'),
              h('div',{class:'v'}, String(notificationsUnreadCount())),
              h('div',{class:'sub'}, notificationsUnreadCount() > 0 ? 'Unread updates need your attention' : 'Everything looks up to date')
            )
          ),
          h('div',{class:'mb-account-identity-grid'},
            h('div',{class:'mb-account-chip-card'},
              h('span',{class:'eyebrow'}, 'Access'),
              h('strong',{}, providerLabel),
              h('small',{}, String(me.email || 'Primary email is not attached yet'))
            ),
            h('div',{class:'mb-account-chip-card'},
              h('span',{class:'eyebrow'}, 'Connected identities'),
              h('strong',{}, `${identityCount} active link${identityCount === 1 ? '' : 's'}`),
              h('small',{}, identityText)
            )
          ),
          h('div',{class:'mb-setting-row'},
            h('div',{}, h('div',{class:'mb-setting-title'}, 'Email'), h('div',{class:'mb-setting-sub'}, String(me.email || 'No email attached yet'))),
            h('span',{class:'pill'}, providerLabel)
          ),
          h('div',{class:'mb-setting-row'},
            h('div',{}, h('div',{class:'mb-setting-title'}, safeT('account.language','Language')), h('div',{class:'mb-setting-sub'}, 'Choose the client area language')),
mbLanguageMenuNode(state.lang, 'mb-shell-lang-menu')
          ),
          h('div',{class:'mb-setting-row'},
            h('div',{}, h('div',{class:'mb-setting-title'}, 'Verification & funding'), h('div',{class:'mb-setting-sub'}, `Current next step: ${nextStep}`)),
            h('div',{class:'row wrap', style:'gap:10px;justify-content:flex-end'},
              h('button',{class:'btn', onclick:()=>openKycFlow().catch(()=>{})}, 'Verify'),
              h('button',{class:'btn outline', onclick:()=>location.hash='#/wallet'}, 'Funding')
            )
          ),
          h('div',{class:'mb-setting-row'},
            h('div',{}, h('div',{class:'mb-setting-title'}, 'Notifications center'), h('div',{class:'mb-setting-sub'}, notificationsUnreadCount() > 0 ? `${notificationsUnreadCount()} unread item(s) across support, funding, or platform updates.` : 'No unread operational updates right now.')),
            h('div',{class:'row wrap', style:'gap:10px;justify-content:flex-end'},
              h('button',{class:'btn outline', onclick:()=>location.hash='#/notifications'}, 'Open'),
              h('button',{class:'btn outline', onclick:()=>location.hash='#/support'}, 'Support')
            )
          ),
          h('div',{class:'mb-setting-row'},
            h('div',{}, h('div',{class:'mb-setting-title'}, 'Trading Terminal'), h('div',{class:'mb-setting-sub'}, 'Jump back into charts and execution quickly.')),
            h('button',{class:'btn outline', onclick:()=>location.hash='#/trade'}, 'Open Trade')
          ),
          h('div',{class:'mb-setting-row'},
            h('div',{}, h('div',{class:'mb-setting-title'}, safeT('settings.session','Session')), h('div',{class:'mb-setting-sub'}, 'Reconnect and refresh your secure session.')),
            h('div',{class:'row wrap', style:'gap:10px;justify-content:flex-end'}, h('button',{class:'btn outline', onclick:async()=>{ await Promise.allSettled([refreshWalletSummary(true), refreshPortfolio(true), refreshRealPortfolio(true), refreshPnlStats(), refreshRealPnlStats(), refreshOnboardingStatus()]); render(); }}, safeT('wallet.refresh','Refresh')), h('a',{class:'btn danger', href:'/logout.php'}, safeT('settings.logout','Log out')))
          )
        )
      ),
      operationsGrid,
      bottomNav()
    );
  };


  createTradeWatchlistPanel = function(symbol, assetType, onSelect){
    const normType = (value)=>{
      const raw = String(value || '').toLowerCase().trim();
      if(!raw) return '';
      if(raw === 'commodities' || raw === 'metals') return 'commodities';
      if(raw === 'perp' || raw === 'perpetual' || raw === 'futures') return 'futures';
      if(raw === 'fx') return 'forex';
      if(raw === 'indices' || raw === 'index') return 'indices';
      return raw;
    };
    const backendType = (tabKey)=> tabKey === 'favorites' || tabKey === 'all' ? '' : (tabKey === 'metals' ? 'commodities' : tabKey);
    const staticUniverseFallback = ()=>[
      {symbol:'XAUUSD', name:'Gold Spot', type:'commodities', price:2350, change_pct:0, sort_order:10},
      {symbol:'XAGUSD', name:'Silver Spot', type:'commodities', price:27, change_pct:0, sort_order:12},
      {symbol:'USOIL', name:'WTI Crude Oil', type:'commodities', price:78, change_pct:0, sort_order:14},
      {symbol:'UKOIL', name:'Brent Crude Oil', type:'commodities', price:82, change_pct:0, sort_order:16},
      {symbol:'NGAS', name:'Natural Gas', type:'commodities', price:2.1, change_pct:0, sort_order:18},
      {symbol:'COPPER', name:'Copper', type:'commodities', price:4.1, change_pct:0, sort_order:20},
      {symbol:'PLAT', name:'Platinum', type:'commodities', price:970, change_pct:0, sort_order:22},
      {symbol:'PALL', name:'Palladium', type:'commodities', price:1030, change_pct:0, sort_order:24},
      {symbol:'CORN', name:'Corn', type:'commodities', price:430, change_pct:0, sort_order:26},
      {symbol:'WHEAT', name:'Wheat', type:'commodities', price:560, change_pct:0, sort_order:28},
      {symbol:'SOY', name:'Soybeans', type:'commodities', price:1010, change_pct:0, sort_order:30},
      {symbol:'SUGAR', name:'Sugar', type:'commodities', price:19, change_pct:0, sort_order:32},
      {symbol:'COFFEE', name:'Coffee', type:'commodities', price:190, change_pct:0, sort_order:34},
      {symbol:'COCOA', name:'Cocoa', type:'commodities', price:8200, change_pct:0, sort_order:36},
      {symbol:'COTTON', name:'Cotton', type:'commodities', price:67, change_pct:0, sort_order:38}
    ];
    const mergeBySymbol = (rows)=>{
      const map = new Map();
      (Array.isArray(rows) ? rows : []).forEach(item=>{
        const sym = String(item?.symbol || '').toUpperCase().trim();
        if(!sym) return;
        const prev = map.get(sym) || {};
        map.set(sym, Object.assign({}, prev, item, { symbol: sym }));
      });
      return [...map.values()];
    };
    const collectUniverse = ()=>{
      const pools = [];
      try{ if(Array.isArray(state.markets) && state.markets.length) pools.push(...state.markets); }catch(e){}
      ['crypto','futures','forex','stocks','commodities','arab'].forEach(type=>{
        try{
          if(typeof vpReadWarmMarketsCache === 'function'){
            const cached = vpReadWarmMarketsCache(type);
            if(cached && Array.isArray(cached.items) && cached.items.length){ pools.push(...cached.items); return; }
          }
          const key = (typeof marketsCacheKey === 'function') ? marketsCacheKey(type) : ('markets_' + type);
          const raw = localStorage.getItem(key);
          if(!raw) return;
          const parsed = JSON.parse(raw);
          if(parsed && Array.isArray(parsed.items) && parsed.items.length) pools.push(...parsed.items);
        }catch(e){}
      });
      try{
        const seed = (typeof resolveTradeSymbolSeed === 'function') ? resolveTradeSymbolSeed(symbol, assetType) : null;
        if(seed) pools.push(seed);
      }catch(e){}
      try{ if(state.__tradeSeedQuote) pools.push(state.__tradeSeedQuote); }catch(e){}
      let merged = mergeBySymbol(pools);
      if(!merged.some(item=>normType(item?.type) === 'commodities')){
        merged = mergeBySymbol([...(Array.isArray(merged) ? merged : []), ...staticUniverseFallback()]);
      }
      return merged;
    };

    let universe = collectUniverse();
    let activeItems = universe.slice();
    const activeTypeSet = new Set(activeItems.map(x=>normType(x?.type)));
    const tabs = [
      ['favorites', vpLang4('Favorites ☆','المفضلة ☆','Избранное ☆','पसंदीदा ☆')],
      ['all', vpLang4('All','الكل','Все','सभी')],
      ['crypto', vpLang4('Crypto','الكريبتو','Крипто','क्रिप्टो')],
      ['forex', vpLang4('Forex','الفوركس','Форекс','फॉरेक्स')],
      ['stocks', vpLang4('Stocks','الأسهم','Акции','स्टॉक्स')],
      ['futures', vpLang4('Perpetual','العقود الدائمة','Бессрочные','Perpetual')],
      ['commodities', vpLang4('Commodities','السلع','Товары','Commodities')],
      ['arab', vpLang4('Arab','العربي','Арабский','العربي')]
    ];
    const currentSymbol = String(symbol || '').toUpperCase().trim();
    const currentSymbolType = normType(assetType) || normType((universe.find(x=>String(x?.symbol || '').toUpperCase() === currentSymbol) || {}).type);
    const desiredDefault = currentSymbolType || (assetType === 'forex' ? 'forex' : (assetType === 'stocks' ? 'stocks' : (assetType === 'commodities' ? 'commodities' : (assetType === 'futures' ? 'futures' : normType(assetType) || 'all'))));
    const routeWatch = (()=>{ try{ return vpNormalizeTradeWatch(vpReadTradeRouteState()?.watch || ''); }catch(e){ return ''; } })();
    const savedWatchTab = String(routeWatch || state.__vpTradeWatchTab || localStorage.getItem('vp_watch_tab') || '').toLowerCase();
    let active = savedWatchTab || desiredDefault || 'all';
    if(currentSymbolType && savedWatchTab && !['favorites','all', currentSymbolType].includes(savedWatchTab)){
      active = currentSymbolType;
    }
    if(!tabs.some(([key])=> key === active)) active = tabs.some(([key])=>key === desiredDefault) ? desiredDefault : 'all';
    state.__vpTradeWatchTab = active;

    const search = h('input',{class:'input mb-search-input', placeholder:vpLang4('Search symbols','ابحث عن الرموز','Поиск символов','सिंबल खोजें'), value:String(state.__vpTradeWatchSearch || '')});
    const livePill = h('span',{class:'pill ok trade-watch-head-pill'}, vpTr('Live desk','أسعار مباشرة','Лайв'));
    const list = h('div',{class:'trade-watch-items mb-watch-items'});
    const panel = h('div',{class:'card trade-watchlist mb-watchlist mb-watchlist-v30', 'data-scroll-key':'trade-watchlist'},
      h('div',{class:'trade-panel-head'},
        h('div',{},
          h('div',{class:'trade-panel-title mb-section-title'}, vpLang4('Symbols','الرموز','Символы','सिंबल्स')),
          h('div',{class:'muted tiny'}, vpLang4('Select the market you want to trade','اختر السوق الذي تريد تداوله','Выберите рынок для торговли','वह मार्केट चुनें जिसमें आप ट्रेड करना चाहते हैं'))
        ),
        h('div',{class:'row wrap', style:'gap:8px;align-items:center;'},
          livePill,
          h('button',{class:'mb-back-btn', type:'button', title:vpLang4('Refresh list','تحديث القائمة','Обновить список','रिफ्रेश लिस्ट'), onclick:()=>hydrateUniverse(active).catch(()=>{})}, '↻')
        )
      ),
      h('div',{class:'mb-watch-tabs'},
        ...tabs.map(([key,label])=>h('button',{class:'mb-watch-tab ' + (active === key ? 'active' : ''), 'data-tab':key, onclick:()=>{ active = key; state.__vpTradeWatchTab = key; localStorage.setItem('vp_watch_tab', key); renderRows(); }}, label))
      ),
      search,
      list
    );

    const primeInflight = new Set();
    const hydrateUniverse = async(tabKey)=>{
      const want = backendType(tabKey || active || desiredDefault);
      const queue = [];
      if(want) queue.push(want);
      if((!activeItems.length || active === 'all') && !queue.includes(backendType(desiredDefault)) && backendType(desiredDefault)) queue.push(backendType(desiredDefault));
      if(!activeItems.length && !queue.length){
        ['crypto','futures','commodities','forex','stocks','arab'].forEach(type=>{ if(!queue.includes(type)) queue.push(type); });
      }
      const hydrateMarks = state.__vpTradeWatchHydrateAt = (state.__vpTradeWatchHydrateAt && typeof state.__vpTradeWatchHydrateAt === 'object') ? state.__vpTradeWatchHydrateAt : {};
      for(const type of queue){
        if(!type || primeInflight.has(type)) continue;
        const staleFor = (type === 'crypto' || type === 'futures') ? 1300 : 1900;
        const lastHydrateAt = Number(hydrateMarks[type] || 0);
        if(lastHydrateAt > 0 && (Date.now() - lastHydrateAt) < staleFor) continue;
        primeInflight.add(type);
        hydrateMarks[type] = Date.now();
        try{
          const rows = (typeof refreshMarkets === 'function')
            ? await refreshMarkets({type, lite:true, withQuotes:type !== 'crypto', applyToState:false, warm:true, ttlMs: type === 'crypto' ? 900 : (type === 'futures' ? 1200 : 1500)})
            : [];
          if(Array.isArray(rows) && rows.length){
            universe = mergeBySymbol([...(Array.isArray(universe) ? universe : []), ...rows]);
            activeItems = universe.slice();
            renderRows();
          }else if(type === 'commodities'){
            universe = mergeBySymbol([...(Array.isArray(universe) ? universe : []), ...staticUniverseFallback()]);
            activeItems = universe.slice();
            renderRows();
          }
        }catch(e){}
        finally{ primeInflight.delete(type); }
      }
    };
    const mergeTradeWatchLive = (items, rerender=false)=>{
      const rows = Array.isArray(items) ? items.filter(Boolean) : [];
      if(!rows.length) return 0;
      let changed = 0;
      const nextUniverse = (Array.isArray(universe) ? universe : []).map(item=>{
        const sym = String(item?.symbol || '').toUpperCase();
        const live = rows.find(row=>String(row?.symbol || '').toUpperCase() === sym && normType(row?.type || item?.type || '') === normType(item?.type || ''));
        if(!live) return item;
        const px = Number(live?.price || live?.last || live?.mark_price || 0);
        if(!(px > 0)) return item;
        changed++;
        try{ if(typeof vpRememberLiveQuote === 'function') vpRememberLiveQuote(Object.assign({}, live, {symbol:sym, type:item?.type || live?.type || 'crypto', market:item?.market || ((normType(item?.type || live?.type || '') === 'crypto' || normType(item?.type || live?.type || '') === 'futures') ? 'perp' : 'spot')})); }catch(_e){}
        return Object.assign({}, item, {
          price: px,
          change_pct: Number(live?.change_pct ?? live?.changePct ?? item?.change_pct ?? 0) || 0,
          updated_at: Number(live?.updated_at || item?.updated_at || 0) || item?.updated_at || 0,
          source: String(live?.source || live?.provider || item?.source || '').trim()
        });
      });
      if(changed > 0){
        universe = mergeBySymbol(nextUniverse);
        activeItems = universe.slice();
        if(rerender) renderRows();
      }
      return changed;
    };
    const fetchTradeWatchQuotes = async(type, symbols, opts={})=>{
      const norm = normType(type);
      const listSymbols = [...new Set((Array.isArray(symbols) ? symbols : []).map(v=>String(v || '').toUpperCase().trim()).filter(Boolean))];
      if(!listSymbols.length || !norm) return [];
      const chunkSize = Math.max(1, Number(opts.chunkSize || (norm === 'forex' ? 12 : (['stocks','arab'].includes(norm) ? 14 : (norm === 'commodities' ? 12 : 10)))));
      const timeoutMs = Math.max(3600, Number(opts.timeoutMs || (norm === 'forex' ? 5600 : (['stocks','arab'].includes(norm) ? 6500 : (norm === 'commodities' ? 5600 : 5200)))));
      const out = [];
      for(let i=0;i<listSymbols.length;i+=chunkSize){
        const chunk = listSymbols.slice(i, i + chunkSize);
        const useDirect = norm !== 'crypto' && chunk.length === 1 && opts.direct === true;
        const path = (norm === 'crypto')
          ? `/quotes.php?fresh=1&type=${encodeURIComponent(norm)}&symbols=${encodeURIComponent(chunk.join(','))}`
          : `/quotes.php?type=${encodeURIComponent(norm)}&symbols=${encodeURIComponent(chunk.join(','))}${useDirect ? '&direct=1' : '&visible=1'}`;
        try{
          const resp = (typeof apiLiveQuotes === 'function')
            ? await apiLiveQuotes(path, norm, timeoutMs)
            : await api(path, { timeoutMs });
          if(Array.isArray(resp?.items)) out.push(...resp.items);
        }catch(_err){}
      }
      return out;
    };
    const primeTradeWatchTabs = async()=>{
      const stamp = Number(state.__vpTradeWatchPrimeAt || 0);
      if(stamp > 0 && (Date.now() - stamp) < 6000) return;
      state.__vpTradeWatchPrimeAt = Date.now();
      const families = [...new Set([active || desiredDefault || 'crypto', desiredDefault || 'crypto'])].filter(Boolean);
      for(const family of families){
        try{
          await hydrateUniverse(family);
          const rows = getRowsForTab(family).slice(0, 14);
          const symbols = rows.map(item=>String(item?.symbol || '').toUpperCase()).filter(Boolean);
          if(!symbols.length) continue;
          const liveRows = await fetchTradeWatchQuotes(family, symbols, { direct:true });
          mergeTradeWatchLive(liveRows, family === active);
        }catch(_primeErr){}
      }
    };

    function getRowsForTab(tabKey){
      const fav = new Set(getFavorites());
      const normalizedDesired = normType(assetType) || 'crypto';
      let rows = activeItems.filter(Boolean);
      if(tabKey === 'favorites'){
        rows = rows.filter(x=>fav.has(String(x.symbol || '').toUpperCase()));
      }else if(tabKey !== 'all'){
        rows = rows.filter(x=>normType(x.type) === tabKey);
      }
      if(tabKey === 'all'){
        rows.sort((a,b)=>{
          const aSym = String(a?.symbol || '').toUpperCase();
          const bSym = String(b?.symbol || '').toUpperCase();
          const aCurrent = aSym === String(symbol || '').toUpperCase() ? 1 : 0;
          const bCurrent = bSym === String(symbol || '').toUpperCase() ? 1 : 0;
          const aType = normType(a?.type) === normalizedDesired ? 1 : 0;
          const bType = normType(b?.type) === normalizedDesired ? 1 : 0;
          const aFav = fav.has(aSym) ? 1 : 0;
          const bFav = fav.has(bSym) ? 1 : 0;
          const aSig = Number(a?.signal_count || 0), bSig = Number(b?.signal_count || 0);
          const aPx = Number(a?.price || 0), bPx = Number(b?.price || 0);
          return bCurrent - aCurrent || bType - aType || bFav - aFav || bSig - aSig || bPx - aPx;
        });
      }else{
        rows.sort((a,b)=>{
          const aSym = String(a?.symbol || '').toUpperCase();
          const bSym = String(b?.symbol || '').toUpperCase();
          const aCurrent = aSym === String(symbol || '').toUpperCase() ? 1 : 0;
          const bCurrent = bSym === String(symbol || '').toUpperCase() ? 1 : 0;
          const aFav = fav.has(aSym) ? 1 : 0;
          const bFav = fav.has(bSym) ? 1 : 0;
          const aSig = Number(a?.signal_count || 0), bSig = Number(b?.signal_count || 0);
          const aCh = Math.abs(Number(a?.change_pct || 0));
          const bCh = Math.abs(Number(b?.change_pct || 0));
          return bCurrent - aCurrent || bFav - aFav || bSig - aSig || bCh - aCh;
        });
      }
      return rows;
    }

    function renderRows(){
      panel.querySelectorAll('.mb-watch-tab').forEach(btn=>btn.classList.toggle('active', btn.getAttribute('data-tab') === active));
      const term = String(search.value || '').trim().toUpperCase();
      const rows = getRowsForTab(active).filter(x=>{
        const sym = String(x.symbol || '').toUpperCase();
        const nm = String(x.name || '').toUpperCase();
        return !term || sym.includes(term) || nm.includes(term);
      }).slice(0,28);
      list.innerHTML = '';
      if(!rows.length){
        list.appendChild(h('div',{class:'muted small mb-watch-empty'}, vpLang4('No symbols found for this tab yet.','لا توجد رموز ظاهرة في هذا التبويب حالياً.','Для этой вкладки пока нет символов.','इस टैब में अभी कोई सिंबल नहीं है।')));
        hydrateUniverse(active).catch(()=>{});
        return;
      }
      const fav = new Set(getFavorites());
      rows.forEach(x=>{
        const sym = String(x.symbol || '').toUpperCase();
        const type = String(x.type || assetType || state.selectedAssetType || 'crypto').toLowerCase();
        const remembered = (typeof vpGetFreshRememberedQuote === 'function') ? vpGetFreshRememberedQuote(sym, type, normType(type) === 'crypto' ? 18 : 8) : null;
        const rowItem = remembered ? Object.assign({}, x, {
          price: safeNum(remembered.price || remembered.last || remembered.mark_price, safeNum(x?.price, 0)),
          change_pct: safeNum(remembered.change_pct ?? x?.change_pct ?? 0, safeNum(x?.change_pct, 0)),
          updated_at: Math.max(Number(x?.updated_at || 0), Number(remembered.updated_at || 0))
        }) : x;
        const activeSym = sym === String(symbol || '').toUpperCase();
        const effectiveMarket = (typeof resolveLiveMarketForSymbol === 'function')
          ? resolveLiveMarketForSymbol(sym, type, String(localStorage.getItem('tradeMarket') || ((normType(type) === 'crypto' || normType(type) === 'futures') ? 'perp' : 'spot')).toLowerCase())
          : String(localStorage.getItem('tradeMarket') || ((normType(type) === 'crypto' || normType(type) === 'futures') ? 'perp' : 'spot')).toLowerCase();
        const ch = Number(rowItem.change_pct || 0);
        const star = h('button',{class:'mb-star-btn ' + (fav.has(sym) ? 'active' : ''), onclick:(e)=>{ e.stopPropagation(); toggleFavorite(sym); renderRows(); }}, '☆');
        const priceNode = h('div',{class:'trade-watch-price','data-live-price':'1'}, money(Number(rowItem.price || 0), Number(rowItem.price || 0) < 1 ? 4 : 2));
        const changeNode = h('div',{class:'trade-watch-change badge ' + (ch >= 0 ? 'up' : 'down'),'data-live-change':'1'}, percentText(ch));
        const liveNode = h('span',{class:'mb-trade-live-pill','data-live-pill':'1'}, Number(rowItem.price || 0) > 0 ? ((typeof vpDelayedBadgeText === 'function') ? vpDelayedBadgeText(type, false) : vpTr('Delayed','متأخر','Задержка')) : ((typeof vpDelayedBadgeText === 'function') ? vpDelayedBadgeText(type, true) : vpTr('Sync','مزامنة','Синхр.')));
        list.appendChild(h('button',{class:'trade-watch-row mb-watch-row ' + (activeSym ? 'active' : ''), type:'button', onclick:(e)=>{ try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){}
          try{
            const nextTab = normType(type);
            if(typeof vpApplyTradeSelection === 'function' && vpApplyTradeSelection(rowItem, {watchTab: (nextTab && !['favorites','all'].includes(nextTab)) ? nextTab : active})){ return; }
            if(nextTab && !['favorites','all'].includes(nextTab)){ state.__vpTradeWatchTab = nextTab; localStorage.setItem('vp_watch_tab', nextTab); }
            if(typeof vpCommitTradeRoute === 'function'){
              vpCommitTradeRoute({ symbol: sym, type, market: effectiveMarket, watch: (nextTab && !['favorites','all'].includes(nextTab)) ? nextTab : active }, { source:'watch_row' });
              try{ if(typeof requestRender === 'function') requestRender(true); else if(typeof render === 'function') render(true); }catch(_e){}
              return;
            }
          }catch(e){}
          onSelect(rowItem);
        }, 'data-live-symbol': sym, 'data-live-type': type, 'data-live-market': effectiveMarket},
          h('div',{class:'trade-watch-main'},
            h('div',{class:'mb-watch-topline'},
              h('div',{class:'trade-watch-sym'}, sym),
              h('div',{class:'mb-watch-actions'}, liveNode, star)
            ),
            h('div',{class:'trade-watch-name'}, instrumentName(x))
          ),
          h('div',{class:'trade-watch-meta'},
            changeNode,
            priceNode
          )
        ));
      });
      hydrateUniverse(active).catch(()=>{});
    }
    search.addEventListener('input', ()=>{ state.__vpTradeWatchSearch = String(search.value || ''); renderRows(); });
    renderRows();
    Promise.resolve().then(()=>hydrateUniverse(active)).catch(()=>{});
    Promise.resolve().then(()=>primeTradeWatchTabs()).catch(()=>{});
    return panel;
  };

  createTradeOrderPanel = function(ctx){
    const getMode = ()=>state.tradeMode === 'real' ? 'real' : 'demo';
    const getMarketType = ()=>String((typeof ctx.getMarketType === 'function' ? ctx.getMarketType() : ctx.marketType) || 'spot').toLowerCase();
    const normSymbol = (v)=>String(v || '').toUpperCase().replace(/^@R@|^@D@/,'');
    const matchesContext = (item)=>normSymbol(item?.symbol) === normSymbol(ctx.symbol) && String(item?.market_type || getMarketType()).toLowerCase() === getMarketType();
    const leverageList = ()=>{
      const maxLev = Math.max(1, Math.floor(safeNum(state?.leverageCaps?.max_effective, 100)));
      const base = [1,2,3,5,10,15,20,25,30,50,75,100,125,150,200];
      const list = (maxLev <= 20) ? Array.from({length:maxLev}, (_,i)=>i+1) : base.filter(v=>v<=maxLev);
      if(!list.includes(maxLev)) list.push(maxLev);
      return Array.from(new Set(list)).sort((a,b)=>a-b);
    };
    let kind = localStorage.getItem('vp_order_kind') || 'market';
    let tradesTab = String(state.__vpTradeTicketTab || localStorage.getItem('vp_trade_ticket_tab') || 'positions').toLowerCase();
    if(!['positions','orders','history'].includes(tradesTab)) tradesTab = 'positions';
    const priceRef = ctx.priceRef;
    const wrap = h('div',{class:'card trade-ticket-panel mb-ticket-panel'});
    const amountIn = h('input',{class:'input', type:'number', step:'0.01', min:'0', value:'100'});
    const limitIn = h('input',{class:'input', type:'number', step:'0.0001', min:'0', placeholder:'0.0000'});
    const tpIn = h('input',{class:'input', type:'number', step:'0.0001', min:'0', placeholder:'0.00000'});
    const slIn = h('input',{class:'input', type:'number', step:'0.0001', min:'0', placeholder:'0.00000'});
    const levOptions = leverageList();
    const defaultLev = levOptions.includes(10) ? 10 : levOptions[levOptions.length-1];
    const levSel = h('select',{class:'input'},
      ...levOptions.map(v=>h('option',{value:String(v), selected: v===defaultLev}, String(v)))
    );
    const bal = h('div',{class:'mb-ticket-balance'}, '—');
    const marginVal = h('div',{class:'trade-ticket-kv'}, h('span',{class:'k'}, 'Initial margin'), h('span',{class:'v'}, '—'));
    const unitsVal = h('div',{class:'trade-ticket-kv'}, h('span',{class:'k'}, 'Units'), h('span',{class:'v'}, '—'));
    const priceSell = h('button',{class:'mb-side-quote sell', onclick:()=>submit('SELL')}, h('span',{class:'lbl'}, 'SELL'), h('span',{class:'v'}, '—'));
    const priceBuy = h('button',{class:'mb-side-quote buy', onclick:()=>submit('BUY')}, h('span',{class:'lbl'}, 'BUY'), h('span',{class:'v'}, '—'));
    const liveMeta = h('div',{class:'mb-ticket-live-meta'},
      h('span',{class:'mb-ticket-live-dot'}, '•'),
      h('span',{class:'mb-ticket-live-text'}, vpTr('Live platform quote','سعر حي من المنصة','Живая котировка платформы')),
      h('span',{class:'mb-ticket-spread'}, 'Spread —')
    );
    const infoBox = h('div',{class:'mb-ticket-info'}, '');
    const tabButtons = h('div',{class:'mb-mini-tabs'});
    const myTrades = h('div',{class:'mb-mytrades-box'},
      h('div',{class:'mb-side-head'},
        h('div',{class:'mb-card-title'}, 'My Trades ' + String(ctx.symbol || '')),
        h('a',{href:'#/portfolio', class:'mb-side-link'}, 'Portfolio')
      ),
      tabButtons,
      h('div',{class:'mb-mytrades-list'})
    );

    function currentSnap(){
      return portfolioSnapshot(getMode());
    }

    async function ensureHistory(mode){
      state.__vpHistoryByMode = state.__vpHistoryByMode || {};
      state.__vpHistoryLoadingByMode = state.__vpHistoryLoadingByMode || {};
      if(state.__vpHistoryLoadingByMode[mode] || Array.isArray(state.__vpHistoryByMode[mode])) return;
      state.__vpHistoryLoadingByMode[mode] = true;
      try{
        state.__vpHistoryByMode[mode] = await tradeFetchOrders({limit:40, mode}) || [];
      }catch(e){
        state.__vpHistoryByMode[mode] = [];
      }finally{
        state.__vpHistoryLoadingByMode[mode] = false;
        try{ renderMyTrades(); }catch(e){}
      }
    }

    function renderTradeTabs(){
      tabButtons.innerHTML = '';
      [
        ['positions','Positions'],
        ['orders','Orders'],
        ['history','History']
      ].forEach(([key,label])=>{
        tabButtons.appendChild(h('button',{class: key === tradesTab ? 'active' : '', onclick:()=>{ tradesTab = key; state.__vpTradeTicketTab = key; try{ localStorage.setItem('vp_trade_ticket_tab', key); }catch(e){} renderTradeTabs(); renderMyTrades(); if(key === 'history') ensureHistory(getMode()); }}, label));
      });
    }

    function renderMyTrades(){
      const host = myTrades.querySelector('.mb-mytrades-list');
      host.innerHTML = '';
      const mode = getMode();
      const snap = currentSnap();
      const orderTs = (item)=>vpEpoch(item?.updated_at || item?.closed_at || item?.closedAt || item?.opened_at || item?.created_at || item?.createdAt || item?.ts || 0);
      const positions = (Array.isArray(snap.positions) ? snap.positions : [])
        .filter(p=>matchesContext(p) && String(p.status || 'open').toLowerCase() === 'open')
        .slice()
        .sort((a,b)=>orderTs(b) - orderTs(a) || (Number(b?.id || 0) - Number(a?.id || 0)));
      const orders = (Array.isArray(snap.pf?.orders) ? snap.pf.orders : [])
        .filter(o=>matchesContext(o) && !['closed','filled','done','completed','cancelled','canceled','rejected','failed'].includes(String(o.status || '').toLowerCase()))
        .slice()
        .sort((a,b)=>orderTs(b) - orderTs(a) || (Number(b?.id || 0) - Number(a?.id || 0)));
      const history = (Array.isArray(state.__vpHistoryByMode?.[mode]) ? state.__vpHistoryByMode[mode] : [])
        .filter(matchesContext)
        .filter(o=>{
          const st = String(o.status || '').toLowerCase();
          return ['closed','filled','done','completed'].includes(st) || Number(o.closed_at || o.closedAt || 0) > 0;
        })
        .slice()
        .sort((a,b)=>orderTs(b) - orderTs(a) || (Number(b?.id || 0) - Number(a?.id || 0)));

      const emptyText = tradesTab === 'positions'
        ? 'You don’t have any positions open'
        : (tradesTab === 'orders' ? 'No pending orders found' : 'No closed trades yet');

      if(tradesTab === 'positions'){
        if(!positions.length){
          host.appendChild(h('div',{class:'mb-empty-box'}, h('div',{class:'mb-empty-title'}, emptyText)));
          return;
        }
        positions.slice(0,4).forEach(pos=>{
          const pnl = Number(pos.unrealized_pnl || 0);
          host.appendChild(h('div',{class:'mb-side-row'},
            h('div',{},
              h('div',{class:'mb-side-row-title'}, `${String(pos.side || 'BUY').toUpperCase()} • ${fmt(Number(pos.qty || 0),4)}`),
              h('div',{class:'mb-side-row-sub'}, `Entry ${money(Number(pos.entry_price || 0), Number(pos.entry_price || 0) < 1 ? 4 : 2)} • ${String(pos.market_type || getMarketType()).toUpperCase()}`)
            ),
            h('div',{class:'mb-side-row-right'},
              h('div',{class:'mb-side-row-pnl ' + (pnl >= 0 ? 'up' : 'down')}, `${pnl >= 0 ? '+' : ''}${fmt(pnl,2)} USD`)
            )
          ));
        });
        return;
      }

      if(tradesTab === 'orders'){
        if(!orders.length){
          host.appendChild(h('div',{class:'mb-empty-box'}, h('div',{class:'mb-empty-title'}, emptyText)));
          return;
        }
        orders.slice(0,4).forEach(ord=>{
          host.appendChild(h('div',{class:'mb-side-row'},
            h('div',{},
              h('div',{class:'mb-side-row-title'}, `${String(ord.side || 'BUY').toUpperCase()} • ${String(ord.order_type || 'LIMIT').toUpperCase()}`),
              h('div',{class:'mb-side-row-sub'}, `Qty ${fmt(Number(ord.qty || 0),4)} • ${money(Number(ord.limit_price || ord.fill_price || ord.entry_price || 0), Number(ord.limit_price || ord.fill_price || ord.entry_price || 0) < 1 ? 4 : 2)}`)
            ),
            h('div',{class:'mb-side-row-right'},
              h('div',{class:'mb-side-row-sub'}, String(ord.status || 'OPEN').toUpperCase())
            )
          ));
        });
        return;
      }

      if(state.__vpHistoryLoadingByMode?.[mode] && !history.length){
        host.appendChild(h('div',{class:'mb-empty-box'}, h('div',{class:'mb-empty-title'}, 'Loading trade history...')));
        return;
      }
      if(!history.length){
        host.appendChild(h('div',{class:'mb-empty-box'}, h('div',{class:'mb-empty-title'}, emptyText)));
        return;
      }
      history.slice(0,4).forEach(ord=>{
        const pnl = Number(ord.pnl_usd || 0);
        host.appendChild(h('div',{class:'mb-side-row'},
          h('div',{},
            h('div',{class:'mb-side-row-title'}, `${String(ord.side || 'BUY').toUpperCase()} • ${fmt(Number(ord.qty || 0),4)}`),
            h('div',{class:'mb-side-row-sub'}, `Entry ${money(Number(ord.entry_price || ord.fill_price || 0), Number(ord.entry_price || ord.fill_price || 0) < 1 ? 4 : 2)} → Exit ${money(Number(ord.exit_price || ord.limit_price || 0), Number(ord.exit_price || ord.limit_price || 0) < 1 ? 4 : 2)}`)
          ),
          h('div',{class:'mb-side-row-right'},
            h('div',{class:'mb-side-row-pnl ' + (pnl >= 0 ? 'up' : 'down')}, `${pnl >= 0 ? '+' : ''}${fmt(pnl,2)} USD`)
          )
        ));
      });
    }

    function updateCalc(){
      const price = Number(priceRef.value || 0);
      const usd = Number(amountIn.value || 0);
      const isPerp = getMarketType() === 'perp';
      const lev = isPerp ? Math.max(1, Number(levSel.value || 1)) : 1;
      const entry = kind === 'limit' ? Number(limitIn.value || 0) : price;
      const units = (usd > 0 && entry > 0) ? ((isPerp ? (usd * lev) : usd) / entry) : 0;
      const margin = usd;
      unitsVal.querySelector('.v').textContent = units > 0 ? fmt(units, 4) + ' ' + String(ctx.symbol || '').replace('USDT','') : '0 ' + String(ctx.symbol || '').replace('USDT','');
      marginVal.querySelector('.v').textContent = usd > 0 ? money(margin,2) : '—';
      const snap = currentSnap();
      bal.textContent = money(snap.equity,2) + ' ' + snap.cur;
      infoBox.textContent = kind === 'stop' ? 'Stop orders need a dedicated backend trigger and stay disabled in this build.' : (kind === 'limit' ? 'Your limit order will fill once the price reaches the requested level.' : 'Market orders fill immediately using the current quote.');
    }

    async function submit(side){
      if(kind === 'stop') return toast('Stop orders are disabled in this build');
      const usd = Number(amountIn.value || 0);
      if(!(usd > 0)) return toast('Enter a valid amount');
      const marketPx = Number(priceRef.value || 0);
      const entry = kind === 'limit' ? Number(limitIn.value || 0) : marketPx;
      if(!(entry > 0)) return toast('Enter a valid price');
      const isPerp = getMarketType() === 'perp';
      const lev = isPerp ? Math.max(1, Number(levSel.value || 1)) : 1;
      try{
        const payload = {
          symbol: ctx.symbol,
          asset_type: ctx.assetType,
          market_type: getMarketType(),
          side,
          order_type: kind === 'limit' ? 'LIMIT' : 'MARKET',
          leverage: lev,
          tp: Number(tpIn.value || 0),
          sl: Number(slIn.value || 0),
          usd: usd,
          price: kind === 'limit' ? entry : 0,
          mode: getMode()
        };
        const r = await api('/trade/place_order.php', {method:'POST', body: payload});
        toast(`${kind === 'limit' ? 'Order placed' : 'Filled'} @ ${fmt(Number(r.fill_price || entry), 4)}`);
        haptic('notification','success');
        state.__vpHistoryByMode = state.__vpHistoryByMode || {};
        delete state.__vpHistoryByMode[getMode()];
        if(typeof ctx.onDone === 'function') ctx.onDone();
        await refreshWalletSummary(true);
        await Promise.allSettled(getMode()==='real'
          ? [refreshRealPortfolio(true), refreshRealPnlStats()]
          : [refreshPortfolio({force:true, mode:'demo'}), refreshPnlStats({mode:'demo'})]);
        await ensureHistory(getMode());
        render();
      }catch(e){
        haptic('notification','error');
        toast(e.message || 'Order failed');
      }
    }

    wrap.appendChild(h('div',{class:'trade-panel-head'},
      h('div',{},
        h('div',{class:'trade-panel-title'}, 'Order Ticket'),
        h('div',{class:'muted tiny'}, `${String(ctx.symbol || '').toUpperCase()} • ${String(ctx.assetType || 'crypto').toUpperCase()}`)
      ),
      h('span',{class:'badge'}, getMarketType().toUpperCase())
    ));
    wrap.appendChild(h('div',{class:'mb-order-kind-tabs'},
      ...['market','limit','stop'].map(k=>h('button',{class:'mb-order-kind ' + (kind === k ? 'active' : '') + (k === 'stop' ? ' disabled' : ''), onclick:()=>{ kind = k; localStorage.setItem('vp_order_kind', k); render(); }}, k.charAt(0).toUpperCase() + k.slice(1)))
    ));
    wrap.appendChild(liveMeta);
    wrap.appendChild(h('div',{class:'mb-order-prices'}, priceSell, priceBuy));
    wrap.appendChild(h('div',{class:'mb-ticket-balance-row'},
      h('span',{}, 'You have'),
      h('strong',{}, bal)
    ));
    wrap.appendChild(h('div',{class:'mb-field-group'}, h('div',{class:'mb-field-label'}, 'Lots / Amount (USD)'), amountIn));
    if(kind === 'limit') wrap.appendChild(h('div',{class:'mb-field-group'}, h('div',{class:'mb-field-label'}, 'Limit price'), limitIn));
    wrap.appendChild(h('div',{class:'mb-field-group'}, h('div',{class:'mb-field-label'}, 'Leverage'), levSel));
    wrap.appendChild(h('div',{class:'trade-ticket-grid'}, marginVal, unitsVal));
    wrap.appendChild(h('div',{class:'mb-field-group'}, h('div',{class:'mb-field-label'}, 'Take Profit'), tpIn));
    wrap.appendChild(h('div',{class:'mb-field-group'}, h('div',{class:'mb-field-label'}, 'Stop Loss'), slIn));
    wrap.appendChild(infoBox);
    wrap.appendChild(h('div',{class:'trade-ticket-actions'},
      h('button',{class:'btn sell', onclick:()=>submit('SELL')}, kind === 'limit' ? 'Sell Limit' : 'Sell / Short'),
      h('button',{class:'btn buy', onclick:()=>submit('BUY')}, kind === 'limit' ? 'Buy Limit' : 'Buy / Long')
    ));
    wrap.appendChild(myTrades);

    wrap.__updateQuote = (quote)=>{
      const p = Number(priceRef.value || 0);
      const resolved = (typeof resolveQuoteBidAsk === 'function')
        ? resolveQuoteBidAsk(quote || null, getMarketType(), ctx.assetType, p)
        : { bid: p, ask: p, spread: 0 };
      const bid = Number(resolved?.bid || 0);
      const ask = Number(resolved?.ask || 0);
      const spread = Number(resolved?.spread || 0);
      const decimals = ((ask > 0 ? ask : (bid > 0 ? bid : p)) < 1) ? 5 : 4;
      priceSell.querySelector('.v').textContent = bid > 0 ? fmt(bid, decimals) : (p > 0 ? fmt(p, decimals) : '—');
      priceBuy.querySelector('.v').textContent = ask > 0 ? fmt(ask, decimals) : (p > 0 ? fmt(p, decimals) : '—');
      try{ liveMeta.querySelector('.mb-ticket-spread').textContent = spread > 0 ? `Spread ${fmt(spread, spread < 1 ? 5 : 3)}` : 'Spread —'; }catch(e){}
    };
    wrap.__updatePrice = ()=>{
      const p = Number(priceRef.value || 0);
      const isPerp = getMarketType() === 'perp';
      try{ wrap.__updateQuote((typeof QuoteCache !== 'undefined' && QuoteCache && typeof QuoteCache.get === 'function') ? QuoteCache.get() : null); }catch(e){
        priceSell.querySelector('.v').textContent = p > 0 ? fmt(p,4) : '—';
        priceBuy.querySelector('.v').textContent = p > 0 ? fmt(p + (p * 0.00012),4) : '—';
      }
      try{ const badge = wrap.querySelector('.trade-panel-head .badge'); if(badge) badge.textContent = getMarketType().toUpperCase(); }catch(e){}
      try{ levSel.closest('.mb-field-group').style.display = isPerp ? '' : 'none'; }catch(e){}
      updateCalc();
      renderTradeTabs();
      renderMyTrades();
    };
    amountIn.addEventListener('input', updateCalc);
    limitIn.addEventListener('input', updateCalc);
    levSel.addEventListener('change', updateCalc);
    tpIn.addEventListener('input', updateCalc);
    slIn.addEventListener('input', updateCalc);
    ensureHistory(getMode());
    wrap.__updatePrice();
    return wrap;
  };

  route = function(){
    const hash = location.hash || '#/home';
    if(hash.startsWith('#/portfolio')) return portfolioPage();
    if(hash.startsWith('#/wallet')) return walletPage();
    if(hash.startsWith('#/kyc')) return (typeof kycPage === 'function' ? kycPage() : accountPage());
    if(hash.startsWith('#/support')) return supportPage();
    if(hash.startsWith('#/notifications')) return notificationsPage();
    if(hash.startsWith('#/news')) return newsPage();
    if(hash.startsWith('#/markets')) return marketsPage();
    if(hash.startsWith('#/trade')) return tradePage();
    if(hash.startsWith('#/invest')) return investPage();
    if(hash.startsWith('#/account')) return accountPage();
    return homePage();
  };

  const __origMarketsPage = marketsPage;
  marketsPage = function(){ return __origMarketsPage(); };

  const __origTradePage = tradePage;
  tradePage = function(){ return __origTradePage(); };

  
investPage = function(){
  const investQuery = (()=>{ try{ return new URLSearchParams(String(location.hash||'').split('?')[1] || ''); }catch(e){ return new URLSearchParams(); }})();
  const allowedInvestTabs = ['signals','contracts'];
  let activeInvestTab = String(investQuery.get('tab') || state.__vpInvestTab || 'signals').toLowerCase();
  if(!allowedInvestTabs.includes(activeInvestTab)) activeInvestTab = 'signals';
  state.__vpInvestTab = activeInvestTab;

  const investMode = String(state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
  const investDemoLocked = investMode !== 'real';
  let contractsTabLocked = false;
  let contractsGateMeta = null;

  const page = h('div',{class:'mb-page mb-invest-page mb-invest-page-v25' + (investDemoLocked ? ' is-demo-locked' : '')}, topBar());
  const hero = h('div',{class:'card mb-invest-hero'},
    h('div',{class:'mb-invest-hero-copy'},
      h('div',{class:'mb-invest-kicker'}, vpTr('Signal desk • Contracts','منصة الإشارات • العقود','Сигнальный стол • Контракты')),
      h('div',{class:'mb-invest-hero-title'}, vpTr('Premium copy trades and curated contracts','نسخ صفقات احترافي وعقود مميزة','Премиальное копирование сделок и продуманные контракты')),
      h('div',{class:'mb-invest-hero-text'}, vpTr('Admins publish platform signals here. When you copy one, it reserves from your real wallet and opens a real position using the admin entry logic. Contracts stay separate as premium income products unlocked by level.','ينشر الأدمن صفقات المنصة هنا. عند نسخ أي صفقة يتم الحجز من محفظتك الحقيقية وتُفتح صفقة حقيقية بمنطق دخول الإدارة. العقود تبقى منتجًا مستقلاً بعوائد مميزة يُفتح حسب المستوى.','Админы публикуют здесь сигналы платформы. Когда вы копируете сигнал, сумма резервируется из реального кошелька и открывается реальная позиция по логике входа администратора. Контракты остаются отдельным премиальным продуктом, который открывается по уровню.')),
      h('div',{class:'mb-invest-hero-actions'},
        h('button',{class:'btn primary', type:'button', onclick:()=>load(true)}, vpTr('Refresh desk','تحديث المنصة','Обновить')),
        h('button',{class:'btn outline', type:'button', onclick:()=>location.hash='#/trade'}, vpTr('Open trade','فتح التداول','Открыть трейд')),
        h('button',{class:'btn outline', type:'button', onclick:()=>location.hash='#/portfolio'}, vpTr('Open portfolio','فتح المحفظة','Открыть портфель'))
      )
    ),
    h('div',{class:'mb-invest-hero-aside'},
      h('div',{class:'mb-invest-aside-label'}, investDemoLocked ? vpTr('Real account preview locked in demo','معاينة الحساب الحقيقي مقفولة في الديمو','Превью real-счёта заблокировано в demo') : vpTr('Real wallet • active access tier','المحفظة الحقيقية • مستوى الوصول','Реальный кошелёк • уровень доступа')),
      h('div',{class:'mb-invest-aside-value', id:'mbInvestWalletValue'}, investDemoLocked ? '••••' : money(Number(state.realPortfolio?.wallet?.USDT?.balance || 0), 2)),
      h('div',{class:'mb-invest-aside-sub', id:'mbInvestLevelText'}, investDemoLocked ? vpTr('Switch to the real account to unlock the earn desk','حوّل إلى الحساب الحقيقي لفتح صفحة الربح','Переключитесь на real-счёт, чтобы открыть Earn') : vpTr('Loading your live access…','جارٍ تحميل مستوى الوصول…','Загрузка доступа…'))
    )
  );

  const summary = h('div',{class:'mb-invest-summary' + (investDemoLocked ? ' mb-invest-preview-lock' : '')},
    miniMetric(vpTr('Signals','الإشارات','Сигналы'), '—', vpTr('Admin copy opportunities','صفقات الأدمن الجاهزة','Сделки от администратора')),
    miniMetric(vpTr('Contracts','العقود','Контракты'), '—', vpTr('Premium plans available now','العقود المميزة المتاحة','Доступные премиальные контракты')),
    miniMetric(vpTr('Copied now','المنسوخ الآن','Скопировано сейчас'), '—', vpTr('Live copied signals on your account','الصفقات المنسوخة على حسابك','Активные копии на вашем счёте')),
    miniMetric(vpTr('Real wallet','المحفظة الحقيقية','Реальный кошелёк'), money(Number(state.realPortfolio?.wallet?.USDT?.balance || 0), 2), vpTr('Primary funding balance','الرصيد الرئيسي المتاح','Основной доступный баланс'))
  );

  const levelStrip = h('div',{class:'mb-invest-level-strip' + (investDemoLocked ? ' mb-invest-preview-lock' : '')},
    h('div',{class:'card mb-invest-level-card'},
      h('div',{class:'mb-invest-level-k'}, vpTr('Current level','المستوى الحالي','Текущий уровень')),
      h('div',{class:'mb-invest-level-v', id:'mbInvestLevelCurrent'}, vpTr('Loading…','جاري التحميل…','Загрузка…')),
      h('div',{class:'mb-invest-level-s', id:'mbInvestLevelCurrentSub'}, vpTr('Access tier for signals and contracts','درجة الوصول للإشارات والعقود','Уровень доступа для сигналов и контрактов'))
    ),
    h('div',{class:'card mb-invest-level-card'},
      h('div',{class:'mb-invest-level-k'}, vpTr('Confirmed deposits','الإيداعات المؤكدة','Подтвержденные депозиты')),
      h('div',{class:'mb-invest-level-v', id:'mbInvestLevelDeposits'}, money(0,2)),
      h('div',{class:'mb-invest-level-s', id:'mbInvestLevelDepositsSub'}, vpTr('Used to calculate your level','تُستخدم لحساب مستواك','Используются для расчета уровня'))
    ),
    h('div',{class:'card mb-invest-level-card'},
      h('div',{class:'mb-invest-level-k'}, vpTr('Next unlock','الترقية التالية','Следующий уровень')),
      h('div',{class:'mb-invest-level-v', id:'mbInvestLevelNext'}, vpTr('Starter','مبتدئ','Старт')),
      h('div',{class:'mb-invest-level-s', id:'mbInvestLevelNextSub'}, vpTr('We are checking your upgrade path','جارٍ التحقق من مسار الترقية','Проверяем путь повышения'))
    ),
    h('div',{class:'card mb-invest-level-card mb-invest-level-progress-card'},
      h('div',{class:'mb-invest-level-k'}, vpTr('Progress to next level','التقدم نحو المستوى التالي','Прогресс до следующего уровня')),
      h('div',{class:'mb-invest-level-progress'}, h('span',{id:'mbInvestLevelProgressBar'})),
      h('div',{class:'mb-invest-level-s', id:'mbInvestLevelProgressText'}, vpTr('Loading progress…','جاري تحميل التقدم…','Загрузка прогресса…'))
    )
  );

  const tabBar = h('div',{class:'mb-invest-tabs' + (investDemoLocked ? ' mb-invest-preview-lock' : '')},
    h('button',{class:'mb-invest-tab' + (activeInvestTab === 'signals' ? ' is-active' : ''), type:'button', 'data-tab':'signals'}, vpTr('Signal desk','منصة الإشارات','Сигнальный стол')),
    h('button',{class:'mb-invest-tab' + (activeInvestTab === 'contracts' ? ' is-active' : ''), type:'button', 'data-tab':'contracts'}, vpTr('Contracts','العقود','Контракты'))
  );

  const signalPane = h('div',{class:'mb-invest-pane' + (activeInvestTab === 'signals' ? ' is-active' : '') + (investDemoLocked ? ' mb-invest-preview-lock' : ''), 'data-pane':'signals'});
  const contractsPane = h('div',{class:'mb-invest-pane' + (activeInvestTab === 'contracts' ? ' is-active' : '') + (investDemoLocked ? ' mb-invest-preview-lock' : ''), 'data-pane':'contracts'});
  const signalSection = h('div',{class:'card mb-invest-section-shell'},
    h('div',{class:'mb-invest-section-head'},
      h('div',{},
        h('div',{class:'mb-card-title'}, vpTr('Platform signal desk','منصة صفقات الأدمن','Сигнальный стол платформы')),
        h('div',{class:'muted small'}, vpTr('Every card below is an admin signal. Copying it prepares or opens a real trade from your live balance.','كل كارت بالأسفل هو صفقة ينشرها الأدمن. عند النسخ يتم تجهيز أو فتح صفقة حقيقية من رصيدك الحقيقي.','Каждая карточка ниже — это сигнал администратора. При копировании готовится или открывается реальная сделка из вашего реального баланса.'))
      ),
      h('div',{class:'mb-invest-section-pills'},
        h('span',{class:'pill ghost'}, vpTr('Real copy flow','نسخ على الحقيقي','Копирование в real')),
        h('span',{class:'pill ghost', id:'mbInvestCopiedCountPill'}, vpTr('Loading…','جاري التحميل…','Загрузка…'))
      )
    )
  );
  const contractsSection = h('div',{class:'card mb-invest-section-shell'},
    h('div',{class:'mb-invest-section-head'},
      h('div',{},
        h('div',{class:'mb-card-title'}, vpTr('Premium contracts','العقود المميزة','Премиальные контракты')),
        h('div',{class:'muted small'}, vpTr('Contracts stay separate from copied trades. Subscribe to the plan that matches your current level and funding size.','العقود منفصلة عن نسخ الصفقات. اشترك في العقد المناسب لمستواك الحالي وحجم تمويلك.','Контракты отделены от копируемых сделок. Подключайте тариф, который подходит вашему уровню и размеру баланса.'))
      ),
      h('div',{class:'mb-invest-section-pills'},
        h('span',{class:'pill ghost'}, vpTr('Level gated','مرتبطة بالمستوى','По уровню')),
        h('span',{class:'pill ghost'}, vpTr('Premium yield','عائد مميز','Премиальная доходность'))
      )
    )
  );
  const signalGrid = h('div',{class:'mb-invest-grid mb-invest-grid-signals'});
  const contractGrid = h('div',{class:'mb-invest-grid mb-invest-grid-contracts'});
  signalSection.appendChild(signalGrid);
  contractsSection.appendChild(contractGrid);
  signalPane.appendChild(signalSection);
  contractsPane.appendChild(contractsSection);

  if(investDemoLocked) hero.classList.add('mb-invest-preview-lock');
  page.appendChild(hero);
  page.appendChild(levelStrip);
  page.appendChild(summary);
  page.appendChild(tabBar);
  page.appendChild(signalPane);
  page.appendChild(contractsPane);

  const levelCurrentEl = levelStrip.querySelector('#mbInvestLevelCurrent');
  const levelCurrentSubEl = levelStrip.querySelector('#mbInvestLevelCurrentSub');
  const levelDepositsEl = levelStrip.querySelector('#mbInvestLevelDeposits');
  const levelDepositsSubEl = levelStrip.querySelector('#mbInvestLevelDepositsSub');
  const levelNextEl = levelStrip.querySelector('#mbInvestLevelNext');
  const levelNextSubEl = levelStrip.querySelector('#mbInvestLevelNextSub');
  const levelProgressBarEl = levelStrip.querySelector('#mbInvestLevelProgressBar');
  const levelProgressTextEl = levelStrip.querySelector('#mbInvestLevelProgressText');
  const copiedPillEl = signalSection.querySelector('#mbInvestCopiedCountPill');

  const scheduleLabel = (s)=>{
    if (s==='daily') return vpTr('Daily payout','توزيع يومي','Ежедневная выплата');
    if (s==='weekly') return vpTr('Weekly payout','توزيع أسبوعي','Еженедельная выплата');
    if (s==='monthly') return vpTr('Monthly payout','توزيع شهري','Ежемесячная выплата');
    return vpTr('At maturity','عند الاستحقاق','В конце срока');
  };
  const riskTone = (risk)=>{
    const v = String(risk||'medium').toLowerCase();
    if (v==='low') return 'up';
    if (v==='high') return 'down';
    return 'warn';
  };
  const makeIdemKey = ()=> crypto?.randomUUID ? crypto.randomUUID() : ('idem_'+Date.now()+Math.random().toString(16).slice(2));
  const metricSet = (idx, value, sub)=>{
    const cards = summary.querySelectorAll('.mb-mini-metric');
    if(!cards[idx]) return;
    const v = cards[idx].querySelector('.mb-mini-v');
    const s = cards[idx].querySelector('.mb-mini-s');
    if(v) v.textContent = value;
    if(s && sub != null) s.textContent = sub;
  };
  const featuresList = (txt)=>{
    const items = String(txt || '').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(!items.length) return null;
    return h('ul',{class:'mb-contract-features'}, ...items.map(x=>h('li',{}, x)));
  };
  const clampText = (val, max)=>{
    const raw = String(val || '').replace(/\s+/g,' ').trim();
    if(!raw) return '';
    return raw.length > max ? (raw.slice(0, Math.max(0, max - 1)).trimEnd() + '…') : raw;
  };
  const levelPill = (lvl)=> lvl ? h('span',{class:'pill ghost'}, `${vpTr('Level','المستوى','Уровень')}: ${String(lvl.name || lvl.level_code || '—')}`) : h('span',{class:'pill ghost'}, vpTr('Open access','متاح للجميع','Открытый доступ'));
  const syncInvestHash = (key)=>{
    try{
      const params = new URLSearchParams(String(location.hash||'').split('?')[1] || '');
      if(key && key !== 'signals') params.set('tab', key); else params.delete('tab');
      const nextHash = '#/invest' + (params.toString() ? ('?' + params.toString()) : '');
      const url = new URL(window.location.href);
      if(url.hash !== nextHash){
        url.hash = nextHash;
        history.replaceState(null, '', url.toString());
      }
    }catch(e){}
  };
  const switchTab = (key)=>{
    const target = allowedInvestTabs.includes(String(key || '').toLowerCase()) ? String(key || '').toLowerCase() : 'signals';
    if(target === 'contracts' && contractsTabLocked){
      const gateName = String(contractsGateMeta?.name || vpTr('the required level','المستوى المطلوب','нужный уровень'));
      try{ toast(`${vpTr('Contracts unlock after you reach','العقود تُفتح بعد الوصول إلى','Контракты откроются после достижения')} ${gateName}`); }catch(e){}
      activeInvestTab = 'signals';
    }else{
      activeInvestTab = target;
    }
    state.__vpInvestTab = activeInvestTab;
    tabBar.querySelectorAll('.mb-invest-tab').forEach(btn=>btn.classList.toggle('is-active', btn.getAttribute('data-tab')===activeInvestTab));
    page.querySelectorAll('.mb-invest-pane').forEach(pane=>pane.classList.toggle('is-active', pane.getAttribute('data-pane')===activeInvestTab));
    syncInvestHash(activeInvestTab);
  };
  const safeMsg = (err, fallback)=>{
    const msg = String(err?.message || err || '').trim();
    return msg || fallback;
  };
  const sectionError = (title, sub)=> h('div',{class:'card mb-empty-box large'}, h('div',{class:'mb-empty-title'}, title), sub ? h('div',{class:'muted small'}, sub) : null);
  const settledApi = (path)=> api(path).then(data=>({ok:true,data})).catch(error=>({ok:false,error}));
  const inferSignalType = (sig)=>{
    let raw = String(sig?.type || sig?.market_type || '').trim().toLowerCase();
    const sym = String(sig?.symbol || sig?.market_symbol || '').toUpperCase().trim();
    if(sym){
      if(/(_F|1!)$/.test(sym)) return 'futures';
      if(/^(XAU|XAG|XPT|XPD|USOIL|UKOIL|BRENT|WTI|NGAS|COPPER)/.test(sym)) return 'commodities';
      if(/(USDT|USDC|BUSD|FDUSD|BTC|ETH)$/.test(sym)) return 'crypto';
      if(/^[A-Z]{6}$/.test(sym) && !/(USDT|USDC|BUSD|FDUSD)$/.test(sym)) return 'forex';
      if(/^\d{4}$/.test(sym) || /^(TADAWUL|DFM|ADX)/.test(sym)) return 'arab';
    }
    if(raw === 'fx') raw = 'forex';
    if(['crypto','forex','stocks','commodities','futures','arab'].includes(raw)) return raw;
    if(/^[A-Z]{1,5}(?:\.[A-Z])?$/.test(sym)) return 'stocks';
    return 'crypto';
  };
  const typeLabel = (sig)=>{
    const type = inferSignalType(sig);
    const map = {
      crypto: vpTr('Crypto','كريبتو','Крипто'),
      forex: vpTr('Forex','فوركس','Форекс'),
      stocks: vpTr('Stocks','أسهم','Акции'),
      commodities: vpTr('Commodities','سلع','Товары'),
      futures: vpTr('Futures','عقود آجلة','Фьючерсы'),
      indices: vpTr('Indices','مؤشرات','Индексы'),
      arab: vpTr('Arab markets','الأسواق العربية','Арабские рынки')
    };
    return map[type] || type.toUpperCase();
  };
  const cleanSubtitle = (sig)=>{
    const meta = [];
    if(sig?.timeframe) meta.push(String(sig.timeframe));
    meta.push(typeLabel(sig));
    const source = String(sig?.bot_name || '').trim();
    if(source && !/^\d+$/.test(source) && source.toLowerCase() !== 'signal desk') meta.push(source);
    return meta.join(' • ');
  };
  const signalLiveBindings = new Map();
  let signalLiveTimer = null;
  let signalLiveInflight = false;
  const clearSignalLive = ()=>{
    try{ if(signalLiveTimer) clearInterval(signalLiveTimer); }catch(e){}
    signalLiveTimer = null;
    signalLiveBindings.clear();
  };
  const updateSignalCardLive = vpUpdateSignalCardLive;
  try{ window.updateSignalCardLive = updateSignalCardLive; }catch(e){}
  const attachCopyHistoryLiveRow = (row, item)=>{
    if(!row || !item) return null;
    const priceEl = row.querySelector('[data-copy-live-price]');
    const sourceEl = row.querySelector('[data-copy-live-source]');
    if(!priceEl) return null;
    const binding = {
      key: `copy:${inferSignalType(item)}:${String(item.symbol || '').toUpperCase()}:${String(item.id || '')}`,
      symbol: String(item.symbol || '').toUpperCase(),
      type: inferSignalType(item),
      market: String(item?.market || item?.market_type_mode || 'spot').toLowerCase(),
      sig: item,
      historyPriceEl: priceEl,
      historySourceEl: sourceEl,
    };
    signalLiveBindings.set(binding.key, binding);
    updateSignalCardLive(binding, {
      price:Number(item?.live_price || 0) || 0,
      changePct:Number(item?.live_change_pct || item?.change_pct || 0) || 0,
      source:String(item?.live_source || item?.source || '').trim(),
      updatedAt:Number(item?.live_updated_at || item?.updated_at || 0) || 0,
    });
    startSignalLiveLoop();
    return binding;
  };

  const startSignalLiveLoop = ()=>{
    if(signalLiveTimer || !signalLiveBindings.size) return;
    const tick = async(force=false)=>{
      if(signalLiveInflight || !signalLiveBindings.size) return;
      signalLiveInflight = true;
      try{
        const groups = new Map();
        signalLiveBindings.forEach((binding)=>{
          const t = binding.type;
          if(!groups.has(t)) groups.set(t, {type:t, symbols:new Set(), bindings:[]});
          groups.get(t).symbols.add(binding.symbol);
          groups.get(t).bindings.push(binding);
        });
        for(const group of groups.values()){
          const groupBindings = Array.isArray(group.bindings) ? group.bindings : [];
          const uniqSymbols = [...(group.symbols || new Set())].filter(Boolean);
          if(!uniqSymbols.length) continue;
          const quoteMap = new Map();
          try{
            uniqSymbols.forEach(symbol=>{
              const sample = groupBindings.find(binding=>binding.symbol === symbol);
              const market = vpResolveLiveMarketForSymbol(symbol, group.type, sample?.market || 'spot');
              const remembered = (typeof window.vpCanonicalQuoteForUi === 'function')
                ? window.vpCanonicalQuoteForUi(symbol, group.type, market, { maxAgeSec: group.type === 'crypto' ? 6 : 10 })
                : ((typeof vpGetFreshRememberedQuote === 'function') ? vpGetFreshRememberedQuote(symbol, group.type, group.type === 'crypto' ? 6 : 10) : null);
              if(remembered && Number(remembered?.price || remembered?.last || remembered?.mark_price || 0) > 0){
                quoteMap.set(symbol, remembered);
              }
            });
          }catch(e){}
          let missing = uniqSymbols.filter(symbol=>{
            const q = quoteMap.get(symbol);
            const src = String(q?.source || q?.provider || '').trim();
            return !(q && Number(q?.price || q?.last || q?.mark_price || 0) > 0 && ((group.type === 'crypto') || (typeof window.isPreferredSignalLiveSource === 'function' ? window.isPreferredSignalLiveSource(src, symbol, group.type) : true)));
          });
          if(missing.length){
            try{
              const directParam = '';
              const resp = await api((vpNormalizeAssetType(group.type) === 'crypto' ? `/quotes.php?fresh=1&type=${encodeURIComponent(group.type)}&symbols=${encodeURIComponent(missing.join(','))}` : `/quotes.php?type=${encodeURIComponent(group.type)}&symbols=${encodeURIComponent(missing.join(','))}`), { timeoutMs: (vpNormalizeAssetType(group.type) === 'arab' && missing.length <= 4) ? 5800 : 5000 });
              const items = Array.isArray(resp?.items) ? resp.items : [];
              items.forEach(item=>quoteMap.set(String(item?.symbol || '').toUpperCase(), item));
            }catch(e){}
            missing = uniqSymbols.filter(symbol=>{
              const q = quoteMap.get(symbol);
              const src = String(q?.source || q?.provider || '').trim();
              return !(q && Number(q?.price || q?.last || q?.mark_price || 0) > 0 && ((group.type === 'crypto') || (typeof window.isPreferredSignalLiveSource === 'function' ? window.isPreferredSignalLiveSource(src, symbol, group.type) : true)));
            });
          }
          if(missing.length && group.type === 'crypto'){
            try{
              const spotSymbols = [];
              const perpSymbols = [];
              missing.forEach(symbol=>{
                const sample = groupBindings.find(binding=>binding.symbol === symbol);
                const effMarket = vpResolveLiveMarketForSymbol(symbol, group.type, sample?.market || 'spot');
                if(effMarket === 'perp') perpSymbols.push(symbol); else spotSymbols.push(symbol);
              });
              const pull = async(list, market)=>{
                if(!list.length) return [];
                const fallback = await api(`/trade/stream.php?lite=1&type=${encodeURIComponent(group.type)}&symbols=${encodeURIComponent(list.join(','))}&market=${encodeURIComponent(market)}&_=${Date.now()}`, { timeoutMs: 4500 });
                return fallback?.quotes && typeof fallback.quotes === 'object' ? Object.values(fallback.quotes) : [];
              };
              const pulls = await Promise.allSettled([pull(spotSymbols, 'spot'), pull(perpSymbols, 'perp')]);
              pulls.forEach(result=>{
                if(result.status !== 'fulfilled' || !Array.isArray(result.value)) return;
                result.value.forEach(item=>quoteMap.set(String(item?.symbol || '').toUpperCase(), item));
              });
            }catch(err){}
          }
          for(const symbol of uniqSymbols){
            const live = quoteMap.get(symbol);
            const liveSource = String(live?.source || live?.provider || '').trim();
            const trustedLive = (group.type === 'crypto') || (typeof window.isPreferredSignalLiveSource === 'function' ? window.isPreferredSignalLiveSource(liveSource, symbol, group.type) : true);
            if(live && Number(live?.price || live?.last || live?.mark_price || 0) > 0 && trustedLive){
              signalLiveBindings.forEach(binding=>{ if(binding.symbol === symbol && binding.type === group.type){ const signalUpdater = window.updateSignalCardLive; if(typeof signalUpdater === 'function') signalUpdater(binding, {price:Number(live?.price || live?.last || live?.mark_price || 0), changePct:Number(live?.change_pct ?? live?.changePct ?? 0), source:liveSource, updatedAt:Number(live?.updated_at || live?.ts || live?.time || 0) || 0}); } });
              continue;
            }
            const fallbackBindings = groupBindings.filter(binding=>binding.symbol === symbol && binding.type === group.type);
            for(const binding of fallbackBindings){
              try{
                const liveOne = await fetchSignalLiveQuote(binding.sig, force);
                { const signalUpdater = window.updateSignalCardLive; if(typeof signalUpdater === 'function') signalUpdater(binding, liveOne || null); }
              }catch(err){ const signalUpdater = window.updateSignalCardLive; if(typeof signalUpdater === 'function') signalUpdater(binding, null); }
            }
          }
        }
      }finally{
        signalLiveInflight = false;
      }
    };
    signalLiveTimer = setInterval(()=>{ try{ tick(false); }catch(e){} }, vpIsMobile() ? 3600 : 2800);
    onCleanup(clearSignalLive);
    Promise.resolve().then(()=>tick(true));
  };
  const attachSignalLiveCard = (card, sig)=>{
    const priceEl = card.querySelector('[data-signal-live-price]');
    const changeEl = card.querySelector('[data-signal-live-change]');
    const sourceEl = card.querySelector('[data-signal-live-source]');
    const noteEl = card.querySelector('[data-signal-live-note]');
    const entryHintEl = card.querySelector('[data-signal-entry-hint]');
    if(!priceEl) return null;
    const binding = {
      key: `${inferSignalType(sig)}:${String(sig.symbol || '').toUpperCase()}:${String(sig.id || '')}`,
      symbol: String(sig.symbol || '').toUpperCase(),
      type: inferSignalType(sig),
      market: String(sig?.market || sig?.market_type_mode || 'spot').toLowerCase(),
      sig,
      priceEl,
      changeEl,
      sourceEl,
      noteEl,
      entryHintEl,
    };
    signalLiveBindings.set(binding.key, binding);
    let initialLive = {
      price:Number(sig?.live_price || 0) || 0,
      changePct:Number(sig?.live_change_pct || sig?.change_pct || 0) || 0,
      source:String(sig?.live_source || sig?.source || '').trim(),
      updatedAt:Number(sig?.live_updated_at || sig?.updated_at || 0) || 0,
    };
    try{
      const remembered = (typeof vpGetFreshRememberedQuote === 'function') ? vpGetFreshRememberedQuote(binding.symbol, binding.type, binding.type === 'crypto' ? 18 : 12) : null;
      if(remembered && Number(remembered?.price || remembered?.last || remembered?.mark_price || 0) > 0){
        initialLive = {
          price:Number(remembered?.price || remembered?.last || remembered?.mark_price || 0) || 0,
          changePct:Number(remembered?.change_pct ?? remembered?.changePct ?? initialLive.changePct ?? 0) || 0,
          source:String(remembered?.source || remembered?.provider || initialLive.source || '').trim(),
          updatedAt:Number(remembered?.updated_at || remembered?.ts || remembered?.time || initialLive.updatedAt || 0) || 0,
        };
      }
    }catch(e){}
    { const signalUpdater = window.updateSignalCardLive; if(typeof signalUpdater === 'function') signalUpdater(binding, initialLive); }
    startSignalLiveLoop();
    return binding;
  };
  try{ window.vpMountSignalMiniWidget = vpMountSignalMiniWidget; }catch(e){}
  try{ window.vpAttachSignalLiveCard = attachSignalLiveCard; }catch(e){}
  const resetLevelCards = ()=>{
    if(levelCurrentEl) levelCurrentEl.textContent = vpTr('Loading…','جاري التحميل…','Загрузка…');
    if(levelCurrentSubEl) levelCurrentSubEl.textContent = vpTr('Access tier for signals and contracts','درجة الوصول للإشارات والعقود','Уровень доступа для сигналов и контрактов');
    if(levelDepositsEl) levelDepositsEl.textContent = money(0,2);
    if(levelDepositsSubEl) levelDepositsSubEl.textContent = vpTr('Used to calculate your level','تُستخدم لحساب مستواك','Используются для расчета уровня');
    if(levelNextEl) levelNextEl.textContent = vpTr('Loading…','جاري التحميل…','Загрузка…');
    if(levelNextSubEl) levelNextSubEl.textContent = vpTr('We are checking your upgrade path','جارٍ التحقق من مسار الترقية','Проверяем путь повышения');
    if(levelProgressBarEl) levelProgressBarEl.style.width = '0%';
    if(levelProgressTextEl) levelProgressTextEl.textContent = vpTr('Loading progress…','جاري تحميل التقدم…','Загрузка прогресса…');
  };
  const renderLevelCards = (levelData, contractsData)=>{
    const levelList = Array.isArray(levelData?.levels) ? levelData.levels.slice() : [];
    const current = levelData?.current || contractsData?.user_level || state.user?.user_level || null;
    let next = levelData?.next || contractsData?.next_level || state.user?.next_level || null;
    const total = Number(levelData?.confirmed_deposit_total ?? contractsData?.confirmed_deposit_total ?? state.user?.confirmed_deposit_total ?? 0);
    const currentIndex = current ? Math.max(0, levelList.findIndex(l=>String(l.id||'')===String(current.id||'') || String(l.level_code||'')===String(current.level_code||''))) : -1;
    let nextIndex = next ? levelList.findIndex(l=>String(l.id||'')===String(next.id||'') || String(l.level_code||'')===String(next.level_code||'')) : -1;
    if(next && current && ((String(next.id||'')===String(current.id||'')) || nextIndex===currentIndex)){
      next = levelList[currentIndex + 1] || null;
      nextIndex = next ? currentIndex + 1 : -1;
    }
    if(!next && currentIndex >= 0 && levelList[currentIndex + 1]){ next = levelList[currentIndex + 1]; nextIndex = currentIndex + 1; }
    const currentMin = Number(current?.min_deposit_total || 0);
    const nextMin = Number(next?.min_deposit_total || currentMin || 0);
    const targetGap = Math.max(0, nextMin - currentMin);
    const progress = next ? Math.max(0, Math.min(100, targetGap > 0 ? ((total - currentMin) / targetGap) * 100 : 100)) : 100;
    const remaining = next ? Math.max(0, nextMin - total) : 0;
    const currentName = vpLevelDisplayName(current, currentIndex >= 0 ? currentIndex + 1 : 1);
    const nextName = next ? vpLevelDisplayName(next, nextIndex >= 0 ? nextIndex + 1 : (currentIndex >= 0 ? currentIndex + 2 : 2)) : vpTr('Top tier reached','تم الوصول لأعلى مستوى','Достигнут максимальный уровень');
    if(levelCurrentEl) levelCurrentEl.textContent = currentName;
    if(levelCurrentSubEl) levelCurrentSubEl.textContent = current?.perks ? String(current.perks).split(/\r?\n/).filter(Boolean).slice(0,2).join(' • ') || vpTr('Active access tier','مستوى الوصول الحالي','Текущий уровень доступа') : vpTr('Active access tier','مستوى الوصول الحالي','Текущий уровень доступа');
    if(levelDepositsEl) levelDepositsEl.textContent = money(total, 2);
    if(levelDepositsSubEl) levelDepositsSubEl.textContent = next ? `${vpTr('Next unlock at','الترقية التالية عند','Следующий уровень на')}: ${money(nextMin, 0)}` : vpTr('All published levels are unlocked','تم فتح كل المستويات المنشورة','Все опубликованные уровни уже открыты');
    if(levelNextEl) levelNextEl.textContent = nextName;
    if(levelNextSubEl) levelNextSubEl.textContent = next ? `${vpTr('Need','تحتاج','Нужно')}: ${money(remaining, 2)}` : vpTr('No further level is required','لا توجد ترقية أعلى مطلوبة','Следующего уровня нет');
    if(levelProgressBarEl) levelProgressBarEl.style.width = `${progress}%`;
    if(levelProgressTextEl) levelProgressTextEl.textContent = next ? `${fmt(progress, 0)}% • ${vpTr('Remaining','المتبقي','Осталось')}: ${money(remaining, 2)}` : vpTr('Maximum level unlocked','تم فتح أعلى مستوى','Максимальный уровень открыт');
    const levelText = hero.querySelector('#mbInvestLevelText');
    if(levelText){
      levelText.textContent = current ? `${vpTr('Current level','المستوى الحالي','Текущий уровень')}: ${currentName}${next ? ' • ' + vpTr('Next','التالي','Далее') + ': ' + nextName : ''}` : vpTr('Starter access is active','وصول المستوى المبدئي مفعل','Активен стартовый доступ');
    }
    const walletValue = hero.querySelector('#mbInvestWalletValue');
    if(walletValue) walletValue.textContent = money(Number(state.realPortfolio?.wallet?.USDT?.balance || 0), 2);
  };
  tabBar.addEventListener('click', (ev)=>{
    const btn = ev.target && ev.target.closest ? ev.target.closest('.mb-invest-tab') : null;
    if(!btn) return;
    switchTab(btn.getAttribute('data-tab') || 'signals');
  });

  function renderSignalDesk(signals, subs, error){
    signalGrid.innerHTML = '';
    clearSignalLive();
    const copyItems = Array.isArray(subs) ? subs.slice() : [];
    const normalizeCopyStatus = (item)=>{
      const raw = String(item?.status || '').toLowerCase();
      const pos = String(item?.position_status || '').toLowerCase();
      if(['closed','completed','settled','cancelled','canceled','expired'].includes(raw) || pos === 'closed') return 'closed';
      if(['armed','active','copied','open'].includes(raw) || pos === 'open') return 'open';
      return raw || 'pending';
    };
    if(copyItems.length){
      const openCount = copyItems.filter(item=>normalizeCopyStatus(item)==='open').length;
      const closedCount = copyItems.filter(item=>normalizeCopyStatus(item)==='closed').length;
      const pendingCount = Math.max(0, copyItems.length - openCount - closedCount);
      const historyRows = copyItems.slice(0, 6).map(item=>{
        const st = normalizeCopyStatus(item);
        const statusText = st === 'open' ? vpTr('Open','مفتوح','Открыт') : (st === 'closed' ? vpTr('Closed','مغلق','Закрыт') : vpTr('Pending','قيد التجهيز','В ожидании'));
        const tone = st === 'closed' ? 'ghost' : (st === 'open' ? 'up' : 'warn');
        const whenText = item?.created_at ? vpFmtDate(Number(item.created_at || 0)) : vpTr('Just now','الآن','Сейчас');
        const row = h('div',{class:'mb-copy-history-row metallic'},
          h('div',{class:'mb-copy-history-main'},
            h('div',{class:'mb-copy-history-symbol'}, String(item.symbol || item.bot_name || '—')),
            h('div',{class:'mb-copy-history-sub'}, `${String(item.timeframe || '').trim() || vpTr('Signal desk','منصة الإشارات','Сигнальный стол')} • ${whenText}`),
            h('div',{class:'mb-copy-history-live', 'data-copy-live-price':'1'}, Number(item?.live_price || 0) > 0 ? money(Number(item.live_price || 0), vpSignalPriceDecimals(Number(item.live_price || 0))) : '—'),
            h('div',{class:'mb-copy-history-feed muted small', 'data-copy-live-source':'1'}, String(item?.live_source || '').trim() || vpTr('Waiting for feed','بانتظار التغذية','Ожидание потока'))
          ),
          h('div',{class:'mb-copy-history-side'},
            h('span',{class:`pill ${tone}`}, statusText),
            h('span',{class:'mb-copy-history-amount'}, Number(item.reserved_amount || 0) > 0 ? money(Number(item.reserved_amount || 0), 0) : '—')
          )
        );
        try{ attachCopyHistoryLiveRow(row, item); }catch(e){}
        return row;
      });
      signalGrid.appendChild(h('div',{class:'card mb-copy-history-card'},
        h('div',{class:'mb-copy-history-head'},
          h('div',{},
            h('div',{class:'mb-card-title'}, vpTr('Copy history','سجل النسخ','История копирования')),
            h('div',{class:'muted small'}, vpTr('See which copied signals are still open and which ones were closed.','اعرف أي الصفقات المنسوخة ما زالت مفتوحة وأيها أُغلق بالفعل.','Показывает, какие скопированные сигналы еще открыты, а какие уже закрыты.'))
          ),
          h('div',{class:'mb-copy-history-pills'},
            h('span',{class:'pill ghost'}, `${vpTr('Open','مفتوح','Открыт')}: ${openCount}`),
            h('span',{class:'pill ghost'}, `${vpTr('Closed','مغلق','Закрыт')}: ${closedCount}`),
            h('span',{class:'pill ghost'}, `${vpTr('Pending','قيد التجهيز','В ожидании')}: ${pendingCount}`)
          )
        ),
        h('div',{class:'mb-copy-history-list'}, ...historyRows)
      ));
    }
    if(error){
      signalGrid.appendChild(sectionError(vpTr('Signal desk is temporarily unavailable','منصة الإشارات غير متاحة مؤقتًا','Сигнальный стол временно недоступен'), safeMsg(error, vpTr('Please refresh the page in a moment','حدّث الصفحة بعد لحظات','Обновите страницу через несколько секунд'))));
      return;
    }
    const subBySignal = new Map((subs || []).map(item=>[Number(item.signal_id || 0), item]));
    if(!signals.length){
      signalGrid.appendChild(h('div',{class:'card mb-empty-box large'},
        h('div',{class:'mb-empty-title'}, vpTr('No admin signals are live right now','لا توجد صفقات أدمن نشطة الآن','Сейчас нет активных сигналов от администратора')),
        h('div',{class:'muted small'}, vpTr('As soon as the admin publishes a new signal, it will appear here with a live quote, entry profile and real-copy controls.','بمجرد أن ينشر الأدمن صفقة جديدة ستظهر هنا مع السعر الحي وخطة الدخول وأزرار النسخ على الحقيقي.','Как только администратор опубликует новый сигнал, он появится здесь с живой ценой, профилем входа и кнопками копирования в real.'))
      ));
      return;
    }
    signals.forEach(sig=>{
      const sub = subBySignal.get(Number(sig.id || 0));
      const status = String(sub?.status || '').toLowerCase();
      const dir = String(sig.direction || 'BUY').toUpperCase();
      const tone = dir === 'SELL' ? 'down' : 'up';
      const hasCopied = ['armed','copied','active'].includes(status);
      const badgeText = status === 'armed' ? vpTr('Armed','مسلّحة','Вооружена') : (hasCopied ? vpTr('Copied','منسوخة','Скопирована') : dir);
      const brief = String(sig.bot_brief || sig.note || '').trim() || vpTr('Admin published trade setup','إعداد صفقة منشور من الإدارة','Сетап сделки от администратора');
      const briefShort = clampText(brief, 104);
      const widgetHost = h('div',{class:'mb-signal-widget-shell premium quote-only compact dash', 'data-signal-tv-canvas':'1'});
      const card = h('div',{class:'card mb-invest-card mb-invest-signal-card compact tight premium premium-refined'},
        h('div',{class:'mb-invest-card-head compact premium'},
          h('div',{class:'mb-invest-card-copy'},
            h('div',{class:'mb-invest-card-title'}, String(sig.symbol || 'Signal')),
            h('div',{class:'mb-invest-card-sub'}, cleanSubtitle(sig))
          ),
          h('div',{class:'mb-invest-signal-status'},
            h('span',{class:'badge ' + tone}, badgeText),
            h('span',{class:'pill ghost'}, vpTr('Real only','حقيقي فقط','Только real'))
          )
        ),
        widgetHost,
        h('div',{class:'mb-invest-meta-grid compact short premium cols4'},
          miniMetric(vpTr('Entry','الدخول','Вход'), sig.entry ? money(sig.entry, vpSignalPriceDecimals(sig.entry)) : vpTr('Market','سوق','Рынок'), vpTr('Admin entry','دخول الإدارة','Вход аналитика')),
          miniMetric('SL', sig.sl ? money(sig.sl, vpSignalPriceDecimals(sig.sl)) : '—', vpTr('Stop loss','إيقاف الخسارة','Стоп-лосс')),
          miniMetric('TP1', sig.tp1 ? money(sig.tp1, vpSignalPriceDecimals(sig.tp1)) : '—', vpTr('Primary target','الهدف الأول','Первая цель')),
          miniMetric(vpTr('Minimum','الحد الأدنى','Минимум'), money(sig.copy_min_amount || 0, 0), vpTr('Real wallet amount','مبلغ النسخ الحقيقي','Сумма real'))
        ),
        h('div',{class:'mb-invest-inline-strip compact premium'},
          h('span',{class:'pill ghost'}, `${vpTr('Share','المشاركة','Доля')}: ${fmt(Number(sig.copy_profit_share_pct || 0), 2)}%`),
          h('span',{class:'pill ghost'}, `${vpTr('Leverage','الرافعة','Плечо')}: ${Math.max(1, Number(sig.copy_leverage || 1))}x`)
        ),
        vpSignalCounters(sig),
        h('div',{class:'mb-invest-details compact short premium refined'}, briefShort),
        h('div',{class:'mb-bot-row-actions compact'},
          h('button',{class:'btn outline', type:'button', onclick:()=>openTradingBotDetails(sig)}, vpTr('Details','التفاصيل','Подробнее')),
          h('button',{class:'btn primary', type:'button', onclick:()=>openTradingBotCopyDialog(sig)}, hasCopied ? vpTr('Manage','إدارة','Управлять') : vpTr('Copy','نسخ','Копировать'))
        )
      );
      signalGrid.appendChild(card);
      try{ vpMountSignalMiniWidget(widgetHost, sig, {compact:true}); }catch(e){}
      try{ attachSignalLiveCard(card, sig); }catch(e){}
    });
  }

  function contractCard(pl, userLevel){
    const cap = (pl.max_amount && Number(pl.max_amount)>0) ? money(pl.max_amount,0) : safeT('invest.no_max','No max');
    const amount = h('input',{class:'input', type:'number', step:'1', min:String(pl.min_amount || 0), value:String(pl.min_amount || 0)});
    const subscribeBtn = h('button',{class:'btn primary'}, vpTr('Subscribe now','اشترك الآن','Подписаться'));
    const feat = featuresList(pl.features);
    const shortDesc = clampText(pl.desc || vpTr('Premium income contract','عقد دخل مميز','Премиальный доходный контракт'), 58);
    const shortHeadline = clampText(pl.headline || pl.details || '', 52);
    const durationChip = pl.is_perpetual ? vpTr('Perpetual','دائم','Бессрочный') : `${vpTr('Duration','المدة','Срок')}: ${Number(pl.term_days || 0)}d`;
    subscribeBtn.onclick = async()=>{
      const val = Number(amount.value || 0);
      if(typeof requireRealWorkflowAccess === 'function' && !requireRealWorkflowAccess('contract')) return;
      try{
        const r = await api('/invest/subscribe.php', {method:'POST', headers:{'Idempotency-Key': makeIdemKey()}, body:{plan_id: pl.id, amount: val}});
        await Promise.allSettled([refreshPortfolio(true), refreshRealPortfolio(true), refreshPnlStats(), refreshRealPnlStats()]);
        toast(`✅ ${pl.product_kind === 'contract' ? vpTr('Contract subscribed','تم الاشتراك في العقد','Контракт подключен') : safeT('invest.subscribed','Subscribed')} (#${r.investment_id})`);
        await load(false);
      }catch(err){ toast(`❌ ${err.message || 'Subscription failed'}`); }
    };
    if(!pl.eligible){
      subscribeBtn.disabled = true;
      subscribeBtn.classList.add('disabled');
    }
    return h('div',{class:'card mb-invest-card mb-invest-contract-card compact premium-short'},
      h('div',{class:'mb-invest-card-head compact premium'},
        h('div',{},
          h('div',{class:'mb-invest-card-title'}, String(pl.name || 'Contract')),
          h('div',{class:'mb-invest-card-sub'}, shortDesc)
        ),
        h('div',{class:'mb-contract-top-tags'},
          pl.badge ? h('span',{class:'pill'}, String(pl.badge)) : null,
          levelPill(pl.required_level)
        )
      ),
      shortHeadline ? h('div',{class:'mb-contract-headline compact'}, shortHeadline) : null,
      h('div',{class:'mb-contract-yield-row'},
        h('div',{},
          h('div',{class:'mb-invest-apy'}, `${fmt(Number(pl.roi_percent || 0), 2)}%`),
          h('div',{class:'mb-invest-apy-sub'}, pl.product_kind === 'contract' ? vpTr('Return per payout cycle','العائد لكل دورة دفع','Доход за цикл выплаты') : vpTr('Target return','العائد المستهدف','Целевая доходность'))
        ),
        h('div',{class:'mb-contract-yield-side'},
          h('span',{class:'badge ' + riskTone(pl.risk)}, String(pl.risk || 'medium').toUpperCase()),
          h('span',{class:'pill ghost'}, durationChip),
          h('span',{class:'pill ghost'}, scheduleLabel(pl.payout_schedule))
        )
      ),
      h('div',{class:'mb-invest-meta-grid compact short premium cols4 contract-tight'},
        miniMetric(vpTr('Min','الحد الأدنى','Мин.'), money(pl.min_amount || 0,0), vpTr('Minimum ticket','أقل اشتراك','Минимальный вход')),
        miniMetric(vpTr('Max','الحد الأقصى','Макс.'), cap, vpTr('Maximum size','أقصى حجم','Максимальный размер')),
        miniMetric(vpTr('Wallet','المحفظة','Кошелёк'), money(state.realPortfolio?.wallet?.USDT?.balance || 0,2), vpTr('Real USDT available','USDT الحقيقي المتاح','Доступный real USDT')),
        miniMetric(vpTr('My level','مستواي','Мой уровень'), userLevel?.name || vpTr('Starter','مبتدئ','Старт'), vpTr('Access tier','درجة الوصول','Уровень доступа'))
      ),
      feat,
      pl.details ? h('div',{class:'mb-invest-details compact short premium refined'}, clampText(pl.details, 92)) : null,
      !pl.eligible && pl.required_level ? h('div',{class:'mb-contract-gate'}, `${vpTr('Requires','يتطلب','Требуется')}: ${String(pl.required_level.name || '—')} • ${vpTr('Confirmed deposits','الإيداعات المؤكدة','Подтвержденные депозиты')} ${money(pl.required_level.min_deposit_total || 0, 0)}`) : null,
      h('div',{class:'mb-invest-action-row compact contract-tight'}, amount, subscribeBtn)
    );
  }

  async function load(force=false){
    signalGrid.innerHTML = '';
    contractGrid.innerHTML = '';
    clearSignalLive();
    resetLevelCards();
    signalGrid.appendChild(h('div',{class:'card mb-empty-box large'}, h('div',{class:'mb-empty-title'}, vpTr('Loading signal desk…','جاري تحميل منصة الإشارات…','Загрузка сигнального стола…'))));
    contractGrid.appendChild(h('div',{class:'card mb-empty-box large'}, h('div',{class:'mb-empty-title'}, vpTr('Loading contracts…','جاري تحميل العقود…','Загрузка контрактов…'))));
    if(copiedPillEl) copiedPillEl.textContent = vpTr('Loading…','جاري التحميل…','Загрузка…');

    const [signalsR, subsR, contractsR, mineR, levelR] = await Promise.all([
      settledApi(`/signals.php?bot=1&lang=${encodeURIComponent(state.lang)}`),
      settledApi(`/trading_bot/my.php?lang=${encodeURIComponent(state.lang)}`),
      settledApi(`/invest/contracts.php?lang=${encodeURIComponent(state.lang)}`),
      settledApi(`/invest/my.php?lang=${encodeURIComponent(state.lang)}`),
      settledApi(`/user/level.php?lang=${encodeURIComponent(state.lang)}`)
    ]);

    let signalItems = Array.isArray(signalsR.data?.items) ? signalsR.data.items : [];
    try{
      if(typeof window.enrichSignalsLiveQuotes === 'function') signalItems = await window.enrichSignalsLiveQuotes(signalItems, { timeoutMs: 5500 });
    }catch(e){}
    const subItems = Array.isArray(subsR.data?.items) ? subsR.data.items : [];
    const contractItems = Array.isArray(contractsR.data?.items) ? contractsR.data.items : [];
    const mineItems = Array.isArray(mineR.data?.items) ? mineR.data.items : [];
    const levelPayload = levelR.ok ? (levelR.data || {}) : (contractsR.ok ? (contractsR.data || {}) : {});
    const userTotal = Number(levelPayload?.confirmed_deposit_total || contractsR.data?.confirmed_deposit_total || 0) || 0;
    const gatedContracts = contractItems.filter(item=>item && item.required_level && Number(item.required_level.min_deposit_total || 0) > 0);
    contractsGateMeta = gatedContracts.length ? gatedContracts.reduce((best, item)=>{ const cur = Number(item.required_level.min_deposit_total || 0) || 0; if(!best) return item.required_level; return cur < Number(best.min_deposit_total || 0) ? item.required_level : best; }, null) : null;
    contractsTabLocked = !!(contractsGateMeta && userTotal + 1e-9 < Number(contractsGateMeta.min_deposit_total || 0));
    const contractsTabBtn = tabBar.querySelector('[data-tab="contracts"]');
    if(contractsTabBtn){
      contractsTabBtn.classList.toggle('is-locked', contractsTabLocked);
      contractsTabBtn.setAttribute('data-lock-label', contractsTabLocked ? String(contractsGateMeta?.name || '') : '');
      contractsTabBtn.textContent = contractsTabLocked ? `${vpTr('Contracts','العقود','Контракты')} 🔒` : vpTr('Contracts','العقود','Контракты');
    }
    if(contractsTabLocked && activeInvestTab === 'contracts'){
      activeInvestTab = 'signals';
      state.__vpInvestTab = 'signals';
      page.querySelectorAll('.mb-invest-pane').forEach(pane=>pane.classList.toggle('is-active', pane.getAttribute('data-pane')==='signals'));
      tabBar.querySelectorAll('.mb-invest-tab').forEach(btn=>btn.classList.toggle('is-active', btn.getAttribute('data-tab')==='signals'));
      syncInvestHash('signals');
    }

    const activeCopies = subItems.filter(x=>['armed','active','copied'].includes(String(x.status || '').toLowerCase())).length;
    metricSet(0, String(signalItems.length), vpTr('Admin copy opportunities','صفقات الأدمن الجاهزة','Сигналы администратора'));
    metricSet(1, String(contractItems.length), vpTr('Premium contracts available','العقود المتاحة الآن','Доступные контракты'));
    metricSet(2, String(activeCopies), vpTr('Real copied signals on your account','الصفقات المنسوخة على حسابك','Активные копии на вашем счёте'));
    metricSet(3, money(Number(state.realPortfolio?.wallet?.USDT?.balance || 0),2), vpTr('Primary funding balance','الرصيد الرئيسي المتاح','Основной доступный баланс'));
    if(copiedPillEl) copiedPillEl.textContent = `${vpTr('Copied now','المنسوخ الآن','Скопировано сейчас')}: ${activeCopies}`;

    renderLevelCards(levelR.ok ? levelR.data : null, contractsR.ok ? contractsR.data : null);
    renderSignalDesk(signalItems, subItems, signalsR.ok ? null : signalsR.error);

    contractGrid.innerHTML = '';
    if(!contractsR.ok){
      contractGrid.appendChild(sectionError(vpTr('Contracts are temporarily unavailable','العقود غير متاحة مؤقتًا','Контракты временно недоступны'), safeMsg(contractsR.error, vpTr('Please refresh the page in a moment','حدّث الصفحة بعد لحظات','Обновите страницу через несколько секунд'))));
    } else if(contractsTabLocked && contractsGateMeta){
      contractGrid.appendChild(h('div',{class:'card mb-empty-box large is-lock-box'},
        h('div',{class:'mb-empty-title'}, `${vpTr('Contracts are locked','العقود مقفلة','Контракты заблокированы')} 🔒`),
        h('div',{class:'muted small'}, `${vpTr('Reach','صل إلى','Достигните')} ${String(contractsGateMeta.name || '—')} • ${vpTr('Confirmed deposits','الإيداعات المؤكدة','Подтвержденные депозиты')} ${money(contractsGateMeta.min_deposit_total || 0, 0)}`)
      ));
    } else if(contractItems.length){
      const currentLevel = levelR.ok ? (levelR.data?.current || null) : (contractsR.data?.user_level || null);
      contractItems.forEach(pl=>contractGrid.appendChild(contractCard(pl, currentLevel)));
    } else {
      contractGrid.appendChild(h('div',{class:'card mb-empty-box large'}, h('div',{class:'mb-empty-title'}, vpTr('No contracts are published yet','لا توجد عقود منشورة حتى الآن','Контракты пока не опубликованы'))));
    }
  }

  if(investDemoLocked){
    try{
      const gateKey = `${String(location.hash || '#/invest')}::demo`;
      if(state.__vpInvestDemoGateShownFor !== gateKey){
        state.__vpInvestDemoGateShownFor = gateKey;
        setTimeout(()=>{
          try{
            if(String(location.hash || '').startsWith('#/invest') && String(state.tradeMode || 'demo').toLowerCase() !== 'real' && typeof openInvestRealOnlyDialog === 'function'){
              openInvestRealOnlyDialog();
            }
          }catch(e){}
        }, 60);
      }
    }catch(e){}
    return page;
  }
  try{ state.__vpInvestDemoGateShownFor = null; }catch(e){}
  Promise.resolve().then(()=>load(false));
  return page;
};



const __vpBaseNewsPage = newsPage;
newsPage = function(){
  if (!state.newsFeed) refreshNewsFeed().then(()=>render()).catch(()=>{});
  const items = Array.isArray(state.newsFeed) ? state.newsFeed.slice() : [];
  if (state.newsConfig && state.newsConfig.enabled === false){
    return h('div',{class:'mb-page mb-news-v25'},
      topBar(),
      h('div',{class:'card mb-news-empty-shell'},
        h('div',{class:'mb-news-empty-title'}, vpTr('News center disabled','مركز الأخبار متوقف','Центр новостей отключён')),
        h('div',{class:'mb-news-empty-sub'}, vpTr('The administrator has temporarily hidden the client news center.','قام الأدمن بإخفاء مركز الأخبار مؤقتًا.','Администратор временно скрыл центр новостей для клиентов.')),
        h('div',{class:'row wrap mt-2'},
          h('button',{class:'btn outline', onclick:()=>location.hash='#/home'}, vpTr('Back home','العودة للرئيسية','На главную')),
          h('button',{class:'btn primary', onclick:()=>location.hash='#/support'}, vpTr('Open support','فتح الدعم','Открыть поддержку'))
        )
      ),
      bottomNav()
    );
  }
  const unread = typeof newsUnreadCount === 'function' ? newsUnreadCount() : 0;
  const newsQuery = typeof hashQueryParams === 'function' ? hashQueryParams() : new URLSearchParams(String(location.hash || '').split('?')[1] || '');
  const activeId = Number(newsQuery.get('id') || 0) || 0;
  const allowedViews = ['all','pinned','unread'];
  let viewMode = String(newsQuery.get('view') || state.__vpNewsView || 'all').toLowerCase();
  if(!allowedViews.includes(viewMode)) viewMode = 'all';
  state.__vpNewsView = viewMode;
  const sorted = items.slice().sort((a,b)=>vpEpoch(b?.published_at || b?.updated_at || b?.created_at || 0) - vpEpoch(a?.published_at || a?.updated_at || a?.created_at || 0));
  const pinned = sorted.filter(it=>Number(it?.pinned||0) === 1);
  const seenAt = Number(localStorage.getItem('tp_news_seen_at') || 0) || 0;
  const isUnreadItem = (it)=>vpEpoch(it?.published_at || it?.updated_at || it?.created_at || 0) > seenAt;
  const filtered = sorted.filter(it=> viewMode === 'all' ? true : (viewMode === 'pinned' ? Number(it?.pinned||0) === 1 : isUnreadItem(it)));
  const activeItem = activeId ? (sorted.find(it=>Number(it?.id||0) === activeId) || null) : null;
  const featured = activeItem || filtered[0] || pinned[0] || sorted[0] || null;

  const syncNewsHash = (nextView, nextId)=>{
    const params = new URLSearchParams();
    if(String(nextView || 'all') !== 'all') params.set('view', String(nextView));
    if(Number(nextId || 0) > 0) params.set('id', String(Number(nextId)));
    replaceHashQuery('#/news', params);
  };
  const openItem = (it)=>{
    if(!it) return;
    try{ markNewsSeen(); }catch(e){}
    syncNewsHash(viewMode, Number(it?.id || 0));
    try{ render(); }catch(e){}
  };
  const switchView = (nextView)=>{
    viewMode = allowedViews.includes(String(nextView || '').toLowerCase()) ? String(nextView).toLowerCase() : 'all';
    state.__vpNewsView = viewMode;
    const keepId = activeItem && filtered.some(it=>Number(it?.id||0) === Number(activeItem?.id||0)) ? Number(activeItem?.id||0) : 0;
    syncNewsHash(viewMode, keepId);
    render();
  };
  const statCard = (label, value, sub, tone='')=>h('div',{class:'mb-news-stat ' + tone},
    h('span',{class:'k'}, label),
    h('strong',{}, value),
    h('small',{}, sub || '')
  );
  const filterBtn = (key, label, count)=>h('button',{class:'btn ' + (viewMode === key ? 'primary' : 'outline'), type:'button', onclick:()=>switchView(key)}, `${label}${typeof count === 'number' ? ` (${count})` : ''}`);
  const hero = h('div',{class:'card mb-news-hero'},
    h('div',{class:'mb-news-hero-copy'},
      h('div',{class:'mb-news-kicker'}, vpTr('Platform updates','تحديثات المنصة','Обновления платформы')),
      h('div',{class:'mb-news-title'}, vpTr('Newsroom and client announcements','غرفة الأخبار وإعلانات العملاء','Новости и объявления для клиентов')),
      h('div',{class:'mb-news-sub'}, vpTr('Follow platform changes, maintenance windows, and pinned operational notes from one polished feed.','تابع تغييرات المنصة ومواعيد الصيانة والملاحظات التشغيلية المثبتة من موجز واحد منظم.','Следите за изменениями платформы, окнами обслуживания и закреплёнными операционными заметками в одной ленте.')),
      h('div',{class:'mb-news-hero-actions'},
        h('button',{class:'btn primary', onclick:async()=>{ await refreshNewsFeed(true); render(); }}, vpTr('Refresh feed','تحديث الموجز','Обновить ленту')),
        h('button',{class:'btn outline', onclick:()=>location.hash='#/notifications'}, vpTr('Notifications','التنبيهات','Уведомления')),
        h('button',{class:'btn outline', onclick:()=>location.hash='#/support'}, vpTr('Support','الدعم','Поддержка'))
      )
    ),
    h('div',{class:'mb-news-hero-stats'},
      statCard(vpTr('Unread','غير المقروء','Непрочитано'), String(unread), vpTr('New client-facing updates','تحديثات جديدة للعملاء','Новые клиентские обновления'), unread > 0 ? 'tone-accent' : ''),
      statCard(vpTr('Pinned','المثبت','Закреплено'), String(pinned.length), vpTr('Priority notes from operations','ملاحظات أولوية من الإدارة','Приоритетные заметки от операций')),
      statCard(vpTr('Articles','الأخبار','Материалы'), viewMode === 'all' ? String(sorted.length) : `${filtered.length}/${sorted.length}`, viewMode === 'all' ? vpTr('Published feed items','عناصر منشورة في الموجز','Опубликованные элементы') : vpTr('Filtered feed items','العناصر بعد التصفية','Отфильтрованные элементы')),
      statCard(vpTr('Latest','الأحدث','Последнее'), featured ? vpFmtDate(featured.published_at || featured.updated_at || featured.created_at) : '—', vpTr('Most recent published item','آخر عنصر منشور','Последний опубликованный материал'))
    )
  );
  const filters = h('div',{class:'card'},
    h('div',{class:'split', style:'align-items:center; gap:12px'},
      h('div',{},
        h('div',{class:'mb-card-title'}, vpTr('Feed view','عرض الموجز','Вид ленты')),
        h('div',{class:'mb-side-row-sub'}, vpTr('Switch between all updates, pinned notices, or unread announcements without losing your place.','بدّل بين جميع التحديثات أو العناصر المثبتة أو غير المقروءة بدون فقدان موضعك الحالي.','Переключайтесь между всеми обновлениями, закреплёнными заметками и непрочитанными объявлениями без потери текущего контекста.'))
      ),
      h('div',{class:'row wrap', style:'gap:10px'},
        filterBtn('all', vpTr('All','الكل','Все'), sorted.length),
        filterBtn('pinned', vpTr('Pinned','المثبت','Закреплённые'), pinned.length),
        filterBtn('unread', vpTr('Unread','غير المقروء','Непрочитанные'), sorted.filter(it=>isUnreadItem(it)).length)
      )
    )
  );

  const featuredCard = featured ? h('div',{class:'card mb-news-featured ' + (Number(featured?.pinned||0)===1 ? 'is-pinned' : '')},
    featured?.image_url ? h('div',{class:'mb-news-featured-media'}, h('img',{src:String(featured.image_url), alt:String(featured.title || 'News'), loading:'lazy', referrerpolicy:'no-referrer'})) : h('div',{class:'mb-news-featured-media mb-news-featured-placeholder'}, '✦'),
    h('div',{class:'mb-news-featured-copy'},
      h('div',{class:'mb-news-featured-top'},
        h('div',{class:'mb-news-featured-meta'},
          h('span',{class:'pill ghost'}, String(featured.source_label || vpTr('Platform','المنصة','Платформа'))),
          Number(featured?.pinned||0)===1 ? h('span',{class:'pill ok'}, vpTr('Pinned','مثبت','Закреплено')) : h('span',{class:'pill'}, vpTr('Update','تحديث','Обновление')),
          isUnreadItem(featured) ? h('span',{class:'pill warn'}, vpTr('New','جديد','Новое')) : h('span',{class:'pill'}, vpTr('Seen','تمت القراءة','Просмотрено'))
        ),
        h('span',{class:'mb-news-featured-date'}, vpFmtDate(featured.published_at || featured.updated_at || featured.created_at))
      ),
      h('div',{class:'mb-news-featured-title'}, String(featured.title || vpTr('Latest update','آخر تحديث','Последнее обновление'))),
      h('div',{class:'mb-news-featured-body'}, notificationPreviewBody(String(featured.excerpt || featured.body || ''), 420)),
      h('div',{class:'mb-news-featured-actions'},
        h('button',{class:'btn primary', onclick:()=>openItem(featured)}, vpTr('Open article','فتح الخبر','Открыть материал')),
        featured?.cta_url ? h('button',{class:'btn outline', onclick:()=>{ location.hash = String(featured.cta_url); }}, vpTr('Open related page','فتح الصفحة المرتبطة','Открыть связанную страницу')) : h('button',{class:'btn outline', onclick:()=>location.hash='#/home'}, vpTr('Back home','العودة للرئيسية','На главную'))
      )
    )
  ) : h('div',{class:'card mb-news-empty-shell'},
    h('div',{class:'mb-news-empty-title'}, viewMode === 'unread' ? vpTr('No unread announcements','لا توجد أخبار غير مقروءة','Нет непрочитанных объявлений') : vpTr('No published announcements yet','لا توجد أخبار منشورة حتى الآن','Пока нет опубликованных объявлений')),
    h('div',{class:'mb-news-empty-sub'}, viewMode === 'unread'
      ? vpTr('Once the admin publishes a new client update, it will appear here as unread until you open it.','عند نشر تحديث جديد للعملاء سيظهر هنا كغير مقروء حتى تفتحه.','Как только администратор опубликует новое обновление для клиентов, оно появится здесь как непрочитанное, пока вы его не откроете.')
      : vpTr('Once the admin publishes client announcements, they will appear here with pinned priority and direct links.','بمجرد نشر الإدارة أخبار العملاء ستظهر هنا مع أولوية المثبت والروابط المباشرة.','Как только администратор опубликует объявления для клиентов, они появятся здесь с приоритетом закреплённых и прямыми ссылками.'))
  );

  const sideRail = h('div',{class:'mb-news-rail'},
    h('div',{class:'card mb-news-rail-card'},
      h('div',{class:'mb-card-title'}, vpTr('Quick access','وصول سريع','Быстрый доступ')),
      h('div',{class:'mb-news-rail-actions'},
        h('button',{class:'btn primary', onclick:()=>location.hash='#/notifications'}, vpTr('Notifications','التنبيهات','Уведомления')),
        h('button',{class:'btn outline', onclick:()=>location.hash='#/support'}, vpTr('Support','الدعم','Поддержка')),
        h('button',{class:'btn outline', onclick:()=>location.hash='#/account'}, vpTr('Account','الحساب','Аккаунт'))
      )
    ),
    h('div',{class:'card mb-news-rail-card'},
      h('div',{class:'mb-card-title'}, vpTr('Latest headlines','آخر العناوين','Последние заголовки')),
      h('div',{class:'mb-news-rail-list'}, ...((filtered.length ? filtered : sorted).slice(0,4).map(it=>h('button',{class:'mb-news-rail-item ' + (Number(it?.id||0) === Number(featured?.id||0) ? 'active' : ''), onclick:()=>openItem(it)},
        h('strong',{}, String(it?.title || 'Update')),
        h('small',{}, `${vpFmtDate(it?.published_at || it?.updated_at || it?.created_at)} • ${Number(it?.pinned||0)===1 ? vpTr('Pinned','مثبت','Закреплено') : (isUnreadItem(it) ? vpTr('New','جديد','Новое') : vpTr('Seen','تمت القراءة','Просмотрено'))}`)
      ))) || [h('div',{class:'muted small'}, '—')])
    )
  );

  const newsListItems = filtered.length
    ? filtered.map(it=>h('button',{class:'card mb-news-list-card' + (Number(it?.id||0)===activeId ? ' active' : ''), type:'button', onclick:()=>openItem(it)},
        it?.image_url ? h('div',{class:'mb-news-list-media'}, h('img',{src:String(it.image_url), alt:String(it.title || 'News'), loading:'lazy', referrerpolicy:'no-referrer'})) : h('div',{class:'mb-news-list-media mb-news-list-media--placeholder'}, '✦'),
        h('div',{class:'mb-news-list-copy'},
          h('div',{class:'mb-news-list-top'},
            h('div',{class:'mb-news-list-title'}, String(it.title || vpTr('Update','تحديث','Обновление'))),
            h('div',{class:'mb-news-list-badges'},
              Number(it?.pinned||0)===1 ? h('span',{class:'pill ok'}, vpTr('Pinned','مثبت','Закреплено')) : null,
              isUnreadItem(it) ? h('span',{class:'pill warn'}, vpTr('New','جديد','Новое')) : h('span',{class:'pill ghost'}, vpTr('Seen','تمت القراءة','Просмотрено'))
            )
          ),
          h('div',{class:'mb-news-list-meta'}, [String(it.source_label || vpTr('Platform updates','تحديثات المنصة','Обновления платформы')), vpFmtDate(it.published_at || it.updated_at || it.created_at)].filter(Boolean).join(' • ')),
          h('div',{class:'mb-news-list-body'}, notificationPreviewBody(String(it.excerpt || it.body || ''), 220))
        )
      ))
    : [h('div',{class:'card mb-news-empty-shell'}, h('div',{class:'mb-news-empty-title'}, vpTr('No announcements match this view','لا توجد أخبار مطابقة لهذا العرض','Нет объявлений для этого вида')), h('div',{class:'mb-news-empty-sub'}, vpTr('Try switching back to all updates or refresh the feed to load the latest announcements.','جرّب العودة إلى جميع التحديثات أو قم بتحديث الموجز لتحميل أحدث الإعلانات.','Попробуйте переключиться на все обновления или обновить ленту, чтобы загрузить последние объявления.')))] ;
  const list = h('div',{class:'mb-news-list'}, ...newsListItems);

  const page = h('div',{class:'mb-page mb-news-v25'},
    topBar(),
    hero,
    filters,
    typeof newsTickerStrip === 'function' ? newsTickerStrip(8) : null,
    h('div',{class:'mb-news-layout'},
      h('div',{class:'mb-news-main'}, featuredCard, list),
      sideRail
    ),
    bottomNav()
  );
  let newsRefreshBusy = false;
  const newsTick = ()=>{
    if(newsRefreshBusy) return;
    if(String(location.hash || '').indexOf('#/news') !== 0 || document.hidden) return;
    newsRefreshBusy = true;
    refreshNewsFeed(true).then(()=>{ try{ render(); }catch(e){} }).catch(()=>{}).finally(()=>{ newsRefreshBusy = false; });
  };
  const newsTimer = setInterval(newsTick, 30000);
  try{ onCleanup(()=>{ try{ clearInterval(newsTimer); }catch(e){} }); }catch(e){}
  if (items.length) markNewsSeen();
  return page;
};

setTimeout(()=>{ try{ render(); }catch(e){} }, 0);


  /* ===== v22 internal pages refinement ===== */
  function vpMarketTypeLabel(type){
    const t = String(type || '').toLowerCase();
    if(t === 'crypto') return 'Crypto';
    if(t === 'futures') return vpLang4('Perpetual','العقود الدائمة','Бессрочные','Perpetual');
    if(t === 'forex') return 'Forex';
    if(t === 'stocks') return 'Stocks';
    if(t === 'arab') return vpLang4('Arab Stocks','الأسهم العربية','Арабские акции','Arab Stocks');
    if(t === 'commodities' || t === 'metals') return 'Commodities';
    return 'Markets';
  }

  function vpMarketSort(src, mode){
    const arr = Array.isArray(src) ? src.slice() : [];
    arr.sort((a,b)=>{
      const ac = Number(a?.change_pct || 0), bc = Number(b?.change_pct || 0);
      const ap = Number(a?.price || 0), bp = Number(b?.price || 0);
      const av = vpMarketSizeValue(a), bv = vpMarketSizeValue(b);
      const ar = vpMarketRankValue(a), br = vpMarketRankValue(b);
      const as = String(a?.symbol || ''), bs = String(b?.symbol || '');
      if(mode === 'rank_desc') return ar - br || bv - av || bc - ac || as.localeCompare(bs);
      if(mode === 'volume_desc') return bv - av || ar - br || bc - ac || as.localeCompare(bs);
      if(mode === 'change_asc') return ac - bc || ar - br || as.localeCompare(bs);
      if(mode === 'symbol') return as.localeCompare(bs);
      if(mode === 'price_desc') return bp - ap || ar - br || as.localeCompare(bs);
      return bc - ac || ar - br || bv - av || as.localeCompare(bs);
    });
    return arr;
  }


  function vpSyncTradeDesktopPanels(root){
    if(!root || typeof api !== 'function') return;
    let busy = false;
    const collectRows = ()=>Array.from(root.querySelectorAll('.trade-watch-row[data-live-symbol]'));
    const applyItems = (items)=>{
      if(!Array.isArray(items)) return;
      items.forEach(item=>{
        const sym = String(item?.symbol || '').toUpperCase();
        if(!sym) return;
        const rawType = String(item?.type || state.selectedAssetType || 'crypto').toLowerCase();
        const rawMarket = String(item?.market || ((rawType === 'crypto' || rawType === 'futures') ? 'perp' : 'spot')).toLowerCase();
        try{ if(typeof vpRememberLiveQuote === 'function') vpRememberLiveQuote(Object.assign({}, item, { symbol:sym, type:rawType, market:rawMarket })); }catch(err){}
        try{ if(typeof VPQuoteStore !== 'undefined' && VPQuoteStore && typeof VPQuoteStore.ingest === 'function') VPQuoteStore.ingest(Object.assign({}, item, { symbol:sym, type:rawType, market:rawMarket }), { source:'trade_watchlist_live_tick' }); }catch(err){}
        let resolvedPx = 0;
        let resolvedCh = Number(item?.change_pct ?? item?.changePct ?? 0) || 0;
        let resolvedTs = Number(item?.updated_at || item?.ts || 0) || 0;
        let resolvedSource = String(item?.source || item?.provider || '').toLowerCase();
        root.querySelectorAll(`.trade-watch-row[data-live-symbol="${sym}"]`).forEach(row=>{
          const priceEl = row.querySelector('[data-live-price]');
          const changeEl = row.querySelector('[data-live-change]');
          const pillEl = row.querySelector('[data-live-pill]');
          const rowType = String(row.getAttribute('data-live-type') || rawType).toLowerCase();
          const rowMarket = String(row.getAttribute('data-live-market') || rawMarket).toLowerCase();
          const resolved = vpResolveAuthorityLive(item, rowType, rowMarket) || Object.assign({}, item, { symbol:sym, type:rowType, market:rowMarket });
          const px = Number((typeof resolveQuoteLivePrice === 'function'
            ? resolveQuoteLivePrice(resolved, rowMarket, rowType)
            : Number(resolved?.price || resolved?.last || 0)) || 0);
          if(px > 0) resolvedPx = px;
          resolvedCh = Number(resolved?.change_pct ?? resolved?.changePct ?? resolvedCh) || 0;
          resolvedTs = Number(resolved?.updated_at || resolvedTs) || 0;
          resolvedSource = String(resolved?.source || resolved?.provider || resolvedSource || '').toLowerCase();
          if(priceEl && px > 0) priceEl.textContent = money(px, px < 1 ? 4 : 2);
          if(changeEl){
            changeEl.textContent = percentText(resolvedCh);
            changeEl.classList.toggle('up', resolvedCh >= 0);
            changeEl.classList.toggle('down', resolvedCh < 0);
          }
          if(pillEl){
            pillEl.textContent = vpTr('Live','حي','Лайв');
            pillEl.classList.add('is-on');
          }
        });
        try{
          if(Array.isArray(state.markets)){
            state.markets = state.markets.map(m=>String(m?.symbol||'').toUpperCase() === sym ? Object.assign({}, m, {price: resolvedPx > 0 ? resolvedPx : Number(m?.price || 0), change_pct: Number.isFinite(resolvedCh) ? resolvedCh : Number(m?.change_pct || 0), updated_at: resolvedTs || Number(m?.updated_at || 0), source: resolvedSource || String(m?.source || '')}) : m);
          }
        }catch(err){}
      });
    };
    const watchlistVisible = ()=>{
      try{
        const host = root.querySelector('.trade-watchlist');
        if(!host) return false;
        const rect = host.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }catch(e){
        return true;
      }
    };
    const tick = async()=>{
      if(busy || !root.isConnected || String(location.hash || '').indexOf('#/trade') !== 0 || !watchlistVisible()) return;
      try{ if(document && document.hidden) return; }catch(e){}
      busy = true;
      try{
        const host = root.querySelector('.trade-watch-items');
        const hostRect = host && typeof host.getBoundingClientRect === 'function' ? host.getBoundingClientRect() : null;
        const rows = collectRows().filter(row=>{
          if(!hostRect || typeof row.getBoundingClientRect !== 'function') return true;
          try{
            const rect = row.getBoundingClientRect();
            return rect.bottom >= (hostRect.top - 24) && rect.top <= (hostRect.bottom + 24);
          }catch(err){ return true; }
        }).slice(0, 18);
        if(!rows.length) return;
        const groups = new Map();
        rows.forEach(row=>{
          const sym = String(row.getAttribute('data-live-symbol') || '').toUpperCase();
          const type = String(row.getAttribute('data-live-type') || state.selectedAssetType || 'crypto').toLowerCase();
          const market = String(row.getAttribute('data-live-market') || ((type === 'crypto' || type === 'futures') ? 'perp' : 'spot')).toLowerCase();
          if(!sym) return;
          const key = `${type}|${market}`;
          if(!groups.has(key)) groups.set(key, new Set());
          groups.get(key).add(sym);
        });
        for(const [key, set] of groups.entries()){
          const [type, market] = key.split('|');
          const symbols = Array.from(set);
          if(!symbols.length) continue;
          let items = [];
          const shouldQuotes = typeof preferBulkQuotes === 'function' ? preferBulkQuotes(type, market, symbols[0]) : (type !== 'crypto');
          if(shouldQuotes){
            try{
              items = await fetchTradeWatchQuotes(type, symbols, { direct:true, chunkSize:normType(type) === 'forex' ? 10 : (['stocks','arab'].includes(normType(type)) ? 12 : (normType(type) === 'commodities' ? 10 : 8)), timeoutMs:normType(type) === 'forex' ? 7000 : (['stocks','arab'].includes(normType(type)) ? 8500 : (normType(type) === 'commodities' ? 7600 : 7200)) });
            }catch(err){ items = []; }
          }
          const seen = new Set(items.map(it=>String(it?.symbol || '').toUpperCase()));
          const missing = symbols.filter(sym=>!seen.has(sym));
          if(missing.length && type === 'crypto'){
            try{
              const resp = await api(`/trade/stream.php?lite=1&type=${encodeURIComponent(type)}&market=${encodeURIComponent(market)}&symbols=${encodeURIComponent(missing.join(','))}&_=${Date.now()}`, {timeoutMs: 2600});
              const extra = resp?.quotes && typeof resp.quotes === 'object' ? Object.values(resp.quotes) : [];
              items = items.concat(extra || []);
            }catch(err){}
          }
          const stillMissing = symbols.filter(sym=>!items.some(it=>String(it?.symbol || '').toUpperCase() === sym && Number(it?.price || it?.last || it?.mark_price || 0) > 0));
          const directProbe = (type !== 'crypto' && ['arab','futures'].includes(normType(type))) ? symbols.slice(0, 12) : stillMissing.slice(0, 10);
          if(directProbe.length && type !== 'crypto'){
            for(const sym of directProbe){
              try{
                const liveOne = await fetchQuote(sym, type, market || (type === 'futures' ? 'perp' : 'spot'));
                const src = String(liveOne?.source || liveOne?.provider || '').trim();
                const trusted = (typeof window.isTrustedUiLiveSource === 'function') ? window.isTrustedUiLiveSource(src, sym, type) : true;
                if(Number(liveOne?.price || liveOne?.last || liveOne?.mark_price || 0) > 0 && (trusted || !src)) items.push(Object.assign({}, liveOne, {symbol:sym, type, market}));
              }catch(err){}
            }
          }
          applyItems(items);
        }
      }catch(err){}
      finally{ busy = false; }
    };
    tick();
    const timer = setInterval(tick, 3400);
    try{ onCleanup(()=>{ try{ clearInterval(timer); }catch(e){} }); }catch(e){}
  }



  const __vpBaseSupportPage = supportPage;
  supportPage = function(){
    const root = __vpBaseSupportPage();
    try{ root.classList.add('vp-support-pass6'); }catch(e){}
    const activeId = (()=>{ try{ const m = String(location.hash || '').match(/ticket=(\d+)/); return m ? parseInt(m[1],10) : 0; }catch(e){ return 0; }})();
    const drafts = state.__vpSupportDrafts || (state.__vpSupportDrafts = {new:{reason:'general',subject:'',message:''}, replies:{}});

    const composeCard = root.querySelector('.support-compose-card');
    const subjectEl = composeCard ? composeCard.querySelector('input[name="support_subject"]') : null;
    const reasonEl = composeCard ? composeCard.querySelector('select') : null;
    const messageEl = composeCard ? composeCard.querySelector('textarea[name="support_message"]') : null;
    const replyEl = root.querySelector('textarea.reply-compose');
    const applyValue = (el, val, eventName='input')=>{
      if(!el) return;
      const next = String(val == null ? '' : val);
      if(String(el.value || '') === next) return;
      el.value = next;
      try{ el.dispatchEvent(new Event(eventName, {bubbles:true})); }catch(e){}
    };

    if(subjectEl){
      applyValue(subjectEl, drafts.new && drafts.new.subject || '', 'input');
      subjectEl.addEventListener('input', e=>{ drafts.new = Object.assign({reason:'general',subject:'',message:''}, drafts.new || {}, {subject:String(e.target && e.target.value || '')}); }, {passive:true});
    }
    if(messageEl){
      applyValue(messageEl, drafts.new && drafts.new.message || '', 'input');
      messageEl.addEventListener('input', e=>{ drafts.new = Object.assign({reason:'general',subject:'',message:''}, drafts.new || {}, {message:String(e.target && e.target.value || '')}); }, {passive:true});
    }
    if(reasonEl){
      try{ reasonEl.value = String((drafts.new && drafts.new.reason) || 'general'); }catch(e){}
      try{ reasonEl.dispatchEvent(new Event('change', {bubbles:true})); }catch(e){}
      reasonEl.addEventListener('change', e=>{ drafts.new = Object.assign({reason:'general',subject:'',message:''}, drafts.new || {}, {reason:String(e.target && e.target.value || 'general')}); }, {passive:true});
    }
    if(replyEl){
      const replyKey = String(activeId || 'draft');
      applyValue(replyEl, drafts.replies && drafts.replies[replyKey] || '', 'input');
      replyEl.addEventListener('input', e=>{
        drafts.replies = drafts.replies || {};
        drafts.replies[replyKey] = String(e.target && e.target.value || '');
      }, {passive:true});
    }

    const createBtn = composeCard ? composeCard.querySelector('.btn.primary') : null;
    if(createBtn){
      createBtn.addEventListener('click', ()=>{
        setTimeout(()=>{
          if(String(location.hash || '').indexOf('ticket=') > -1){
            drafts.new = {reason:'general',subject:'',message:''};
          }
        }, 250);
      });
    }
    const replyBtn = root.querySelector('.support-detail-card .btn.primary');
    if(replyBtn){
      replyBtn.addEventListener('click', ()=>{
        const replyKey = String(activeId || 'draft');
        setTimeout(()=>{
          const currentReply = root.querySelector('textarea.reply-compose');
          if(!currentReply || String(currentReply.value || '').trim() === ''){
            drafts.replies = drafts.replies || {};
            drafts.replies[replyKey] = '';
          }
        }, 250);
      });
    }

    let supportRefreshBusy = false;
    const supportTick = ()=>{
      if(supportRefreshBusy) return;
      if(String(location.hash || '').indexOf('#/support') !== 0 || document.hidden) return;
      supportRefreshBusy = true;
      Promise.resolve()
        .then(()=>refreshSupportTickets(true))
        .then(()=>{
          const currentId = (()=>{ try{ const m = String(location.hash || '').match(/ticket=(\d+)/); return m ? parseInt(m[1],10) : 0; }catch(e){ return 0; }})();
          return currentId ? loadSupportTicket(currentId) : null;
        })
        .then(()=>{ try{ render(); }catch(e){} })
        .catch(()=>{})
        .finally(()=>{ supportRefreshBusy = false; });
    };
    const supportTimer = setInterval(supportTick, 18000);
    try{ onCleanup(()=>{ try{ clearInterval(supportTimer); }catch(e){} }); }catch(e){}
    return root;
  };

  const __vpBaseTradePage = tradePage;
  tradePage = function(){
    const routeState = vpReadTradeRouteState();
    try{
      state.selectedSymbol = String(routeState.symbol || state.selectedSymbol || 'BTCUSDT').toUpperCase();
      state.selectedAssetType = vpNormalizeTradeType(routeState.type || state.selectedAssetType || 'crypto', 'crypto');
      state.selectedMarketType = state.selectedAssetType;
      state.__vpTradeWatchTab = routeState.watch || state.__vpTradeWatchTab || '';
      state.__vpTradeWatchSearch = String(routeState.search || state.__vpTradeWatchSearch || '');
      state.__vpTradeTicketTab = routeState.ticket || state.__vpTradeTicketTab || 'positions';
      try{ localStorage.setItem('tradeSymbol', state.selectedSymbol); }catch(e){}
      try{ localStorage.setItem('marketType', state.selectedAssetType); }catch(e){}
      try{ localStorage.setItem('tradeMarket', routeState.market); }catch(e){}
      if(routeState.watch) try{ localStorage.setItem('vp_watch_tab', routeState.watch); }catch(e){}
      if(routeState.ticket) try{ localStorage.setItem('vp_trade_ticket_tab', routeState.ticket); }catch(e){}
    }catch(e){}
    const root = __vpBaseTradePage();
    try{ root.classList.add('mb-trade-v22','mb-trade-v27','mb-trade-v24'); }catch(e){}
    try{
      const symbol = String(state.selectedSymbol || 'BTCUSDT').toUpperCase();
      const item = marketBySymbol(symbol) || {symbol};
      const chartTopbarRight = root.querySelector('.trade-chart-topbar-right');
      if(chartTopbarRight && !chartTopbarRight.querySelector('.vp-trade-sync-pill')){
        chartTopbarRight.appendChild(h('div',{class:'vp-trade-sync-pill'},
          h('span',{class:'dot'}, '•'),
          h('span',{}, (['stocks','arab'].includes(String(assetType || '').toLowerCase()) ? vpTr('Synced with delayed platform quote','متزامن مع سعر منصة متأخر','Синхронизирован с задержанной котировкой платформы') : vpTr('Synced with platform quote','متزامن مع سعر المنصة','Синхронизирован с котировкой платформы')))
        ));
      }
      const assetType = String(item.type || state.selectedAssetType || 'crypto').toLowerCase();
      state.selectedAssetType = assetType;
      state.selectedMarketType = assetType;
      try{ localStorage.setItem('marketType', assetType); }catch(e){}
      const marketType = String(localStorage.getItem('tradeMarket') || ((assetType === 'crypto' || assetType === 'futures') ? 'perp' : 'spot')).toUpperCase();
      const price = marketPrice(item);
      const change = Number(item?.change_pct || 0);
      const signals = Number(item?.signal_count || 0);
      const isFav = getFavorites().includes(symbol);
      const head = root.querySelector('.trade-head');
      if(false && head && !root.querySelector('.mb-trade-spotlight')){
        const openTicket = (side)=>{
          try{
            if(typeof tradeOpenOrderSheet === 'function'){
              tradeOpenOrderSheet({
                side,
                symbol,
                assetType,
                marketType: marketType.toLowerCase(),
                lastPrice: price || 0,
                onDone: ()=>{ try{ render(); }catch(e){} }
              });
            }
          }catch(e){}
        };
        const spotlight = h('div',{class:'card mb-trade-spotlight'},
          h('div',{class:'mb-trade-spotlight-copy'},
            h('div',{class:'mb-trade-spotlight-kicker'}, `${vpMarketTypeLabel(assetType)} • ${marketType}`),
            h('div',{class:'mb-trade-spotlight-title'}, symbol),
            h('div',{class:'mb-trade-spotlight-sub'}, instrumentName(item)),
            h('div',{class:'mb-trade-spotlight-meta'},
              h('span',{class:'pill ghost'}, marketAgeText(item)),
              h('span',{class:'pill ghost'}, isFav ? 'Favorite' : 'Watchlist'),
              h('span',{class:'pill ghost'}, 'Primary live quote'),
              signals > 0 ? h('span',{class:'pill'}, `${signals} ${vpTr('signals','إشارات','сигналов')}`) : h('span',{class:'pill ghost'}, vpTr('No active signals','لا توجد إشارات نشطة','Нет активных сигналов'))
            )
          ),
          h('div',{class:'mb-trade-spotlight-pricewrap'},
            h('div',{class:'mb-trade-spotlight-price'}, price ? money(price, price < 1 ? 5 : 4) : '—'),
            h('div',{class:'mb-trade-spotlight-pricehint'}, vpTr('Synced live quote','سعر لحظي متزامن','Синхронизированная цена'))
          ),
          h('div',{class:'mb-trade-spotlight-actions'},
            h('div',{class:'mb-trade-spotlight-change ' + changeClass(change)}, percentText(change)),
            h('button',{class:'btn sell', onclick:()=>openTicket('SELL')}, safeT('trade.sell','Sell')),
            h('button',{class:'btn buy', onclick:()=>openTicket('BUY')}, safeT('trade.buy','Buy')),
            h('button',{class:'btn outline', onclick:()=>{ toggleFavorite(symbol); render(); }}, isFav ? vpTr('Remove favorite','إزالة من المفضلة','Убрать из избранного') : vpTr('Add favorite','إضافة إلى المفضلة','Добавить в избранное')), 
            h('button',{class:'btn outline', onclick:()=>{ const panel = root.querySelector('.trade-signals-panel'); if(panel) panel.scrollIntoView({behavior:'smooth', block:'center'}); }}, signals > 0 ? `${vpTr('Signals','الإشارات','Сигналы')} (${signals})` : vpTr('Signals','الإشارات','Сигналы'))
          )
        );
        head.insertAdjacentElement('afterend', spotlight);
      }
    }catch(e){}
    try{ vpSyncTradeDesktopPanels(root); }catch(e){}
    const syncTradeHash = ()=>{
      try{
        if(!root.isConnected || String(location.hash || '').indexOf('#/trade') !== 0) return;
        const nextSymbol = String(state.selectedSymbol || routeState.symbol || 'BTCUSDT').toUpperCase().trim() || 'BTCUSDT';
        const nextType = vpNormalizeTradeType(state.selectedAssetType || routeState.type || 'crypto', 'crypto');
        const nextMarket = vpNormalizeTradeMarket(nextType, localStorage.getItem('tradeMarket') || routeState.market || (nextType === 'crypto' || nextType === 'futures' ? 'perp' : 'spot'), nextSymbol);
        const params = new URLSearchParams();
        params.set('symbol', nextSymbol);
        params.set('type', nextType);
        params.set('market', nextMarket);
        const watchTab = String(state.__vpTradeWatchTab || localStorage.getItem('vp_watch_tab') || '').toLowerCase().trim();
        if(['favorites','all','crypto','futures','forex','stocks','commodities','metals','arab'].includes(watchTab)) params.set('watch', watchTab);
        const search = String(state.__vpTradeWatchSearch || '').trim();
        if(search) params.set('q', search);
        const ticket = String(state.__vpTradeTicketTab || localStorage.getItem('vp_trade_ticket_tab') || 'positions').toLowerCase().trim();
        if(['positions','orders','history'].includes(ticket) && ticket !== 'positions') params.set('ticket', ticket);
        const nextHash = '#/trade?' + params.toString();
        if(String(location.hash || '') !== nextHash){
          replaceHashQuery('#/trade', params, { silent:true, replace:true });
        }
        try{
          const pending = state.__vpPendingTradeRoute;
          if(pending && String(pending.symbol || '').toUpperCase() === nextSymbol && String(pending.type || '').toLowerCase() === nextType && String(pending.market || '').toLowerCase() === nextMarket){
            state.__vpPendingTradeRoute = null;
          }
        }catch(_e){}
      }catch(e){}
    };
    const syncTradeHashIfDirty = ()=>{
      try{
        const nextSymbol = String(state.selectedSymbol || routeState.symbol || 'BTCUSDT').toUpperCase().trim() || 'BTCUSDT';
        const nextType = vpNormalizeTradeType(state.selectedAssetType || routeState.type || 'crypto', 'crypto');
        const nextMarket = vpNormalizeTradeMarket(nextType, localStorage.getItem('tradeMarket') || routeState.market || (nextType === 'crypto' || nextType === 'futures' ? 'perp' : 'spot'), nextSymbol);
        const watchTab = String(state.__vpTradeWatchTab || localStorage.getItem('vp_watch_tab') || '').toLowerCase().trim();
        const ticket = String(state.__vpTradeTicketTab || localStorage.getItem('vp_trade_ticket_tab') || 'positions').toLowerCase().trim();
        const search = String(state.__vpTradeWatchSearch || '').trim();
        const nextSig = [nextSymbol,nextType,nextMarket,watchTab,search,ticket].join('|');
        if(root.__vpTradeHashSyncSig === nextSig && String(location.hash || '').indexOf('#/trade') === 0) return;
        root.__vpTradeHashSyncSig = nextSig;
        syncTradeHash();
      }catch(e){}
    };
    syncTradeHashIfDirty();
    try{
      const onTradeHashVisible = ()=>{ try{ if(!document.hidden) syncTradeHashIfDirty(); }catch(_e){} };
      if(root.__vpTradeHashSyncTimer) clearInterval(root.__vpTradeHashSyncTimer);
      root.__vpTradeHashSyncTimer = setInterval(syncTradeHashIfDirty, 9600);
      try{ document.addEventListener('visibilitychange', onTradeHashVisible, {passive:true}); }catch(_e){}
      if(typeof onCleanup === 'function') onCleanup(()=>{ try{ clearInterval(root.__vpTradeHashSyncTimer); }catch(_e){} root.__vpTradeHashSyncTimer = null; try{ document.removeEventListener('visibilitychange', onTradeHashVisible); }catch(_e){} });
    }catch(e){}
    return root;
  };

  marketsPage = function(){
    const allowedTypeMap = ['crypto','futures','forex','stocks','arab','commodities'];
    const allowedViewMap = ['all','live','signals','favorites','positive','negative'];
    const allowedSortMap = ['rank_desc','volume_desc','change_desc','change_asc','symbol','price_desc'];
    const marketQuery = hashQueryParams();
    const queryType = String(marketQuery.get('type') || '').toLowerCase();
    const queryView = String(marketQuery.get('view') || '').toLowerCase();
    const querySort = String(marketQuery.get('sort') || '').toLowerCase();
    const querySearch = String(marketQuery.get('q') || '').trim();
    const querySymbol = String(marketQuery.get('symbol') || '').toUpperCase();
    if(allowedTypeMap.includes(queryType)){
      state.selectedAssetType = queryType;
      state.selectedMarketType = queryType;
    }
    if(querySymbol) state.selectedSymbol = querySymbol;
    let type = String(state.selectedAssetType || 'crypto').toLowerCase();
    const needsTypeLoad = !Array.isArray(state.markets) || !state.markets.length || !state.markets.some(x=>String(x.type || '').toLowerCase() === type);
    if(needsTypeLoad && !state.__vpMarketsPriming){
      state.__vpMarketsPriming = true;
      refreshMarkets({type, lite: true, withQuotes: type !== 'crypto', applyToState: true, warm: false}).then(()=>render()).catch(()=>{}).finally(()=>{ state.__vpMarketsPriming = false; });
    }

    let sortMode = allowedSortMap.includes(querySort) ? querySort : (localStorage.getItem('vp_mb_markets_sort') || 'rank_desc');
    let searchTerm = querySearch || String(state.__vpMarketSearch || '');
    let viewMode = allowedViewMap.includes(queryView) ? queryView : (localStorage.getItem('vp_mb_markets_view') || 'all');
    const page = h('div',{class:'mb-page mb-markets-page'}, topBar());
    const hero = h('div',{class:'card mb-markets-hero'});
    const controls = h('div',{class:'card mb-market-control'});
    const board = h('div',{class:'card mb-market-board'});
    const aside = h('div',{class:'mb-market-side'});
    const wrap = h('div',{class:'mb-markets-layout'}, board, aside);
    page.appendChild(hero);
    page.appendChild(controls);
    page.appendChild(wrap);

    function syncMarketsHash(){
      const params = new URLSearchParams();
      params.set('type', type);
      if(viewMode !== 'all') params.set('view', viewMode);
      if(sortMode !== 'rank_desc') params.set('sort', sortMode);
      if(String(searchTerm || '').trim()) params.set('q', String(searchTerm || '').trim());
      if(String(state.selectedSymbol || '').trim()) params.set('symbol', String(state.selectedSymbol || '').toUpperCase());
      replaceHashQuery('#/markets', params);
    }

    function getItems(){
      const rows = Array.isArray(state.markets) ? state.markets.slice() : [];
      return rows.filter(x=>String(x.type || '').toLowerCase() === type);
    }

    function getFiltered(){
      const term = String(searchTerm || '').trim().toUpperCase();
      return vpMarketSort(getItems(), sortMode).filter(item=>{
        const sym = String(item.symbol || '').toUpperCase();
        const nm = String(item.name || '').toUpperCase();
        const ch = Number(item?.change_pct || 0);
        const fav = getFavorites().includes(sym);
        const hasSignals = Number(item?.signal_count || 0) > 0;
        const hasLive = marketHasLiveQuote(item);
        const modePass = viewMode === 'all'
          ? true
          : viewMode === 'live'
            ? hasLive
            : viewMode === 'signals'
              ? hasSignals
              : viewMode === 'favorites'
                ? fav
                : viewMode === 'positive'
                  ? ch > 0
                  : viewMode === 'negative'
                    ? ch < 0
                    : true;
        return modePass && (!term || sym.includes(term) || nm.includes(term));
      });
    }

    function switchType(nextType){
      type = String(nextType || 'crypto').toLowerCase();
      state.selectedAssetType = type;
      state.selectedMarketType = type;
      try{ localStorage.setItem('marketType', type); }catch(e){}
      const currentItems = getItems();
      if(currentItems.length){
        const existing = currentItems.find(x=>String(x.symbol || '').toUpperCase() === String(state.selectedSymbol || '').toUpperCase());
        const pick = existing || currentItems[0];
        if(pick){
          state.selectedSymbol = String(pick.symbol || '').toUpperCase();
          try{ localStorage.setItem('tradeSymbol', state.selectedSymbol); }catch(e){}
        }
      }
      render();
      Promise.resolve().then(async()=>{
        try{
          await refreshMarkets({type, lite:true, withQuotes:type !== 'crypto', applyToState:true, warm:false});
          const loadedItems = getItems();
          if(loadedItems.length){
            const existing = loadedItems.find(x=>String(x.symbol || '').toUpperCase() === String(state.selectedSymbol || '').toUpperCase());
            const pick = existing || loadedItems[0];
            if(pick){
              state.selectedSymbol = String(pick.symbol || '').toUpperCase();
              try{ localStorage.setItem('tradeSymbol', state.selectedSymbol); }catch(e){}
            }
          }
          render();
        }catch(e){}
      });
    }

    function renderHero(filtered){
      const selected = filtered.find(x=>String(x.symbol || '').toUpperCase()===String(state.selectedSymbol || '').toUpperCase()) || filtered[0] || getItems()[0] || null;
      const pos = getItems().filter(x=>Number(x.change_pct || 0) > 0).length;
      const neg = getItems().filter(x=>Number(x.change_pct || 0) < 0).length;
      const signals = getItems().reduce((acc,x)=>acc + Number(x.signal_count || 0), 0);
      hero.innerHTML = '';
      hero.appendChild(h('div',{class:'mb-markets-hero-copy'},
        h('div',{class:'mb-markets-kicker'}, vpTr('MARKET BOARD','لوحة الأسواق','Рыночная панель')),
        h('div',{class:'mb-markets-hero-title'}, safeT('nav.markets','Markets')),
        h('div',{class:'mb-markets-hero-text'}, vpTr('Browse one market family at a time, filter fast, and jump directly into the trading ticket with the selected instrument.','استعرض فئة سوق واحدة في كل مرة، وفلتر بسرعة، وانتقل مباشرة إلى تذكرة التداول للأداة المحددة.','Просматривайте по одному классу рынков, быстро фильтруйте и переходите прямо к торговому тикету выбранного инструмента.')),
        h('div',{class:'mb-markets-hero-actions'},
          h('button',{class:'btn primary', onclick:()=>location.hash='#/trade'}, safeT('nav.trade','Trade')),
          h('button',{class:'btn outline', onclick:()=>refreshMarkets({type, lite:true, withQuotes:type !== 'crypto', applyToState:true, warm:false}).then(()=>render()).catch(()=>{})}, safeT('common.refresh','Refresh')),
          h('button',{class:'btn outline', onclick:()=>{ searchTerm=''; viewMode='all'; sortMode='rank_desc'; state.__vpMarketSearch=''; localStorage.removeItem('vp_mb_markets_view'); localStorage.removeItem('vp_mb_markets_sort'); render(); }}, 'Reset filters')
        )
      ));
      hero.appendChild(h('div',{class:'mb-markets-hero-stats'},
        miniMetric('Showing', String(filtered.length), vpMarketTypeLabel(type)),
        miniMetric('Gainers', String(pos), 'Positive change', pos ? 'up' : ''),
        miniMetric('Losers', String(neg), 'Negative change', neg ? 'down' : ''),
        miniMetric('Signals', String(signals), 'Active trade ideas')
      ));
      hero.appendChild(h('div',{class:'mb-markets-selected'},
        h('div',{class:'mb-markets-selected-head'},
          h('div',{},
            h('div',{class:'mb-markets-selected-k'}, vpTr('Selected instrument','الأداة المحددة','Выбранный инструмент')),
            h('div',{class:'mb-markets-selected-sym'}, selected ? String(selected.symbol || '—') : '—')
          ),
          selected ? h('span',{class:'badge ' + changeClass(selected.change_pct)}, percentText(selected.change_pct)) : null
        ),
        h('div',{class:'mb-markets-selected-price'}, selected ? money(selected.price, Number(selected.price || 0) < 1 ? 4 : 2) : '—'),
        h('div',{class:'mb-markets-selected-sub'}, selected ? (vpInstrumentDisplay(selected).secondary || instrumentName(selected)) : vpTr('Select a symbol to continue.','اختر رمزاً للمتابعة.','Выберите инструмент, чтобы продолжить.')),
        selected ? h('div',{class:'mb-markets-selected-meta'},
          h('span',{class:'pill ghost'}, vpMarketTypeLabel(selected.type)),
          h('span',{class:'pill ' + marketStatusTone(selected)}, marketAgeText(selected)),
          marketSourceText(selected) ? h('span',{class:'pill status-source'}, marketSourceText(selected)) : null,
          Number(selected.signal_count || 0) > 0 ? h('span',{class:'pill'}, `${Number(selected.signal_count || 0)} ${vpTr('signals','إشارات','сигналов')}`) : h('span',{class:'pill ghost'}, vpTr('No active signals','لا توجد إشارات نشطة','Нет активных сигналов'))
        ) : null,
        h('div',{class:'mb-markets-selected-actions'},
          h('button',{class:'btn primary', onclick:()=>selected && setSymbolAndGo(selected)}, vpTr('Open trade','فتح التداول','Открыть сделку')),
          h('button',{class:'btn outline', onclick:(e)=>{ if(!selected) return; toggleFavorite(selected.symbol); render(); }}, getFavorites().includes(String(selected?.symbol || '').toUpperCase()) ? vpTr('Remove favorite','إزالة من المفضلة','Убрать из избранного') : vpTr('Add favorite','إضافة إلى المفضلة','Добавить в избранное'))
        )
      ));
    }

    function renderControls(){
      controls.innerHTML = '';
      const typeBtns = h('div',{class:'mb-market-type-row'},
        ...[
          ['crypto', vpTr('Crypto (Binance)','كريبتو (Binance)','Крипто (Binance)')],
          ['forex', vpTr('Forex (EODHD)','فوركس (EODHD)','Форекс (EODHD)')],
          ['stocks', vpTr('Stocks (EODHD)','أسهم (EODHD)','Акции (EODHD)')],
          ['arab', vpTr('Arab Stocks','الأسهم العربية','Арабские акции')],
          ['commodities', vpTr('Commodities','السلع','Сырьевые товары')],
          ['futures', vpTr('Perpetual','العقود الدائمة','Бессрочные')]
        ].map(([key,label])=>h('button',{class:'mb-market-type-btn ' + (type === key ? 'active' : ''), onclick:()=>switchType(key)}, label))
      );
      const search = h('input',{class:'input mb-market-search', placeholder:vpTr('Search symbol','ابحث عن الرمز','Поиск символа'), value:searchTerm});
      search.addEventListener('input', ()=>{ searchTerm = search.value || ''; state.__vpMarketSearch = searchTerm; render(); });
      const clearBtn = h('button',{class:'btn outline mb-market-clear', onclick:()=>{ searchTerm=''; state.__vpMarketSearch=''; render(); }}, vpTr('Clear','مسح','Очистить'));
      const sortRow = h('div',{class:'mb-market-sort-row'},
        ...[
          ['rank_desc', vpTr('Largest markets','الأكبر قيمة','Крупнейшие рынки')],
          ['volume_desc', vpTr('Highest volume','الأعلى حجماً','Наибольший объём')],
          ['change_desc', vpTr('Top movers','الأكثر حركة','Лидеры движения')],
          ['change_asc', vpTr('Largest drops','الأكثر هبوطاً','Лидеры падения')],
          ['symbol', vpTr('A–Z','أ-ي','A–Z')],
          ['price_desc', vpTr('Highest price','الأعلى سعراً','Наивысшая цена')]
        ].map(([key,label])=>h('button',{class:'mb-market-sort-chip ' + (sortMode === key ? 'active' : ''), onclick:()=>{ sortMode = key; localStorage.setItem('vp_mb_markets_sort', key); render(); }}, label))
      );
      const viewRow = h('div',{class:'mb-market-view-row'},
        ...[
          ['all', vpTr('All','الكل','Все')],
          ['live', vpTr('Live','حي','В реальном времени')],
          ['signals', vpTr('Signals','إشارات','Сигналы')],
          ['favorites', vpTr('Favorites','المفضلة','Избранное')],
          ['positive', vpTr('Positive','إيجابي','Положительное')],
          ['negative', vpTr('Negative','سلبي','Отрицательное')]
        ].map(([key,label])=>h('button',{class:'mb-market-view-chip ' + (viewMode === key ? 'active' : ''), onclick:()=>{ viewMode = key; localStorage.setItem('vp_mb_markets_view', key); render(); }}, label))
      );
      controls.appendChild(h('div',{class:'mb-market-control-copy'},
        h('div',{class:'mb-card-title'}, vpTr('Browse instruments','استعراض الأدوات','Обзор инструментов')),
        h('div',{class:'mb-side-row-sub'}, vpTr('Switch the market type, search by symbol, or reorder the board to focus on movers first.','بدّل نوع السوق أو ابحث بالرمز أو غيّر الترتيب للتركيز على الأكثر حركة أولاً.','Меняйте рынок, ищите по символу или меняйте сортировку, чтобы видеть самые активные инструменты.'))
      ));
      controls.appendChild(typeBtns);
      controls.appendChild(h('div',{class:'mb-market-search-row'}, search, clearBtn));
      controls.appendChild(sortRow);
      controls.appendChild(viewRow);
    }

    function renderBoard(filtered){
      board.innerHTML = '';
      board.appendChild(h('div',{class:'mb-side-head'},
        h('div',{class:'mb-card-title'}, vpTr('Instruments','الأدوات','Инструменты')),
        h('a',{href:'#/trade', class:'mb-side-link'}, vpTr('Trade screen','شاشة التداول','Торговый экран'))
      ));
      if(!filtered.length){
        board.appendChild(h('div',{class:'mb-empty-box large'},
          h('div',{class:'mb-empty-ico'}, '⌁'),
          h('div',{class:'mb-empty-title'}, safeT('common.no_results','No markets found')),
          h('div',{class:'mb-empty-sub'}, vpTr('Try another market type or change the search keyword.','جرّب نوع سوق آخر أو غيّر كلمة البحث.','Попробуйте другой рынок или измените поисковый запрос.'))
        ));
        return;
      }
      const favs = new Set(getFavorites());
      const host = h('div',{class:'mb-market-board-list'});
      filtered.slice(0, 60).forEach(item=>{
        const sym = String(item.symbol || '').toUpperCase();
        const selected = sym === String(state.selectedSymbol || '').toUpperCase();
        const ch = Number(item.change_pct || 0);
        host.appendChild(h('div',{class:'mb-board-row ' + (selected ? 'active' : '')},
          h('button',{class:'mb-board-main', type:'button', onclick:(e)=>{ try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){} setSymbolAndGo(item); }},
            h('div',{class:'mb-board-main-top'},
              h('div',{},
                h('div',{class:'mb-board-sym'}, vpInstrumentDisplay(item).primary || sym),
                h('div',{class:'mb-board-name'}, vpInstrumentDisplay(item).secondary || instrumentName(item))
              ),
              h('div',{class:'mb-board-price-wrap'},
                h('div',{class:'mb-board-price'}, money(item.price, Number(item.price || 0) < 1 ? 4 : 2)),
                h('div',{class:'mb-board-change ' + changeClass(ch)}, percentText(ch))
              )
            ),
            h('div',{class:'mb-board-tags'},
              h('span',{class:'pill'}, vpMarketTypeLabel(item.type)),
              Number(item.signal_count || 0) > 0 ? h('span',{class:'pill'}, `${Number(item.signal_count || 0)} ${vpTr('signals','إشارات','сигналов')}`) : null,
              selected ? h('span',{class:'pill active'}, vpTr('Selected','محدد','Выбрано')) : null,
              h('span',{class:'pill ' + marketStatusTone(item)}, marketAgeText(item)),
              marketSourceText(item) ? h('span',{class:'pill status-source'}, marketSourceText(item)) : null
            )
          ),
          h('div',{class:'mb-board-actions'},
            h('button',{class:'mb-mini-icon-btn ' + (favs.has(sym) ? 'active' : ''), onclick:(e)=>{ e.stopPropagation(); toggleFavorite(sym); render(); }, title:vpTr('Favorite','المفضلة','Избранное')}, favs.has(sym) ? '★' : '☆'),
            h('button',{class:'btn primary btn-xs', type:'button', onclick:(e)=>{ try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){} setSymbolAndGo(item); }}, vpTr('Trade','تداول','Торговля'))
          )
        ));
      });
      board.appendChild(host);
    }

    function renderAside(filtered){
      aside.innerHTML = '';
      const movers = vpMarketSort(curatedMarketRows(type, {limit: 24, allowZeroChange: true}), 'change_desc').slice(0,5);
      const drops = vpMarketSort(curatedMarketRows(type, {limit: 24, allowZeroChange: true}), 'change_asc').slice(0,5);
      const favRows = getItems().filter(x=>getFavorites().includes(String(x.symbol || '').toUpperCase()) && marketHasLiveQuote(x)).slice(0,5);
      const signalRows = getItems().filter(x=>Number(x.signal_count || 0) > 0 && marketHasLiveQuote(x)).sort((a,b)=>Number(b.signal_count||0)-Number(a.signal_count||0) || Math.abs(Number(b.change_pct||0)) - Math.abs(Number(a.change_pct||0))).slice(0,5);
      const section = (title, rows)=>h('div',{class:'card mb-market-side-card'},
        h('div',{class:'mb-side-head'}, h('div',{class:'mb-card-title'}, title), h('span',{class:'pill'}, String(rows.length))),
        rows.length ? h('div',{class:'mb-market-side-list'}, ...rows.map(item=>h('button',{class:'mb-market-side-row', type:'button', onclick:(e)=>{ try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){} setSymbolAndGo(item); }},
          h('div',{},
            h('div',{class:'mb-market-side-sym'}, vpInstrumentDisplay(item).primary || String(item.symbol || '—')),
            h('div',{class:'mb-market-side-name'}, vpInstrumentDisplay(item).secondary || instrumentName(item))
          ),
          h('div',{class:'mb-market-side-right'},
            h('div',{class:'mb-market-side-price'}, money(item.price, Number(item.price || 0) < 1 ? 4 : 2)),
            h('div',{class:'mb-market-side-change ' + changeClass(item.change_pct)}, percentText(item.change_pct)),
            h('div',{class:'mb-market-side-meta'},
              h('span',{class:'pill ' + marketStatusTone(item)}, marketAgeText(item)),
              marketSourceText(item) ? h('span',{class:'pill status-source'}, marketSourceText(item)) : null
            )
          )
        ))) : h('div',{class:'muted small'}, vpTr('No items yet','لا توجد عناصر بعد','Пока нет элементов'))
      );
      aside.appendChild(section(vpTr('Top movers','الأكثر حركة','Лидеры движения'), movers));
      aside.appendChild(section(vpTr('Largest drops','الأكثر هبوطاً','Лидеры падения'), drops));
      aside.appendChild(section(vpTr('Signal opportunities','فرص الإشارات','Сигнальные возможности'), signalRows));
      aside.appendChild(section(vpTr('Favorites','المفضلة','Избранное'), favRows));
    }

    const marketRenderSignature = (rows)=>{
      return (Array.isArray(rows) ? rows : [])
        .slice(0, 60)
        .map(item=>{
          const sym = String(item && item.symbol || '').toUpperCase();
          const price = Number(item && item.price || 0).toFixed(6);
          const chg = Number(item && item.change_pct || 0).toFixed(4);
          const upd = Number(item && item.updated_at || 0);
          const sig = Number(item && item.signal_count || 0);
          return `${sym}:${price}:${chg}:${upd}:${sig}`;
        })
        .join('|');
    };

    let lastMarketRenderSignature = '';
    function render(){
      const filtered = getFiltered();
      lastMarketRenderSignature = marketRenderSignature(filtered);
      if(filtered.length){
        const exists = filtered.some(x=>String(x.symbol || '').toUpperCase() === String(state.selectedSymbol || '').toUpperCase());
        if(!exists){
          state.selectedSymbol = String(filtered[0].symbol || '').toUpperCase();
          try{ localStorage.setItem('tradeSymbol', state.selectedSymbol); }catch(e){}
        }
      }
      renderHero(filtered);
      renderControls();
      renderBoard(filtered);
      renderAside(filtered);
      syncMarketsHash();
    }

    let marketsRefreshBusy = false;
    const refreshLiveBoard = ()=>{
      if(marketsRefreshBusy) return;
      if(String(location.hash || '').indexOf('#/markets') !== 0) return;
      if(document.hidden) return;
      marketsRefreshBusy = true;
      const beforeSignature = lastMarketRenderSignature;
      refreshMarkets({type, lite:true, withQuotes:type !== 'crypto', applyToState:true, warm:false})
        .then(()=>{
          if(String(location.hash || '').indexOf('#/markets') !== 0) return;
          const nextSignature = marketRenderSignature(getFiltered());
          if(nextSignature !== beforeSignature) render();
        })
        .catch(()=>{})
        .finally(()=>{ marketsRefreshBusy = false; });
    };
    const liveTimer = setInterval(refreshLiveBoard, 6500);
    onCleanup(()=>{ try{ clearInterval(liveTimer); }catch(e){} });
    const onVis = ()=>refreshLiveBoard();
    try{ document.addEventListener('visibilitychange', onVis, {passive:true}); }catch(e){}
    onCleanup(()=>{ try{ document.removeEventListener('visibilitychange', onVis, {passive:true}); }catch(e){} });

    render();
    refreshLiveBoard();
    page.appendChild(bottomNav());
    return page;
  };


  /* ===== v23 mobile terminal + dashboard reference pass ===== */
  function vpIsMobile(){ return (window.innerWidth || 0) <= 640; }

  function vpMobileNavLink(href, label){
    const active = vpIsNavActive(href);
    let kind = 'home';
    if(href === '#/portfolio') kind = 'portfolio';
    else if(href === '#/markets') kind = 'markets';
    else if(href === '#/trade') kind = 'trade';
    else if(href === '#/invest') kind = 'invest';
    else if(href === '#/wallet') kind = 'wallet';
    return h('a', {href, class: active ? 'active' : ''}, h('span',{class:'mb-nav-ico'}, vpNavIcon(kind)), h('div',{class:'tiny'}, label));
  }

  const __vpDesktopNav = nav;
  nav = function(){
    if(!vpIsMobile()) return __vpDesktopNav();
    return h('div',{class:'nav mb-nav mb-nav-mobile'},
      h('div',{class:'wrap'},
        vpMobileNavLink('#/home', safeT('nav.home','Home')),
        vpMobileNavLink('#/portfolio', safeT('nav.portfolio','Portfolio')),
        vpMobileNavLink('#/trade', safeT('nav.trade','Trade')),
        vpMobileNavLink('#/invest', safeT('nav.earn', safeT('nav.invest','Earn'))),
        vpMobileNavLink('#/wallet', safeT('nav.assets', safeT('nav.funds','Assets')))
      )
    );
  };

  function pendingFundingCount(){
    const depItems = (state.depositsList && Array.isArray(state.depositsList.items)) ? state.depositsList.items : [];
    const wdrItems = (state.withdrawalsList && Array.isArray(state.withdrawalsList.items)) ? state.withdrawalsList.items : [];
    const isPending = (it)=>{
      const st = String(it?.status || '').toLowerCase();
      return !['approved','completed','confirmed','done','rejected','cancelled','failed'].includes(st);
    };
    return depItems.filter(isPending).length + wdrItems.filter(isPending).length;
  }

  function latestFundingRequest(){
    const depItems = (state.depositsList && Array.isArray(state.depositsList.items)) ? state.depositsList.items.map(it=>Object.assign({kind:'deposit'}, it)) : [];
    const wdrItems = (state.withdrawalsList && Array.isArray(state.withdrawalsList.items)) ? state.withdrawalsList.items.map(it=>Object.assign({kind:'withdraw'}, it)) : [];
    return depItems.concat(wdrItems).sort((a,b)=>vpEpoch(b.updated_at || b.created_at || 0) - vpEpoch(a.updated_at || a.created_at || 0))[0] || null;
  }

  function vpHomeMarketPool(){
    const merged = [];
    const seen = new Set();
    const push = (items)=>{
      if(!Array.isArray(items)) return;
      items.forEach(item=>{
        const sym = String(item?.symbol || '').toUpperCase();
        const type = vpNormalizeAssetType(item?.type || 'crypto');
        const key = `${type}:${sym}`;
        if(!sym || seen.has(key)) return;
        seen.add(key);
        merged.push(Object.assign({}, item, {symbol:sym, type}));
      });
    };
    push(state.__vpHomeMarketPool);
    [vpNormalizeAssetType(state.selectedAssetType || 'crypto'), 'crypto', 'commodities'].filter((v,i,a)=>v && a.indexOf(v)===i).forEach(type=>{
      try{ push(warmMarketsFromLocal(type)); }catch(e){}
    });
    push(Array.isArray(state.markets) ? state.markets : []);
    return merged.filter(Boolean).filter(item=>marketHasLiveQuote(item));
  }

  function vpHomePrimeMarketPool(){
    if(state.__vpHomePoolPriming) return;
    state.__vpHomePoolPriming = true;
    Promise.resolve().then(async()=>{
      let merged = [];
      try{
        if(typeof vpFetchMarketSnapshot === 'function'){
          const snap = await vpFetchMarketSnapshot('home', state.selectedAssetType || 'crypto', false);
          if(snap && snap.pools && typeof snap.pools === 'object'){
            Object.keys(snap.pools).forEach(type=>{
              const items = Array.isArray(snap.pools[type]) ? snap.pools[type] : [];
              if(!items.length) return;
              merged = vpMergeMarketItemsByKey(merged, items);
            });
          }
        }
      }catch(e){}
      if(!merged.length){
        const preferredType = vpNormalizeAssetType(state.selectedAssetType || 'crypto');
        const types = [...new Set([preferredType, 'crypto', preferredType === 'crypto' ? 'commodities' : preferredType])];
        const results = await Promise.allSettled(types.map(type=>refreshMarkets({type, applyToState:false, warm:true, lite:true, withQuotes:type !== 'crypto', ttlMs:type === 'crypto' ? 1200 : 1800})));
        results.forEach(res=>{
          if(res.status !== 'fulfilled' || !Array.isArray(res.value)) return;
          merged = vpMergeMarketItemsByKey(merged, res.value);
        });
      }
      if(merged.length){
        state.__vpHomeMarketPool = merged;
        try{ render(); }catch(e){}
      }
    }).catch(()=>{}).finally(()=>{ state.__vpHomePoolPriming = false; });
  }

  let vpHomeLiveTimer = null;
  let vpHomeLiveInflight = false;
  const vpStopHomeLive = ()=>{
    try{ if(vpHomeLiveTimer) clearInterval(vpHomeLiveTimer); }catch(e){}
    vpHomeLiveTimer = null;
  };
  const vpMergeHomeLiveQuote = (symbol, type, live)=>{
    const sym = String(symbol || '').toUpperCase();
    const normalizedType = vpNormalizeAssetType(type || 'crypto');
    if(!sym || !live || !(Number(live?.price || 0) > 0)) return;
    const apply = (item)=> String(item?.symbol || '').toUpperCase() === sym && vpNormalizeAssetType(item?.type || '') === normalizedType
      ? Object.assign({}, item, {
          price: Number(live?.price || item?.price || 0),
          change_pct: Number(live?.change_pct ?? live?.changePct ?? item?.change_pct ?? 0),
          updated_at: Number(live?.updated_at || (Date.now()/1000)),
          source: String(live?.source || live?.provider || item?.source || '').trim() || item?.source || ''
        })
      : item;
    try{
      if(Array.isArray(state.__vpHomeMarketPool)) state.__vpHomeMarketPool = state.__vpHomeMarketPool.map(apply);
      if(Array.isArray(state.markets)) state.markets = state.markets.map(apply);
    }catch(e){}
  };
  const vpApplyHomeLiveBinding = (binding, live)=>{
    if(!binding || !binding.root || !live || !(Number(live?.price || 0) > 0)) return;
    const px = Number(live.price || 0) || 0;
    const ch = Number(live.change_pct ?? live.changePct ?? 0) || 0;
    const liveSource = String(live?.source || live?.provider || '').trim();
    const liveSig = [px.toFixed(8), ch.toFixed(4), liveSource].join('|');
    if(binding.__lastHomeLiveSig === liveSig) return;
    binding.__lastHomeLiveSig = liveSig;
    if(binding.priceEl){
      binding.priceEl.textContent = money(px, px > 0 && px < 1 ? 4 : 2);
    }
    if(binding.changeEl){
      binding.changeEl.textContent = percentText(ch);
      binding.changeEl.classList.remove('up','down');
      binding.changeEl.classList.add(changeClass(ch));
    }
    binding.root.dataset.homeLiveChange = String(ch);
    if(binding.stickEl){
      binding.stickEl.classList.remove('up','down');
      binding.stickEl.classList.add(changeClass(ch));
    }
    if(binding.sourceEl){
      const src = String(live?.source || live?.provider || '').trim();
      binding.sourceEl.textContent = px > 0 ? (src ? `${vpTr('Live','لايف','Live')} • ${src}` : vpTr('Live feed','تغذية حية','Живой поток')) : vpTr('Waiting feed','بانتظار التغذية','Ожидание потока');
      binding.sourceEl.classList.toggle('is-live', px > 0);
      binding.sourceEl.classList.toggle('is-waiting', !(px > 0));
    }
    vpMergeHomeLiveQuote(binding.symbol, binding.type, live);
  };
  const vpApplyHomeWatchBinding = (binding, live)=>{
    if(!binding || !live || !(Number(live?.price || live?.bid || 0) > 0)) return;
    const px = Number(live?.price || 0) || 0;
    const bid = Number(live?.bid || live?.bid_price || live?.sell_price || px || 0) || 0;
    let ask = Number(live?.ask || live?.ask_price || live?.buy_price || 0) || 0;
    if(!(ask > 0) && bid > 0){
      const synthetic = binding.type === 'forex' ? Math.max(0.00008, bid * 0.00012) : (binding.type === 'crypto' ? bid * 0.0012 : bid * 0.0009);
      ask = bid + synthetic;
    }
    const ch = Number(live?.change_pct ?? live?.changePct ?? 0) || 0;
    const watchSig = [bid.toFixed(8), ask.toFixed(8), ch.toFixed(4)].join('|');
    if(binding.__lastHomeWatchSig === watchSig) return;
    binding.__lastHomeWatchSig = watchSig;
    const digits = (px > 0 && px < 1) ? 5 : 2;
    if(binding.bidEl) binding.bidEl.textContent = bid > 0 ? money(bid, digits) : '—';
    if(binding.askEl) binding.askEl.textContent = ask > 0 ? money(ask, digits) : '—';
    if(binding.changeEl){
      binding.changeEl.textContent = percentText(ch);
      binding.changeEl.classList.remove('up','down');
      binding.changeEl.classList.add(changeClass(ch));
    }
    vpMergeHomeLiveQuote(binding.symbol, binding.type, live);
  };
  const vpRefreshHomeMoverHeights = (root)=>{
    const moverNodes = Array.from((root || document).querySelectorAll('[data-home-live-role="mover"]'));
    if(!moverNodes.length) return;
    const max = Math.max(1, ...moverNodes.map(node=>Math.abs(Number(node.dataset.homeLiveChange || 0)) || 0));
    moverNodes.forEach(node=>{
      const stick = node.querySelector('[data-home-live-stick]');
      if(!stick) return;
      const ch = Math.abs(Number(node.dataset.homeLiveChange || 0)) || 0;
      const hgt = Math.max(22, Math.round((ch / max) * 110));
      stick.style.height = `${hgt}px`;
    });
  };
  const vpCollectHomeLiveBindings = (root)=>{
    if(!root) return [];
    const seen = new Set();
    const standard = Array.from(root.querySelectorAll('[data-home-live-symbol]')).map(node=>({
      kind: node.querySelector('[data-home-live-price]') ? 'standard' : (node.querySelector('[data-signal-live-price]') ? 'signal' : 'standard'),
      root: node,
      symbol: String(node.getAttribute('data-home-live-symbol') || '').toUpperCase(),
      type: vpNormalizeAssetType(node.getAttribute('data-home-live-type') || 'crypto'),
      market: String(node.getAttribute('data-home-live-market') || '').toLowerCase(),
      priceEl: node.querySelector('[data-home-live-price]') || node.querySelector('[data-signal-live-price]'),
      changeEl: node.querySelector('[data-home-live-change]') || node.querySelector('[data-signal-live-change]'),
      stickEl: node.querySelector('[data-home-live-stick]'),
      sourceEl: node.querySelector('[data-home-live-source]') || node.querySelector('[data-signal-live-source]'),
      noteEl: node.querySelector('[data-signal-live-note]'),
      entryHintEl: node.querySelector('[data-signal-entry-hint]')
    })).filter(binding=>{
      const key = `${binding.kind}:${binding.type}:${binding.symbol}`;
      if(!binding.symbol || !binding.priceEl || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const watch = Array.from(root.querySelectorAll('[data-home-watch-symbol]')).map(node=>({
      kind: 'watch',
      root: node,
      symbol: String(node.getAttribute('data-home-watch-symbol') || '').toUpperCase(),
      type: vpNormalizeAssetType(node.getAttribute('data-home-watch-type') || 'crypto'),
      bidEl: node.querySelector('[data-home-watch-bid]'),
      askEl: node.querySelector('[data-home-watch-ask]'),
      changeEl: node.querySelector('[data-home-watch-change]')
    })).filter(binding=>binding.symbol && (binding.bidEl || binding.askEl));
    return standard.concat(watch);
  };
  const vpHomeLiveTick = async(root)=>{
    if(vpHomeLiveInflight || !root) return;
    if(String(location.hash || '#/home').indexOf('#/home') !== 0) return;
    const bindings = vpCollectHomeLiveBindings(root);
    if(!bindings.length) return;
    vpHomeLiveInflight = true;
    try{
      const groups = new Map();
      bindings.forEach(binding=>{
        if(!groups.has(binding.type)) groups.set(binding.type, []);
        groups.get(binding.type).push(binding);
      });
      for(const [type, list] of groups.entries()){
        const symbols = [...new Set(list.map(binding=>binding.symbol).filter(Boolean))].slice(0, 18);
        if(!symbols.length) continue;
        const quoteMap = new Map();
        try{
          const rememberAge = vpNormalizeAssetType(type) === 'crypto' ? 12 : 24;
          symbols.forEach(sym=>{
            const remembered = (typeof vpGetFreshRememberedQuote === 'function') ? vpGetFreshRememberedQuote(sym, type, rememberAge) : null;
            if(remembered && Number(remembered?.price || remembered?.bid || remembered?.last || remembered?.mark_price || 0) > 0){
              quoteMap.set(sym, remembered);
            }
          });
        }catch(e){}
        const needsFetch = symbols.filter(sym=>{
          const q = quoteMap.get(sym);
          const src = String(q?.source || q?.provider || '').trim();
          const trusted = (type === 'crypto') || (typeof window.isTrustedUiLiveSource === 'function' ? window.isTrustedUiLiveSource(src, sym, type) : ((typeof window.isPreferredSignalLiveSource === 'function' ? window.isPreferredSignalLiveSource(src, sym, type) : true)));
          return !(q && Number(q?.price || q?.bid || q?.last || q?.mark_price || 0) > 0 && trusted);
        });
        try{
          if(needsFetch.length){
            const directParam = '';
            const resp = await api((vpNormalizeAssetType(type) === 'crypto' ? `/quotes.php?fresh=1&type=${encodeURIComponent(type)}&symbols=${encodeURIComponent(needsFetch.join(','))}` : `/quotes.php?type=${encodeURIComponent(type)}&symbols=${encodeURIComponent(needsFetch.join(','))}`), {timeoutMs: (vpNormalizeAssetType(type) === 'arab' && needsFetch.length <= 4) ? 5200 : 4500});
            const items = Array.isArray(resp?.items) ? resp.items : [];
            items.forEach(item=>{
              const sym = String(item?.symbol || '').toUpperCase();
              if(!sym) return;
              quoteMap.set(sym, item);
              try{ if(typeof vpRememberLiveQuote === 'function') vpRememberLiveQuote(Object.assign({}, item, { symbol:sym, type, market:item?.market || ((type === 'crypto' || type === 'futures') ? 'perp' : 'spot') })); }catch(_e){}
            });
          }
        }catch(e){}
        const missing = symbols.filter(sym=>{
          const q = quoteMap.get(sym);
          const src = String(q?.source || q?.provider || '').trim();
          const trusted = (type === 'crypto') || (typeof window.isTrustedUiLiveSource === 'function' ? window.isTrustedUiLiveSource(src, sym, type) : ((typeof window.isPreferredSignalLiveSource === 'function' ? window.isPreferredSignalLiveSource(src, sym, type) : true)));
          return !(q && Number(q?.price || q?.bid || q?.last || q?.mark_price || 0) > 0 && trusted);
        });
        if(missing.length && type === 'crypto'){
          try{
            const spotSymbols = [];
            const perpSymbols = [];
            missing.forEach(sym=>{
              const sample = list.find(binding=>binding.symbol === sym);
              const eff = vpResolveLiveMarketForSymbol(sym, type, sample?.market || 'spot');
              if(eff === 'perp') perpSymbols.push(sym); else spotSymbols.push(sym);
            });
            const pull = async(marketSymbols, market)=>{
              if(!marketSymbols.length) return;
              const resp = await api(`/trade/stream.php?lite=1&type=${encodeURIComponent(type)}&market=${encodeURIComponent(market)}&symbols=${encodeURIComponent(marketSymbols.join(','))}&_=${Date.now()}`, {timeoutMs: 4200});
              const pulled = resp?.quotes && typeof resp.quotes === 'object' ? Object.values(resp.quotes) : [];
              (Array.isArray(pulled) ? pulled : []).forEach(item=>{
                const sym = String(item?.symbol || '').toUpperCase();
                if(!sym) return;
                quoteMap.set(sym, item);
                try{ if(typeof vpRememberLiveQuote === 'function') vpRememberLiveQuote(Object.assign({}, item, { symbol:sym, type, market })); }catch(_e){}
              });
            };
            await Promise.allSettled([pull(spotSymbols, 'spot'), pull(perpSymbols, 'perp')]);
          }catch(e){}
        }
        for(const binding of list){
          let live = quoteMap.get(binding.symbol);
          let liveSource = String(live?.source || live?.provider || '').trim();
          let trustedLive = (binding.type === 'crypto') || (typeof window.isTrustedUiLiveSource === 'function' ? window.isTrustedUiLiveSource(liveSource, binding.symbol, binding.type) : ((typeof window.isPreferredSignalLiveSource === 'function' ? window.isPreferredSignalLiveSource(liveSource, binding.symbol, binding.type) : true)));
          if((!(live && Number(live?.price || live?.bid || live?.last || live?.mark_price || 0) > 0 && trustedLive)) && binding.type !== 'crypto'){
            try{
              const direct = await fetchQuote(binding.symbol, binding.type, binding.market || (binding.type === 'futures' ? 'perp' : 'spot'));
              const src = String(direct?.source || direct?.provider || '').trim();
              const trusted = (typeof window.isTrustedUiLiveSource === 'function') ? window.isTrustedUiLiveSource(src, binding.symbol, binding.type) : true;
              if(Number(direct?.price || direct?.last || direct?.mark_price || 0) > 0 && (trusted || !src)){
                live = direct;
                liveSource = src;
                trustedLive = true;
                quoteMap.set(binding.symbol, direct);
              }
            }catch(err){}
          }
          if(!(live && Number(live?.price || live?.bid || live?.last || live?.mark_price || 0) > 0 && trustedLive)) continue;
          if(binding.kind === 'watch') vpApplyHomeWatchBinding(binding, live);
          else if(binding.kind === 'signal'){ const signalUpdater = window.updateSignalCardLive; if(typeof signalUpdater === 'function') signalUpdater(binding, { price:Number(live?.price || live?.last || live?.mark_price || 0) || 0, changePct:Number(live?.change_pct ?? live?.changePct ?? 0) || 0, source:liveSource, updatedAt:Number(live?.updated_at || live?.ts || live?.time || 0) || 0 }); }
          else vpApplyHomeLiveBinding(binding, live);
        }
      }
      vpRefreshHomeMoverHeights(root);
    }finally{
      vpHomeLiveInflight = false;
    }
  };
  const vpStartHomeLive = (root)=>{
    vpStopHomeLive();
    if(!root) return;
    const homeTick = ()=>{ try{ if(document.hidden || String(location.hash || '#/home').indexOf('#/home') !== 0) return; vpHomeLiveTick(root); }catch(e){} };
    Promise.resolve().then(homeTick);
    const homeLiveEvery = vpIsMobile() ? 5600 : 4800;
    vpHomeLiveTimer = setInterval(homeTick, homeLiveEvery);
    onCleanup(vpStopHomeLive);
  };

  const vpApplyHomeAccountDom = (root)=>{
    if(!root || !root.isConnected) return false;
    try{
      const mode = String(state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
      const snap = portfolioSnapshot(mode);
      const pnl24 = mode === 'real' ? Number(state.realPnlStats?.pnl_24h || 0) : Number(state.pnlStats?.pnl_24h || 0);
      const activeAccountNo = String(mode === 'real'
        ? (state.me?.live_account?.account_no || accNo() || accountNo('live') || '—')
        : (state.me?.demo_account?.account_no || accountNo('demo') || accNo() || '—'));
      const activeModeLabel = mode === 'real'
        ? vpLang4('Live','حقيقي','Live','Live')
        : vpLang4('Demo','تجريبي','Demo','Demo');
      const activeModeTitle = mode === 'real'
        ? vpLang4('Live account','الحساب الحقيقي','Реальный счёт','लाइव अकाउंट')
        : vpLang4('Demo account','حساب الديمو','Демо счёт','डेमो अकाउंट');
      const setText = (selector, text)=>{ const el = root.querySelector(selector); if(el) el.textContent = text; };
      const setTexts = (selector, texts)=>{ const nodes = Array.from(root.querySelectorAll(selector)); nodes.forEach((el, idx)=>{ if(idx < len(texts)) el.textContent = texts[idx]; }); };
      const len = (arr)=> Array.isArray(arr) ? arr.length : 0;
      setText('[data-topbar-balance-primary]', money(Number(snap.freeMargin || snap.availableCash || snap.equity || 0), 2));
      setText('[data-topbar-balance-trigger]', `${activeModeLabel} • ${activeAccountNo}`);
      setText('[data-home-mobile-topbar-equity] .v', money(Number(snap.equity || 0), 2));
      setText('[data-home-mobile-topbar-equity] .s', percentText(pnl24));
      const eqWrap = root.querySelector('[data-home-mobile-topbar-equity]');
      if(eqWrap){ eqWrap.classList.remove('up','down','warn'); eqWrap.classList.add(pnl24 >= 0 ? 'up' : 'down'); }
      setText('[data-home-mobile-topbar-account] .v', activeAccountNo);
      setText('[data-home-mobile-topbar-account] .s', accountLabel(mode === 'real' ? 'live' : 'demo'));
      const totalBalance = Math.max(0, Number(snap.equity || snap.balanceCash || 0));
      const availableBalance = Math.max(0, Number(snap.displayAvailable || snap.availableCash || 0));
      const totalPnl = Number(snap.pnl || 0);
      const totalPnlText = `${totalPnl >= 0 ? '+' : '-'}${money(Math.abs(totalPnl), 2)}`;
      setText('.mb-home-mobile-balance-value', money(totalBalance, 2));
      setText('.mb-home-mobile-balance-sub', `${activeModeTitle} • ${activeAccountNo}`);
      const pill = root.querySelector('.mb-home-mobile-balance-row .pill');
      if(pill){ pill.textContent = percentText(pnl24); pill.classList.remove('up','down'); pill.classList.add(changeClass(pnl24)); }
      const chips = Array.from(root.querySelectorAll('.mb-home-mobile-balance-chips .chip'));
      if(chips[0]) chips[0].textContent = `${vpLang4('Mode','الوضع','Режим','मोड')} ${activeModeTitle}`;
      if(chips[1]) chips[1].textContent = `${vpLang4('Total PnL','إجمالي الربح والخسارة','Общий PnL','कुल PnL')} ${totalPnlText}`;
      if(chips[2]) chips[2].textContent = `${vpLang4('Open trades','الصفقات المفتوحة','Открытые сделки','ओपन ट्रेड्स')} ${Array.isArray(snap.positions) ? snap.positions.length : 0}`;
      const metricNodes = Array.from(root.querySelectorAll('.mb-home-mobile-mini-grid [data-home-mobile-metric]'));
      metricNodes.forEach((node)=>{
        const key = String(node.getAttribute('data-home-mobile-metric') || '');
        const valueNode = node.querySelector('.mb-mini-v');
        const subNode = node.querySelector('.mb-mini-s');
        if(!valueNode) return;
        if(key === 'total-balance'){
          valueNode.textContent = money(totalBalance, 2);
          if(subNode) subNode.textContent = mode === 'real' ? vpLang4('Real balance','رصيد الحقيقي','Баланс real','रियल बैलेंस') : vpLang4('Demo balance','رصيد الديمو','Баланс demo','डेमो बैलेंस');
        }else if(key === 'available-balance'){
          valueNode.textContent = money(availableBalance, 2);
          if(subNode) subNode.textContent = vpLang4('Ready to trade','جاهز للتداول','Готово к сделкам','ट्रेड के लिए तैयार');
        }else if(key === 'total-pnl'){
          valueNode.textContent = totalPnlText;
          node.classList.remove('up','down');
          node.classList.add(totalPnl >= 0 ? 'up' : 'down');
          if(subNode) subNode.textContent = mode === 'real' ? vpLang4('Live performance','أداء الحقيقي','Результат live','लाइव प्रदर्शन') : vpLang4('Demo performance','أداء الديمو','Результат demo','डेमो प्रदर्शन');
        }else if(key === 'open-trades'){
          valueNode.textContent = String(Array.isArray(snap.positions) ? snap.positions.length : 0);
          if(subNode) subNode.textContent = mode === 'real' ? vpLang4('Real positions','مراكز الحقيقي','Позиции real','रियल पोजीशन') : vpLang4('Demo positions','مراكز الديمو','Позиции demo','डेमो पोजीशन');
        }
      });
      setTexts('.mb-home-watch-row[data-home-watch-symbol] [data-home-watch-bid]', Array.from(root.querySelectorAll('.mb-home-watch-row[data-home-watch-symbol]')).map((row)=>{
        const item = vpHomeSymbolLookup(row.getAttribute('data-home-watch-symbol') || '', row.getAttribute('data-home-watch-type') || '');
        return money(vpHomeBidPrice(item), priceDigits(item));
      }));
      setTexts('.mb-home-watch-row[data-home-watch-symbol] [data-home-watch-ask]', Array.from(root.querySelectorAll('.mb-home-watch-row[data-home-watch-symbol]')).map((row)=>{
        const item = vpHomeSymbolLookup(row.getAttribute('data-home-watch-symbol') || '', row.getAttribute('data-home-watch-type') || '');
        return money(vpHomeAskPrice(item), priceDigits(item));
      }));
      return true;
    }catch(e){ return false; }
  };

  let vpHomeAccountTimer = null;
  let vpHomeAccountInflight = false;
  const vpStopHomeAccountLive = ()=>{
    try{ if(vpHomeAccountTimer) clearInterval(vpHomeAccountTimer); }catch(e){}
    vpHomeAccountTimer = null;
  };
  const vpHomeAccountTick = async(root)=>{
    if(vpHomeAccountInflight || !root || !root.isConnected) return;
    if(String(location.hash || '#/home').indexOf('#/home') !== 0) return;
    if(document.hidden) return;
    vpHomeAccountInflight = true;
    try{
      const mode = String(state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
      await Promise.allSettled([
        refreshWalletSummary(false),
        mode === 'real' ? refreshRealPortfolio(false) : refreshPortfolio({ force:false, mode:'demo' }),
        mode === 'real' ? refreshRealPnlStats(false) : refreshPnlStats({ force:false, mode:'demo' })
      ]);
      if(root.isConnected && String(location.hash || '#/home').indexOf('#/home') === 0){
        const patched = vpApplyHomeAccountDom(root);
        if(!patched){
          try{ render(); }catch(e){}
        }
      }
    }finally{
      vpHomeAccountInflight = false;
    }
  };
  const vpStartHomeAccountLive = (root)=>{
    vpStopHomeAccountLive();
    if(!root) return;
    const accountTick = ()=>{ try{ if(document.hidden || String(location.hash || '#/home').indexOf('#/home') !== 0) return; vpHomeAccountTick(root); }catch(e){} };
    Promise.resolve().then(()=>{ try{ vpApplyHomeAccountDom(root); }catch(e){} });
    const homeAccountEvery = vpIsMobile() ? 36000 : 30000;
    vpHomeAccountTimer = setInterval(accountTick, homeAccountEvery);
    onCleanup(vpStopHomeAccountLive);
  };

  let vpPortfolioLiveTimer = null;
  let vpPortfolioLiveInflight = false;
  const vpStopPortfolioLive = ()=>{
    try{ if(vpPortfolioLiveTimer) clearInterval(vpPortfolioLiveTimer); }catch(e){}
    vpPortfolioLiveTimer = null;
  };
  const vpPortfolioLiveTick = async(root)=>{
    if(vpPortfolioLiveInflight || !root || !root.isConnected) return;
    if(String(location.hash || '#/portfolio').indexOf('#/portfolio') !== 0) return;
    if(document.hidden) return;
    vpPortfolioLiveInflight = true;
    try{
      await Promise.allSettled([
        refreshWalletSummary(true),
        refreshRealPortfolio(true)
      ]);
      if(root.isConnected && String(location.hash || '#/portfolio').indexOf('#/portfolio') === 0){
        try{ render(); }catch(e){}
      }
    }finally{
      vpPortfolioLiveInflight = false;
    }
  };
  const vpStartPortfolioLive = (root)=>{
    vpStopPortfolioLive();
    if(!root) return;
    const portfolioTick = ()=>{ try{ if(document.hidden || String(location.hash || '#/portfolio').indexOf('#/portfolio') !== 0) return; vpPortfolioLiveTick(root); }catch(e){} };
    Promise.resolve().then(portfolioTick);
    vpPortfolioLiveTimer = setInterval(portfolioTick, 16000);
    onCleanup(vpStopPortfolioLive);
  };

  function vpHomeWatchTabs(){
    return [
      {key:'favorites', label:vpLang4('Favorites','المفضلة','Избранное','पसंदीदा')},
      {key:'all', label:vpLang4('All','الكل','Все','सभी')},
      {key:'crypto', label:vpLang4('Crypto','الكريبتو','Крипто','क्रिप्टो')},
      {key:'futures', label:vpLang4('Perpetual','العقود الدائمة','Бессрочные','Perpetual')},
      {key:'forex', label:vpLang4('Forex','الفوركس','Форекс','फॉरेक्स')},
      {key:'stocks', label:vpLang4('Stocks','الأسهم','Акции','स्टॉक्स')},
      {key:'arab', label:vpLang4('Arab Stocks','الأسهم العربية','Арабские акции','Arab Stocks')},
      {key:'commodities', label:vpLang4('Commodities','السلع','Товары','कमोडिटीज')}
    ];
  }

  function vpHomeIsMetal(item){
    const sym = String(item?.symbol || '').toUpperCase();
    const name = String(item?.name || '').toUpperCase();
    return /(XAU|XAG|GOLD|SILVER|PLAT|PLATINUM|PALL|PALLADIUM)/.test(sym + ' ' + name);
  }

  function vpHomeIsIndex(item){
    const sym = String(item?.symbol || '').toUpperCase();
    const name = String(item?.name || '').toUpperCase();
    return /(US30|DJ30|WS30|NAS100|USTEC|SPX500|US500|UK100|GER40|DE40|FRA40|EU50|JP225|JPN225|HK50|AUS200|INDEX|INDICES)/.test(sym + ' ' + name);
  }

  function vpHomeRowsForTab(tab, pool){
    const fav = new Set((typeof getFavorites === 'function' ? getFavorites() : []).map(x=>String(x || '').toUpperCase()));
    let rows = Array.isArray(pool) ? pool.slice() : [];
    let key = String(tab || 'all').toLowerCase();
    if(key === 'shares') key = 'stocks';
    if(key === 'metals') key = 'commodities';
    if(key === 'indices') key = 'futures';
    const itemType = (item)=>vpNormalizeAssetType(item?.type || 'crypto');
    if(key === 'favorites') rows = rows.filter(item=>fav.has(String(item?.symbol || '').toUpperCase()));
    else if(key === 'forex') rows = rows.filter(item=>itemType(item) === 'forex');
    else if(key === 'crypto') rows = rows.filter(item=>itemType(item) === 'crypto');
    else if(key === 'stocks') rows = rows.filter(item=>itemType(item) === 'stocks');
    else if(key === 'arab') rows = rows.filter(item=>itemType(item) === 'arab');
    else if(key === 'futures') rows = rows.filter(item=>itemType(item) === 'futures');
    else if(key === 'commodities') rows = rows.filter(item=>itemType(item) === 'commodities');

    rows.sort((a,b)=>{
      const aFav = fav.has(String(a?.symbol || '').toUpperCase()) ? 1 : 0;
      const bFav = fav.has(String(b?.symbol || '').toUpperCase()) ? 1 : 0;
      const aRank = Number(a?.market_rank || a?.sort_order || 999999);
      const bRank = Number(b?.market_rank || b?.sort_order || 999999);
      const aVol = Number(a?.volume || 0);
      const bVol = Number(b?.volume || 0);
      const aCh = Math.abs(Number(a?.change_pct || 0));
      const bCh = Math.abs(Number(b?.change_pct || 0));
      const aUp = Number(a?.updated_at || a?.as_of || 0);
      const bUp = Number(b?.updated_at || b?.as_of || 0);
      return bFav - aFav || aRank - bRank || bVol - aVol || bCh - aCh || bUp - aUp;
    });

    const seen = new Set();
    return rows.filter(item=>{
      const sym = String(item?.symbol || '').toUpperCase();
      if(!sym || seen.has(sym)) return false;
      seen.add(sym);
      return true;
    }).slice(0, 8);
  }

  function vpHomeBidPrice(item){
    const raw = [item?.bid, item?.bid_price, item?.sell_price, item?.price].map(v=>Number(v || 0)).find(v=>v > 0);
    if(raw) return raw;
    return Number(item?.price || 0) || 0;
  }

  function vpHomeAskPrice(item){
    const raw = [item?.ask, item?.ask_price, item?.buy_price].map(v=>Number(v || 0)).find(v=>v > 0);
    if(raw) return raw;
    const px = Number(item?.price || 0) || 0;
    if(!px) return 0;
    const type = String(item?.type || '').toLowerCase();
    const synthetic = type === 'forex' ? Math.max(0.00008, px * 0.00012) : (type === 'crypto' ? px * 0.0012 : px * 0.0009);
    return px + synthetic;
  }

  function vpHomeWatchlistCard(pool){
    const tabs = vpHomeWatchTabs();
    const tabKeys = tabs.map(tab=>tab.key);
    let currentTab = String(state.__vpHomeWatchTab || 'all').toLowerCase();
    if(currentTab === 'shares') currentTab = 'stocks';
    if(currentTab === 'metals') currentTab = 'commodities';
    if(currentTab === 'indices') currentTab = 'futures';
    if(!tabKeys.includes(currentTab)) currentTab = 'all';
    state.__vpHomeWatchTab = currentTab;
    const rows = vpHomeRowsForTab(currentTab, pool);
    const priceDigits = (item)=>{
      const px = Number(item?.price || 0);
      return px > 0 && px < 1 ? 5 : 2;
    };
    return h('div',{class:'card mb-home-watch-card'},
      h('div',{class:'mb-side-head mb-home-watch-top'},
        h('div',{class:'mb-card-title'}, vpLang4('Watchlist','قائمة المتابعة','Список наблюдения','वॉचलिस्ट')),
        h('button',{class:'btn ghost slim', onclick:()=>location.hash='#/trade'}, vpLang4('Trade','التداول','Торговля','ट्रेड'))
      ),
      h('div',{class:'mb-home-watch-tabs'}, ...tabs.map(tab=>h('button',{
        class: currentTab === tab.key ? 'active' : '',
        onclick:()=>{
          state.__vpHomeWatchTab = tab.key;
          render();
          Promise.resolve().then(async()=>{
            try{
              if(typeof refreshMarkets === 'function' && ['crypto','futures','forex','stocks','arab','commodities'].includes(tab.key)){
                const ttlMs = tab.key === 'crypto' ? 900 : (tab.key === 'commodities' ? 1800 : 2600);
                const fresh = await refreshMarkets({type:tab.key, lite:true, withQuotes:tab.key !== 'crypto', applyToState:false, warm:true, ttlMs});
                if(Array.isArray(fresh) && fresh.length){
                  const merged = vpMergeMarketItemsByKey(Array.isArray(state.__vpHomeMarketPool) ? state.__vpHomeMarketPool : [], fresh);
                  state.__vpHomeMarketPool = merged;
                }
              }
            }catch(e){}
            try{ render(); }catch(e){}
          });
        }
      }, tab.label))),
      h('div',{class:'mb-home-watch-table'},
        h('div',{class:'mb-home-watch-head'},
          h('span',{}, vpLang4('Symbol','الرمز','Символ','सिंबल')),
          h('span',{}, vpLang4('Bid / Ask','بيع / شراء','Bid / Ask','बिड / आस्क')),
          h('span',{class:'ta-right'}, vpLang4('24h Change','تغير 24س','Изм. за 24ч','24घं बदलाव'))
        ),
        rows.length ? rows.map(item=>{
          const pct = Number(item?.change_pct || 0);
          return h('button',{class:'mb-home-watch-row', onclick:()=>setSymbolAndGo(item), 'data-home-watch-symbol': String(item?.symbol || '').toUpperCase(), 'data-home-watch-type': vpNormalizeAssetType(item?.type || 'crypto')},
            h('div',{class:'mb-home-watch-symbol'},
              vpMarketAvatar(item, item?.symbol, 'sm watch'),
              h('div',{class:'mb-home-watch-symbol-copy'},
                h('strong',{}, String(item?.symbol || '—')),
                h('span',{}, instrumentName(item))
              )
            ),
            h('div',{class:'mb-home-watch-bidask'},
              h('strong',{'data-home-watch-bid':'1'}, money(vpHomeBidPrice(item), priceDigits(item))),
              h('small',{'data-home-watch-ask':'1'}, money(vpHomeAskPrice(item), priceDigits(item)))
            ),
            h('div',{class:'mb-home-watch-change ' + changeClass(pct), 'data-home-watch-change':'1'}, percentText(pct))
          );
        }) : h('div',{class:'empty', style:'margin:0;'}, vpLang4('No symbols to display yet.','لا توجد رموز للعرض حتى الآن.','Пока нет символов для отображения.','अभी दिखाने के लिए कोई सिंबल नहीं है।'))
      )
    );
  }

  const __vpHomeDesktop = homePage;
  homePage = function(){
    if(!vpIsMobile()) return __vpHomeDesktop();
    vpPrimeWorkspace('__vpHomeMobilePriming', [
      ()=> state.walletSummary ? Promise.resolve(state.walletSummary) : refreshWalletSummary(true),
      ()=> state.onboardingStatus ? Promise.resolve(state.onboardingStatus) : refreshOnboardingStatus(),
      ()=> (Array.isArray(state.markets) && state.markets.length) ? Promise.resolve(state.markets) : refreshMarkets(),
      ()=> (Array.isArray(state.tradingBotSignals) && state.tradingBotSignals.length) ? Promise.resolve(state.tradingBotSignals) : refreshTradingBotSignals(true),
      ()=> Array.isArray(state.myTradingBotSubs) ? Promise.resolve(state.myTradingBotSubs) : refreshMyTradingBotSubs(true),
      ()=> state.__dashboardLevelData ? Promise.resolve(state.__dashboardLevelData) : refreshDashboardLevelData(true)
    ]);
    vpHomePrimeMarketPool();

    const mode = String(state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
    const snap = portfolioSnapshot(mode);
    const altMode = mode === 'real' ? 'demo' : 'real';
    const altSnap = portfolioSnapshot(altMode);
    const activeAccountNo = String(mode === 'real'
      ? (state.me?.live_account?.account_no || accNo() || accountNo('live') || '—')
      : (state.me?.demo_account?.account_no || accountNo('demo') || accNo() || '—'));
    const activeModeTitle = mode === 'real'
      ? vpLang4('Live account','الحساب الحقيقي','Реальный счёт','लाइव अकाउंट')
      : vpLang4('Demo account','حساب الديمو','Демо счёт','डेमो अकाउंट');
    const activePnl24 = mode === 'real' ? Number(state.realPnlStats?.pnl_24h || 0) : Number(state.pnlStats?.pnl_24h || 0);
    const ob = state.onboardingStatus || null;
    const kycStatus = String(ob?.kyc?.status || 'none').toLowerCase();
    const kycApproved = kycStatus === 'approved';
    const moversMode = String(state.__vpHomeMoversMode || 'gainers');
    const pool = vpHomeMarketPool();
    const orderedPool = pool.slice().sort((a,b)=>{
      const aRank = Number(a?.market_rank || a?.sort_order || 999999);
      const bRank = Number(b?.market_rank || b?.sort_order || 999999);
      const aVol = Number(a?.volume || 0);
      const bVol = Number(b?.volume || 0);
      const aCh = Math.abs(Number(a?.change_pct || 0));
      const bCh = Math.abs(Number(b?.change_pct || 0));
      return aRank - bRank || bVol - aVol || bCh - aCh;
    });
    const movers = orderedPool.slice().sort((a,b)=> moversMode === 'losers'
      ? Number(a?.change_pct || 0) - Number(b?.change_pct || 0)
      : Number(b?.change_pct || 0) - Number(a?.change_pct || 0)).slice(0,5);
    const barMax = Math.max(1, ...movers.map(x=>Math.abs(Number(x?.change_pct || 0))));
    const popular = orderedPool.slice(0,4);
    const activePositions = Array.isArray(snap.positions) ? snap.positions.length : 0;
    const totalBalance = Math.max(0, Number(snap.equity || snap.balanceCash || 0));
    const availableBalance = Math.max(0, Number(snap.displayAvailable || snap.availableCash || 0));
    const totalPnl = Number(snap.pnl || 0);
    const totalPnlText = `${totalPnl >= 0 ? '+' : '-'}${money(Math.abs(totalPnl), 2)}`;
    const pnlTone = totalPnl >= 0 ? 'up' : 'down';

    const verifyCard = !kycApproved ? h('div',{class:'card mb-home-mobile-verify ref-card'},
      h('div',{class:'mb-verify-welcome'}, `${vpLang4('Welcome','مرحباً','Добро пожаловать','स्वागत है')}, ${userName()}`),
      h('div',{class:'mb-verify-title'}, vpLang4('Verify your account','تحقق من حسابك','Подтвердите аккаунт','अपना खाता सत्यापित करें')),
      h('div',{class:'mb-verify-text'}, vpLang4('Keep withdrawals and investment subscriptions ready by completing verification. Deposits and trading stay available now.','أكمل التحقق لإبقاء السحب والاشتراك في الخطط الاستثمارية جاهزين. الإيداع والتداول متاحان الآن.','Завершите верификацию, чтобы держать выводы и инвестиционные подписки доступными. Пополнения и торговля уже доступны.','सत्यापन पूरा करें ताकि निकासी और निवेश सदस्यताएँ तैयार रहें। जमा और ट्रेडिंग अभी उपलब्ध हैं।')),
      h('button',{class:'btn primary', onclick:()=>openKycFlow().catch(()=>{})}, vpLang4('Start verification','ابدأ التحقق','Начать верификацию','सत्यापन शुरू करें'))
    ) : null;

    const moversCard = h('div',{class:'card mb-home-movers-card'},
      h('div',{class:'mb-side-head'},
        h('div',{class:'mb-card-title'}, vpLang4('Market movers','أقوى التحركات','Лидеры движения','मार्केट मूवर्स')),
        h('span',{class:'chip ghost'}, vpAssetTypeLabel(state.selectedAssetType || 'crypto'))
      ),
      h('div',{class:'mb-home-movers-tabs'},
        h('button',{class:moversMode === 'gainers' ? 'active' : '', onclick:()=>{ state.__vpHomeMoversMode = 'gainers'; render(); }}, vpLang4('Top gainers','الأعلى صعوداً','Лидеры роста','टॉप गेनर्स')),
        h('button',{class:moversMode === 'losers' ? 'active' : '', onclick:()=>{ state.__vpHomeMoversMode = 'losers'; render(); }}, vpLang4('Top losers','الأعلى هبوطاً','Лидеры снижения','टॉप लूज़र्स'))
      ),
      h('div',{class:'mb-home-movers-bars'}, ...movers.map(item=>{
        const pct = Number(item?.change_pct || 0);
        const ratio = Math.max(18, Math.round((Math.abs(pct) / barMax) * 110));
        return h('button',{class:'mb-home-mover-bar', onclick:()=>setSymbolAndGo(item), 'data-home-live-symbol': String(item?.symbol || '').toUpperCase(), 'data-home-live-type': vpNormalizeAssetType(item?.type || ''), 'data-home-live-role':'mover'},
          h('div',{class:'mb-home-mover-pct ' + changeClass(pct), 'data-home-live-change':'1'}, percentText(pct)),
          h('div',{class:'mb-home-mover-stick-wrap'}, h('div',{class:'mb-home-mover-stick ' + changeClass(pct), style:`height:${ratio}px`, 'data-home-live-stick':'1'})),
          h('div',{class:'mb-home-mover-price', 'data-home-live-price':'1'}, money(Number(item?.price || 0), Number(item?.price || 0) < 1 ? 4 : 2)),
          h('div',{class:'mb-home-mover-symbol'}, String(item?.symbol || '—').slice(0,8))
        );
      }))
    );

    const popularCard = h('div',{class:'card mb-home-popular-card-mobile'},
      h('div',{class:'mb-side-head'}, h('div',{class:'mb-card-title'}, vpLang4('Popular','الأكثر تداولاً','Популярное','पॉपुलर')), h('button',{class:'btn ghost slim', onclick:()=>openTradeType(state.selectedAssetType || 'crypto')}, vpLang4('Open trade','افتح التداول','Открыть торговлю','ट्रेड खोलें'))),
      h('div',{class:'mb-popular-grid mobile'}, ...popular.map(item=>h('button',{class:'mb-popular-tile mobile', onclick:()=>setSymbolAndGo(item), 'data-home-live-symbol': String(item?.symbol || '').toUpperCase(), 'data-home-live-type': vpNormalizeAssetType(item?.type || ''), 'data-home-live-role':'popular'},
        h('div',{class:'mb-popular-tile-top'},
          h('div',{class:'mb-popular-tile-asset'}, vpMarketAvatar(item, item?.symbol, 'sm popular'), h('span',{class:'mb-popular-kind-pill'}, vpAssetTypeLabel(item?.type || 'market'))),
          h('span',{class:'mb-popular-change-chip ' + changeClass(Number(item.change_pct || 0)), 'data-home-live-change':'1'}, percentText(Number(item.change_pct || 0)))
        ),
        h('div',{class:'mb-popular-title'}, String(item.symbol || '—')),
        h('div',{class:'mb-popular-sub'}, instrumentName(item)),
        h('div',{class:'mb-popular-foot'}, h('strong',{'data-home-live-price':'1'}, money(Number(item.price || 0), Number(item.price || 0) < 1 ? 4 : 2)), h('span',{class:'mb-popular-change ' + changeClass(Number(item.change_pct || 0)), 'data-home-live-change':'1'}, percentText(Number(item.change_pct || 0))))
      )))
    );

    const metricNode = (key, title, value, sub, extraCls)=> h('div',{
      class:'mb-mini-metric ' + (extraCls || ''),
      'data-home-mobile-metric':key
    },
      h('div',{class:'mb-mini-k'}, title),
      h('div',{class:'mb-mini-v'}, value),
      sub ? h('div',{class:'mb-mini-s'}, sub) : null
    );

    const balanceCard = h('div',{class:'card mb-home-mobile-balance ref premium-dashboard'},
      h('div',{class:'mb-home-mobile-balance-head'},
        h('div',{},
          h('div',{class:'mb-markets-kicker'}, vpLang4('Account overview','ملخص الحساب','Обзор счёта','अकाउंट ओवरव्यू')),
          h('div',{class:'mb-home-mobile-balance-row'},
            h('div',{class:'mb-home-mobile-balance-value'}, money(totalBalance,2)),
            h('span',{class:'pill ' + changeClass(activePnl24)}, percentText(activePnl24))
          ),
          h('div',{class:'mb-home-mobile-balance-sub'}, `${activeModeTitle} • ${activeAccountNo}`)
        ),
        h('div',{class:'mb-home-balance-mode-wrap'},
          vpDashboardAccountSwitcher({mode})
        )
      ),
      h('div',{class:'mb-home-mobile-balance-chips'},
        h('span',{class:'chip ghost'}, `${vpLang4('Mode','الوضع','Режим','मोड')} ${activeModeTitle}`),
        h('span',{class:'chip ghost'}, `${vpLang4('Total PnL','إجمالي الربح والخسارة','Общий PnL','कुल PnL')} ${totalPnlText}`),
        h('span',{class:'chip ghost'}, `${vpLang4('Open trades','الصفقات المفتوحة','Открытые сделки','ओपन ट्रेड्स')} ${activePositions}`)
      ),
      h('div',{class:'mb-home-mobile-mini-grid mb-home-mobile-mini-grid--premium'},
        metricNode('total-balance', vpLang4('Total balance','إجمالي الرصيد','Общий баланс','कुल बैलेंस'), money(totalBalance, 2), mode === 'real' ? vpLang4('Real balance','رصيد الحقيقي','Баланс real','रियल बैलेंस') : vpLang4('Demo balance','رصيد الديمو','Баланс demo','डेमो बैलेंस')),
        metricNode('available-balance', vpLang4('Available','المتاح','Доступно','उपलब्ध'), money(availableBalance, 2), vpLang4('Ready to trade','جاهز للتداول','Готово к сделкам','ट्रेड के लिए तैयार')),
        metricNode('total-pnl', vpLang4('Total PnL','إجمالي الربح والخسارة','Общий PnL','कुल PnL'), totalPnlText, mode === 'real' ? vpLang4('Live performance','أداء الحقيقي','Результат live','लाइव प्रदर्शन') : vpLang4('Demo performance','أداء الديمو','Результат demo','डेमो प्रदर्शन'), pnlTone),
        metricNode('open-trades', vpLang4('Open trades','الصفقات المفتوحة','Открытые сделки','ओपन ट्रेड्स'), String(activePositions), mode === 'real' ? vpLang4('Real positions','مراكز الحقيقي','Позиции real','रियल पोजीशन') : vpLang4('Demo positions','مراكز الديمو','Позиции demo','डेमो पोजीशन'))
      )
    );

    const levelData = state.__dashboardLevelData || {};
    const currentLevel = levelData?.current || state.me?.user_level || null;
    const nextLevel = levelData?.next || state.me?.next_level || null;
    const confirmedDeposits = Number(levelData?.confirmed_deposit_total ?? state.me?.confirmed_deposit_total ?? 0);
    const levelList = Array.isArray(levelData?.levels) ? levelData.levels.slice().sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)) : [];
    const currentIdx = currentLevel ? Math.max(0, levelList.findIndex(l=>String(l.id||'')===String(currentLevel.id||'') || String(l.level_code||'')===String(currentLevel.level_code||''))) : 0;
    const resolvedCurrent = currentLevel || levelList[currentIdx] || null;
    const resolvedNext = (nextLevel && String(nextLevel.id||'') !== String(resolvedCurrent?.id||'')) ? nextLevel : (levelList[currentIdx + 1] || null);
    const currentLevelName = vpLevelDisplayName(resolvedCurrent, currentIdx + 1);
    const nextLevelName = resolvedNext ? vpLevelDisplayName(resolvedNext, currentIdx + 2) : vpTr('Top tier','أعلى مستوى','Максимальный уровень');
    const currentMin = Number(resolvedCurrent?.min_deposit_total || 0);
    const nextMin = Number(resolvedNext?.min_deposit_total || currentMin || 0);
    const targetGap = Math.max(0, nextMin - currentMin);
    const progress = resolvedNext ? Math.max(0, Math.min(100, targetGap > 0 ? ((confirmedDeposits - currentMin) / targetGap) * 100 : 100)) : 100;
    const remainingToNext = resolvedNext ? Math.max(0, nextMin - confirmedDeposits) : 0;
    const currentPerks = vpLevelPerks(resolvedCurrent);
    const nextPerks = vpLevelPerks(resolvedNext);
    const currentTone = vpLevelTone(resolvedCurrent, currentIdx + 1);
    const nextTone = vpLevelTone(resolvedNext, currentIdx + 2);
    const levelCardNode = (lvl, opts={})=>{
      const idx = Number(opts.index || 1);
      const isLocked = !!opts.locked;
      const name = vpLevelDisplayName(lvl, idx);
      const tone = vpLevelTone(lvl, idx);
      const perks = vpLevelPerks(lvl);
      const minTotal = Number(lvl?.min_deposit_total || 0);
      const remain = Math.max(0, minTotal - confirmedDeposits);
      return h('div',{class:`mb-home-level-snap tone-${tone}${isLocked ? ' is-locked' : ' is-current'}`},
        h('div',{class:'mb-home-level-snap-top'},
          h('div',{class:'mb-home-level-snap-k'}, isLocked ? vpTr('Next level','المستوى التالي','Следующий уровень') : vpTr('Current level','المستوى الحالي','Текущий уровень')),
          h('span',{class:'mb-home-level-state ' + (isLocked ? 'locked' : 'active')}, isLocked ? vpTr('Locked','مقفول','Закрыт') : vpTr('Unlocked','مفتوح','Открыт'))
        ),
        h('div',{class:'mb-home-level-snap-name'}, name),
        h('div',{class:'mb-home-level-snap-sub'}, isLocked ? `${vpTr('Remaining','المتبقي','Осталось')}: ${money(remain, 2)}` : vpTr('Unlocked on your account','مفتوح على حسابك','Открыт на вашем счёте')),
        h('div',{class:'mb-home-level-snap-progress'}, h('span',{style:`width:${isLocked ? Math.max(4, progress) : 100}%`})),
        h('div',{class:'mb-home-level-snap-chiprow'}, ...(perks.length ? perks.slice(0,2).map(perk=>h('span',{class:'mb-home-level-chip ' + (isLocked ? 'ghost ' : '') + 'tone-' + tone}, perk)) : [h('span',{class:'mb-home-level-chip ' + (isLocked ? 'ghost ' : '') + 'tone-' + tone}, isLocked ? vpTr('Unlocks later','يفتح لاحقاً','Откроется позже') : vpTr('Live access','متاح الآن','Доступ открыт'))]))
      );
    };
    const levelStripCard = h('div',{class:'card mb-home-level-card strip-compact compact-premium horizontal'},
      h('div',{class:'mb-home-level-topline'},
        h('div',{class:'mb-home-level-kicker'}, vpTr('Access level','مستوى الوصول','Уровень доступа')),
        h('a',{href:'#/invest', class:'mb-home-level-link'}, vpTr('Open earn','فتح الربح','Открыть earn'))
      ),
      h('div',{class:'mb-home-level-scroll'},
        levelCardNode(resolvedCurrent || {name:currentLevelName}, {index: currentIdx + 1, locked:false}),
        resolvedNext ? levelCardNode(resolvedNext, {index: currentIdx + 2, locked:true}) : h('div',{class:'mb-home-level-snap tone-'+currentTone}, h('div',{class:'mb-home-level-snap-top'}, h('div',{class:'mb-home-level-snap-k'}, vpTr('Top tier','أعلى مستوى','Максимальный уровень')), h('span',{class:'mb-home-level-state active'}, vpTr('Max','الأعلى','Макс'))), h('div',{class:'mb-home-level-snap-name'}, currentLevelName), h('div',{class:'mb-home-level-snap-sub'}, vpTr('No higher level remains','لا يوجد مستوى أعلى','Более высокого уровня нет')))
      )
    );

    const quickActions = h('div',{class:'card mb-home-mobile-actions-card compact'},
      h('div',{class:'mb-side-head'}, h('div',{class:'mb-card-title'}, vpLang4('Quick actions','إجراءات سريعة','Быстрые действия','क्विक एक्शंस'))),
      h('div',{class:'mb-home-mobile-actions'},
        h('button',{class:'btn primary', onclick:()=>location.hash='#/wallet?tab=deposit'}, vpLang4('Deposit','إيداع','Пополнение','जमा')),
        h('button',{class:'btn outline', onclick:()=>location.hash='#/wallet?tab=withdraw'}, vpLang4('Withdraw','سحب','Вывод','निकासी')),
        h('button',{class:'btn outline', onclick:()=>location.hash='#/trade'}, vpLang4('Trade','التداول','Торговля','ट्रेड')),
        h('button',{class:'btn outline', onclick:()=>location.hash='#/portfolio'}, vpLang4('Portfolio','المحفظة','Портфель','पोर्टफोलियो'))
      )
    );

    const watchlistCard = vpHomeWatchlistCard(orderedPool);

    const mobileNewsTicker = (typeof newsTickerStrip === 'function') ? newsTickerStrip(8) : null;
    const root = h('div',{class:'mb-page mb-home-mobile-ref mb-home-mobile-ref-v6 mb-home-mobile-ref-v25', 'data-home-live-root':'1'},
      topBar(),
      balanceCard,
      levelStripCard,
      quickActions,
      mobileNewsTicker,
      verifyCard,
      moversCard,
      popularCard,
      vpSafeNode(()=>vpTradingBotCard()),
      watchlistCard,
      bottomNav()
    );
    setTimeout(()=>{
      try{ vpStartHomeLive(root); }catch(e){}
      try{ vpStartHomeSignalDesk(root); }catch(e){}
      try{ vpStartHomeAccountLive(root); }catch(e){}
    }, 0);
    return root;
  };
  try{ window.__vpPhase18Home = __vpHomeDesktop; }catch(e){}
  try{ window._vpPhase1Home = homePage; window.vpPageHome = homePage; }catch(e){}

  function vpResolveTradeDrawerActiveType(currentType){
    const validTabs = ['top20','favorites','crypto','futures','forex','stocks','arab','commodities'];
    const normalizedCurrentType = vpNormalizeAssetType(currentType || state.selectedAssetType || 'crypto');
    const routeWatch = (()=>{ try{ return vpNormalizeTradeWatch(vpReadTradeRouteState()?.watch || ''); }catch(e){ return ''; } })();
    const persistedDrawerType = String(state.__vpTradeDrawerType || '').toLowerCase();
    const drawerOpen = !!state.__vpTradeSymbolsDrawerOpen;
    if(drawerOpen && validTabs.includes(persistedDrawerType) && persistedDrawerType !== 'all') return persistedDrawerType;
    if(validTabs.includes(routeWatch) && routeWatch !== 'all') return routeWatch;
    if(validTabs.includes(normalizedCurrentType)) return normalizedCurrentType;
    if(validTabs.includes(persistedDrawerType) && persistedDrawerType !== 'all') return persistedDrawerType;
    return 'top20';
  }

  function vpOpenTradeSymbolsDrawer(open){
    state.__vpTradeSymbolsDrawerOpen = !!open;
    if(!open) vpStopTradeDrawerLive();
    if(open){
      const activeType = vpResolveTradeDrawerActiveType();
      state.__vpTradeDrawerType = activeType;
      try{ vpEnsureTradeDrawerTypeData(activeType); }catch(e){}
    }
    try{ vpRenderTradeSymbolsDrawerOverlay(); }catch(e){}
  }

  function vpTradeDrawerOverlayHost(){
    try{ return document.getElementById('vp-trade-symbols-overlay-host'); }catch(e){ return null; }
  }

  function vpUnmountTradeSymbolsDrawer(){
    try{ vpStopTradeDrawerLive(); }catch(e){}
    try{
      const host = vpTradeDrawerOverlayHost();
      if(host && host.parentNode) host.parentNode.removeChild(host);
    }catch(e){}
  }

  function vpTradeDrawerOverlayContext(){
    try{
      const route = String(location.hash || '');
      if(route.indexOf('#/trade') !== 0) return null;
      if(!vpIsMobile()) return null;
      const tradeRoute = (typeof getTradeRouteSnapshot === 'function') ? getTradeRouteSnapshot() : null;
      const symbol = String(tradeRoute?.symbol || state.selectedSymbol || 'BTCUSDT').toUpperCase().trim();
      const type = String(tradeRoute?.type || state.selectedAssetType || 'crypto').toLowerCase().trim() || 'crypto';
      if(!symbol) return null;
      return { symbol, type };
    }catch(e){
      return null;
    }
  }

  function vpRenderTradeSymbolsDrawerOverlay(){
    const ctx = vpTradeDrawerOverlayContext();
    if(!state.__vpTradeSymbolsDrawerOpen || !ctx){
      vpUnmountTradeSymbolsDrawer();
      return null;
    }
    const node = vpTradeSymbolsDrawer(ctx.symbol, ctx.type);
    if(!node) return null;
    let host = vpTradeDrawerOverlayHost();
    if(!host){
      host = document.createElement('div');
      host.id = 'vp-trade-symbols-overlay-host';
      try{ document.body.appendChild(host); }catch(e){}
    }
    try{ host.innerHTML = ''; }catch(e){}
    try{ host.appendChild(node); }catch(e){}
    return host;
  }
  try{
    window.addEventListener('hashchange', ()=>{
      try{
        if(String(location.hash || '').indexOf('#/trade') !== 0){
          state.__vpTradeSymbolsDrawerOpen = false;
          vpUnmountTradeSymbolsDrawer();
        }else if(state.__vpTradeSymbolsDrawerOpen){
          vpRenderTradeSymbolsDrawerOverlay();
        }
      }catch(e){}
    }, {passive:true});
  }catch(e){}

  function vpIsCryptoPerpSymbol(symbol, type, market){
    const sym = String(symbol || '').toUpperCase().trim();
    const raw = String(type || '').toLowerCase().trim();
    const mk = String(market || 'spot').toLowerCase().trim();
    if(!sym) return false;
    if(/(_F|1!)$/.test(sym)) return false;
    const looksBinance = /(USDT|USDC|BUSD|FDUSD|BTC|ETH)$/.test(sym);
    if(raw === 'crypto') return looksBinance && mk === 'perp';
    if(raw === 'futures' || raw === 'perpetual' || raw === 'perp') return looksBinance;
    return false;
  }

  function vpResolveLiveMarketForSymbol(symbol, type, market){
    return vpIsCryptoPerpSymbol(symbol, type, market) ? 'perp' : 'spot';
  }

  function vpNormalizeAssetType(type){
    const t = String(type || '').toLowerCase();
    if(t === 'fx') return 'forex';
    if(t === 'metal' || t === 'metals' || t === 'commodity') return 'commodities';
    if(t === 'stock') return 'stocks';
    if(t === 'perpetual' || t === 'perp') return 'futures';
    if(t === 'crypto' || t === 'forex' || t === 'stocks' || t === 'commodities' || t === 'indices' || t === 'futures' || t === 'arab') return t;
    return t || 'crypto';
  }

  function vpMergeMarketItemsByKey(existing, incoming){
    const map = new Map();
    const mergeOne = (prev, next, type)=>{
      try{
        if(typeof window.vpMergeMarketItemAuthority === 'function') return window.vpMergeMarketItemAuthority(prev, next, type);
      }catch(e){}
      return Object.assign({}, prev || {}, next || {});
    };
    const push = (items)=>{
      (Array.isArray(items) ? items : []).forEach(item=>{
        const sym = String(item?.symbol || '').toUpperCase();
        const type = vpNormalizeAssetType(item?.type || 'crypto');
        if(!sym) return;
        const key = `${type}:${sym}`;
        const normalized = Object.assign({}, item, {symbol:sym, type});
        map.set(key, map.has(key) ? mergeOne(map.get(key), normalized, type) : normalized);
      });
    };
    push(existing);
    push(incoming);
    return [...map.values()];
  }

  function vpCompactNumber(num){
    const n = Number(num || 0);
    if(!Number.isFinite(n)) return '0';
    try{
      return new Intl.NumberFormat('en', {notation:'compact', maximumFractionDigits:1}).format(n);
    }catch(e){
      if(Math.abs(n) >= 1e9) return `${fmt(n/1e9,1)}B`;
      if(Math.abs(n) >= 1e6) return `${fmt(n/1e6,1)}M`;
      if(Math.abs(n) >= 1e3) return `${fmt(n/1e3,1)}K`;
      return fmt(n,0);
    }
  }

  function vpTradeDrawerSortKey(){
    const raw = String(state.__vpTradeDrawerSort || 'volume').toLowerCase();
    return ['movers','volume','gainers','losers','quiet','az'].includes(raw) ? raw : 'volume';
  }

  function vpTradeDrawerUniverse(currentType){
    const types = ['crypto','futures','forex','stocks','arab','commodities'];
    const cache = (state.__vpTradeDrawerMarketCache && typeof state.__vpTradeDrawerMarketCache === 'object') ? state.__vpTradeDrawerMarketCache : {};
    const rows = [];
    const seen = new Set();
    const pushMany = (items)=>{
      (Array.isArray(items) ? items : []).forEach(item=>{
        if(item && item.__loading){ return; }
        const sym = String(item?.symbol || '').toUpperCase();
        const type = vpNormalizeAssetType(item?.type || fallbackType || 'crypto');
        const display = vpInstrumentDisplay(Object.assign({}, item || {}, {type, symbol:sym}));
        if(!sym) return;
        const key = `${type}:${sym}`;
        if(seen.has(key)) return;
        seen.add(key);
        rows.push(Object.assign({}, item, {type}));
      });
    };
    pushMany(state.markets || []);
    types.forEach(type=>{
      try{ if(typeof warmMarketsFromLocal === 'function') pushMany(warmMarketsFromLocal(type) || []); }catch(e){}
      pushMany(cache[type] || []);
    });
    return rows;
  }

  function vpTradeDrawerShouldPaint(type){
    try{
      const mapped = vpNormalizeAssetType(type || 'crypto');
      const active = vpNormalizeAssetType(state.__vpTradeDrawerType || '');
      return !!state.__vpTradeSymbolsDrawerOpen && (!active || active === mapped);
    }catch(e){
      return !!state.__vpTradeSymbolsDrawerOpen;
    }
  }

  function vpTradeDrawerItemsSignature(items){
    try{
      return (Array.isArray(items) ? items : []).slice(0, 48).map(item=>{
        const sym = String(item?.symbol || '').toUpperCase();
        const price = Number(item?.price || 0);
        const ts = Number(item?.updated_at || 0);
        return `${sym}:${price}:${ts}`;
      }).join('|');
    }catch(e){
      return '';
    }
  }

  async function vpTradeDrawerDirectMarketsFetch(type, opts={}){
    const mapped = vpNormalizeAssetType(type || 'crypto');
    const ttlMs = Math.max(350, Number(opts.ttlMs || 900));
    try{
      if(typeof apiGetCached === 'function'){
        const r = await apiGetCached(`/markets.php?type=${encodeURIComponent(mapped)}&lite=1`, ttlMs);
        let items = Array.isArray(r?.items) ? r.items : (Array.isArray(r) ? r : []);
        if(typeof vpOverlayMarketsWithFreshQuotes === 'function') items = vpOverlayMarketsWithFreshQuotes(items, mapped);
        if(Array.isArray(items) && items.length && typeof persistMarketsLocal === 'function'){
          try{ persistMarketsLocal(mapped, items); }catch(e){}
        }
        return Array.isArray(items) ? items : [];
      }
    }catch(e){}
    return [];
  }

  async function vpTradeDrawerFetchMarkets(type, opts={}){
    const mapped = vpNormalizeAssetType(type || 'crypto');
    const cache = state.__vpTradeDrawerMarketCache = (state.__vpTradeDrawerMarketCache && typeof state.__vpTradeDrawerMarketCache === 'object') ? state.__vpTradeDrawerMarketCache : {};
    const warm = (typeof warmMarketsFromLocal === 'function') ? (warmMarketsFromLocal(mapped) || []) : [];
    const cached = Array.isArray(cache[mapped]) ? cache[mapped] : [];
    const fromState = (state.markets || []).filter(x=>vpNormalizeAssetType(x?.type || '') === mapped);
    const mergedWarm = vpMergeMarketItemsByKey(vpMergeMarketItemsByKey(cached, warm), fromState);
    if(mergedWarm.length){
      cache[mapped] = mergedWarm;
      try{ if(typeof persistMarketsLocal === 'function') persistMarketsLocal(mapped, mergedWarm); }catch(e){}
      if(!opts.force && !opts.backgroundOnly){
        Promise.resolve().then(()=>vpTradeDrawerDirectMarketsFetch(mapped, { ttlMs: Math.max(450, Number(opts.ttlMs || 900)) }))
          .then(items=>{
            if(Array.isArray(items) && items.length){
              cache[mapped] = vpMergeMarketItemsByKey(cache[mapped] || mergedWarm, items);
              const sigStore = state.__vpTradeDrawerMarketSig = (state.__vpTradeDrawerMarketSig && typeof state.__vpTradeDrawerMarketSig === 'object') ? state.__vpTradeDrawerMarketSig : {};
              const nextSig = vpTradeDrawerItemsSignature(cache[mapped]);
              if(sigStore[mapped] !== nextSig){
                sigStore[mapped] = nextSig;
                try{ if(vpTradeDrawerShouldPaint(mapped)){ vpRenderTradeSymbolsDrawerOverlay(); } }catch(e){}
              }
            }
          }).catch(()=>{});
        return mergedWarm;
      }
    }
    const key = `${mapped}:${opts.force ? 'force' : 'warm'}`;
    const inflightMap = state.__vpTradeDrawerFetchInflight = (state.__vpTradeDrawerFetchInflight && typeof state.__vpTradeDrawerFetchInflight === 'object') ? state.__vpTradeDrawerFetchInflight : {};
    if(inflightMap[key]) return inflightMap[key];
    state.__vpTradeDrawerLoadingType = mapped;
    inflightMap[key] = Promise.resolve()
      .then(()=>vpTradeDrawerDirectMarketsFetch(mapped, { ttlMs: opts.force ? 0 : Math.max(500, Number(opts.ttlMs || 900)) }))
      .then(async(items)=>{
        let normalized = Array.isArray(items) ? items : [];
        if(!normalized.length && typeof refreshMarkets === 'function'){
          try{
            normalized = await refreshMarkets({
              type:mapped,
              lite:true,
              withQuotes:mapped !== 'crypto',
              applyToState:false,
              warm:true,
              ttlMs: opts.force ? 0 : Math.max(600, Number(opts.ttlMs || 1200))
            });
          }catch(e){}
        }
        cache[mapped] = vpMergeMarketItemsByKey(mergedWarm, normalized || []);
        const sigStore = state.__vpTradeDrawerMarketSig = (state.__vpTradeDrawerMarketSig && typeof state.__vpTradeDrawerMarketSig === 'object') ? state.__vpTradeDrawerMarketSig : {};
        sigStore[mapped] = vpTradeDrawerItemsSignature(cache[mapped]);
        return cache[mapped];
      })
      .catch(()=>mergedWarm)
      .finally(()=>{
        try{ delete inflightMap[key]; }catch(e){}
        if(state.__vpTradeDrawerLoadingType === mapped) state.__vpTradeDrawerLoadingType = '';
        try{ if(!opts.backgroundOnly && vpTradeDrawerShouldPaint(mapped)){ vpRenderTradeSymbolsDrawerOverlay(); } }catch(e){}
      });
    return inflightMap[key];
  }

  function vpPrimeTradeDrawerData(){
    const now = Date.now();
    const last = Number(state.__vpTradeDrawerPrimedAt || 0);
    if(state.__vpTradeDrawerPriming) return;
    if(last && (now - last) < 12000) return;
    const active = vpNormalizeAssetType(state.__vpTradeDrawerType || state.selectedAssetType || 'crypto');
    const selected = vpNormalizeAssetType(state.selectedAssetType || active || 'crypto');
    const types = [...new Set([active, selected].filter(type => ['crypto','futures','forex','stocks','arab','commodities'].includes(type)))];
    if(!types.length) return;
    state.__vpTradeDrawerPriming = true;
    Promise.allSettled(types.map(type=>vpTradeDrawerFetchMarkets(type, { backgroundOnly:true, ttlMs: type === 'crypto' ? 900 : 1100 })))
      .finally(()=>{
        state.__vpTradeDrawerPriming = false;
        state.__vpTradeDrawerPrimedAt = Date.now();
      });
  }

  function vpEnsureTradeDrawerTypeData(type, opts={}){
    const mapped = vpNormalizeAssetType(type || 'crypto');
    if(mapped === 'top20') return;
    const cache = state.__vpTradeDrawerMarketCache = (state.__vpTradeDrawerMarketCache && typeof state.__vpTradeDrawerMarketCache === 'object') ? state.__vpTradeDrawerMarketCache : {};
    const warm = (typeof warmMarketsFromLocal === 'function') ? (warmMarketsFromLocal(mapped) || []) : [];
    const fromState = (state.markets || []).filter(x=>vpNormalizeAssetType(x?.type || '') === mapped);
    if(!opts.force && ((Array.isArray(cache[mapped]) && cache[mapped].length) || (Array.isArray(warm) && warm.length) || fromState.length)) return;
    if(state.__vpTradeDrawerLoadingType === mapped && !opts.force) return;
    vpTradeDrawerFetchMarkets(mapped, { force: !!opts.force, ttlMs: opts.force ? 0 : 1400 }).catch(()=>{});
  }

  function vpTradeDrawerItems(filterType, term, currentType, sortKey){
    const rawRows = vpTradeDrawerUniverse(currentType);
    const rows = (typeof vpOverlayMarketsWithFreshQuotes === 'function') ? vpOverlayMarketsWithFreshQuotes(rawRows, currentType) : rawRows;
    const q = String(term || '').trim().toUpperCase();
    const mapped = vpNormalizeAssetType(filterType || currentType || 'top20');
    const fallbackType = mapped === 'top20' ? vpNormalizeAssetType(currentType || 'crypto') : mapped;
    const normalized = rows.map(item=>{
      const cloned = Object.assign({}, item);
      cloned.type = vpNormalizeAssetType(item?.type || fallbackType || 'crypto');
      cloned.volume = Number(item?.volume ?? item?.quoteVolume ?? item?.turnover ?? item?.vol ?? 0);
      cloned.market_cap = Number(item?.market_cap ?? item?.marketCap ?? 0);
      cloned.market_rank = Number(item?.market_rank ?? item?.rank ?? 0);
      cloned.sort_order = Number(item?.sort_order ?? 0);
      cloned.change_pct = Number(item?.change_pct ?? 0);
      cloned.price = Number(item?.price ?? 0);
      cloned.__size = vpMarketSizeValue(cloned);
      cloned.__rank = vpMarketRankValue(cloned);
      return cloned;
    });

    let filtered = normalized.filter(item=>{
      const sym = String(item?.symbol || '').toUpperCase();
      const nm = String(item?.name || '').toUpperCase();
      const type = vpNormalizeAssetType(item?.type || activeType || 'crypto');
      const typePass = mapped === 'top20' ? true : (mapped === 'favorites' ? getFavorites().includes(sym) : type === mapped);
      return typePass && (!q || sym.includes(q) || nm.includes(q));
    });

    const key = String(sortKey || vpTradeDrawerSortKey()).toLowerCase();
    if(key === 'gainers'){
      const pos = filtered.filter(item=>Number(item?.change_pct || 0) > 0);
      filtered = (pos.length ? pos : filtered).sort((a,b)=>Number(b?.change_pct || 0) - Number(a?.change_pct || 0) || Number(b?.__size || 0) - Number(a?.__size || 0) || Number(a?.__rank || 0) - Number(b?.__rank || 0));
    }else if(key === 'losers'){
      const neg = filtered.filter(item=>Number(item?.change_pct || 0) < 0);
      filtered = (neg.length ? neg : filtered).sort((a,b)=>Number(a?.change_pct || 0) - Number(b?.change_pct || 0) || Number(b?.__size || 0) - Number(a?.__size || 0) || Number(a?.__rank || 0) - Number(b?.__rank || 0));
    }else if(key === 'volume'){
      filtered = filtered.sort((a,b)=>Number(b?.__size || 0) - Number(a?.__size || 0) || Number(a?.__rank || 0) - Number(b?.__rank || 0) || Math.abs(Number(b?.change_pct || 0)) - Math.abs(Number(a?.change_pct || 0)) || String(a?.symbol || '').localeCompare(String(b?.symbol || '')));
    }else if(key === 'quiet'){
      filtered = filtered.sort((a,b)=>Math.abs(Number(a?.change_pct || 0)) - Math.abs(Number(b?.change_pct || 0)) || Number(b?.__size || 0) - Number(a?.__size || 0) || Number(a?.__rank || 0) - Number(b?.__rank || 0));
    }else if(key === 'az'){
      filtered = filtered.sort((a,b)=>String(a?.symbol || '').localeCompare(String(b?.symbol || '')));
    }else{
      filtered = filtered.sort((a,b)=>Math.abs(Number(b?.change_pct || 0)) - Math.abs(Number(a?.change_pct || 0)) || Number(b?.__size || 0) - Number(a?.__size || 0) || Number(a?.__rank || 0) - Number(b?.__rank || 0) || String(a?.symbol || '').localeCompare(String(b?.symbol || '')));
    }

    return filtered.slice(0, mapped === 'top20' ? 20 : (mapped === 'favorites' ? 80 : 160));
  }


  function vpStopTradeDrawerLive(){
    try{ if(state.__vpTradeDrawerLiveTimer) clearInterval(state.__vpTradeDrawerLiveTimer); }catch(e){}
    state.__vpTradeDrawerLiveTimer = null;
    state.__vpTradeDrawerLiveInflight = false;
  }

  function vpResolveAuthorityLive(item, fallbackType, fallbackMarket){
    try{
      if(!item) return null;
      const symbol = String(item?.symbol || '').toUpperCase();
      const type = vpNormalizeAssetType(fallbackType || item?.type || state.selectedAssetType || 'crypto');
      const market = String(fallbackMarket || item?.market || ((type === 'crypto' || type === 'futures') ? 'perp' : 'spot')).toLowerCase();
      const itemPrice = Number(item?.price || item?.last || item?.mark_price || 0);
      const itemSource = String(item?.source || item?.provider || '').trim();
      const itemUpdatedAt = Number(item?.updated_at || item?.ts || item?.time || 0) || 0;
      const itemIsTrusted = (type === 'crypto') || (typeof window.isTrustedUiLiveSource === 'function' ? window.isTrustedUiLiveSource(itemSource, symbol, type) : true);
      const itemLooksFresh = itemUpdatedAt > 0 ? ((Date.now()/1000) - itemUpdatedAt) <= (type === 'crypto' ? 20 : 4) : false;
      if(itemPrice > 0 && itemIsTrusted && (itemLooksFresh || !itemUpdatedAt)){
        return Object.assign({}, item || {}, { symbol, type, market, price:itemPrice, change_pct:Number(item?.change_pct ?? item?.changePct ?? 0) || 0, source:String(itemSource || '').toLowerCase() });
      }
      let canonical = null;
      try{
        if(typeof window.vpCanonicalQuoteForUi === 'function') canonical = window.vpCanonicalQuoteForUi(symbol, type, market, { maxAgeSec: type === 'crypto' ? 12 : 2 });
      }catch(e){}
      if(canonical && Number(canonical?.price || canonical?.last || canonical?.mark_price || 0) > 0){
        return Object.assign({}, item || {}, canonical, { symbol, type, market });
      }
      if(!(itemPrice > 0)) return null;
      return Object.assign({}, item || {}, { symbol, type, market, price:itemPrice, change_pct:Number(item?.change_pct ?? item?.changePct ?? 0) || 0, source:String(itemSource || '').toLowerCase() });
    }catch(e){
      return null;
    }
  }

  function vpApplyTradeDrawerLiveRow(row, item){
    if(!row || !item) return;
    const priceEl = row.querySelector('.vp-symbols-row-price');
    const changeEl = row.querySelector('.vp-symbols-row-change');
    const rowType = vpNormalizeAssetType(row.getAttribute('data-type') || item?.type || state.selectedAssetType || 'crypto');
    const rowMarket = String(item?.market || ((rowType === 'crypto' || rowType === 'futures') ? 'perp' : 'spot')).toLowerCase();
    const resolved = vpResolveAuthorityLive(item, rowType, rowMarket) || item;
    const price = Number(resolved?.price || resolved?.last || resolved?.mark_price || 0);
    const change = Number(resolved?.change_pct ?? resolved?.changePct ?? 0);
    const sig = `${price}|${change}`;
    try{ if(String(row.dataset.liveSig || '') === sig) return; }catch(_e){}
    try{ row.dataset.liveSig = sig; }catch(_e){}
    if(priceEl) priceEl.textContent = price > 0 ? money(price, price < 1 ? 4 : 2) : '—';
    if(changeEl){
      changeEl.textContent = percentText(change);
      changeEl.className = 'vp-symbols-row-change ' + changeClass(change);
    }
  }

  function vpSyncTradeDrawerActiveRow(item){
    try{
      if(!item || !state.__vpTradeSymbolsDrawerOpen) return;
      const symbol = String(item?.symbol || '').toUpperCase();
      if(!symbol) return;
      const type = vpNormalizeAssetType(item?.type || state.selectedAssetType || 'crypto');
      const nextMarket = String(item?.market || ((type === 'crypto' || type === 'futures') ? 'perp' : 'spot')).toLowerCase();
      try{
        const cache = state.__vpTradeDrawerMarketCache = (state.__vpTradeDrawerMarketCache && typeof state.__vpTradeDrawerMarketCache === 'object') ? state.__vpTradeDrawerMarketCache : {};
        const rows = Array.isArray(cache[type]) ? cache[type] : [];
        if(rows.length){
          cache[type] = rows.map(entry=>{
            const entrySym = String(entry?.symbol || '').toUpperCase();
            const entryType = vpNormalizeAssetType(entry?.type || type);
            return (entrySym === symbol && entryType === type)
              ? Object.assign({}, entry, item, { symbol, type, market:nextMarket, updated_at:Number(item?.updated_at || entry?.updated_at || 0) || Math.floor(Date.now()/1000) })
              : entry;
          });
        }
      }catch(_cacheErr){}
      const rows = [...document.querySelectorAll(`.vp-symbols-row[data-symbol="${symbol}"][data-type="${type}"]`)];
      rows.forEach(row=>{ try{ vpApplyTradeDrawerLiveRow(row, Object.assign({}, item, { symbol, type, market:nextMarket })); }catch(_rowErr){} });
    }catch(e){}
  }
  try{ window.vpSyncTradeDrawerActiveRow = vpSyncTradeDrawerActiveRow; }catch(_e){}

  function vpTradeDrawerPatchCacheFromLive(type, liveItems){
    try{
      const mapped = vpNormalizeAssetType(type || 'crypto');
      const items = Array.isArray(liveItems) ? liveItems.filter(Boolean) : [];
      if(!items.length) return;
      const cache = state.__vpTradeDrawerMarketCache = (state.__vpTradeDrawerMarketCache && typeof state.__vpTradeDrawerMarketCache === 'object') ? state.__vpTradeDrawerMarketCache : {};
      cache[mapped] = vpMergeMarketItemsByKey(cache[mapped] || [], items.map(item=>Object.assign({}, item, { type:mapped, symbol:String(item?.symbol || '').toUpperCase() })));
      try{ if(typeof persistMarketsLocal === 'function') persistMarketsLocal(mapped, cache[mapped]); }catch(e){}
    }catch(e){}
  }

  async function vpTradeDrawerLiveTick(list){
    if(!list || state.__vpTradeDrawerLiveInflight) return;
    try{ if(document && document.hidden) return; }catch(e){}
    const allRows = [...list.querySelectorAll('.vp-symbols-row[data-symbol][data-type]')];
    if(!allRows.length) return;

    const listRect = list.getBoundingClientRect();
    const currentSym = String(state.selectedSymbol || '').toUpperCase();
    const currentType = vpNormalizeAssetType(state.selectedAssetType || 'crypto');
    const visibleRows = allRows.filter(row=>{
      try{
        const rect = row.getBoundingClientRect();
        return rect.bottom >= (listRect.top - 24) && rect.top <= (listRect.bottom + 24);
      }catch(e){ return false; }
    });

    const priority = [];
    const seenKeys = new Set();
    const pushRow = (row)=>{
      if(!row) return;
      const key = `${row.getAttribute('data-type')||''}:${row.getAttribute('data-symbol')||''}`;
      if(seenKeys.has(key)) return;
      seenKeys.add(key);
      priority.push(row);
    };

    allRows.forEach(row=>{
      const sym = String(row.getAttribute('data-symbol') || '').toUpperCase();
      const type = vpNormalizeAssetType(row.getAttribute('data-type') || 'crypto');
      if(sym === currentSym && type === currentType) pushRow(row);
    });
    visibleRows.forEach(pushRow);

    const chunkSize = 12;
    const rotated = [];
    const byType = new Map();
    allRows.forEach(row=>{
      const type = vpNormalizeAssetType(row.getAttribute('data-type') || 'crypto');
      if(!byType.has(type)) byType.set(type, []);
      byType.get(type).push(row);
    });
    for(const [type, rows] of byType.entries()){
      const key = `__vpTradeDrawerChunk_${type}`;
      const start = Number(state[key] || 0) % Math.max(rows.length, 1);
      for(let i=0; i<Math.min(chunkSize, rows.length); i += 1){
        pushRow(rows[(start + i) % rows.length]);
      }
      state[key] = (start + chunkSize) % Math.max(rows.length, 1);
    }

    const activeDrawerType = vpNormalizeAssetType(state.__vpTradeDrawerType || '');
    const scopedPriority = (activeDrawerType && activeDrawerType !== 'top20' && activeDrawerType !== 'favorites')
      ? priority.filter(row=>vpNormalizeAssetType(row.getAttribute('data-type') || 'crypto') === activeDrawerType)
      : priority;
    const rows = scopedPriority.slice(0, 24);
    if(!rows.length) return;

    state.__vpTradeDrawerLiveInflight = true;
    try{
      const groups = new Map();
      rows.forEach(row=>{
        const type = vpNormalizeAssetType(row.getAttribute('data-type') || 'crypto');
        const symbol = String(row.getAttribute('data-symbol') || '').toUpperCase();
        if(!symbol) return;
        if(!groups.has(type)) groups.set(type, []);
        groups.get(type).push(symbol);
      });

      for(const [type, symbolsRaw] of groups.entries()){
        const symbols = [...new Set(symbolsRaw)].slice(0, 18);
        if(!symbols.length) continue;
        const map = (typeof window.getCanonicalQuoteMap === 'function')
          ? window.getCanonicalQuoteMap(symbols, type, (type === 'crypto' || type === 'futures') ? 'perp' : 'spot', { maxAgeSec: type === 'crypto' ? 4 : 2 })
          : new Map();
        let items = [];
        const visibleSymbols = [...new Set(visibleRows
          .filter(row=>vpNormalizeAssetType(row.getAttribute('data-type') || 'crypto') === type)
          .map(row=>String(row.getAttribute('data-symbol') || '').toUpperCase())
          .filter(Boolean))].slice(0, type === 'crypto' ? 18 : 12);
        const missing = symbols.filter(sym=>!map.has(sym));
        const shouldForceVisibleFetch = type !== 'crypto' && visibleSymbols.length > 0;
        const fetchSymbols = shouldForceVisibleFetch ? visibleSymbols : missing.slice(0, type === 'crypto' ? 18 : 8);
        if(fetchSymbols.length){
          try{
            const useDirect = type !== 'crypto' && fetchSymbols.length === 1;
            const path = (type === 'crypto')
              ? `/quotes.php?fresh=1&type=${encodeURIComponent(type)}&symbols=${encodeURIComponent(fetchSymbols.join(','))}`
              : `/quotes.php?type=${encodeURIComponent(type)}&symbols=${encodeURIComponent(fetchSymbols.join(','))}${useDirect ? '&direct=1' : '&visible=1'}`;
            const timeoutMs = (type === 'commodities') ? 7600 : ((type === 'forex') ? 7000 : ((type === 'stocks' || type === 'arab') ? 8500 : (type === 'futures' ? 7200 : 5000)));
            const resp = (typeof apiLiveQuotes === 'function')
              ? await apiLiveQuotes(path, type, timeoutMs)
              : await api(path, { timeoutMs });
            items = Array.isArray(resp?.items) ? resp.items : [];
          }catch(e){ items = []; }
        }
        items = (Array.isArray(items) ? items : []).filter(item=>{
          const sym = String(item?.symbol || '').toUpperCase();
          const src = String(item?.source || item?.provider || '').trim();
          return Number(item?.price || item?.last || item?.mark_price || 0) > 0 && ((type === 'crypto') || (typeof window.isTrustedUiLiveSource === 'function' ? window.isTrustedUiLiveSource(src, sym, type) : true));
        });
        items.forEach(item=>{ const sym = String(item?.symbol || '').toUpperCase(); if(sym) map.set(sym, item); });
        if(symbols.some(sym=>!map.has(sym)) && type === 'crypto'){
          try{
            const spotSymbols = [];
            const perpSymbols = [];
            symbols.filter(sym=>!map.has(sym)).forEach(sym=>{
              const eff = vpResolveLiveMarketForSymbol(sym, type, 'perp');
              if(eff === 'perp') perpSymbols.push(sym); else spotSymbols.push(sym);
            });
            const pull = async (list, market)=>{
              if(!list.length) return [];
              const resp = await api(`/trade/stream.php?lite=1&type=${encodeURIComponent(type)}&market=${encodeURIComponent(market)}&symbols=${encodeURIComponent(list.join(','))}&_=${Date.now()}`);
              return resp?.quotes && typeof resp.quotes === 'object' ? Object.values(resp.quotes) : [];
            };
            [ ...(await pull(spotSymbols, 'spot')), ...(await pull(perpSymbols, 'perp')) ].forEach(item=>{
              const sym = String(item?.symbol || '').toUpperCase();
              if(sym) map.set(sym, item);
            });
          }catch(err){}
        }
        rows.filter(row=>vpNormalizeAssetType(row.getAttribute('data-type') || 'crypto') === type).forEach(row=>{
          const sym = String(row.getAttribute('data-symbol') || '').toUpperCase();
          const live = map.get(sym);
          const liveSource = String(live?.source || live?.provider || '').trim();
          const trustedLive = (type === 'crypto') || (typeof window.isTrustedUiLiveSource === 'function' ? window.isTrustedUiLiveSource(liveSource, sym, type) : true);
          if(!live || !(Number(live?.price || live?.last || live?.mark_price || 0) > 0) || !trustedLive) return;
          const normalizedLive = Object.assign({}, live, { symbol:sym, type, market:(type === 'crypto' || type === 'futures') ? 'perp' : 'spot' });
          try{ if(typeof vpRememberLiveQuote === 'function') vpRememberLiveQuote(normalizedLive); }catch(err){}
          try{ if(typeof VPQuoteStore !== 'undefined' && VPQuoteStore && typeof VPQuoteStore.ingest === 'function') VPQuoteStore.ingest(normalizedLive, { source:'trade_drawer_live_tick' }); }catch(err){}
          const resolvedLive = vpResolveAuthorityLive(normalizedLive, type, normalizedLive.market) || normalizedLive;
          vpApplyTradeDrawerLiveRow(row, resolvedLive);
          try{
            if(Array.isArray(state.markets)){
              state.markets = state.markets.map(it=>String(it?.symbol || '').toUpperCase() === sym && vpNormalizeAssetType(it?.type || '') === type
                ? vpMergeMarketItemsByKey([it], [Object.assign({}, resolvedLive, {symbol:sym, type})])[0]
                : it);
            }
          }catch(e){}
        });
      }
    }finally{
      state.__vpTradeDrawerLiveInflight = false;
    }
  }

  function vpStartTradeDrawerLive(list){
    vpStopTradeDrawerLive();
    if(!list) return;
    const liveTick = ()=>{ try{ if(document.hidden || !state.__vpTradeSymbolsDrawerOpen || !list.isConnected) return; vpTradeDrawerLiveTick(list); }catch(e){} };
    Promise.resolve().then(liveTick);
    const liveType = String(state.__vpTradeDrawerType || '').toLowerCase();
    const liveEvery = (liveType === 'crypto') ? 900 : ((liveType === 'commodities') ? 2600 : ((liveType === 'forex') ? 2800 : ((liveType === 'stocks' || liveType === 'arab') ? 3200 : 3000)));
    state.__vpTradeDrawerLiveTimer = setInterval(liveTick, liveEvery);
  }

  function vpTradeSymbolsDrawer(currentSymbol, currentType){
    const validTabs = ['top20','favorites','crypto','futures','forex','stocks','arab','commodities'];
    const activeType = vpResolveTradeDrawerActiveType(currentType || 'crypto');
    state.__vpTradeDrawerType = activeType;
    const activeSort = vpTradeDrawerSortKey();
    const term = String(state.__vpTradeDrawerSearch || '');
    const tabs = [
      {key:'top20', label:vpLang4('Top 20','الأعلى 20','Топ 20','Top 20')},
      {key:'favorites', label:vpLang4('Favorites','المفضلة','Избранное','पसंदीदा')},
      {key:'crypto', label:vpLang4('Crypto','كريبتو','Крипто','Crypto')},
      {key:'futures', label:vpLang4('Perpetual','العقود الدائمة','Бессрочные','Perpetual')},
      {key:'forex', label:vpLang4('Forex','فوركس','Форекс','Forex')},
      {key:'stocks', label:vpLang4('Stocks','الأسهم','Акции','Stocks')},
      {key:'arab', label:vpLang4('Arab Stocks','الأسهم العربية','Арабские акции','Arab Stocks')},
      {key:'commodities', label:vpLang4('Commodities','السلع','Товары','कमोडिटीज')}
    ];
    const filters = [
      {key:'movers', label:vpLang4('24h Move','تغير 24س','Изм. 24ч','24h Move')},
      {key:'volume', label:vpLang4('Size','الحجم','Размер','Size')},
      {key:'gainers', label:vpLang4('Gainers','الصاعدين','Лидеры роста','Gainers')},
      {key:'losers', label:vpLang4('Losers','الهابطين','Лидеры падения','Losers')},
      {key:'quiet', label:vpLang4('Quiet','الهادئة','Спокойные','Quiet')}
    ];
    vpEnsureTradeDrawerTypeData(activeType);
    let rows = vpTradeDrawerItems(activeType, term, currentType, activeSort);
    if(!rows.length && activeType !== 'top20'){
      vpEnsureTradeDrawerTypeData(activeType);
    }
    const redrawDrawer = ()=>{ try{ vpRenderTradeSymbolsDrawerOverlay(); }catch(e){} };
    const close = ()=>{ vpStopTradeDrawerLive(); vpOpenTradeSymbolsDrawer(false); };
    const search = h('input',{
      class:'input vp-symbols-search',
      placeholder:`${vpLang4('Search','بحث','Поиск','Search')} ${tabs.find(tab=>tab.key === activeType)?.label || vpLang4('Symbols','الرموز','Символы','Symbols')}`,
      value: term,
      oninput:(e)=>{ state.__vpTradeDrawerSearch = e.target.value || ''; redrawDrawer(); }
    });
    const renderedRows = rows.length ? rows : (state.__vpTradeDrawerLoadingType === activeType ? [{__loading:true}] : []);
    const list = h('div',{class:'vp-symbols-list'},
      ...(renderedRows.length ? renderedRows.map(item=>{
        if(item && item.__loading){
          return h('div',{class:'muted small vp-symbols-empty'}, `${vpLang4('Loading','جاري تحميل','Загрузка','Loading')} ${tabs.find(tab=>tab.key === activeType)?.label || vpLang4('symbols','الرموز','символы','symbols')}…`);
        }
        const sym = String(item?.symbol || '').toUpperCase();
        const type = vpNormalizeAssetType(item?.type || currentType || 'crypto');
        const rowMarket = (type === 'crypto' || type === 'futures') ? 'perp' : 'spot';
        const displayLive = vpResolveAuthorityLive(item, type, rowMarket) || Object.assign({}, item || {}, { symbol:sym, type, market:rowMarket });
        const display = vpInstrumentDisplay(Object.assign({}, item || {}, displayLive || {}, {type, symbol:sym}));
        const ch = Number(displayLive?.change_pct ?? item?.change_pct ?? 0);
        const active = sym === String(currentSymbol || '').toUpperCase();
        const fav = getFavorites().includes(sym);
        const vol = Number(item?.volume || 0);
        return h('button',{class:'vp-symbols-row' + (active ? ' active' : ''), type:'button', 'data-symbol':sym, 'data-type':type, onclick:(e)=>{
          try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){}
          const nextMarket = vpNormalizeTradeMarket(type, (type === 'crypto' || type === 'futures') ? 'perp' : 'spot', sym);
          state.__vpTradeDrawerType = type;
          try{
            state.__tradeSeedQuote = {
              symbol: sym,
              type,
              market: nextMarket,
              price: Number(displayLive?.price || item?.price || 0),
              change_pct: Number(displayLive?.change_pct ?? item?.change_pct ?? 0),
              updated_at: Number(displayLive?.updated_at || item?.updated_at || 0) || 0,
              source: String(displayLive?.source || item?.source || item?.provider || 'drawer_selection').toLowerCase()
            };
          }catch(err){}
          try{ vpOpenTradeSymbolsDrawer(false); }catch(err){}
          try{
            if(typeof vpCommitTradeRoute === 'function'){
              vpCommitTradeRoute({ symbol: sym, type, market: nextMarket, watch: vpNormalizeAssetType(type), search: '' }, { source:'symbols_drawer', settleMs: 1500 });
              return false;
            }
          }catch(err){}
          try{
            const params = new URLSearchParams();
            params.set('symbol', sym);
            params.set('type', type);
            params.set('market', nextMarket);
            params.set('watch', vpNormalizeAssetType(type));
            replaceHashQuery('#/trade', params);
          }catch(err){}
          return false;
        }},
          h('div',{class:'vp-symbols-row-main'},
            h('div',{class:'vp-symbols-row-ident'},
              vpMarketAvatar(item, sym, 'sm'),
              h('div',{class:'vp-symbols-row-copy'},
                h('div',{class:'vp-symbols-row-top'},
                  h('span',{class:'vp-symbols-row-sym'}, display.primary),
                  (type === 'arab' && display.symbol) ? h('span',{class:'pill ghost vp-code-pill'}, display.symbol) : (fav ? h('span',{class:'pill'}, '★') : h('span',{class:'pill ghost'}, vpMarketTypeLabel(type))),
                  (item?.market_cap || vol > 0) ? h('span',{class:'vp-symbols-row-vol'}, `${activeSort === 'volume' ? 'Size' : 'Vol'} ${vpCompactNumber((Number(item?.market_cap || 0) > 0) ? Number(item.market_cap) : vol)}`) : null
                ),
                h('div',{class:'vp-symbols-row-name'}, display.secondary || instrumentName(item))
              )
            )
          ),
          h('div',{class:'vp-symbols-row-side'},
            h('div',{class:'vp-symbols-row-change ' + changeClass(ch)}, percentText(ch)),
            h('div',{class:'vp-symbols-row-price'}, money(Number(displayLive?.price || item?.price || 0), Number(displayLive?.price || item?.price || 0) < 1 ? 4 : 2))
          )
        );
      }) : [h('div',{class:'muted small vp-symbols-empty'}, vpLang4('No symbols found.','لم يتم العثور على رموز.','Символы не найдены.','No symbols found.'))])
    );
    setTimeout(()=>{ try{ vpStartTradeDrawerLive(list); }catch(e){} }, 20);
    return h('div',{class:'vp-symbols-drawer-wrap'},
      h('button',{class:'vp-symbols-backdrop', type:'button', onclick:close, 'aria-label':'Close symbols'}),
      h('aside',{class:'vp-symbols-drawer', onclick:(e)=>e.stopPropagation(), 'data-scroll-key':'trade-symbols-drawer'},
        h('div',{class:'vp-symbols-head'},
          h('div',{},
            h('div',{class:'mb-card-title'}, vpLang4('Symbols','الرموز','Символы','Symbols')),
            h('div',{class:'muted tiny'}, activeType === 'top20' ? vpLang4('Top 20 movers in the last 24 hours.','أقوى 20 حركة خلال آخر 24 ساعة.','Топ-20 движений за 24 часа.','Top 20 movers in the last 24 hours.') : vpLang4('Choose a market family first, then narrow the list with the ranking filter below.','اختر فئة السوق أولاً ثم صفِّ النتائج من أزرار الترتيب بالأسفل.','Сначала выберите рынок, затем сузьте список фильтрами ниже.','Choose a market family first, then narrow the list with the ranking filter below.'))
          ),
          h('button',{class:'vp-symbols-close', type:'button', onclick:close}, '‹')
        ),
        h('div',{class:'vp-symbols-controls'},
          h('div',{class:'vp-symbols-tabs', 'data-scroll-key':'trade-symbols-tabs'},
            ...tabs.map(tab=>h('button',{
              class:tab.key === activeType ? 'active' : '',
              type:'button',
              onclick:(e)=>{
                try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){}
                const prevType = String(state.__vpTradeDrawerType || activeType || 'top20');
                const nextType = String(tab.key || 'top20');
                const sameTab = prevType === nextType;
                state.__vpTradeDrawerType = nextType;
                if(!sameTab) state.__vpTradeDrawerSearch = '';
                try{ state.__vpTradeSymbolsDrawerOpen = true; }catch(_e){}
                try{ vpEnsureTradeDrawerTypeData(nextType); }catch(e){}
                if(!sameTab){
                  redrawDrawer();
                }
                Promise.resolve().then(async()=>{
                  try{
                    if(['crypto','futures','forex','stocks','arab','commodities'].includes(nextType)){
                      await vpTradeDrawerFetchMarkets(nextType, { force:false, ttlMs:sameTab ? 1800 : 1400 });
                    }
                  }catch(err){}
                  redrawDrawer();
                });
                return false;
              }
            },
              h('span',{}, tab.label)
            ))
          ),
          h('div',{class:'vp-symbols-filters', 'data-scroll-key':'trade-symbols-filters'},
            ...filters.map(filter=>h('button',{
              class:filter.key === activeSort ? 'active' : '',
              type:'button',
              onclick:()=>{ state.__vpTradeDrawerSort = filter.key; redrawDrawer(); }
            }, filter.label))
          ),
          h('div',{class:'vp-symbols-results-meta'},
            h('span',{class:'pill ghost'}, `${tabs.find(tab=>tab.key === activeType)?.label || 'Symbols'}`),
            h('span',{class:'muted tiny'}, `${vpLang4('Ranked by','الترتيب حسب','Сортировка по','Ranked by')} ${activeSort === 'volume' ? vpLang4('Size','الحجم','Размер','Size') : (filters.find(filter=>filter.key === activeSort)?.label || vpLang4('24h Move','تغير 24س','Изм. 24ч','24h Move'))}`)
          ),
          search
        ),
        list
      )
    );
  }


  function vpTradeTerminalAvatar(item, symbol){
    return vpMarketAvatar(item, symbol, 'trade');
  }

  function vpTradeTerminalBrand(){
    return h('div',{class:'vp-trade-terminal-brand'},
      h('div',{class:'vp-trade-terminal-brandmark'}, 'VertexPluse'),
      h('button',{class:'vp-trade-terminal-menu', type:'button', onclick:(e)=>{ try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){} try{ vpStopTradeDrawerLive(); }catch(_e){} try{ vpOpenTradeSymbolsDrawer(false); }catch(_e){} setTimeout(()=>{ try{ vpOpenMainMobileMenu(); }catch(_e){} }, 16); return false; }, 'aria-label':'Open menu'}, '☰')
    );
  }

  function vpTradeCompactHeader(symbol, item, assetType, marketType, price, change, root, marketToggleEl){
    const fav = getFavorites().includes(String(symbol || '').toUpperCase());
    const activeMode = String(state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
    const activeSnap = portfolioSnapshot(activeMode);
    const activeAccount = (typeof currentAccountModeData === 'function') ? currentAccountModeData(activeMode) : null;
    const initialTotal = Math.max(0, Number(activeAccount?.balance || activeSnap.balanceCash || activeSnap.equity || 0) + Number(activeAccount?.unreal || activeSnap.unreal || 0));
    const initialAvailable = Math.max(0, Number(activeAccount?.available || activeSnap.availableCash || activeSnap.freeMargin || 0));
    const initialPnl = Number((activeMode === 'real' ? state.realPnlStats?.total_pnl : state.pnlStats?.total_pnl) ?? (Number(activeAccount?.realized || activeSnap.realized || 0) + Number(activeAccount?.unreal || activeSnap.unreal || 0)));
    const tradeMini = (label, dataAttr, value, tone='')=>h('div',{class:`vp-trade-balance-mini ${tone||''}`.trim()},
      h('span',{class:'k'}, label),
      h('strong',Object.assign({class:'v'}, dataAttr ? {[dataAttr]:'1'} : {}), value)
    );
    const head = h('div',{class:'vp-trade-compact-head'},
      h('div',{class:'vp-trade-marketbar'},
        h('div',{class:'vp-trade-marketbar-left'},
          h('button',{class:'vp-trade-icon-btn primary', type:'button', onclick:(e)=>{ e.preventDefault(); vpOpenTradeSymbolsDrawer(true); return false; }, title:vpLang4('Symbols','الرموز','Символы','सिंबल्स')}, '≣'),
          h('button',{class:'vp-trade-icon-btn', type:'button', onclick:(e)=>{ e.preventDefault(); toggleFavorite(symbol); render(); }, title:vpLang4('Favorite','المفضلة','Избранное','पसंदीदा')}, fav ? '★' : '☆'),
          vpTradeTerminalAvatar(item, symbol),
          (()=>{ const display = vpInstrumentDisplay(Object.assign({}, item || {}, {symbol, type:assetType})); return h('div',{class:'vp-trade-marketcopy'},
            h('div',{class:'vp-trade-marketpair'}, display.primary || String(symbol || '').replace(/\.\.\.$/,'')),
            h('div',{class:'vp-trade-marketname'}, display.secondary || instrumentName(item))
          ); })()
        ),
        h('div',{class:'vp-trade-marketbar-right'},
          h('span',{class:'vp-trade-change-pill vp-trade-live-change ' + changeClass(change)}, percentText(change))
        )
      ),
      h('div',{class:'vp-trade-compact-actions'},
        h('div',{class:'vp-trade-account-panel'},
          h('div',{class:'vp-trade-account-copy'},
            h('span',{class:'vp-trade-account-kicker'}, vpLang4('Trade balance','رصيد التداول','Торговый баланс','ट्रेड बैलेंस')),
            h('strong',{class:'vp-trade-account-title','data-trade-balance-mode':'1'}, modeLabel(activeMode)),
            h('small',{class:'vp-trade-account-sub','data-trade-balance-caption':'1'}, activeMode === 'real'
              ? vpLang4('Live balances, available funds, and total PnL sync here.','هنا يظهر رصيد الحقيقي والمتاح وإجمالي الربح والخسارة بشكل متزامن.','Здесь синхронно отображаются live-баланс, доступные средства и общий PnL.','यहाँ लाइव बैलेंस, उपलब्ध फंड और कुल PnL सिंक होते हैं।')
              : vpLang4('Demo balances, available funds, and total PnL sync here.','هنا يظهر رصيد الديمو والمتاح وإجمالي الربح والخسارة بشكل متزامن.','Здесь синхронно отображаются демо-баланс, доступные средства и общий PnL.','यहाँ डेमो बैलेंस, उपलब्ध फंड और कुल PnL सिंक होते हैं।'))
          ),
          h('div',{class:'vp-trade-account-stats'},
            tradeMini(vpLang4('Total','الكلي','Итого','कुल'), 'data-trade-balance-total', money(initialTotal, 2)),
            tradeMini(vpLang4('Available','المتاح','Доступно','उपलब्ध'), 'data-trade-balance-available', money(initialAvailable, 2), 'good'),
            tradeMini(vpLang4('PnL','الربح/الخسارة','PnL','PnL'), 'data-trade-balance-pnl', `${initialPnl>=0?'+':''}${money(Math.abs(initialPnl), 2).replace(/^\$/, '$')}`.replace('$$','$'), initialPnl >= 0 ? 'up' : 'down')
          )
        ),
      )
    );
    return head;
  }

  function vpEnsureTradingView(root, delayMs){
    return;
  }

  function vpEnsureMobileTradingView(root){
    return;
  }

  const __vpTradePhase18 = tradePage;
  tradePage = function(){
    const root = __vpTradePhase18();
    try{ vpEnsureTradingView(root, vpIsMobile() ? 40 : 90); }catch(e){}
    if(!vpIsMobile()){
      try{ root.classList.add('mb-trade-ref-desktop','mb-trade-v25','mb-trade-v30','mb-trade-v31','mb-trade-v32','mb-trade-v33'); }catch(e){}
      return root;
    }

    try{
      root.classList.add('mb-trade-ref-mobile', 'mb-trade-ref-mobile-v2', 'mb-trade-v25');
      const symbol = String(state.selectedSymbol || 'BTCUSDT').toUpperCase();
      const seedMeta = (typeof resolveTradeSymbolSeed === 'function' ? resolveTradeSymbolSeed(symbol, state.selectedAssetType) : null) || state.__tradeSeedQuote || null;
      const item = Object.assign({}, seedMeta || {}, marketBySymbol(symbol) || {symbol});
      const assetType = String(item.type || state.selectedAssetType || 'crypto').toLowerCase();
      const currentTradeMarket = ()=>vpCurrentTradeMarket(assetType);
      const marketType = currentTradeMarket().toUpperCase();
      const price = Number(item?.price || 0);
      const change = Number(item?.change_pct || 0);

      const watchPanel = root.querySelector('.trade-watchlist');
      if(watchPanel) watchPanel.classList.add('vp-watchlist-source');

      const head = root.querySelector('.trade-head');
      if(head){
        const marketToggleEl = head.querySelector('.trade-toggle');
        head.innerHTML = '';
        head.appendChild(vpTradeCompactHeader(symbol, item, assetType, marketType, price, change, root, marketToggleEl));
      }

      const orderHost = root.querySelector('.trade-order-panel-host');
      if(orderHost) orderHost.classList.add('vp-mobile-inline-order-hidden');
      const signalsPanel = root.querySelector('.trade-signals-panel');
      if(signalsPanel) signalsPanel.classList.add('vp-mobile-inline-signals-hidden');

      const positions = root.querySelector('.trade-positions');
      if(positions && !positions.querySelector('.vp-mobile-section-head')){
        const headBox = positions.querySelector('.pos-head');
        if(headBox){
          headBox.prepend(h('div',{class:'vp-mobile-section-head'}, 'Transactions'));
        }
      }

      const logs = root.querySelector('.trade-logs');
      if(logs) logs.classList.add('vp-mobile-muted-section');

      const existingBar = root.querySelector('.vp-mobile-trade-bar');
      if(existingBar) existingBar.remove();
      const vpResolveTradeLivePrice = ()=>{
        try{
          const dsSym = String(root?.dataset?.tradeLiveSymbol || '').toUpperCase();
          const dsPrice = Number(root?.dataset?.tradeLivePrice || 0);
          if(dsSym === symbol && dsPrice > 0) return dsPrice;
        }catch(e){}
        try{
          const qc = (typeof QuoteCache !== 'undefined' && QuoteCache && typeof QuoteCache.get === 'function') ? QuoteCache.get() : null;
          if(qc && String(qc.symbol || '').toUpperCase() === symbol){
            const qp = Number((typeof resolveQuoteLivePrice === 'function' ? resolveQuoteLivePrice(qc, currentTradeMarket(), assetType) : (qc.mark_price ?? qc.price ?? qc.last)) || 0);
            if(qp > 0) return qp;
          }
        }catch(e){}
        try{
          const liveEl = root.querySelector('.trade-chart-live-price, .trade-head-live-inline .price');
          const raw = String(liveEl?.dataset?.livePrice || liveEl?.textContent || '').replace(/[^0-9.\-]/g, '');
          const attr = Number(raw || 0);
          if(attr > 0) return attr;
        }catch(e){}
        try{
          const mk = marketBySymbol(symbol);
          const mp = Number(mk?.price || 0);
          if(mp > 0) return mp;
        }catch(e){}
        return Number(price || 0) || 0;
      };
      const initialLivePrice = vpResolveTradeLivePrice() || Number(price || 0) || 0;
      const tradeBar = h('div',{class:'vp-mobile-trade-bar'},
        h('button',{class:'vp-mobile-trade-action sell', onclick:()=>tradeOpenOrderSheet({side:'SELL', symbol, assetType, marketType: currentTradeMarket(), lastPrice: vpResolveTradeLivePrice(), onDone:()=>{ try{ render(); }catch(e){} }})},
          h('span',{class:'k'}, safeT('trade.sell','Sell')),
          h('strong',{class:'vp-mobile-trade-live-price', 'data-live-price': initialLivePrice ? String(initialLivePrice) : ''}, initialLivePrice ? money(initialLivePrice, initialLivePrice < 1 ? 5 : 4) : '—')
        ),
        h('div',{class:'vp-mobile-trade-chip'},
          h('span',{class:'mk vp-markettype-sync'}, currentTradeMarket().toUpperCase()),
          h('span',{class:'pair'}, String(symbol||'').replace(/\.{3}$/,''))
        ),
        h('button',{class:'vp-mobile-trade-action buy', onclick:()=>tradeOpenOrderSheet({side:'BUY', symbol, assetType, marketType: currentTradeMarket(), lastPrice: vpResolveTradeLivePrice(), onDone:()=>{ try{ render(); }catch(e){} }})},
          h('span',{class:'k'}, safeT('trade.buy','Buy')),
          h('strong',{class:'vp-mobile-trade-live-price', 'data-live-price': initialLivePrice ? String(initialLivePrice) : ''}, initialLivePrice ? money(initialLivePrice, initialLivePrice < 1 ? 5 : 4) : '—')
        )
      );
      root.appendChild(tradeBar);
      try{
        if(root.__vpTradeBarSyncTimer) clearInterval(root.__vpTradeBarSyncTimer);
        root.__vpTradeBarSyncTimer = setInterval(()=>{
          try{
            if(document.hidden || String(location.hash || '').indexOf('#/trade') !== 0) return;
            const px = vpResolveTradeLivePrice();
            if(!(px > 0)) return;
            tradeBar.querySelectorAll('.vp-mobile-trade-live-price').forEach(el=>{
              const next = String(px);
              if(String(el.dataset.livePrice || '') === next) return;
              el.textContent = money(px, px < 1 ? 5 : 4);
              try{ el.dataset.livePrice = next; }catch(_e){}
            });
          }catch(_e){}
        }, 1600);
        if(typeof onCleanup === 'function') onCleanup(()=>{ try{ clearInterval(root.__vpTradeBarSyncTimer); }catch(_e){} root.__vpTradeBarSyncTimer = null; });
      }catch(_e){}

      try{ vpRenderTradeSymbolsDrawerOverlay(); }catch(e){}

      vpEnsureMobileTradingView(root);
    }catch(e){}

    return root;
  };



  function vpBuildFullscreenMobileMenu(){
    const me = state.me || {};
    const displayName = String(me.name || [me.first_name, me.last_name].filter(Boolean).join(' ') || me.username || 'VertexPluse User');
    const email = String(me.email || 'No email attached');
    const phone = String(me.phone || me.mobile || me.telegram_phone || '—');
    const initials = displayName.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase() || 'VP';
    const mode = state.tradeMode === 'real' ? 'real' : 'demo';
    const snap = portfolioSnapshot(mode);
    const activeAccountNo = mode === 'real'
      ? (state.me?.live_account?.account_no || accNo())
      : (state.me?.demo_account?.account_no || accountNo('demo'));
    const activeMode = mode === 'real' ? safeT('trade.mode_real','Real') : safeT('trade.mode_demo','Demo');
    const menuSection = String(state.__vpMobileMenuSection || 'main');
    const previewMode = String(state.__vpMenuAccountMode || state.tradeMode || 'real').toLowerCase() === 'demo' ? 'demo' : 'real';
    const previewStats = mobileTradingAccountStats(previewMode);
    const kycStatus = String(state.onboardingStatus?.kyc?.status || state.kycStatus || 'none').toLowerCase();
    const needsLiveAccount = previewMode === 'real' && !['approved','pending','under_review'].includes(kycStatus);
    const drawerTop = h('div',{class:'vp-fixed-menu-head'},
      h('div',{class:'vp-fixed-menu-head-left'},
        h('span',{class:'mb-account-menu-mini'}, '◔'),
        h('select', {class:'input langSel mb-lang mb-account-menu-lang', onchange:(e)=>{state.lang=e.target.value; localStorage.setItem('lang', state.lang); mobileMenuClose(); boot();}},
                ...mbLanguageOptionNodes(state.lang)
              )
      ),
      h('button',{class:'vp-fixed-menu-close', type:'button', onclick:()=>{ mobileMenuClose(); render(); }, 'aria-label':'Close menu'}, '✕')
    );

    const divider = h('div',{class:'mb-account-menu-divider'});
    const menuRow = (title, sub, onClick, ico, tone)=>drawerActionRow(title, sub, onClick, ico, tone);
    const mainScroll = h('div',{class:'vp-fixed-menu-scroll'},
      h('div',{class:'mb-account-menu-accent'}),
      h('div',{class:'mb-account-menu-title'}, safeT('nav.account','Account')),
      h('div',{class:'mb-account-menu-card ref-flat vp-account-menu-compact-card'},
        h('div',{class:'mb-account-menu-avatar'}, initials),
        h('div',{class:'mb-account-menu-meta'},
          h('div',{class:'mb-account-menu-name'}, displayName),
          h('div',{class:'mb-account-menu-email', title:email}, email)
        )
      ),
      h('div',{class:'vp-account-id-card ref-flat'},
        h('div',{class:'vp-account-id-copy'},
          h('div',{class:'k'}, vpLang4('Trading account number','رقم الحساب','Номер счёта','खाता संख्या')),
          h('div',{class:'v', title:String(activeAccountNo || '—')}, String(activeAccountNo || '—'))
        ),
        h('button',{class:'vp-account-copy-btn', type:'button', onclick:()=>vpCopyText(String(activeAccountNo || ''), vpLang4('Account number copied','تم نسخ رقم الحساب','Номер счёта скопирован','खाता नंबर कॉपी हो गया'))}, vpLang4('Copy','نسخ','Копировать','कॉपी'))
      ),
      h('div',{class:'mb-account-menu-section-label'}, 'FUNDS'),
      h('div',{class:'mb-account-menu-list flat ref'},
        menuRow('Deposit', 'Fund your live account', ()=>mobileMenuGo('#/wallet?tab=deposit'), '◫'),
        menuRow('Withdrawals', 'Request payout review', ()=>mobileMenuGo('#/wallet?tab=withdraw'), '◎'),
                
      ),
      h('div',{class:'mb-account-menu-section-label'}, 'MY PROFILE'),
      h('div',{class:'mb-account-menu-list flat ref'},
        menuRow('Account', 'Profile, security, and personal settings', ()=>mobileMenuGo('#/account'), '◔'),
        menuRow('Identity Verification', 'Review the KYC status and required documents', ()=>mobileMenuGo('#/kyc'), '◈')
      ),
      h('div',{class:'mb-account-menu-section-label'}, 'APPLICATION'),
      h('div',{class:'mb-account-menu-list flat ref'},
        menuRow('Trading Accounts', 'Live and demo account details', ()=>{ state.__vpMenuAccountMode = state.tradeMode === 'real' ? 'real' : 'demo'; mobileMenuSetSection('trading-accounts'); }, '⇄')
      )
    );

    const statRow = (label, value, suffix='')=>h('div',{class:'mb-account-stats-row'},
      h('span',{}, label),
      h('div',{class:'mb-account-stats-value'}, h('strong',{}, value), suffix ? h('small',{}, suffix) : null)
    );

    const tradingScroll = h('div',{class:'vp-fixed-menu-scroll'},
      h('div',{class:'mb-account-menu-topnav'},
        h('button',{class:'mb-account-back-btn', type:'button', onclick:()=>mobileMenuSetSection('main')}, '‹'),
        h('div',{class:'mb-account-menu-title mb-account-menu-title-inline'}, 'Trading Accounts')
      ),
      h('div',{class:'mb-account-menu-hero-lite'},
        h('div',{class:'mb-account-menu-section-label'}, 'ACTIVE TRADING ACCOUNT'),
        h('div',{class:'mb-account-menu-hero-account'}, previewStats.accountNo),
        h('div',{class:'mb-account-menu-hero-mode'}, `${previewStats.label} • 1:${previewStats.leverage}`)
      ),
      h('div',{class:'mb-account-stats-card'},
        statRow('Available Balance', money(previewStats.available, 2)),
        statRow('Equity', money(previewStats.equity, 2)),
        statRow('P&L', `${previewStats.pnl >= 0 ? '+' : ''}${fmt(previewStats.pnl, 2)}`, 'USD'),
        statRow('Margin', money(previewStats.margin, 2)),
        statRow('Margin Level', fmt(previewStats.marginLevel, 2), '%'),
        statRow('Free Margin', money(previewStats.freeMargin, 2)),
        statRow('Rewards', fmt(previewStats.rewards, 0))
      ),
      h('div',{class:'mb-account-switch-label'}, 'Switch Account'),
      h('div',{class:'mb-account-switch-tabs'},
        h('button',{class:previewMode === 'real' ? 'active' : '', type:'button', onclick:()=>{ state.__vpMenuAccountMode = 'real'; render(); }}, 'Live'),
        h('button',{class:previewMode === 'demo' ? 'active' : '', type:'button', onclick:()=>{ state.__vpMenuAccountMode = 'demo'; render(); }}, 'Demo')
      ),
      h('div',{class:'mb-account-trading-card'},
        h('div',{class:'mb-account-trading-icon'}, '⇄'),
        h('div',{class:'mb-account-trading-title'}, needsLiveAccount ? 'Start earning real profits!' : `${previewMode === 'real' ? 'Live' : 'Demo'} account ready`),
        h('div',{class:'mb-account-trading-sub'}, needsLiveAccount
          ? 'Verify your identity to open a Live Account and keep your Demo Account for ongoing practice.'
          : (previewMode === 'real'
            ? 'Use your live account for funding, execution, and real portfolio tracking.'
            : 'Practice strategies on your demo account before switching to live execution.')),
        h('button',{class:'btn primary mb-account-open-live', type:'button', onclick:async()=>{
          if(needsLiveAccount){ mobileMenuClose(); openKycFlow().catch(()=>{}); return; }
          const switched = (typeof requestTradeModeSwitch === 'function') ? await requestTradeModeSwitch(previewMode) : (setTradeMode(previewMode), true); if(!switched) return;
          Promise.allSettled([
            refreshWalletSummary(true),
            refreshPortfolio({force:true, mode:'demo'}),
            refreshRealPortfolio(true),
            refreshPnlStats({mode:'demo'}),
            refreshRealPnlStats()
          ]).then(()=>{ mobileMenuGo('#/trade'); render(); });
        }}, needsLiveAccount ? 'Open Live Account' : `Use ${previewMode === 'real' ? 'Live' : 'Demo'} Account`)
      )
    );

    const footer = h('div',{class:'vp-fixed-menu-footer'},
      menuSection === 'main'
        ? h('button',{class:'vp-fixed-menu-logout', type:'button', onclick:()=>{ window.location.href='/logout.php'; }}, safeT('settings.logout','Log Out'))
        : h('button',{class:'vp-fixed-menu-back', type:'button', onclick:()=>mobileMenuSetSection('main')}, 'Back to account')
    );

    return h('div',{class:'vp-fixed-mobile-menu'},
      h('button',{class:'vp-fixed-mobile-menu-backdrop', type:'button', onclick:()=>{ mobileMenuClose(); render(); }, 'aria-label':'Close menu'}),
      h('aside',{class:'vp-fixed-mobile-menu-drawer', onclick:(e)=>e.stopPropagation()},
        drawerTop,
        menuSection === 'trading-accounts' ? tradingScroll : mainScroll,
        footer
      )
    );
  }

  const __vpFinalTopBar = topBar;


  function vpMenuSvgIcon(){
    return h('svg',{
      class:'vp-shell-header__menu-svg',
      viewBox:'0 0 24 24',
      'aria-hidden':'true'
    },
      h('path',{d:'M4 7h16', fill:'none', stroke:'currentColor', 'stroke-width':'2.2', 'stroke-linecap':'round'}),
      h('path',{d:'M4 12h16', fill:'none', stroke:'currentColor', 'stroke-width':'2.2', 'stroke-linecap':'round'}),
      h('path',{d:'M4 17h16', fill:'none', stroke:'currentColor', 'stroke-width':'2.2', 'stroke-linecap':'round'})
    );
  }

  function vpBackSvgIcon(){
    return h('svg',{
      class:'vp-shell-header__arrow-svg',
      viewBox:'0 0 24 24',
      'aria-hidden':'true'
    },
      h('path',{d:'M15 6l-6 6 6 6', fill:'none', stroke:'currentColor', 'stroke-width':'2.2', 'stroke-linecap':'round', 'stroke-linejoin':'round'})
    );
  }

  function vpBuildCleanShellHeader(meta){
    const unread = (typeof notificationsUnreadCount === 'function' ? notificationsUnreadCount() : 0) || 0;
    const routeKey = String(meta?.key || '');
    const routeNeedsBack = ['support','notifications','news'].includes(routeKey);
    const prevHash = String(state.__vpPrevHash || '#/home');
    const backTarget = (!prevHash || prevHash === location.hash || prevHash.startsWith('#/support') || prevHash.startsWith('#/notifications') || prevHash.startsWith('#/news')) ? '#/home' : prevHash;
    const leftAction = routeNeedsBack
      ? h('button',{
          class:'vp-shell-header__icon vp-shell-header__icon--back',
          type:'button',
          onclick:(e)=>{ try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){} location.hash = backTarget; render(); },
          'aria-label':'Go back',
          title:'Back'
        }, vpBackSvgIcon())
      : h('button',{
          class:'vp-shell-header__icon vp-shell-header__icon--menu',
          type:'button',
          onclick:(e)=>{ try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){} vpOpenMainMobileMenu(e); return false; },
          'aria-label':'Open menu',
          title:'Menu'
        }, vpMenuSvgIcon());

    const center = h('div',{class:'vp-shell-header__center'},
      h('div',{id:'brandMarkMobileClean', class:'vp-shell-header__logo'})
    );

    const right = h('button',{
      class:'vp-shell-header__icon vp-shell-header__icon--bell' + (unread > 0 ? ' has-badge' : ''),
      type:'button',
      onclick:()=>{ location.hash = '#/notifications'; render(); },
      'aria-label':'Notifications',
      title:'Notifications'
    },
      vpBellIcon(),
      unread > 0 ? h('span',{class:'vp-shell-header__badge'}, String(unread > 99 ? '99+' : unread)) : null
    );

    const header = h('div',{class:'card vp-shell-header-card'},
      h('div',{class:'vp-shell-header'},
        h('div',{class:'vp-shell-header__slot vp-shell-header__slot--left'}, leftAction),
        center,
        h('div',{class:'vp-shell-header__slot vp-shell-header__slot--right'}, right)
      )
    );

    setTimeout(()=>{ try{ mountLogo('brandMarkMobileClean'); }catch(e){} }, 0);
    return header;
  }

  topBar = function(){
    const shell = __vpFinalTopBar();
    if(!vpIsMobile()) return shell;
    try{
      return h('div',{class:'vp-topbar-stack'}, vpBuildCleanShellHeader(routeMeta()), state.__vpMobileMenuOpen ? vpBuildFullscreenMobileMenu() : null);
    }catch(e){
      return shell;
    }
  };


  /* ===== v2026-04-04 final shell cleanup pass ===== */
  function vpLang4(en, ar, ru, hi){
    try{
      const lang = String((state && state.lang) || 'en').toLowerCase();
      if(lang === 'ar') return ar || en;
      if(lang === 'ru') return ru || en;
      if(lang === 'hi') return hi || en;
      return en;
    }catch(e){ return en; }
  }

  function vpCurrentKycStatus(){
    return String(state?.onboardingStatus?.kyc?.status || state?.kycStatus?.status || 'none').toLowerCase();
  }

  function vpIsWithdrawKycReady(){
    return vpCurrentKycStatus() === 'approved';
  }

  const __vpOrigValidateFunding = typeof validateFunding === 'function' ? validateFunding : null;
  validateFunding = function(kind, method, amountEl){
    if(String(kind || '').toLowerCase() === 'withdraw' && !vpIsWithdrawKycReady()){
      return {
        ok:false,
        error:vpLang4(
          'Withdrawal requires approved KYC. Open verification first.',
          'السحب يتطلب موافقة KYC أولاً. افتح التحقق قبل المتابعة.',
          'Для вывода требуется одобренная KYC. Сначала откройте верификацию.',
          'निकासी के लिए स्वीकृत KYC आवश्यक है। पहले सत्यापन खोलें।'
        )
      };
    }
    return __vpOrigValidateFunding ? __vpOrigValidateFunding(kind, method, amountEl) : {ok:true};
  };

  accountPage = function(){
    const refreshAccountWorkspace = ()=>Promise.allSettled([
      refreshWalletSummary(true),
      refreshOnboardingStatus(),
      refreshNotificationsData(true),
      refreshSupportTickets(true),
      refreshNewsFeed(true),
      refreshDepositsList(),
      refreshWithdrawalsList()
    ]);
    if((!state.walletSummary || !state.onboardingStatus || !state.newsFeed || !state.supportTickets) && !state.__vpAccountPass6Priming){
      state.__vpAccountPass6Priming = true;
      refreshAccountWorkspace().then(()=>{ try{ render(); }catch(e){} }).catch(()=>{}).finally(()=>{ state.__vpAccountPass6Priming = false; });
    }

    const me = state.me || {};
    const name = (typeof userName === 'function' ? userName() : (me.name || me.username || 'VertexPluse User'));
    const email = String(me.email || '').trim() || vpLang4('No email attached yet','لا يوجد بريد إلكتروني مرفق حتى الآن','Электронная почта ещё не привязана','अभी तक कोई ईमेल संलग्न नहीं है');
    const phone = String(me.phone || me.mobile || me.telegram_phone || '').trim() || '—';
    const uid = String(me.uid || me.id || me.telegram_id || '—');
    const provider = String(me.login_provider || 'web').toLowerCase();
    const providerLabel = provider === 'telegram'
      ? vpLang4('Telegram login','تسجيل دخول عبر تيليجرام','Вход через Telegram','टेलीग्राम लॉगिन')
      : vpLang4('Web login','تسجيل دخول ويب','Вход через веб','वेब लॉगин');
    const initials = (String(name || 'VP').trim().split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2) || 'VP').toUpperCase();
    const kycStatus = vpCurrentKycStatus();
    const kycLabel = typeof fundingStatusLabel === 'function'
      ? fundingStatusLabel(kycStatus)
      : vpLang4('Not verified','غير موثق','Не верифицировано','सत्यापित नहीं');
    const kycTone = typeof fundingStatusTone === 'function' ? fundingStatusTone(kycStatus) : '';
    const notificationsCount = (typeof notificationsUnreadCount === 'function' ? notificationsUnreadCount() : 0) || 0;
    const supportCount = (typeof supportUnreadCount === 'function' ? supportUnreadCount() : 0) || 0;
    const linkedIdentities = [];
    if(String(me.email || '').trim()) linkedIdentities.push(vpLang4('Email','البريد الإلكتروني','Email','ईमेल'));
    if(String(me.telegram_username || me.telegram_id || '').trim()) linkedIdentities.push('Telegram');
    if(String(me.phone || me.mobile || '').trim()) linkedIdentities.push(vpLang4('Phone','الهاتف','Телефон','फ़ोन'));
    const linkedText = linkedIdentities.length ? linkedIdentities.join(' • ') : vpLang4('No linked identities yet','لا توجد هويات مرتبطة حتى الآن','Пока нет связанных идентификаторов','अभी तक कोई लिंक की गई पहचान नहीं है');
    const depItems = (state.depositsList && Array.isArray(state.depositsList.items)) ? state.depositsList.items : [];
    const wdrItems = (state.withdrawalsList && Array.isArray(state.withdrawalsList.items)) ? state.withdrawalsList.items : [];
    const latestFunding = vpSortByRecent(depItems.map(it=>Object.assign({kind:'deposit'}, it)).concat(wdrItems.map(it=>Object.assign({kind:'withdraw'}, it))), [it=>it?.updated_at, it=>it?.created_at])[0] || null;
    const latestTicket = vpSortByRecent(Array.isArray(state.supportTickets) ? state.supportTickets.slice() : [], [it=>it?.updated_at, it=>it?.created_at])[0] || null;
    const latestNews = vpSortByRecent(Array.isArray(state.newsFeed) ? state.newsFeed.slice() : [], [it=>it?.published_at, it=>it?.updated_at, it=>it?.created_at])[0] || null;

    const section = (title, body)=>h('div',{class:'card vp-account-section'},
      h('div',{class:'mb-card-title'}, title),
      body
    );
    const row = (label, value, extraCls='')=>h('div',{class:'vp-account-row ' + (extraCls || '')},
      h('div',{class:'vp-account-row-label'}, label),
      h('div',{class:'vp-account-row-value'}, value)
    );
    const activityValue = (primary, secondary, actionLabel, actionHref)=>h('div',{class:'stack', style:'align-items:flex-end; gap:6px; max-width:100%'},
      h('div',{}, primary),
      secondary ? h('div',{class:'muted small', style:'text-align:right'}, secondary) : null,
      actionHref ? h('button',{class:'btn outline', type:'button', onclick:()=>{ location.hash = actionHref; }}, actionLabel) : null
    );

    const root = h('div',{class:'mb-page vp-account-simple-page'},
      topBar(),
      h('div',{class:'card vp-account-hero-card'},
        h('div',{class:'vp-account-hero-main'},
          h('div',{class:'vp-account-avatar-large'}, initials),
          h('div',{class:'vp-account-hero-copy'},
            h('div',{class:'vp-account-name-lg'}, name),
            h('div',{class:'vp-account-subline'}, `UID: ${uid}`),
            h('div',{class:'vp-account-chip-wrap'},
              h('span',{class:'chip'}, providerLabel),
              h('span',{class:'chip ghost'}, vpLang4('Profile & settings','الملف والإعدادات','Профиль и настройки','प्रोफ़ाइल और सेटिंग्स')),
              h('span',{class:'pill ' + (kycTone || '')}, String(kycLabel || '').toUpperCase())
            )
          )
        ),
        h('div',{class:'vp-inline-actions'},
          h('button',{class:'btn primary', onclick:()=>openKycFlow().catch(()=>{})}, vpLang4('Open KYC','فتح KYC','Открыть KYC','KYC खोलें')),
          h('button',{class:'btn outline', onclick:()=>location.hash='#/notifications'}, vpLang4('Notifications','التنبيهات','Уведомления','सूचनाएं')),
          h('button',{class:'btn outline', onclick:()=>location.hash='#/support'}, safeT('support.title','Support'))
        )
      ),
      h('div',{class:'vp-account-grid-simple'},
        section(vpLang4('Profile','الملف الشخصي','Профиль','प्रोफ़ाइल'), h('div',{},
          row(vpLang4('Full name','الاسم الكامل','Полное имя','पूरा नाम'), name),
          row(vpLang4('Email','البريد الإلكتروني','Email','ईमेल'), email),
          row(vpLang4('Phone','الهاتف','Телефон','फ़ोन'), phone),
          row(vpLang4('Login method','طريقة الدخول','Способ входа','लॉगिन तरीका'), providerLabel)
        )),
        section(vpLang4('Security','الأمان','Безопасность','सुरक्षा'), h('div',{},
          row(vpLang4('Session','الجلسة','Сессия','सत्र'), vpLang4('Secure web session','جلسة ويب آمنة','Защищённая веб-сессия','सुरक्षित वेब सत्र')),
          row(vpLang4('Linked identities','الهويات المرتبطة','Связанные идентификаторы','लिंक की गई पहचानें'), linkedText),
          h('div',{class:'vp-inline-actions compact'},
            h('button',{class:'btn outline', onclick:async()=>{ await refreshAccountWorkspace(); render(); }}, safeT('wallet.refresh','Refresh')),
            h('a',{class:'btn danger', href:'/logout.php'}, safeT('settings.logout','Log out'))
          )
        )),
        section(vpLang4('Verification','التحقق','Верификация','सत्यापन'), h('div',{},
          row(vpLang4('Current status','الحالة الحالية','Текущий статус','वर्तमान स्थिति'), h('span',{class:'pill ' + (kycTone || '')}, String(kycLabel || '').toUpperCase())),
          h('div',{class:'vp-account-note'},
            vpIsWithdrawKycReady()
              ? vpLang4('Withdrawals and investment subscriptions can continue without a KYC blocker.','يمكن متابعة السحب والاشتراك في الخطط الاستثمارية بدون عائق تحقق.','Выводы и подписки на инвестиционные планы можно продолжать без блокировки KYC.','निकासी और निवेश सदस्यताएँ KYC अवरोध के बिना जारी रह सकती हैं।')
              : vpLang4('Deposits and trading stay available, but withdrawals and investment subscriptions stay gated until KYC is approved.','الإيداع والتداول متاحان، لكن السحب والاشتراك في الخطط الاستثمارية يظلان مقيدين حتى تتم الموافقة على KYC.','Пополнения и торговля доступны, но выводы и инвестиционные подписки остаются заблокированными до одобрения KYC.','जमा और ट्रेडिंग उपलब्ध हैं, लेकिन KYC स्वीकृत होने तक निकासी और निवेश सदस्यताएँ सीमित रहेंगी।')
          ),
          h('div',{class:'vp-inline-actions compact'},
            h('button',{class:'btn primary', onclick:()=>openKycFlow().catch(()=>{})}, vpLang4('Manage verification','إدارة التحقق','Управлять верификацией','सत्यापन प्रबंधित करें'))
          )
        )),
        section(vpLang4('Settings','الإعدادات','Настройки','सेटिंग्स'), h('div',{},
          row(vpLang4('Language','اللغة','Язык','भाषा'), mbLanguageMenuNode(state.lang, 'mb-shell-lang-menu')),
          row(vpLang4('Notifications center','مركز التنبيهات','Центр уведомлений','सूचना केंद्र'), `${notificationsCount}`),
          row(safeT('support.title','Support'), `${supportCount}`),
          h('div',{class:'vp-inline-actions compact'},
            h('button',{class:'btn outline', onclick:()=>location.hash='#/notifications'}, vpLang4('Open notifications','فتح التنبيهات','Открыть уведомления','सूचनाएं खोलें')),
            h('button',{class:'btn outline', onclick:()=>location.hash='#/support'}, safeT('support.title','Support'))
          )
        )),
        section(vpLang4('Activity','النشاط','Активность','गतिविधि'), h('div',{},
          row(vpLang4('Latest funding','آخر تمويل','Последнее финансирование','नवीनतम फंडिंग'), latestFunding
            ? activityValue(`${latestFunding.kind === 'deposit' ? vpLang4('Deposit','إيداع','Пополнение','जमा') : vpLang4('Withdrawal','سحب','Вывод','निकासी')} #${latestFunding.id || '—'}`, `${String(latestFunding.currency || 'USDT').toUpperCase()} • ${fmt(Number(latestFunding.amount || 0),2)} • ${fundingStatusLabel(latestFunding.status)} • ${vpFmtDate(latestFunding.updated_at || latestFunding.created_at)}`, vpLang4('Open funds','فتح الأموال','Открыть средства','फंड खोलें'), '#/wallet?tab=history')
            : vpLang4('No funding requests yet','لا توجد طلبات تمويل بعد','Пока нет запросов на финансирование','अभी तक कोई फंडिंग अनुरोध नहीं')),
          row(safeT('support.title','Support'), latestTicket
            ? activityValue(`#${latestTicket.id || '—'} • ${String(latestTicket.subject || latestTicket.reason_code || 'Ticket')}`, `${fundingStatusLabel(latestTicket.status)} • ${vpFmtDate(latestTicket.updated_at || latestTicket.created_at)}`, vpLang4('Open ticket','فتح التذكرة','Открыть тикет','टिकट खोलें'), `#/support?ticket=${encodeURIComponent(String(latestTicket.id || ''))}`)
            : vpLang4('No support tickets yet','لا توجد تذاكر دعم حتى الآن','Пока нет тикетов поддержки','अभी तक कोई सहायता टिकट नहीं')),
          row(vpLang4('Latest announcement','آخر إعلان','Последнее объявление','नवीनतम घोषणा'), latestNews
            ? activityValue(String(latestNews.title || vpLang4('Update','تحديث','Обновление','अपडेट')), `${vpFmtDate(latestNews.published_at || latestNews.updated_at || latestNews.created_at)} • ${String(latestNews.source_label || vpLang4('Platform updates','تحديثات المنصة','Обновления платформы','प्लेटफ़ॉर्म अपडेट'))}`, vpLang4('Open news','فتح الأخبار','Открыть новости','समाचार खोलें'), `#/news?id=${encodeURIComponent(String(latestNews.id || ''))}`)
            : vpLang4('No announcements yet','لا توجد إعلانات بعد','Пока нет объявлений','अभी तक कोई घोषणा नहीं'))
        ))
      ),
      bottomNav()
    );
    let accountRefreshBusy = false;
    const accountTick = ()=>{
      if(accountRefreshBusy) return;
      if(String(location.hash || '').indexOf('#/account') !== 0 || document.hidden) return;
      accountRefreshBusy = true;
      refreshAccountWorkspace().then(()=>{
        if(root.isConnected && String(location.hash || '').indexOf('#/account') === 0){
          try{ render(); }catch(e){}
        }
      }).catch(()=>{}).finally(()=>{ accountRefreshBusy = false; });
    };
    const accountTimer = setInterval(accountTick, 25000);
    try{ onCleanup(()=>{ try{ clearInterval(accountTimer); }catch(e){} }); }catch(e){}
    return root;
  };


  vpBuildFullscreenMobileMenu = function(){
    const me = state.me || {};
    const displayName = String(me.name || [me.first_name, me.last_name].filter(Boolean).join(' ') || me.username || 'VertexPluse User');
    const email = String(me.email || me.telegram_username || ('#' + String(me.uid || me.id || '—')));
    const initials = displayName.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase() || 'VP';
    const previewMode = String(state.tradeMode || 'real').toLowerCase() === 'demo' ? 'demo' : 'real';
    const snap = typeof mobileTradingAccountStats === 'function'
      ? mobileTradingAccountStats(previewMode)
      : { accountNo:(typeof accountNo === 'function' ? accountNo(previewMode === 'real' ? 'live' : 'demo') : '—'), available:0, equity:0, label:previewMode === 'real' ? 'Live' : 'Demo' };

    const menuRow = (title, sub, action, ico, tone)=>drawerActionRow(title, sub, action, ico, tone);

    return h('div',{class:'vp-fixed-mobile-menu'},
      h('button',{class:'vp-fixed-mobile-menu-backdrop', type:'button', onclick:()=>{ mobileMenuClose(); render(); }, 'aria-label':'Close menu'}),
      h('aside',{class:'vp-fixed-mobile-menu-drawer', onclick:(e)=>e.stopPropagation()},
        h('div',{class:'vp-fixed-menu-head'},
          h('div',{class:'vp-fixed-menu-head-left'},
            h('span',{class:'mb-account-menu-mini'}, '◔'),
            mbLanguageMenuNode(state.lang, 'mb-account-menu-lang-pop')
          ),
          h('button',{class:'vp-fixed-menu-close', type:'button', onclick:()=>{ mobileMenuClose(); render(); }, 'aria-label':'Close menu'}, '✕')
        ),
        h('div',{class:'vp-fixed-menu-scroll'},
          h('div',{class:'mb-account-menu-accent'}),
          h('div',{class:'mb-account-menu-title'}, vpLang4('Account','الحساب','Аккаунт','खाता')),
          h('div',{class:'mb-account-menu-card ref-flat vp-account-menu-compact-card'},
            h('div',{class:'mb-account-menu-avatar'}, initials),
            h('div',{class:'mb-account-menu-meta'},
              h('div',{class:'mb-account-menu-name'}, displayName),
              h('div',{class:'mb-account-menu-email', title:email}, email)
            )
          ),
          h('div',{class:'vp-account-id-card ref-flat'},
            h('div',{class:'vp-account-id-copy'},
              h('div',{class:'k'}, vpLang4('Trading account number','رقم الحساب','Номер счёта','खाता संख्या')),
              h('div',{class:'v', title:String(snap.accountNo || '—')}, String(snap.accountNo || '—'))
            ),
            h('button',{class:'vp-account-copy-btn', type:'button', onclick:()=>vpCopyText(String(snap.accountNo || ''), vpLang4('Account number copied','تم نسخ رقم الحساب','Номер счёта скопирован','खाता नंबर कॉपी हो गया'))}, vpLang4('Copy','نسخ','Копировать','कॉपी'))
          ),
          h('div',{class:'mb-account-menu-section-label'}, vpLang4('NAVIGATION','التنقل','НАВИГАЦИЯ','नेविगेशन')),
          h('div',{class:'mb-account-menu-list flat ref'},
            menuRow(vpLang4('Home','الرئيسية','Главная','होम'), vpLang4('Dashboard overview','نظرة عامة على اللوحة','Обзор панели','डैशबोर्ड अवलोकन'), ()=>mobileMenuGo('#/home'), '⌂'),
            menuRow(vpLang4('Trade','التداول','Торговля','ट्रेड'), vpLang4('Open charts and execution','افتح الشارت والتنفيذ','Открыть графики и исполнение','चार्ट और निष्पादन खोलें'), ()=>mobileMenuGo('#/trade'), '↕'),
            menuRow(vpLang4('Portfolio','المحفظة الاستثمارية','Портфель','पोर्टफोलियो'), vpLang4('Positions, orders, and history','المراكز والأوامر والسجل','Позиции, ордера и история','पोज़िशन, ऑर्डर और इतिहास'), ()=>mobileMenuGo('#/portfolio'), '◔'),
            menuRow(vpLang4('Funds','الأموال','Средства','फंड्स'), vpLang4('Deposit, withdraw, and history','الإيداع والسحب والسجل','Пополнение, вывод и история','जमा, निकासी और इतिहास'), ()=>mobileMenuGo('#/wallet'), '◫'),
            menuRow(vpLang4('Account','الحساب','Аккаунт','खाता'), vpLang4('Profile, security, KYC, and settings','الملف والأمان وKYC والإعدادات','Профиль, безопасность, KYC и настройки','प्रोफ़ाइल, सुरक्षा, KYC और सेटिंग्स'), ()=>mobileMenuGo('#/account'), '◎')
          ),
          h('div',{class:'mb-account-menu-section-label'}, vpLang4('FUNDS','التمويل','ФИНАНСЫ','फंड्स')),
          h('div',{class:'mb-account-menu-list flat ref'},
            menuRow(vpLang4('Deposit','إيداع','Пополнение','जमा'), vpLang4('Start a live funding request','ابدأ طلب إيداع للحساب الحقيقي','Начать заявку на пополнение реального счёта','लाइव फंडिंग अनुरोध शुरू करें'), ()=>mobileMenuGo('#/wallet?tab=deposit'), '◫'),
            menuRow(vpLang4('Withdraw','سحب','Вывод','निकासी'), vpLang4('Request payout review','اطلب مراجعة السحب','Запросить проверку вывода','निकासी समीक्षा का अनुरोध करें'), ()=>mobileMenuGo('#/wallet?tab=withdraw'), '◎'),
            menuRow(vpLang4('History','السجل','История','इतिहास'), vpLang4('Track every request','تابع كل الطلبات','Отслеживайте каждую заявку','हर अनुरोध को ट्रैक करें'), ()=>mobileMenuGo('#/wallet?tab=history'), '◍')
          ),
          h('div',{class:'mb-account-menu-section-label'}, vpLang4('TOOLS','الأدوات','ИНСТРУМЕНТЫ','टूल्स')),
          h('div',{class:'mb-account-menu-list flat ref'},
            menuRow(vpLang4('Verification','التحقق','Верификация','सत्यापन'), vpLang4('Review KYC status and requirements','راجع حالة ومتطلبات KYC','Проверить статус и требования KYC','KYC स्थिति और आवश्यकताएँ देखें'), ()=>mobileMenuGo('#/kyc'), '◈'),
            menuRow(safeT('support.title','Support'), vpLang4('Open the support inbox','افتح صندوق الدعم','Открыть поддержку','सहायता इनबॉक्स खोलें'), ()=>mobileMenuGo('#/support'), '☏'),
            menuRow(vpLang4('Notifications','التنبيهات','Уведомления','सूचनाएं'), vpLang4('Review platform notifications and replies','راجع تنبيهات المنصة والردود','Просмотреть уведомления платформы и ответы','प्लेटफ़ॉर्म नोटिफ़िकेशन और रिप्लाई देखें'), ()=>mobileMenuGo('#/notifications'), '✦'),
            ...((!state.newsConfig || state.newsConfig.menu_enabled !== false) ? [menuRow(vpLang4('News','الأخبار','Новости','समाचार'), vpLang4('Read announcements with images and pinned updates','اقرأ الأخبار مع الصور والتحديثات المثبتة','Читайте новости с изображениями и закреплёнными обновлениями','चित्रों और पिन अपडेट के साथ समाचार पढ़ें'), ()=>mobileMenuGo('#/news'), '◌')] : [])
          )
        ),
        h('div',{class:'vp-menu-footer-stack'},
          h('button',{class:'vp-fixed-menu-back', type:'button', onclick:()=>mobileMenuGo('#/account')}, vpLang4('Account','الحساب','Аккаунт','खाता')),
          h('button',{class:'vp-fixed-menu-logout', type:'button', onclick:()=>{ window.location.href='/logout.php'; }}, safeT('settings.logout','Log Out'))
        )
      )
    );
  };

  if(!window.__vpRenderWrappedFinal0404){
    const __vpBaseRender0404 = render;
    render = function(){
      const __vpRenderResult0404 = __vpBaseRender0404.apply(this, arguments);
      try{
        const hash = String(location.hash || '');
        if(!hash.startsWith('#/wallet')) return;
        const query = new URLSearchParams(hash.split('?')[1] || '');
        const activeTab = String(query.get('tab') || state.__vpFundsTab || 'deposit').toLowerCase();
        const tabs = document.querySelectorAll('.mb-funds-top-tab');
        if(tabs[0]) tabs[0].textContent = vpLang4('Deposit','إيداع','Пополнение','जमा');
        if(tabs[1]) tabs[1].textContent = vpLang4('Withdraw','سحب','Вывод','निकासी');
        if(tabs[2]) tabs[2].textContent = vpLang4('History','السجل','История','इतिहास');
        const existing = document.querySelector('.vp-gate-alert');
        if(activeTab !== 'withdraw' || vpIsWithdrawKycReady()){
          if(existing) existing.remove();
          return;
        }
        if(existing) return;
        const target = document.querySelector('.mb-funds-content') || document.querySelector('.mb-wallet-mobile-main') || document.querySelector('.compact-wallet-shell');
        if(!target) return;
        const gate = h('div',{class:'vp-gate-alert'},
          h('div',{class:'vp-gate-alert-title'}, vpLang4('Withdrawal requires approved KYC','السحب يتطلب KYC معتمد','Для вывода требуется одобренная KYC','निकासी के लिए स्वीकृत KYC आवश्यक है')),
          h('div',{class:'vp-gate-alert-text'}, vpLang4('Deposits and trading remain available, but withdrawals and investment subscriptions stay gated until verification is approved.','الإيداع والتداول يظلان متاحين، لكن السحب والاشتراك في الخطط الاستثمارية يظلان مقيدين حتى تتم الموافقة على التحقق.','Пополнения и торговля остаются доступными, но выводы и инвестиционные подписки остаются заблокированными до одобрения верификации.','जमा और ट्रेडिंग उपलब्ध रहते हैं, लेकिन सत्यापन स्वीकृत होने तक निकासी और निवेश सदस्यताएँ सीमित रहती हैं।')),
          h('div',{class:'vp-inline-actions compact'},
            h('button',{class:'btn primary', type:'button', onclick:()=>openKycFlow().catch(()=>{})}, vpLang4('Open KYC','فتح KYC','Открыть KYC','KYC खोलें')),
            h('button',{class:'btn outline', type:'button', onclick:()=>location.hash='#/account'}, vpLang4('Account','الحساب','Аккаунт','खाता'))
          )
        );
        target.insertBefore(gate, target.firstChild);
      }catch(e){}
      return __vpRenderResult0404;
    };
    window.__vpRenderWrappedFinal0404 = true;
  }


})();
