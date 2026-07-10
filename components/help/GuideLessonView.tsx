'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Volume2, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GuideLesson } from '@/lib/help/guide-data'

interface GuideLessonViewProps {
  lesson: GuideLesson
}

/**
 * One lesson at a time: each step is an icon + one spoken-Arabic sentence with
 * real voiceover, an annotated screenshot, and (when available) a short video.
 * Media is lazy; a single shared audio element prevents overlapping narration.
 */
export function GuideLessonView({ lesson }: GuideLessonViewProps) {
  const t = useTranslations('helpGuide')
  const locale = useLocale()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)

  useEffect(() => () => { audioRef.current?.pause() }, [])

  const toggleAudio = useCallback((src: string) => {
    if (!audioRef.current) audioRef.current = new Audio()
    const player = audioRef.current
    if (playing === src && !player.paused) {
      player.pause()
      setPlaying(null)
      return
    }
    player.src = src
    player.play().catch(() => setPlaying(null))
    setPlaying(src)
    player.onended = () => setPlaying(null)
  }, [playing])

  const fmt = (n: number) => n.toLocaleString(locale.startsWith('ar') ? 'ar-EG' : 'en-US')

  return (
    <div className="space-y-4">
      {/* Lesson header */}
      <div className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden>{lesson.icon}</span>
        <h1 className="flex-1 text-xl font-bold text-zinc-900" dir="rtl">{lesson.title}</h1>
        {lesson.titleAud && (
          <AudioButton active={playing === lesson.titleAud} onClick={() => toggleAudio(lesson.titleAud!)} label={t('listen')} />
        )}
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {lesson.steps.map((step, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-full border-[3px] border-amber-400 text-amber-600 font-bold shrink-0" dir="ltr">
                {fmt(i + 1)}
              </span>
              <span className="text-2xl shrink-0" aria-hidden>{step.icon}</span>
              <p className="flex-1 font-semibold text-zinc-800 leading-relaxed" dir="rtl">{step.ar}</p>
              {step.aud && (
                <AudioButton active={playing === step.aud} onClick={() => toggleAudio(step.aud!)} label={t('listen')} />
              )}
            </div>

            {step.img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={step.img}
                alt=""
                loading="lazy"
                className="w-full rounded-xl border border-zinc-200"
              />
            )}

            {step.vid && (
              <div className="relative">
                <span className="absolute top-2 start-2 z-10 rounded-full bg-amber-500 text-white text-xs font-bold px-3 py-1">
                  {t('video')}
                </span>
                <video
                  controls
                  muted
                  playsInline
                  preload="none"
                  poster={step.img}
                  className="w-full rounded-xl border border-zinc-200 bg-black"
                >
                  <source src={step.vid} type="video/mp4" />
                </video>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AudioButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex items-center justify-center w-11 h-11 rounded-full shrink-0 transition-all active:scale-90',
        active ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
      )}
    >
      {active ? <Pause className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
  )
}
