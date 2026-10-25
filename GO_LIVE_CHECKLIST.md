# Daftar Periksa Peluncuran — www.smpkps.sch.id

Status per 26 Oktober 2026. ✅ selesai · ⏳ menunggu pemilik proyek/sekolah · ➖ opsional

## A. Teknis (tim pengembang)
| # | Item | Status | Catatan |
|---|---|---|---|
| A1 | Website & CMS berjalan di Vercel + Neon + Vercel Blob | ✅ | |
| A2 | Domain www.smpkps.sch.id (HTTPS), smpkps.sch.id → www | ✅ | |
| A3 | Alamat `*.vercel.app` dialihkan 308 ke domain sekolah | ✅ | kecuali `/api/` (cron & pemantauan) |
| A4 | Migrasi addendum di produksi | ✅ | aditif, diuji up/down/up |
| A5 | Data fitur tambahan terpasang | ✅ | foto pimpinan, HAKORDIA, KPS TV, alumni, guru & staf |
| A6 | Konten contoh tersembunyi di publik (`SHOW_DEMO_CONTENT=false`) | ✅ | dicek lewat API publik |
| A7 | Data privat tertutup untuk publik | ✅ | minat, pemesanan, pesan, berkas privat → 403 |
| A8 | Tes otomatis | ✅ | 85 lulus |
| A9 | Lighthouse HP & axe WCAG AA | ✅ | lihat QA_REPORT |
| A10 | Tautan menu ke fitur yang belum berisi disembunyikan otomatis | ✅ | Kunjungan/Karya Siswa muncul setelah ada slot/karya terbit |
| A11 | Skrip backup lokal | ✅ | `BACKUP-DATA-PRODUKSI.bat` |

## B. Sebelum diumumkan (pemilik proyek)
| # | Item | Status | Cara |
|---|---|---|---|
| B1 | Buat akun staf per peran (jangan berbagi akun) | ⏳ | Admin → Pengguna → Buat: Editor/Humas, Petugas Pendaftaran, Kontributor guru |
| B2 | Hapus data contoh di admin | ⏳ | Agenda/Pengumuman/Program berawalan "Contoh" → hapus atau ganti dengan data resmi |
| B3 | Tinjau "Fitur Aktif" | ⏳ | Saat ini semua menyala. Form minat & kunjungan baru tampil setelah siklus/slot disiapkan; matikan bila belum ada petugas |
| B4 | Isi `.env.vercel` (DATABASE_URI) lalu jalankan backup pertama | ⏳ | `BACKUP-DATA-PRODUKSI.bat`; ulangi tiap minggu & sebelum perubahan besar |
| B5 | Cek riwayat pemulihan Neon | ⏳ | Neon → Settings → *History retention* (paket gratis terbatas) |
| B6 | Persetujuan sekolah atas isi & Kebijakan Privasi (termasuk retensi data) | ⏳ | CONTENT_GAPS #16, #28, #29 |

## C. Hari peluncuran
| # | Item | Status | Cara |
|---|---|---|---|
| C1 | Izinkan Google mengindeks | ⏳ | Vercel → Env → `NOINDEX=false` → Redeploy |
| C2 | Google Search Console | ⏳ | Tambah properti `https://www.smpkps.sch.id` (verifikasi DNS) → kirim `https://www.smpkps.sch.id/sitemap.xml` |
| C3 | Situs lama `smp.kps.sch.id` | ⏳ | Pilih: (a) biarkan sampai sekolah memutuskan, atau (b) arahkan DNS-nya ke Vercel (tambahkan domain di Vercel, redirect ke www.smpkps.sch.id) lalu `LEGACY_REDIRECTS=true` agar URL lama `/home/...` dialihkan ke halaman baru. **Backup WordPress lama dulu.** |
| C4 | Umumkan alamat baru | ⏳ | Bio Instagram @smpnas.kps, deskripsi kanal KPS TV, grup orang tua |
| C5 | Uji cepat setelah tayang | ⏳ | Beranda, Pendaftaran, Kontak (kirim 1 pesan uji lalu tandai *Spam*), login admin |

## D. Setelah peluncuran (rutin)
- Mingguan: backup, cek Pesan Masuk & Minat (petugas), cek panel Pengingat di dasbor.
- Bulanan: tinjau FAQ, layanan (URL masih hidup?), dokumen lewat tanggal tinjau.
- Tiap siklus PPDB: perbarui status, gelombang, persyaratan; nyalakan form minat/kunjungan bila siap.
- ➖ Email notifikasi pesan/minat: perlu SMTP resmi sekolah (`DEPLOYMENT_RUNBOOK.md` §7).
- ➖ Paket Vercel: Hobby hanya untuk penggunaan non-komersial. Bila proyek ini berbayar, pindah ke Pro (kode tidak berubah).

## E. Data yang masih dibutuhkan dari sekolah
Ringkasan per penanggung jawab ada di `CONTENT_GAPS.md` (#1–#36). Yang paling berpengaruh pada kesan pertama:
1. Status & jadwal PPDB 2026/2027 + URL sistem pendaftaran resmi.
2. Konfirmasi kontak (jam layanan, WhatsApp resmi bila ada).
3. Daftar guru & staf (+ mapel), pimpinan yayasan.
4. Prestasi terverifikasi lain, FAQ resmi, dokumen BOS.
5. URL layanan (Perpustakaan, Rapor, Link Tugas, E-Buletin).
