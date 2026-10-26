# Panduan Operasional Platform Multi-Sekolah

> **Monorepo (cabang `platform-produk`):** website ada di `apps/web`, portal di `apps/portal`. Di Vercel dibuat **dua project** dari repo yang sama: (1) Sekolahku Web — *Root Directory* `apps/web` (semua domain sekolah diarahkan ke sini); (2) Sekolahku App — *Root Directory* `apps/portal`, alamat bawaannya dipakai sebagai `PORTAL_ORIGIN` di project Web. `PLATFORM_SECRET`, `PAYLOAD_SECRET` dan `PORTAL_PROXY_SECRET` harus sama di kedua project; `PLATFORM_DATABASE_URL` portal = database Web. Lihat `docs/BLUEPRINT_ADDENDUM_v2.1.md`.

Untuk pemilik platform (Super Admin). Arsitekturnya dijelaskan di `SAAS_ARCHITECTURE.md`.

## A. Variabel lingkungan (Vercel → Settings → Environment Variables)

| Variabel | Platform multi-sekolah | Keterangan |
|---|---|---|
| `DATABASE_URI` / `DATABASE_URL` | sama seperti sekarang | Satu database untuk semua sekolah |
| `PAYLOAD_SECRET`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET` | sama | |
| `NEXT_PUBLIC_SERVER_URL` | **kosong** setelah migrasi (lihat B5) | Hanya diisi untuk deployment satu sekolah |
| `PLATFORM_ROOT_DOMAIN` | mis. `sekolahku.id` (opsional) | Subdomain otomatis `<kode>.sekolahku.id`; perlu DNS wildcard `*.sekolahku.id` → Vercel |
| `DEFAULT_TENANT_SLUG` | kosong (atau `kps` selama transisi) | Sekolah untuk alamat yang tak dikenal, mis. `*.vercel.app` |
| `PLATFORM_NAME` | mis. `Sekolahku` | Judul CMS |
| `SMTP_HOST` | opsional | Penerima email diatur per sekolah di Pengaturan Sekolah → Notifikasi |

## B. Memindahkan produksi SMP Nasional KPS ke platform

Lakukan setelah peluncuran KPS stabil. Selama cabang `platform-sekolah` belum digabung ke `main`, produksi tidak berubah.

1. **Backup**
   - Jalankan `BACKUP-DATA-PRODUKSI.bat`.
   - Di Neon, buat *branch* dari produksi (titik pemulihan).
2. **Uji di salinan**
   - Buat branch Neon kedua untuk uji.
   - Deploy cabang `platform-sekolah` sebagai Preview di Vercel dengan:
     - `DATABASE_URI` = branch uji;
     - `NEXT_PUBLIC_SERVER_URL=https://www.smpkps.sch.id`;
     - `DEFAULT_TENANT_SLUG=kps`.
   - `vercel-build` menjalankan migrasi. Cek log: *"Data lama dipindahkan ke sekolah "SMP Nasional KPS" (kode kps …, domain www.smpkps.sch.id)"*.
3. **Periksa preview**
   - Beranda, berita, agenda (jam WITA), pendaftaran, kontak (kirim 1 pesan uji).
   - Masuk `/admin` dengan akun KPS. Dasbor menampilkan "· SMP Nasional KPS"; menu Pengaturan langsung membuka pengaturan KPS.
4. **Gabungkan ke `main`**
   - Vercel menjalankan migrasi yang sama di produksi.
   - **Jangan** ubah `NEXT_PUBLIC_SERVER_URL` sebelum deploy ini selesai, karena migrasi memakainya untuk mencatat domain KPS.
5. **Setelah tayang**
   - Buat akun Super Admin Anda: `npm run platform:superadmin:prod -- --email anda@domain.id`. Kata sandi sementara tampil sekali.
   - Kosongkan `NEXT_PUBLIC_SERVER_URL`.
   - Isi `PLATFORM_NAME` dan, bila dipakai, `PLATFORM_ROOT_DOMAIN`.
   - Redeploy.
   - Di CMS → Platform → Sekolah → SMP Nasional KPS, pastikan domain `www.smpkps.sch.id` tercentang *utama*. Tambahkan `smpkps.sch.id` bila perlu.
   - Di Pengaturan Sekolah KPS, unggah *Gambar pratinjau tautan* (dulu `/og-image.jpg`).

