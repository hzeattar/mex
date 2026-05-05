import React, { useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'

function Chart({ symbol }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#111827' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      timeScale: {
        borderColor: '#374151',
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    })

    chartRef.current = chart

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    // Generate sample data (in production, fetch from API)
    const generateData = () => {
      const data = []
      let price = 45000
      const now = new Date()
      
      for (let i = 100; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60000)
        const open = price
        const close = price + (Math.random() - 0.5) * 200
        const high = Math.max(open, close) + Math.random() * 100
        const low = Math.min(open, close) - Math.random() * 100
        
        data.push({
          time: time.toISOString().slice(0, 19),
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
        })
        
        price = close
      }
      return data
    }

    candleSeries.setData(generateData())
    chart.timeScale().fitContent()

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [symbol])

  return (
    <div ref={chartContainerRef} className="w-full h-[400px]"></div>
  )
}

export default Chart
