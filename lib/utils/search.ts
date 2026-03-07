/**
 * Shared search utilities used across the application.
 * Extracted from GroupsTable for reuse in events, staffing, etc.
 */

import { useState, useEffect } from 'react'

/**
 * Normalize text for search: lowercases, strips Arabic diacritics,
 * unifies alef variants, and trims whitespace.
 */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0610-\u061A\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .trim()
}

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
