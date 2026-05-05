import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const API_URL = '/v3/api'

function Home() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/prices.php?type=crypto`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setMarkets(data.items.slice(0, 10))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome to VertexPluse</h1>
        <p className="text-gray-400">Trade crypto, forex, stocks, and futures with real-time prices</p>
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
        <div className="px-4 py-3 border-b border-dark-600 flex items-center justify-between">
          <h2 className="font-semibold">Top Crypto Markets</h2>
          <Link to="/markets" className="text-primary-500 text-sm hover:underline">View All →</Link>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton h-12 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-dark-600">
            {markets.map(m => (
              <Link 
                key={m.symbol}
                to={`/trade/${m.symbol}`}
                className="px-4 py-3 flex items-center justify-between hover:bg-dark-700 transition"
              >
                <div>
                  <div className="font-medium">{m.symbol}</div>
                  <div className="text-sm text-gray-400">{m.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-medium">
                    ${m.price > 0 ? m.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 8}) : '-'}
                  </div>
                  <div className={`text-sm ${m.change_pct >= 0 ? 'price-up' : 'price-down'}`}>
                    {m.change_pct >= 0 ? '+' : ''}{m.change_pct.toFixed(2)}%
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
