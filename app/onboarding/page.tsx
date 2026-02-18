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

export default function OnboardingPage() {
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
      toast.error(t('toastError'), {
        description: error.message,
      })
      return
    }

    toast.success(t('toastSuccess'), {
      description: t('toastSuccessDesc'),
    })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{t('welcome')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('welcomeSubtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('cardTitle')}</CardTitle>
            <CardDescription>
              {t('cardDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                            <Input placeholder={t('firstNameArPlaceholder')} {...field} />
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
                            <Input placeholder={t('lastNameArPlaceholder')} {...field} />
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
                            <Input placeholder={t('firstNameEnPlaceholder')} dir="ltr" {...field} />
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
                            <Input placeholder={t('lastNameEnPlaceholder')} dir="ltr" {...field} />
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
                        <Input
                          type="tel"
                          placeholder={t('phonePlaceholder')}
                          dir="ltr"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('phoneDescription')}
                      </FormDescription>
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
                        <Input placeholder={t('occupationPlaceholder')} {...field} />
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

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
