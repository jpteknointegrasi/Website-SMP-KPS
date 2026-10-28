# Laporan QA

Lingkungan: lokal (container Linux), Node 22.23, PostgreSQL 16, `next dev`, Chromium (Playwright). Tanggal 25 Oktober 2026.
Status: **PASS** = diuji & lulus · **PASS (manual)** = diperiksa manual/visual · **BLOCKED** = butuh layanan/keputusan eksternal · **TODO** = belum diuji.

## Otomatis — `npm test` (24/24 lulus)
| ID | Skenario | Hasil | Bukti |
|---|---|---|---|
| CMS-02 | Kontributor simpan draf/ajukan review; publish via API ditolak; ubah konten orang lain ditolak | PASS | tests/int/access-workflow |
| CMS-03 | Draf tidak muncul di kueri publik & pencarian | PASS | idem |
| CMS-04 | Revisi draf atas konten terbit → publik tetap melihat versi lama | PASS | idem |
| CMS-05 | Konten terjadwal (publishedAt masa depan) belum publik; pengumuman lewat display_end tidak aktif tanpa scheduler | PASS | idem |
| SEC-01 | Editor tak bisa menaikkan peran; kontributor tak bisa ubah pengaturan; petugas pendaftaran tanpa izin tak bisa publish; pesan masuk tak terbaca publik | PASS | idem |
| PUB-02 | Pencarian tidak mengindeks draf | PASS | idem |
| FORM-02 | Validasi kanal balasan & persetujuan; rate limit 5/10 menit | PASS | tests/unit/helpers |
| — | ICS: acara seharian memakai tanggal WITA (7 Nov tidak bergeser ke 6 Nov), escape teks, status batal | PASS | idem |
| — | Validasi URL menolak `javascript:`, `http:`, `//`, `data:` | PASS | idem |

## Fungsional & tampilan
| ID | Skenario | Hasil | Catatan |
|---|---|---|---|
| PUB-01 | 29 rute publik + detail berita/pengumuman/agenda/galeri | PASS | Semua 200, satu H1, tidak ada `href="#"`; URL tak dikenal → 404 kustom |
| PUB-04 | Tidak ada pengumuman prioritas → strip tidak dirender | PASS | dicakup CMS-05 + kode kondisi |
| PUB-05 | Penerimaan belum dibuka → tidak ada "Daftar sekarang" | PASS (manual) | status saat ini "dikonfirmasi"; hanya "Informasi Pendaftaran" |
| PUB-06 | URL portal/alumni kosong → tidak ada tombol rusak | PASS (manual) | header tanpa Portal Sekolah; alumni → halaman pengantar |
| CMS-08 | Impor aset dua kali | PASS | 0 baru, 31 dilewati (checksum) |
| UX-02 | Lebar 360, 390, 1440 px tanpa overflow horizontal | PASS | dicek otomatis di semua rute; 768/1024 belum dicek per rute |
| UX-01 | Keyboard: menu drawer & lightbox (focus trap, Esc, kembali fokus) | PASS (kode) / TODO manual | perlu uji manual dengan pembaca layar |
| SEO-01 | sitemap hanya konten terbit, robots, canonical | PASS | `/sitemap.xml`, `/robots.txt`; draf tidak muncul |
| — | Migrasi berversi pada database kosong + seed | PASS | `20261025_101925_initial` |
| — | Dasbor admin (statistik, agenda + hitung mundur, aktivitas) | PASS (manual) | diuji dengan akun sementara yang kemudian dihapus |
| — | Efek gerak: tilt/sorot kursor, magnet, hitung naik, kembali ke atas | PASS | diuji via pointer otomatis; nonaktif saat reduced-motion & perangkat sentuh |

