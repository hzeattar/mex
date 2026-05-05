import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Chart from '../components/Chart'

const API_URL = '/v3/api'

function Trade({ user }) {
  const { symbol } = useParams()
  const navigate = useNavigate()
  const [market, setMarket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [side, setSide] = useState('buy')

  useEffect(() => {
    fetch(`${API_URL}/price.php?symbol=${symbol}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setMarket(data.item)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [symbol])

  const handleTrade = () => {
    if (!user) {
      alert('Please login first')
      return
    }
    // Trade logic here
    alert(`${side.toUpperCase()} ${amount} ${symbol}`)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="skeleton h-96 rounded-xl"></div>
      </div>
    )
  }

  if (!market) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 text-center">
        <p className="text-gray-400">Market not found</p>
        <button 
          onClick={() => navigate('/markets')}
          className="mt-4 px-4 py-2 bg-primary-600 rounded-lg"
        >
          Back to Markets
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2">
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold">{market.symbol}</h1>
                <p className="text-gray-400 text-sm">{market.name}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-bold">
                  ${market.price > 0 ? market.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 8}) : '-'}
                </div>
                <div className={`${market.change_pct >= 0 ? 'price-up' : 'price-down'}`}>
                  {market.change_pct >= 0 ? '+' : ''}{market.change_pct.toFixed(2)}%
                </div>
              </div>
            </div>

            <Chart symbol={symbol} />
          </div>
        </div>

        {/* Trade Panel */}
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-4">
          <h2 className="font-semibold mb-4">Trade {symbol}</h2>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSide('buy')}
              className={`flex-1 py-3 rounded-lg font-medium transition ${
                side === 'buy' ? 'bg-success text-white' : 'bg-dark-700 text-gray-400'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`flex-1 py-3 rounded-lg font-medium transition ${
                side === 'sell' ? 'bg-danger text-white' : 'bg-dark-700 text-gray-400'
              }`}
            >
              Sell
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
            />
          </div>

          {market.price > 0 && amount && (
            <div className="mb-4 p-3 bg-dark-700 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Price</span>
                <span>${market.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Amount</span>
                <span>{amount} {symbol}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t border-dark-600">
                <span>Total</span>
                <span>${(market.price * parseFloat(amount || 0)).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleTrade}
            className={`w-full py-4 rounded-lg font-bold text-lg transition ${
              side === 'buy' 
                ? 'bg-success hover:bg-green-600' 
                : 'bg-danger hover:bg-red-600'
            }`}
          >
            {side === 'buy' ? 'Buy' : 'Sell'} {symbol}
          </button>

          {!user && (
            <p className="mt-4 text-center text-sm text-gray-400">
              Please login to trade
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Trade
