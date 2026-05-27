import { useState, useCallback, useEffect, useRef } from 'react'
import SearchBar from './components/SearchBar'
import StockChart from './components/StockChart'
import ScreenerFilters from './components/ScreenerFilters'
import ResultsTable from './components/ResultsTable'
import AIQuery from './components/AIQuery'
import FundamentalsPanel from './components/FundamentalsPanel'
import { runScreener, runScreenerPage, checkHealth } from './api/client'

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [filters, setFilters] = useState({})
  const [screenerData, setScreenerData] = useState([])
  const [screenerTotal, setScreenerTotal] = useState(0)
  const [screenerLoading, setScreenerLoading] = useState(false)
  const [screenerLoadingMore, setScreenerLoadingMore] = useState(false)
  const [screenerOffset, setScreenerOffset] = useState(0)
  const [activeTab, setActiveTab] = useState('chart')
  const [isMockMode, setIsMockMode] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  useEffect(() => {
    checkHealth().then(h => setIsMockMode(h.data_source === 'mock'))
  }, [])

  const handleRunScreener = useCallback(async (overrideFilters) => {
    const f = overrideFilters ?? filtersRef.current
    setScreenerLoading(true)
    setScreenerOffset(0)
    setActiveTab('screener')
    try {
      const result = await runScreener(f)
      setScreenerData(result.data ?? [])
      setScreenerTotal(result.total ?? 0)
    } catch {
      setScreenerData([])
    } finally {
      setScreenerLoading(false)
    }
  }, [])

  const handleLoadMore = useCallback(async () => {
    const nextOffset = screenerOffset + 50
    setScreenerLoadingMore(true)
    try {
      const result = await runScreenerPage(filtersRef.current, nextOffset)
      setScreenerData(prev => [...prev, ...(result.data ?? [])])
      setScreenerOffset(nextOffset)
    } catch {
      // keep existing data
    } finally {
      setScreenerLoadingMore(false)
    }
  }, [screenerOffset])

  const handleAIFilters = useCallback((aiFilters) => {
    setFilters(aiFilters)
    handleRunScreener(aiFilters)
  }, [handleRunScreener])

  const tabs = [
    {
      id: 'chart', label: 'Chart',
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    },
    {
      id: 'fundamentals', label: 'Fundamentals',
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
    },
    {
      id: 'screener', label: 'Screener',
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
    },
  ]

  return (
    <div className="flex flex-col h-screen bg-tv-bg overflow-hidden">
      {/* ── Mock data banner ── */}
      {isMockMode && (
        <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/30 shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-amber-500 text-xs font-medium">
            Usando datos demo — configura EODHD_API_KEY en backend/.env para datos reales
          </span>
        </div>
      )}

      {/* ── Top Bar ── */}
      <header className="flex items-center gap-4 px-4 h-14 bg-tv-surface border-b border-tv-border shrink-0 z-40">
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

        <SearchBar onSelect={sym => { setSelectedSymbol(sym); setActiveTab(sym ? 'chart' : activeTab) }} />

        <div className="flex items-center gap-1 ml-4">
          {tabs.map(tab => (
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

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-tv-muted text-xs">
            <div className={`w-1.5 h-1.5 rounded-full ${isMockMode ? 'bg-amber-500' : 'bg-tv-green animate-pulse'}`} />
            {isMockMode ? 'Demo' : 'Live'}
          </div>
          <span className="text-tv-muted text-xs hidden lg:block">Powered by EODHD</span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel (desktop) ── */}
        <aside className="w-64 shrink-0 bg-tv-surface border-r border-tv-border overflow-y-auto hidden md:flex flex-col">
          <ScreenerFilters
            filters={filters}
            onChange={setFilters}
            onRun={() => handleRunScreener()}
            loading={screenerLoading}
          />
        </aside>

        {/* ── Main Panel ── */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <AIQuery onFiltersApplied={handleAIFilters} />

          {activeTab === 'chart' && <StockChart symbol={selectedSymbol} />}
          {activeTab === 'fundamentals' && <FundamentalsPanel symbol={selectedSymbol} />}
          {activeTab === 'screener' && (
            <ResultsTable
              data={screenerData}
              loading={screenerLoading}
              loadingMore={screenerLoadingMore}
              total={screenerTotal}
              onSelectSymbol={sym => { setSelectedSymbol(sym); setActiveTab('chart') }}
              onLoadMore={screenerData.length < screenerTotal ? handleLoadMore : undefined}
            />
          )}

          {activeTab === 'chart' && screenerData.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-tv-muted text-xs">Últimos resultados del screener —</span>
                <button onClick={() => setActiveTab('screener')} className="text-tv-blue text-xs hover:underline">
                  Ver los {screenerTotal} resultados
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

      {/* ── Mobile filter drawer ── */}
      {mobileFiltersOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative w-72 bg-tv-surface border-r border-tv-border flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-tv-border">
              <span className="text-tv-text text-sm font-medium">Filtros</span>
              <button onClick={() => setMobileFiltersOpen(false)} className="text-tv-muted hover:text-tv-text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <ScreenerFilters
              filters={filters}
              onChange={setFilters}
              onRun={() => { handleRunScreener(); setMobileFiltersOpen(false) }}
              loading={screenerLoading}
            />
          </div>
        </div>
      )}

      {/* ── Mobile FAB ── */}
      <div className="md:hidden fixed bottom-4 right-4 z-40 flex gap-2">
        <button
          className="w-12 h-12 bg-tv-surface border border-tv-border rounded-full flex items-center justify-center shadow-xl text-tv-muted hover:text-tv-text"
          onClick={() => setMobileFiltersOpen(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </button>
        <button
          className="tv-btn flex items-center gap-2 shadow-xl px-4"
          onClick={() => handleRunScreener()}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="12" x2="2" y2="12"/><polyline points="15 5 22 12 15 19"/>
          </svg>
          Screen
        </button>
      </div>
    </div>
  )
}
