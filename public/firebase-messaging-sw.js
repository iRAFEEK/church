// Firebase Messaging Service Worker
// Handles background push notifications when the app is closed or in the background.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAY9GYAnPWGns1CuSYJGaOBt98-MBDkuV4',
  authDomain: 'eklesia-a6257.firebaseapp.com',
  projectId: 'eklesia-a6257',
  storageBucket: 'eklesia-a6257.firebasestorage.app',
  messagingSenderId: '977816814393',
  appId: '1:977816814393:web:a6847b8ed72cfbef2b5ee8',
})

const messaging = firebase.messaging()

// Handle background messages (app is closed or in background tab)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Ekklesia'
  const body = payload.notification?.body || ''
  const url = payload.data?.url || '/notifications'

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url, ...payload.data },
    tag: payload.data?.type || 'ekklesia',
    requireInteraction: false,
  })
})

// Open the app (or focus it) when user taps a notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/notifications'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
