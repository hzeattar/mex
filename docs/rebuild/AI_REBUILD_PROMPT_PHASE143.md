# VertexPluse Phase 143 — Full Rebuild Prompt (Post-Audit, No More Patching)

You are a senior full-stack engineer with 20+ years of experience building production-grade trading systems.

Your task is **not** to patch random files.
Your task is to **rebuild the broken live-data architecture** of an existing PHP + JS web trading platform called **VertexPluse** while preserving the current external product shape, routes, visual identity, pages, and overall UI layout.

---

## 0) Baseline and Working Rules

### Baseline package to work on
Use this package as the single rebuild baseline:

`vertexpluse_phase142_market_ui_live_rootfix_2026_04_21.zip`

Do **not** start from the later experimental pass zips.
Those later zips are audit/comparison references only.

### Absolute rules
- Do **not** keep patching the old live-data loops.
- Do **not** add more hotfix timers.
- Do **not** keep multiple quote ownership paths alive.
- Do **not** mix route warming with active price rendering.
- Do **not** keep synthetic/fake ticks as if they were real live ticks.
- Do **not** break the existing pages, visual structure, or navigation.
- Do **not** remove the current desktop/mobile layout unless a specific rebuilt component replaces it.
- Do **not** expose secrets from `.env`; ship `.env.example` or sanitized samples only.

### Project context
This is a web trading platform with:
- Markets: Crypto / Forex / Stocks / Arab Stocks / Commodities / Futures or Perpetuals
- Modes: Demo / Real
- Pages: Dashboard, Trade, Portfolio, Earn, Payments, Admin
- Existing UI should remain visually familiar
- Main rebuild target is the **live market data architecture**

---

## 1) What the audit already proved

The current problems are architectural, not cosmetic:

1. **Multiple front-end live orchestrators exist at the same time**
   - active trade quote path
   - market rows path
   - drawer path
   - watchlist/home/signal loops
   - route warming / global priming

2. **Multiple back-end writers exist for `market_quotes`**
   - `quotes_tick()`
   - `quote_price_fresh()` side effects / fresh fetch flows
   - `quotes_warm.php`
   - some `trade/stream.php` paths
   - read-path persistence exists in code and must stay disabled or be removed safely

3. **`quotes.php` behaves like a mini-orchestrator, not a clean controller**
   It currently mixes:
   - direct mode
   - visible mode
   - fresh mode
   - micro cache
   - fresh cache
   - stale cache
   - DB fast paths
   - provider live paths

4. **Chart history and chart live tail are not guaranteed to come from the same authority**

5. **Tick ingestion is unsafe**
   - current `market_ingest.php` can inject `seed_price`
   - can fall back to fake default values such as `1.0`, `100.0`, `50.0`
   - current `market_ticks` design is too weak for safe live-stream usage

6. **Background warming currently competes with active UI paths**

---

## 2) Core rebuild decision

Do **not** rebuild the whole project.
Rebuild only the broken layers:

1. **Tick / Stream Layer**
2. **Back-end Quote Authority Layer**
3. **Front-end Live Orchestrator**
4. **Chart Pipeline**
5. **Warm / Prime isolation**

Keep the current:
- routes
- pages
- visual identity
- admin/product logic unrelated to live pricing
- most UI layout structure

---

## 3) Rebuild targets and file boundaries

### A. Tick / Stream Layer — rebuild from scratch
Current risky files:
- `api/cron/market_ingest.php`
- any tick-based candles depending on `market_ticks`
- tick-derived logic inside `api/trade/stream.php`

#### Required new design
Create a proper tick layer with strict validation.

New or replacement modules:
- `api/lib/tick_store.php`
- `api/lib/tick_ingest.php`
- `api/lib/tick_stream.php`
- `api/lib/tick_validate.php`

#### Required rules
- Never insert fake live ticks.
- Never treat `seed_price` as a live tick.
- Never write default values like `1.0`, `100.0`, `50.0` as market ticks.
- Tick records must carry at least:
  - `symbol`
  - `type`
  - `market`
  - `price`
  - `volume`
  - `source`
  - `ts`
