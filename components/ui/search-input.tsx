'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'

interface SearchInputProps<T> {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  fetchResults: (query: string) => Promise<T[]>
  renderResult: (item: T) => React.ReactNode
  getKey: (item: T) => string
  onSelect: (item: T) => void
  minChars?: number
  debounceMs?: number
  className?: string
  noResultsText?: string
}

export function SearchInput<T>({
  value,
  onChange,
  placeholder,
  fetchResults,
  renderResult,
  getKey,
  onSelect,
  minChars = 1,
  debounceMs = 200,
  className,
  noResultsText = '—',
}: SearchInputProps<T>) {
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleChange = useCallback(
    (q: string) => {
      onChange(q)

      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (q.trim().length < minChars) {
        setResults([])
        setOpen(false)
        setLoading(false)
        return
      }

      setLoading(true)
      setOpen(true)

      debounceRef.current = setTimeout(async () => {
        try {
          const r = await fetchResults(q)
          setResults(r)
        } catch {
          setResults([])
        } finally {
          setLoading(false)
        }
      }, debounceMs)
    },
    [onChange, fetchResults, minChars, debounceMs]
  )

  const handleSelect = useCallback(
    (item: T) => {
      onSelect(item)
      onChange('')
      setResults([])
      setOpen(false)
    },
    [onSelect, onChange]
  )

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false)
    }
  }, [])

  const showDropdown = open && value.trim().length >= minChars

  return (
    <div ref={containerRef} className={cn('relative', className)} onBlur={handleBlur}>
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="ps-10"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden">
          <div className="max-h-72 overflow-y-auto py-1">
            {!loading && results.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">{noResultsText}</p>
            ) : (
              results.map((item) => (
                <button
                  key={getKey(item)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(item)}
                  className="w-full text-start px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  {renderResult(item)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
