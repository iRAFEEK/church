'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'
import { analytics } from '@/lib/analytics'
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

// Only defined in development — bundler eliminates array contents in production builds
const TEST_ACCOUNTS = process.env.NODE_ENV === 'development' ? [
  { email: 'pastor@gracechurch.test', password: 'password123', label: 'Super Admin (Pastor)', role: 'super_admin' },
  { email: 'admin@gracechurch.test', password: 'password123', label: 'Super Admin (Associate)', role: 'super_admin' },
  { email: 'worship@gracechurch.test', password: 'password123', label: 'Ministry Leader (Worship)', role: 'ministry_leader' },
  { email: 'leader1@gracechurch.test', password: 'password123', label: 'Group Leader', role: 'group_leader' },
  { email: 'member@gracechurch.test', password: 'password123', label: 'Member', role: 'member' },
] : []

const CROSS_CHURCH_ACCOUNTS = process.env.NODE_ENV === 'development' ? [
  { email: 'admin@gracecairo.org', password: 'password123', label: 'Grace Church Cairo (Egypt)', role: 'super_admin' },
  { email: 'admin@hopebeirut.org', password: 'password123', label: 'Hope Church Beirut (Lebanon)', role: 'super_admin' },
  { email: 'admin@resurrectionamman.org', password: 'password123', label: 'Resurrection Church Amman (Jordan)', role: 'super_admin' },
  { email: 'admin@stmarkbaghdad.org', password: 'password123', label: 'St. Mark Church Baghdad (Iraq)', role: 'super_admin' },
] : []


export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [devLoading, setDevLoading] = useState<string | null>(null)
  const t = useTranslations('auth')

  const loginSchema = z.object({
    email: z.string().email(t('validationEmail')),
    password: z.string().min(6, t('validationPassword')),
  })

  type LoginForm = z.infer<typeof loginSchema>

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginForm) {
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setIsLoading(false)
      toast.error(t('errorTitle'), {
        description: error.message,
      })
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, church_id, role')
        .eq('id', data.user.id)
        .single()

      // Identify user + track login event
      if (profile?.church_id) {
        const locale = document.cookie.match(/lang=(\w+)/)?.[1] ?? 'ar'
        analytics.identify({
          user_id: data.user.id,
          church_id: profile.church_id,
          role: profile.role ?? 'member',
          locale,
        })
        analytics.auth.loggedIn({
          church_id: profile.church_id,
          role: profile.role ?? 'member',
          locale,
          method: 'email',
        })
      }

      if (profile && !profile.onboarding_completed) {
        router.push('/onboarding')
      } else {
        // Check if user belongs to multiple churches
        const { data: memberships } = await supabase
          .from('user_churches')
          .select('church_id')
          .eq('user_id', data.user.id)

        if (memberships && memberships.length > 1) {
          router.push('/select-church')
        } else {
          router.push('/')
        }
      }
      router.refresh()
    }
  }

  async function devLogin(email: string) {
    setDevLoading(email)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: 'password123',
      })

      if (error) throw error

      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('devLoginFailed')
      toast.error(t('devLoginFailed'), { description: message })
    } finally {
      setDevLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {t('signInTitle')}
        </CardTitle>
        <CardDescription>
          {t('signInDescription')}
        </CardDescription>
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
                  <FormLabel>{t('passwordLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('passwordPlaceholder')}
                      autoComplete="current-password"
                      dir="ltr"
                      className="text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
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

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('newToEkklesia')}{' '}
          <Link href="/signup" className="font-medium underline underline-offset-4">
            {t('createAnAccountLink')}
          </Link>
        </p>

        {process.env.NODE_ENV === 'development' && (
          <>
            <div className="mt-6 border-t pt-4">
              <p className="text-sm font-medium mb-3">{t('testAccounts')}</p>
              <div className="grid gap-2">
                {TEST_ACCOUNTS.map((account) => (
                  <div key={account.email} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{account.label}</p>
                      <p className="text-muted-foreground font-mono truncate">{account.email}</p>
                      <p className="text-muted-foreground font-mono">pw: {account.password}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs h-7 px-2"
                      disabled={devLoading !== null}
                      onClick={() => devLogin(account.email)}
                    >
                      {devLoading === account.email ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        t('devLoginButton')
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t pt-4">
              <p className="text-sm font-medium mb-3">{t('crossChurchAccounts')}</p>
              <div className="grid gap-2">
                {CROSS_CHURCH_ACCOUNTS.map((account) => (
                  <div key={account.email} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{account.label}</p>
                      <p className="text-muted-foreground font-mono truncate">{account.email}</p>
                      <p className="text-muted-foreground font-mono">pw: {account.password}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs h-7 px-2"
                      disabled={devLoading !== null}
                      onClick={() => devLogin(account.email)}
                    >
                      {devLoading === account.email ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        t('devLoginButton')
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
