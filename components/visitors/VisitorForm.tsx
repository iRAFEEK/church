'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { VisitorFormField } from '@/lib/schemas/visitor-form-config'

interface Props {
  churchId: string
  churchName: string
  churchNameAr: string | null
  fields: VisitorFormField[]
}

export function VisitorForm({ churchId, churchName, churchNameAr, fields }: Props) {
  const t = useTranslations('join')
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const enabledFields = useMemo(() => fields.filter(f => f.enabled), [fields])

  const schema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {}
    for (const field of enabledFields) {
      switch (field.key) {
        case 'first_name':
          shape.first_name = z.string().min(1, t('validationFirstName'))
          break
        case 'last_name':
          shape.last_name = z.string().min(1, t('validationLastName'))
          break
        case 'phone':
          shape.phone = field.required
            ? z.string().min(1, t('validationRequired'))
            : z.string().optional()
          break
        case 'email':
          shape.email = field.required
            ? z.string().email(t('validationEmail'))
            : z.string().email(t('validationEmail')).optional().or(z.literal(''))
          break
        case 'age_range':
          shape.age_range = field.required
            ? z.string().min(1, t('validationRequired'))
            : z.string().optional()
          break
        case 'occupation':
          shape.occupation = field.required
            ? z.string().min(1, t('validationRequired'))
            : z.string().optional()
          break
        case 'how_heard':
          shape.how_heard = field.required
            ? z.string().min(1, t('validationRequired'))
            : z.string().optional()
          break
      }
    }
    return z.object(shape)
  }, [enabledFields, t])

  type FormValues = z.infer<typeof schema>

  const defaults = useMemo(() => {
    const d: Record<string, string> = {}
    for (const f of enabledFields) d[f.key] = ''
    return d
  }, [enabledFields])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults as FormValues,
  })

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

  const hasField = (key: string) => enabledFields.some(f => f.key === key)
  const isRequired = (key: string) => enabledFields.find(f => f.key === key)?.required

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">✝</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-1">{churchNameAr || churchName}</h1>
          {churchNameAr && churchName && (
            <p className="text-sm text-zinc-500">{churchName}</p>
          )}
          <p className="text-zinc-500 text-sm leading-relaxed mt-2">{t('pageSubtitle')}</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Name fields — always side by side */}
              {(hasField('first_name') || hasField('last_name')) && (
                <div className="grid grid-cols-2 gap-3">
                  {hasField('first_name') && (
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('firstNameLabel')} *</FormLabel>
                          <FormControl>
                            <Input placeholder={t('firstNamePH')} dir="auto" className="text-base" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {hasField('last_name') && (
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('lastNameLabel')} *</FormLabel>
                          <FormControl>
                            <Input placeholder={t('lastNamePH')} dir="auto" className="text-base" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              {hasField('phone') && (
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('phoneLabel')}{isRequired('phone') ? ' *' : ''}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('phonePH')} type="tel" dir="ltr" className="text-base" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {hasField('email') && (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('emailLabel')}{isRequired('email') ? ' *' : ''}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('emailPH')} type="email" dir="ltr" className="text-base" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {hasField('age_range') && (
                <FormField
                  control={form.control}
                  name="age_range"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('ageRangeLabel')}{isRequired('age_range') ? ' *' : ''}</FormLabel>
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
              )}

              {hasField('occupation') && (
                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('occupationLabel')}{isRequired('occupation') ? ' *' : ''}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('occupationPH')} dir="auto" className="text-base" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {hasField('how_heard') && (
                <FormField
                  control={form.control}
                  name="how_heard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('howHeardLabel')}{isRequired('how_heard') ? ' *' : ''}</FormLabel>
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
              )}

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
