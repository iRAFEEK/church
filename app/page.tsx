import { redirect } from 'next/navigation'
import { getCurrentUserSafe } from '@/lib/auth'
import { ProductLandingPage } from '@/components/marketing/ProductLandingPage'

export default async function RootPage() {
  const user = await getCurrentUserSafe()

  if (user) {
    redirect('/dashboard')
  }

  return <ProductLandingPage />
}
