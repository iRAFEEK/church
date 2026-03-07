import { redirect } from 'next/navigation'

export default async function StaffingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/admin/events/${id}`)
}
