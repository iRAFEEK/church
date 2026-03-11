'use client'

/**
 * Shared search utilities used across the application.
 * Extracted from GroupsTable for reuse in events, staffing, etc.
 */

import { useState, useEffect } from 'react'

// Re-export server-safe normalization so client components can import from here
export { normalizeSearch } from './normalize'

/**
 * Debounce hook — delays updating a value until after `delay` ms of inactivity.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}
