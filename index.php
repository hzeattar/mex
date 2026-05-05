<?php
DECLARE(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';

$isLoggedIn = session_user_id() > 0;
$s = site_defaults();
$tgBot = telegram_login_bot_username();
$brand = htmlspecialchars($s['brand'], ENT_QUOTES);
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#050a16">
  <meta name="description" content="<?php echo htmlspecialchars($s['tagline'], ENT_QUOTES); ?>">
  <title><?php echo $brand; ?></title>
  <link rel="dns-prefetch" href="//telegram.org">
  <link rel="preconnect" href="https://telegram.org" crossorigin>
  <link rel="dns-prefetch" href="//cdn.jsdelivr.net">
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__.'/assets/css/public-site.css') ?: time(); ?>">
</head>
<body class="landing-page">
  <div class="utility-bar">
    <div class="container utility-inner">
      <div class="utility-left">
        <span>AE 800703040</span>
        <a href="#support">Contact Us</a>
      </div>
      <div class="utility-right">
        <?php if ($isLoggedIn): ?>
          <a href="/app.php#/home">Open Dashboard</a>
          <a class="btn mini primary" href="/logout.php">Log out</a>
        <?php else: ?>
          <a href="/login.php">Log in</a>
          <a class="btn mini primary" href="/register.php">Start Trading</a>
        <?php endif; ?>
      </div>
    </div>
  </div>

  <header class="site-header site-header-landing">
    <div class="container site-header-inner landing-header-grid">
      <a class="site-brand landing-brand" href="/">
        <span class="site-brand-mark"><?php echo $brand; ?></span>
        <span class="site-brand-sep">PART OF</span>
        <span class="site-brand-main">Trading Platform</span>
      </a>

      <nav class="site-nav landing-nav">
        <a href="#about">About</a>
        <a href="#products">Products</a>
        <a href="#platforms">Platforms</a>
        <a href="#accounts">Accounts</a>
        <a href="#funding">Funding</a>
        <a href="#support">Support</a>
        <a href="/login.php">EN</a>
      </nav>

      <div class="site-actions site-actions-landing">
        <?php if ($isLoggedIn): ?>
          <a class="btn ghost" href="/logout.php">Log Out</a>
          <a class="btn primary" href="/app.php#/home">Open Dashboard</a>
        <?php else: ?>
          <a class="btn ghost" href="/login.php?next=<?php echo rawurlencode('/app.php#/home'); ?>">Log In</a>
          <a class="btn primary" href="/register.php?next=<?php echo rawurlencode('/app.php#/home'); ?>">Start Trading</a>
        <?php endif; ?>
      </div>
    </div>
  </header>

  <section class="landing-hero landing-hero-v3">
    <div class="landing-hero-bg"></div>
    <div class="container hero-inner hero-inner-v3">
      <div class="hero-copy-stack compact">
        <?php
          $heroTitleRaw = trim((string)($s['hero_title'] ?? 'Life is Better with Money'));
          $heroLead = $heroTitleRaw;
          $heroTail = '';
          if (preg_match('/^(.*)\s+with\s+(.*)$/i', $heroTitleRaw, $m)) {
            $heroLead = trim((string)$m[1]);
            $heroTail = trim((string)$m[2]);
          }
        ?>
        <h1 class="hero-title hero-title-ref">
          <?php if ($heroTail !== ''): ?>
            <span class="hero-line"><?php echo htmlspecialchars($heroLead, ENT_QUOTES); ?></span>
            <span class="hero-line">with <span class="hero-accent"><?php echo htmlspecialchars($heroTail, ENT_QUOTES); ?></span></span>
          <?php else: ?>
            <?php echo htmlspecialchars($heroTitleRaw, ENT_QUOTES); ?>
          <?php endif; ?>
        </h1>
        <p class="hero-sub hero-sub-ref"><?php echo htmlspecialchars($s['hero_subtitle'], ENT_QUOTES); ?></p>
        <div class="hero-actions">
          <?php if ($isLoggedIn): ?>
            <a class="btn primary" href="/app.php#/home">Open Dashboard</a>
            <a class="btn outline" href="/app.php#/markets">Browse Markets</a>
          <?php else: ?>
            <a class="btn primary" href="<?php echo htmlspecialchars($s['hero_primary_url'], ENT_QUOTES); ?>"><?php echo htmlspecialchars($s['hero_primary_text'], ENT_QUOTES); ?></a>
            <a class="btn outline" href="<?php echo htmlspecialchars($s['hero_secondary_url'], ENT_QUOTES); ?>"><?php echo htmlspecialchars($s['hero_secondary_text'], ENT_QUOTES); ?></a>
          <?php endif; ?>
        </div>
        <div class="hero-mini">Multiple Platforms, <span>Infinite Possibilities</span></div>
        <div class="hero-platform-row">
          <div class="hero-platform-pill"><span class="hero-platform-icon">▣</span> <?php echo $brand; ?> App</div>
          <div class="hero-platform-pill"><span class="hero-platform-icon">◉</span> MetaTrader 4 &amp; 5</div>
          <?php if ($tgBot !== ''): ?>
            <div class="hero-platform-pill"><span class="hero-platform-icon">✈</span> Telegram Login</div>
          <?php endif; ?>
        </div>
        <div class="hero-live-strip" id="heroLiveStrip">
          <div class="hero-live-pill" data-live-symbol="BTCUSDT"><span>BTCUSDT</span><strong>—</strong><small>Loading</small></div>
          <div class="hero-live-pill" data-live-symbol="EURUSD"><span>EURUSD</span><strong>—</strong><small>Loading</small></div>
          <div class="hero-live-pill" data-live-symbol="XAUUSD"><span>XAUUSD</span><strong>—</strong><small>Loading</small></div>
        </div>
      </div>
    </div>
  </section>

  <div class="cookie-strip">
    <div class="container cookie-strip-inner">
      <div>By clicking “Accept All Cookies”, you agree to the storing of cookies on your device to enhance site navigation, analyze site usage, and assist in our marketing efforts.</div>
      <button class="cookie-btn" type="button">Accept All Cookies</button>
    </div>
  </div>

  <section id="about" class="landing-section landing-intro compact-top">
    <div class="container narrow text-center">
      <div class="section-kicker">Our products</div>
      <p class="landing-intro-copy">Confidently trade with <?php echo $brand; ?> cutting-edge trading platforms offering groundbreaking levels of stability and reliability. Subscribe and execute on tight pricing and liquidity while keeping registration, KYC, deposits, withdrawals, and portfolio management inside one clean web workflow.</p>
    </div>
  </section>

  <section id="products" class="landing-section products-section">
    <div class="container">
      <div class="pill-row center">
        <button class="section-pill active" type="button" data-market-type="forex">Forex</button>
        <button class="section-pill" type="button" data-market-type="commodities">Metals</button>
        <button class="section-pill" type="button" data-market-type="stocks">Shares</button>
        <button class="section-pill" type="button" data-market-type="forex">Indices</button>
        <button class="section-pill" type="button" data-market-type="commodities">Commodities</button>
      </div>

      <div class="product-feature-grid refined">
        <div class="product-copy-card">
          <div class="section-kicker">Forex</div>
          <h2 class="section-title left">Invest in <span>Forex</span></h2>
          <p class="section-sub left">Trade over 55 major, cross, and exotic Forex pairs, and benefit from tight spreads in the industry.</p>
          <div class="feature-box-grid">
            <div class="feature-box"><strong>Up to 500:1</strong><small>Highest levels of leverage</small></div>
            <div class="feature-box"><strong>0.0* Pips</strong><small>Tightest spreads in the industry</small></div>
          </div>
        </div>
        <div class="product-visual-card refined">
          <div class="phone-shell">
            <div class="phone-glow"></div>
            <div class="phone-screen" id="productPhoneWidget">
              <div class="phone-header" id="productPhoneSymbol">EUR / USD</div>
              <div class="phone-price" id="productPhonePrice">—</div>
              <div class="phone-change" id="productPhoneChange">Loading</div>
              <div class="phone-chart"></div>
            </div>
          </div>
          <div class="coin-stack coin-eur">EUR</div>
          <div class="coin-stack coin-usd">USD</div>
        </div>
      </div>

      <div class="ticker-row refined" id="landingTickerRow">
        <div class="ticker-card" data-symbol="NZDUSD"><span>NZDUSD</span><strong>—</strong><small>Loading</small></div>
        <div class="ticker-card" data-symbol="GBPUSD"><span>GBPUSD</span><strong>—</strong><small>Loading</small></div>
        <div class="ticker-card" data-symbol="USDCAD"><span>USDCAD</span><strong>—</strong><small>Loading</small></div>
        <div class="ticker-card" data-symbol="AUDUSD"><span>AUDUSD</span><strong>—</strong><small>Loading</small></div>
        <div class="ticker-card" data-symbol="USDCHF"><span>USDCHF</span><strong>—</strong><small>Loading</small></div>
        <div class="ticker-card" data-symbol="EURUSD"><span>EURUSD</span><strong>—</strong><small>Loading</small></div>
      </div>

      <div class="center" style="margin-top:24px">
        <a class="btn outline" href="/app.php#/markets">View More</a>
      </div>
    </div>
  </section>

  <section id="platforms" class="landing-section platforms-section">
    <div class="container">
      <div class="section-kicker text-center">Platforms</div>
      <h2 class="section-title text-center">Explore our Mobile Trading Platforms</h2>
      <div class="pill-row center smaller">
        <span class="section-pill active">MT4 / MT5</span>
        <span class="section-pill">MultiBank Trader 4/5</span>
        <span class="section-pill active-light"><?php echo $brand; ?> App <em>Coming Soon</em></span>
      </div>

      <div class="platform-split">
        <div class="platform-copy">
          <div class="section-kicker">Investing Redefined</div>
          <h3>Get a smarter and faster mobile trading experience on the go, designed for you as a modern investor.</h3>
          <ul class="platform-points">
            <li>Trade seamlessly, anytime, anywhere.</li>
            <li>Access multiple investment tools, all in one place.</li>
            <li>Enjoy web-first onboarding, funding, and KYC.</li>
            <li>Receive tailored real-time market updates.</li>
          </ul>
          <div class="step-list">
            <div class="step-item"><span>1</span><div><strong>Download Mobile App</strong><small>High-performance app for iOS and Android.</small></div></div>
            <div class="step-item"><span>2</span><div><strong>Register</strong><small>Open your account in minutes.</small></div></div>
            <div class="step-item"><span>3</span><div><strong>Fund your account and start trading</strong><small>Top up your live wallet and begin.</small></div></div>
          </div>
        </div>
        <div class="platform-art">
          <div class="platform-device-group">
            <div class="device-main"></div>
            <div class="device-mini one"></div>
            <div class="device-mini two"></div>
            <div class="device-mini three"></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="accounts" class="landing-section accounts-section">
    <div class="container">
      <div class="section-kicker text-center">Accounts</div>
      <h2 class="section-title text-center smaller-title">Select an Account That Suits Your Trading Style</h2>
      <div class="accounts-grid polished">
        <article class="account-card standard">
          <div class="account-icon">◔</div>
          <h3><span>Standard</span> Account</h3>
          <p>A commission-free account that is perfect for new traders looking to start investing. Standard accounts offer instant execution and stable spreads.</p>
          <div class="account-points">
            <div class="account-point"><i>✓</i> Minimum Initial Deposit of $50</div>
            <div class="account-point"><i>✓</i> Spreads from 1.5 pips</div>
            <div class="account-point"><i>✓</i> Leverage up to 1:500</div>
          </div>
        </article>
        <article class="account-card pro">
          <div class="account-icon">◎</div>
          <h3><span>Pro</span> Account</h3>
          <p>The pro account is suitable for traders looking to take advantage of zero commissions, tight spreads, and instant execution.</p>
          <div class="account-points">
            <div class="account-point"><i>✓</i> Minimum Initial Deposit of $1000</div>
            <div class="account-point"><i>✓</i> Spreads from 0.8 pips</div>
            <div class="account-point"><i>✓</i> Leverage up to 1:500</div>
          </div>
        </article>
        <article class="account-card ecn">
          <div class="account-icon">◉</div>
          <h3><span>ECN</span> Account</h3>
          <p>An ECN account is best suited for traders looking for raw spreads and instant execution.</p>
          <div class="account-points">
            <div class="account-point"><i>✓</i> Minimum Initial Deposit of $10000</div>
            <div class="account-point"><i>✓</i> Spreads from 0.0 pips</div>
            <div class="account-point"><i>✓</i> Leverage up to 1:500</div>
          </div>
        </article>
      </div>

      <div class="bonus-band refined" id="funding">
        <div class="bonus-card bonus-card-left"><div class="bonus-big">25%</div><div class="bonus-label">Deposit Bonus</div></div>
        <div class="bonus-card bonus-card-right">
          <h3>Receive up to <span>$40,000</span></h3>
          <p>in tradable and withdrawable bonuses</p>
          <?php if ($isLoggedIn): ?>
            <a class="btn primary" href="/app.php#/wallet">Fund Live Account</a>
          <?php else: ?>
            <a class="btn primary" href="/register.php">Start Trading Now</a>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </section>

  <section class="landing-section">
    <div class="container">
      <h2 class="section-title text-center smaller-title">Choose Where To Go Next</h2>
      <div class="next-grid refined">
        <a class="next-card" href="#about"><div class="next-icon">📣</div><h3>Why Us</h3></a>
        <a class="next-card" href="/app.php#/wallet"><div class="next-icon">💼</div><h3>Account Funding</h3></a>
        <a class="next-card" href="#support"><div class="next-icon">🛡</div><h3>Support</h3></a>
      </div>
    </div>
  </section>

  <section class="landing-section landing-cta">
    <div class="container">
      <div class="join-band">
        <div>
          <div class="section-kicker light">Want to get started?</div>
          <h3>Open your account and move from landing to dashboard in one clean workflow.</h3>
        </div>
        <div class="join-actions">
          <?php if ($isLoggedIn): ?>
            <a class="btn dark" href="/app.php#/home">Open Dashboard</a>
          <?php else: ?>
            <a class="btn dark" href="/register.php?next=<?php echo rawurlencode('/app.php#/home'); ?>">Join <?php echo $brand; ?></a>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </section>

  <footer id="footer" class="landing-footer">
    <div class="container footer-topline">
      <div class="footer-brand"><?php echo $brand; ?><small><?php echo htmlspecialchars($s['tagline'], ENT_QUOTES); ?></small></div>
      <div class="footer-mini-links"><a href="#">My KYC</a><a href="#support">Contact Us</a><a href="#support">Support</a></div>
    </div>
    <div class="container footer-grid-landing">
      <div>
        <h4>About</h4>
        <a href="#about">Why Us</a>
        <a href="#">Regulations</a>
      </div>
      <div>
        <h4>Products</h4>
        <a href="/app.php#/markets">Forex</a>
        <a href="/app.php#/markets">Metals</a>
        <a href="/app.php#/markets">Shares</a>
        <a href="/app.php#/markets">Indices</a>
        <a href="/app.php#/markets">Commodities</a>
      </div>
      <div>
        <h4>Platforms</h4>
        <a href="/app.php#/trade"><?php echo $brand; ?> App</a>
        <a href="/app.php#/trade">MT4 Platform</a>
        <a href="/app.php#/trade">MT5 Platform</a>
        <a href="/app.php#/trade">Web Terminal</a>
      </div>
      <div>
        <h4>Accounts</h4>
        <a href="/register.php">Standard</a>
        <a href="/register.php">Pro</a>
        <a href="/register.php">ECN</a>
        <a href="/app.php#/wallet">Account Funding</a>
        <a href="/app.php#/wallet">Withdrawals</a>
      </div>
      <div id="support">
        <h4>Tools</h4>
        <a href="/app.php#/trade">Trading Tools</a>
        <a href="/app.php#/markets">Trading Conditions</a>
        <a href="/app.php#/invest">Education</a>
        <a href="mailto:<?php echo htmlspecialchars($s['support_email'], ENT_QUOTES); ?>">Support Email</a>
        <?php if ($tgBot !== ''): ?><a href="/login.php?next=<?php echo rawurlencode('/app.php#/home'); ?>#telegram-login">Telegram Sign In</a><?php endif; ?>
      </div>
    </div>
    <div class="container footer-bottomline">
      <div class="footer-accept">We accept <span>VISA</span> <span>Mastercard</span></div>
      <div class="footer-policy-row">
        <a href="#">Privacy Policy</a>
        <a href="#">Cookie Policy</a>
        <a href="#">Terms &amp; Conditions</a>
        <a href="#">Risk Warning</a>
      </div>
      <p class="footer-disclaimer"><?php echo htmlspecialchars($s['public_footer_note'], ENT_QUOTES); ?> Contact: <a href="mailto:<?php echo htmlspecialchars($s['support_email'], ENT_QUOTES); ?>"><?php echo htmlspecialchars($s['support_email'], ENT_QUOTES); ?></a></p>
    </div>
  </footer>
  <script src="/assets/js/public-site.js?v=<?php echo @filemtime(__DIR__.'/assets/js/public-site.js') ?: time(); ?>" defer></script>
</body>
</html>
