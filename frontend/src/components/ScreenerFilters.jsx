import { useState } from 'react'

const PRESETS = [
  { label: 'Tech Growth', filters: { market_cap_min: 10e9, revenue_growth_min: 15, roe_min: 15 } },
  { label: 'Value Picks', filters: { pe_max: 20, roe_min: 10, debt_equity_max: 1.0 } },
  { label: 'Mega Cap',    filters: { market_cap_min: 200e9 } },
  { label: 'Low Debt',    filters: { debt_equity_max: 0.3, roe_min: 10 } },
]

function FilterInput({ label, placeholder, value, onChange, suffix }) {
  return (
    <div>
      <label className="tv-label block mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          className="tv-input w-full pr-10"
          placeholder={placeholder}
          value={value ?? ''}
          onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-tv-muted text-xs pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function FilterRange({ label, minVal, maxVal, onMinChange, onMaxChange, minPlaceholder, maxPlaceholder, suffix }) {
  return (
    <div>
      <label className="tv-label block mb-1.5">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            className="tv-input w-full pr-8"
            placeholder={minPlaceholder ?? 'Min'}
            value={minVal ?? ''}
            onChange={e => onMinChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
          {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tv-muted text-xs pointer-events-none">{suffix}</span>}
        </div>
        <div className="relative flex-1">
          <input
            type="number"
            className="tv-input w-full pr-8"
            placeholder={maxPlaceholder ?? 'Max'}
            value={maxVal ?? ''}
            onChange={e => onMaxChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
          {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tv-muted text-xs pointer-events-none">{suffix}</span>}
        </div>
      </div>
    </div>
  )
}

export default function ScreenerFilters({ filters, onChange, onRun, loading }) {
  const [collapsed, setCollapsed] = useState({})

  function set(key, val) {
    onChange({ ...filters, [key]: val })
  }

  function applyPreset(preset) {
    onChange(preset.filters)
  }

  function clearAll() {
    onChange({})
  }

  function toggle(section) {
    setCollapsed(c => ({ ...c, [section]: !c[section] }))
  }

  const Section = ({ id, title, children }) => (
    <div className="border-b border-tv-border last:border-0">
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center justify-between py-3 px-4 hover:bg-tv-border/30 transition-colors"
      >
        <span className="tv-label">{title}</span>
        <svg
          className={`text-tv-muted transition-transform ${collapsed[id] ? '' : 'rotate-180'}`}
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      {!collapsed[id] && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  )

  const activeCount = Object.values(filters).filter(v => v !== undefined && v !== '').length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-tv-border">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#787b86" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span className="text-tv-text text-sm font-medium">Screener</span>
          {activeCount > 0 && (
            <span className="bg-tv-blue text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-tv-muted text-xs hover:text-tv-text transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Presets */}
      <div className="px-4 py-3 border-b border-tv-border">
        <p className="tv-label mb-2">Quick Presets</p>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="tv-btn-ghost text-xs py-1.5 text-center"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable filters */}
      <div className="flex-1 overflow-y-auto">
        <Section id="mktcap" title="Market Cap">
          <FilterRange
            label=""
            minVal={filters.market_cap_min != null ? filters.market_cap_min / 1e9 : undefined}
            maxVal={filters.market_cap_max != null ? filters.market_cap_max / 1e9 : undefined}
            onMinChange={v => set('market_cap_min', v != null ? v * 1e9 : undefined)}
            onMaxChange={v => set('market_cap_max', v != null ? v * 1e9 : undefined)}
            minPlaceholder="Min"
            maxPlaceholder="Max"
            suffix="B"
          />
          <div className="flex gap-1 flex-wrap">
            {[['Micro', null, 0.3e9], ['Small', 0.3e9, 2e9], ['Mid', 2e9, 10e9], ['Large', 10e9, null]].map(([l, mn, mx]) => (
              <button
                key={l}
                onClick={() => onChange({ ...filters, market_cap_min: mn ?? undefined, market_cap_max: mx ?? undefined })}
                className="text-xs px-2 py-1 rounded bg-tv-border hover:bg-tv-blue/20 hover:text-tv-blue text-tv-muted transition-colors"
              >
                {l}
              </button>
            ))}
          </div>
        </Section>

        <Section id="pe" title="P/E Ratio">
          <FilterRange
            label=""
            minVal={filters.pe_min}
            maxVal={filters.pe_max}
            onMinChange={v => set('pe_min', v)}
            onMaxChange={v => set('pe_max', v)}
            minPlaceholder="Min"
            maxPlaceholder="Max"
          />
        </Section>

        <Section id="revgrowth" title="Revenue Growth (QoQ)">
          <FilterInput
            label="Minimum %"
            placeholder="e.g. 10"
            value={filters.revenue_growth_min}
            onChange={v => set('revenue_growth_min', v)}
            suffix="%"
          />
        </Section>

        <Section id="roe" title="Return on Equity">
          <FilterInput
            label="Minimum %"
            placeholder="e.g. 15"
            value={filters.roe_min}
            onChange={v => set('roe_min', v)}
            suffix="%"
          />
        </Section>

        <Section id="debt" title="Debt / Equity">
          <FilterInput
            label="Maximum ratio"
            placeholder="e.g. 1.0"
            value={filters.debt_equity_max}
            onChange={v => set('debt_equity_max', v)}
          />
        </Section>
      </div>

      {/* Run button */}
      <div className="p-4 border-t border-tv-border">
        <button
          onClick={onRun}
          disabled={loading}
          className="tv-btn w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Screening…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="12" x2="2" y2="12" />
                <polyline points="15 5 22 12 15 19" />
              </svg>
              Run Screener
            </>
          )}
        </button>
      </div>
    </div>
  )
}
