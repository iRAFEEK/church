'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Search, Building2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

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
} from '@/components/ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ChurchSearchResult } from '@/types'

// ─── Step 1: Church Selection ──────────────────────────────────────────────────

function ChurchSelectStep({
  onSelect,
}: {
  onSelect: (church: ChurchSearchResult) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChurchSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/churches/search?q=${encodeURIComponent(query)}`
        )
        if (res.ok) setResults(await res.json())
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="ps-9"
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

      {results.length > 0 && (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {results.map((church) => (
            <li key={church.id}>
              <button
                type="button"
                onClick={() => onSelect(church)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-start hover:bg-accent transition-colors"
              >
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
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{church.name}</p>
                  {church.name_ar && (
                    <p
                      className="text-sm text-muted-foreground truncate"
                      dir="rtl"
                    >
                      {church.name_ar}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {church.country}
                  </p>
                </div>
              </button>
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
    </div>
  )
}

// ─── Step 2: Signup Form ────────────────────────────────────────────────────────

const signupSchema = z
  .object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupForm = z.infer<typeof signupSchema>

function SignupFormStep({
  churchId,
  churchName,
  onBack,
}: {
  churchId: string
  churchName: string
  onBack: () => void
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const t = useTranslations('auth')

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  async function onSubmit(values: SignupForm) {
    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { church_id: churchId },
      },
    })

    if (error) {
      setIsLoading(false)
      toast.error(t('signUpError'), { description: error.message })
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{churchName}</span>
        <button
          type="button"
          onClick={onBack}
          className="ms-auto text-xs text-muted-foreground underline underline-offset-2 shrink-0"
        >
          Change
        </button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    dir="ltr"
                    className="text-base"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    dir="ltr"
                    className="text-base"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    dir="ltr"
                    className="text-base"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>
      </Form>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const searchParams = useSearchParams()
  const [selectedChurch, setSelectedChurch] =
    useState<ChurchSearchResult | null>(null)

  // Support ?church_id=xxx&church_name=xxx from QR/invite links
  const preselectedId = searchParams.get('church_id')
  const preselectedName = searchParams.get('church_name')

  const churchId = selectedChurch?.id ?? preselectedId
  const churchName =
    selectedChurch?.name ?? preselectedName ?? ''

  const showForm = churchId && churchName

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t('signUpTitle')}</CardTitle>
        <CardDescription>{t('signUpDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('emailLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      autoComplete="email"
                      dir="ltr"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('passwordLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('passwordPlaceholder')}
                      autoComplete="new-password"
                      dir="ltr"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('passwordPlaceholder')}
                      autoComplete="new-password"
                      dir="ltr"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('creatingAccount')}
                </>
              ) : (
                t('createAccountButton')
              )}
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{' '}
          <Link href="/login" className="font-medium underline underline-offset-4">
            {t('signInLink')}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
