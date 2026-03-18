import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ekklesia.app',
  appName: 'Ekklesia',
  // Remote URL approach — loads deployed Vercel app in native WebView
  // Override with local IP for dev: CAPACITOR_SERVER_URL=http://192.168.x.x:3000
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://app.ekklesia.io',
    cleartext: false,
    allowNavigation: ['*.supabase.co', '*.ekklesia.io'],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#09090b',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#09090b',
    },
  },
  ios: {
    scheme: 'Ekklesia',
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#09090b',
  },
}

export default config