## Belum / terblokir
| ID | Skenario | Status | Alasan |
|---|---|---|---|
| CMS-01 | Ganti hero lewat UI admin lalu terbit | PASS (manual, produksi) | Pemilik proyek mengganti konten lewat admin & tombol setup; tampil di produksi |
| CMS-06 | Restore revisi | PASS | `tests/int/qa-extra.int.spec.ts`: versi lama dipulihkan; riwayat versi tertutup untuk publik |
| CMS-07 | Hapus media terpakai | PASS | ditolak bila dipakai berita/blok halaman/beranda. **Bug ditemukan & diperbaiki**: blok halaman, koleksi baru dan foto beranda (`communityImage`, `slides`, `collage`) sebelumnya tidak dicek |
| FORM-01 | Kirim pesan kontak | PASS | tersimpan tanpa SMTP, privat untuk publik; honeypot tidak disimpan; tanpa persetujuan 400 |
| SEC-02/03/04 | Unggah berbahaya, XSS rich text, file privat | PASS | HTML-sebagai-JPG, SVG, EXE, PDF palsu ditolak; nama berkas diacak; `<script>` di rich text dirender sebagai teks; berkas privat & bukti prestasi tidak terbaca publik |
| OPS-01 | Restore DB + media ke staging | PASS (lokal) | pg_dump → pg_restore pada salinan berdata produksi (lihat bagian Addendum) |
| OPS-02 | Build produksi + smoke | PASS (lokal) | `npm run build` sukses; `next start`: /, /berita, /agenda, /pendaftaran, /kontak, /sitemap.xml, /admin = 200 (30–430 ms), URL asing = 404. Deploy staging belum |
| — | Lighthouse mobile (Performance ≥ 85, A11y ≥ 95) | PASS (build produksi lokal) | Beranda 85/100/96/100, Tentang 93/100/96/100, Agenda 93/100/96/100, Pendaftaran 94/100/96/100 (Perf/A11y/BP/SEO). Beranda tepat di batas karena efek animasi (TBT 480 ms) |
| — | axe-core WCAG 2.1 AA, 12 halaman × 390/1440 px | PASS setelah perbaikan | 3 temuan diperbaiki: kontras tanggal di luar bulan (kalender), landmark `<aside>` di Pendaftaran, urutan heading di Berita |

## Addendum P0/P1 — 25 Oktober 2026
Lingkungan: lokal (PostgreSQL 16), cabang `fitur-tambahan-p0p1`. Data uji sintetis, dihapus otomatis setelah tes. Bukti: `tests/unit/addendum.spec.ts` (30), `tests/int/addendum.int.spec.ts` (17). Total `npm test`: **71 lulus**. Tes integrasi juga dijalankan pada salinan database yang dimigrasi dengan berkas migrasi (bukan dev push): 28/28 lulus.

