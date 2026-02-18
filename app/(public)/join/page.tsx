'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function JoinPage() {
  const t = useTranslations('join')
  const searchParams = useSearchParams()
  const router = useRouter()
  const churchId = searchParams.get('church')
  const [submitting, setSubmitting] = useState(false)

  const schema = z.object({
    first_name: z.string().min(1, t('validationFirstName')),
    last_name: z.string().min(1, t('validationLastName')),
    phone: z.string().optional(),
    email: z.string().email(t('validationEmail')).optional().or(z.literal('')),
    age_range: z.string().optional(),
    occupation: z.string().optional(),
    how_heard: z.string().optional(),
  })

  type FormValues = z.infer<typeof schema>

  const AGE_RANGES = [
    { value: 'under_18', label: t('ageRangeUnder18') },
    { value: '18_25', label: t('ageRange1825') },
    { value: '26_35', label: t('ageRange2635') },
    { value: '36_45', label: t('ageRange3645') },
    { value: '46_55', label: t('ageRange4655') },
    { value: '56_plus', label: t('ageRange56Plus') },
  ]

  const HOW_HEARD = [
    { value: 'friend', label: t('howHeardFriend') },
    { value: 'social_media', label: t('howHeardSocialMedia') },
    { value: 'website', label: t('howHeardWebsite') },
    { value: 'event', label: t('howHeardEvent') },
    { value: 'walk_in', label: t('howHeardWalkIn') },
    { value: 'other', label: t('howHeardOther') },
  ]

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      age_range: '',
      occupation: '',
      how_heard: '',
    },
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, church_id: churchId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || t('errorGeneric'))
      }
      router.push('/join/success')
    } catch (e: unknown) {
      form.setError('root', { message: e instanceof Error ? e.message : t('errorUnexpected') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">✝</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">{t('pageTitle')}</h1>
          <p className="text-zinc-500 text-sm leading-relaxed">
            {t('pageSubtitle')}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('firstNameLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('firstNamePH')} {...field} />
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
                      <FormLabel>{t('lastNameLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('lastNamePH')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phoneLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('phonePH')} type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('emailLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('emailPH')} type="email" dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age_range"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ageRangeLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('ageRangePH')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AGE_RANGES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('occupationLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('occupationPH')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="how_heard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('howHeardLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('howHeardPH')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HOW_HEARD.map(h => (
                          <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <p className="text-sm text-red-500 text-center">
                  {form.formState.errors.root.message}
                </p>
              )}

              <Button type="submit" className="w-full mt-2" disabled={submitting}>
                {submitting ? t('submitting') : t('submitButton')}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
