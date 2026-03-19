'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  ChevronLeft, ChevronRight, Settings, X, Maximize, Minimize,
  ArrowLeft, Minus, Plus, Rows3, GalleryVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { LiturgicalContent, LiturgicalSection, LiturgicalLanguage } from '@/types'
import { convertCopticEncoding } from '@/lib/utils/coptic'

interface LiturgyPresenterProps {
  section: LiturgicalSection
  content: LiturgicalContent[]
}

type ViewMode = 'slides' | 'scroll'

const CONTENT_TYPE_COLORS: Record<string, string> = {
  prayer: 'text-white',
  response: 'text-yellow-300 italic',
  rubric: 'text-red-400 text-sm italic',
  instruction: 'text-gray-400 text-sm italic',
  reading: 'text-green-300',
  hymn: 'text-cyan-300',
}

const LANG_LABELS: Record<LiturgicalLanguage, string> = {
  ar: 'ع',
  en: 'EN',
  coptic: 'ⲬⲞ',
}

function BlockContent({
  block,
  showLanguages,
  fontSize,
}: {
  block: LiturgicalContent
  showLanguages: LiturgicalLanguage[]
  fontSize: number
}) {
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const t = useTranslations('Liturgy')

  const texts: { text: string; lang: LiturgicalLanguage }[] = []
  if (showLanguages.includes('ar') && block.body_ar) texts.push({ text: block.body_ar, lang: 'ar' })
  if (showLanguages.includes('en') && block.body_en) texts.push({ text: block.body_en, lang: 'en' })
  if (showLanguages.includes('coptic') && block.body_coptic) texts.push({ text: convertCopticEncoding(block.body_coptic), lang: 'coptic' })

  if (texts.length === 0) {
    const fallbackLang: LiturgicalLanguage = block.body_ar ? 'ar' : block.body_en ? 'en' : 'coptic'
    const fallbackText = block.body_ar || block.body_en || (block.body_coptic ? convertCopticEncoding(block.body_coptic) : '')
    if (fallbackText) texts.push({ text: fallbackText, lang: fallbackLang })
  }

  const typeStyle = CONTENT_TYPE_COLORS[block.content_type] || 'text-white'

  return (
    <div className="space-y-4">
      {block.content_type !== 'prayer' && (
        <p className="text-xs uppercase tracking-widest text-gray-500">
          {t(block.content_type as Parameters<typeof t>[0])}
        </p>
      )}
      {(block.title_ar || block.title) && (
        <h2 className="font-bold text-gray-300" style={{ fontSize: fontSize * 0.75 }}>
          {isAr ? (block.title_ar || block.title) : (block.title || block.title_ar)}
        </h2>
      )}
      {texts.map(({ text, lang }, i) => (
        <div
          key={i}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          className={`whitespace-pre-wrap leading-relaxed ${typeStyle} ${i > 0 ? 'mt-4 pt-4 border-t border-gray-700' : ''}`}
          style={{
            fontSize: i === 0 ? fontSize : fontSize * 0.85,
            fontFamily: lang === 'coptic'
              ? '"Noto Sans Coptic", "Segoe UI Historic", serif'
              : undefined,
          }}
        >
          {text}
        </div>
      ))}
    </div>
  )
}

