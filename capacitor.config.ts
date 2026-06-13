import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.belknaptracker.app',
  appName: 'Belknap Tracker',
  webDir: 'dist',
  // Brand navy behind the WebView so launch shows no white flash.
  backgroundColor: '#16314D',
  android: {
    backgroundColor: '#16314D',
    // Required for @capgo/background-geolocation plugin
    // Prevents location updates from stopping after 5 minutes in background
    useLegacyBridge: true,
  },
  plugins: {
    // Background geolocation plugin configuration
    BackgroundGeolocation: {
      // Default notification settings (can be overridden at runtime)
    },
  },
};

export default config;
