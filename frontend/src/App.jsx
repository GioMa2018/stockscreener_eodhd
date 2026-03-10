import { useState, useCallback } from 'react'
import SearchBar from './components/SearchBar'
import StockChart from './components/StockChart'
import ScreenerFilters from './components/ScreenerFilters'
import ResultsTable from './components/ResultsTable'
import AIQuery from './components/AIQuery'
import FundamentalsPanel from './components/FundamentalsPanel'
import { runScreener } from './api/client'

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [filters, setFilters] = useState({})
  const [screenerData, setScreenerData] = useState([])
  const [screenerTotal, setScreenerTotal] = useState(0)
  const [screenerLoading, setScreenerLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chart') // 'chart' | 'fundamentals' | 'screener'

  const handleRunScreener = useCallback(async () => {
    setScreenerLoading(true)
    setActiveTab('screener')
    try {
      const result = await runScreener(filters)
      setScreenerData(result.data ?? [])
      setScreenerTotal(result.total ?? 0)
    } catch {
      setScreenerData([])
    } finally {
      setScreenerLoading(false)
    }
  }, [filters])

  function handleAIFilters(aiFilters) {
    setFilters(aiFilters)
    // Auto-run after AI query
    setTimeout(() => {
      setScreenerLoading(true)
      setActiveTab('screener')
      runScreener(aiFilters)
        .then(result => {
          setScreenerData(result.data ?? [])
          setScreenerTotal(result.total ?? 0)
        })
        .catch(() => setScreenerData([]))
        .finally(() => setScreenerLoading(false))
    }, 50)
  }

  return (
    <div className="flex flex-col h-screen bg-tv-bg overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="flex items-center gap-4 px-4 h-14 bg-tv-surface border-b border-tv-border shrink-0 z-40">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 bg-tv-blue rounded flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="text-tv-text font-bold text-sm tracking-tight hidden sm:block">
            StockScreen <span className="text-tv-blue">Pro</span>
          </span>
        </div>

        {/* Search */}
        <SearchBar onSelect={sym => { setSelectedSymbol(sym); setActiveTab(sym ? 'chart' : activeTab) }} />

        {/* Nav tabs */}
        <div className="flex items-center gap-1 ml-4">
          {[
            { id: 'chart', label: 'Chart', icon: (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            )},
            { id: 'fundamentals', label: 'Fundamentals', icon: (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/>
              </svg>
            )},
            { id: 'screener', label: 'Screener', icon: (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            )},
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-tv-blue/20 text-tv-blue'
                  : 'text-tv-muted hover:text-tv-text hover:bg-tv-border'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right spacer */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-tv-muted text-xs">
            <div className="w-1.5 h-1.5 bg-tv-green rounded-full animate-pulse" />
            Live
          </div>
          <span className="text-tv-muted text-xs hidden lg:block">
            Powered by EODHD
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel (Filters) ── */}
        <aside className="w-64 shrink-0 bg-tv-surface border-r border-tv-border overflow-y-auto hidden md:flex flex-col">
          <ScreenerFilters
            filters={filters}
            onChange={setFilters}
            onRun={handleRunScreener}
            loading={screenerLoading}
          />
        </aside>

        {/* ── Main Panel ── */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* AI Query bar — always visible */}
          <AIQuery onFiltersApplied={handleAIFilters} />

          {activeTab === 'chart' && (
            <StockChart symbol={selectedSymbol} />
          )}

          {activeTab === 'fundamentals' && (
            <FundamentalsPanel symbol={selectedSymbol} />
          )}

          {activeTab === 'screener' && (
            <ResultsTable
              data={screenerData}
              loading={screenerLoading}
              total={screenerTotal}
              onSelectSymbol={sym => { setSelectedSymbol(sym); setActiveTab('chart') }}
            />
          )}

          {/* Show both when screener has results but chart is active */}
          {activeTab === 'chart' && screenerData.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-tv-muted text-xs">Last screener results —</span>
                <button
                  onClick={() => setActiveTab('screener')}
                  className="text-tv-blue text-xs hover:underline"
                >
                  View all {screenerTotal} stocks
                </button>
              </div>
              <ResultsTable
                data={screenerData.slice(0, 5)}
                loading={false}
                total={screenerTotal}
                onSelectSymbol={sym => { setSelectedSymbol(sym); setActiveTab('chart') }}
              />
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile filter drawer trigger ── */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <button
          className="tv-btn flex items-center gap-2 shadow-xl"
          onClick={handleRunScreener}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Screen
        </button>
      </div>
    </div>
  )
}
