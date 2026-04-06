import { useEffect, useRef, useState } from 'react'
import { searchSymbols } from '@/lib/chatApi'
import { useAddToWatchlist } from '@/hooks/useWatchlist'
import { useQueryClient } from '@tanstack/react-query'

interface Result {
  symbol: string
  description: string
}

export function SymbolSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { mutate: addToWatchlist } = useAddToWatchlist()
  const queryClient = useQueryClient()

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([])
      setIsOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      void searchSymbols(query).then((res) => {
        setResults(res)
        setIsOpen(res.length > 0)
        setActiveIndex(0)
      })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSelect(result: Result) {
    const watchlist = queryClient.getQueryData<{ symbol: string }[]>(['watchlist']) ?? []
    const alreadyAdded = watchlist.some((w) => w.symbol === result.symbol)
    if (!alreadyAdded) {
      addToWatchlist(result.symbol)
    }
    setQuery('')
    setIsOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[activeIndex]
      if (r) handleSelect(r)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-64">
      <div className="relative">
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          role="combobox"
          placeholder="Search stocks…"
          aria-label="Search stocks"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
        />
      </div>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          {results.map((r, i) => (
            <li
              key={r.symbol}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => handleSelect(r)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
                i === activeIndex ? 'bg-slate-50' : ''
              }`}
            >
              <span className="w-12 flex-shrink-0 text-xs font-semibold text-slate-800">
                {r.symbol}
              </span>
              <span className="flex-1 truncate text-xs text-slate-500">{r.description}</span>
              <span className="flex-shrink-0 text-[10px] text-slate-400">+ Add</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}
