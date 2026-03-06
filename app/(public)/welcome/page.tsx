import { redirect } from 'next/navigation'
import { getCurrentUserSafe } from '@/lib/auth'
import { RegistrationWizard } from '@/components/registration/RegistrationWizard'

export default async function WelcomePage() {
  const user = await getCurrentUserSafe()

  if (user) {
    redirect('/dashboard')
  }

  return <RegistrationWizard />
}
