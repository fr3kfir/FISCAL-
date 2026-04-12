import { useEffect, useRef } from 'react'
import { createChart, CrosshairMode } from 'lightweight-charts'

const PERIOD_MAP = {
  '1W': { period: '5d',  interval: '15m' },
  '1M': { period: '1mo', interval: '1d'  },
  '3M': { period: '3mo', interval: '1d'  },
  '6M': { period: '6mo', interval: '1d'  },
  '1Y': { period: '1y',  interval: '1d'  },
  '5Y': { period: '5y',  interval: '1wk' },
}

export default function StockChart({ ticker, period, chartData, loading }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { color: 'transparent' },
        textColor: '#6b7096',
      },
      grid: {
        vertLines: { color: '#1a1a2e', style: 1 },
        horzLines: { color: '#1a1a2e', style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#4f6ef7', width: 1, style: 2 },
        horzLine: { color: '#4f6ef7', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#1c1c30',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#1c1c30',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    })

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    seriesRef.current = series

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !chartData?.length) return
    seriesRef.current.setData(chartData)
    chartRef.current?.timeScale().fitContent()
  }, [chartData])

  return (
    <div className="chart-card">
      <div className="chart-toolbar">
        <span className="chart-title">Price Chart — {ticker} ({period})</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {chartData?.length ? `${chartData.length} candles` : ''}
        </span>
      </div>

      {loading ? (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading chart...</span>
        </div>
      ) : (
        <div ref={containerRef} style={{ width: '100%' }} />
      )}
    </div>
  )
}