export function LiturgyPresenter({ section, content }: LiturgyPresenterProps) {
  const t = useTranslations('Liturgy')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const [currentIndex, setCurrentIndex] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('slides')
  const [showSettings, setShowSettings] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fontSize, setFontSize] = useState(36)
  const [showLanguages, setShowLanguages] = useState<LiturgicalLanguage[]>(['ar'])

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const blockRefs = useRef<(HTMLDivElement | null)[]>([])

  const totalBlocks = content.length
  const currentBlock = content[currentIndex]

  const goNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, totalBlocks - 1))
  }, [totalBlocks])

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0))
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (viewMode === 'slides') {
        switch (e.key) {
          case 'ArrowRight': isAr ? goPrev() : goNext(); break
          case 'ArrowLeft': isAr ? goNext() : goPrev(); break
          case 'ArrowDown':
          case ' ':
          case 'PageDown':
            e.preventDefault(); goNext(); break
          case 'ArrowUp':
          case 'PageUp':
            e.preventDefault(); goPrev(); break
          case 'Home': setCurrentIndex(0); break
          case 'End': setCurrentIndex(totalBlocks - 1); break
        }
      } else {
        // Scroll mode — scroll the container
        const el = scrollRef.current
        if (!el) return
        switch (e.key) {
          case 'ArrowDown':
          case ' ':
          case 'PageDown':
            e.preventDefault(); el.scrollBy({ top: 300, behavior: 'smooth' }); break
          case 'ArrowUp':
          case 'PageUp':
            e.preventDefault(); el.scrollBy({ top: -300, behavior: 'smooth' }); break
          case 'Home': el.scrollTo({ top: 0, behavior: 'smooth' }); break
          case 'End': el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); break
        }
      }
      if (e.key === 'Escape' && showSettings) setShowSettings(false)
      if (e.key === 'f') toggleFullscreen()
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, showSettings, isAr, totalBlocks, viewMode])

  // IntersectionObserver to track visible block in scroll mode
  useEffect(() => {
    if (viewMode !== 'scroll') return
    const observers: IntersectionObserver[] = []
    blockRefs.current.forEach((el, i) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setCurrentIndex(i) },
        { root: scrollRef.current, threshold: 0.5 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [viewMode, content.length])

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleLanguage = (lang: LiturgicalLanguage) => {
    setShowLanguages(prev =>
      prev.includes(lang)
        ? prev.length > 1 ? prev.filter(l => l !== lang) : prev
        : [...prev, lang]
    )
  }

  if (!currentBlock) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white text-xl">
        {t('noContent')}
      </div>
    )
  }

  const progressPct = totalBlocks > 0 ? ((currentIndex + 1) / totalBlocks) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black text-white flex flex-col select-none"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-sm z-10 gap-2">
        {/* Back */}
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 size-11 shrink-0"
          onClick={() => window.history.back()}
          aria-label={t('backToCategories')}
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>

        {/* Section title + counter */}
        <div className="text-center min-w-0 flex-1">
          <p className="text-sm text-gray-300 truncate">
            {isAr ? section.title_ar : section.title}
          </p>
          <p className="text-xs text-gray-500" dir="ltr">
            {currentIndex + 1} / {totalBlocks}
          </p>
        </div>

        {/* Language toggles — always visible */}
        <div className="flex items-center gap-1 shrink-0">
          {(['ar', 'en', 'coptic'] as LiturgicalLanguage[]).map(lang => (
            <button
              key={lang}
              onClick={() => toggleLanguage(lang)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                showLanguages.includes(lang)
                  ? 'bg-white/20 text-white'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
              aria-pressed={showLanguages.includes(lang)}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className={`size-9 ${viewMode === 'slides' ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
            onClick={() => setViewMode('slides')}
            aria-label="Slide mode"
            aria-pressed={viewMode === 'slides'}
          >
            <GalleryVertical className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`size-9 ${viewMode === 'scroll' ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
            onClick={() => setViewMode('scroll')}
            aria-label="Scroll mode"
            aria-pressed={viewMode === 'scroll'}
          >
            <Rows3 className="h-4 w-4" />
          </Button>
        </div>

        {/* Settings + Fullscreen */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 size-9"
            onClick={() => setShowSettings(!showSettings)}
            aria-label={t('settings')}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 size-9"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Settings panel (font size only) */}
      {showSettings && (
        <div className="absolute top-14 end-4 bg-gray-900 rounded-lg p-4 z-20 shadow-lg border border-gray-700 w-52">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">{t('settings')}</span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 size-8"
              onClick={() => setShowSettings(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <Label className="text-xs text-gray-400 mb-2 block">Font Size</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-8 border-gray-600"
                onClick={() => setFontSize(prev => Math.max(16, prev - 4))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm w-8 text-center" dir="ltr">{fontSize}</span>
              <Button
                variant="outline"
                size="icon"
                className="size-8 border-gray-600"
                onClick={() => setFontSize(prev => Math.min(72, prev + 4))}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── SLIDE MODE ── */}
      {viewMode === 'slides' && (
        <div
          className="flex-1 flex items-center justify-center px-8 py-4 cursor-pointer overflow-auto"
          onClick={goNext}
        >
          <div className="max-w-4xl w-full text-center">
            <BlockContent
              block={currentBlock}
              showLanguages={showLanguages}
              fontSize={fontSize}
            />
          </div>
        </div>
      )}

      {/* ── SCROLL MODE ── */}
      {viewMode === 'scroll' && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-4xl mx-auto space-y-10 pb-16">
            {content.map((block, i) => (
              <div
                key={block.id}
                ref={el => { blockRefs.current[i] = el }}
                className={`text-center transition-opacity duration-200 ${
                  i === currentIndex ? 'opacity-100' : 'opacity-60'
                }`}
              >
                <BlockContent
                  block={block}
                  showLanguages={showLanguages}
                  fontSize={fontSize}
                />
                {i < content.length - 1 && (
                  <div className="mt-8 border-t border-gray-800" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 size-11 disabled:opacity-30"
          onClick={viewMode === 'slides' ? goPrev : () => scrollRef.current?.scrollBy({ top: -300, behavior: 'smooth' })}
          disabled={viewMode === 'slides' && currentIndex === 0}
        >
          <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
        </Button>

        {/* Progress bar */}
        <div className="flex-1 mx-4">
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 size-11 disabled:opacity-30"
          onClick={viewMode === 'slides' ? goNext : () => scrollRef.current?.scrollBy({ top: 300, behavior: 'smooth' })}
          disabled={viewMode === 'slides' && currentIndex === totalBlocks - 1}
        >
          <ChevronRight className="h-6 w-6 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  )
}
