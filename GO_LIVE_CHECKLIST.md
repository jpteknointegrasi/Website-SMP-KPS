# Daftar Periksa Peluncuran — www.smpkps.sch.id

Status per 28 Oktober 2026. ✅ selesai · ⏳ menunggu pemilik proyek/sekolah · ➖ opsional

## A. Teknis (tim pengembang)
| # | Item | Status | Catatan |
|---|---|---|---|
| A1 | Website & CMS di Vercel; database & berkas di Supabase (proyek "Sekolahku", Tokyo) | ✅ | Neon & Vercel Blob lama hanya cadangan |
| A2 | Domain www.smpkps.sch.id (HTTPS), smpkps.sch.id → www | ✅ | |
| A3 | Alamat `*.vercel.app` proyek website = alamat platform (`/daftar-sekolah`, `/platform`) | ✅ | Domain sekolah tetap untuk website sekolah |
| A4 | Semua migrasi Web & App di produksi | ✅ | Migrasi baru wajib dijalankan saat deploy berikutnya (lihat F) |
| A5 | Isi awal resmi KPS (`/setup/isi-data`): 7 berita, 4 agenda, 51 foto, halaman Alumni IKA KPS | ✅ | |
| A6 | Konten contoh tersembunyi di publik (`SHOW_DEMO_CONTENT=false`) | ✅ | |
| A7 | Data privat tertutup untuk publik; Data API Supabase ditutup | ✅ | minat, pemesanan, pesan, berkas privat → 403 |
| A8 | Tes otomatis | ✅ | core 10 · web 190 · portal 78, semua lulus pada database baru (setelah perbaikan audit 28 Okt) |
| A9 | Lighthouse HP & axe WCAG AA | ✅ | lihat QA_REPORT |
| A10 | Audit keamanan independen (platform & App) | ✅ | semua temuan diperbaiki dan dites |
| A11 | Peta pengalihan URL WordPress lama lengkap (`REDIRECT_MAP.csv`, 142 baris) | ✅ | 21 halaman, 109 artikel, kategori, tag, penulis |
| A12 | Skrip backup lokal | ✅ | `BACKUP-DATA-PRODUKSI.bat` (database website/platform) |

## B. Pengaturan yang hanya bisa dilakukan pemilik (kata sandi & kunci)
| # | Item | Status | Cara |
|---|---|---|---|
| B1 | `WEB_ORIGIN` proyek App = alamat `….vercel.app` proyek website | ⏳ | Vercel → proyek App → Settings → Environment Variables → Redeploy. **Login staf App gagal sebelum ini benar** |
| B2 | Ganti kata sandi akun CMS awal; hapus berkas rahasia lokal | ⏳ | Login CMS → Akun → ubah sandi (Admin Teknis KPS & operator platform) |
| B3 | SMTP (Gmail + App Password) di proyek website **dan** App | ⏳ | Wajib sebelum menyetujui sekolah baru: undangan Admin Teknis (72 jam), reset sandi, verifikasi akun keluarga |
| B4 | Tugas terjadwal App `GET /portal/api/jobs` tiap 5–15 menit | ⏳ | Isi secret GitHub `APP_JOBS_URL` + `APP_CRON_SECRET` (workflow `cron.yml`, tiap 10 menit), atau cron-job.org dengan header `Authorization: Bearer <CRON_SECRET>` |
| B5 | Tugas terjadwal Web `GET /api/payload-jobs/run` | ⏳ | Secret GitHub `WEB_JOBS_URL` + `WEB_CRON_SECRET` (workflow yang sama). Menjalankan terbit terjadwal, kuota kunjungan, sinkron karya & minat, retensi |
| B6 | Backup pertama + uji pulih | ⏳ | `BACKUP-DATA-PRODUKSI.bat` (Web) dan `EKSPOR-DATA-APP.bat` (App KPS + berkas); uji pulih ke database terpisah (DEPLOYMENT_RUNBOOK §5); ulangi tiap minggu |
| B7 | Monitor uptime | ⏳ | UptimeRobot/BetterStack → `https://www.smpkps.sch.id/api/kesehatan` tiap 5 menit |
| B8 | `PLATFORM_DATABASE_URL` di proyek App = role hanya-baca | ⏳ | Wajib di produksi sejak perbaikan audit; tanpa ini App menolak berjalan |
| B9 | `PLATFORM_NAME=Satu Sekolah` di kedua proyek Vercel | ⏳ | Bila masih "Sekolahku", judul CMS/konsol memakai nama lama |

