// Landing page SatuSekolah: src/platform/landing/index.html → src/platform/landing-html.ts
// Jalankan setelah mengubah HTML-nya: npm run landing:build -w @sekolahku/web
import { readFileSync, writeFileSync } from 'node:fs'

const src = new URL('../src/platform/landing/index.html', import.meta.url)
const out = new URL('../src/platform/landing-html.ts', import.meta.url)
const html = readFileSync(src, 'utf8')
writeFileSync(
  out,
  `/* eslint-disable */\n// Landing page SatuSekolah, dibuat dari src/platform/landing/index.html. Ubah HTML-nya lalu jalankan: npm run landing:build -w @sekolahku/web\nexport const LANDING_HTML = ${JSON.stringify(html)}\n`,
)
console.log(`landing-html.ts diperbarui (${html.length} karakter)`)
