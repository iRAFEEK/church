'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'
import { timeAgo } from '@/lib/utils/time-ago'
import type { ChurchNeedMessageWithSender } from '@/types'

interface MessageThreadProps {
  needId: string
  responseId: string
  myChurchId: string
}

export function MessageThread({ needId, responseId, myChurchId }: MessageThreadProps) {
  const t = useTranslations('churchNeeds')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const scrollRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<ChurchNeedMessageWithSender[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchMessages(controller.signal)
    // Mark thread as read
    fetch(`/api/community/needs/${needId}/responses/${responseId}/messages/read`, {
      method: 'PATCH',
      signal: controller.signal,
    }).catch(() => {})
    return () => controller.abort()
  }, [needId, responseId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function fetchMessages(signal?: AbortSignal) {
    try {
      const res = await fetch(`/api/community/needs/${needId}/responses/${responseId}/messages`, { signal })
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setMessages(json.data || [])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(t('messagesLoadError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    if (!newMessage.trim()) return
    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/community/needs/${needId}/responses/${responseId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          message_ar: isAr ? newMessage : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }

      const json = await res.json()
      setMessages(prev => [...prev, json.data])
      setNewMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Message list */}
      <div ref={scrollRef} className="max-h-80 overflow-y-auto space-y-2 p-1">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">{t('noMessages')}</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_church_id === myChurchId
          const churchName = isAr
            ? (msg.sender_church?.name_ar || msg.sender_church?.name)
            : msg.sender_church?.name
          const text = isAr ? (msg.message_ar || msg.message) : msg.message

          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  isMine
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {!isMine && (
                  <div className="flex items-center gap-1.5 mb-1">
                    {msg.sender_church?.logo_url && (
                      <Image src={msg.sender_church.logo_url} alt="" width={16} height={16} className="h-4 w-4 rounded-full object-cover" />
                    )}
                    <span className="text-xs font-medium">{churchName}</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{text}</p>
                <p className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {timeAgo(msg.created_at, locale)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t('typeMessage')}
          rows={2}
          dir="auto"
          className="flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button
          size="icon"
          className="shrink-0 self-end h-10 w-10"
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
