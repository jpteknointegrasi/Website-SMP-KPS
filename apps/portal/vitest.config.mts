import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src'), 'server-only': path.resolve(__dirname, 'test/empty.ts') } },
  test: { environment: 'node', include: ['test/**/*.spec.ts'], testTimeout: 60_000, fileParallelism: false, setupFiles: ['dotenv/config'] },
})
