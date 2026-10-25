# Arsitektur Platform Multi-Sekolah (SaaS)

Cabang: `platform-sekolah`. Status per 26 Oktober 2026.

Satu deployment dan satu database PostgreSQL melayani banyak sekolah. Setiap sekolah punya domain, data, pengguna, pengaturan, menu, fitur, dan zona waktu sendiri. SMP Nasional KPS menjadi sekolah pertama. Data produksinya dipindahkan otomatis oleh migrasi, tanpa ada yang dihapus.

## 1. Model

| Pilihan | Keputusan | Alasan |
|---|---|---|
| Model data | Satu skema; setiap tabel milik sekolah punya kolom `tenant_id` | Murah, satu migrasi untuk semua sekolah |
| Plugin `@payloadcms/plugin-multi-tenant` | **Tidak dipakai**; lapisan sendiri di `src/tenancy/` | Plugin tidak membatasi pengunjung anonim per domain, padahal REST API publik harus terisolasi |
| Pengenal sekolah | Header `Host` | Pengunjung tidak bisa memilih sekolah lain lewat parameter |
| Global Payload | Diubah menjadi koleksi "satu dokumen per sekolah" | Slug dan tabel tetap sama, sehingga migrasi kecil |

## 2. Alamat → sekolah (`src/tenancy/resolve.ts`)

Urutan pencocokan (hasil di-cache 60 detik per server):

1. Domain yang tercatat di sekolah (Platform → Sekolah → Domain), mis. `www.smpkps.sch.id`.
2. `<kode>.PLATFORM_ROOT_DOMAIN`, mis. `sman1.sekolahku.id`.
3. `DEFAULT_TENANT_SLUG`, untuk `localhost`, URL preview, atau deployment satu sekolah.

Bila tidak ada yang cocok, atau sekolah berstatus *Ditangguhkan*, halaman menampilkan "Website sekolah tidak ditemukan", API publik tidak membaca data apa pun, dan staf sekolah itu tidak bisa masuk.

## 3. Lapisan isolasi

Lapisan-lapisan berikut saling melengkapi. Bila satu lapisan terlewat, lapisan berikutnya tetap menahan.

| # | Lapisan | Berkas | Melindungi |
|---|---|---|---|
| 1 | **Aturan akses** setiap koleksi dibungkus syarat `tenant = sekolah permintaan` | `tenancy/access.ts`, `tenancy/collection.ts` | REST API, admin, Local API dengan user |
| 2 | **Hook tenant**: dokumen baru selalu masuk ke sekolah staf atau sekolah alamat; staf tidak bisa memindahkan dokumen | `assignTenant`, `lockTenant` | Isi `tenant` palsu di body permintaan |
| 3 | **Payload ber-tenant** (`scopePayload`): halaman, endpoint, job, dan seed hanya melihat satu sekolah, bahkan dengan `overrideAccess: true` | `tenancy/scoped.ts`, `lib/payload.ts` | Kueri sisi server yang lupa filter |
| 4 | **Relasi** (gambar, kategori, sesi, dst.) hanya bisa menunjuk dokumen sekolah yang sama, dan divalidasi di server | `scopeRelationship` | Menempel gambar atau berkas sekolah lain |
| 5 | **Basis data**: `tenant_id` NOT NULL + foreign key; slug/kode unik **per sekolah** | migrasi `20261025_200110` | Data tanpa sekolah, bentrok slug antarsekolah |
| 6 | **CSRF**: permintaan API yang mengubah data harus berasal dari host yang sama | `src/proxy.ts` | Situs lain memakai sesi login staf |

Siapa sekolah "permintaan" (`requestTenantId`):

- **Staf sekolah**: selalu sekolahnya sendiri, apa pun alamat atau konteksnya.
- **Kode server**: `context.tenantId` yang diisi `scopePayload`. Nilai ini tidak bisa diisi klien.
- **Pengunjung via REST**: sekolah pemilik header `Host`.
- **Super Admin**: tidak dibatasi, kecuali kode server memilih sekolah.

## 4. Peran

| Peran | Lingkup | Catatan |
|---|---|---|
| Super Admin Platform | Semua sekolah | Mengelola Platform → Sekolah dan akun. Lolos semua cek "Admin Teknis". **Tidak** otomatis melihat data calon orang tua; perlu centang *Boleh melihat data calon orang tua* seperti peran lain. |
| Admin Teknis | Satu sekolah | Mengelola akun sekolahnya (selalu di sekolahnya sendiri). Tidak bisa membuat Super Admin. |
| Editor / Humas, Kontributor, Petugas Pendaftaran | Satu sekolah | Sama seperti sebelumnya |

Akun pertama di platform yang masih kosong otomatis menjadi Super Admin. Untuk platform yang sudah berisi (KPS), Super Admin dibuat dengan `npm run platform:superadmin -- --email …`.

Email login bersifat unik di seluruh platform: satu akun hanya untuk satu sekolah. Staf hanya bisa masuk lewat alamat sekolahnya sendiri.

## 5. Pengaturan per sekolah (bekas global)

`site-settings`, `homepage`, `navigation`, dan `feature-flags` kini berupa koleksi dengan indeks unik pada `tenant`.

