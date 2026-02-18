import { getTranslations } from 'next-intl/server'

export default async function JoinSuccessPage() {
  const t = await getTranslations('joinSuccess')

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 mb-3">{t('title')}</h1>
        <p className="text-zinc-500 leading-relaxed mb-6">
          {t('description')}
        </p>

        <div className="bg-zinc-50 rounded-xl p-4 text-right space-y-2 mb-6">
          <p className="text-sm font-medium text-zinc-700">{t('whatToExpect')}</p>
          <p className="text-sm text-zinc-500">{'\u2713'} {t('bulletWelcomeCall')}</p>
          <p className="text-sm text-zinc-500">{'\u2713'} {t('bulletSmallGroup')}</p>
          <p className="text-sm text-zinc-500">{'\u2713'} {t('bulletChurch')}</p>
        </div>

        <p className="text-xs text-zinc-400">
          {t('questions')}
        </p>
      </div>
    </div>
  )
}
