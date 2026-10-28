# Runbook Deployment, Backup & Operasional

> Target RPO 24 jam / RTO 4 jam adalah **usulan** yang harus disepakati sekolah dan diuji, bukan jaminan.

## 1. Susunan produksi
| Komponen | Layanan | Catatan |
|---|---|---|
| Satu Sekolah Web (website, CMS, konsol platform) | Proyek Vercel, Root Directory `apps/web` | Semua domain sekolah mengarah ke sini; `/portal/*` diteruskan ke App |
| Satu Sekolah App (portal `/portal`) | Proyek Vercel terpisah, Root Directory `apps/portal` | Hanya diakses lewat domain sekolah |
| Database | Supabase (proyek "Sekolahku", Tokyo): `postgres` = platform & website; satu database App per sekolah (mis. `app_kps`) | Data API Supabase tidak dipakai — periksa dengan `node scripts/cek-data-api.mjs "<URL>"` |
| Berkas | Supabase Storage (S3): bucket publik untuk foto website, bucket privat untuk berkas website & App | App wajib `STORAGE_DRIVER=s3` di produksi |
| Tugas terjadwal | GitHub Actions `.github/workflows/cron.yml` (tiap 10 menit) atau cron-job.org | Cron bawaan Vercel Hobby hanya sekali sehari |
| Email | SMTP (Gmail + App Password) | Wajib sebelum menyetujui sekolah baru dan membuka App untuk orang tua |
| Pemantauan | `GET /api/kesehatan` (200 = sehat, 503 = database bermasalah) | Daftarkan di UptimeRobot/BetterStack, interval 5 menit |

Paket Vercel Hobby hanya untuk penggunaan non-komersial. Begitu platform menerima pembayaran dari sekolah, pindah ke Vercel Pro dan Supabase berbayar (backup harian + pemulihan titik waktu). Kode tidak berubah.

## 2. Deploy
1. Pekerjaan dilakukan di cabang; **push ke `main` = deploy produksi** dan Vercel menjalankan migrasi database Web (`apps/web/scripts/vercel-build.mjs`) serta migrasi semua database App (`apps/portal/scripts/vercel-build.mjs`).
2. Build Preview berhenti sebelum menyentuh database kecuali `PREVIEW_DATABASE_IS_COPY=true` dan database Preview adalah salinan.
3. Sebelum menggabungkan cabang yang membawa migrasi: **backup dulu** (§4), lalu gabungkan, tunggu kedua proyek *Ready*.
4. Smoke test: `/`, `/berita`, `/agenda`, `/pendaftaran`, `/kontak`, `/admin`, `/sitemap.xml`, `/api/kesehatan`, masuk staf di `/portal/masuk-staf`.

**Rollback**: Vercel → Deployments → deployment sebelumnya → *Promote to Production* (untuk Web dan App). Migrasi bersifat aditif, jadi kode lama tetap berjalan di atas skema baru. Pulihkan database dari backup hanya bila data rusak.

## 3. Tugas berkala
| Tugas | Jadwal | Cara |
|---|---|---|
| Job Web (terbit terjadwal, pelepasan kuota kunjungan, sinkron karya & minat dari App, retensi data) | tiap 10 menit–1 jam | `GET /api/payload-jobs/run` + `Authorization: Bearer <CRON_SECRET Web>` |
| Job App (outbox email/notifikasi, kedaluwarsa penawaran & daftar ulang) | tiap 5–15 menit | `GET /portal/api/jobs` + `Authorization: Bearer <CRON_SECRET App>` |
| Kedaluwarsa pengumuman & berita terjadwal | — | Tidak butuh job: kueri publik memfilter tanggal |
| Backup | mingguan (paket gratis) | §4 |
| Cek Data API Supabase | setelah membuat database baru | `node scripts/cek-data-api.mjs "<URL>" --perbaiki` |
| Pembaruan dependensi | bulanan | `npm outdated`, uji di Preview |

Untuk GitHub Actions isi secret repo: `WEB_JOBS_URL`, `WEB_CRON_SECRET`, `APP_JOBS_URL`, `APP_CRON_SECRET` (lihat komentar di `cron.yml`). Jadwal GitHub bisa terlambat beberapa menit dan berhenti bila repo tidak aktif 60 hari.

