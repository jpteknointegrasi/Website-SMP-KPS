# Panduan Sekolahku App (portal `/portal`)

Sekolahku App adalah portal sekolah untuk staf, siswa dan orang tua/wali. Dilayani di `/portal` pada domain sekolah,
diteruskan oleh Sekolahku Web. Setiap sekolah memiliki database App sendiri. Rancangan lengkap: `BLUEPRINT_ADDENDUM_v2.1.md`.

## 1. Siapa masuk ke mana

| Pengguna | Cara masuk | Halaman |
|---|---|---|
| Staf (guru, TU, kurikulum, BK, …) | Akun CMS website yang sama (`/portal/masuk-staf`). Peran App diberikan di **Staf & peran** | `/portal/staf` |
| Orang tua/wali | Akun portal (email + sandi), lalu **kode aktivasi** dari sekolah untuk menautkan anak | `/portal/keluarga` |
| Siswa | Akun dibuat TU dari detail siswa (sandi sementara, wajib diganti) | `/portal/keluarga` |
| Calon siswa (PPDB) | Daftar sendiri di `/portal/daftar` | `/portal/keluarga/penerimaan` |
| Operator platform | Hanya dengan **izin bantuan teknis** dari sekolah (Audit & operasional), terbatas waktu, hanya melihat | — |

Admin Teknis CMS otomatis menjadi **Admin App Sekolah**. Peran ini sengaja **tidak** dapat membaca catatan BK
dan UKS; kedua data itu hanya untuk Guru BK/Koordinator BK dan Petugas UKS.

## 2. Modul dan alur utama

Modul diaktifkan bertahap di **Aktivasi modul** (Direncanakan → Konfigurasi → Pilot → Aktif). Keluarga melihat modul
berstatus Pilot/Aktif; staf melihat sejak Konfigurasi.

| Modul | Alur inti |
|---|---|
| Buku Induk | Data siswa, koreksi data oleh keluarga → disetujui verifikator, impor Excel, cetak A4 |
| Kartu siswa QR | Template disetujui → terbitkan → kartu digital & cetak A4 2×5; QR acak, verifikasi publik hanya valid/tidak |
| Penerimaan siswa baru | Periode & jalur → pendaftaran & berkas → verifikasi → seleksi → keputusan (disetujui orang lain) → rilis → daftar ulang → jadi siswa |
| Akademik harian | Jadwal berversi (cek bentrok) → guru "Mulai kelas" (presensi pelajaran + jurnal) → materi & tugas → penilaian; presensi harian wali kelas (ubah ≤ 7 hari, lewat itu koreksi); izin dari orang tua disetujui wali kelas |
| Nilai & rapor | Buku nilai → nilai rapor + deskripsi → dikirim ke wali kelas → catatan wali kelas → diajukan → disetujui Waka Kurikulum (bukan pengaju) → dirilis. Perbaikan = versi baru. Tanpa peringkat |
| Kenaikan kelas | Data akademik → Kenaikan kelas: rancangan dari keputusan rapor → atur rombel tujuan → jalankan sekali |
| Pengumuman | Sasaran (semua/staf/keluarga/rombel/tingkat), terjadwal, minta konfirmasi baca |
| Layanan TU | Katalog layanan, antrean bertarget waktu, surat keterangan aktif dibuat sistem |
| Keuangan | Tagihan → keluarga kirim bukti → keuangan verifikasi (bukti ≠ lunas sampai diverifikasi) |
| BK | Permintaan siswa/orang tua/rujukan guru → konselor → sesi (catatan rahasia) → ringkasan yang dibagikan |
| Ekstrakurikuler | Daftar → izin orang tua → pembina menerima (kuota) → pertemuan & kehadiran → penilaian ke rapor |
| Kesiswaan | Prestasi (verifikasi; tampil di website hanya dengan izin), laporan perundungan dll. dengan tindak lanjut |
| Perpustakaan | Katalog/impor, pinjam via NIS atau QR kartu, batas 3 buku, tenggat & perpanjangan |
| UKS | Kunjungan (isi medis terbatas), orang tua menerima hasil & pesan; wali kelas diberi tahu bila dipulangkan |
| Organisasi siswa | Pengurus mengajukan proposal → pembina menyetujui → masuk kalender (opsional website) → laporan |
| Alumni | Profil lulusan; kontak & publikasi hanya dengan izin (riwayat izin tersimpan) |
| Dashboard pimpinan | Angka agregat; ekspor CSV wajib tujuan dan tercatat di audit |

Website membaca dari App (sisi server, cache 5 menit): agenda bertanda publik, prestasi berizin, cerita alumni berizin,
jalur & biaya pendaftaran.

## 3. Operasional

```bash
npm run portal:migrate -- --sekolah <kode>      # skema database App sekolah (aman diulang)
npm run portal:demo -- --sekolah <kode> --admin <email-cms>   # DATA CONTOH — hanya database uji, ditolak di production
npm test -w @sekolahku/portal                    # uji integrasi (butuh PostgreSQL lokal)
```

Variabel lingkungan: `apps/portal/.env.example`. Wajib di produksi: `PLATFORM_DATABASE_URL` (role hanya-baca),
`PLATFORM_SECRET`, `WEB_ORIGIN`, `PORTAL_PROXY_SECRET` (sama dengan Web), penyimpanan S3/R2 privat, `CRON_SECRET`
dan cron ke `GET /portal/api/jobs` (header `Authorization: Bearer …`) tiap 5–15 menit, SMTP resmi.

## 4. Sebelum dipakai sekolah nyata

1. Uji di Preview `platform-produk` pada branch database terpisah (bukan database sekolah).
2. Isi **Pengaturan sekolah** (alamat, kontak, kepala sekolah, NIP) — dipakai surat, kartu dan rapor.
3. Tetapkan peran staf; pastikan hanya Guru BK & Petugas UKS memegang peran terbatas.
4. Aktifkan modul bertahap (Pilot dulu), mulai dari Buku Induk dan Kartu.
5. Jangan pernah menjalankan `portal:demo` pada database sekolah sungguhan.
