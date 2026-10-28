# Panduan Penerimaan, Minat & Kunjungan Sekolah

Untuk: Petugas Pendaftaran (peran *Petugas Pendaftaran*) dan staf yang diberi izin khusus.

## 0. Siapa boleh melihat data calon orang tua
- **Petugas Pendaftaran**: otomatis boleh melihat & mengelola minat dan pemesanan kunjungan, serta mengunduh CSV.
- Peran lain (Admin, Editor/Humas) **tidak otomatis boleh**. Admin Teknis dapat mencentang *Boleh melihat data calon orang tua* (dan bila perlu *Boleh mengekspor*) di **Pengguna**. Perubahan ini tercatat di Log Audit.
- Kontributor/guru tidak pernah bisa melihat data ini.

## 1. Mengatur siklus penerimaan
Menu **Pendaftaran → Pendaftaran (PPDB/PMB)** → buka tahun ajaran.
1. **Status**: *Menunggu konfirmasi* (bawaan), *Belum dibuka*, *Dibuka*, *Ditutup*. "Menunggu konfirmasi" ≠ "Belum dibuka".
2. **Mode penerimaan**:
   - *Informasi saja*: website hanya menampilkan informasi.
   - *Sistem pendaftaran eksternal*: isi **URL sistem resmi** (https). Tombol "Daftar melalui sistem resmi" muncul hanya bila status *Dibuka* dan URL valid.
   - *Form minat*: menampilkan form "Titipkan minat, bukan pendaftaran resmi".
   - *Pendaftaran lengkap* tidak dipakai di website (CMS menolaknya). Pendaftaran penuh ada di **Satu Sekolah App** (Portal Penerimaan).

   **Bila sekolah berlangganan Satu Sekolah App**, mode di atas diabaikan untuk tombol pendaftaran: website otomatis menyembunyikan tombol sistem eksternal (URL yang diisi tidak dipakai) dan menampilkan **"Daftar di Portal Penerimaan"** saat periode di App dibuka, atau **"Masuk Portal Penerimaan"** di luar itu. Status, tanggal, dan jalur diambil dari periode di App (menu PPDB di portal), jadi atur periode di App, bukan hanya di CMS. Form minat dan kunjungan tetap di website.
3. **Gelombang**: nama, tanggal, status per gelombang; **kapasitas hanya bila sudah disahkan**.
4. Alur, persyaratan, biaya (centang *disetujui untuk publik*), dokumen informasi, video profil (dari Video & Media), FAQ.
5. *Tampilkan form minat* dan *Saat ditutup, tawarkan* (kontak, atau minat untuk siklus berikutnya).
6. **Terbitkan.**

Hanya ada **satu proses resmi**. Bila memakai sistem eksternal, jangan meminta orang tua mengisi formulir lain untuk hal yang sama.

## 2. Menindaklanjuti minat
Menu **Pendaftaran → Minat Calon Orang Tua**.
- Data masuk berstatus **Baru**. Isi **Petugas**: status otomatis menjadi *Ditugaskan*.
- Setelah menghubungi, ubah status ke **Sudah dihubungi → Tindak lanjut → Berminat → Masuk proses resmi** atau **Ditutup** (wajib pilih alasan).
- **Tindak lanjut berikutnya**: tanggal pengingat internal. Sistem **tidak mengirim pesan otomatis**; Anda sendiri yang menghubungi.
- **Catatan privat**: tulis hasil percakapan. Penulis dan waktunya dicatat otomatis.
- **Riwayat** terisi sendiri (status, petugas, jadwal).
- **Mungkin sama dengan**: kontak sama pada siklus sama. Bisa jadi saudara kandung, jadi **tinjau dulu**; jangan langsung tutup. Centang *Duplikat sudah ditinjau*.
- *Masuk proses resmi* artinya sudah mendaftar di sistem resmi, **bukan berarti diterima**.
- Data uji: centang *Data uji* agar tidak dihitung di dasbor.
- Nomor telepon belum tentu nomor WhatsApp aktif.

**Ekspor CSV**: Dasbor → *Unduh CSV minat*, atau `/api/leads/export?status=new`. Setiap unduhan tercatat di Log Audit. Simpan berkas di tempat aman dan hapus setelah tidak diperlukan.

Pesan dari form **Kontak** dengan kategori *Pendaftaran* bisa dihubungkan manual ke data minat lewat kolom *Hubungkan ke data minat*.

## 3. Membuat slot kunjungan / open house
Menu **Pendaftaran → Sesi Kunjungan → Buat**.
1. Judul, jenis (*open house* / *individual*), mulai–selesai (WITA), lokasi berkumpul, petunjuk untuk pengunjung.
2. **Kapasitas** + satuan: *Keluarga* (1 pemesanan = 1) atau *Orang* (sesuai jumlah peserta).
3. **Batas pemesanan** (opsional).
4. **Perlu dikonfirmasi petugas**: bila dicentang, pemesanan berstatus *Menunggu* dan **memakai kuota** sampai batas konfirmasi (jam). Bila tidak dikonfirmasi tepat waktu, kuota dilepas otomatis (*Kedaluwarsa*).
5. Status **Dibuka untuk pemesanan**. *Draf* tidak tampil.
6. Pemandu bersifat internal dan tidak pernah tampil di publik.

Kolom *Terpakai* dihitung sistem dan tidak bisa diubah manual. Kapasitas tidak bisa diturunkan di bawah jumlah yang sudah dipesan.

## 4. Mengelola pemesanan
Menu **Pendaftaran → Pemesanan Kunjungan**.
- **Konfirmasi**: ubah *Menunggu* → *Terkonfirmasi* (isi *Alasan perubahan* bila perlu). Hubungi pemesan lewat kontaknya.
- **Jadwalkan ulang**: ganti kolom *Sesi*. Bila sesi tujuan penuh, sistem menolak tanpa mengubah apa pun.
- **Batalkan**: status *Dibatalkan* + alasan. Kuota kembali otomatis.
- **Setelah kunjungan**: tandai *Hadir* / *Tidak hadir*, lalu buat tindak lanjut di data minat terkait bila perlu.
- Pemesan bisa membatalkan sendiri lewat tautan yang ditampilkan **sekali** saat memesan. Tautan berlaku sampai jadwal dimulai.
- Bila angka *Terpakai* terlihat tidak cocok, panggil `POST /api/visit-sessions/reconcile` (masuk sebagai petugas) untuk menghitung ulang dari data pemesanan.

Daftar nama/nomor pengunjung **tidak pernah** ditampilkan di kalender atau halaman publik.

## 5. Laporan di dasbor
Panel **Minat & kunjungan** (hanya untuk yang berizin):
- *Belum ditindaklanjuti*: status Baru/Ditugaskan.
- *Tindak lanjut terlambat*: tanggal tindak lanjut lewat dan belum ditutup/masuk proses resmi.
- *Minat masuk 30 hari*: tanpa data uji & spam.
- *Masuk proses resmi X dari Y*: kohor minat 90 hari terakhir (pembilang dan penyebut dari kelompok yang sama).
- Kunjungan per status, hadir/tidak hadir 30 hari.

## 6. Menyalakan fitur
Admin Teknis: **Pengaturan → Fitur Aktif** → *Form minat* dan/atau *Kunjungan sekolah*. Nyalakan **setelah** petugas siap menindaklanjuti dan kebijakan retensi data ditetapkan (CONTENT_GAPS #26–28).
