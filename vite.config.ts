import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { Buffer } from 'buffer'

const logger = createLogger()
const warn = logger.warn.bind(logger)
logger.warn = (msg, options) => {
  if (typeof msg === 'string' && (msg.includes('chunk size') || msg.includes('chunkSizeWarningLimit'))) {
    return
  }
  warn(msg, options)
}

export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      buffer: 'buffer',
    },
  },
  define: {
    global: 'globalThis',
    'globalThis.Buffer': 'Buffer',
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  build: {
    chunkSizeWarningLimit: 100000,
  },
})
