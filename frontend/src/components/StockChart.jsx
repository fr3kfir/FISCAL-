import { useEffect, useRef } from 'react'
import { createChart, CrosshairMode } from 'lightweight-charts'

function getChartColors() {
  const s = getComputedStyle(document.documentElement)
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
  return {
    grid: isDark ? '#1a1a2e' : '#e8eaf0',
    border: isDark ? '#1c1c30' : '#d8dce8',
    text: isDark ? '#6b7096' : '#7080a0',
  }
}

export default function StockChart({ ticker, period, chartData, loading }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const c = getChartColors()

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: window.innerWidth < 768 ? 220 : 300,
      layout: {
        background: { color: 'transparent' },
        textColor: c.text,
      },
      grid: {
        vertLines: { color: c.grid, style: 1 },
        horzLines: { color: c.grid, style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#4f6ef7', width: 1, style: 2 },
        horzLine: { color: '#4f6ef7', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: c.border,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: c.border,
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
