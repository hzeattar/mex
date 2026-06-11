// Function to get latest forex prices
async function getForexPrices() {
    try {
        const response = await fetch('api/quotes.php?type=forex', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        return null;
    }
}

// Function to refresh all market prices in parallel
async function refreshAllPrices() {
    try {
        const types = ['crypto', 'forex', 'stocks', 'commodities', 'indices'];
        const results = await Promise.allSettled(
            types.map(type =>
                fetch(`api/quotes.php?type=${type}`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                }).then(res => res.ok ? res.json() : null).catch(() => null)
            )
        );
        const prices = {};
        types.forEach((type, i) => {
            if (results[i].status === 'fulfilled' && results[i].value) {
                prices[type] = results[i].value;
            }
        });
        return prices;
    } catch (error) {
        return null;
    }
}

// Ensure prices are updated on trade page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('trade')) {
        refreshAllPrices();
        // Refresh every 15 seconds (reduced from 5s to lower server load)
        setInterval(refreshAllPrices, 15000);
    }
});