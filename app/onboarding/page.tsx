'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Search, Building2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ChurchSearchResult } from '@/types'

// ─── Step 1: Church Search ────────────────────────────────────────────────────

function ChurchSearchStep({ onJoined }: { onJoined: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChurchSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [joinedId, setJoinedId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const controller = new AbortController()

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/churches/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        if (res.ok && !controller.signal.aborted) setResults(await res.json())
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[ChurchSearch] Failed to fetch:', e)
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      controller.abort()
    }
  }, [query])

  async function handleJoin(church: ChurchSearchResult) {
    setJoiningId(church.id)
    try {
      const res = await fetch('/api/churches/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ church_id: church.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error('Could not join church', { description: data.error })
        return
      }

      setJoinedId(church.id)
      toast.success(`Joined ${church.name}!`)
      setTimeout(onJoined, 800)
    } finally {
      setJoiningId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="ps-9 text-base"
          placeholder="Search by church name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          dir="auto"
          autoFocus
        />
        {searching && (
          <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((church) => (
            <li
              key={church.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              {/* Logo / fallback icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                {church.logo_url ? (
                  <Image
                    src={church.logo_url}
                    alt={church.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{church.name}</p>
                {church.name_ar && (
                  <p className="text-sm text-muted-foreground truncate" dir="rtl">
                    {church.name_ar}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{church.country}</p>
              </div>

              <Button
                size="sm"
                variant={joinedId === church.id ? 'secondary' : 'default'}
                disabled={joiningId !== null || joinedId === church.id}
                onClick={() => handleJoin(church)}
                className="shrink-0"
              >
                {joiningId === church.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : joinedId === church.id ? (
                  <>
                    <Check className="h-4 w-4" />
                    Joined
                  </>
                ) : (
                  'Join'
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {results.length === 0 && query.length > 0 && !searching && (
        <p className="text-sm text-center text-muted-foreground py-4">
          No churches found for &ldquo;{query}&rdquo;.{' '}
          <Link href="/welcome" className="underline underline-offset-4">
            Register a new church
          </Link>
        </p>
      )}

      {results.length === 0 && query.length === 0 && !searching && (
        <p className="text-sm text-center text-muted-foreground py-4">
          Type your church name to search
        </p>
      )}

      {/* Register a new church link */}
      <div className="flex justify-center pt-2 border-t">
        <Link href="/welcome" className="text-sm text-muted-foreground underline underline-offset-4">
          Register a new church
        </Link>
      </div>
    </div>
  )
}

// ─── Step 2: Profile Form (existing) ─────────────────────────────────────────

function ProfileStep() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const t = useTranslations('onboarding')

  const onboardingSchema = z.object({
    first_name_ar: z.string().min(1, t('validationFirstName')),
    last_name_ar: z.string().min(1, t('validationLastName')),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().min(8, t('validationPhone')).optional().or(z.literal('')),
    date_of_birth: z.string().optional(),
    gender: z.enum(['male', 'female']).optional(),
    occupation_ar: z.string().optional(),
    notification_pref: z.enum(['whatsapp', 'sms', 'email', 'all', 'none']).default('whatsapp'),
  })

  type OnboardingForm = z.infer<typeof onboardingSchema>

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      first_name_ar: '',
      last_name_ar: '',
      first_name: '',
      last_name: '',
      phone: '',
      date_of_birth: '',
      occupation_ar: '',
      notification_pref: 'whatsapp',
    },
  })

  async function onSubmit(values: OnboardingForm) {
    setIsLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name_ar: values.first_name_ar,
        last_name_ar: values.last_name_ar,
        first_name: values.first_name || null,
        last_name: values.last_name || null,
        phone: values.phone || null,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender || null,
        occupation_ar: values.occupation_ar || null,
        notification_pref: values.notification_pref,
        onboarding_completed: true,
        joined_church_at: new Date().toISOString().split('T')[0],
      })
      .eq('id', user.id)

    if (error) {
      setIsLoading(false)
      toast.error(t('toastError'), { description: error.message })
      return
    }

    toast.success(t('toastSuccess'), { description: t('toastSuccessDesc') })
    router.push('/')
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Arabic Name (required) */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {t('arabicNameSection')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('firstNameAr')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('firstNameArPlaceholder')} dir="auto" className="text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('lastNameAr')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('lastNameArPlaceholder')} dir="auto" className="text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* English Name (optional) */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {t('englishNameSection')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('firstNameEn')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('firstNameEnPlaceholder')} dir="ltr" className="text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('lastNameEn')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('lastNameEnPlaceholder')} dir="ltr" className="text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('phone')}</FormLabel>
              <FormControl>
                <Input type="tel" placeholder={t('phonePlaceholder')} dir="ltr" className="text-base" {...field} />
              </FormControl>
              <FormDescription>{t('phoneDescription')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Gender */}
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('gender')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('genderPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">{t('genderMale')}</SelectItem>
                  <SelectItem value="female">{t('genderFemale')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date of Birth */}
        <FormField
          control={form.control}
          name="date_of_birth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('dateOfBirth')}</FormLabel>
              <FormControl>
                <Input type="date" dir="ltr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Occupation */}
        <FormField
          control={form.control}
          name="occupation_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('occupation')}</FormLabel>
              <FormControl>
                <Input placeholder={t('occupationPlaceholder')} dir="auto" className="text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notification Preference */}
        <FormField
          control={form.control}
          name="notification_pref"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('notificationPref')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="whatsapp">{t('notifWhatsapp')}</SelectItem>
                  <SelectItem value="sms">{t('notifSms')}</SelectItem>
                  <SelectItem value="email">{t('notifEmail')}</SelectItem>
                  <SelectItem value="all">{t('notifAll')}</SelectItem>
                  <SelectItem value="none">{t('notifNone')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('submitting')}
            </>
          ) : (
            t('submitButton')
          )}
        </Button>
      </form>
    </Form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
  // If user already selected a church during signup, skip to profile step
  const [step, setStep] = useState<'church' | 'profile'>('profile')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{t('welcome')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('welcomeSubtitle')}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          <div className={`h-2 w-8 rounded-full transition-colors ${step === 'church' ? 'bg-primary' : 'bg-primary/30'}`} />
          <div className={`h-2 w-8 rounded-full transition-colors ${step === 'profile' ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        <Card>
          {step === 'church' ? (
            <>
              <CardHeader>
                <CardTitle>Find your church</CardTitle>
                <CardDescription>
                  Search for your church to join it on Ekklesia. You can join multiple churches.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChurchSearchStep onJoined={() => setStep('profile')} />
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>{t('cardTitle')}</CardTitle>
                <CardDescription>{t('cardDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileStep />
              </CardContent>
            </>
          )}
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium underline underline-offset-4">
            {t('backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  )
}
