import { useState, useEffect, useCallback } from 'react'
import {
  ComposedChart, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Customized, Cell,
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
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  return `$${v}`
}

function formatVolume(v) {
  if (!v) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return `${v}`
}

const PriceTooltip = ({ active, payload, label, chartType }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="tv-card px-3 py-2 text-xs shadow-xl min-w-[120px]">
      <p className="text-tv-muted mb-1">{label}</p>
      {chartType === 'candle' && d ? (
        <>
          <p className="text-tv-text">O: <span className="font-semibold">{formatPrice(d.open)}</span></p>
          <p className="text-tv-text">H: <span className="font-semibold text-tv-green">{formatPrice(d.high)}</span></p>
          <p className="text-tv-text">L: <span className="font-semibold text-tv-red">{formatPrice(d.low)}</span></p>
          <p className="text-tv-text">C: <span className="font-semibold">{formatPrice(d.close)}</span></p>
        </>
      ) : (
        <p className="text-tv-text font-semibold">{formatPrice(payload[0]?.value)}</p>
      )}
    </div>
  )
}

const VolumeTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="tv-card px-3 py-2 text-xs shadow-xl">
      <p className="text-tv-muted mb-1">{label}</p>
      <p className="text-tv-text font-semibold">{formatVolume(payload[0]?.value)}</p>
    </div>
  )
}

// Candlestick renderer via Customized — receives chart internal props + candleData via closure
function CandlestickLayer({ xAxisMap, yAxisMap, candleData }) {
  if (!candleData?.length) return null
  const xAxis = xAxisMap ? Object.values(xAxisMap)[0] : null
  const yAxis = yAxisMap ? Object.values(yAxisMap)[0] : null
  if (!xAxis?.scale || !yAxis?.scale) return null

  const xScale = xAxis.scale
  const yScale = yAxis.scale
  const bw = typeof xScale.bandwidth === 'function' ? xScale.bandwidth() : 8
  const candleW = Math.max(2, Math.min(10, bw * 0.65))

  return (
    <g>
      {candleData.map(d => {
        const rawX = xScale(d.date)
        if (rawX == null || isNaN(rawX)) return null
        const cx = rawX + bw / 2
        const yH = yScale(d.high)
        const yL = yScale(d.low)
        const yO = yScale(d.open)
        const yC = yScale(d.close)
        const isUp = d.close >= d.open
        const color = isUp ? '#26a69a' : '#ef5350'
        const bTop = Math.min(yO, yC)
        const bBot = Math.max(yO, yC)
        const bH = Math.max(1, bBot - bTop)

        return (
          <g key={d.date}>
            <line x1={cx} y1={yH} x2={cx} y2={bTop} stroke={color} strokeWidth={1} />
            <line x1={cx} y1={bBot} x2={cx} y2={yL} stroke={color} strokeWidth={1} />
            <rect x={cx - candleW / 2} y={bTop} width={candleW} height={bH} fill={color} />
          </g>
        )
      })}
    </g>
  )
}

