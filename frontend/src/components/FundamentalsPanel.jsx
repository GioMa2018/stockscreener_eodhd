import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, CartesianGrid,
} from 'recharts'
import { fetchFundamentals } from '../api/client'

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtNum  = (v, d = 2) => v != null ? Number(v).toFixed(d) : '—'
const fmtPct  = (v, d = 1) => v != null ? `${(Number(v) * 100).toFixed(d)}%` : '—'
const fmtPctRaw = (v, d = 1) => v != null ? `${Number(v).toFixed(d)}%` : '—'
const fmtPrice = v => v != null ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
const fmtLarge = v => {
  if (v == null) return '—'
  const n = Number(v)
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

// ── Sub-components ────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color }) {
  return (
    <div className="bg-tv-bg rounded-lg p-3 border border-tv-border">
      <p className="tv-label text-xs mb-1">{label}</p>
      <p className={`font-semibold text-sm ${color ?? 'text-tv-text'}`}>{value}</p>
      {sub && <p className="text-tv-muted text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-tv-muted">{icon}</span>
      <h3 className="text-tv-text text-sm font-semibold">{title}</h3>
    </div>
  )
}

function RangeBar({ low, high, current, label }) {
  if (!low || !high || !current) return null
  const pct = Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100))
  return (
    <div>
      <div className="flex justify-between text-xs text-tv-muted mb-1">
        <span>{fmtPrice(low)}</span>
        <span className="text-tv-text font-medium">{label}</span>
        <span>{fmtPrice(high)}</span>
      </div>
      <div className="relative h-1.5 bg-tv-border rounded-full">
        <div
          className="absolute h-full rounded-full"
          style={{
            left: 0,
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #ef5350, #26a69a)',
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full border border-tv-bg"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
      </div>
    </div>
  )
}

function AnalystBar({ ratings }) {
  if (!ratings) return null
  const { StrongBuy = 0, Buy = 0, Hold = 0, Sell = 0, StrongSell = 0 } = ratings
  const total = StrongBuy + Buy + Hold + Sell + StrongSell
  if (!total) return null

  const segments = [
    { label: 'Strong Buy', val: StrongBuy, color: '#26a69a' },
    { label: 'Buy',        val: Buy,       color: '#66bb6a' },
    { label: 'Hold',       val: Hold,      color: '#ffa726' },
    { label: 'Sell',       val: Sell,      color: '#ef7357' },
    { label: 'Strong Sell',val: StrongSell,color: '#ef5350' },
  ]

  return (
    <div>
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mb-2">
        {segments.map(s =>
          s.val > 0 ? (
            <div
              key={s.label}
              title={`${s.label}: ${s.val}`}
              style={{ width: `${(s.val / total) * 100}%`, background: s.color }}
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
            <span className="text-tv-muted text-xs">{s.label}</span>
            <span className="text-tv-text text-xs font-medium">{s.val}</span>
          </div>
        ))}
      </div>
      {ratings.TargetPrice && (
        <p className="mt-2 text-tv-muted text-xs">
          Consensus target: <span className="text-tv-blue font-semibold">{fmtPrice(ratings.TargetPrice)}</span>
        </p>
      )}
    </div>
  )
}

const EpsTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="tv-card px-3 py-2 text-xs shadow-xl">
      <p className="text-tv-muted mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill }}>
          {p.name}: <span className="font-semibold">${Number(p.value).toFixed(2)}</span>
        </p>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FundamentalsPanel({ symbol }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    fetchFundamentals(symbol)
      .then(d => setData(d))
      .catch(() => setError('Failed to load fundamentals'))
      .finally(() => setLoading(false))
  }, [symbol])

  if (!symbol) return (
    <div className="tv-card flex items-center justify-center h-48 text-tv-muted text-sm">
      Search for a stock to view fundamentals
    </div>
  )

  if (loading) return (
    <div className="tv-card flex items-center justify-center h-48 text-tv-muted text-sm gap-2">
      <div className="w-4 h-4 border-2 border-tv-blue border-t-transparent rounded-full animate-spin" />
      Loading fundamentals…
    </div>
  )

  if (error || !data) return (
    <div className="tv-card flex items-center justify-center h-48 text-tv-red text-sm">
      {error ?? 'No data available'}
    </div>
  )

  const G  = data.General       ?? {}
  const H  = data.Highlights    ?? {}
  const V  = data.Valuation     ?? {}
  const T  = data.Technicals    ?? {}
  const SS = data.SharesStats   ?? {}
  const AR = data.AnalystRatings ?? {}
  const E  = data.Earnings      ?? {}
  const IS = data.Financials?.Income_Statement?.yearly ?? {}

  // EPS quarterly chart
  const epsHistory = Object.values(E.History ?? {})
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-8)
    .map(q => ({
      date: q.date?.slice(0, 7),
      Actual:   q.epsActual   != null ? Number(q.epsActual)   : null,
      Estimate: q.epsEstimate != null ? Number(q.epsEstimate) : null,
    }))

  // Revenue chart from income statement
  const revenueHistory = Object.values(IS)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-5)
    .map(y => ({
      date: y.date?.slice(0, 4),
      Revenue:     y.totalRevenue ? Number(y.totalRevenue) / 1e9 : null,
      GrossProfit: y.grossProfit  ? Number(y.grossProfit)  / 1e9 : null,
      NetIncome:   y.netIncome    ? Number(y.netIncome)    / 1e9 : null,
    }))

  return (
    <div className="tv-card p-4 space-y-6">

      {/* ── Company Header ── */}
      <div className="flex items-start gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-tv-text">{G.Name}</h2>
            <span className="text-xs bg-tv-border text-tv-muted px-2 py-0.5 rounded">{G.Exchange}</span>
            {G.Sector && <span className="text-xs bg-tv-blue/10 text-tv-blue px-2 py-0.5 rounded">{G.Sector}</span>}
            {G.Industry && <span className="text-xs text-tv-muted">{G.Industry}</span>}
          </div>
          {G.Description && (
            <p className="text-tv-muted text-xs mt-2 leading-relaxed max-w-3xl line-clamp-3">
              {G.Description}
            </p>
          )}
          <div className="flex gap-4 mt-2 text-xs text-tv-muted">
            {G.IPODate   && <span>IPO: <span className="text-tv-text">{G.IPODate}</span></span>}
            {G.FiscalYearEnd && <span>FY End: <span className="text-tv-text">{G.FiscalYearEnd}</span></span>}
            {G.Currency  && <span>Currency: <span className="text-tv-text">{G.Currency}</span></span>}
            {G.WebURL    && <a href={G.WebURL} target="_blank" rel="noreferrer" className="text-tv-blue hover:underline">{G.WebURL?.replace('https://', '')}</a>}
          </div>
        </div>
      </div>

      {/* ── Key Metrics Grid ── */}
      <div>
        <SectionTitle icon="📊" title="Key Metrics" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          <MetricCard label="Market Cap"     value={fmtLarge(H.MarketCapitalization)} />
          <MetricCard label="EBITDA"         value={fmtLarge(H.EBITDA)} />
          <MetricCard label="Revenue (TTM)"  value={fmtLarge(H.RevenueTTM)} />
          <MetricCard label="Gross Profit"   value={fmtLarge(H.GrossProfitTTM)} />
          <MetricCard label="EPS (TTM)"      value={H.EarningsShare ? `$${fmtNum(H.EarningsShare)}` : '—'} />
          <MetricCard label="Book Value"     value={H.BookValue ? `$${fmtNum(H.BookValue)}` : '—'} />
          <MetricCard label="Dividend/Share" value={H.DividendShare ? `$${fmtNum(H.DividendShare)}` : '—'} />
          <MetricCard label="Dividend Yield" value={fmtPct(H.DividendYield)} />
          <MetricCard label="EPS Est. CY"    value={H.EPSEstimateCurrentYear  ? `$${fmtNum(H.EPSEstimateCurrentYear)}`  : '—'} sub="Current Year" />
          <MetricCard label="EPS Est. NY"    value={H.EPSEstimateNextYear     ? `$${fmtNum(H.EPSEstimateNextYear)}`     : '—'} sub="Next Year" />
          <MetricCard label="EPS Est. CQ"    value={H.EPSEstimateCurrentQuarter ? `$${fmtNum(H.EPSEstimateCurrentQuarter)}` : '—'} sub="Current Qtr" />
          <MetricCard label="Most Recent Q"  value={H.MostRecentQuarter?.slice(0, 7) ?? '—'} />
        </div>
      </div>

      {/* ── Margins & Returns ── */}
      <div>
        <SectionTitle icon="📈" title="Margins & Returns" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCard
            label="Profit Margin"
            value={fmtPct(H.ProfitMargin)}
            color={Number(H.ProfitMargin) > 0.15 ? 'text-tv-green' : 'text-tv-text'}
          />
          <MetricCard
            label="Operating Margin"
            value={fmtPct(H.OperatingMarginTTM)}
            color={Number(H.OperatingMarginTTM) > 0.15 ? 'text-tv-green' : 'text-tv-text'}
          />
          <MetricCard
            label="ROE (TTM)"
            value={fmtPct(H.ReturnOnEquityTTM)}
            color={Number(H.ReturnOnEquityTTM) > 0.15 ? 'text-tv-green' : 'text-tv-text'}
          />
          <MetricCard
            label="ROA (TTM)"
            value={fmtPct(H.ReturnOnAssetsTTM)}
            color={Number(H.ReturnOnAssetsTTM) > 0.05 ? 'text-tv-green' : 'text-tv-text'}
          />
        </div>
      </div>

      {/* ── Valuation ── */}
      <div>
        <SectionTitle icon="⚖️" title="Valuation Multiples" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <MetricCard label="P/E (TTM)"    value={fmtNum(V.TrailingPE ?? H.PERatio, 1)} />
          <MetricCard label="Forward P/E"  value={fmtNum(V.ForwardPE, 1)} />
          <MetricCard label="PEG Ratio"    value={fmtNum(H.PEGRatio, 2)} />
          <MetricCard label="P/S (TTM)"    value={fmtNum(V.PriceSalesTTM, 2)} />
          <MetricCard label="P/B (MRQ)"    value={fmtNum(V.PriceBookMRQ, 2)} />
          <MetricCard label="EV/Revenue"   value={fmtNum(V.EnterpriseValueRevenue, 2)} />
          <MetricCard label="EV/EBITDA"    value={fmtNum(V.EnterpriseValueEbitda, 2)} />
        </div>
      </div>

      {/* ── Technicals + 52W Range ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <SectionTitle icon="📉" title="Technicals" />
          <div className="space-y-3">
            <RangeBar
              low={T['52WeekLow'] ?? H['52WeekLow']}
              high={T['52WeekHigh'] ?? H['52WeekHigh']}
              current={H.WallStreetTargetPrice}
              label="52-Week Range"
            />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <MetricCard label="Beta"        value={fmtNum(T.Beta, 2)} />
              <MetricCard label="50 Day MA"   value={fmtPrice(T['50DayMA'] ?? H['50DayMA'])} />
              <MetricCard label="200 Day MA"  value={fmtPrice(T['200DayMA'] ?? H['200DayMA'])} />
              <MetricCard label="Short %"     value={T.ShortPercent ? fmtPct(T.ShortPercent) : '—'} />
            </div>
          </div>
        </div>

        <div>
          <SectionTitle icon="🏦" title="Shares & Ownership" />
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Shares Out."   value={fmtLarge(SS.SharesOutstanding)} />
            <MetricCard label="Float"         value={fmtLarge(SS.SharesFloat)} />
            <MetricCard
              label="% Insiders"
              value={SS.PercentInsiders ? fmtPctRaw(SS.PercentInsiders) : '—'}
            />
            <MetricCard
              label="% Institutions"
              value={SS.PercentInstitutions ? fmtPctRaw(SS.PercentInstitutions) : '—'}
            />
          </div>
        </div>
      </div>

      {/* ── Analyst Ratings ── */}
      {AR && Object.keys(AR).length > 0 && (
        <div>
          <SectionTitle icon="🎯" title="Analyst Ratings" />
          <AnalystBar ratings={AR} />
        </div>
      )}

      {/* ── EPS History Chart ── */}
      {epsHistory.length > 0 && (
        <div>
          <SectionTitle icon="💹" title="EPS History (Quarterly)" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={epsHistory} margin={{ top: 5, right: 5, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGridCustom />
              <XAxis dataKey="date" tick={{ fill: '#787b86', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#787b86', fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={v => `$${v.toFixed(1)}`} width={40} />
              <Tooltip content={<EpsTooltip />} />
              <ReferenceLine y={0} stroke="#2a2e39" />
              <Bar dataKey="Estimate" fill="#2962ff33" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Actual" radius={[2, 2, 0, 0]}>
                {epsHistory.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.Actual >= (entry.Estimate ?? 0) ? '#26a69a' : '#ef5350'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-tv-muted text-xs mt-1 text-center">
            <span className="inline-flex items-center gap-1 mr-3">
              <span className="w-2.5 h-2.5 rounded-sm inline-block bg-tv-blue/20" /> Estimate
            </span>
            <span className="inline-flex items-center gap-1 mr-3">
              <span className="w-2.5 h-2.5 rounded-sm inline-block bg-tv-green" /> Beat
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block bg-tv-red" /> Missed
            </span>
          </p>
        </div>
      )}

      {/* ── Revenue Chart ── */}
      {revenueHistory.length > 0 && (
        <div>
          <SectionTitle icon="💰" title="Annual Revenue & Income (USD Billions)" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueHistory} margin={{ top: 5, right: 5, bottom: 0, left: 0 }} barGap={3}>
              <CartesianGridCustom />
              <XAxis dataKey="date" tick={{ fill: '#787b86', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#787b86', fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={v => `$${v.toFixed(0)}B`} width={46} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="tv-card px-3 py-2 text-xs shadow-xl">
                      <p className="text-tv-muted mb-1">{label}</p>
                      {payload.map(p => (
                        <p key={p.name} style={{ color: p.fill }}>
                          {p.name}: <span className="font-semibold">${Number(p.value).toFixed(1)}B</span>
                        </p>
                      ))}
                    </div>
                  )
                }}
              />
              <Bar dataKey="Revenue"     fill="#2962ff" radius={[2, 2, 0, 0]} />
              <Bar dataKey="GrossProfit" fill="#26a69a" radius={[2, 2, 0, 0]} />
              <Bar dataKey="NetIncome"   fill="#66bb6a" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-tv-muted text-xs mt-1 text-center">
            {[['bg-tv-blue', 'Revenue'], ['bg-tv-green', 'Gross Profit'], ['bg-[#66bb6a]', 'Net Income']].map(([c, l]) => (
              <span key={l} className="inline-flex items-center gap-1 mr-3">
                <span className={`w-2.5 h-2.5 rounded-sm inline-block ${c}`} /> {l}
              </span>
            ))}
          </p>
        </div>
      )}

    </div>
  )
}

function CartesianGridCustom() {
  return <CartesianGrid stroke="#2a2e39" strokeDasharray="3 3" vertical={false} />
}
