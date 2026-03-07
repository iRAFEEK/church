'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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

const TEST_ACCOUNTS = [
  { email: 'pastor@gracechurch.test', label: 'Super Admin (Pastor)', role: 'super_admin' },
  { email: 'admin@gracechurch.test', label: 'Super Admin (Associate)', role: 'super_admin' },
  { email: 'worship@gracechurch.test', label: 'Ministry Leader (Worship)', role: 'ministry_leader' },
  { email: 'leader1@gracechurch.test', label: 'Group Leader', role: 'group_leader' },
  { email: 'member@gracechurch.test', label: 'Member', role: 'member' },
]

const isDev = process.env.NODE_ENV === 'development'

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
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single()

      if (profile && !profile.onboarding_completed) {
        router.push('/onboarding')
      } else {
        router.push('/')
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
      const message = err instanceof Error ? err.message : 'Dev login failed'
      toast.error('Dev login failed', { description: message })
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

        {isDev && (
          <div className="mt-6 border-t pt-4">
            <p className="text-sm text-muted-foreground mb-3 font-medium">
              Dev Quick Login
            </p>
            <div className="grid gap-2">
              {TEST_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  variant="outline"
                  size="sm"
                  className="w-full justify-between text-xs"
                  disabled={devLoading !== null}
                  onClick={() => devLogin(account.email)}
                >
                  <span>{account.label}</span>
                  {devLoading === account.email ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span className="text-muted-foreground">{account.role}</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
