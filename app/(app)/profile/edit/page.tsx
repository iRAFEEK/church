'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'
import { PhotoUpload } from '@/components/profile/PhotoUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Profile } from '@/types'

const editSchema = z.object({
  first_name_ar: z.string().min(1, 'الاسم الأول مطلوب'),
  last_name_ar: z.string().min(1, 'اسم العائلة مطلوب'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  occupation_ar: z.string().optional(),
  occupation: z.string().optional(),
  notification_pref: z.enum(['whatsapp', 'sms', 'email', 'all', 'none']),
  preferred_language: z.enum(['ar', 'en']),
})

type EditForm = z.infer<typeof editSchema>

export default function ProfileEditPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      first_name_ar: '',
      last_name_ar: '',
      first_name: '',
      last_name: '',
      phone: '',
      date_of_birth: '',
      occupation_ar: '',
      occupation: '',
      notification_pref: 'whatsapp',
      preferred_language: 'ar',
    },
  })

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (p) {
        const profileData = p as Profile
        setProfile(profileData)
        setPhotoUrl(profileData.photo_url ?? '')
        form.reset({
          first_name_ar: profileData.first_name_ar ?? '',
          last_name_ar: profileData.last_name_ar ?? '',
          first_name: profileData.first_name ?? '',
          last_name: profileData.last_name ?? '',
          phone: profileData.phone ?? '',
          date_of_birth: profileData.date_of_birth ?? '',
          gender: profileData.gender ?? undefined,
          occupation_ar: profileData.occupation_ar ?? '',
          occupation: profileData.occupation ?? '',
          notification_pref: profileData.notification_pref ?? 'whatsapp',
          preferred_language: (profileData.preferred_language as 'ar' | 'en') ?? 'ar',
        })
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  async function onSubmit(values: EditForm) {
    if (!profile) return
    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name_ar: values.first_name_ar,
        last_name_ar: values.last_name_ar,
        first_name: values.first_name ?? null,
        last_name: values.last_name ?? null,
        phone: values.phone ?? null,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender ?? null,
        occupation_ar: values.occupation_ar ?? null,
        occupation: values.occupation ?? null,
        photo_url: photoUrl || null,
        notification_pref: values.notification_pref,
        preferred_language: values.preferred_language,
      })
      .eq('id', profile.id)

    if (error) {
      setIsLoading(false)
      toast.error('فشل الحفظ', { description: error.message })
      return
    }

    toast.success('تم حفظ التغييرات')
    setIsLoading(false)
    router.push('/profile')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/profile">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">تعديل الملف الشخصي</h1>
      </div>

      {/* Photo */}
      <Card>
        <CardHeader><CardTitle className="text-base">الصورة الشخصية</CardTitle></CardHeader>
        <CardContent className="flex justify-center">
          {profile && (
            <PhotoUpload
              currentPhotoUrl={photoUrl}
              userId={profile.id}
              churchId={profile.church_id}
              onUpload={(url) => setPhotoUrl(url)}
            />
          )}
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Arabic Name */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  الاسم بالعربية *
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="first_name_ar" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الأول</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="last_name_ar" render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم العائلة</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* English Name */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  الاسم بالإنجليزية
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="first_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl><Input dir="ltr" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="last_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl><Input dir="ltr" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Contact */}
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف / Phone</FormLabel>
                  <FormControl><Input type="tel" dir="ltr" placeholder="+961 XX XXX XXX" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Personal */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الجنس</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الميلاد</FormLabel>
                    <FormControl><Input type="date" dir="ltr" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="occupation_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>المهنة (بالعربية)</FormLabel>
                  <FormControl><Input placeholder="مهندس، طالب، معلم..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Separator />

              {/* Preferences */}
              <FormField control={form.control} name="notification_pref" render={({ field }) => (
                <FormItem>
                  <FormLabel>تفضيل الإشعارات</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="whatsapp">واتساب</SelectItem>
                      <SelectItem value="sms">رسائل نصية</SelectItem>
                      <SelectItem value="email">بريد إلكتروني</SelectItem>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="none">لا شيء</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/profile">إلغاء</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ التغييرات'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
