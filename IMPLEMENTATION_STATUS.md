# Status Implementasi

Terakhir diperbarui: 28 Oktober 2026 — penautan minat ↔ Portal Penerimaan dan peta pengalihan WordPress lengkap (cabang `tautan-minat-portal`).

## Produksi sekarang (27 Okt 2026)
- **Website** `www.smpkps.sch.id`: proyek Vercel `website-smp-kps`, cabang `main` (monorepo, Root Directory `apps/web`), versi multi-sekolah.
- **Database & berkas: Supabase** proyek "Sekolahku" (Tokyo): database `postgres` (website/platform), `app_kps` (Sekolahku App KPS); bucket `sekolahku-web-media` (publik, foto), `sekolahku-web-files` & `sekolahku-app-files` (privat). Akun database terpisah: `sekolahku_prod` (aplikasi) dan `sekolahku_portal_ro` (App, hanya-baca daftar sekolah & domain). Data API Supabase tidak dipakai (akses ditutup).
- Isi website dimulai ulang dari paket awal resmi KPS (`/setup/isi-data`): 7 berita, 4 agenda, 51 foto, halaman Alumni IKA KPS. Isi lama di Neon tidak dipindahkan (keputusan pemilik; website belum resmi diluncurkan).
- **Sekolahku App**: proyek Vercel terpisah (Root Directory `apps/portal`, domain `smpkps-app.vercel.app`), dilayani di `www.smpkps.sch.id/portal`. Database App KPS sudah dimigrasi, tanpa data contoh; modul diaktifkan bertahap oleh admin.
- Akun CMS: Admin Teknis KPS + operator platform (email pemilik). Kata sandi awal di berkas rahasia lokal pemilik — wajib diganti.
- Neon & Vercel Blob lama: tidak dipakai lagi, disimpan sebagai cadangan (hapus setelah stabil). Instant Rollback Vercel tetap ke versi lama.
- Deploy: push ke `main` men-deploy otomatis (commit atas nama akun GitHub pemilik). Proyek uji `sekolahku-uji-web` tidak dipakai lagi.

## Keputusan
- Stack: Next.js 16 + Payload CMS 3.92 + PostgreSQL (baseline brief §12). SQLite hanya opsi uji lokal (`DATABASE_URI=file:…`).
- Hosting: Vercel; database & penyimpanan berkas: Supabase (sejak 27 Okt 2026, menggantikan Neon + Vercel Blob).
- Desain beranda mengikuti **mockup konsep yang disetujui** (header putih, hero terang dengan foto lebar, kartu akses cepat, kolase "Mengenal", pita navy prestasi, kartu agenda, CTA teal, footer navy 3 kolom). Foto memakai aset resmi sekolah, bukan foto AI dari mockup.
- Efek dinamis beranda: judul muncul per kata, foto hero terbuka + zoom pelan (Ken Burns), pola heksagon berdenyut (motif paving halaman sekolah) yang merespons kursor, jam & sapaan WITA langsung, kartu miring 3D + sorotan kursor, tombol magnetis, reveal bertahap saat scroll, hitung mundur agenda, ikon pengumuman bergoyang, progress scroll di header, tombol kembali ke atas bercincin progres. Semua mati otomatis pada `prefers-reduced-motion`; efek kursor tidak aktif di layar sentuh. Mode siang & malam.
- Dasbor admin: sapaan + jam WITA langsung, statistik hitung naik, agenda terdekat dengan hitung mundur, pengumuman yang berakhir ≤ 7 hari, feed aktivitas (Admin/Editor).
- Arsip (archivedAt) disaring di aturan akses server, bukan di kueri — berlaku juga untuk REST API.
- Redirect URL lama via catch-all + tabel CMS, aktif hanya dengan `LEGACY_REDIRECTS=true`. Artikel lama yang tidak dipindahkan diarahkan ke `/berita`, bukan 404.
- Halaman Alumni: IKA KPS (isi awal dari materi IKA KPS, portal alumniku.my.id) hanya untuk sekolah KPS; sekolah lain mendapat halaman alumni umum.
- Penautan minat ke pendaftaran: hanya atas persetujuan keluarga pemilik pendaftaran, dicocokkan dengan email akun yang terverifikasi lewat email. Website hanya menerima nomor pendaftaran; App hanya menerima nomor & tanggal minat.