- Any stream-candle logic must use validated real ticks only.
- No symbol-only ambiguity.

#### Acceptance criteria
- No fake ticks enter storage.
- No symbol-only contamination across families/types.
- Stream candles never use placeholder prices.

---

### B. Back-end Quote Authority Layer — rebuild from scratch
Current risky files:
- `api/lib/quotes.php`
- `api/quotes.php`
- `api/markets.php`
- `api/market_snapshot.php`
- parts of `api/trade/stream.php`

#### Required new modules
- `api/lib/quote_authority.php`
- `api/lib/quote_sources.php`
- `api/lib/quote_cache_policy.php`
- `api/lib/quote_store.php`
- `api/lib/quote_batch.php`
- `api/lib/quote_freshness.php`

#### Required architecture
All read endpoints must become thin controllers.
They must consume a single quote authority layer.

That authority layer must decide:
- source ranking
- freshness rules
- stale acceptance rules
- cache usage rules
- batch behavior
- direct/visible/fresh modes as flags, not separate conflicting authorities

#### Hard rules
- Read endpoints must not write quote state.
- Writing must come from one controlled writer path only.
- `quotes.php`, `markets.php`, and `market_snapshot.php` must return coherent quote authority results.
- `direct`, `visible`, `fresh` are modes on top of one authority, not separate quote universes.
- Preserve support for all required families.

#### Acceptance criteria
For the same symbol and type, quote authority must remain logically consistent across:
- `quotes.php`
- `markets.php`
- `market_snapshot.php`
- trade header usage
- dashboard cards usage

No more `old -> new -> old` due to endpoint disagreement.

---

### C. Writers cleanup
Current writers are too many.

#### Goal
Reduce quote persistence to one intentional writer topology.

#### Required action
Audit and refactor:
- `api/cron/quotes_tick.php`
- `api/cron/quotes_warm.php`
- side effects from `quote_price_fresh()`
- side effects from `trade/stream.php`

#### Target state
- one main writer path
- any warm job must never downgrade active quote quality
- read paths must not persist quote state
- if compatibility hooks remain temporarily, they must be disabled and clearly marked for removal

---

### D. Front-end Live Orchestrator — rebuild from scratch
Current risky files:
- `assets/js/app.js`
- `assets/js/multibank-theme.js`

#### Required new front-end modules
- `assets/js/live/live-orchestrator.js`
- `assets/js/live/live-store.js`
- `assets/js/live/live-scheduler.js`
- `assets/js/live/live-selectors.js`
- `assets/js/live/live-adapters.js`

#### Required architecture
Create one front-end live data owner that manages:
- active trade symbol
- market rows
- symbols drawer visible rows
- watchlist visible rows
- dashboard cards
- signal cards
- visibility changes
- idle/restore behavior
- backoff and cadence
- network prioritization

#### Priority model
Use clear priority tiers:
1. active trade symbol
2. visible rows in current trade drawer / market screen
3. visible watchlist rows
4. dashboard cards / signal cards
5. background warming

#### Hard rules
- No competing pollers for the same symbol family at the same time.
- No extra fetch loops owned by drawer, market page, home, and trade simultaneously.
- Background warming must never directly overwrite active UI state.
- The new orchestrator must be the only owner of live fetch cadence.

#### Acceptance criteria
- Fewer pending/cancelled requests
- Trade symbol loads first
- Visible rows update without storms
- Drawer opening does not create cross-family fetch churn
- Header / market row / drawer row / card stay coherent

---

### E. Chart Pipeline — rebuild from scratch or near-scratch
Current risky files:
- `api/trade/candles.php`
- chart-related helpers in marketdata/quotes integrations
- front-end symbol switch / timeframe switch chart hooks

