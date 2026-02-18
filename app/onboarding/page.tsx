'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

const onboardingSchema = z.object({
  first_name_ar: z.string().min(1, 'الاسم الأول مطلوب'),
  last_name_ar: z.string().min(1, 'اسم العائلة مطلوب'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().min(8, 'رقم الهاتف غير صحيح').optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  occupation_ar: z.string().optional(),
  notification_pref: z.enum(['whatsapp', 'sms', 'email', 'all', 'none']).default('whatsapp'),
})

type OnboardingForm = z.infer<typeof onboardingSchema>

export default function OnboardingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

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
      toast.error('حدث خطأ / An error occurred', {
        description: error.message,
      })
      return
    }

    toast.success('أهلاً بك! / Welcome!', {
      description: 'تم إنشاء ملفك الشخصي بنجاح',
    })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">مرحباً بك</h1>
          <p className="text-sm text-zinc-500 mt-1">Welcome to the family</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>أكمل ملفك الشخصي</CardTitle>
            <CardDescription>
              نحتاج بعض المعلومات لإعداد حسابك. كل المعلومات سرية.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Arabic Name (required) */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    الاسم بالعربية *
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الاسم الأول</FormLabel>
                          <FormControl>
                            <Input placeholder="يوحنا" {...field} />
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
                          <FormLabel>اسم العائلة</FormLabel>
                          <FormControl>
                            <Input placeholder="الحنا" {...field} />
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
                    الاسم بالإنجليزية (اختياري)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" dir="ltr" {...field} />
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
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Hanna" dir="ltr" {...field} />
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
                      <FormLabel>رقم الهاتف / Phone</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+961 XX XXX XXX"
                          dir="ltr"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        سيُستخدم لإرسال الإشعارات عبر واتساب
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
                      <FormLabel>الجنس / Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">ذكر / Male</SelectItem>
                          <SelectItem value="female">أنثى / Female</SelectItem>
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
                      <FormLabel>تاريخ الميلاد / Date of Birth</FormLabel>
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
                      <FormLabel>المهنة / Occupation</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: مهندس، طالب، معلم..." {...field} />
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
                      <FormLabel>تفضيل الإشعارات / Notification Preference</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="whatsapp">واتساب / WhatsApp</SelectItem>
                          <SelectItem value="sms">رسائل نصية / SMS</SelectItem>
                          <SelectItem value="email">بريد إلكتروني / Email</SelectItem>
                          <SelectItem value="all">الكل / All</SelectItem>
                          <SelectItem value="none">لا شيء / None</SelectItem>
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
                      جاري الحفظ...
                    </>
                  ) : (
                    'ابدأ / Get Started →'
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
