# Runbook Deployment, Backup & Operasional

> Target RPO 24 jam / RTO 4 jam adalah **usulan** yang harus disepakati sekolah dan diuji, bukan jaminan.

## 1. Kebutuhan hosting
- Server Node.js ≥ 22.12 (VPS atau platform Node). **Tidak berjalan di shared hosting PHP.**
- PostgreSQL terkelola atau di server yang sama, dengan backup harian.
- Penyimpanan media persisten: folder `media/` (VPS) atau object storage S3 (pasang `@payloadcms/storage-s3`, lihat §6).
- TLS (HTTPS) di depan aplikasi (Nginx/Caddy/platform).

## 2. Deploy pertama (staging dulu)
```bash
git clone … && cd smp-kps
cp .env.example .env    # isi DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL; NOINDEX=true di staging
npm ci
npm run migrate
npm run seed            # opsional untuk staging; produksi: SHOW_DEMO_CONTENT=false
npm run build
npm start               # port 3000; jalankan via systemd/pm2
```
Smoke test: `/`, `/berita`, `/agenda`, `/pendaftaran`, `/kontak`, `/admin`, `/sitemap.xml`, `/robots.txt`.

## 3. Update rilis
```bash
git pull && npm ci
pg_dump … > backup-sebelum-rilis.sql     # selalu backup dulu
npm run migrate && npm run build && systemctl restart kps-web
```
**Rollback**: kembalikan commit sebelumnya → `npm ci && npm run build` → restart. Bila migrasi baru merusak data, pulihkan dump `backup-sebelum-rilis.sql` (atau `npx payload migrate:down` untuk migrasi terakhir).

## 4. Tugas berkala
| Tugas | Jadwal | Cara |
|---|---|---|
| Penerbitan terjadwal | tiap menit | Bawaan server (autoRun). Bila server serverless/multi-instance: set `DISABLE_JOB_AUTORUN=true` dan cron `npm run jobs:run`, atau panggil `GET /api/payload-jobs/run` dengan header `Authorization: Bearer $CRON_SECRET` |
| Kedaluwarsa pengumuman | — | Tidak butuh job: kueri publik selalu memfilter tanggal |
| Backup database | harian 01.00 WITA | `pg_dump -Fc $DATABASE_URI > kps-$(date +%F).dump` |
| Backup media | harian | `rsync -a media/ backup:/kps/media/` atau versioning bucket S3 |
| Retensi backup | — | Usulan: 14 harian + 6 bulanan; disimpan terenkripsi di lokasi terpisah |
| Pembaruan dependensi | bulanan | `npm outdated`, uji di staging |

## 5. Uji restore (wajib sebelum go-live, lalu tiap semester)
1. Buat database kosong di staging: `createdb kps_restore`.
2. `pg_restore -d kps_restore kps-YYYY-MM-DD.dump`; salin folder media backup.
3. Jalankan aplikasi dengan `DATABASE_URI` ke `kps_restore`; cek beranda, satu berita bergambar, panel admin.
4. Catat durasi di `QA_REPORT.md` (OPS-01).

## 6. Media di object storage (opsional, direkomendasikan untuk produksi)
`npm i @payloadcms/storage-s3@3.92.0` lalu tambahkan plugin `s3Storage` di `src/payload.config.ts` untuk koleksi `media` (publik) dan `private-files`/`documents` (bucket terpisah, akses privat). Jalankan ulang `npm run import:media` tidak diperlukan bila file disalin dengan nama yang sama.

## 7. Email notifikasi pesan kontak
Belum ada adaptor email terpasang (pesan tetap tersimpan di admin). Untuk mengaktifkan: `npm i @payloadcms/email-nodemailer@3.92.0`, tambahkan `email: nodemailerAdapter({...})` di config dengan SMTP resmi sekolah, isi `CONTACT_NOTIFY_EMAIL` dan `SMTP_HOST`. Notifikasi sengaja tidak memuat isi pesan.

## 8. Cutover dari website lama (hanya setelah persetujuan)
1. Backup penuh situs WordPress lama (file + database) dan simpan.
2. Deploy produksi dengan `SHOW_DEMO_CONTENT=false`, `NOINDEX=false`.
3. Periksa `REDIRECT_MAP.csv` di menu Pengalihan URL; set `LEGACY_REDIRECTS=true`.
4. Arahkan DNS; uji 5 URL lama → harus 301 ke halaman baru.
5. Smoke test; siapkan rollback DNS ke server lama selama 7 hari.

## 9. Keamanan operasional
- Akun individual; nonaktifkan akun staf yang keluar (centang *Akun aktif* = off).
- Login terkunci 15 menit setelah 5 kali gagal. Formulir kontak dibatasi 5 kiriman/10 menit per IP.
- Header keamanan (CSP, HSTS) dipasang di reverse proxy; jangan tampilkan stack trace (mode produksi sudah menyembunyikannya).
- `PAYLOAD_SECRET` dan kredensial database hanya di env/secret manager, tidak di repository.

## Addendum P0/P1 — deploy & rollback
Perubahan ada di cabang `fitur-tambahan-p0p1`. **Push ke `main` = Vercel menjalankan `payload migrate` di database produksi.** Hati-hati juga dengan push cabang lain: bila variabel `DATABASE_URL` Preview menunjuk database yang sama, build Preview juga memigrasi produksi.

1. **Backup**: Neon → Branches → *Create branch* dari `main` (titik pulih), atau `pg_dump "$DATABASE_URL" -Fc > sebelum-addendum.dump`.
2. **Migrasi** `20261025_142217_addendum_p0p1` bersifat aditif: tabel/kolom/enum baru, tanpa DROP/ubah tipe, kolom wajib baru punya nilai bawaan. Sudah diuji up → down → up pada salinan berisi data.
3. Gabungkan ke `main` → tunggu Vercel **Ready**.
4. Login admin → buka `/setup/isi-data` → **Pasang data fitur tambahan**. Ini hanya menambah yang belum ada (kategori agenda, 3 FAQ penggunaan website, akun Instagram ke koleksi baru, tautan menu FAQ/Media/Karya, section KPS TV). Jangan tekan *Isi ulang konten awal* kecuali memang ingin mengembalikan teks awal.
5. Fitur yang menyimpan data pribadi tetap **mati** sampai dinyalakan Admin di *Pengaturan → Fitur Aktif* (`FEATURE_FLAGS.md`).
6. Smoke: `/`, `/agenda?tampilan=kalender`, `/pendaftaran`, `/faq`, `/media`, `/admin`.

**Rollback**
- Kode: Vercel → Deployments → deployment sebelumnya → *Promote to Production*. Kode lama tetap berjalan di atas skema baru karena kolom/tabel tambahan diabaikan.
- Skema (jarang perlu): dari mesin dengan akses DB, `DATABASE_URI=… NODE_ENV=production npx payload migrate:down` (menghapus tabel addendum **beserta datanya**, termasuk minat & pemesanan). Lebih aman: pulihkan cabang Neon dari langkah 1.

Variabel opsional baru: `NEXT_PUBLIC_SCHOOL_TIMEZONE` (bawaan Asia/Makassar), `ADMISSIONS_NOTIFY_EMAIL` (+ SMTP). Job `releaseVisitHolds` dijadwalkan per jam; di Vercel Hobby cron hanya harian, tetapi pelepasan kuota juga terjadi otomatis setiap ada permintaan pemesanan/ketersediaan.
