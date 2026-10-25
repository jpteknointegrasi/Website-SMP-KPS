# Data yang Belum Dikonfirmasi

Website tidak mengarang data. Bagian di bawah ini disembunyikan, diberi label "Contoh", atau ditampilkan sebagai "sedang dikonfirmasi" sampai sekolah memberi data resmi.

| # | Data | Kondisi sekarang di website | Perlu dari | Cara mengisi |
|---|---|---|---|---|
| 1 | Status & jadwal PPDB 2026/2027 | Status "informasi sedang dikonfirmasi"; tombol daftar disembunyikan | Panitia PPDB | Siklus Pendaftaran → status, gelombang, alur, syarat |
| 2 | Uji tautan `https://kps.sch.id/ppdb` | Tersimpan, tidak ditampilkan sebagai tombol | Admin TI | Buka & konfirmasi, lalu set status *dibuka* |
| 3 | Alamat, email, telepon, faks, Instagram | Diambil dari halaman Kontak lama; ada catatan "sedang dikonfirmasi" | Tata usaha | Pengaturan Sekolah → centang *Kontak terverifikasi* |
| 4 | Nomor WhatsApp resmi | Tidak ada (telepon kantor bukan WA) | Tata usaha | Pengaturan Sekolah → WhatsApp |
| 5 | Jam layanan, titik peta | "Sedang dikonfirmasi" | Tata usaha | Pengaturan Sekolah |
| 6 | URL Portal Sekolah, Portal Alumni, Perpustakaan, Rapor, Link Tugas, E-Buletin | Tombol disembunyikan / "Tautan segera tersedia" | Admin TI | Pengaturan Sekolah & Layanan |
| 7 | Nama & jabatan pimpinan (+ foto KPS-002–004) | Nama dan foto dari situs resmi lama sudah dipasang | Kepala sekolah / TU | Konfirmasi ulang di Pimpinan & Guru |
| 8 | Daftar guru & staf | Kosong (empty state) | TU | Pimpinan & Guru |
| 9 | Program "Pembelajaran Aktif", "Sains & Teknologi" | Label desain, bertanda "Contoh" | Wakasek kurikulum | Program — ganti/terbitkan versi resmi |
| 10 | Program/ekskul "Seni & Musik" | Bertanda "Contoh" | Pembina | Ekstrakurikuler |
| 11 | Prestasi (tahun, lomba, peringkat, penerima) | Tidak ada klaim; hanya album arsip foto apresiasi 2022 | Kesiswaan | Prestasi → centang *Terverifikasi* |
| 12 | Foto kelas/lab/fasilitas terkini | Blok Fasilitas nonaktif | Humas | Media + Fasilitas |
| 13 | Persetujuan publikasi foto siswa | Album diberi tanda persetujuan berdasarkan publikasi lama; perlu ditegaskan | Kepala sekolah | Album → *Persetujuan publikasi* |
| 14 | Akreditasi, jumlah siswa/guru, tahun berdiri, biaya | Tidak ditampilkan | TU | Halaman Tentang / Pendaftaran (biaya: centang *disetujui*) |
| 15 | Dokumen BOS | Kosong | Bendahara BOS | Dokumen → kategori Dana BOS |
| 16 | Kebijakan privasi & retensi pesan kontak | Draf umum; periode retensi belum diputuskan | Kepala sekolah | Halaman *kebijakan-privasi* |
| 17 | Gambar KPS-005 (nama file "Gemini_Generated"), KPS-006, KPS-031 | Tidak dipakai | Humas | Verifikasi asal-usul sebelum dipakai |
| 18 | Kondisi terkini halaman sekolah pada foto hero KPS-030 (unggahan 2019) | Dipakai sebagai hero | Humas | Ganti dengan foto horizontal terbaru bila ada |
| 19 | Warna identitas resmi | Palet usulan brief (navy/teal/emas) | Kepala sekolah | Konfirmasi pedoman logo |
| 20 | Email notifikasi pesan & SMTP | Belum dipasang; pesan tetap tersimpan di admin | Admin TI | `DEPLOYMENT_RUNBOOK.md` §7 |
| 21 | URL kanal **KPS TV SMP NASIONAL KPS BALIKPAPAN** | Belum dipasang (nama hanya dari tangkapan layar) | Humas | Video & Media Sosial → Akun → salin URL asli, centang *Sudah diverifikasi* |
| 22 | Video profil/podcast yang boleh ditampilkan | Section KPS TV tersembunyi otomatis sampai ada konten terbit | Humas | Video & Media → tambah tautan, centang *Tampilkan di beranda* |
| 23 | Instagram @smpnas.kps | Dipindahkan ke Akun Resmi dengan catatan "dari situs lama" | Humas | Konfirmasi ulang catatan verifikasi |
| 24 | FAQ pendaftaran/pembelajaran/administrasi | Hanya 3 FAQ penggunaan website | Panitia PPDB, TU | FAQ → tulis jawaban resmi, isi *Terakhir ditinjau* |
| 25 | Mode penerimaan, kapasitas gelombang, jenjang | Mode "Informasi saja"; kapasitas kosong | Panitia PPDB | Pendaftaran (PPDB/PMB) |
| 26 | Kebijakan form minat (siapa menindaklanjuti, berapa lama) | Form minat **mati** | Kepala sekolah + PPDB | Tunjuk petugas → Fitur Aktif → Form minat |
| 27 | Jadwal kunjungan/open house, kapasitas, pemandu | Kunjungan **mati** | Humas/PPDB | Sesi Kunjungan → Fitur Aktif → Kunjungan |
| 28 | **Retensi data** minat, pemesanan kunjungan, statistik | Belum ditetapkan; data tidak dihapus otomatis | Kepala sekolah | Tetapkan periode (mis. 1 siklus + 6 bulan); admin menghapus berkala |
| 29 | Teks Kebijakan Privasi untuk form minat & kunjungan | Versi persetujuan `privasi-2026-10` tercatat; teks halaman masih umum | Kepala sekolah | Perbarui halaman *kebijakan-privasi*; bila berubah material, naikkan `CONSENT_VERSION` |
| 30 | Status & URL layanan (Perpustakaan, Rapor, Link Tugas, E-Buletin) | Status "Segera tersedia" | Admin TI | Layanan → URL + status Aktif + tanggal verifikasi |
| 31 | Karya siswa berizin | Fitur **mati** | Guru/Humas | Karya Siswa (persetujuan wajib) → Fitur Aktif |
| 32 | Daftar mapel guru & bio | Kosong | TU | Guru & Pimpinan → Mata pelajaran |

Semua pengumuman & agenda berawalan "Contoh:" adalah data demo dan otomatis tersembunyi saat `SHOW_DEMO_CONTENT=false`.
