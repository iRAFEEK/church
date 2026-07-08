'use client'

import { useState } from 'react'
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

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const schema = z.object({ email: z.string().email(t('validationEmail')) })
  type FormValues = z.infer<typeof schema>

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const supabase = createClient()
    // Redirect target after the user clicks the emailed recovery link.
    const redirectTo = `${window.location.origin}/reset-password`
    await supabase.auth.resetPasswordForEmail(values.email, { redirectTo })
    setIsLoading(false)
    // Always show success regardless of whether the email exists (prevents account enumeration).
    setSent(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t('forgotPasswordTitle')}</CardTitle>
        <CardDescription>{t('forgotPasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              {t('resetLinkSent')}
            </p>
            <Link
              href="/login"
              className="block text-center text-sm font-medium underline underline-offset-4"
            >
              {t('backToLogin')}
            </Link>
          </div>
        ) : (
          <>
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('sendingResetLink')}
                    </>
                  ) : (
                    t('sendResetLink')
                  )}
                </Button>
              </form>
            </Form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium underline underline-offset-4">
                {t('backToLogin')}
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
