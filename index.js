import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import crypto from 'crypto';

const BOT_TOKEN = process.env.BOT_TOKEN;
const BACKEND_BASE = (process.env.BACKEND_BASE || '').replace(/\/+$/,'');
const SECRET = process.env.BOT_INTENT_SECRET || 'change_me';
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || '';

if(!BOT_TOKEN) throw new Error('BOT_TOKEN missing');
if(!BACKEND_BASE) throw new Error('BACKEND_BASE missing');

const bot = new Telegraf(BOT_TOKEN);

// Minimal in-memory sessions (good enough for shared hosting MVP)
const sessions = new Map(); // chatId -> { intent, methods, pickedMethod }

function hmac(payload){
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

async function fetchJson(path, opts){
  const res = await fetch(BACKEND_BASE + path, opts);
  const text = await res.text();
  try{ return JSON.parse(text); }catch(e){ return { ok:false, error:'Bad JSON', raw:text }; }
}

async function botApi(path, params={}){
  if(!BOT_API_TOKEN) return { ok:false, error:'BOT_API_TOKEN missing in bot .env' };
  const url = new URL(BACKEND_BASE + path);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { headers: { 'X-Bot-Token': BOT_API_TOKEN } });
  const text = await res.text();
  try{ return JSON.parse(text); }catch(e){ return { ok:false, error:'Bad JSON', raw:text }; }
}

function mainMenu(lang='en'){
  return Markup.inlineKeyboard([
    [Markup.button.webApp(lang==='ar'?'فتح التطبيق':'Open App', BACKEND_BASE + '/?lang=' + lang)],
    [Markup.button.callback(lang==='ar'?'الرصيد':'Balance', 'q:bal'), Markup.button.callback(lang==='ar'?'الصفقات المفتوحة':'Open Trades', 'q:pos')],
    [Markup.button.callback(lang==='ar'?'خطط الاستثمار':'Investments', 'q:inv')],
    [Markup.button.callback(lang==='ar'?'إيداع (بوت)':'Deposit', 'q:dep'), Markup.button.callback(lang==='ar'?'سحب (بوت)':'Withdraw', 'q:wdr')],
  ]);
}

function parseStartPayload(text){
  // expecting: tp_<base64json>.<sig>
  const m = text.match(/tp_([A-Za-z0-9+/=_-]+)\.([a-f0-9]{64})/i);
  if(!m) return null;
  const payload = m[1];
  const sig = m[2];
  const calc = hmac(payload);
  if(calc !== sig) return null;
  const json = Buffer.from(payload, 'base64').toString('utf8');
  let data = null;
  try{ data = JSON.parse(json); }catch(e){}
  if(!data) return null;
  return { payload, sig, data };
}

bot.start(async (ctx) => {
  const text = ctx.message?.text || '';
  const p = parseStartPayload(text);

  if(!p){
    // Normal onboarding
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback('English', 'lang:en'), Markup.button.callback('العربية', 'lang:ar'), Markup.button.callback('Русский', 'lang:ru')],
    ]);
    await ctx.reply(
      "Welcome 👋\n\nThis bot helps you with Deposits & Withdrawals for TradoxPlus Mini.\n\nChoose your language:",
      kb
    );
    return;
  }

  // Intent flow from Mini App
  const { data, payload, sig } = p;
  const kind = String(data.kind||'').toLowerCase();
  const amount = Number(data.amount||0);
  if(!['deposit','withdraw'].includes(kind) || !(amount>0)){
    await ctx.reply("Invalid request payload.");
    return;
  }

  // Load methods
  const methodsRes = await fetchJson('/api/payment/methods_public.php');
  const methods = (methodsRes.ok && Array.isArray(methodsRes.methods)) ? methodsRes.methods : [];

  sessions.set(ctx.chat.id, { intent:{ kind, amount, currency:data.currency||'USDT', user_id:data.user_id, payload, sig }, methods, pickedMethod:null });

  if(methods.length===0){
    await ctx.reply("No payment methods available yet. Ask admin to add them in the Admin Panel.");
    return;
  }

  const buttons = methods
    .filter(m=> String(m.kind||'').toLowerCase()===kind || String(m.kind||'').toLowerCase()==='both')
    .slice(0, 20)
    .map(m => [Markup.button.callback(`${m.label} (${m.currency})`, `m:${m.code}`)]);

  await ctx.reply(
    `✅ ${kind.toUpperCase()} request\nAmount: ${amount} ${data.currency||'USDT'}\n\nSelect a payment method:`,
    Markup.inlineKeyboard(buttons)
  );
});

