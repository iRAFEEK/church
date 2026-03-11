import type { App } from 'firebase-admin/app'

let adminApp: App | null = null

export function getAdminMessaging() {
  if (!adminApp) {
    const { initializeApp, getApps, cert } = require('firebase-admin/app')
    const { getMessaging } = require('firebase-admin/messaging')

    const existing = getApps().find((a: App) => a.name === 'ekklesia-admin')
    if (existing) {
      adminApp = existing
    } else {
      adminApp = initializeApp(
        {
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID!,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
            privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
          }),
        },
        'ekklesia-admin'
      )
    }

    return getMessaging(adminApp)
  }

  const { getMessaging } = require('firebase-admin/messaging')
  return getMessaging(adminApp)
}

export function isFirebaseAdminConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  )
}