Paket gratis Supabase tidak menyediakan backup yang bisa diunduh atau dipulihkan ke titik waktu tertentu, jadi B6 adalah satu-satunya cadangan sampai proyek pindah ke paket berbayar.

## C. Sebelum diumumkan (pemilik proyek & sekolah)
| # | Item | Status | Cara |
|---|---|---|---|
| C1 | Akun staf per peran (jangan berbagi akun) | ⏳ | CMS → Pengguna: Editor/Humas, Petugas Pendaftaran, Kontributor guru |
| C2 | Tinjau "Fitur Aktif" | ⏳ | Form minat & kunjungan tampil setelah siklus/slot disiapkan; matikan bila belum ada petugas |
| C3 | Persetujuan sekolah atas isi & Kebijakan Privasi (termasuk retensi data) | ⏳ | CONTENT_GAPS #16, #28, #29 |
| C4 | Data resmi sekolah | ⏳ | Lihat bagian G |

## D. Hari peluncuran
| # | Item | Status | Cara |
|---|---|---|---|
| D1 | Izinkan Google mengindeks | ⏳ | Vercel → Env → `NOINDEX=false` → Redeploy |
| D2 | Google Search Console | ⏳ | Tambah properti `https://www.smpkps.sch.id` (verifikasi DNS) → kirim `/sitemap.xml` |
| D3 | Situs lama `smp.kps.sch.id` | ⏳ | **Backup WordPress dulu.** Buka `/setup/isi-data` sekali lagi (menambah pengalihan baru), arahkan DNS ke Vercel, tambahkan domain di Vercel, lalu `LEGACY_REDIRECTS=true` |
| D4 | Umumkan alamat baru | ⏳ | Bio Instagram @smpnas.kps, kanal KPS TV, grup orang tua |
| D5 | Uji cepat setelah tayang | ⏳ | Beranda, Pendaftaran, Kontak (kirim 1 pesan uji lalu tandai *Spam*), login admin, login staf App |

## E. Satu Sekolah App untuk KPS (bertahap)
1. Isi Pengaturan sekolah (alamat, kontak, kepala sekolah, NIP).
2. Tetapkan peran staf. BK dan UKS ditetapkan pimpinan, bukan Super Admin.
3. Aktifkan modul Pilot dulu (Buku Induk, Kartu), staf saja.
4. Undang orang tua setelah SMTP stabil.

## F. Deploy berikutnya (cabang `perbaikan-audit`, berisi `tautan-minat-portal`)
1. Backup dulu (B6). Pastikan B8 terisi, lalu gabungkan ke `main`.
2. Migrasi Web (otomatis saat build, semua aditif): `20261028_054340_tautan_minat_portal`, `20261028_155027_rate_limit_hits`, `20261028_155432_contact_idempotency`, `20261028_160043_retensi_data`.
3. Migrasi App `0007_lead_link` per sekolah: `npm run portal:migrate -- --semua` (juga dijalankan build App).
4. Buka `/setup/isi-data` di domain KPS untuk menambah 121 pengalihan baru (idempoten).
5. Uji cepat: `/api/kesehatan` → 200; kirim satu pesan kontak; masuk staf App; Super Admin tidak bisa mengunduh berkas siswa.
6. Isi B4/B5 (secret GitHub) dan B9 (`PLATFORM_NAME`).

## G. Data yang masih dibutuhkan dari sekolah
Ringkasan per penanggung jawab ada di `CONTENT_GAPS.md` (#1–#36). Yang paling berpengaruh pada kesan pertama:
1. Status & jadwal PPDB 2026/2027 (atau periode di Portal Penerimaan bila App dipakai).
2. Konfirmasi kontak (jam layanan, WhatsApp resmi bila ada).
3. Daftar guru & staf (+ mapel), pimpinan yayasan.
4. Prestasi terverifikasi lain, FAQ resmi, dokumen BOS.
5. URL layanan (Perpustakaan, Rapor, Link Tugas, E-Buletin).

## H. Setelah peluncuran (rutin)
- Mingguan: backup, cek Pesan Masuk & Minat, panel Pengingat di dasbor.
- Bulanan: tinjau FAQ, layanan (URL masih hidup?), dokumen lewat tanggal tinjau.
- Setelah 1–2 minggu stabil: hapus database Neon, store Vercel Blob, dan proyek `sekolahku-uji-web`.
- Paket Vercel & Supabase: Hobby/gratis hanya untuk penggunaan non-komersial dan tanpa backup terkelola. **Wajib** pindah ke Vercel Pro + Supabase berbayar sebelum menyetujui sekolah kedua yang membayar (kode tidak berubah).
