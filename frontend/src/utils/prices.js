// Function to get latest forex prices
function getForexPrices() {
    try {
        const response = fetch('api/quotes.php?type=forex', {
            method: 'GET',
            cache: 'no-store', // Prevent caching of forex prices
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        return response.then(res => {
            if (!res.ok) {
                console.error('[getForexPrices] HTTP error:', res.status);
                return null;
            }
            return res.json();
        }).catch(error => {
            console.error('[getForexPrices] Fetch error:', error);
            return null;
        });
    } catch (error) {
        console.error('[getForexPrices] Exception:', error);
        return null;
    }
}

// Function to refresh all market prices
async function refreshAllPrices() {
    try {
        const types = ['crypto', 'forex', 'stocks', 'commodities', 'indices'];
        const prices = {};
        
        for (const type of types) {
            const response = await fetch(`api/quotes.php?type=${type}&nocache=${Date.now()}`, {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });
            
            if (response.ok) {
                prices[type] = await response.json();
                console.log(`[refreshAllPrices] ${type} prices updated`);
            } else {
                console.error(`[refreshAllPrices] Failed to fetch ${type} prices`);
            }
        }
        
        return prices;
    } catch (error) {
        console.error('[refreshAllPrices] Exception:', error);
        return null;
    }
}

// Ensure prices are updated on trade page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('trade')) {
        refreshAllPrices();
        // Refresh every 5 seconds
        setInterval(refreshAllPrices, 5000);
    }
});