'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { UserChurchWithDetails } from '@/types'

export default function SelectChurchPage() {
  const router = useRouter()
  const [churches, setChurches] = useState<UserChurchWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/churches/my-churches')
      .then((res) => res.json())
      .then((data) => setChurches(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  async function handleSelect(churchId: string) {
    setSwitchingId(churchId)
    try {
      const res = await fetch('/api/churches/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ church_id: churchId }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error('Could not switch church', { description: data.error })
        return
      }

      router.push('/')
      router.refresh()
    } finally {
      setSwitchingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Choose a church</CardTitle>
        <CardDescription>
          Select which church you want to sign in to. You can switch anytime from the app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="space-y-2">
            {churches.map((membership) => {
              const church = membership.church as { id: string; name: string; name_ar: string | null; logo_url: string | null; country: string }
              return (
                <li key={membership.church_id}>
                  <Button
                    variant="outline"
                    className="w-full h-auto px-4 py-3 justify-start gap-3"
                    disabled={switchingId !== null}
                    onClick={() => handleSelect(membership.church_id)}
                  >
                    {/* Logo / fallback */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      {church.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={church.logo_url}
                          alt={church.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{church.name}</p>
                      {church.name_ar && (
                        <p className="text-sm text-muted-foreground truncate" dir="rtl">
                          {church.name_ar}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{church.country}</p>
                    </div>

                    {membership.is_active && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    {switchingId === membership.church_id && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
