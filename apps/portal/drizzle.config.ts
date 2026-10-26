import { defineConfig } from 'drizzle-kit'

// Generates SQL migrations for every school's App database (schema is identical per school).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
})