Yang **tidak** berubah untuk KPS: konten, foto, akun staf, kata sandi, URL halaman, dan fitur aktif (paket Pro).

## C. Menambah sekolah baru

**Lewat CMS** (Super Admin):

1. Buka `/admin` → Platform → **Sekolah** → *Buat*.
2. Isi nama, kode, status, paket, zona waktu, dan domain.
3. Pengaturan, menu, fitur, dan beranda draf dibuat otomatis.
4. Buat akun Admin Teknis sekolah di Pengguna, lalu pilih sekolahnya.

**Lewat terminal:**

```
npm run sekolah:baru:prod -- --nama "SMA Negeri 1 Contoh" --kode sman1 --zona Asia/Jakarta \
  --domain www.sman1contoh.sch.id --paket basic --admin tu@sman1contoh.sch.id
```

**Domain sekolah:**

- Sekolah memakai domainnya sendiri: tambahkan domain itu di Vercel → Project → Domains, lalu minta sekolah mengarahkan DNS sesuai petunjuk Vercel.
- Sekolah tanpa domain: pakai `<kode>.PLATFORM_ROOT_DOMAIN`, cukup sekali pasang wildcard.

**Yang dikerjakan admin sekolah:**

1. Pengaturan Sekolah: logo, nama singkat, kontak, email notifikasi.
2. Beranda: pasang foto utama, lalu **Terbitkan**.
3. Isi konten: berita, agenda, guru, dan lainnya.
4. Fitur Aktif: nyalakan fitur yang sesuai paket.

## D. Operasional rutin

| Tugas | Cara |
|---|---|
| Menangguhkan sekolah (mis. belum bayar) | Platform → Sekolah → Status *Ditangguhkan*. Situs dan login sekolah itu tertutup ≤ 60 detik; data tetap ada |
| Naik/turun paket | Platform → Sekolah → *Langganan produk*: paket & status Web dan App terpisah. Fitur di luar paket otomatis mati |
| Mengaktifkan Sekolahku App | Buat database PostgreSQL baru untuk sekolah itu, tempel URL-nya di *Database App* (tersimpan terenkripsi), set paket App, lalu `npm run portal:migrate -- --sekolah <kode>` dari folder utama |
| Pindah domain | Ubah daftar domain. Tambahkan juga domain baru di Vercel |
| Backup satu sekolah | `BACKUP_TENANT=<kode>` lalu `npm run backup:prod` |
| Menghapus sekolah | Ditolak bila masih berisi data. Tangguhkan saja, atau kosongkan datanya dulu |
| Ringkasan semua sekolah | Buka `/admin` di alamat platform (bukan alamat sekolah) sebagai Super Admin |

## E. Rollback

`npm run migrate:down` (dengan `.env` produksi) mengembalikan skema satu sekolah **hanya** bila:

- baru ada satu sekolah;
- tidak ada akun Super Admin;
- semua jadwal masih WITA.

Bila sudah ada sekolah lain, pulihkan dari branch Neon yang dibuat di langkah B1.

## F. Role database hanya-baca untuk Sekolahku App

Portal hanya perlu membaca daftar sekolah dan domainnya dari database platform. Jalankan sekali di database platform (Neon → SQL Editor), lalu pakai role ini untuk `PLATFORM_DATABASE_URL` di project Sekolahku App:

```sql
CREATE ROLE sekolahku_portal_ro LOGIN PASSWORD '<kata-sandi-acak-panjang>';
GRANT CONNECT ON DATABASE <nama_database> TO sekolahku_portal_ro;
GRANT USAGE ON SCHEMA public TO sekolahku_portal_ro;
GRANT SELECT ON public.tenants, public.tenants_domains TO sekolahku_portal_ro;
```

Role ini tidak bisa membaca konten, akun staf, data calon orang tua, atau tabel lain, dan tidak bisa mengubah apa pun.

