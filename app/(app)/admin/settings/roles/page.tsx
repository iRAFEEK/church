import { requireRole } from '@/lib/auth'
import RoleDefaultsClient from './RoleDefaultsClient'

// Role permission defaults are super_admin-only. The editor itself is a client
// component; this server wrapper enforces the guard so non-admins are bounced
// before the page renders (the underlying APIs are super_admin-locked too).
export default async function Page() {
  await requireRole('super_admin')
  return <RoleDefaultsClient />
}
