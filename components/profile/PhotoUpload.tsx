'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PhotoUploadProps {
  currentPhotoUrl?: string | null
  userId: string
  churchId: string
  onUpload: (url: string) => void
  className?: string
}

export function PhotoUpload({ currentPhotoUrl, userId, churchId, onUpload, className }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة صحيحة / Please select a valid image')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('الصورة كبيرة جداً (الحد الأقصى 5MB) / Image too large (max 5MB)')
      return
    }

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    // Upload to Supabase Storage
    setUploading(true)
    const supabase = createClient()

    const ext = file.name.split('.').pop()
    const path = `${churchId}/${userId}/avatar.${ext}`

    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(path, file, { upsert: true })

    if (error) {
      setUploading(false)
      setPreview(currentPhotoUrl ?? null)
      URL.revokeObjectURL(objectUrl)
      toast.error('فشل رفع الصورة / Upload failed', { description: error.message })
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(path)

    setUploading(false)
    onUpload(publicUrl)
    toast.success('تم رفع الصورة / Photo uploaded')
    URL.revokeObjectURL(objectUrl)
  }

  function handleRemove() {
    setPreview(null)
    onUpload('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Preview Area */}
      <div
        className={cn(
          'relative h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted',
          'flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors',
          'overflow-hidden'
        )}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        {preview ? (
          <Image
            src={preview}
            alt="Profile photo"
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <Camera className="h-8 w-8 text-muted-foreground/50" />
        )}

        {uploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {preview ? 'تغيير الصورة' : 'إضافة صورة'}
        </Button>
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}
