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
| CMS-01 | Ganti hero lewat UI admin lalu terbit | TODO manual | logika sama dengan seed; perlu simulasi staf |
| CMS-06 | Restore revisi | TODO | fitur bawaan Payload versi; belum diuji end-to-end |
| CMS-07 | Hapus media terpakai | TODO | hook `mediaInUse` ada; belum ada tes otomatis |
| FORM-01 | Kirim pesan valid end-to-end lewat browser | TODO | endpoint & validasi teruji; uji UI belum |
| SEC-02/03/04 | Unggah berbahaya, XSS rich text, file privat | TODO | hook keamanan unggahan & editor tanpa HTML ada; perlu tes |
| OPS-01 | Restore DB + media ke staging | BLOCKED | butuh lingkungan staging |
| OPS-02 | Build produksi + smoke | PASS (lokal) | `npm run build` sukses; `next start`: /, /berita, /agenda, /pendaftaran, /kontak, /sitemap.xml, /admin = 200 (30–430 ms), URL asing = 404. Deploy staging belum |
| — | Lighthouse mobile (Performance ≥ 85, A11y ≥ 95) | TODO | jalankan di staging dengan build produksi |
