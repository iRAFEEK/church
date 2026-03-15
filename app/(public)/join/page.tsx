import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VisitorForm } from '@/components/visitors/VisitorForm'
import type { VisitorFormField } from '@/lib/schemas/visitor-form-config'

const DEFAULT_FIELDS: VisitorFormField[] = [
  { key: 'first_name', required: true, enabled: true },
  { key: 'last_name', required: true, enabled: true },
  { key: 'phone', enabled: true, required: false },
  { key: 'email', enabled: true, required: false },
  { key: 'age_range', enabled: true, required: false },
  { key: 'occupation', enabled: false, required: false },
  { key: 'how_heard', enabled: true, required: false },
]

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ church?: string }> }) {
  const params = await searchParams
  const churchId = params.church

  if (!churchId) {
    redirect('/login')
  }

  const supabase = await createAdminClient()
  const { data: church } = await supabase
    .from('churches')
    .select('id, name, name_ar, visitor_form_config')
    .eq('id', churchId)
    .single()

  if (!church) {
    redirect('/login')
  }

  const config = (church.visitor_form_config as { fields: VisitorFormField[] } | null) ?? { fields: DEFAULT_FIELDS }

  return (
    <VisitorForm
      churchId={church.id}
      churchName={church.name}
      churchNameAr={church.name_ar}
      fields={config.fields}
    />
  )
}
