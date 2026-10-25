# Status Implementasi

Terakhir diperbarui: 25 Oktober 2026.

## Keputusan
- Stack: Next.js 16 + Payload CMS 3.92 + PostgreSQL (baseline brief §12). SQLite hanya opsi uji lokal (`DATABASE_URI=file:…`).
- Desain beranda mengikuti **mockup konsep yang disetujui** (header putih, hero terang dengan foto lebar, kartu akses cepat, kolase "Mengenal", pita navy prestasi, kartu agenda, CTA teal, footer navy 3 kolom). Foto memakai aset resmi sekolah, bukan foto AI dari mockup.
- Efek dinamis beranda: judul muncul per kata, foto hero terbuka + zoom pelan (Ken Burns), pola heksagon berdenyut (motif paving halaman sekolah) yang merespons kursor, jam & sapaan WITA langsung, kartu miring 3D + sorotan kursor, tombol magnetis, reveal bertahap saat scroll, hitung mundur agenda, ikon pengumuman bergoyang, progress scroll di header, tombol kembali ke atas bercincin progres. Semua mati otomatis pada `prefers-reduced-motion`; efek kursor tidak aktif di layar sentuh.
- Dasbor admin: sapaan + jam WITA langsung, statistik hitung naik, agenda terdekat dengan hitung mundur, pengumuman yang berakhir ≤ 7 hari, feed aktivitas (Admin/Editor).
- Arsip (archivedAt) disaring di aturan akses server, bukan di kueri — berlaku juga untuk REST API.
- Redirect URL lama via catch-all + tabel CMS, aktif hanya dengan `LEGACY_REDIRECTS=true`.
- Blok "Sekilas KPS" (angka otomatis dari CMS) tersedia, nonaktif bawaan karena tidak ada di mockup.

## Selesai
- [x] Koleksi, global, peran, workflow server-side, versi, audit, keamanan unggahan, proteksi media terpakai
- [x] Migrasi berversi awal (diuji pada database kosong) + seed idempoten + impor media per checksum
- [x] Semua rute publik pada sitemap brief §5, termasuk ICS agenda, pencarian, 404, sitemap.xml, robots.txt
- [x] Beranda 15 blok sesuai brief §6 dan mockup; semua teks/urutan/blok dapat diatur di CMS
- [x] Tes unit + integrasi (24 lulus)
- [x] Dokumen serah terima (README, PANDUAN_ADMIN, DEPLOYMENT_RUNBOOK, CONTENT_GAPS, MIGRATION_REPORT, QA_REPORT)

## Addendum P0/P1 (fitur tambahan, cabang `fitur-tambahan-p0p1`)
Bukti fitur lama & keputusan reuse: `CURRENT_FEATURE_AUDIT.md`. Pengaturan fitur: `FEATURE_FLAGS.md`.

| Kode | Fitur | Status | Catatan |
|---|---|---|---|
| F01 | Kalender akademik: tab Daftar/Kalender, grid bulan, kategori (CMS), sasaran, filter di URL, ICS + SEQUENCE, Google Calendar, lampiran | completed | Parameter lama `waktu`/`status` tetap jalan |
| F02 | Pengumuman terarah: sasaran diperluas, agenda terkait, peringatan tanpa tanggal berakhir | completed | Expiry tetap difilter di kueri (tanpa menunggu scheduler) |
| F03 | Penerimaan: mode, jenjang, status/kapasitas gelombang, dokumen info, video, FAQ, CTA minat & kunjungan | completed | `full_admissions` terkunci (P2) |
| F04 | Form minat + pipeline: idempotensi, duplikat lunak, penugasan, status, riwayat, catatan privat, ekspor CSV aman + audit | completed | Notifikasi email opsional (`ADMISSIONS_NOTIFY_EMAIL` + SMTP) |
| F05 | Kunjungan/open house: slot, kuota atomik, pending + batas konfirmasi, jadwal ulang, batal mandiri via token, hadir/tidak hadir | completed | Kuota diuji dengan 5 permintaan bersamaan |
| F06 | FAQ (koleksi + `/faq` + blok kontekstual), kategori kontak baru, status layanan | completed | FAQ resmi sekolah belum ada (lihat CONTENT_GAPS) |
| F07 | Karya siswa dengan persetujuan & moderasi | completed (flag off) | Nyalakan setelah ada karya berizin |
| F08 | Aktivitas program/ekskul, media terkait, minat kegiatan via form kontak | completed | Tidak membuat daftar anggota |
| F09 | Direktori guru: mapel, aktif/nonaktif, filter, foto hanya dengan persetujuan | completed | Data guru dari sekolah |
| F10 | Unduhan: tanggal tinjau, relasi versi pengganti, tanpa `href="#"` | completed | |
| F11 | Cerita alumni/orang tua: jenis hubungan; consent tetap wajib | completed | Submission publik tidak dibuka |
| F12 | Dasbor: minat/kunjungan (sesuai izin), pengingat konten, statistik agregat tanpa PII | completed (statistik flag off) | |
| F13 | Pratinjau draf desktop+HP, blok reusable (FAQ, agenda, media, karya, panduan, CTA), audit nama field berubah, feature flags | completed | Live preview real-time belum (tombol Pratinjau membuka draf tersimpan) |
| F14 | Seleksi lengkap | backlog | `P2_ADMISSIONS_BACKLOG.md` |
| F15 | KPS TV & media sosial: akun resmi terverifikasi, `/media`, `/media/[slug]`, section beranda, blok media, klik-untuk-memuat, CSP | completed | URL kanal KPS TV menunggu verifikasi; impor otomatis tidak dibuat (flag terkunci) |
| §19 | Zona waktu dari `NEXT_PUBLIC_SCHOOL_TIMEZONE` | completed | Skema tanggal tetap WITA (mengubahnya butuh migrasi) |

Uji: 71 tes lulus (`npm test`): 30 unit addendum, 17 integrasi addendum, 24 lama. Migrasi diuji: up → down → up pada salinan berisi data seperti produksi, dan pada database kosong.

**Belum di produksi.** Menggabungkan ke `main` menjalankan migrasi di database produksi (Vercel `vercel-build`). Langkah: `DEPLOYMENT_RUNBOOK.md` §Addendum.

## Tersisa
1. Data resmi dari sekolah — lihat `CONTENT_GAPS.md` (PPDB, kontak terverifikasi, URL portal, guru, prestasi, BOS).
2. Tes tambahan: CMS-01/06/07, FORM-01 via browser, SEC-02/03/04 (lihat `QA_REPORT.md`).
3. Uji keyboard & pembaca layar manual; Lighthouse di staging.
4. Adaptor email + SMTP resmi (opsional) dan object storage S3 untuk produksi.
5. Inventarisasi lengkap URL WordPress lama → lengkapi `REDIRECT_MAP.csv`.
6. Staging, uji restore (OPS-01), lalu cutover sesuai otorisasi pemilik proyek.
