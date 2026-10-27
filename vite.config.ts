import { networkAssets } from './scripts/network-assets'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
  build: { emptyOutDir: true },
  server: { port: 5173, strictPort: true, allowedHosts: ['terminal.local'] },
  preview: { allowedHosts: ['terminal.local'] },
  plugins: [react(), networkAssets(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icons/*.png', 'data/*.json'],
    manifest: {
      id: '/', name: 'Lyon 100', short_name: 'Lyon 100', description: 'Votre exploration de Lyon, rue après rue.',
      lang: 'fr', theme_color: '#1b4c3d', background_color: '#f5f6f2', display: 'standalone', start_url: '/', scope: '/',
      icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,png,json,woff2}'], maximumFileSizeToCacheInBytes: 64 * 1024 * 1024, navigateFallback: '/index.html', cleanupOutdatedCaches: true, runtimeCaching: [] },
  })],
})
