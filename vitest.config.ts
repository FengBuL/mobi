import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, `./apps/web/src`),
      '@codemirror/commands': path.resolve(__dirname, `./packages/shared/node_modules/@codemirror/commands`),
      '@codemirror/state': path.resolve(__dirname, `./node_modules/@codemirror/state`),
      '@codemirror/view': path.resolve(__dirname, `./node_modules/@codemirror/view`),
      '@mobi/shared': path.resolve(__dirname, `./packages/shared/src`),
      '@mobi/core': path.resolve(__dirname, `./packages/core/src`),
    },
    dedupe: [`@codemirror/state`, `@codemirror/view`],
  },
  test: {
    // 板块的 parse 走 DOMParser，需要一个 DOM
    environment: `jsdom`,
    include: [`tests/**/*.test.ts`],
    globals: true,
  },
})
