'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-6xl font-bold text-muted-foreground/20">!</h1>
        <h2 className="text-2xl font-bold">حدث خطأ</h2>
        <p className="text-muted-foreground">
          حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>إعادة المحاولة</Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            الرئيسية
          </Button>
        </div>
      </div>
    </div>
  )
}
