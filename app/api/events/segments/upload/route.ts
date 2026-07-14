import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { apiHandler } from '@/lib/api/handler'
import { config } from '@/lib/config'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB (matches the bucket limit)
const BUCKET = 'service-attachments'

// SECURITY: never trust the client MIME or file-name extension — both spoofable. Sniff the
// real type from the file's magic bytes and derive the content-type + extension from THAT,
// so a public-bucket object can never be served as attacker-controlled bytes under an
// arbitrary extension. Only run-of-show display formats are accepted.
type Sniffed = { mime: string; ext: string; kind: 'pdf' | 'pptx' | 'ppt' | 'image' }
function sniff(buf: Buffer): Sniffed | null {
  if (buf.length < 12) return null
  // PDF: "%PDF"
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)
    return { mime: 'application/pdf', ext: 'pdf', kind: 'pdf' }
  // OOXML (.pptx/.docx/.xlsx) are ZIP archives: "PK\x03\x04". We accept it as pptx —
  // the segment is display-only and the bucket mime-restricts on write.
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07))
    return { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: 'pptx', kind: 'pptx' }
  // Legacy OLE2 compound (.ppt): D0 CF 11 E0 A1 B1 1A E1
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0)
    return { mime: 'application/vnd.ms-powerpoint', ext: 'ppt', kind: 'ppt' }
  // Images
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg', kind: 'image' }
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { mime: 'image/png', ext: 'png', kind: 'image' }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return { mime: 'image/gif', ext: 'gif', kind: 'image' }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp', kind: 'image' }
  return null
}

// Keep a safe, human-readable original name for display (no path chars).
function safeName(name: string): string {
  return name.replace(/[^\p{L}\p{N}. _-]/gu, '').slice(0, 200) || 'file'
}

// POST /api/events/segments/upload — upload a service attachment (PDF / PowerPoint / image).
// Admins only. Returns { url, name, type } for storing on a file-kind segment.
export const POST = apiHandler(async ({ req, profile }) => {
  const serviceRoleKey = config.supabase.serviceRoleKey
  if (!serviceRoleKey) return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const sniffed = sniff(buffer)
  if (!sniffed) return NextResponse.json({ error: 'Unsupported file — use PDF, PowerPoint, or an image' }, { status: 400 })

  const admin = createSupabaseClient(config.supabase.url, serviceRoleKey)
  // Church-scoped, unguessable path.
  const path = `${profile.church_id}/${randomUUID()}.${sniffed.ext}`

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: sniffed.mime,
    upsert: false,
  })
  if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({
    url: data.publicUrl,
    name: safeName(file.name),
    type: sniffed.kind,
  })
}, { requirePermissions: ['can_manage_events'] })
