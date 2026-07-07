import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { apiHandler } from '@/lib/api/handler'
import { config } from '@/lib/config'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const BUCKET = 'profile-photos' // Known existing bucket
// Folders callers are allowed to write into (label only; the path is always
// church-scoped below). Anything else is rejected — no attacker-chosen folder label.
const ALLOWED_FOLDERS = new Set(['avatars', 'uploads', 'photos', 'attachments'])

// SECURITY (SEC-12): never trust the client-supplied MIME (`file.type`) or the file
// name's extension — both are spoofable. Sniff the real type from the file's magic
// bytes and derive the content-type + extension from THAT, so a public-bucket object
// can never be served as attacker-controlled bytes under an arbitrary extension.
function sniffImageType(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { mime: 'image/png', ext: 'png' }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return { mime: 'image/gif', ext: 'gif' }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' }
  return null
}

export const POST = apiHandler(async ({ req, profile }) => {
  const serviceRoleKey = config.supabase.serviceRoleKey
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const folderRaw = (formData.get('folder') as string) || 'uploads'
  // Whitelist the folder label; never let raw client input into the storage path.
  const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : 'uploads'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Verify the actual bytes are a real image — reject spoofed content-types outright.
  const sniffed = sniffImageType(buffer)
  if (!sniffed) {
    return NextResponse.json({ error: 'Invalid or unsupported image file' }, { status: 400 })
  }

  // Use service role client to bypass storage RLS
  const adminClient = createSupabaseClient(
    config.supabase.url,
    serviceRoleKey
  )

  const path = `${folder}/${profile.church_id}/${Date.now()}.${sniffed.ext}`

  const { error } = await adminClient.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: sniffed.mime,
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