export default function StockChart({ symbol }) {
  const [data, setData] = useState([])
  const [fundamentals, setFundamentals] = useState(null)
  const [period, setPeriod] = useState('1Y')
  const [chartType, setChartType] = useState('area')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isMock, setIsMock] = useState(false)

  const periodDays = PERIODS.find(p => p.label === period)?.days ?? 365

  const renderCandles = useCallback(
    (chartProps) => <CandlestickLayer {...chartProps} candleData={data} />,
    [data]
  )

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)

    const from = dateOffset(periodDays)
    Promise.all([
      fetchEOD(symbol, { from_date: from }),
      fetchFundamentals(symbol),
    ])
      .then(([eodResult, fund]) => {
        const eodArray = Array.isArray(eodResult) ? eodResult : (eodResult?.data ?? [])
        setIsMock(eodResult?._source === 'mock' || fund?._source === 'mock')
        const mapped = eodArray.map(d => ({
          date: d.date,
          close: d.adjusted_close ?? d.close,
          open: d.open ?? d.adjusted_close ?? d.close,
          high: d.high ?? d.adjusted_close ?? d.close,
          low: d.low ?? d.adjusted_close ?? d.close,
          volume: d.volume ?? 0,
        }))
        setData(mapped)
        setFundamentals(fund)
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [symbol, period])

  const priceNow = data.at(-1)?.close
  const priceStart = data[0]?.close
  const change = priceNow && priceStart ? priceNow - priceStart : null
  const changePct = change && priceStart ? (change / priceStart) * 100 : null
  const isPositive = change == null || change >= 0

  const highlights = fundamentals?.Highlights ?? {}
  const valuation = fundamentals?.Valuation ?? {}
  const technicals = fundamentals?.Technicals ?? {}

  const strokeColor = isPositive ? '#26a69a' : '#ef5350'
  const fillStart = isPositive ? 'rgba(38,166,154,0.25)' : 'rgba(239,83,80,0.25)'

  const prices = data.map(d => d.close).filter(Boolean)
  const minClose = prices.length ? Math.min(...prices) * 0.997 : 0
  const maxClose = prices.length ? Math.max(...prices) * 1.003 : 100

  const tickFmt = (v) => {
    const d = new Date(v)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!symbol) {
    return (
      <div className="tv-card flex items-center justify-center h-80 text-tv-muted">
        <div className="text-center">
          <svg className="mx-auto mb-3 opacity-30" width="48" height="48" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-sm">Busca una acción para ver su gráfico</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tv-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-tv-text">{symbol}</h2>
            {isMock && (
              <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded">
                datos demo
              </span>
            )}
            {highlights.Description && (
              <span className="text-tv-muted text-xs truncate max-w-xs">
                {highlights.Description.split(' ').slice(0, 6).join(' ')}…
              </span>
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

        <div className="flex items-center gap-2">
          {/* Chart type toggle */}
          <div className="flex gap-1 border border-tv-border rounded p-0.5">
            {[
              { id: 'area', icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              )},
              { id: 'candle', icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="8" width="4" height="8"/><line x1="8" y1="4" x2="8" y2="8"/>
                  <line x1="8" y1="16" x2="8" y2="20"/>
                  <rect x="14" y="6" width="4" height="10"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="16" y1="16" x2="16" y2="22"/>
                </svg>
              )},
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setChartType(t.id)}
                title={t.id === 'area' ? 'Área' : 'Velas'}
                className={`p-1.5 rounded transition-colors ${
                  chartType === t.id ? 'bg-tv-blue text-white' : 'text-tv-muted hover:text-tv-text'
                }`}
              >
                {t.icon}
              </button>
            ))}
          </div>

          {/* Period selector */}
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <button
                key={p.label}
                onClick={() => setPeriod(p.label)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  period === p.label ? 'bg-tv-blue text-white' : 'text-tv-muted hover:text-tv-text hover:bg-tv-border'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key stats */}
      {fundamentals && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-px bg-tv-border rounded-lg overflow-hidden">
          {[
            { label: 'Mkt Cap', val: formatMarketCap(highlights.MarketCapitalization) },
            { label: 'P/E', val: valuation.TrailingPE ? Number(valuation.TrailingPE).toFixed(1) : highlights.PERatio ? Number(highlights.PERatio).toFixed(1) : '—' },
            { label: 'Fwd P/E', val: valuation.ForwardPE ? Number(valuation.ForwardPE).toFixed(1) : '—' },
            { label: 'EPS (TTM)', val: highlights.EarningsShare ? `$${Number(highlights.EarningsShare).toFixed(2)}` : '—' },
            { label: 'EPS Est.', val: highlights.EPSEstimateCurrentYear ? `$${Number(highlights.EPSEstimateCurrentYear).toFixed(2)}` : '—' },
            { label: '52W High', val: formatPrice(technicals['52WeekHigh'] ?? highlights['52WeekHigh']) },
            { label: '52W Low', val: formatPrice(technicals['52WeekLow'] ?? highlights['52WeekLow']) },
            { label: 'Beta', val: technicals.Beta ? Number(technicals.Beta).toFixed(2) : '—' },
          ].map(s => (
            <div key={s.label} className="bg-tv-surface px-3 py-2">
              <p className="tv-label text-xs mb-1">{s.label}</p>
              <p className="text-tv-text font-semibold text-sm">{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Price chart */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-tv-muted text-sm">
          <div className="w-5 h-5 border-2 border-tv-blue border-t-transparent rounded-full animate-spin mr-2" />
          Cargando…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-tv-red text-sm">{error}</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260} id="price-chart">
            <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }} syncId="stock">
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={fillStart} />
                  <stop offset="95%" stopColor="rgba(0,0,0,0)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2a2e39" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#787b86', fontSize: 11 }}
                tickFormatter={tickFmt}
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
              <Tooltip content={<PriceTooltip chartType={chartType} />} />
              {priceStart && (
                <ReferenceLine y={priceStart} stroke="#787b86" strokeDasharray="3 3" strokeWidth={1} />
              )}
              {chartType === 'area' && (
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  fill="url(#priceGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: strokeColor, stroke: 'none' }}
                />
              )}
              {chartType === 'candle' && (
                <Customized component={renderCandles} />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Volume chart */}
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={data} margin={{ top: 0, right: 5, bottom: 0, left: 0 }} syncId="stock">
              <XAxis dataKey="date" hide />
              <YAxis hide orientation="right" width={58} />
              <Tooltip content={<VolumeTooltip />} />
              <Bar dataKey="volume" maxBarSize={8} radius={[1, 1, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.close >= d.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-tv-muted text-xs text-right -mt-1">Volumen</p>
        </>
      )}
    </div>
  )
}
