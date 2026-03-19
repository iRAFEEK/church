'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useTranslations } from 'next-intl'
import { Pause, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'

type AudioPlayerProps = {
  src: string
  title?: string
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AudioPlayer({ src, title }: AudioPlayerProps) {
  const t = useTranslations('Liturgy')
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => {
        // Browser may block autoplay
        setIsPlaying(false)
      })
    }
  }, [isPlaying])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const time = parseFloat(e.target.value)
    audio.currentTime = time
    setCurrentTime(time)
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0"
        onClick={togglePlay}
        aria-label={isPlaying ? t('pause') : t('play')}
      >
        {isPlaying ? (
          <Pause className="size-5" />
        ) : (
          <Play className="size-5" />
        )}
      </Button>

      <div className="flex-1 min-w-0 space-y-1">
        {title && (
          <p className="text-sm font-medium truncate">{title}</p>
        )}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 accent-primary cursor-pointer"
            dir="ltr"
            aria-label={t('play')}
          />
        </div>
        <div className="flex items-center justify-between" dir="ltr">
          <span className="text-xs text-muted-foreground font-mono">
            {formatTime(currentTime)}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}