| ID | Pengujian | Status | Bukti / catatan |
|---|---|---|---|
| REG-01 | Rute & konten lama setelah migrasi | PASS | Migrasi pada salinan berdata produksi: 6 berita, 35 media, 3 pimpinan, 4 layanan utuh; 22 rute 200 tanpa overflow di 390 px; parameter `waktu`/`status` agenda tetap |
| CAL-01 | Grid bulan, lintas tahun, filter, mobile | PASS | unit: Jan 2027 mulai Senin 28 Des; Playwright 390/1440 tanpa overflow; filter di URL |
| CAL-02 | WITA, sepanjang hari, ICS, perubahan status | PASS | unit: 00.30 WITA tidak bergeser, DTEND eksklusif, folding ≤75 oktet; int: SEQUENCE naik saat status berubah, tidak naik untuk field non-kalender |
| ANN-01 | Expiry saat cron tertunda | PASS | tes lama (kueri memfilter tanggal) |
| ADM-01 | Status/mode penerimaan | PASS (manual) | Tombol sistem resmi hanya bila Dibuka + URL https; mode P2 ditolak CMS |
| LEAD-01 | Valid, invalid, double submit | PASS | 3 permintaan bersamaan berkunci sama → 1 record, referensi sama (bug race ditemukan & diperbaiki saat uji) |
| LEAD-02 | Kontak sama dua anak | PASS | keduanya tersimpan; kedua ditandai *Mungkin sama dengan* |
| LEAD-03 | Penugasan, status, overdue | PASS | riwayat otomatis; tutup tanpa alasan ditolak |
| VIS-01 | Rebutan sisa kuota 1 | PASS | 5 permintaan bersamaan → 1 diterima, 4 ditolak 409, counter = 1 |
| VIS-02 | Batal/jadwal ulang/pending kedaluwarsa | PASS | token sekali pakai; token salah & kedaluwarsa = pesan sama; pindah ke sesi penuh ditolak tanpa efek; hold kedaluwarsa melepas kuota |
| PRIV-01 | Publik/guru/editor/admin coba list/ekspor lead | PASS | REST 403 (Playwright + int); ekspor 403 tanpa izin; CSV menetralkan formula; audit memakai nomor referensi |
| PRIV-02 | Dokumen privat | PASS (desain) | bukti persetujuan karya di `private-files`; token pembatalan hanya disimpan sebagai hash |
| CMS-01 | Draf, review, publish | PASS (tes lama) + pratinjau draf hanya staf (anonim 404) | Live preview real-time belum |
| MEDIA-01 | Foto besar, focal point | PASS (fitur lama) | |
| FORM-01 | Email tidak tersedia | PASS (desain) | notifikasi opsional; kegagalan tidak menghapus data |
| FLAG-01 | Modul dimatikan | PASS | API 404 saat mati; halaman 404; menu & sitemap disaring |
| WORK-01 | Karya tanpa izin | PASS | terbit tapi persetujuan *Menunggu* → tidak publik (int + halaman 404) |
| STAT-01 | Klik CTA vs form tersimpan | PASS | `form_success` hanya dari server setelah simpan; kunci dibersihkan dari query/token |
| MED-01 | Video/Shorts/playlist/kanal | PASS | unit |
| MED-02 | youtu.be/watch/embed/tracking | PASS | unit: satu URL baku; duplikat ditolak (int) |
| MED-03 | Host mirip, javascript:, iframe | PASS | unit 12 kasus + int |
| MED-04 | Beranda sebelum klik putar | PASS | hanya poster; iframe dibuat setelah klik; CSP `frame-src` hanya youtube-nocookie |
| MED-05 | Video dihapus/privat | PASS (desain) | *Ketersediaan* → kartu tautan + tombol sumber |
| MED-06 | Instagram/TikTok tanpa embed | PASS | kartu tautan |
| MED-07 | Draf/izin/flag | PASS | int |
| MED-08 | Mobile, vertikal | PASS | 390 px tanpa overflow; rasio 9:16 |
| MED-09 | API impor gagal | N/A | impor otomatis tidak dibangun (flag terkunci) |
| MED-10 | Featured diganti lewat CMS | PASS (manual) | beranda dinamis tiap permintaan |
| OPS-01 | Backup/restore & rollback migrasi | PASS (lokal) | pg_dump → restore utuh; migrate up → down → up; perbaikan skrip *down* (IF EXISTS) |
| UX-01 | 360/390/768/1440 & keyboard | PARTIAL | 390 & 1440 diuji; FAQ memakai `<details>` native; uji pembaca layar manual belum |
| P2-01..03 | Seleksi lengkap | belum scope / flag off | `P2_ADMISSIONS_BACKLOG.md` |

Produksi (26 Okt 2026): migrasi addendum berjalan di Vercel/Neon; data tambahan terpasang; REST publik menolak data privat (403); konten contoh tersembunyi. Total tes: **85 lulus**.

Keterbatasan: thumbnail YouTube tidak bisa dimuat di lingkungan uji (jaringan dibatasi). Lighthouse dijalankan pada build produksi lokal (tabel di atas), belum di produksi; beranda tepat di batas 85, jadi ukur ulang setelah tayang. Pemeriksaan aksesibilitas otomatis memakai aturan axe-core WCAG 2.1 AA; kriteria baru WCAG 2.2 (2.4.11 fokus tidak tertutup, 2.5.7 alternatif seret, 2.5.8 ukuran target, 3.3.7/3.3.8) dan uji pembaca layar masih manual dan belum dilakukan.
