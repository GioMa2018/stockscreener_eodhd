import { useState } from 'react'

function fmt(v, decimals = 2) {
  if (v == null) return <span className="text-tv-muted">—</span>
  return Number(v).toFixed(decimals)
}

function fmtPrice(v) {
  if (v == null) return <span className="text-tv-muted">—</span>
  return `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtMktCap(v) {
  if (v == null) return <span className="text-tv-muted">—</span>
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  return `$${v}`
}

function ColorVal({ val, suffix = '%', positiveGood = true, decimals = 1 }) {
  if (val == null) return <span className="text-tv-muted">—</span>
  const isGood = positiveGood ? val >= 0 : val <= 0
  return (
    <span className={isGood ? 'text-tv-green' : 'text-tv-red'}>
      {Number(val).toFixed(decimals)}{suffix}
    </span>
  )
}

const COLS = [
  { key: 'code', label: 'Symbol', sortable: true },
  { key: 'name', label: 'Company', sortable: true },
  { key: 'price', label: 'Price', sortable: true },
  { key: 'market_capitalization', label: 'Mkt Cap', sortable: true },
  { key: 'pe_ratio', label: 'P/E', sortable: true },
  { key: 'revenue_growth_qoq', label: 'Rev Growth', sortable: true },
  { key: 'roe', label: 'ROE', sortable: true },
  { key: 'de_ratio', label: 'D/E', sortable: true },
]

function exportCSV(data) {
  const headers = ['Symbol', 'Company', 'Exchange', 'Sector', 'Price', 'Mkt Cap', 'P/E', 'Rev Growth %', 'ROE %', 'D/E']
  const rows = data.map(r => [
    r.code ?? '',
    `"${(r.name ?? '').replace(/"/g, '""')}"`,
    r.exchange ?? '',
    r.sector ?? '',
    r.price ?? '',
    r.market_capitalization ?? '',
    r.pe_ratio ?? '',
    r.revenue_growth_qoq ?? '',
    r.roe ?? '',
    r.de_ratio ?? '',
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `screener_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ResultsTable({ data = [], loading, loadingMore, total, onSelectSymbol, onLoadMore }) {
  const [sort, setSort] = useState({ key: 'market_capitalization', dir: 'desc' })

  function handleSort(key) {
    setSort(s => ({ key, dir: s.key === key ? (s.dir === 'asc' ? 'desc' : 'asc') : 'desc' }))
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sort.key] ?? (sort.dir === 'asc' ? Infinity : -Infinity)
    const bv = b[sort.key] ?? (sort.dir === 'asc' ? Infinity : -Infinity)
    if (typeof av === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sort.dir === 'asc' ? av - bv : bv - av
  })

  function SortIcon({ col }) {
    if (sort.key !== col) return (
      <svg className="opacity-20" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    )
    return (
      <svg className={`text-tv-blue ${sort.dir === 'desc' ? 'rotate-180' : ''}`}
        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    )
  }

  if (!loading && data.length === 0) {
    return (
      <div className="tv-card flex flex-col items-center justify-center py-16 text-tv-muted">
        <svg className="mb-3 opacity-30" width="40" height="40" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="9" x2="9" y2="21" />
        </svg>
        <p className="text-sm">Ejecuta el screener para ver resultados</p>
        <p className="text-xs mt-1">Ajusta los filtros y presiona "Run Screener"</p>
      </div>
    )
  }

  return (
    <div className="tv-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-tv-border">
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#787b86" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="9" x2="9" y2="21" />
          </svg>
          <span className="text-tv-text text-sm font-medium">Resultados</span>
          {!loading && (
            <span className="text-tv-muted text-xs">
              {data.length} de {total ?? data.length} acciones
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-1.5 text-tv-muted text-xs">
              <div className="w-3 h-3 border border-tv-blue border-t-transparent rounded-full animate-spin" />
              Cargando…
            </div>
          )}
          {data.length > 0 && !loading && (
            <button
              onClick={() => exportCSV(data)}
              className="flex items-center gap-1.5 text-xs text-tv-muted hover:text-tv-text border border-tv-border hover:border-tv-blue/50 px-2.5 py-1 rounded transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tv-border">
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`px-4 py-2.5 text-left text-tv-muted text-xs font-medium whitespace-nowrap
                    ${col.sortable ? 'cursor-pointer hover:text-tv-text select-none' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && <SortIcon col={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={`${row.code}-${i}`}
                className="border-b border-tv-border/50 hover:bg-tv-surface/80 cursor-pointer group transition-colors"
                onClick={() => onSelectSymbol?.(row.code)}
              >
                <td className="px-4 py-3 font-semibold text-tv-blue group-hover:text-blue-400 whitespace-nowrap">
                  {row.code}
                </td>
                <td className="px-4 py-3 text-tv-text max-w-[200px] truncate">{row.name}</td>
                <td className="px-4 py-3 text-tv-text font-medium whitespace-nowrap">{fmtPrice(row.price)}</td>
                <td className="px-4 py-3 text-tv-text whitespace-nowrap">{fmtMktCap(row.market_capitalization)}</td>
                <td className="px-4 py-3 text-tv-text whitespace-nowrap">
                  {row.pe_ratio ? fmt(row.pe_ratio, 1) : <span className="text-tv-muted">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <ColorVal val={row.revenue_growth_qoq} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <ColorVal val={row.roe} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <ColorVal val={row.de_ratio} suffix="x" positiveGood={false} decimals={2} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      {onLoadMore && (
        <div className="px-4 py-3 border-t border-tv-border flex items-center justify-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 text-xs text-tv-muted hover:text-tv-text border border-tv-border hover:border-tv-blue/50 px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <div className="w-3 h-3 border border-tv-blue border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
            {loadingMore ? 'Cargando más…' : `Cargar más (${data.length} de ${total})`}
          </button>
        </div>
      )}
    </div>
  )
}
