'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  ChevronLeft, ChevronRight, Settings, X, Maximize, Minimize,
  ArrowLeft, Languages, Minus, Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { LiturgicalContent, LiturgicalSection, LiturgicalLanguage } from '@/types'

interface LiturgyPresenterProps {
  section: LiturgicalSection
  content: LiturgicalContent[]
}

const CONTENT_TYPE_COLORS: Record<string, string> = {
  prayer: 'text-white',
  response: 'text-yellow-300 italic',
  rubric: 'text-red-400 text-sm italic',
  instruction: 'text-gray-400 text-sm italic',
  reading: 'text-green-300',
  hymn: 'text-cyan-300',
}

export function LiturgyPresenter({ section, content }: LiturgyPresenterProps) {
  const t = useTranslations('Liturgy')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fontSize, setFontSize] = useState(36)
  const [showLanguages, setShowLanguages] = useState<LiturgicalLanguage[]>(['ar'])

  const containerRef = useRef<HTMLDivElement>(null)

  const currentBlock = content[currentIndex]
  const totalBlocks = content.length

  const goNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, totalBlocks - 1))
  }, [totalBlocks])

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0))
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          isAr ? goPrev() : goNext()
          break
        case 'ArrowLeft':
          isAr ? goNext() : goPrev()
          break
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault()
          goNext()
          break
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          goPrev()
          break
        case 'Home':
          setCurrentIndex(0)
          break
        case 'End':
          setCurrentIndex(totalBlocks - 1)
          break
        case 'Escape':
          if (showSettings) setShowSettings(false)
          break
        case 'f':
          toggleFullscreen()
          break
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, showSettings, isAr, totalBlocks])

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

  const getDisplayText = (block: LiturgicalContent): string[] => {
    const texts: string[] = []
    if (showLanguages.includes('ar') && block.body_ar) texts.push(block.body_ar)
    if (showLanguages.includes('en') && block.body_en) texts.push(block.body_en)
    if (showLanguages.includes('coptic') && block.body_coptic) texts.push(block.body_coptic)
    if (texts.length === 0) {
      // Fallback: show whatever is available
      if (block.body_ar) texts.push(block.body_ar)
      else if (block.body_en) texts.push(block.body_en)
      else if (block.body_coptic) texts.push(block.body_coptic)
    }
    return texts
  }

  if (!currentBlock) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white text-xl">
        {t('noContent')}
      </div>
    )
  }

  const texts = getDisplayText(currentBlock)
  const typeStyle = CONTENT_TYPE_COLORS[currentBlock.content_type] || 'text-white'

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black text-white flex flex-col select-none"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-sm z-10">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 size-11"
          onClick={() => window.history.back()}
          aria-label={t('backToCategories')}
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            {isAr ? section.title_ar : section.title}
          </p>
          <p className="text-xs text-gray-500" dir="ltr">
            {currentIndex + 1} / {totalBlocks}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 size-11"
            onClick={() => setShowSettings(!showSettings)}
            aria-label={t('settings')}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 size-11"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-14 end-4 bg-gray-900 rounded-lg p-4 z-20 shadow-lg border border-gray-700 w-64">
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

          {/* Font size */}
          <div className="mb-4">
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

          {/* Language toggle */}
          <div>
            <Label className="text-xs text-gray-400 mb-2 block">
              <Languages className="h-3 w-3 inline me-1" />
              {t('preferredLanguage')}
            </Label>
            <div className="flex gap-2">
              {(['ar', 'en', 'coptic'] as LiturgicalLanguage[]).map(lang => (
                <Button
                  key={lang}
                  variant={showLanguages.includes(lang) ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs border-gray-600"
                  onClick={() => toggleLanguage(lang)}
                >
                  {t(lang === 'ar' ? 'arabic' : lang === 'en' ? 'english' : 'coptic')}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div
        className="flex-1 flex items-center justify-center px-8 py-4 cursor-pointer overflow-auto"
        onClick={goNext}
      >
        <div className="max-w-4xl w-full text-center space-y-6">
          {/* Content type indicator */}
          {currentBlock.content_type !== 'prayer' && (
            <p className="text-xs uppercase tracking-widest text-gray-500">
              {t(currentBlock.content_type)}
            </p>
          )}

          {/* Title if present */}
          {(currentBlock.title_ar || currentBlock.title) && (
            <h2
              className="font-bold text-gray-300"
              style={{ fontSize: fontSize * 0.75 }}
            >
              {isAr ? (currentBlock.title_ar || currentBlock.title) : (currentBlock.title || currentBlock.title_ar)}
            </h2>
          )}

          {/* Text blocks */}
          {texts.map((text, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap leading-relaxed ${typeStyle} ${i > 0 ? 'mt-4 pt-4 border-t border-gray-700' : ''}`}
              style={{
                fontSize: i === 0 ? fontSize : fontSize * 0.85,
                fontFamily: texts.length > 1 && i === texts.length - 1
                  ? '"Noto Naskh Arabic", "Traditional Arabic", serif'
                  : undefined,
              }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 size-11 disabled:opacity-30"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
        </Button>

        {/* Progress bar */}
        <div className="flex-1 mx-4">
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalBlocks) * 100}%` }}
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 size-11 disabled:opacity-30"
          onClick={goNext}
          disabled={currentIndex === totalBlocks - 1}
        >
          <ChevronRight className="h-6 w-6 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  )
}
