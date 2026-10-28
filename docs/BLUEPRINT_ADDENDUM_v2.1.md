# Blueprint Aplikasi Satu Sekolah — Addendum v2.1

## Paket produk, batas produk dan mesin

Revisi 26 Oktober 2026. Addendum ini **melengkapi** Blueprint v2.0 (25 Oktober 2026). Bagian v2.0 yang tidak disebut di sini tetap berlaku. Bila ada perbedaan, gunakan addendum ini.

**Alasan revisi:** Blueprint v2.0 ditulis sebagai satu produk terintegrasi. Pemilik produk memutuskan bahwa **Satu Sekolah Web** dan **Satu Sekolah App** dijual terpisah. Karena itu batas produk, kepemilikan data dan mesin perlu ditetapkan sebelum modul App dibangun.

## A. Dua produk di atas satu inti

| Lapis | Isi (kode modul v2.0) | Dijual |
|---|---|---|
| **Inti platform** (`packages/core`) | Sekolah/tenant, domain, zona waktu, langganan produk, login staf bersama, penyegelan rahasia, registri sekolah; selanjutnya audit, berkas privat, notifikasi | Tidak; fondasi kedua produk |
| **Satu Sekolah Web** (`apps/web`) | M01 Website & CMS, M15 media, informasi penerimaan, **minat calon orang tua, kunjungan/open house** | Ya; paket Basic / Pro |
| **Satu Sekolah App** (`apps/portal`) | M02–M12 portal & akademik, **M14 penerimaan siswa baru penuh**, M13, M16–M20 | Ya; paket Pilot / Standar |

Aturan batas:

1. Setiap produk memeriksa **langganannya sendiri di server** (`hasProduct`). Menyembunyikan menu bukan otorisasi.
2. Produk tidak membaca tabel produk lain. Pertukaran data hanya lewat inti, API, atau event yang ditetapkan di bagian D.
3. Langganan per produk punya paket dan status sendiri: **Aktif**, **Uji coba**, **Dijeda**.
   - *Dijeda* menutup layanan baru, tetapi data tetap ada.
   - Paket *Tidak berlangganan* berarti produk itu tidak tersedia.
   - Status sekolah *Ditangguhkan* menutup kedua produk.

## B. Keputusan pemilik produk (26 Oktober 2026)

| # | Keputusan | Konsekuensi |
|---|---|---|
| 1 | **Minat dan kunjungan/open house tetap di Web** (semi publik). **Penerimaan siswa baru ada di App** | Web tetap memiliki `leads`, `visit-sessions` dan `visit-bookings`. App memiliki aplikasi pendaftaran, berkas, seleksi, hasil, daftar ulang dan konversi |
| 2 | **Satu portal**: App dibuka di `/portal` pada domain sekolah yang sama | Semua domain sekolah mengarah ke deployment Web; Web meneruskan `/portal/*` ke deployment App (bagian E, ADR-04) |
| 3 | **PWA dulu** | Aplikasi bisa dipasang dari browser. Aplikasi native menyusul tanpa mengubah backend |
| 4 | **Database App per sekolah** | Satu database PostgreSQL untuk setiap sekolah pengguna App (bagian E, ADR-03) |

## C. Mode penerimaan mengikuti produk yang dibeli (melengkapi §19.1)

| Produk sekolah | Mode penerimaan | Di website | Di portal |
|---|---|---|---|
| Web saja | Informasi / tautan sistem luar | Status, jadwal, persyaratan, tombol sistem resmi bila ada, minat, kunjungan | — |
| App saja | Lengkap | Halaman sekolah tanpa website, berisi tautan "Masuk ke portal" | Portal pendaftar penuh |
| Web + App | Lengkap | Informasi + **"Daftar di Portal Penerimaan"** (menggantikan tombol sistem luar), minat, kunjungan | Portal pendaftar penuh |

Mode dipilih otomatis oleh `admissionsMode()`. Satu periode hanya punya **satu** jalur pendaftaran resmi.

## D. Pemilik data bila sekolah membeli keduanya (melengkapi §27)

| Data | Sumber resmi | Ke produk lain | Mekanisme |
|---|---|---|---|
| Profil, berita, galeri, halaman, FAQ publik | Web | — | — |
| Minat calon orang tua, kunjungan/open house | Web | App dapat menautkan minat ke aplikasi pendaftaran dengan persetujuan pendaftar | Sinkron server-ke-server `/portal/api/sinkron/minat` (dibangun 28 Okt) |
| Periode/gelombang/kuota/hasil penerimaan | App | Ringkasan publik (status dibuka/ditutup, tanggal) tampil di website | API publik `/portal/api/publik/penerimaan`, dibaca website sisi server |
| Kalender akademik | App | Kegiatan bertanda *publik* tampil di agenda website | API publik `/portal/api/publik/website`, dibaca website sisi server |
| Pengumuman terarah (kelas, wali) | App | Tidak | — |
| Karya, prestasi, cerita dari data siswa | App (data privat) | Usulan ke website setelah kurasi dan consent | Usulan → Web sebagai draf |
| Akun staf | Inti (saat ini tabel `users` Web) | Dipakai App lewat login bersama | ADR-05 |
| Akun pendaftar, wali, siswa | App (database sekolah) | Tidak | — |

