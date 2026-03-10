import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { fetchEOD, fetchFundamentals } from '../api/client'

const PERIODS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
]

function dateOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function formatPrice(v) {
  return v == null ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatMarketCap(v) {
  if (!v) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return `$${v}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  return (
    <div className="tv-card px-3 py-2 text-xs shadow-xl">
      <p className="text-tv-muted mb-1">{label}</p>
      <p className="text-tv-text font-semibold">{formatPrice(val)}</p>
    </div>
  )
}

export default function StockChart({ symbol }) {
  const [data, setData] = useState([])
  const [fundamentals, setFundamentals] = useState(null)
  const [period, setPeriod] = useState('1Y')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const periodDays = PERIODS.find(p => p.label === period)?.days ?? 365

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)

    const from = dateOffset(periodDays)
    Promise.all([
      fetchEOD(symbol, { from_date: from }),
      fetchFundamentals(symbol),
    ])
      .then(([eod, fund]) => {
        const mapped = (Array.isArray(eod) ? eod : []).map(d => ({
          date: d.date,
          close: d.adjusted_close ?? d.close,
        }))
        setData(mapped)
        setFundamentals(fund)
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [symbol, period])

  const priceNow   = data.at(-1)?.close
  const priceStart = data[0]?.close
  const change     = priceNow && priceStart ? priceNow - priceStart : null
  const changePct  = change && priceStart ? (change / priceStart) * 100 : null
  const isPositive = change == null || change >= 0

  const highlights  = fundamentals?.Highlights ?? {}
  const valuation   = fundamentals?.Valuation ?? {}

  const strokeColor = isPositive ? '#26a69a' : '#ef5350'
  const fillStart   = isPositive ? 'rgba(38,166,154,0.25)' : 'rgba(239,83,80,0.25)'
  const fillEnd     = 'rgba(0,0,0,0)'

  const minClose = data.length ? Math.min(...data.map(d => d.close)) * 0.998 : 0
  const maxClose = data.length ? Math.max(...data.map(d => d.close)) * 1.002 : 100

  if (!symbol) {
    return (
      <div className="tv-card flex items-center justify-center h-80 text-tv-muted">
        <div className="text-center">
          <svg className="mx-auto mb-3 opacity-30" width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-sm">Search for a stock to view its chart</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tv-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-bold text-tv-text">{symbol}</h2>
            {highlights.Description && (
              <span className="text-tv-muted text-xs truncate max-w-xs">{highlights.Description?.split(' ').slice(0,6).join(' ')}…</span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-semibold text-tv-text">{formatPrice(priceNow)}</span>
            {change != null && (
              <span className={`text-sm font-medium ${isPositive ? 'text-tv-green' : 'text-tv-red'}`}>
                {isPositive ? '+' : ''}{formatPrice(change)} ({isPositive ? '+' : ''}{changePct?.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.label}
              onClick={() => setPeriod(p.label)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                period === p.label
                  ? 'bg-tv-blue text-white'
                  : 'text-tv-muted hover:text-tv-text hover:bg-tv-border'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key stats bar */}
      {fundamentals && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-px bg-tv-border rounded-lg overflow-hidden mb-4">
          {[
            { label: 'Mkt Cap',      val: formatMarketCap(highlights.MarketCapitalization) },
            { label: 'P/E',          val: highlights.PERatio ? Number(highlights.PERatio).toFixed(1) : '—' },
            { label: 'EPS',          val: highlights.EarningsShare ? `$${Number(highlights.EarningsShare).toFixed(2)}` : '—' },
            { label: '52W High',     val: formatPrice(highlights['52WeekHigh']) },
            { label: '52W Low',      val: formatPrice(highlights['52WeekLow']) },
            { label: 'Div Yield',    val: highlights.DividendYield ? `${(highlights.DividendYield * 100).toFixed(2)}%` : '—' },
          ].map(s => (
            <div key={s.label} className="bg-tv-surface px-3 py-2">
              <p className="tv-label text-xs mb-1">{s.label}</p>
              <p className="text-tv-text font-semibold text-sm">{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-tv-muted text-sm">
          <div className="w-5 h-5 border-2 border-tv-blue border-t-transparent rounded-full animate-spin mr-2" />
          Loading chart…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-tv-red text-sm">{error}</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={fillStart} />
                <stop offset="95%" stopColor={fillEnd} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2a2e39" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#787b86', fontSize: 11 }}
              tickFormatter={v => {
                const d = new Date(v)
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              domain={[minClose, maxClose]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#787b86', fontSize: 11 }}
              tickFormatter={v => `$${v.toFixed(0)}`}
              width={58}
              orientation="right"
            />
            <Tooltip content={<CustomTooltip />} />
            {priceStart && (
              <ReferenceLine
                y={priceStart}
                stroke="#787b86"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            )}
            <Area
              type="monotone"
              dataKey="close"
              stroke={strokeColor}
              strokeWidth={1.5}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 4, fill: strokeColor, stroke: 'none' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
