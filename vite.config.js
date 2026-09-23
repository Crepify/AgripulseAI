import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

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
