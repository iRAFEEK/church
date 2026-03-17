'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreateLocationSchema, type CreateLocationInput } from '@/lib/schemas/location'

type LocationData = {
  id: string
  name: string
  name_ar: string | null
  location_type: string
  capacity: number | null
  features: string[]
  notes: string | null
  notes_ar: string | null
  is_active: boolean
}

type LocationFormProps = {
  location?: LocationData
}

const LOCATION_TYPES = [
  'sanctuary',
  'hall',
  'classroom',
  'prayer_room',
  'office',
  'nursery',
  'other',
] as const

const TYPE_KEYS: Record<string, string> = {
  sanctuary: 'typeSanctuary',
  hall: 'typeHall',
  classroom: 'typeClassroom',
  prayer_room: 'typePrayerRoom',
  office: 'typeOffice',
  nursery: 'typeNursery',
  other: 'typeOther',
}

const FEATURE_OPTIONS = [
  'projector',
  'whiteboard',
  'sound_system',
  'wifi',
  'ac',
  'kitchen',
] as const

const FEATURE_KEYS: Record<string, string> = {
  projector: 'featureProjector',
  whiteboard: 'featureWhiteboard',
  sound_system: 'featureSoundSystem',
  wifi: 'featureWifi',
  ac: 'featureAc',
  kitchen: 'featureKitchen',
}

export function LocationForm({ location }: LocationFormProps) {
  const t = useTranslations('locations')
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const isEdit = !!location

  const form = useForm<CreateLocationInput>({
    resolver: zodResolver(CreateLocationSchema),
    defaultValues: {
      name: location?.name ?? '',
      name_ar: location?.name_ar ?? '',
      location_type: (location?.location_type as CreateLocationInput['location_type']) ?? 'hall',
      capacity: location?.capacity ?? undefined,
      features: location?.features ?? [],
      notes: location?.notes ?? '',
      notes_ar: location?.notes_ar ?? '',
      is_active: location?.is_active ?? true,
    },
  })

  const onSubmit = async (values: CreateLocationInput) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const url = isEdit ? `/api/locations/${location.id}` : '/api/locations'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success(isEdit ? t('toastUpdated') : t('toastCreated'))
      router.push('/admin/locations')
      router.refresh()
    } catch {
      toast.error(t('toastError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (isDeleting || !location) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/locations/${location.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('toastDeleted'))
      router.push('/admin/locations')
      router.refresh()
    } catch {
      toast.error(t('toastError'))
    } finally {
      setIsDeleting(false)
    }
  }

  const currentFeatures = form.watch('features') ?? []

  const toggleFeature = (feature: string) => {
    const current = form.getValues('features') ?? []
    if (current.includes(feature)) {
      form.setValue('features', current.filter(f => f !== feature), { shouldDirty: true })
    } else {
      form.setValue('features', [...current, feature], { shouldDirty: true })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('name')}</FormLabel>
              <FormControl>
                <Input {...field} dir="auto" className="text-base h-11" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Name Arabic */}
        <FormField
          control={form.control}
          name="name_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('nameAr')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} dir="auto" className="text-base h-11" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type */}
        <FormField
          control={form.control}
          name="location_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('type')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LOCATION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {t(TYPE_KEYS[type])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Capacity */}
        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('capacity')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  dir="ltr"
                  className="h-11"
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Features */}
        <div className="space-y-2">
          <FormLabel>{t('features')}</FormLabel>
          <div className="flex flex-wrap gap-2">
            {FEATURE_OPTIONS.map(feature => {
              const isSelected = currentFeatures.includes(feature)
              return (
                <button
                  key={feature}
                  type="button"
                  onClick={() => toggleFeature(feature)}
                  className={cn(
                    'h-11 px-4 rounded-full text-sm font-medium transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  )}
                >
                  {t(FEATURE_KEYS[feature])}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('notes')}</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ''} dir="auto" className="text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes Arabic */}
        <FormField
          control={form.control}
          name="notes_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('notesAr')}</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ''} dir="auto" className="text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Active toggle */}
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">{t('active')}</FormLabel>
            </FormItem>
          )}
        />

        {/* Submit */}
        <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('save')
          )}
        </Button>

        {/* Delete */}
        {isEdit && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="h-11 w-full" disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t('deleting')}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 me-2" />
                    {t('delete')}
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('deleteBody')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('deleteCancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t('deleteConfirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </form>
    </Form>
  )
}