Sekolah yang berhenti dari salah satu produk:

- Produk lain tetap berjalan.
- Data produk yang berhenti dapat diekspor (§30 Portabilitas). Data itu tidak dihapus tanpa permintaan tertulis dan masa retensi.

## E. Keputusan arsitektur (ADR)

**ADR-01 Monorepo dengan inti bersama.**

```
satusekolah/
├─ apps/web       Satu Sekolah Web — Next.js 16 + Payload CMS 3 (platform database bersama, multi-sekolah)
├─ apps/portal    Satu Sekolah App — Next.js 16 + Drizzle ORM, basePath /portal, PWA
└─ packages/core  aturan sekolah/domain/zona waktu, langganan, sesi staf, penyegelan rahasia, registri sekolah
```

**ADR-02 App tidak dibangun di atas Payload CMS.**

- Payload cocok untuk konten (draf, revisi, media) dan tetap dipakai Web.
- App membutuhkan perintah ber-guard (§48), state machine per objek, transaksi lintas tabel, outbox (§47), dan izin per record (wali↔anak, guru↔penugasan, BK↔kasus).
- App juga membutuhkan UI untuk siswa, wali dan guru, bukan panel admin.
- Karena itu App memakai Drizzle (pustaka SQL yang juga dipakai Payload) langsung di PostgreSQL. Tim tetap memakai satu teknologi.

**ADR-03 Database App per sekolah.**

- Setiap sekolah pengguna App punya database sendiri.
- URL database disimpan **tersegel** (AES-256-GCM, `PLATFORM_SECRET`) di data sekolah. URL itu tidak pernah terbaca lewat API atau admin, termasuk oleh Super Admin.
- Setiap database ditandai pemiliknya (`school_meta`). Setiap koneksi memeriksa tanda itu, sehingga salah konfigurasi tidak bisa menampilkan data sekolah lain.
- Migrasi memeriksa pemilik **sebelum** mengubah apa pun: database milik sekolah lain, atau database tidak kosong yang belum ditandai (misalnya database platform yang tertempel), ditolak tanpa diubah.
- Ke depan, gunakan role database terpisah per sekolah. Tanda `school_meta` hanya mencegah kesalahan, bukan serangan.
- Skema sama untuk semua sekolah. Migrasi berversi dijalankan per sekolah atau untuk semua (`npm run portal:migrate -- --sekolah <kode>` / `--semua`).
- `school_id` (§26) tetap ada sebagai tanda database, bukan kolom di setiap tabel.
- Web tetap memakai satu database bersama dengan isolasi per sekolah (lihat `SAAS_ARCHITECTURE.md`).

**ADR-04 Satu portal di `/portal`.**

- Web meneruskan `/portal/*` ke deployment App (`PORTAL_ORIGIN`). Web menambahkan host sekolah dan rahasia bersama (`PORTAL_PROXY_SECRET`).
- App hanya memercayai host terusan bila rahasianya cocok (perbandingan waktu-konstan). **Di produksi, permintaan yang tidak lewat website ditolak**, dan alamat tak dikenal tidak pernah jatuh ke sekolah bawaan. Salah konfigurasi menutup portal, bukan menampilkan sekolah lain.
- `/portal` punya penjaga CSRF sendiri: permintaan yang mengubah data harus berasal dari alamat sekolah itu sendiri.

**ADR-05 Login.**

- **Staf** masuk sekali di CMS sekolah. Karena domainnya sama, browser mengirim cookie sesi yang sama ke App. App **tidak menyimpan** kunci penandatangan CMS: App menanyakan ke website (`/api/users/me`) siapa pemilik sesi. Payload sendiri yang memeriksa tanda tangan, sesi (logout langsung berlaku) dan akun. App lalu memeriksa akun aktif dan sekolah yang benar. Bila website tidak menjawab, App menolak.
- **Super Admin platform** (keputusan pemilik 28 Oktober 2026, model Alumniku) masuk ke App sekolah mana pun dalam **mode tata kelola**: pengaturan, aktivasi modul, staf & peran (bukan BK/UKS), audit, dan dashboard agregat. Mode ini tidak membuka data siswa, keluarga, keuangan, BK, UKS, maupun berkas, dan setiap kunjungan diaudit. Membaca Buku Induk tetap memerlukan izin bantuan teknis dari sekolah, yang terbatas waktu dan tidak dapat diberikan Super Admin untuk dirinya sendiri.
- **Sekolah baru** masuk lewat pendaftaran publik di alamat platform (`/daftar-sekolah`). Hanya Super Admin yang menyetujui di konsol `/platform`. Persetujuan membuat sekolah, Admin Teknis pertama, dan langganan uji coba dalam satu transaksi. Akun staf lain dibuat Admin Teknis sekolah.
- Database platform dibaca App lewat **role hanya-baca** untuk tabel sekolah dan domain saja.
- **Pendaftar, wali dan siswa** punya akun di database App sekolahnya. Fitur ini adalah modul berikutnya (P0 identitas).

