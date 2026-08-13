import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, `./apps/web/src`),
      '@md/shared': path.resolve(__dirname, `./packages/shared/src`),
      '@md/core': path.resolve(__dirname, `./packages/core/src`),
    },
  },
  test: {
    // 板块的 parse 走 DOMParser，需要一个 DOM
    environment: `jsdom`,
    include: [`tests/**/*.test.ts`],
    globals: true,
  },
})
