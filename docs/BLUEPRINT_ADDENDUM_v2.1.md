# Blueprint Aplikasi Sekolahku — Addendum v2.1

## Paket produk, batas produk dan mesin

Revisi 26 Oktober 2026. Addendum ini **melengkapi** Blueprint v2.0 (25 Oktober 2026). Bagian v2.0 yang tidak disebut di sini tetap berlaku. Bila ada perbedaan, gunakan addendum ini.

**Alasan revisi:** Blueprint v2.0 ditulis sebagai satu produk terintegrasi. Pemilik produk memutuskan bahwa **Sekolahku Web** dan **Sekolahku App** dijual terpisah. Karena itu batas produk, kepemilikan data dan mesin perlu ditetapkan sebelum modul App dibangun.

## A. Dua produk di atas satu inti

| Lapis | Isi (kode modul v2.0) | Dijual |
|---|---|---|
| **Inti platform** (`packages/core`) | Sekolah/tenant, domain, zona waktu, langganan produk, login staf bersama, penyegelan rahasia, registri sekolah; selanjutnya audit, berkas privat, notifikasi | Tidak; fondasi kedua produk |
| **Sekolahku Web** (`apps/web`) | M01 Website & CMS, M15 media, informasi penerimaan, **minat calon orang tua, kunjungan/open house** | Ya; paket Basic / Pro |
| **Sekolahku App** (`apps/portal`) | M02–M12 portal & akademik, **M14 penerimaan siswa baru penuh**, M13, M16–M20 | Ya; paket Pilot / Standar |

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
| Minat calon orang tua, kunjungan/open house | Web | App dapat menautkan minat ke aplikasi pendaftaran dengan persetujuan pendaftar | API Web → App (berikutnya) |
| Periode/gelombang/kuota/hasil penerimaan | App | Ringkasan publik (status dibuka/ditutup, tanggal) tampil di website | Event `admission.cycle_published` → Web (berikutnya) |
| Kalender akademik | App | Kegiatan bertanda *publik* tampil di agenda website | Event/API App → Web (berikutnya) |
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
sekolahku/
├─ apps/web       Sekolahku Web — Next.js 16 + Payload CMS 3 (platform database bersama, multi-sekolah)
├─ apps/portal    Sekolahku App — Next.js 16 + Drizzle ORM, basePath /portal, PWA
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
- Skema sama untuk semua sekolah. Migrasi berversi dijalankan per sekolah atau untuk semua (`npm run portal:migrate -- --sekolah <kode>` / `--semua`).
- `school_id` (§26) tetap ada sebagai tanda database, bukan kolom di setiap tabel.
- Web tetap memakai satu database bersama dengan isolasi per sekolah (lihat `SAAS_ARCHITECTURE.md`).

**ADR-04 Satu portal di `/portal`.**

- Web meneruskan `/portal/*` ke deployment App (`PORTAL_ORIGIN`). Web menambahkan host sekolah dan rahasia bersama (`PORTAL_PROXY_SECRET`).
- App hanya memercayai host terusan bila rahasianya cocok. Permintaan langsung ke deployment App memakai host-nya sendiri dan tidak bisa menyamar sebagai sekolah.

**ADR-05 Login.**

- **Staf** masuk sekali di CMS sekolah. Karena domainnya sama, App menerima cookie sesi yang sama. App memeriksa tanda tangan, masa berlaku, keberadaan sesi (logout langsung berlaku), akun aktif, dan sekolah yang benar.
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
| §31, §49 | MVP App yang dapat dijual = **P0 + P1 (M14)**, dapat dipasarkan sebagai "Sekolahku PPDB" sebelum modul akademik siap |

## G. Status implementasi (cabang `platform-produk`)

| Bagian | Status | Bukti |
|---|---|---|
| Monorepo + `packages/core` | completed | Web: 122 tes lulus + build; core: 7 tes |
| Langganan Web/App per sekolah + migrasi | completed | Migrasi diuji up → down → up; rollback menolak bila ada data App; TEN-12 |
| Website mengikuti langganan Web; pendaftaran diarahkan ke portal bila App aktif | completed | TEN-12, uji jalan bersama |
| Kerangka App: `/portal`, PWA, registri sekolah, database per sekolah, migrasi, login staf bersama | completed | POR-01..03 (6 tes), uji jalan Web + App di satu domain |
| P0 identitas App (akun pendaftar/wali/siswa, person, membership) | backlog | Berikutnya |
| M14 penerimaan penuh (§19, §41) | backlog | Setelah P0 |
| Event Web ↔ App (bagian D) | backlog | Setelah M14 |
| Job worker (outbox, notifikasi, PDF) dan object storage privat | backlog | Diperlukan sebelum M14 tayang |

Halaman `/portal/pendaftaran` saat ini menyatakan dengan jujur bahwa portal pendaftaran sedang disiapkan. Jangan aktifkan langganan App untuk sekolah nyata sebelum M14 lulus gate §50.3.