**ADR-06 PWA.**

- Service worker hanya menyimpan berkas build statis dan ikon. Halaman, data dan berkas selalu diambil dari jaringan dan tidak disimpan di perangkat (§28).
- Halaman portal dikirim dengan `Cache-Control: private, no-store` dan `noindex`.

## F. Perubahan pada bagian v2.0

| Bagian v2.0 | Perubahan |
|---|---|
| §1, §3 | Satu ekosistem, dua produk. Peta modul dibagi menurut bagian A |
| §4.1 | Tombol "Masuk Portal" tampil otomatis bila App aktif |
| §19.1, §19.10 | Mode penerimaan otomatis (bagian C). Minat dan kunjungan milik Web |
| §25 | Admin platform tidak otomatis membaca data App. Akses bantuan dibatasi waktu dan diaudit (tetap) |
| §26 | `schools`/`domains`/`settings`/`module_flags` berada di inti + langganan per produk. `school_id` App = tanda database (ADR-03) |
| §28 | Disempurnakan oleh ADR-01 sampai ADR-06 |
| §31, §49 | MVP App yang dapat dijual = **P0 + P1 (M14)**, dapat dipasarkan sebagai "Satu Sekolah PPDB" sebelum modul akademik siap |

## G. Status implementasi (cabang `platform-produk`)

| Bagian | Status | Bukti |
|---|---|---|
| Monorepo + `packages/core` | completed | Web: 125 tes lulus + build; core: 8 tes |
| Langganan Web/App per sekolah + migrasi | completed | Migrasi diuji up → down → up; rollback menolak bila ada data App; TEN-12 |
| Website mengikuti langganan Web; pendaftaran diarahkan ke portal bila App aktif | completed | TEN-12, uji jalan bersama |
| Kerangka App: `/portal`, PWA, registri sekolah, database per sekolah, migrasi, login staf bersama | completed | POR-01..03 (7 tes), uji jalan Web + App di satu domain |
| Audit keamanan independen tahap produk | completed | 5 temuan terkonfirmasi + 5 risiko desain, semua diperbaiki dan dites (TEN-13, POR-03, core) |
| P0 identitas App, Buku Induk, kartu QR (M01–M03) | completed | APP-01..07 |
| M14 penerimaan penuh + inti tagihan (M17) | completed | PPDB-01..07 (termasuk persetujuan bersamaan & kuota) |
| Akademik harian, pengumuman, layanan TU (M04–M07, M12–M13) | completed | DAY-01..05 |
| Nilai & rapor, kenaikan kelas, BK, ekskul, kesiswaan (M08–M11) | completed | LIFE-01..05 |
| Perpustakaan, UKS, organisasi, alumni, dashboard & ekspor, akses bantuan (M16–M21) | completed | CMP-01..06 |
| Event Web ↔ App (bagian D): agenda publik, prestasi & cerita alumni berizin, jalur pendaftaran | completed | Endpoint `/portal/api/publik/*`, dibaca website sisi server |
| Job worker (outbox, jadwal) dan object storage privat (S3/R2) | completed | `/portal/api/jobs` + `CRON_SECRET`; `STORAGE_DRIVER=s3` wajib di produksi |
| Audit keamanan independen tahap App | completed | 1 tinggi + 6 sedang + beberapa rendah, diperbaiki dan dites (SEC-01..02) |
| Karya siswa App → website (izin wali, moderasi CMS, penarikan izin) | completed | KRY-01, WEB-APP-01; sinkron server-ke-server `x-sekolahku-sync` |
| Cakupan akses bantuan (operasional / data siswa) | completed | KRY-02, CMP-06 |
| Pendaftaran sekolah publik + konsol Super Admin; mode tata kelola Super Admin di App | completed | PLT-01/02 |
| Penautan minat ↔ pendaftaran atas persetujuan keluarga (bagian D) | completed | LEAD-01..03, WEB-APP-02 |

Panduan operasional: `docs/PANDUAN_APP.md`. Semua uji (setelah perbaikan audit 28 Okt 2026): core 10, web 190, portal 78. Semua bagian addendum ini sudah dibangun; penautan minat dan perbaikan audit ada di cabang `perbaikan-audit` dan baru berlaku di produksi setelah digabung ke `main` dan migrasinya dijalankan (GO_LIVE_CHECKLIST §F).
Produksi sejak 27 Oktober 2026 (Supabase); untuk KPS modul App diaktifkan bertahap (PANDUAN_APP §4).
