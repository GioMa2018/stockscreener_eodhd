import { useState, useRef, useEffect } from 'react'
import { searchStocks } from '../api/client'

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(timeoutRef.current)
    if (!val.trim()) { setResults([]); setOpen(false); return }
    timeoutRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchStocks(val.trim())
        setResults(Array.isArray(data) ? data.slice(0, 8) : [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function handleSelect(item) {
    setQuery(item.Code)
    setOpen(false)
    onSelect?.(item.Code)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && query.trim()) {
      setOpen(false)
      onSelect?.(query.trim().toUpperCase())
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-72">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-tv-muted pointer-events-none"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className="tv-input pl-9 pr-4 w-full h-9"
          placeholder="Search symbol or company…"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border border-tv-muted border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 tv-card z-50 overflow-hidden shadow-xl">
          {results.map((item) => (
            <button
              key={`${item.Code}-${item.Exchange}`}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-tv-border text-left transition-colors"
              onClick={() => handleSelect(item)}
            >
              <span className="font-semibold text-tv-blue text-sm w-20 shrink-0">{item.Code}</span>
              <span className="text-tv-text text-xs truncate flex-1">{item.Name}</span>
              <span className="text-tv-muted text-xs shrink-0">{item.Exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
