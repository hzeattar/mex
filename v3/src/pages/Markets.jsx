import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const API_URL = '/v3/api'
const TYPES = [
  { id: 'crypto', name: 'Crypto' },
  { id: 'forex', name: 'Forex' },
  { id: 'stocks', name: 'Stocks' },
  { id: 'futures', name: 'Futures' },
  { id: 'arab', name: 'Arab' },
]

function Markets() {
  const [activeType, setActiveType] = useState('crypto')
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/prices.php?type=${activeType}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setMarkets(data.items)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [activeType])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Markets</h1>

      {/* Type Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveType(t.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
              activeType === t.id 
                ? 'bg-primary-600 text-white' 
                : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Markets List */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-dark-600 text-sm text-gray-400">
          <div className="col-span-4 md:col-span-3">Symbol</div>
          <div className="col-span-4 md:col-span-3 text-right">Price</div>
          <div className="col-span-4 md:col-span-3 text-right hidden md:block">Change</div>
          <div className="col-span-4 md:col-span-3 text-right">Action</div>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="skeleton h-14 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-dark-600">
            {markets.map(m => (
              <div 
                key={m.symbol}
                className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-dark-700 transition"
              >
                <div className="col-span-4 md:col-span-3">
                  <div className="font-medium">{m.symbol}</div>
                  <div className="text-sm text-gray-400 truncate">{m.name}</div>
                </div>

                <div className="col-span-4 md:col-span-3 text-right">
                  <div className="font-mono">
                    ${m.price > 0 
                      ? m.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 8}) 
                      : '-'}
                  </div>
                </div>

                <div className={`col-span-4 md:col-span-3 text-right hidden md:block ${m.change_pct >= 0 ? 'price-up' : 'price-down'}`}>
                  {m.change_pct >= 0 ? '+' : ''}{m.change_pct.toFixed(2)}%
                </div>

                <div className="col-span-4 md:col-span-3 text-right">
                  <Link
                    to={`/trade/${m.symbol}`}
                    className="inline-block px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium transition"
                  >
                    Trade
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Markets
