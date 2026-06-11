// === CRITICAL FIX: Comprehensive Price & Order System Audit ===
// 2026-06-03

// Function to validate price data from all sources
async function validateAllPrices() {
    console.log('[AUDIT] Starting comprehensive price validation...');
    
    try {
        // Test 1: Get prices from API
        const priceResponse = await fetch('api/quotes.php?type=all&nocache=' + Date.now());
        const priceData = await priceResponse.json();
        
        console.log('[AUDIT] Price Data Retrieved:', {
            crypto: priceData.crypto?.length || 0,
            forex: priceData.forex?.length || 0,
            stocks: priceData.stocks?.length || 0,
            commodities: priceData.commodities?.length || 0
        });
        
        // Validate specific critical prices
        const criticalPrices = {
            'EURUSD': { source: 'forex', expectedRange: [1.0, 1.2] },
            'XAUUSD': { source: 'commodities', expectedRange: [1500, 2500] },
            'BTCUSD': { source: 'crypto', expectedRange: [20000, 100000] },
            'USDJPY': { source: 'forex', expectedRange: [100, 150] }
        };
        
        let validationResults = {};
        for (const [symbol, config] of Object.entries(criticalPrices)) {
            const priceArray = priceData[config.source] || [];
            const priceObj = priceArray.find(p => p.symbol === symbol);
            
            if (!priceObj) {
                console.error(`[AUDIT] ❌ ${symbol} NOT FOUND in ${config.source}`);
                validationResults[symbol] = 'MISSING';
            } else if (priceObj.price < config.expectedRange[0] || priceObj.price > config.expectedRange[1]) {
                console.warn(`[AUDIT] ⚠️ ${symbol} price OUT OF RANGE: ${priceObj.price}`);
                validationResults[symbol] = `OUT_OF_RANGE (${priceObj.price})`;
            } else {
                console.log(`[AUDIT] ✅ ${symbol} = ${priceObj.price}`);
                validationResults[symbol] = priceObj.price;
            }
        }
        
        return validationResults;
    } catch (error) {
        console.error('[AUDIT] Price validation error:', error);
        return null;
    }
}

// Function to test order placement with detailed logging
async function testOrderPlacement(symbol, type, volume) {
    console.log(`[AUDIT] Testing order placement: ${symbol} ${type} ${volume}...`);
    
    // Step 1: Get current price
    const priceResp = await fetch(`api/quotes.php?symbol=${symbol}&nocache=${Date.now()}`);
    const priceData = await priceResp.json();
    const currentPrice = priceData[0]?.price;
    
    console.log(`[AUDIT] Step 1 - Current Price: ${symbol} = ${currentPrice}`);
    
    if (!currentPrice) {
        console.error('[AUDIT] ❌ FAILED: No price available');
        return false;
    }
    
    // Step 2: Prepare order request
    const orderPayload = {
        symbol: symbol,
        type: type,
        volume: volume,
        price: currentPrice,
        account_mode: localStorage.getItem('current_account_mode') || 'demo',
        timestamp: new Date().toISOString()
    };
    
    console.log('[AUDIT] Step 2 - Order Payload:', orderPayload);
    
    // Step 3: Send order request
    const orderResp = await fetch('api/trade/place_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
    });
    
    const orderData = await orderResp.json();
    console.log('[AUDIT] Step 3 - Order Response:', {
        status: orderResp.status,
        data: orderData
    });
    
    if (!orderResp.ok || !orderData.success) {
        console.error('[AUDIT] ❌ Order placement failed:', orderData.error);
        return false;
    }
    
    const signalId = orderData.signal_id;
    console.log(`[AUDIT] Step 4 - Order Created: Signal ID = ${signalId}`);
    
    // Step 5: Verify order appears in portfolio
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const portfolioResp = await fetch(`api/trade/orders.php?refresh=true&account_mode=${orderPayload.account_mode}`);
    const portfolioData = await portfolioResp.json();
    
    console.log('[AUDIT] Step 5 - Portfolio after order:', {
        totalOrders: portfolioData.orders?.length || 0,
        latestOrder: portfolioData.orders?.[0],
        orderFound: portfolioData.orders?.some(o => o.signal_id === signalId)
    });
    
    if (!portfolioData.orders?.some(o => o.signal_id === signalId)) {
        console.error('[AUDIT] ❌ Order created but NOT appearing in portfolio!');
        return false;
    }
    
    console.log('[AUDIT] ✅ Order placement SUCCESSFUL');
    return true;
}

// Function to check account mode consistency
async function checkAccountModeConsistency() {
    console.log('[AUDIT] Checking account mode consistency...');
    
    const sessionMode = localStorage.getItem('current_account_mode') || 'demo';
    console.log(`[AUDIT] Session Mode: ${sessionMode}`);
    
    // Get from API
    const accountResp = await fetch('api/auth/get_account_mode.php');
    const accountData = await accountResp.json();
    console.log('[AUDIT] API Account Mode:', accountData);
    
    if (sessionMode !== (accountData.mode || 'demo')) {
        console.error('[AUDIT] ❌ MODE MISMATCH!');
        console.error(`[AUDIT]    Session: ${sessionMode}`);
        console.error(`[AUDIT]    API: ${accountData.mode}`);
        return false;
    }
    
    console.log('[AUDIT] ✅ Account modes match');
    return true;
}

// === RUN AUDIT ===
// To use in console:
console.log('=== MEX PLATFORM COMPREHENSIVE AUDIT ===');
console.log('Run in order:');
console.log('1. await validateAllPrices()');
console.log('2. await testOrderPlacement("EURUSD", "buy", 1.0)');
console.log('3. await checkAccountModeConsistency()');