## Selesai
- [x] Koleksi, global, peran, workflow server-side, versi, audit, keamanan unggahan, proteksi media terpakai
- [x] Migrasi berversi (diuji pada database kosong) + seed idempoten + impor media per checksum
- [x] Semua rute publik pada sitemap brief §5, termasuk ICS agenda, pencarian, 404, sitemap.xml, robots.txt
- [x] Beranda 15 blok sesuai brief §6 dan mockup; semua teks/urutan/blok dapat diatur di CMS
- [x] Dokumen serah terima (README, PANDUAN_ADMIN, DEPLOYMENT_RUNBOOK, CONTENT_GAPS, MIGRATION_REPORT, QA_REPORT)
- [x] Peta pengalihan WordPress lama lengkap: `REDIRECT_MAP.csv` 142 baris (21 halaman, 109 artikel, 6 kategori, 1 tag, 2 penulis), diambil dari `wp-sitemap.xml` situs lama pada 28 Okt 2026

## Addendum P0/P1 (fitur tambahan)
Bukti fitur lama & keputusan reuse: `CURRENT_FEATURE_AUDIT.md`. Pengaturan fitur: `FEATURE_FLAGS.md`.

| Kode | Fitur | Status | Catatan |
|---|---|---|---|
| F01 | Kalender akademik: tab Daftar/Kalender, grid bulan, kategori (CMS), sasaran, filter di URL, ICS + SEQUENCE, Google Calendar, lampiran; banner agenda di beranda & rundown | completed | Parameter lama `waktu`/`status` tetap jalan |
| F02 | Pengumuman terarah: sasaran diperluas, agenda terkait, peringatan tanpa tanggal berakhir | completed | Expiry tetap difilter di kueri |
| F03 | Penerimaan: mode, jenjang, status/kapasitas gelombang, dokumen info, video, FAQ, CTA minat & kunjungan | completed | |
| F04 | Form minat + pipeline: idempotensi, duplikat lunak, penugasan, status, riwayat, catatan privat, ekspor CSV aman + audit | completed | Notifikasi email butuh SMTP |
| F05 | Kunjungan/open house: slot, kuota atomik, pending + batas konfirmasi, jadwal ulang, batal mandiri via token, hadir/tidak hadir | completed | |
| F06 | FAQ (koleksi + `/faq` + blok kontekstual), kategori kontak baru, status layanan | completed | FAQ resmi sekolah belum ada |
| F07 | Karya siswa dengan persetujuan & moderasi (kini juga dari App) | completed (flag off) | |
| F08 | Aktivitas program/ekskul, media terkait, minat kegiatan | completed | |
| F09 | Direktori guru: mapel, aktif/nonaktif, filter, foto hanya dengan persetujuan | completed | |
| F10 | Unduhan: tanggal tinjau, relasi versi pengganti | completed | |
| F11 | Cerita alumni/orang tua: jenis hubungan; consent wajib | completed | |
| F12 | Dasbor: minat/kunjungan, pengingat konten, statistik agregat tanpa PII | completed | |
| F13 | Pratinjau draf desktop+HP, blok reusable, feature flags | completed | |
| F14 | Seleksi lengkap | completed di Sekolahku App (M14) | |
| F15 | Video & media sosial: `/media`, section beranda, klik-untuk-memuat, CSP | completed | |

## Platform multi-sekolah & dua produk (Sekolahku Web & Sekolahku App)
Rincian di repo: `SAAS_ARCHITECTURE.md`, `PANDUAN_PLATFORM.md`, `docs/BLUEPRINT_ADDENDUM_v2.1.md`, `docs/PANDUAN_APP.md`.

Keputusan pemilik produk: minat & kunjungan tetap di Web, penerimaan penuh di App; satu portal di `/portal` pada domain sekolah; PWA dulu; database App per sekolah.