bot.command('menu', async (ctx) => {
  await ctx.reply('Menu:', mainMenu('en'));
});

bot.action(/lang:(en|ar|ru)/, async (ctx) => {
  const lang = ctx.match[1];
  const tgId = String(ctx.from?.id||'');
  const sig = hmac(`${tgId}|${lang}`);
  await fetchJson('/api/bot_set_lang.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tg_id: tgId, lang, sig }) });

  await ctx.answerCbQuery();
  await ctx.reply(
    lang==='ar'
      ? "تم حفظ اللغة ✅\nاضغط Open App لفتح التطبيق."
      : lang==='ru'
        ? "Язык сохранён ✅\nНажми Open App чтобы открыть приложение."
        : "Language saved ✅\nTap Open App to open the app.",
    mainMenu(lang)
  );
});

// Quick queries
bot.action('q:bal', async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = String(ctx.from?.id||'');
  const r = await botApi('/api/bot/balance.php', { telegram_id: telegramId });
  if(!r.ok) return ctx.reply(`❌ ${r.error||'Failed'}`);
  const b = r.balances || {};
  return ctx.reply(`Balances\n\nPrimary: $${Number(b.primary||0).toFixed(2)}\nTrade (Demo): $${Number(b.trade_demo||0).toFixed(2)}\nTrade (Real): $${Number(b.trade_real||0).toFixed(2)}`);
});

bot.action('q:pos', async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = String(ctx.from?.id||'');
  const r = await botApi('/api/bot/open_positions.php', { telegram_id: telegramId });
  if(!r.ok) return ctx.reply(`❌ ${r.error||'Failed'}`);
  const pos = Array.isArray(r.positions) ? r.positions : [];
  if(pos.length===0) return ctx.reply('No open positions.');
  const lines = pos.slice(0, 12).map(p => `#${p.id} ${p.symbol} ${String(p.market_type||'').toUpperCase()}/${String(p.mode||'').toUpperCase()} ${(p.side||'').toUpperCase()} x${p.leverage} | qty ${p.qty}`);
  return ctx.reply(`Open positions (${r.count})\n\n${lines.join('\n')}`);
});

bot.action('q:inv', async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = String(ctx.from?.id||'');
  const r = await botApi('/api/bot/investments.php', { telegram_id: telegramId });
  if(!r.ok) return ctx.reply(`❌ ${r.error||'Failed'}`);
  const plans = (r.plans||[]).slice(0, 10).map(p => `#${p.id} ${p.name} | ${p.term_days}d | ROI ${p.roi_percent}% | min $${p.min_amount}`);
  const mine = (r.my_investments||[]).slice(0, 10).map(i => `#${i.id} ${i.plan_name||('Plan '+i.plan_id)} | $${i.amount} | ${i.status}`);
  return ctx.reply(`Active Plans:\n${plans.length?plans.join('\n'):'None'}\n\nYour Investments:\n${mine.length?mine.join('\n'):'None'}`);
});

// Simple bot-driven deposit/withdraw requests (manual admin approval)
bot.action('q:dep', async (ctx) => {
  await ctx.answerCbQuery();
  sessions.set(ctx.chat.id, { ...sessions.get(ctx.chat.id), quick:{ step:'dep_amount' } });
  return ctx.reply('Send deposit amount in USD (example: 50).');
});

bot.action('q:wdr', async (ctx) => {
  await ctx.answerCbQuery();
  sessions.set(ctx.chat.id, { ...sessions.get(ctx.chat.id), quick:{ step:'wdr_amount' } });
  return ctx.reply('Send withdraw amount in USD (example: 25).');
});