#### Required new modules
- `api/lib/chart_history.php`
- `api/lib/chart_live_tail.php`
- `api/lib/chart_resync.php`
- `api/lib/chart_symbol_map.php`

#### Required rules
- One clear history source policy per family
- Live tail must come from the same quote authority layer
- Same symbol normalization rules as quote authority
- Synthetic candles only on explicit failure, clearly marked
- Cache preserve/resume behavior must follow a clear resync policy

#### Acceptance criteria
For `EURUSD`, `AAPL`, `2222`, `XAUUSD`, `ES_F`:
- first chart paint is valid
- timeframe switch is valid
- symbol switch does not leak callbacks from previous symbol
- last candle stays logically coherent with current live price
- long-idle restore triggers clean reseed/resync

---

### F. Warm / Prime isolation
Current risky logic:
- route warming
- global market priming
- cross-family deferred waves

#### Required target
Keep warming only as a secondary hint system.
Never let it compete with active UI updates.

#### Rules
- warm paths do not own visible UI state
- warm paths do not run cross-family storms
- warm paths operate under the new front-end orchestrator only

---

## 4) Dashboard switcher UI/UX requirement (must be included)

In addition to the live-data rebuild, improve the **dashboard account mode switcher** (Demo / Real) visually and behaviorally.

### The switcher must:
- look premium and intentional, not cramped or like a default toggle
- match the dark trading UI style of VertexPluse
- work well on both desktop and mobile
- have clear active/inactive states
- have cleaner spacing, radius, alignment, and typography
- avoid layout jumping
- feel like a high-end trading platform switcher

### Functional expectations
- Demo and Real states must be visually obvious
- active mode must reflect the correct account context
- switching must not cause stale balance flashes from the other mode
- do not mix Demo and Real balances in the dashboard cards
- if Real mode actions require KYC or restrictions, the UI should remain visually clean and consistent

### Deliverables for the switcher
- UI/UX improvement in dashboard
- same clean style extended where needed in mobile dashboard
- no flicker between account states

---

## 5) Preserve these business rules
- Demo and Real must never mix.
- Trading page structure should stay familiar.
- Existing product modules such as Portfolio, Earn, Payments, Admin should keep working.
- Do not regress desktop layout.
- Do not break mobile.
- Keep the current route structure unless a replacement is deliberate and fully mapped.

---

## 6) Required implementation strategy

### Phase 1
Build:
- Tick / Stream layer
- Quote Authority skeleton
- Convert `api/quotes.php` into a thin controller over the new authority layer

### Phase 2
Move:
- `api/markets.php`
- `api/market_snapshot.php`
- remaining quote reads
onto the new authority layer

Then clean writer topology.

### Phase 3
Build front-end live orchestrator and migrate:
- active trade symbol
- market rows
- drawer rows
- home/watchlist/signal loops

### Phase 4
Rebuild chart pipeline and connect it to quote authority.

### Phase 5
Isolate warm/prime behavior under the orchestrator.

### Phase 6
Polish dashboard switcher UI/UX and ensure mode-state stability.

---

## 7) Required reporting while implementing
For every phase produce:
1. files created
2. files replaced
3. files deprecated/frozen
4. migration notes
5. risk notes
6. validation notes

---

## 8) Required validation set
Validate repeatedly on:
- `EURUSD`
- `AUDUSD`
- `AAPL`
- `MSFT`
- `2222`
- `XAUUSD`
- `BRENT`
- `USOIL`
- `COPPER`
- `ES_F`
- `ZN_F`

For each symbol confirm:
- active quote speed
- market row speed
- drawer row speed
- chart speed
- no stale replay
- no `old -> new -> old`
- no request storms
- no cancel storms
- no cross-family contamination

---

## 9) Final expectation
You are not patching a bug.
You are rebuilding the broken live-data architecture into a clean, centralized system while preserving the existing product and UI shell.

The final result must be:
- cleaner
- faster
- deterministic
- easier to maintain
- safer under long sessions
- consistent across market rows, active trade, drawer, dashboard cards, and charts