## 4. Backup & pemulihan
| Data | Alat | Pemulihan |
|---|---|---|
| Database Web/platform | `BACKUP-DATA-PRODUKSI.bat` (`npm run backup:prod`, JSON) atau `pg_dump -Fc "<URL session pooler>"` | `pg_restore` ke database kosong; JSON untuk arsip/ekspor per sekolah |
| Database App + berkas App per sekolah | `EKSPOR-DATA-APP.bat` (`npm run ekspor -w @satusekolah/portal -- --sekolah kps`) | `npm run pulihkan -w @satusekolah/portal -- --sekolah kps --dari <folder> --ya` ke database App kosong yang sudah dimigrasi |
| Foto & dokumen website | Supabase Storage → unduh bucket, atau `rclone sync` dengan kunci S3 | Unggah kembali ke bucket dengan nama yang sama |

Simpan hasil backup terenkripsi di lokasi terpisah, minimal 4 mingguan + 3 bulanan. Target RPO 24 jam / RTO 4 jam adalah usulan: dengan paket gratis dan backup mingguan, RPO sebenarnya 7 hari.

## 5. Uji pemulihan (wajib sebelum peluncuran, lalu tiap semester)
1. Buat proyek/database uji terpisah (jangan produksi).
2. Pulihkan database Web (`pg_restore`) dan satu database App (`npm run pulihkan … --ya`).
3. Jalankan aplikasi lokal dengan URL uji; cek beranda, satu berita bergambar, panel admin, satu siswa di Buku Induk.
4. Catat durasi dan hasil di `QA_REPORT.md` (OPS-01).

## 6. Data pribadi & retensi
Retensi data calon orang tua diatur per sekolah di CMS → Pengaturan Sekolah → **Privasi & Retensi** (bulan; kosong = mati). Job harian mengosongkan nama, kontak, pesan, dan catatan pada minat/pesan/pemesanan yang sudah selesai, tanpa menghapus catatannya. Nilai bulan adalah keputusan sekolah (Kebijakan Privasi).

## 7. Email keluar (lupa kata sandi CMS & notifikasi)
Adaptor `@payloadcms/email-nodemailer` sudah terpasang dan aktif bila `SMTP_HOST` terisi. Tanpa SMTP, halaman
lupa kata sandi tetap menampilkan "Email Terkirim" tetapi tidak ada email yang keluar.
1. Isi di Vercel (proyek web, Production): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
   `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME` (lihat `apps/web/.env.example`). Proyek App (`apps/portal`) memakai
   `SMTP_HOST/PORT/SECURE/USER/PASS` yang sama + `SMTP_FROM` (format `"Nama" <alamat>`).
2. Redeploy, lalu uji: `/admin/forgot` dengan email akun sendiri → email masuk dalam 1 menit.
3. Alamat penerima notifikasi pesan/minat diatur per sekolah di Pengaturan Sekolah → Notifikasi. Notifikasi sengaja
   tidak memuat isi pesan.

## 8. Cutover dari website lama (hanya setelah persetujuan)
1. Backup penuh situs WordPress lama (file + database) dan simpan.
2. Deploy produksi dengan `SHOW_DEMO_CONTENT=false`, `NOINDEX=false`.
3. Periksa `REDIRECT_MAP.csv` di menu Pengalihan URL; set `LEGACY_REDIRECTS=true`.
4. Arahkan DNS; uji 5 URL lama → harus 301 ke halaman baru.
5. Smoke test; siapkan rollback DNS ke server lama selama 7 hari.

## 9. Keamanan operasional
- Akun individual; nonaktifkan akun staf yang keluar (centang *Akun aktif* = off).
- Login terkunci 15 menit setelah 5 kali gagal. Formulir publik dibatasi 5 kiriman/10 menit per IP (tersimpan di database, berlaku lintas instance); pendaftaran sekolah 3/jam per IP dan 60/jam se-platform.
- Header keamanan dikirim aplikasi: HSTS, nosniff, Referrer-Policy, Permissions-Policy, CSP (frame, object-src, base-uri, form-action). Stack trace tidak tampil di produksi.
- Belum ada MFA: pakai sandi panjang unik untuk Super Admin dan Admin Teknis.
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
