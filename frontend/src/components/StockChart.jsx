import { useEffect, useRef, useState } from 'react'
import { createChart, CrosshairMode } from 'lightweight-charts'

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
  return {
    grid:   isDark ? '#1a1a2e' : '#e8eaf0',
    border: isDark ? '#1c1c30' : '#d8dce8',
    text:   isDark ? '#6b7096' : '#7080a0',
  }
}

function calcMA(data, period) {
  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue
    const avg = data.slice(i - period + 1, i + 1).reduce((s, d) => s + d.close, 0) / period
    result.push({ time: data[i].time, value: +avg.toFixed(4) })
  }
  return result
}

const MA_CONFIG = {
  ma20:  { period: 20,  color: '#f59e0b', label: 'MA 20'  },
  ma50:  { period: 50,  color: '#22c55e', label: 'MA 50'  },
  ma200: { period: 200, color: '#ef4444', label: 'MA 200' },
}

const CHART_TYPES = ['Candle', 'Line', 'Area']

const INDICATOR_LIST = [
  { key: 'vol',  label: 'Vol',    color: '#4f6ef7' },
  { key: 'ma20', label: 'MA 20',  color: '#f59e0b' },
  { key: 'ma50', label: 'MA 50',  color: '#22c55e' },
  { key: 'ma200',label: 'MA 200', color: '#ef4444' },
]

export default function StockChart({ ticker, period, chartData, loading }) {
  const containerRef  = useRef(null)
  const chartRef      = useRef(null)
  const mainRef       = useRef(null)   // primary price series
  const volRef        = useRef(null)   // volume histogram
  const maRefs        = useRef({})     // { ma20: series, ... }
  const dataRef       = useRef(chartData)

  const [chartType,   setChartType]   = useState('Candle')
  const [indicators,  setIndicators]  = useState({ vol: true, ma20: false, ma50: false, ma200: false })

  // Keep data ref fresh
  useEffect(() => { dataRef.current = chartData }, [chartData])

  // ── 1. Create chart container + volume series (once) ──────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const c = getChartColors()

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: window.innerWidth < 768 ? 260 : 360,
      layout: { background: { color: 'transparent' }, textColor: c.text },
      grid: {
        vertLines: { color: c.grid, style: 1 },
        horzLines: { color: c.grid, style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#4f6ef7', width: 1, style: 2 },
        horzLine: { color: '#4f6ef7', width: 1, style: 2 },
      },
      rightPriceScale: { borderColor: c.border, scaleMargins: { top: 0.08, bottom: 0.26 } },
      timeScale: { borderColor: c.border, timeVisible: true, secondsVisible: false },
    })
    chartRef.current = chart

    // Volume series lives here (always exists, toggled via data)
    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    volRef.current = volSeries

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current  = null
      mainRef.current   = null
      volRef.current    = null
      maRefs.current    = {}
    }
  }, [])

  // ── 2. Swap main series when chart type changes ───────────────────────────
  useEffect(() => {
    if (!chartRef.current) return
    const chart = chartRef.current

    if (mainRef.current) {
      chart.removeSeries(mainRef.current)
      mainRef.current = null
    }

    let series
    if (chartType === 'Candle') {
      series = chart.addCandlestickSeries({
        upColor: '#22c55e', downColor: '#ef4444',
        borderUpColor: '#22c55e', borderDownColor: '#ef4444',
        wickUpColor: '#22c55e', wickDownColor: '#ef4444',
      })
    } else if (chartType === 'Line') {
      series = chart.addLineSeries({
        color: '#4f6ef7', lineWidth: 2,
        crosshairMarkerVisible: true,
      })
    } else {
      series = chart.addAreaSeries({
        topColor: 'rgba(79,110,247,0.35)',
        bottomColor: 'rgba(79,110,247,0.0)',
        lineColor: '#4f6ef7', lineWidth: 2,
      })
    }
    mainRef.current = series

    const data = dataRef.current
    if (data?.length) {
      series.setData(
        chartType === 'Candle' ? data : data.map(d => ({ time: d.time, value: d.close }))
      )
      chart.timeScale().fitContent()
    }
  }, [chartType]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Push data to all active series when chartData changes ─────────────
  useEffect(() => {
    if (!chartData?.length) return

    if (mainRef.current) {
      mainRef.current.setData(
        chartType === 'Candle' ? chartData : chartData.map(d => ({ time: d.time, value: d.close }))
      )
      chartRef.current?.timeScale().fitContent()
    }

    if (volRef.current) {
      volRef.current.setData(
        indicators.vol
          ? chartData.map(d => ({
              time:  d.time,
              value: d.volume,
              color: d.close >= d.open ? '#22c55e28' : '#ef444428',
            }))
          : []
      )
    }

    Object.entries(maRefs.current).forEach(([key, s]) => {
      const cfg = MA_CONFIG[key]
      if (cfg) s.setData(calcMA(chartData, cfg.period))
    })
  }, [chartData]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Add / remove indicator series when toggles change ─────────────────
  useEffect(() => {
    if (!chartRef.current) return
    const chart = chartRef.current
    const data  = dataRef.current

    // Volume — toggle data
    if (volRef.current) {
      volRef.current.setData(
        indicators.vol && data?.length
          ? data.map(d => ({
              time:  d.time,
              value: d.volume,
              color: d.close >= d.open ? '#22c55e28' : '#ef444428',
            }))
          : []
      )
    }

    // MAs — create or destroy series
    Object.keys(MA_CONFIG).forEach(key => {
      if (indicators[key]) {
        if (!maRefs.current[key]) {
          const cfg = MA_CONFIG[key]
          const s = chart.addLineSeries({
            color: cfg.color, lineWidth: 1.5,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: true,
            title: cfg.label,
          })
          maRefs.current[key] = s
          if (data?.length) s.setData(calcMA(data, cfg.period))
        }
      } else {
        if (maRefs.current[key]) {
          chart.removeSeries(maRefs.current[key])
          delete maRefs.current[key]
        }
      }
    })
  }, [indicators]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleInd = (key) =>
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="chart-card">
      <div className="chart-toolbar" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span className="chart-title">{ticker} ({period})</span>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Chart type switcher */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            {CHART_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                style={{
                  padding: '4px 11px', border: 'none',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  background: chartType === t ? 'var(--accent)' : 'transparent',
                  color: chartType === t ? '#fff' : 'var(--text-muted)',
                }}
              >{t}</button>
            ))}
          </div>

          {/* Indicator pills */}
          {INDICATOR_LIST.map(ind => (
            <button
              key={ind.key}
              onClick={() => toggleInd(ind.key)}
              style={{
                padding: '4px 10px', borderRadius: 5, border: '1px solid',
                fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                background: indicators[ind.key] ? ind.color + '22' : 'var(--bg-input)',
                borderColor: indicators[ind.key] ? ind.color : 'var(--border)',
                color: indicators[ind.key] ? ind.color : 'var(--text-muted)',
              }}
            >{ind.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading chart...</span>
        </div>
      ) : (
        <div ref={containerRef} style={{ width: '100%' }} />
      )}
    </div>
  )
}
