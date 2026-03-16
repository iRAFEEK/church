'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

type MultiSelectOption = {
  value: string
  label: string
}

type MultiSelectProps = {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder: string
  searchPlaceholder?: string
  clearLabel?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  searchPlaceholder,
  clearLabel,
  className,
}: MultiSelectProps) {
  const t = useTranslations('notificationComposer')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)

  const showSearch = options.length > 6

  const filteredOptions = search
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
      )
    : options

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const removeOption = (value: string) => {
    onChange(selected.filter((v) => v !== value))
  }

  const clearAll = () => {
    onChange([])
    setSearch('')
  }

  // Reset search when closed
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean)

  return (
    <div className={cn('space-y-1.5', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-[44px] text-start font-normal"
          >
            <span className={cn('truncate', selected.length === 0 && 'text-muted-foreground')}>
              {selected.length > 0
                ? t('selectedCount', { count: selected.length })
                : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ms-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[--radix-popover-trigger-width]"
          align="start"
        >
          {showSearch && (
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  dir="auto"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder || t('search')}
                  className="ps-8 text-base h-9"
                />
              </div>
            </div>
          )}

          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('noResults')}
              </p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className="flex items-center gap-2 w-full rounded-sm px-2 py-2 text-sm hover:bg-accent min-h-[36px] text-start"
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                      aria-hidden
                    />
                    <span className="flex-1 truncate">{option.label}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {selected.length > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="w-full h-8 text-xs"
              >
                {clearLabel || t('clearSelection')}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLabels.map((label, i) => (
            <Badge
              key={selected[i]}
              variant="secondary"
              className="text-xs gap-1 pe-1"
            >
              {label}
              <button
                onClick={() => removeOption(selected[i])}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                aria-label={t('remove')}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