| Bagian | Status | Uji |
|---|---|---|
| Multi-sekolah (isolasi 7 lapis, onboarding, Super Admin) | completed | isolasi antarsekolah |
| Langganan Web & App per sekolah | completed | TEN-12 |
| P0 identitas, Buku Induk, Kartu siswa QR (M01–M03) | completed | APP-01..07 |
| Penerimaan siswa baru penuh + inti tagihan (M14, M17) | completed | PPDB-01..07 |
| Jadwal, ruang guru, presensi & izin, pengumuman, layanan TU (M04–M07, M12–M13) | completed | DAY-01..05 |
| Nilai & rapor (tanpa peringkat), kenaikan kelas, BK (terbatas), ekskul, kesiswaan (M08–M11) | completed | LIFE-01..05 |
| Perpustakaan, UKS (terbatas), OSIS, alumni berizin, dashboard & ekspor, akses bantuan (M16, M18–M21) | completed | CMP-01..06 |
| Integrasi Web ↔ App + karya siswa App → website (izin wali, moderasi CMS) | completed | KRY-01, WEB-APP-01 |
| Penautan minat (Web) ↔ pendaftaran (App) atas persetujuan keluarga — butir terakhir blueprint §D | completed (28 Okt, belum di-deploy) | LEAD-01..03, WEB-APP-02 |
| Penyimpanan berkas S3-kompatibel (Supabase Storage) untuk website & App | completed | uji dengan server S3 tiruan + uji kunci asli |
| Penyiapan produksi pertama otomatis (`PLATFORM_BOOTSTRAP`) & pengaman build Preview | completed | diuji lokal & di Vercel |
| Audit keamanan independen (platform & App) | completed | semua temuan diperbaiki dan dites |
| Pendaftaran sekolah `/daftar-sekolah` + konsol Super Admin `/platform` (dasbor, pendaftaran, sekolah, audit) — model Alumniku | completed (28 Okt) | PLT-01/02 |
| Super Admin di App sekolah: mode tata kelola (pengaturan, modul, staf & peran tanpa BK/UKS, audit, agregat) | completed (28 Okt) | PLT-01 App |

Uji total: core 8, web 141, portal 60 — semua lulus; build web & portal lulus.

Dengan butir penautan minat, **semua bagian blueprint v2.0 + addendum v2.1 sudah dibangun**. Yang tersisa adalah pengaturan produksi, data sekolah, dan peluncuran.

**Alur sekolah baru (sejak 28 Okt):** sekolah mendaftar di `<alamat-platform>/daftar-sekolah` → Super Admin menyetujui di `<alamat-platform>/platform` → sekolah + Admin Teknis pertama + langganan uji coba dibuat dalam satu transaksi, undangan atur kata sandi berlaku 72 jam → Admin Teknis membuat akun staf & peran sekolahnya. Alamat platform = alamat yang bukan milik sekolah (mis. `….vercel.app` proyek website).

**Login staf App:** `WEB_ORIGIN` di proyek App harus menunjuk alamat platform proyek website (bukan domain sekolah mana pun).

## Tersisa
Butir 1–4 hanya bisa dilakukan pemilik (kata sandi dan kunci). Rincian langkah: `GO_LIVE_CHECKLIST.md`.
1. `WEB_ORIGIN` proyek App = alamat `….vercel.app` proyek website, lalu Redeploy (login staf App gagal sebelum ini benar).
2. Ganti kata sandi akun CMS awal; hapus berkas rahasia lokal yang tidak diperlukan.
3. SMTP (Gmail + App Password) di Web dan App — wajib sebelum menyetujui sekolah baru (undangan 72 jam) dan sebelum App dibuka untuk orang tua.
4. Cron: App `GET /portal/api/jobs` tiap 5–15 menit; Web `GET /api/payload-jobs/run` tiap jam (Authorization Bearer CRON_SECRET; cron bawaan Vercel Hobby hanya sekali sehari).
5. Gabungkan cabang `tautan-minat-portal` → jalankan migrasi App `--semua` → buka `/setup/isi-data` sekali untuk menambah 121 pengalihan URL lama.
6. Aktivasi modul App bertahap untuk KPS: isi Pengaturan sekolah, tetapkan peran staf (BK/UKS oleh pimpinan), Pilot dulu.
7. Data resmi dari sekolah — `CONTENT_GAPS.md` (PPDB, kontak terverifikasi, guru, prestasi, BOS); lalu peluncuran resmi (NOINDEX=false).
8. Setelah stabil: hapus database Neon & store Vercel Blob lama; hapus proyek uji Vercel.
9. Uji keyboard & pembaca layar manual.
10. (Opsional) Domain platform sendiri untuk konsol & pendaftaran sekolah; `PLATFORM_ROOT_DOMAIN` untuk subdomain otomatis sekolah.
