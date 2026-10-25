# Website & CMS SMP Nasional KPS

Website publik sekolah + CMS untuk staf, dibangun dengan **Next.js 16 + TypeScript + Payload CMS 3 + PostgreSQL**.
Spesifikasi: `content/BRIEF_LENGKAP_WEBSITE_SMP_KPS_UNTUK_CLAUDE.md`. Status pekerjaan: `IMPLEMENTATION_STATUS.md`.

> **Cabang `platform-sekolah`: platform multi-sekolah (SaaS).** Satu deployment melayani banyak sekolah; SMP Nasional KPS
> adalah sekolah pertama. Arsitektur & isolasi data: `SAAS_ARCHITECTURE.md`. Operasional (menambah sekolah, domain,
> memindahkan produksi KPS): `PANDUAN_PLATFORM.md`.

## Persyaratan

- Node.js ≥ 22.12, npm
- PostgreSQL 14+ (16 dipakai saat pengembangan)
- Untuk produksi: penyimpanan media yang persisten (folder `media/` di server, atau object storage S3 — lihat `DEPLOYMENT_RUNBOOK.md`)

## Menjalankan secara lokal

```bash
cp .env.example .env            # isi DATABASE_URI dan PAYLOAD_SECRET (acak, ≥ 32 karakter)
npm ci
npm run migrate                  # membuat tabel dari migrasi berversi (src/migrations)
npm run seed                     # konten resmi + media dari content/ (aman diulang, tidak menggandakan)
npm run dev                      # http://localhost:3000  · CMS: http://localhost:3000/admin
```

Lokal: `DEFAULT_TENANT_SLUG=kps` di `.env` agar `localhost` menampilkan sekolah KPS (dibuat oleh `npm run seed`).
Akun pertama di platform kosong: buka `/admin` → "buat pengguna pertama" otomatis menjadi **Super Admin platform**;
akun staf sekolah dibuat di Pengguna dengan memilih sekolahnya. Sekolah baru: `npm run sekolah:baru -- --nama … --kode …`.
Atau saat seed: `SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run seed`. Tidak ada kredensial bawaan di kode.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run sekolah:baru -- …` | Menambah sekolah (+ akun Admin Teknis) — lihat `PANDUAN_PLATFORM.md` |
| `npm run platform:superadmin -- --email …` | Membuat/menaikkan akun Super Admin platform |
| `npm run build` / `npm start` | Build & jalankan produksi |
| `npm run migrate` | Terapkan migrasi database |
| `npm run migrate:create -- nama` | Buat migrasi baru setelah mengubah koleksi |
| `npm run seed` | Isi/perbarui konten awal (idempoten, berdasarkan slug & checksum) |
| `npm run import:media` | Impor ulang gambar dari `content/assets-manifest.json` (idempoten per SHA-256) |
| `npm run jobs:run` | Jalankan sekali antrean penerbitan terjadwal (untuk cron) |
| `npm run generate:types` | Perbarui `src/payload-types.ts` |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm test` | Tes unit + integrasi (butuh database pengembangan; data uji dibersihkan otomatis) |

## Struktur

```
src/app/(frontend)/   halaman publik (beranda, berita, agenda, pendaftaran, …)
src/app/(payload)/    panel admin & REST API Payload (/admin, /api)
src/collections/      skema konten (workflow, versi, audit)
src/globals/          Beranda, Pengaturan sekolah, Navigasi
src/access/           aturan peran (Admin Teknis, Editor/Humas, Kontributor, Petugas Pendaftaran)
src/hooks/            workflow server-side, audit, keamanan unggahan, proteksi media terpakai
src/lib/              kueri publik, format WITA, ICS
src/components/       layout, bagian beranda, efek gerak (motion.tsx, fx.tsx)
src/migrations/       migrasi berversi
scripts/              seed, impor media, runner job
content/              brief, peta gambar, manifest, aset resmi, snapshot sumber
tests/                tes unit & integrasi
```

## Catatan penting

- **Konten contoh** (`isDemo`) hanya tampil bila `SHOW_DEMO_CONTENT=true`. Produksi wajib `false`.
- **Pengalihan URL lama** (`/home/...`) hanya aktif bila `LEGACY_REDIRECTS=true` — nyalakan saat cutover disetujui.
- Waktu tampil memakai **WITA (Asia/Makassar)**; database menyimpan UTC.
- Animasi menghormati `prefers-reduced-motion`; efek kursor hanya aktif di perangkat ber-mouse.

**Go-live gratis di Vercel:** ikuti `PANDUAN_GO_LIVE_VERCEL.md` (Vercel + Neon + Vercel Blob).

Dokumen lain: `PANDUAN_ADMIN.md`, `DEPLOYMENT_RUNBOOK.md`, `CONTENT_GAPS.md`, `MIGRATION_REPORT.md`, `REDIRECT_MAP.csv`, `QA_REPORT.md`.

Peluncuran: `GO_LIVE_CHECKLIST.md`. Backup data produksi: `BACKUP-DATA-PRODUKSI.bat` (atau `npm run backup:prod`).

Fitur tambahan (addendum P0/P1): `CURRENT_FEATURE_AUDIT.md`, `FEATURE_FLAGS.md`, `PANDUAN_PENERIMAAN_DAN_KUNJUNGAN.md`, `PANDUAN_EDITOR_TAMBAHAN.md`, `P2_ADMISSIONS_BACKLOG.md`.
