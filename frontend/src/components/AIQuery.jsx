import { useState } from 'react'
import { runAIQuery } from '../api/client'

const EXAMPLES = [
  'Empresas tecnológicas rentables con alto crecimiento y poca deuda',
  'Large cap value stocks with P/E below 20',
  'Mega cap con alto ROE y sin deuda',
  'Acciones de crecimiento con P/E menor a 30',
]

export default function AIQuery({ onFiltersApplied }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await runAIQuery(query.trim())
      setResult(data)
      if (onFiltersApplied) {
        onFiltersApplied(data.filters)
      }
    } catch {
      setError('Failed to process query. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function useExample(ex) {
    setQuery(ex)
    setResult(null)
    setError(null)
  }

  return (
    <div className="tv-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-tv-blue/20 rounded flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2962ff" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 8v4l3 3" />
            <path d="M20 2v6h-6" />
          </svg>
        </div>
        <span className="text-tv-text text-sm font-medium">AI Query</span>
        <span className="text-tv-muted text-xs bg-tv-border px-1.5 py-0.5 rounded">Beta</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="tv-input flex-1 text-sm"
          placeholder="e.g. Profitable tech companies with high growth and low debt…"
          value={query}
          onChange={e => { setQuery(e.target.value); setResult(null); setError(null) }}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="tv-btn flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
          Apply
        </button>
      </form>

      {/* Examples */}
      <div className="flex gap-1.5 flex-wrap mt-2">
        {EXAMPLES.map(ex => (
          <button
            key={ex}
            onClick={() => useExample(ex)}
            className="text-xs text-tv-muted hover:text-tv-blue bg-tv-border hover:bg-tv-blue/10 px-2 py-1 rounded transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Result */}
      {result && (
        <div className={`mt-3 p-3 rounded-lg border ${
          result.labels?.length > 0
            ? 'bg-tv-blue/10 border-tv-blue/30'
            : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <p className={`text-xs font-medium mb-1.5 ${result.labels?.length > 0 ? 'text-tv-blue' : 'text-amber-500'}`}>
            {result.description}
          </p>
          {result.labels?.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {result.labels.map(l => (
                <span key={l} className="text-xs bg-tv-blue/20 text-tv-blue px-2 py-0.5 rounded-full">
                  {l}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-amber-500/80 text-xs">
              Intenta ser más específico: "empresas con P/E menor a 20 y ROE mayor a 15%"
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-tv-red/10 border border-tv-red/30 rounded-lg">
          <p className="text-tv-red text-xs">{error}</p>
        </div>
      )}
    </div>
  )
}
