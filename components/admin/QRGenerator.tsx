'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Props = {
  joinUrl: string
  churchName: string
}

export function QRGenerator({ joinUrl, churchName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Dynamically import qrcode library to keep bundle light
    import('qrcode').then(QRCode => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, joinUrl, {
          width: 300,
          margin: 2,
          color: { dark: '#18181b', light: '#ffffff' },
        })
      }
    }).catch(() => {
      // Fallback: use QR server API
    })
  }, [joinUrl])

  function downloadQR() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${churchName}-qr.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.success('تم تنزيل رمز QR')
  }

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    toast.success('تم نسخ الرابط')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-6">
      {/* QR Code */}
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-sm">
          <canvas ref={canvasRef} className="block" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-zinc-900">{churchName}</p>
          <p className="text-xs text-zinc-400 mt-0.5">امسح للتسجيل كزائر</p>
        </div>
      </div>

      {/* URL */}
      <div className="bg-zinc-50 rounded-lg p-3">
        <p className="text-xs text-zinc-500 mb-1">رابط الزيارة</p>
        <p className="text-sm font-mono text-zinc-700 break-all" dir="ltr">{joinUrl}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={copyLink} variant="outline" className="flex-1">
          {copied ? 'تم النسخ!' : 'نسخ الرابط'}
        </Button>
        <Button onClick={downloadQR} className="flex-1">
          تنزيل PNG
        </Button>
      </div>

      {/* Print hint */}
      <div className="text-xs text-zinc-400 text-center">
        💡 اطبع الرمز بحجم A5 أو A4 وضعه عند المدخل للحصول على أفضل نتيجة
      </div>
    </div>
  )
}
