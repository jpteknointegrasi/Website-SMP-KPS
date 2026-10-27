# Uji Sekolahku Web + App di Vercel (Preview, database uji)

Tujuan: mencoba cabang `platform-produk` (website multi-sekolah + Sekolahku App) di internet **tanpa menyentuh
website dan database produksi KPS**. Hasilnya dua alamat uji:

- Website uji: `https://sekolahku-uji-web.vercel.app` (portal di `/portal`)
- App (hanya diakses lewat website uji): `https://sekolahku-uji-app.vercel.app`

Waktu: ±30–45 menit. Biaya: paket gratis Vercel dan Neon cukup.

> **Pengaman di kode.** Build Preview berhenti sebelum menyentuh database kecuali proyek menyatakan
> `PREVIEW_DATABASE_IS_COPY=true`. Variabel itu **hanya** diisi pada lingkungan Preview proyek uji, bersama
> `DATABASE_URI` yang menunjuk database uji. Jangan pernah mengisinya di proyek website produksi.

## 0. Periksa dulu: database produksi belum berubah

Sejak 26 Okt, Vercel otomatis mencoba membangun Preview cabang `platform-sekolah`/`platform-produk` di proyek produksi
dan semuanya **gagal**. Pastikan kegagalan itu tidak sempat menjalankan migrasi di database produksi:

1. Neon → proyek database website produksi → **SQL Editor** (branch `main`/produksi).
2. Jalankan: `SELECT name FROM payload_migrations ORDER BY id;`
3. Baris terakhir harus **`20261025_150726_addendum_p0p1`**. Bila ada `20261025_200110_platform_multi_tenant` atau
   yang lebih baru, **berhenti** dan kabari pengembang (jangan mengubah apa pun).

Hentikan build cabang lain di proyek produksi: proyek website produksi → **Settings → Git → Ignored Build Step** →
*Custom* → `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]` → Save. (Produksi tetap dibangun dari `main`.)

## 1. Database uji (Neon)

1. Neon → proyek database produksi → **Branches → Create branch** dari `main`, nama `uji-sekolahku`.
   Ini salinan; mengubahnya tidak mengubah produksi.
2. Di branch `uji-sekolahku` → **Databases → New database** → nama `app_kps_uji` (database App KPS untuk uji).
3. Salin dua connection string (pooled) dari branch `uji-sekolahku`:
   - database utama (mis. `neondb`) → dipakai sebagai **DB_UJI_WEB**
   - database `app_kps_uji` → dipakai sebagai **DB_UJI_APP**

## 2. Penyimpanan berkas uji

- Website: Vercel → **Storage → Create → Blob** → nama `sekolahku-uji-files` (Public) → hubungkan **hanya** ke proyek
  `sekolahku-uji-web` (langkah 3). Jangan memakai token Blob produksi.
- App (berkas privat): disarankan Cloudflare R2 (gratis 10 GB) → bucket `sekolahku-uji` (privat) → API token
  Object Read & Write. Untuk sekadar melihat-lihat boleh tanpa R2 dengan `STORAGE_DIR=/tmp/sekolahku`
  (berkas unggahan bisa hilang sewaktu-waktu).

## 3. Proyek Vercel `sekolahku-uji-web` (website)

1. Vercel → **Add New → Project** → impor repo `jpteknointegrasi/Website-SMP-KPS` → nama `sekolahku-uji-web`.
2. **Root Directory**: `apps/web`. Framework: Next.js. Jangan klik Deploy dulu bila diminta variabel; isi dulu langkah 4.
3. **Settings → Git → Ignored Build Step** → `[ "$VERCEL_GIT_COMMIT_REF" != "platform-produk" ]`.
4. **Settings → Environment Variables** — centang **Preview saja**, isi dari berkas `RAHASIA-UJI-SEKOLAHKU.txt`
   (bagian WEB) di folder proyek Anda.
5. **Settings → Domains → Add** `sekolahku-uji-web.vercel.app` → *Connect to an environment*: **Preview**,
   Git branch `platform-produk`. (Bila nama sudah dipakai orang, pilih nama lain dan sesuaikan
   `NEXT_PUBLIC_SERVER_URL`, `WEB_ORIGIN`.)

## 4. Proyek Vercel `sekolahku-uji-app` (Sekolahku App)

1. **Add New → Project** → repo yang sama → nama `sekolahku-uji-app`, **Root Directory** `apps/portal`.
2. Ignored Build Step sama: `[ "$VERCEL_GIT_COMMIT_REF" != "platform-produk" ]`.
3. Environment Variables (Preview saja): bagian APP di `RAHASIA-UJI-SEKOLAHKU.txt`.
4. Domains → `sekolahku-uji-app.vercel.app` → Preview, branch `platform-produk`.

## 5. Deploy (urutan penting)

1. `sekolahku-uji-web` → **Deployments → Create Deployment** → branch `platform-produk`. Log build harus memuat:
   - `Data lama dipindahkan ke sekolah "SMP Nasional KPS" (kode kps …)`
   - `✓ Sekolah kps: langganan App uji coba + database App tersimpan (tersegel)`
2. Setelah web **Ready**: `sekolahku-uji-app` → Create Deployment → `platform-produk`. Log harus memuat
   `✓ kps: skema terbaru` dan `✓ Data contoh untuk SMP Nasional KPS siap`.

## 6. Coba

| Apa | Alamat | Akun |
|---|---|---|
| Website uji | `https://sekolahku-uji-web.vercel.app` | — |
| CMS | `/admin` | akun admin KPS yang biasa (data salinan) |
| App staf | `/portal/masuk-staf` | akun CMS yang sama (email di `PREVIEW_DEMO_ADMIN` mendapat banyak peran contoh) |
| App orang tua (contoh) | `/portal/masuk` | `wali.alya@contoh.invalid` / `Contoh-Keluarga-2026` |
| App siswa (contoh) | `/portal/masuk` | `siswa.alya` / `Contoh-Keluarga-2026` |

Semua siswa, orang tua dan nilai di App uji adalah **data contoh sintetis**. Email tidak terkirim (SMTP kosong) —
hanya dicatat di App. Job terjadwal (antrean, sinkron karya) tidak berjalan otomatis di Preview; jalankan bila perlu:
`curl -H "Authorization: Bearer <CRON_SECRET>" https://sekolahku-uji-app.vercel.app/portal/api/jobs`.

## 7. Selesai menguji

Hapus branch Neon `uji-sekolahku` dan kedua proyek uji bila tidak dipakai lagi. Produksi tidak terpengaruh.