bot.on('text', async (ctx, next) => {
  const s = sessions.get(ctx.chat.id);
  const q = s?.quick;
  if(!q) return next();

  const telegramId = String(ctx.from?.id||'');
  const text = (ctx.message?.text||'').trim();
  try{
    if(q.step==='dep_amount'){
      const amount = Number(text);
      if(!(amount>0)) return ctx.reply('Invalid amount. Send a number like 50.');
      const r = await botApi('/api/bot/request_deposit.php', { telegram_id: telegramId, amount, currency:'USDT', method:'BOT' });
      sessions.set(ctx.chat.id, { ...s, quick:null });
      if(!r.ok) return ctx.reply(`❌ ${r.error||'Failed'}`);
      return ctx.reply(`✅ Deposit request created. Status: ${r.status}. Ref: ${r.reference}\nAdmin will approve it manually.`);
    }

    if(q.step==='wdr_amount'){
      const amount = Number(text);
      if(!(amount>0)) return ctx.reply('Invalid amount. Send a number like 25.');
      sessions.set(ctx.chat.id, { ...s, quick:{ step:'wdr_address', amount } });
      return ctx.reply('Send destination address (optional: NETWORK:ADDRESS). Example: TRC20:TXYZ...');
    }

    if(q.step==='wdr_address'){
      const amount = q.amount;
      let network = '';
      let address = text;
      const parts = text.split(':');
      if(parts.length>=2 && parts[0].length<=10){
        network = parts[0].trim();
        address = parts.slice(1).join(':').trim();
      }
      if(!address) return ctx.reply('Please send a valid address.');
      const r = await botApi('/api/bot/request_withdraw.php', { telegram_id: telegramId, amount, currency:'USDT', method:'BOT', address, network });
      sessions.set(ctx.chat.id, { ...s, quick:null });
      if(!r.ok) return ctx.reply(`❌ ${r.error||'Failed'}`);
      return ctx.reply(`✅ Withdraw request created. Status: ${r.status}. Ref: ${r.reference}\nAdmin will approve it manually.`);
    }
  }catch(e){
    sessions.set(ctx.chat.id, { ...s, quick:null });
    return ctx.reply(`❌ Failed: ${e?.message||e}`);
  }
});

bot.action(/m:(.+)/, async (ctx) => {
  const code = ctx.match[1];
  const s = sessions.get(ctx.chat.id);
  if(!s || !s.intent){ await ctx.answerCbQuery('Session expired'); return; }
  s.pickedMethod = code;

  // show instructions
  const method = s.methods.find(x => String(x.code)===String(code));
  const instr = method?.instructions ? `\n\nInstructions:\n${method.instructions}` : '';
  await ctx.answerCbQuery();
  await ctx.reply(
    `✅ Method selected: ${method?.label || code}\nNow send a screenshot/photo as proof.${instr}`
  );
});

bot.on('photo', async (ctx) => {
  const s = sessions.get(ctx.chat.id);
  if(!s || !s.intent || !s.pickedMethod){
    await ctx.reply("Start a deposit/withdraw from the Mini App first.");
    return;
  }
  const photos = ctx.message.photo || [];
  const best = photos[photos.length - 1];
  const fileId = best?.file_id;
  if(!fileId){ await ctx.reply("No photo found."); return; }

  const proof_ref = `tg_photo:${fileId}`;
  const body = {
    payload: s.intent.payload,
    sig: s.intent.sig,
    method_code: s.pickedMethod,
    proof_ref
  };
  const r = await fetchJson('/api/wallet/bot_submit.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if(r.ok){
    await ctx.reply(`✅ Submitted. Your request is pending admin approval.\nRef #${r.id}`);
    sessions.delete(ctx.chat.id);
  }else{
    await ctx.reply(`❌ Failed: ${r.error || 'Unknown error'}`);
  }
});

bot.launch();
console.log('Bot running...');