- Kode tetap memakai `payload.findGlobal/updateGlobal` lewat Payload ber-tenant.
- Saat sekolah dibuat, keempat dokumen langsung disiapkan (`tenancy/provision.ts`): nama sekolah, menu standar, fitur bawaan, dan beranda **draf**. Beranda baru tampil setelah foto utama dipasang dan diterbitkan. Sebelum itu situs menampilkan "sedang disiapkan".
- Di CMS, staf yang membuka menu Pengaturan/Beranda/Navigasi/Fitur Aktif langsung diarahkan ke dokumen sekolahnya (`components/admin/SingletonList.tsx`).
- Field baru di Pengaturan Sekolah: **Nama singkat** (mis. "KPS", dipakai di "Tentang KPS" dan "Cerita dari KPS"), **Gambar pratinjau tautan**, dan **email Notifikasi** untuk pesan kontak serta minat.

## 6. Fitur & paket

`readFlags()` = pilihan sekolah ∩ fitur yang diizinkan paketnya (`lib/flags.ts`, `PLAN_FEATURES`):

| Paket | Fitur yang bisa dinyalakan |
|---|---|
| Basic | Kalender bulanan, Video & media sosial |
| Pro | + Form minat, Kunjungan sekolah, Karya siswa, Statistik pengunjung |

SMP Nasional KPS dimigrasikan sebagai **Pro**, sehingga tidak ada fitur yang hilang. Paket hanya membatasi; tagihan belum dibuat (lihat §10).

## 7. Zona waktu

Setiap sekolah memilih WIB, WITA, atau WIT. Zona ini dipakai untuk:

- tampilan tanggal dan jam di halaman (`lib/tz.ts`, `lib/format.ts`);
- jam dan sapaan di beranda dan dasbor;
- kalender bulanan, ICS, dan tautan Google Calendar;
- statistik harian;
- *pemilih tanggal di CMS*: zona awal mengikuti sekolah editor (`tenancy/timezone.ts`).

Tanggal yang sudah tersimpan tetap memakai zonanya masing-masing.

## 8. Berkas

- Semua sekolah memakai satu Vercel Blob store. Nama berkas berupa UUID acak, jadi tidak bisa bentrok.
- **Foto publik** dilayani langsung dari CDN, seperti sebelumnya.
- **Dokumen dan berkas privat** tetap dilayani lewat Payload, sehingga aturan akses per sekolah berlaku.
- Deduplikasi checksum foto kini per sekolah.
- "Unggah ulang foto" di `/setup/isi-data` mempertahankan berkas semua sekolah.

## 9. Migrasi data KPS (`20261025_200110_platform_multi_tenant`)

Bila database sudah berisi data:

1. Dibuat sekolah `kps` (nama dari Pengaturan, paket Pro, status Aktif, zona `NEXT_PUBLIC_SCHOOL_TIMEZONE` atau WITA). Domain diambil dari `NEXT_PUBLIC_SERVER_URL`.
2. Setiap baris konten, berkas, akun, audit, dan versinya ditandai milik sekolah itu.
3. Nama singkat diambil dari singkatan di akhir nama ("KPS"). Email notifikasi lama dari env disalin ke Pengaturan.
4. `tenant_id` dijadikan NOT NULL.

Pengujian: up → down → up pada salinan berisi data seperti produksi, migrasi penuh pada database kosong, dan `migrate:create` tidak menemukan selisih skema.

*Rollback* menolak berjalan bila sudah ada lebih dari satu sekolah, ada akun Super Admin, atau ada tanggal di luar WITA. Ini mencegah data sekolah lain tercampur ke skema satu sekolah.

## 10. Belum dibuat / batasan

| Hal | Keterangan |
|---|---|
| Tagihan & langganan | Kolom *Paket* sudah ada; integrasi pembayaran belum ada |
| Pendaftaran sekolah mandiri | Sekolah dibuat Super Admin (CMS atau `npm run sekolah:baru`) |
| Domain otomatis di Vercel | Domain sekolah masih ditambahkan manual di Vercel → Domains (atau pakai wildcard subdomain) |
| SMTP per sekolah | Satu SMTP platform; alamat penerima per sekolah |
| Backup per sekolah | `BACKUP_TENANT=<kode> npm run backup:prod` mengekspor satu sekolah; restore per sekolah belum ada |
| Cache & rate limit | Per instance server (perubahan domain/status sekolah berlaku ≤ 60 detik) |
| Tautan internal di rich text | Hanya bisa menunjuk dokumen sekolah sendiri saat ditampilkan; tautan ke dokumen sekolah lain tidak dirender |
| Alamat tak dikenal | Menampilkan halaman "tidak ditemukan" dengan status 200 + `noindex` |
| Paket konten awal | Hanya untuk KPS; sekolah baru mulai kosong |

## 11. Pengujian

`npm test`: **115 tes lulus**, terdiri dari 85 tes lama (kini berjalan di sekolah uji sementara) dan 30 tes isolasi baru `tests/int/tenancy.int.spec.ts` (TEN-01..10).

Tes isolasi memakai dua sekolah (WITA/Pro dan WIB/Basic) dan memeriksa:

- REST publik per host, termasuk host asing;
- staf sekolah A terhadap data sekolah B (baca, ubah, hapus, pindah, relasi gambar);
- data calon orang tua;
- akun dan login lintas sekolah;
- Payload ber-tenant dengan `overrideAccess`;
- pencarian dan endpoint publik;
- fitur dan paket;
- audit, Super Admin, sekolah ditangguhkan;
- provisioning sekolah baru.

*Kontrol negatif*: bila pembatasan sekolah di aturan akses dimatikan, 10 tes isolasi gagal. Artinya tes ini benar-benar menguji isolasi.
