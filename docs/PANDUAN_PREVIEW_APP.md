# Uji Sekolahku Web + App di Vercel (Preview, database uji Supabase)

Tujuan: mencoba cabang `platform-produk` (website multi-sekolah + Sekolahku App) di internet **tanpa menyentuh
website dan database produksi KPS** (produksi saat ini masih Neon + Vercel Blob dari cabang `main`; pemindahannya ke
Supabase dilakukan terpisah nanti). Uji ini sepenuhnya memakai Supabase — tanpa Neon dan tanpa Vercel Blob. Hasilnya:

- Website uji: `https://kps-uji-web.vercel.app` (portal di `/portal`)
- App (hanya diakses lewat website uji): `https://kps-uji-app.vercel.app`

Database uji: proyek Supabase **Sekolahku** (`mihnkswdagjiavzbmmfu`, Tokyo). Sudah disiapkan:
database `postgres` (website), database `app_kps_uji` (App KPS), bucket **publik** `sekolahku-web-media` (foto
website), bucket privat `sekolahku-web-files` (dokumen & berkas privat website), bucket privat `sekolahku-uji`
(berkas App). Akses Data API ke tabel ditutup (aplikasi tidak memakai API Supabase).

> **Pengaman di kode.** Build Preview berhenti sebelum menyentuh database kecuali proyek menyatakan
> `PREVIEW_DATABASE_IS_COPY=true`. Variabel itu **hanya** diisi pada Preview proyek uji. Jangan pernah di proyek produksi.

## 0. Proyek website produksi

1. Cek database produksi belum berubah: Neon → proyek database website → **SQL Editor** (branch produksi) →
   `SELECT name FROM payload_migrations ORDER BY id;` → baris terakhir harus `20261025_150726_addendum_p0p1`.
   Bila ada yang lebih baru, berhenti dan kabari pengembang.
2. Vercel → proyek website produksi → **Settings → Git → Ignored Build Step** → *Custom* →
   `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]` → Save. Produksi tetap dibangun dari `main`; cabang lain tidak lagi dicoba.

## 1. Supabase: kunci S3

Connection string database sudah tertulis di berkas rahasia. Sudah dibuat akun database khusus uji `sekolahku_uji`
(hanya untuk database uji; kata sandi utama proyek tidak dipakai). Cukup cocokkan host pooler: Supabase → **Connect** →
**Transaction pooler**; bila host di sana `aws-0-ap-northeast-1…`, ganti `aws-1` menjadi `aws-0` di berkas rahasia.

Lalu **Storage → S3 Configuration** (Settings) → **New access key** → salin Access key ID dan Secret access key
(secret hanya tampil sekali) ke 4 baris bertanda `<…>` di berkas rahasia. Satu kunci dipakai website dan App.

## 2. Proyek Vercel `sekolahku-uji-web` (website)

1. Vercel → **Add New → Project** → impor repo `jpteknointegrasi/Website-SMP-KPS` → nama `sekolahku-uji-web`,
   **Root Directory** `apps/web`. Bila langsung men-deploy dan gagal, tidak apa-apa — lanjutkan.
2. **Settings → Git → Ignored Build Step** → `[ "$VERCEL_GIT_COMMIT_REF" != "platform-produk" ]`.
3. **Settings → Environment Variables** — centang **Preview saja**, tempel bagian WEB dari `RAHASIA-UJI-SEKOLAHKU.txt`
   (kunci S3 sudah diisi). Di halaman itu ada tombol untuk menempel isi .env sekaligus.
4. **Settings → Domains → Add** `kps-uji-web.vercel.app` → environment **Preview**, branch `platform-produk`.
   (Bila nama sudah dipakai, pilih nama lain dan sesuaikan `NEXT_PUBLIC_SERVER_URL` dan `WEB_ORIGIN`.)

## 3. Proyek Vercel `sekolahku-uji-app` (Sekolahku App)

1. **Add New → Project** → repo yang sama → nama `sekolahku-uji-app`, **Root Directory** `apps/portal`.
2. Ignored Build Step sama: `[ "$VERCEL_GIT_COMMIT_REF" != "platform-produk" ]`.
3. Environment Variables (Preview saja): bagian APP dari `RAHASIA-UJI-SEKOLAHKU.txt` (isi DB dan kunci S3).
4. Domains → `kps-uji-app.vercel.app` → Preview, branch `platform-produk`.

## 4. Deploy (urutan penting)

1. `sekolahku-uji-web` → **Deployments → Create Deployment** → branch `platform-produk`. Log build memuat:
   `✓ Super Admin dibuat`, `✓ Sekolah "SMP Nasional KPS" dibuat`, `✓ Akun Admin Teknis`,
   `✓ Sekolah kps: langganan App uji coba + database App tersimpan (tersegel)`.
2. Setelah web **Ready**: `sekolahku-uji-app` → Create Deployment → `platform-produk`. Log memuat
   `✓ kps: skema terbaru` dan `✓ Data contoh untuk SMP Nasional KPS siap`.
3. Isi konten website uji: buka `https://kps-uji-web.vercel.app/admin`, masuk sebagai Admin Teknis uji
   (lihat berkas rahasia), lalu buka `/setup/isi-data` sampai **Selesai ✅** (konten & foto resmi KPS).

## 5. Coba

| Apa | Alamat | Akun |
|---|---|---|
| CMS website | `/admin` | Admin Teknis uji (berkas rahasia) |
| App staf | `/portal/masuk-staf` | akun Admin Teknis uji yang sama |
| App orang tua (contoh) | `/portal/masuk` | `wali.alya@contoh.invalid` / `Contoh-Keluarga-2026` |
| App siswa (contoh) | `/portal/masuk` | `siswa.alya` / `Contoh-Keluarga-2026` |
| Operator platform | `/admin` | `superadmin@sekolahku-uji.invalid` (sandi sama dengan Admin Teknis uji) |

Siswa, orang tua dan nilai di App uji adalah **data contoh sintetis**. Email tidak terkirim (SMTP kosong). Job
terjadwal tidak berjalan otomatis di Preview; bila perlu jalankan:
`curl -H "Authorization: Bearer <CRON_SECRET>" https://kps-uji-app.vercel.app/portal/api/jobs`.

Catatan: Supabase gratis berhenti sementara (pause) setelah 7 hari tanpa aktivitas — aktifkan lagi dari dashboard.
Server Supabase di Tokyo dan Vercel di Singapura, jadi halaman uji sedikit lebih lambat daripada produksi nanti.

## 6. Selesai menguji

Hapus kedua proyek Vercel uji; database Supabase **Sekolahku** dapat dikosongkan atau dipakai lagi. Produksi tidak
terpengaruh.
