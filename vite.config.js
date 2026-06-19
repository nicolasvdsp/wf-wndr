import { defineConfig } from 'vite'
import terser from '@rollup/plugin-terser'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTP by default (no certificate prompts). Opt in to HTTPS with
// `VITE_DEV_HTTPS=1` → `npm run dev:https` to match the `https-mode` attribute
// on the staging dev-mode <script> tag (needed for Safari on https://*.webflow.io).
const useHttps = process.env.VITE_DEV_HTTPS === '1'

export default defineConfig({
  plugins: useHttps ? [basicSsl()] : [],
  server: {
    host: 'localhost',
    port: 3012,
    cors: true,
    https: useHttps,
    hmr: {
      host: 'localhost',
      protocol: useHttps ? 'wss' : 'ws',
    },
  },
  build: {
    minify: false, // We'll handle minification per output
    manifest: true,
    rollupOptions: {
      input: './src/main.js',
      output: [
        // Unminified version (for debugging)
        {
          format: 'umd',
          entryFileNames: 'main.js',
          esModule: false,
          compact: false,
          globals: {
            jquery: '$',
            gsap: 'gsap',
            three: 'THREE',
          },
        },
        // Minified version (for production)
        {
          format: 'umd',
          entryFileNames: 'main.min.js',
          esModule: false,
          compact: true,
          plugins: [
            terser({
              compress: {
                drop_console: false, // Set to true to remove console.logs
              },
            }),
          ],
          globals: {
            jquery: '$',
            gsap: 'gsap',
            three: 'THREE',
          },
        },
      ],
      // Externalize dependencies that should be loaded from CDN
      external: ['jquery', 'gsap', 'three'],
    },
  },
})
