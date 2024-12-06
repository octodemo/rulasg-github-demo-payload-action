import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Exclude integration tests for now
    include: ['./src/**.test.ts'],
    exclude: ['node_modules', './test/integration/**.ts'],
    typecheck: {
      tsconfig: './test/tsconfig.test.json',
    },
  },
})
