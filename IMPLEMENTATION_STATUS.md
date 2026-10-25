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

## Tersisa
1. Data resmi dari sekolah — lihat `CONTENT_GAPS.md` (PPDB, kontak terverifikasi, URL portal, guru, prestasi, BOS).
2. Tes tambahan: CMS-01/06/07, FORM-01 via browser, SEC-02/03/04 (lihat `QA_REPORT.md`).
3. Uji keyboard & pembaca layar manual; Lighthouse di staging.
4. Adaptor email + SMTP resmi (opsional) dan object storage S3 untuk produksi.
5. Inventarisasi lengkap URL WordPress lama → lengkapi `REDIRECT_MAP.csv`.
6. Staging, uji restore (OPS-01), lalu cutover sesuai otorisasi pemilik proyek.
