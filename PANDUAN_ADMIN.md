# Panduan Admin — CMS SMP Nasional KPS

Masuk ke **/admin** dengan akun pribadi Anda. Jangan berbagi akun. Setiap perubahan tercatat di menu **Audit**.

## Peran

| Peran | Bisa apa |
|---|---|
| Admin Teknis | Semua, termasuk akun, peran, dan hapus permanen |
| Editor / Humas | Menulis, mereview, menerbitkan semua konten; ubah beranda, menu, pengaturan |
| Kontributor | Menulis draf sendiri lalu **Ajukan Review**. Tidak bisa menerbitkan |
| Petugas Pendaftaran | Mengelola modul Pendaftaran; menerbitkan hanya jika diberi izin oleh Admin |

## Alur terbit

**Draf → Ajukan Review → Terbit → Arsip.**
1. Tulis konten, isi *Status alur kerja* = **Ajukan Review**, klik **Simpan Draf**.
2. Editor membuka konten, memeriksa lewat **Pratinjau**, lalu klik **Terbitkan**. Jika perlu perbaikan, ubah status ke *Draf* dan isi *Catatan reviewer*.
3. Mengedit konten yang sudah terbit tidak langsung mengubah website: versi lama tetap tampil sampai Anda klik **Terbitkan** lagi.
4. Riwayat versi ada di tab **Versi**; memulihkan versi lama membuat versi baru (riwayat tidak hilang).

## Mengganti hero beranda
Pengaturan → **Beranda** → grup *Hero*: ubah eyebrow, judul (maks. 80 karakter), deskripsi, foto, dan tombol.
- Foto: gunakan foto **horizontal** resmi. Di menu Media, klik foto lalu atur **titik fokus** agar wajah tidak terpotong di HP. Isi teks *alt* yang menggambarkan isi foto.
- **Foto hero bergantian** (maks. 6): bila diisi, foto-foto ini tampil bergantian dengan efek memudar dan zoom pelan. Atur *Jeda antar foto* (4–15 detik). Pengunjung dapat menjeda lewat tombol ⏸ di pojok foto; pergantian otomatis berhenti saat kursor di atas foto dan bagi pengguna yang mematikan animasi. Kosongkan untuk memakai satu foto utama saja.
- Foto hero paling cocok berukuran lebar (rasio sekitar 3:1, minimal 2000 px). Atur titik fokus agar subjek utama tetap terlihat di HP.
- Foto mobile (opsional) untuk potongan khusus HP (hanya dipakai bila tidak memakai foto bergantian).
- Klik **Terbitkan**.

Di halaman yang sama Anda bisa mengubah: 6 **Akses cepat**, teks & kolase **Mengenal sekolah**, label kecil dan judul setiap blok, serta **urutan & status blok** (seret untuk mengubah urutan; matikan blok yang belum punya konten layak). Blok *Sekilas KPS* (angka otomatis dari konten terbit) tersedia tetapi nonaktif secara bawaan.

## Menulis berita
Konten → **Berita** → *Buat baru*. Isi judul, ringkasan (tampil di kartu), foto sampul, isi, kategori.
- **Tanggal publikasi**: untuk materi lama isi tanggal aslinya. Tanggal di masa depan = terjadwal.
- Tombol **Duplikat** membuat salinan draf; ubah slug sebelum menerbitkan.

## Pengumuman
Konten → **Pengumuman**. Atur *Mulai tampil* dan *Selesai tampil* (WITA). Setelah lewat, pengumuman otomatis hilang dari beranda dan pindah ke Arsip dengan label "Sudah berakhir" — tanpa perlu dihapus.
- **Prioritas ≥ 50** = muncul di strip kuning paling atas beranda (hanya satu, prioritas tertinggi).

## Agenda
Konten → **Agenda**. Isi mulai/selesai (WITA) atau centang *Sepanjang hari*. Ubah *Status* bila ditunda/dibatalkan — website menampilkan label yang jelas. Pengunjung dapat mengunduh file kalender (.ics).

## Dokumen, BOS, galeri
- **Dokumen**: unggah PDF/Office, pilih kategori (BOS, kalender, panduan, buletin), periode dan versi. Kategori *Dana BOS* tampil di halaman Transparansi BOS.
- **Album/Galeri**: pilih foto sampul dan daftar foto beserta keterangan. Centang *Persetujuan publikasi* hanya bila sekolah sudah menyetujui publikasi foto siswa.

## Pendaftaran
Akademik → **Siklus Pendaftaran**. Atur tahun ajaran, **status** (belum dikonfirmasi / belum dibuka / dibuka / ditutup), gelombang, alur, persyaratan, FAQ, URL daftar.
Tombol "Daftar sekarang" hanya muncul bila status **dibuka** dan URL diawali `https://`. Biaya hanya tampil bila *Biaya disetujui* dicentang.

## Menu & pengaturan sekolah
- Pengaturan → **Navigasi**: menu atas (dengan submenu) dan tautan footer.
- Pengaturan → **Pengaturan Sekolah**: nama, logo, nilai, alamat, email, telepon, jam layanan, URL portal sekolah, URL portal alumni, media sosial. Tombol *Portal Sekolah*/*Portal Alumni* otomatis muncul setelah URL diisi.

## Pesan masuk
Menu **Pesan Masuk** berisi pesan dari formulir Kontak (nomor referensi `KPS-…`). Ubah status (baru → diproses → selesai) dan isi catatan privat. Pesan tidak pernah tampil di website.

## Media
- Format diterima: JPG, PNG, WebP, AVIF, PDF; SVG dan berkas berbahaya ditolak.
- Media yang masih dipakai tidak bisa dihapus — ganti dulu di konten yang memakainya.

## Hal yang jangan dilakukan
- Jangan menulis angka, prestasi, biaya, atau kontak yang belum dikonfirmasi sekolah.
- Jangan menempel kode HTML/script — editor sengaja tidak mendukungnya.
- Jangan mengaktifkan `SHOW_DEMO_CONTENT` di produksi.
