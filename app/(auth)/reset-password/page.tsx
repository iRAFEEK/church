'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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
} from '@/components/ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function ResetPasswordPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  // 'checking' while the recovery link is being validated, 'ready' once a recovery
  // session is established, 'invalid' if the link is missing/expired.
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking')

  // The @supabase/ssr browser client auto-detects the recovery token in the URL
  // (detectSessionInUrl) and fires a PASSWORD_RECOVERY / SIGNED_IN event. We treat
  // an established session as permission to set a new password.
  useEffect(() => {
    const supabase = createClient()
    let settled = false

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        settled = true
        setStatus('ready')
      }
    })

    // Fallback: if a session already exists (link handled before listener attached),
    // allow the reset; otherwise mark the link invalid.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true
        setStatus('ready')
      } else {
        // Give the URL-detection a brief moment before declaring the link invalid.
        setTimeout(() => { if (!settled) setStatus('invalid') }, 1500)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const schema = z
    .object({
      password: z.string().min(6, t('validationPassword')),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: t('validationPasswordMatch'),
      path: ['confirmPassword'],
    })
  type FormValues = z.infer<typeof schema>

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: values.password })
    setIsLoading(false)

    if (error) {
      toast.error(t('errorTitle'), { description: error.message })
      return
    }

    toast.success(t('passwordUpdated'))
    router.push('/')
    router.refresh()
  }

  if (status === 'checking') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (status === 'invalid') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('resetLinkInvalid')}</CardTitle>
          <CardDescription>{t('resetLinkInvalidDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password">
            <Button className="w-full">{t('forgotPasswordTitle')}</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t('resetPasswordTitle')}</CardTitle>
        <CardDescription>{t('resetPasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('newPasswordLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('newPasswordPlaceholder')}
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
                  <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('newPasswordPlaceholder')}
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
                  {t('updatingPassword')}
                </>
              ) : (
                t('updatePasswordButton')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
