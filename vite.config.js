import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import fs from 'node:fs'
import path from 'node:path'

// Stamp the service worker with a per-build id so every deploy installs a fresh app-shell cache
// (the model cache is versioned separately inside sw.js and survives deploys).
function swBuildId() {
  let outDir = 'dist'
  return {
    name: 'agripulse-sw-build-id',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const file = path.join(outDir, 'sw.js')
      if (!fs.existsSync(file)) return
      const id = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 8) || Date.now().toString(36)
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/__BUILD_ID__/g, id))
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Self-host the LiteRT.js runtime + YOLO pre/post-processing wasm so the Vision Agent
    // works 100% offline (no CDN). Served from /litert/ and /yolo/ in dev and in the build.
    viteStaticCopy({
      targets: [
        { src: 'node_modules/@litertjs/core/wasm/*', dest: 'litert' },
        { src: 'node_modules/@litertjs/core/dist/index.js', dest: 'litert', rename: 'core.js' },
        { src: 'node_modules/@litertjs/wasm-utils/dist/index.js', dest: 'litert', rename: 'wasm-utils.js' },
        { src: 'node_modules/@ultralytics/yolo/pkg/ultralytics_inference_web_bg.wasm', dest: 'yolo' },
      ],
    }),
    swBuildId(),
  ],
  optimizeDeps: {
    // Keep the wasm-backed package out of the dev pre-bundler (it 404s the .wasm otherwise).
    exclude: ['@ultralytics/yolo'],
  },
  build: {
    target: 'esnext', // top-level await / WebGPU APIs used by the on-device model
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    strictPort: true,
  }
})
