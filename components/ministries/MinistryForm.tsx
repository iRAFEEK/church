'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Stepper, type StepErrors } from '@/components/ui/stepper'
import { FieldError, RequiredMark } from '@/components/ui/field-error'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Type, Image as ImageIcon, Settings, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  { title: 'Name & Description', titleAr: 'الاسم والوصف' },
  { title: 'Photo', titleAr: 'الصورة' },
  { title: 'Settings', titleAr: 'الإعدادات' },
  { title: 'Review', titleAr: 'مراجعة' },
]

type Props = {
  ministry?: {
    id: string
    name: string
    name_ar?: string | null
    description?: string | null
    description_ar?: string | null
    photo_url?: string | null
    is_active: boolean
  }
}

export function MinistryForm({ ministry }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const t = useTranslations('ministryForm')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: ministry?.name_ar || ministry?.name || '',
    description: ministry?.description_ar || ministry?.description || '',
    photo_url: ministry?.photo_url || '',
    is_active: ministry?.is_active ?? true,
  })

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(ministry?.photo_url || null)

  const tV = useTranslations('validation')
  const [errors, setErrors] = useState<StepErrors>({})

  function set(key: string, val: string | boolean) {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) {
      setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
    }
  }

  const validateStep = useCallback((): StepErrors | null => {
    const errs: StepErrors = {}
    if (step === 0) {
      if (!form.name.trim()) errs.name = tV('nameRequired')
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error(tV('fixErrors'))
      return errs
    }
    setErrors({})
    return null
  }, [step, form.name, tV])

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('photoTooLarge'))
      return
    }

    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    set('photo_url', '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadPhoto(ministryId: string): Promise<string | null> {
    if (!photoFile) return form.photo_url || null

    const supabase = createClient()
    const ext = photoFile.name.split('.').pop()
    const path = `ministries/${ministryId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('church-assets')
      .upload(path, photoFile, { upsert: true })

    if (error) {
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('church-assets')
      .getPublicUrl(path)

    return publicUrl
  }

  async function handleSubmit() {
    if (!form.name) {
      toast.error(t('toastError'))
      return
    }

    setLoading(true)
    try {
      const body = {
        name: form.name,
        name_ar: form.name || null,
        description: form.description || null,
        description_ar: form.description || null,
        is_active: form.is_active,
        photo_url: form.photo_url || null,
      }

      const url = ministry ? `/api/ministries/${ministry.id}` : '/api/ministries'
      const method = ministry ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()

      // Upload photo if a new file was selected
      if (photoFile) {
        const photoUrl = await uploadPhoto(data.id)
        if (photoUrl) {
          await fetch(`/api/ministries/${data.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photo_url: photoUrl }),
          })
        }
      } else if (!photoPreview && ministry?.photo_url) {
        // Photo was removed
        await fetch(`/api/ministries/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_url: null }),
        })
      }

      toast.success(ministry ? t('toastUpdated') : t('toastCreated'))
      router.push(`/admin/ministries/${data.id}`)
      router.refresh()
    } catch {
      toast.error(t('toastError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stepper
      steps={STEPS}
      currentStep={step}
      onNext={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}
      onBack={() => { setErrors({}); step === 0 ? router.back() : setStep(s => s - 1) }}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={t('saveButton')}
      submitLabelAr={t('saveButton')}
      onValidateStep={validateStep}
    >
      {/* Step 1: Name & Description */}
      {step === 0 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Type className="h-5 w-5" />
              <span className="text-sm font-medium">{t('name')}<RequiredMark /></span>
            </div>
            <Input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              dir="auto"
              placeholder={t('namePlaceholder')}
              className={cn('text-base min-h-[48px]', errors.name && 'border-red-500 focus-visible:ring-red-500')}
            />
            <FieldError error={errors.name} />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('description')}</Label>
            <Textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              dir="auto"
              rows={3}
              className="text-base"
              placeholder={t('descriptionPlaceholder')}
            />
          </div>
        </div>
      )}

      {/* Step 2: Photo */}
      {step === 1 && (
        <div className="space-y-5 pt-4">
          <div className="flex items-center gap-3 text-zinc-500 mb-2">
            <ImageIcon className="h-5 w-5" />
            <span className="text-sm font-medium">{t('photo')}</span>
          </div>

          {photoPreview ? (
            <div className="relative">
              <Image
                src={photoPreview}
                alt="Ministry photo preview"
                width={400}
                height={192}
                className="w-full h-48 object-cover rounded-xl border border-zinc-200"
                unoptimized
              />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute top-2 end-2 h-8 w-8 p-0"
                onClick={removePhoto}
                aria-label={t('photoRemove')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
            >
              <Upload className="h-8 w-8 text-zinc-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-600">{t('photoUpload')}</p>
                <p className="text-xs text-zinc-400 mt-1">{t('photoDragHint')}</p>
              </div>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoSelect}
          />

          {photoPreview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {t('photoChange')}
            </Button>
          )}
        </div>
      )}

      {/* Step 3: Settings */}
      {step === 2 && (
        <div className="space-y-5 pt-4">
          <div className="flex items-center gap-3 text-zinc-500 mb-4">
            <Settings className="h-5 w-5" />
            <span className="text-sm font-medium">{t('settings')}</span>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
            <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} />
            <Label className="text-sm">{t('isActive')}</Label>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 3 && (
        <div className="space-y-3 pt-4">
          <ReviewItem icon={<Type className="h-4 w-4" />} label={t('name')} value={form.name} />
          {form.description && <ReviewItem icon={<Type className="h-4 w-4" />} label={t('description')} value={form.description} />}
          {photoPreview && (
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
              <p className="text-xs text-zinc-400 font-medium mb-2">{t('photo')}</p>
              <Image src={photoPreview} alt="" width={96} height={96} className="h-24 rounded-lg object-cover" unoptimized />
            </div>
          )}
          <ReviewItem
            icon={<Settings className="h-4 w-4" />}
            label={t('isActive')}
            value={form.is_active ? t('statusActive') : t('statusInactive')}
          />
        </div>
      )}
    </Stepper>
  )
}

function ReviewItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
      <div className="text-zinc-400 mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-400 font-medium">{label}</p>
        <p className="text-sm text-zinc-800 mt-0.5">{value}</p>
      </div>
    </div>
  )
}
