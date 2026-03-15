// PERF: firebase/app (~15-20KB) is dynamically imported so it doesn't
// load on every authenticated page. Only loaded when push notifications
// are actually used.

import type { FirebaseApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null

async function getFirebaseApp(): Promise<FirebaseApp> {
  if (app) return app
  const { initializeApp, getApps } = await import('firebase/app')
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
  return app
}

export async function getFirebaseMessaging() {
  if (typeof window === 'undefined') return null

  const firebaseApp = await getFirebaseApp()
  const { getMessaging } = await import('firebase/messaging')
  return getMessaging(firebaseApp)
}

export function isFirebaseClientConfigured(): boolean {
  // Just check env vars — no firebase import needed
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  )
}
