import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { apiHandler } from '@/lib/api/handler'
import { config } from '@/lib/config'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const BUCKET = 'profile-photos' // Known existing bucket

export const POST = apiHandler(async ({ req, profile }) => {
  const serviceRoleKey = config.supabase.serviceRoleKey
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as string) || 'uploads'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }

  // Use service role client to bypass storage RLS
  const adminClient = createSupabaseClient(
    config.supabase.url,
    serviceRoleKey
  )

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${folder}/${profile.church_id}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await adminClient.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: urlData } = adminClient.storage
    .from(BUCKET)
    .getPublicUrl(path)

  return NextResponse.json({ url: urlData.publicUrl })
}, { requireRoles: ['ministry_leader', 'super_admin'] })
