# Panduan Go-Live di Vercel (paket gratis)

Susunan: **Vercel Hobby** (website) + **Neon Free** (database PostgreSQL) + **Vercel Blob** (foto & dokumen). Semua dibuat dari dashboard Vercel, tanpa Supabase.

> **Syarat paket gratis:** Vercel Hobby hanya untuk penggunaan non-komersial. Jika pembuat/pengelola website menerima bayaran, aturan Vercel mewajibkan paket Pro. Kode tidak perlu diubah saat pindah ke Pro.

## Batas paket gratis yang perlu diketahui
| Layanan | Batas | Dampak |
|---|---|---|
| Neon Free | 1 GB data; database tidur setelah 5 menit sepi | Kunjungan pertama setelah sepi sedikit lebih lambat |
| Vercel Blob | 1 GB file / bulan | Bila terlampaui, unggah/tampil foto berhenti sampai 30 hari — kompres foto sebelum diunggah |
| Unggah file | ±4,5 MB per berkas (batas fungsi Vercel) | Perkecil foto HP dulu, mis. dengan squoosh.app |
| Cron | sekali sehari (06.00 WITA) | Konten *terjadwal* terbit paling lambat besok pagi. Pengumuman kedaluwarsa tetap hilang tepat waktu |

---

## Langkah 1 — Hubungkan GitHub ke Vercel
1. Buka https://vercel.com → login dengan akun GitHub **jpteknointegrasi** (atau hubungkan GitHub di *Settings → Git*).
2. Klik **Add New… → Project**.
3. Pilih repositori **Website-SMP-KPS** → **Import**. Jika tidak muncul, klik *Adjust GitHub App Permissions* dan beri akses ke repo tersebut.
4. Di layar konfigurasi biarkan *Framework: Next.js*. **Jangan klik Deploy dulu** bila tombol *Environment Variables* masih kosong — atau klik Deploy saja; deploy pertama memang akan gagal karena database belum ada, itu normal.

## Langkah 2 — Buat database (Neon)
1. Di proyek Vercel → tab **Storage** → **Create Database** → pilih **Neon** (Serverless Postgres).
2. Paket **Free**, region **Singapore (ap-southeast-1)**, nama mis. `kps-db` → **Create**.
3. Saat ditanya, **Connect** ke proyek ini untuk *Production* dan *Preview*. Vercel otomatis menambahkan `DATABASE_URL` dll.

## Langkah 3 — Buat penyimpanan foto (Blob)
1. Tab **Storage** → **Create** → **Blob** → nama `kps-files`, akses **Public**, region Singapore → **Create**.
2. **Connect** ke proyek. Vercel otomatis menambahkan `BLOB_READ_WRITE_TOKEN`.

## Langkah 4 — Isi variabel lingkungan
Proyek → **Settings → Environment Variables**. Tambahkan (Environment: *Production*):

| Nama | Nilai |
|---|---|
| `PAYLOAD_SECRET` | salin dari file `.env.vercel` di folder proyek Anda (sudah dibuatkan, acak) |
| `CRON_SECRET` | salin dari `.env.vercel` |
| `NEXT_PUBLIC_SERVER_URL` | alamat website Anda, mis. `https://website-smp-kps.vercel.app` (lihat di tab *Domains*; tanpa `/` di akhir) |
| `DISABLE_JOB_AUTORUN` | `true` |
| `SHOW_DEMO_CONTENT` | `false` (atau `true` sementara bila ingin sekolah melihat contoh isian) |
| `NOINDEX` | `true` selama masa review (website tidak muncul di Google) |
| `LEGACY_REDIRECTS` | `false` |

> `NEXT_PUBLIC_SERVER_URL` harus sama persis dengan alamat yang dibuka di browser, kalau tidak login admin akan ditolak.

## Langkah 5 — Deploy
Tab **Deployments** → titik tiga pada deployment terakhir → **Redeploy**. Proses build otomatis menjalankan migrasi database (`vercel-build`). Tunggu status **Ready** (±3–5 menit).

## Langkah 6 — Buat akun admin
Buka `https://<alamat-anda>/admin` → isi formulir akun pertama (otomatis **Admin Teknis**).

## Langkah 7 — Isi konten & foto awal (tanpa perlu Node.js)
Masih dalam keadaan login sebagai admin, buka **`https://<alamat-anda>/setup/isi-data`**.
Halaman ini mengunggah 35 foto resmi ke Vercel Blob dan mengisi konten awal secara bertahap; ia memuat ulang sendiri sampai muncul **Selesai ✅** (±1–3 menit). Aman dibuka ulang kapan saja — data tidak digandakan.

> Alternatif bila Node.js terpasang di komputer: isi `DATABASE_URI` dan `BLOB_READ_WRITE_TOKEN` di `.env.vercel`, lalu jalankan `ISI-DATA-PRODUKSI.bat`.

## Langkah 8 (opsional) — Penerbitan terjadwal lebih cepat
Daftar gratis di https://cron-job.org → *Create cronjob*:
- URL: `https://<alamat-anda>/api/payload-jobs/run`
- Jadwal: tiap 15 menit
- *Advanced → Headers*: `Authorization` = `Bearer <CRON_SECRET Anda>`

---

## Setelah tayang
- Setiap `git push` ke cabang `main` otomatis men-deploy ulang.
- Pindah ke domain sekolah (`smp.kps.sch.id`) **hanya setelah sekolah menyetujui**: Vercel → *Settings → Domains → Add*, lalu admin DNS sekolah menambahkan record yang ditunjukkan Vercel. Ubah `NEXT_PUBLIC_SERVER_URL`, `NOINDEX=false`, `SHOW_DEMO_CONTENT=false`, lalu Redeploy. Lihat juga `DEPLOYMENT_RUNBOOK.md` §8 (cutover).
- Backup: Neon menyimpan riwayat titik-pulih terbatas di paket gratis; tetap lakukan ekspor berkala (`pg_dump` dengan `DATABASE_URL`).
- Keterbatasan: Vercel Blob hanya mendukung berkas publik. Berkas privat (bukti prestasi) memakai nama acak dan selalu disajikan lewat pemeriksaan hak akses Payload, tetapi tautan langsung Blob-nya tidak dirahasiakan secara kriptografis. Untuk dokumen sangat sensitif, simpan di luar website.
