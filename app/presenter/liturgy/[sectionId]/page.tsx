import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getCurrentUserWithRole } from '@/lib/auth'
import { LiturgyPresenter } from '@/components/liturgy/LiturgyPresenter'
import type { LiturgicalContent, LiturgicalSection } from '@/types'

export default async function LiturgyPresenterPage({
  params,
}: {
  params: Promise<{ sectionId: string }>
}) {
  const { sectionId } = await params
  await getCurrentUserWithRole()
  const supabase = await createClient()

  const [{ data: section }, { data: content }] = await Promise.all([
    supabase
      .from('liturgical_sections')
      .select('id, category_id, slug, title, title_ar, description, description_ar, sort_order, metadata')
      .eq('id', sectionId)
      .single(),
    supabase
      .from('liturgical_content')
      .select('id, section_id, content_type, title, title_ar, body_en, body_ar, body_coptic, audio_url, sort_order, metadata')
      .eq('section_id', sectionId)
      .order('sort_order', { ascending: true })
      .limit(500),
  ])

  if (!section) notFound()

  return (
    <LiturgyPresenter
      section={section as LiturgicalSection}
      content={(content || []) as LiturgicalContent[]}
    />
  )
}
