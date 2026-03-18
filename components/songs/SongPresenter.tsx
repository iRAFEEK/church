'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  ChevronLeft, ChevronRight, Settings, X, Maximize, Minimize,
  Upload, ArrowLeft, Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { splitIntoSlides } from '@/lib/utils/song-slides'
import { PresenterSearch } from './PresenterSearch'
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
  const isAr = locale.startsWith('ar')

  // Active song state — allows switching songs via in-presenter search
  const [activeSong, setActiveSong] = useState<Song>(song)

  const lyrics = isAr ? (activeSong.lyrics_ar || activeSong.lyrics) : activeSong.lyrics
  const slides = lyrics ? splitIntoSlides(lyrics) : []
  const songTitle = isAr ? (activeSong.title_ar || activeSong.title) : activeSong.title

  const [currentSlide, setCurrentSlide] = useState(Math.min(initialSlide, Math.max(slides.length - 1, 0)))
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [settings, setSettings] = useState<SongDisplaySettings>(
    activeSong.display_settings || {
      bg_color: '#000000',
      bg_image: null,
      text_color: '#ffffff',
      font_family: 'sans',
      font_size: 48,
    }
  )
  const [uploading, setUploading] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save settings on change
  const saveSettings = useCallback(async (newSettings: SongDisplaySettings) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      await fetch(`/api/songs/${activeSong.id}/display`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
    }, 500)
  }, [activeSong.id])

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
      // Don't capture keys when search is open (it handles its own keys)
      if (showSearch) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return

      switch (e.key) {
        case '/':
          e.preventDefault()
          setShowSearch(true)
          break
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
        case 'Escape':
          if (showSettings) setShowSettings(false)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, isAr, showSettings, showSearch])

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

  // Handle song switch from search
  const handleSongSelect = useCallback(async (searchResult: { id: string }, slideIndex: number) => {
    try {
      const res = await fetch(`/api/songs/${searchResult.id}`)
      if (!res.ok) return
      const { data } = await res.json()
      if (data) {
        setActiveSong(data)
        setSettings(data.display_settings || settings)
        // Compute slides for new song to clamp slideIndex
        const newLyrics = isAr ? (data.lyrics_ar || data.lyrics) : data.lyrics
        const newSlides = newLyrics ? splitIntoSlides(newLyrics) : []
        setCurrentSlide(Math.min(slideIndex, Math.max(newSlides.length - 1, 0)))
        setShowSearch(false)
      }
    } catch {
      // Silently fail — user can try again
    }
  }, [isAr, settings])

  // Background image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${activeSong.id}/${Date.now()}.${ext}`

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

      {/* Song title indicator */}
      <div className="absolute top-0 inset-x-0 z-20 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-b from-black/60 to-transparent p-4">
        <p className="text-white/70 text-sm truncate text-center" dir={isAr ? 'rtl' : 'ltr'}>
          {songTitle}
        </p>
      </div>

      {/* Slide content */}
      <div
        className="absolute inset-0 flex items-center justify-center p-8 cursor-pointer"
        onClick={(e) => {
          if (showSearch) return
          const rect = (e.target as HTMLElement).getBoundingClientRect()
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
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between p-4 z-20 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => window.close()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-white text-sm">
            {currentSlide + 1} / {slides.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={goPrev}
            disabled={currentSlide === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={goNext}
            disabled={currentSlide === slides.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search button — always visible */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setShowSearch(true)}
            title={t('shortcutSearch')}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
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
              <p>/ {t('shortcutSearch')}</p>
              <p>F {t('shortcutFullscreen')}</p>
              <p>Esc {t('shortcutClose')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search overlay */}
      {showSearch && (
        <PresenterSearch
          onSelect={handleSongSelect}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  )
}
