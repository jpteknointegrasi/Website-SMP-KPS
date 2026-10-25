# Paket Website SMP Nasional KPS untuk Claude

## Cara menggunakan

1. Ekstrak seluruh ZIP tanpa mengubah struktur folder.
2. Unggah `BRIEF_LENGKAP_WEBSITE_SMP_KPS_UNTUK_CLAUDE.md` ke Claude bersama paket aset. Jika menggunakan Claude Code, letakkan seluruh folder paket dalam repository proyek.
3. Minta Claude membaca brief, `PETA_GAMBAR.md` dan `assets-manifest.json` sebelum coding.
4. Gunakan prompt siap salin pada Bagian 20 brief. Jika chat tidak bisa membuka ZIP, ekstrak dan unggah Markdown serta gambar pilihan secara terpisah; untuk akses lengkap gunakan folder proyek lokal.
5. Berikan ilustrasi beranda sebelumnya sebagai referensi visual tambahan bila diperlukan. Foto dalam ilustrasi tersebut adalah AI; gunakan foto resmi dalam paket ini untuk implementasi.

## Isi paket

- `BRIEF_LENGKAP_WEBSITE_SMP_KPS_UNTUK_CLAUDE.md`: spesifikasi lengkap produk, desain, halaman, CMS, data, akses, pengujian dan serah terima.
- `PETA_GAMBAR.md`: hasil pemeriksaan visual dan arahan penempatan gambar.
- `assets-manifest.json`: inventaris gambar dengan URL asli, halaman sumber, dimensi, ukuran dan SHA-256.
- `assets/original/`: gambar yang berhasil diunduh dari domain resmi, dipertahankan sebagai sumber.
- `assets/web/`: varian WebP foto untuk implementasi; logo transparan gunakan original.
- `Katalog_Gambar_*.jpg`: lembar kontak gambar dengan ID yang sama seperti manifest.
- `sources/`: snapshot teks dari 11 halaman resmi sebagai bahan validasi/migrasi awal; bukan salinan lengkap situs.

Tanggal pengambilan: 25 Oktober 2026. Paket ini tidak berisi website jadi atau backend yang sudah berjalan; paket ini adalah brief implementasi dan materi gambar. Jumlah akhir aset dan rincian unduhan terdapat dalam manifest.

## Prinsip penting

Jangan hotlink gambar, mengarang prestasi/kontak/biaya/statistik, atau menganggap semua gambar pada website lama merupakan materi terbaru. Gambar dari halaman prestasi lama perlu verifikasi tahun, penerima dan jenis lomba. Foto anak mengikuti persetujuan publikasi sekolah. Jangan membuat portal akademik/alumni baru jika layanan terpisah sudah tersedia; cukup hubungkan URL yang disahkan.
