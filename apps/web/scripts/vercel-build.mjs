/**
 * Vercel build for Satu Sekolah Web: database migrations, then `next build`.
 *
 * Guard: a Preview build runs migrations only when the project states that its Preview database is a COPY
 * (PREVIEW_DATABASE_IS_COPY=true, set on the Preview environment only, pointing DATABASE_URI at a Neon branch or a
 * separate test database). Without that statement the build stops before touching any database, so a Preview that
 * accidentally inherits the production DATABASE_URL can never change production.
 */
import { spawnSync } from 'node:child_process'

const env = process.env.VERCEL_ENV ?? 'development'
const run = (cmd) => {
  const r = spawnSync(cmd, { stdio: 'inherit', shell: true, env: { ...process.env, NODE_OPTIONS: '--no-deprecation --max-old-space-size=8000' } })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

if (env === 'preview' && process.env.PREVIEW_DATABASE_IS_COPY !== 'true') {
  console.error(
    '\n✗ Build Preview dihentikan sebelum menyentuh database.\n' +
      '  Preview hanya boleh memakai database UJI (branch Neon / database terpisah), bukan database produksi.\n' +
      '  Atur DATABASE_URI untuk lingkungan Preview ke database uji, lalu tambahkan PREVIEW_DATABASE_IS_COPY=true (Preview saja).\n',
  )
  process.exit(1)
}

console.log(`▶ Migrasi database (${env})`)
run('npx payload migrate')
if (env === 'preview' || (env === 'production' && process.env.PLATFORM_BOOTSTRAP === 'true')) run('npx tsx scripts/preview-setup.ts')
run('npx next build')
