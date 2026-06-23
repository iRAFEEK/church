import { requireRole } from '@/lib/auth'
import UserPermissionClient from './UserPermissionClient'

// Per-user permission overrides are super_admin-only (matching the /admin/permissions
// index). The editor is a client component; this server wrapper enforces the guard
// so non-admins are bounced before it renders.
export default async function Page() {
  await requireRole('super_admin')
  return <UserPermissionClient />
}
