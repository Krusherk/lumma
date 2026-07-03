import { defineConfig } from 'vitest/config'

// Isolated test config so the Vite app build (tsc -b + vite build) is unaffected.
// Tests are pure Node unit tests over the payroll rule/USDC helpers.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
