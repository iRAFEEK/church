'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  ChevronLeft, ChevronRight, Settings, X, Maximize, Minimize,
  Upload, ArrowLeft, Search, Loader2, Music
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Song, SongDisplaySettings } from '@/types'

interface SongPresenterProps {
  song: Song
  initialSlide?: number
}

const FONT_MAP: Record<string, string> = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'ui-serif, Georgia, serif',
  mono: 'ui-monospace, monospace',
  arabic: '"Noto Naskh Arabic", "Traditional Arabic", serif',
}

export function SongPresenter({ song, initialSlide = 0 }: SongPresenterProps) {
  const t = useTranslations('songs')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const router = useRouter()

  const lyrics = isAr ? (song.lyrics_ar || song.lyrics) : song.lyrics
  const slides = lyrics
    ? lyrics.split(/\n\s*\n/).filter(s => s.trim())
    : []

  const title = isAr ? (song.title_ar || song.title) : song.title

  const [currentSlide, setCurrentSlide] = useState(initialSlide)
  const [showSettings, setShowSettings] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [settings, setSettings] = useState<SongDisplaySettings>(
    song.display_settings || {
      bg_color: '#000000',
      bg_image: null,
      text_color: '#ffffff',
      font_family: 'sans',
      font_size: 48,
    }
  )
  const [uploading, setUploading] = useState(false)

  // Song search state
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; title: string; title_ar: string | null; artist: string | null; artist_ar: string | null }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchAbortRef = useRef<AbortController | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-hide controls after 3s of no mouse movement
  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (!showSettings) setControlsVisible(false)
    }, 3000)
  }, [showSettings])

  useEffect(() => {
    showControls()
    const handleMouseMove = () => showControls()
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [showControls])

  // Keep controls visible while settings or search panel is open
  useEffect(() => {
    if (showSettings || showSearch) {
      setControlsVisible(true)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [showSettings, showSearch])

  // Song search
  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!value.trim()) { setSearchResults([]); setSearchLoading(false); return }

    setSearchLoading(true)
    searchDebounceRef.current = setTimeout(async () => {
      if (searchAbortRef.current) searchAbortRef.current.abort()
      const controller = new AbortController()
      searchAbortRef.current = controller
      try {
        const res = await fetch(`/api/songs?q=${encodeURIComponent(value.trim())}&pageSize=10`, { signal: controller.signal })
        if (!res.ok) throw new Error()
        const json = await res.json()
        setSearchResults(json.data || [])
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 150)
  }, [])

  const openSearch = useCallback(() => {
    setShowSearch(true)
    setShowSettings(false)
    setTimeout(() => searchInputRef.current?.focus(), 100)
  }, [])

  const closeSearch = useCallback(() => {
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }, [])

  // Auto-save settings on change
  const saveSettings = useCallback(async (newSettings: SongDisplaySettings) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      await fetch(`/api/songs/${song.id}/display`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
    }, 500)
  }, [song.id])

  const updateSetting = <K extends keyof SongDisplaySettings>(key: K, value: SongDisplaySettings[K]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  // Navigation
  const goNext = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))
  }, [slides.length])

  const goPrev = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0))
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      switch (e.key) {
        case 'ArrowRight':
          isAr ? goPrev() : goNext()
          break
        case 'ArrowLeft':
          isAr ? goNext() : goPrev()
          break
        case 'ArrowDown':
        case ' ':
          e.preventDefault()
          goNext()
          break
        case 'ArrowUp':
          e.preventDefault()
          goPrev()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 's':
        case 'S':
          openSearch()
          break
        case 'Escape':
          if (showSearch) closeSearch()
          else if (showSettings) setShowSettings(false)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, isAr, showSettings, showSearch, openSearch, closeSearch])

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFSChange)
    return () => document.removeEventListener('fullscreenchange', handleFSChange)
  }, [])

  // Background image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${song.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('song-backgrounds')
        .upload(path, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('song-backgrounds')
        .getPublicUrl(path)

      updateSetting('bg_image', publicUrl)
    } catch {
      toast.error(t('errorGeneral'))
    } finally {
      setUploading(false)
    }
  }

  const clearBgImage = () => {
    updateSetting('bg_image', null)
  }

  const handleBack = () => {
    router.back()
  }

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-xl">{t('noLyrics')}</p>
      </div>
    )
  }

  const bgStyle: React.CSSProperties = {
    backgroundColor: settings.bg_color,
    backgroundImage: settings.bg_image ? `url(${settings.bg_image})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }

  const PrevIcon = isAr ? ChevronRight : ChevronLeft
  const NextIcon = isAr ? ChevronLeft : ChevronRight

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-screen overflow-hidden select-none"
      style={bgStyle}
    >
      {/* Overlay for text readability */}
      {settings.bg_image && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      {/* Song title — top bar */}
      <div
        className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-5 py-3 transition-opacity duration-300 bg-gradient-to-b from-black/60 to-transparent"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="text-white/90 hover:bg-white/20 shrink-0"
          onClick={handleBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-white/90 text-sm font-medium truncate flex-1" dir={isAr ? 'rtl' : 'ltr'}>
          {title}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/90 hover:bg-white/20 shrink-0"
          onClick={openSearch}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Side navigation arrows — always-visible large touch targets */}
      <button
        className="absolute start-0 top-0 bottom-0 w-20 z-10 flex items-center justify-start ps-4 transition-opacity duration-300 group"
        style={{ opacity: controlsVisible && currentSlide > 0 ? 1 : 0, pointerEvents: currentSlide > 0 ? 'auto' : 'none' }}
        onClick={isAr ? goNext : goPrev}
        aria-label="Previous"
      >
        <div className="rounded-full bg-black/30 group-hover:bg-black/50 p-2 transition-colors">
          <PrevIcon className="h-7 w-7 text-white" />
        </div>
      </button>
      <button
        className="absolute end-0 top-0 bottom-0 w-20 z-10 flex items-center justify-end pe-4 transition-opacity duration-300 group"
        style={{ opacity: controlsVisible && currentSlide < slides.length - 1 ? 1 : 0, pointerEvents: currentSlide < slides.length - 1 ? 'auto' : 'none' }}
        onClick={isAr ? goPrev : goNext}
        aria-label="Next"
      >
        <div className="rounded-full bg-black/30 group-hover:bg-black/50 p-2 transition-colors">
          <NextIcon className="h-7 w-7 text-white" />
        </div>
      </button>

      {/* Slide content */}
      <div
        className="absolute inset-0 flex items-center justify-center px-24 py-20 cursor-pointer"
        onClick={(e) => {
          // Ignore clicks on side nav or controls
          if ((e.target as HTMLElement).closest('button')) return
          const rect = (e.currentTarget).getBoundingClientRect()
          const clickX = e.clientX - rect.left
          if (clickX < rect.width / 2) {
            isAr ? goNext() : goPrev()
          } else {
            isAr ? goPrev() : goNext()
          }
        }}
      >
        <p
          className="text-center whitespace-pre-line leading-relaxed max-w-4xl z-10"
          style={{
            color: settings.text_color,
            fontFamily: FONT_MAP[settings.font_family] || FONT_MAP.sans,
            fontSize: `${settings.font_size}px`,
          }}
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {slides[currentSlide]}
        </p>
      </div>

      {/* Bottom controls bar */}
      <div
        className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-between px-5 py-3 transition-opacity duration-300 bg-gradient-to-t from-black/60 to-transparent"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}
      >
        {/* Slide progress */}
        <div className="flex items-center gap-3">
          <span className="text-white/90 text-sm font-medium tabular-nums">
            {currentSlide + 1} / {slides.length}
          </span>
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className="transition-all duration-200"
                aria-label={`${t('slide')} ${i + 1}`}
              >
                <div
                  className={`rounded-full transition-all duration-200 ${
                    i === currentSlide
                      ? 'w-3 h-3 bg-white'
                      : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/90 hover:bg-white/20"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/90 hover:bg-white/20"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          className="absolute top-0 end-0 h-full w-80 bg-zinc-900/95 backdrop-blur-sm border-s border-zinc-700 z-30 overflow-y-auto p-6 space-y-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">{t('displaySettings')}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setShowSettings(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label className="text-zinc-300">{t('bgColor')}</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.bg_color}
                onChange={(e) => updateSetting('bg_color', e.target.value)}
                className="h-10 w-14 rounded border border-zinc-600 cursor-pointer bg-transparent"
              />
              <span className="text-zinc-400 text-sm font-mono">{settings.bg_color}</span>
            </div>
          </div>

          {/* Background Image */}
          <div className="space-y-2">
            <Label className="text-zinc-300">{t('bgImage')}</Label>
            {settings.bg_image ? (
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg bg-cover bg-center border border-zinc-600"
                  style={{ backgroundImage: `url(${settings.bg_image})` }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-zinc-300 border-zinc-600"
                  onClick={clearBgImage}
                >
                  {t('removeBgImage')}
                </Button>
              </div>
            ) : (
              <label className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-zinc-600 cursor-pointer hover:border-zinc-400 transition-colors">
                <Upload className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">
                  {uploading ? t('uploading') : t('uploadBgImage')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <Label className="text-zinc-300">{t('textColor')}</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.text_color}
                onChange={(e) => updateSetting('text_color', e.target.value)}
                className="h-10 w-14 rounded border border-zinc-600 cursor-pointer bg-transparent"
              />
              <span className="text-zinc-400 text-sm font-mono">{settings.text_color}</span>
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-zinc-300">{t('fontFamily')}</Label>
            <select
              value={settings.font_family}
              onChange={(e) => updateSetting('font_family', e.target.value as SongDisplaySettings['font_family'])}
              className="flex h-10 w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white"
            >
              <option value="sans">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
              <option value="arabic">Arabic (Naskh)</option>
            </select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <Label className="text-zinc-300">
              {t('fontSize')}: {settings.font_size}px
            </Label>
            <input
              type="range"
              min={24}
              max={120}
              step={2}
              value={settings.font_size}
              onChange={(e) => updateSetting('font_size', Number(e.target.value))}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>24px</span>
              <span>120px</span>
            </div>
          </div>

          {/* Keyboard shortcuts help */}
          <div className="space-y-1 pt-4 border-t border-zinc-700">
            <p className="text-xs text-zinc-500 font-semibold uppercase">{t('shortcuts')}</p>
            <div className="text-xs text-zinc-500 space-y-1">
              <p>← → {t('shortcutNav')}</p>
              <p>Space {t('shortcutNext')}</p>
              <p>S {t('searchPlaceholder')}</p>
              <p>F {t('shortcutFullscreen')}</p>
              <p>Esc {t('shortcutClose')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search overlay */}
      {showSearch && (
        <div
          className="absolute inset-0 z-40 flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm"
          onClick={closeSearch}
        >
          <div
            className="w-full max-w-lg mx-4 bg-zinc-900/95 rounded-xl border border-zinc-700 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="p-4 border-b border-zinc-700">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  ref={searchInputRef}
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  className="ps-10 h-10 bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-500"
                  autoComplete="off"
                />
                {searchLoading && (
                  <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
                )}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[40vh] overflow-y-auto">
              {!searchLoading && searchQuery.trim() && searchResults.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  {t('noSearchResults')}
                </div>
              )}

              {searchResults.map((result) => {
                const rTitle = isAr ? (result.title_ar || result.title) : result.title
                const rArtist = isAr ? (result.artist_ar || result.artist) : result.artist
                return (
                  <button
                    key={result.id}
                    onClick={() => {
                      router.replace(`/presenter/songs/${result.id}`)
                      closeSearch()
                    }}
                    className="w-full text-start flex items-center gap-3 px-4 py-3 hover:bg-zinc-700/50 transition-colors border-b border-zinc-800 last:border-b-0"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 shrink-0">
                      <Music className="h-4 w-4 text-zinc-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{rTitle}</p>
                      {rArtist && (
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{rArtist}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
