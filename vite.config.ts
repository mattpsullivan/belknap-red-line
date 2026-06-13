/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import path from 'path'

// Build stamp so the running build is identifiable in-app (header).
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
})()
const buildTime = new Date().toISOString().slice(0, 16).replace('T', ' ')

// Show the in-app build stamp on debug/test builds only. The release pipeline
// sets RELEASE_BUILD=1 (see .github/workflows/release.yml) to hide it.
const showBuildStamp = process.env.RELEASE_BUILD !== '1'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_COMMIT__: JSON.stringify(commit),
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
    __SHOW_BUILD_STAMP__: JSON.stringify(showBuildStamp),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split vendor chunks by package path
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) {
              return 'react-vendor'
            }
            if (id.includes('maplibre-gl')) {
              return 'map-vendor'
            }
            if (id.includes('@turf')) {
              return 'geo-vendor'
            }
            if (id.includes('dexie')) {
              return 'db-vendor'
            }
          }
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Belknap Red-Line Tracker',
        short_name: 'Belknap Tracker',
        description: 'Track your progress on Belknap Range trails',
        theme_color: '#16314D',
        background_color: '#16314D',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        // Purge precaches from prior builds so updates don't serve stale chunk
        // hashes; take control immediately (paired with autoUpdate above).
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
