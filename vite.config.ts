/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const JS_FILE = 'stockfish-18-lite-single.js'
const WASM_FILE = 'stockfish-18-lite-single.wasm'
const WASM_URL =
  'https://github.com/nmrugg/stockfish.js/releases/download/v18.0.0/stockfish-18-lite-single.wasm'

function copyStockfishPlugin(): Plugin {
  const copy = async () => {
    const srcDir = path.resolve('node_modules/stockfish/bin')
    const destDir = path.resolve('public/stockfish')
    fs.mkdirSync(destDir, { recursive: true })

    const jsSrc = path.join(srcDir, JS_FILE)
    const jsDest = path.join(destDir, JS_FILE)
    if (fs.existsSync(jsSrc)) {
      fs.copyFileSync(jsSrc, jsDest)
    }

    const wasmDest = path.join(destDir, WASM_FILE)
    const wasmSrc = path.join(srcDir, WASM_FILE)
    if (fs.existsSync(wasmSrc) && !fs.existsSync(wasmDest)) {
      fs.copyFileSync(wasmSrc, wasmDest)
    }
    if (!fs.existsSync(wasmDest)) {
      const response = await fetch(WASM_URL)
      if (!response.ok) {
        throw new Error(`Failed to download Stockfish WASM (${response.status})`)
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      fs.writeFileSync(wasmDest, buffer)
    }
  }

  return {
    name: 'copy-stockfish',
    async buildStart() {
      await copy()
    },
    async configureServer() {
      await copy()
    },
  }
}

export default defineConfig({
  plugins: [react(), copyStockfishPlugin()],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['stockfish'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
