# Brief Implementasi Website & CMS SMP Nasional KPS

Versi 1.0 · 25 Oktober 2026 · Bahasa antarmuka: Indonesia · Zona waktu: Asia/Makassar (Balikpapan)

## 1. Instruksi utama untuk Claude

Bangun website sekolah SMP Nasional KPS dengan CMS yang benar-benar berfungsi. Gunakan brief ini sebagai spesifikasi produk, desain, konten, pengujian, dan serah terima. Jangan berhenti pada landing page atau dashboard admin dekoratif. Kerjakan bertahap sampai halaman publik terhubung ke data CMS, hak akses berjalan, dan pengujian penting lulus.

Sebelum mengubah proyek:

1. Baca README, instruksi repository, konfigurasi aplikasi, dan struktur database yang sudah ada.
2. Jika proyek sudah memiliki stack, authentication, dan CMS yang layak, pertahankan serta perluas. Jangan mengganti stack atau menghapus data tanpa alasan dan persetujuan yang jelas.
3. Jika proyek baru, gunakan baseline arsitektur di Bagian 12. Periksa dokumentasi resmi untuk versi paket yang kompatibel ketika implementasi.
4. Baca `assets-manifest.json`, katalog gambar, `PETA_GAMBAR.md`, dan `README_MULAI_DI_SINI.md`.
5. Buat rencana singkat, kemudian implementasikan. Pilih keputusan teknis rutin secara mandiri. Catat data yang belum tersedia tanpa mengarangnya.
6. Simpan progres pekerjaan, keputusan, dan pekerjaan tersisa dalam `IMPLEMENTATION_STATUS.md` agar pekerjaan dapat dilanjutkan antarsesi.
7. Jalankan lokal/staging terlebih dahulu. Migrasi database produksi, pengalihan domain, dan publikasi harus mengikuti otorisasi pemilik proyek.

**Hasil yang diminta:** website modern, menarik, informatif, cepat, nyaman di HP, serta dapat dikelola staf sekolah tanpa mengedit kode. Foto produksi berasal dari aset website resmi yang dilampirkan, bukan foto AI dalam ilustrasi konsep sebelumnya.

## 2. Tujuan dan kelompok pengguna

| Pengguna | Kebutuhan utama | Jalur yang harus jelas |
|---|---|---|
| Calon orang tua/siswa | Mengenal sekolah, program, lingkungan, fasilitas dan pendaftaran | Beranda → Pembelajaran/Profil → Pendaftaran |
| Orang tua/siswa aktif | Pengumuman, agenda, panduan, perpustakaan dan portal | Beranda → Akses Cepat → Layanan |
| Alumni | Menemukan jejaring dan portal alumni | Alumni → Portal Alumni |
| Guru/staf | Memperbarui konten secara aman | Admin → Draf → Review → Terbit |
| Masyarakat | Berita, prestasi, kontak dan informasi publik | Menu/Pencarian → Detail konten |

Ukuran keberhasilan produk: pengunjung dapat menemukan layanan penting dalam maksimal dua langkah navigasi dari beranda; editor dapat mengganti hero, menulis berita, dan menerbitkan pengumuman tanpa bantuan programmer; informasi kedaluwarsa tidak lagi muncul sebagai informasi aktif.

Website publik ini tidak mencakup pembangunan sistem nilai, rapor, pembayaran, absensi, database siswa, atau sistem pendaftaran lengkap. Sistem tersebut ditautkan sebagai layanan terpisah. Portal alumni dapat ditautkan ke aplikasi yang sudah ada; database alumni tidak dibuat ulang di CMS publik.

## 3. Fakta, usulan, dan data yang perlu dikonfirmasi

Sumber primer: https://smp.kps.sch.id/home/ dan halaman terkait. Tanggal pemeriksaan: 25 Oktober 2026.

| Data | Status/penggunaan |
|---|---|
| Nama SMP Nasional KPS | Terlihat pada website resmi; gunakan konsisten |
| Kota Balikpapan | Terlihat pada berita sekolah; zona waktu WITA |
| “Berakhlak Mulia, Berwawasan Lingkungan, dan Berbudaya Nasional” | Teks pada website resmi; jadikan nilai utama |
| Pendaftaran tahun ajaran 2026/2027 | Terlihat di website lama; bukan bukti penerimaan masih dibuka hari ini |
| https://kps.sch.id/ppdb | Tautan pendaftaran HTTPS terlihat pada beranda lama; uji dan konfirmasi status sebelum tombol produksi aktif |
| Nama/jabatan pimpinan | Dapat dibaca dari snapshot sumber; wajib dikonfirmasi ulang untuk publikasi baru |
| Jumlah siswa/guru, akreditasi, tahun berdiri, biaya | Belum diverifikasi; jangan isi angka perkiraan |
| “Tempat Bertumbuh, Berkarya, dan Berprestasi.” | Copy desain usulan, bukan slogan resmi |
| Alamat lengkap, telepon, email, jam layanan, media sosial | Ambil hanya dari sumber resmi yang jelas, lalu konfirmasi sekolah |
| URL portal sekolah, URL alumni | Belum ditetapkan dalam brief; simpan konfigurasi kosong dan sembunyikan tombol yang belum memiliki tujuan |

Tanggal unggah berkas bukan otomatis tanggal kegiatan. Nama file bukan bukti isi gambar. Gambar dengan kata `Generated` pada nama tidak otomatis merupakan dokumentasi kegiatan asli; perlakukan terpisah sampai diverifikasi.

Snapshot teks di folder `sources/` adalah bahan pemeriksaan/migrasi, bukan artikel yang boleh langsung diterbitkan tanpa penyuntingan. Brief bukan audit menyeluruh instalasi WordPress lama.

## 4. Arah desain

Konsep: **sekolah yang hidup, hangat, tertata, dan menginspirasi**. Ambil keteraturan akses layanan dari Grand Asia Afrika, kemudian pusatkan cerita visual pada pembelajaran dan kehidupan siswa.

### 4.1 Token desain

| Token | Nilai awal | Pemakaian |
|---|---|---|
| `brand.navy` | `#142A46` | Heading, footer, bagian prestasi |
| `brand.teal` | `#167467` | Tombol utama, ikon, tautan |
| `brand.gold` | `#D5AF54` | Aksen pendaftaran; gunakan teks navy agar kontras |
| `surface.white` | `#FFFFFF` | Latar utama |
| `surface.ivory` | `#F7F4EC` | Pergantian section |
| `surface.tealSoft` | `#EAF5F2` | Kartu agenda/panduan |
| `text.primary` | `#172B3A` | Isi utama |
| `text.secondary` | `#526170` | Keterangan |
| `border` | `#DFE6EB` | Pembatas/kartu |

Palet ini usulan desain, bukan klaim warna identitas resmi. Cocokkan dengan logo dan pedoman sekolah saat tersedia. Jangan mengubah warna logo resmi agar menyesuaikan palet.

- Maksimal dua keluarga font; usulan heading Plus Jakarta Sans dan body Inter, dengan system fallback. Periksa lisensi serta host font lokal bila memungkinkan.
- Container desktop maksimal 1200–1280 px; padding horizontal mobile 20 px.
- Heading hero desktop sekitar 48–60 px, mobile 32–38 px; body 16–18 px, line height 1.5–1.7.
- Jarak section desktop sekitar 64–88 px, mobile 40–56 px. Grid/gap konsisten 16/24/32 px.
- Kartu radius 12–16 px; border lembut; shadow tipis. Jangan semua blok dibuat menjadi kartu.
- Foto tampil dominan dan relevan; jangan memakai foto kegiatan ibadah sebagai representasi semua program akademik.
- Animasi halus 150–250 ms, menghormati `prefers-reduced-motion`.
- Tidak memakai carousel autoplay yang panjang, pop-up promosi saat pertama masuk, musik otomatis, atau video autoplay.
- Jangan meraster seluruh mockup menjadi halaman. Bangun elemen HTML semantik dan komponen responsif.

### 4.2 Responsif

- Mobile <768 px: hero satu kolom; foto tetap terlihat; akses cepat grid 2–3 kolom; konten 1 kolom; menu drawer dengan focus trap dan tombol tutup.
- Tablet 768–1023 px: kartu 2 kolom; menu disesuaikan agar tidak menumpuk.
- Desktop ≥1024 px: hero dua area visual; menu ringkas; kartu 3–4 kolom.
- Header sticky diperbolehkan jika tidak menutupi konten/anchor; tinggi mobile tetap ringkas.
- Tombol penting minimal sekitar 44×44 px; elemen tidak bergeser saat gambar dimuat.
- Uji lebar 360, 390, 768, 1024 dan 1440 px. Tidak ada horizontal overflow.

## 5. Sitemap dan navigasi

Menu desktop: **Tentang KPS · Pembelajaran · Kehidupan Siswa · Prestasi · Informasi · Kontak**. Tombol: **Portal Sekolah** (jika URL tersedia) dan **Pendaftaran**. Pada lebar terbatas, gabungkan Prestasi di submenu Kehidupan Siswa tanpa menghilangkan aksesnya.

| Rute | Isi |
|---|---|
| `/` | Beranda |
| `/tentang` | Profil, ringkasan sejarah, nilai, fasilitas |
| `/tentang/sejarah` | Sejarah sekolah |
| `/tentang/visi-misi` | Visi dan misi resmi |
| `/tentang/pimpinan-guru` | Pimpinan dan guru aktif |
| `/tentang/fasilitas` | Daftar fasilitas |
| `/tentang/fasilitas/[slug]` | Detail fasilitas dan foto |
| `/pembelajaran` | Pendekatan dan daftar program |
| `/pembelajaran/[slug]` | Detail program |
| `/kehidupan-siswa` | Kegiatan, karya, organisasi siswa, ekstrakurikuler |
| `/ekstrakurikuler/[slug]` | Detail kegiatan ekstrakurikuler |
| `/prestasi` dan `/prestasi/[slug]` | Daftar/filter dan detail prestasi |
| `/informasi` | Hub kategori informasi |
| `/berita` dan `/berita/[slug]` | Daftar, pencarian, kategori dan artikel |
| `/pengumuman` dan `/pengumuman/[slug]` | Informasi resmi aktif dan arsip |
| `/agenda` dan `/agenda/[slug]` | Kalender/list dan detail kegiatan |
| `/galeri` dan `/galeri/[slug]` | Album foto/video |
| `/unduhan` | Dokumen publik, kategori, periode dan versi |
| `/transparansi-bos` | Dokumen BOS yang disetujui publikasi |
| `/panduan` dan `/panduan/[slug]` | Panduan sekolah/layanan |
| `/layanan` | Tautan aplikasi, perpustakaan, rapor, portal |
| `/alumni` | Pengantar jejaring alumni, cerita yang disetujui, tautan portal |
| `/pendaftaran` | Tahun ajaran, status, alur, persyaratan, FAQ dan kontak |
| `/kontak` | Kontak resmi, lokasi, jam layanan, form pesan |
| `/cari?q=` | Hasil pencarian konten publik |
| `/kebijakan-privasi` | Pemberitahuan penggunaan data dan form |
| `/admin` | CMS terautentikasi |

Breadcrumb untuk halaman turunan; paginasi list; halaman 404 informatif; empty state berguna. Setiap menu/CTA harus memiliki tujuan nyata atau disembunyikan jika belum dikonfigurasi. Jangan memakai `href="#"` sebagai tombol selesai.

## 6. Spesifikasi beranda dari atas ke bawah

| Urutan/ID blok | Isi dan copy awal | Sumber data/perilaku |
|---|---|---|
| 01 `site-header` | Logo resmi, nama sekolah, navigasi, portal dan pendaftaran | Global settings + navigation |
| 02 `priority-announcement` | Satu informasi prioritas aktif, label “Penting”, tautan detail | Pengumuman published, dalam periode tampil, prioritas tertinggi; tidak ada = tidak dirender |
| 03 `hero` | Eyebrow “Selamat Datang di SMP Nasional KPS”; judul “Tempat Bertumbuh, Berkarya, dan Berprestasi.”; copy “Mengembangkan pengetahuan, karakter, dan potensi setiap siswa.” | Hero settings; 1 foto kuat; CTA Kenali KPS + Informasi Pendaftaran; gambar terpisah dari teks |
| 04 `quick-links` | Pendaftaran, Kalender Akademik, Pengumuman, Perpustakaan, Alumni, Layanan Sekolah | Enam item CMS; ikon satu sistem; tautan valid |
| 05 `search` | Placeholder “Cari informasi sekolah…” | Search konten published; bukan pencarian data siswa |
| 06 `school-intro` | “Mengenal SMP Nasional KPS”; ringkasan profil; Karakter/Lingkungan/Budaya | Global profil + gambar; angka hanya jika terverifikasi |
| 07 `learning-programs` | “Belajar dengan Makna”; maksimal 3 program unggulan | Featured programs published; judul program contoh perlu dikonfirmasi |
| 08 `student-life` | “Ruang untuk Setiap Potensi”; 4 tile pilihan | Extracurricular/activities; jangan tampilkan program yang belum disahkan |
| 09 `achievements` | “Semangat untuk Berprestasi”; foto dan capaian terverifikasi | Featured achievement; jika belum ada data gunakan ajakan melihat karya tanpa klaim menang |
| 10 `announcements-agenda` | “Pengumuman Sekolah” kiri; “Agenda Terdekat” kanan | Maks. 3 pengumuman aktif dan 3 agenda mendatang; agenda batal diberi status jelas |
| 11 `latest-news` | “Cerita dari KPS”; 3 berita terbaru | Published posts urut tanggal asli, ringkasan dan thumbnail |
| 12 `facilities` | Fasilitas pilihan, 3 kartu jika data/foto tersedia | Facilities; opsional, bisa dinonaktifkan |
| 13 `community-alumni` | “Terhubung dalam Keluarga KPS”; pengantar alumni dan tombol portal | Alumni page/settings; jangan buat testimoni palsu |
| 14 `admissions-cta` | “Mari Mengenal KPS Lebih Dekat”; Informasi Pendaftaran + Hubungi Sekolah | Status penerimaan dan kontak resmi |
| 15 `site-footer` | Nilai sekolah, kontak, jam layanan, tautan penting, privasi, media sosial | Global settings; copyright tahun dinamis |

### Ketentuan editorial beranda

- Jumlah 3–4 kartu adalah batas tampilan, bukan kewajiban mengisi konten fiktif.
- Bagian tanpa konten yang layak disembunyikan, bukan diisi lorem ipsum saat produksi.
- Statistik dan fasilitas tidak wajib muncul jika datanya belum dikonfirmasi.
- Semua headline, deskripsi, foto, CTA, urutan blok dan status aktif dapat dikelola melalui CMS dalam batas template.
- Jangan membiarkan editor memasukkan HTML/script bebas atau mengubah desain dasar per kartu.
- Preview boleh memuat data contoh dengan label jelas dan flag `is_demo`; produksi harus mengecualikannya.

## 7. Template halaman detail

### 7.1 Berita

Judul, ringkasan, kategori, tanggal publikasi asli, nama penulis publik bila disetujui, cover, teks rich text terstruktur, caption gambar, galeri tambahan, sumber bila hasil migrasi, serta tiga berita terkait. Maksimal satu H1; struktur H2/H3 rapi. Tombol berbagi hanya membagikan URL publik.

### 7.2 Pengumuman

Judul, sasaran (umum/orang tua/siswa/alumni), kategori, tanggal terbit, periode efektif, status aktif/berakhir, isi, lampiran publik dan kontak terkait. Arsip boleh tetap diakses melalui URL dengan badge “Sudah berakhir”; jangan diam-diam menghapus URL yang telah dibagikan.

### 7.3 Agenda

Nama, awal/akhir, opsi all-day, lokasi publik, penyelenggara, ringkasan, status scheduled/postponed/cancelled/completed. Simpan timestamp UTC; tampilkan WITA dan tanggal lokal; agenda seharian memakai date-only agar tidak bergeser. Tautan unduh ICS dengan timezone yang benar. Pendaftaran kegiatan hanya ditampilkan jika tautannya valid.

### 7.4 Program, ekstrakurikuler dan fasilitas

Judul, manfaat, deskripsi, foto asli, galeri, penanggung jawab/jadwal yang memang layak dipublikasikan, tautan terkait. Bedakan fasilitas yang ada, sedang direnovasi, dan rencana; jangan tampilkan rencana sebagai fasilitas tersedia.

### 7.5 Prestasi

Nama capaian, penerima sesuai persetujuan publikasi, kategori, tingkat, penyelenggara, tanggal/tahun, uraian, foto dan bukti internal. Bukti internal tidak otomatis publik. Filter tahun, tingkat dan kategori; pemenang tidak boleh disimpulkan hanya dari foto piala.

### 7.6 Pendaftaran

Tahun ajaran; status belum dibuka/dibuka/ditutup; jadwal gelombang; alur; syarat; biaya jika disetujui; FAQ; kontak; CTA ke sistem resmi. Status tidak dihitung hanya dari banner lama. Hindari pengumpulan dokumen calon siswa pada website publik jika sistem resmi sudah menanganinya. Bila URL kosong/tidak valid, tampilkan kontak informasi yang valid, bukan tombol rusak.

### 7.7 Kontak dan pesan

Nama, email/telepon (minimal satu kanal balasan), kategori, pesan, persetujuan penggunaan data; kirim ke inbox admin yang privat. Setelah berhasil: nomor referensi/konfirmasi singkat. Jangan mengirim detail pesan ke analytics. Siapkan kebijakan retensi yang disetujui sekolah; belum ada keputusan = dicatat sebagai pekerjaan sebelum produksi. Kanal WhatsApp hanya dari nomor resmi yang terverifikasi, tidak mengarang nomor.

## 8. CMS: modul dan formulir

Sidebar CMS: Dashboard; Konten; Akademik & Kehidupan Siswa; Media; Pendaftaran; Pesan Masuk; Navigasi; Pengaturan; Pengguna & Akses; Audit.

| Modul | Field khusus wajib/penting |
|---|---|
| Global sekolah | Nama, logo, nilai, kontak, jam layanan, alamat/peta, URL portal, URL alumni, sosial |
| Beranda | Blok typed, urutan, aktif, judul, deskripsi, relasi featured, CTA, gambar desktop/mobile, focal point |
| Halaman | Judul, slug, template, body blocks, cover, SEO |
| Guru/pimpinan | Nama, jabatan, foto, bio, urutan, status aktif, persetujuan publikasi |
| Program | Nama, slug, ringkasan, tujuan/manfaat, isi, cover/galeri, featured |
| Ekstrakurikuler | Nama, ringkasan, isi, pembina publik, jadwal publik, cover/galeri, aktif |
| Fasilitas | Nama, kategori, ringkasan, status, cover/galeri, featured |
| Berita | Judul, slug, excerpt, body, kategori, cover, penulis, published_at asli, source_url |
| Pengumuman | Judul, isi, sasaran, prioritas, display_start, display_end, lampiran |
| Agenda | Judul, start/end, all_day, timezone, lokasi, status, isi, link |
| Prestasi | Judul, kategori/tingkat, tahun, penerima publik, penyelenggara, foto, bukti privat |
| Album/galeri | Judul, tanggal kegiatan, cover, daftar media/caption, persetujuan publikasi |
| Unduhan/BOS | Judul, kategori, periode/tahun, nomor versi, deskripsi, file publik, tanggal persetujuan |
| Pendaftaran | Tahun ajaran, status, gelombang, jadwal, syarat, alur, biaya opsional, FAQ, URL daftar |
| Panduan | Judul, kategori, langkah, isi, lampiran, last_reviewed_at |
| Layanan | Nama, ringkasan, ikon, URL, internal/external, urutan, aktif |
| Testimoni/cerita alumni | Nama publik, peran/angkatan jika disetujui, teks, foto, consent, status |
| Media | File, alt, caption, source_url, source_page, tanggal unduh, lisensi/otorisasi, consent, focal point |
| Menu | Lokasi, label, destination, parent, urutan, aktif, external |
| Pesan masuk | Kontak pengirim, kategori, isi, status, assigned_to, catatan privat |

Semua konten publik: ID, created_at, updated_at, created_by, updated_by, status, published_at, archived_at, revision. Gunakan field type-safe dan validation server-side. Slug unik dalam collection; konflik tampil sebagai pesan, bukan overwrite. Gambar hero wajib alt atau secara eksplisit dekoratif, focal point dan preview mobile. Field URL hanya menerima skema yang diizinkan (`https`, link internal; pengecualian mailto/tel terkontrol).

### Pengalaman staf

- Formulir berbahasa Indonesia dengan petunjuk, contoh, counter panjang judul/ringkasan, dan pesan validasi yang jelas.
- Tombol “Simpan Draf”, “Pratinjau”, “Ajukan Review”, “Terbitkan” muncul sesuai peran/status.
- Berita dapat disalin menjadi draf baru; jangan menggandakan slug atau tanggal secara salah.
- Filter daftar: jenis, status, penulis, kategori, periode. Bulk archive hanya sesuai izin.
- Gambar yang dipakai beberapa halaman memiliki daftar penggunaan; penghapusan media yang masih dipakai diblokir atau diarahkan ke penggantian aman.
- Editor bisa mengatur urutan blok, tetapi tidak memasukkan script atau stylesheet.
- Setiap perubahan terbit mencatat revisi; restore membuat versi baru, bukan menghapus sejarah.

## 9. Hak akses dan alur publikasi

| Kemampuan | Admin teknis | Editor/Humas | Kontributor | Petugas pendaftaran |
|---|---|---|---|---|
| Akun, role, konfigurasi teknis | Ya | Tidak | Tidak | Tidak |
| Ubah profil, menu, beranda | Ya | Ya | Tidak | Tidak |
| Buat/edit draf berita sendiri | Ya | Ya | Ya | Terbatas konten penerimaan |
| Ubah konten orang lain | Ya | Ya | Tidak | Tidak |
| Review dan publish umum | Ya | Ya | Tidak | Tidak |
| Kelola modul pendaftaran | Ya | Ya | Tidak | Ya sesuai izin |
| Publish pendaftaran | Ya | Ya | Tidak | Hanya jika izin eksplisit diberikan |
| Pesan masuk | Ya | Sesuai tugas | Tidak | Hanya kategori pendaftaran |
| Audit/revisi | Ya | Konten editorial | Konten sendiri | Modulnya |
| Hapus permanen/restore | Ya | Tidak | Tidak | Tidak |

**State:** `draft → in_review → scheduled/published → archived`. Reviewer boleh mengembalikan ke draft dengan alasan. Kontributor tidak boleh publish melalui API langsung. Materi terbit yang sedang diedit tetap menampilkan versi terbit terakhir sampai revisi baru disetujui; jangan bocorkan draf.

Scheduled konten hanya publik jika status dan waktunya valid. Gunakan scheduler/cron idempotent plus filter query publik; scheduler yang tertunda tidak boleh menyebabkan pengumuman kedaluwarsa tetap aktif. Preview menggunakan token berumur singkat, noindex dan no-store, serta hanya untuk editor yang berhak.

## 10. Model data dan relasi

Nama tabel dapat disesuaikan konvensi framework; struktur berikut merupakan kontrak logis. Gunakan migrasi versioned, bukan membuat tabel manual.

| Entitas | Relasi/aturan |
|---|---|
| users, roles/permissions | Akun admin individual, role terkontrol server |
| pages, page_blocks | Halaman memiliki typed blocks terurut; whitelist jenis blok |
| posts, categories, post_categories | Berita memiliki banyak kategori; slug unique |
| announcements | Periode tampil, sasaran, prioritas; lampiran relasi media |
| events | UTC timestamps/date-only, status; validasi end >= start |
| programs, extracurriculars, facilities | Cover dan galeri relasi media |
| staff | Foto relasi media, jabatan dan urutan |
| achievements | Cover publik dan bukti privat terpisah |
| albums, album_items | Banyak media dengan caption dan urutan |
| documents | Metadata versi dan media publik; kategori BOS |
| admissions_cycles, admissions_waves, faqs | Siklus punya gelombang; jangan campurkan jadwal antartahun ajaran |
| guides, services | Konten panduan dan tautan layanan |
| media | Storage key, mime, ukuran, dimensi, alt, sumber, checksum, akses publik/privat |
| navigation_items | Parent self-reference; batasi kedalaman dan cegah siklus |
| site_settings, homepage_settings | Singleton globals, versioned |
| contact_messages | Privat, status, assignee; retensi sesuai kebijakan |
| revisions, audit_logs | Pelaku, objek, aksi, waktu; jangan menyimpan secret/token |
| redirects | old_path unik → new_path; validasi cegah loop/open redirect |

Tambahkan indeks slug, status+published_at, announcement display_start/end, event start_at, document period, category joins dan foreign keys. Gunakan transaksi saat publish + revisi + audit. Relasi media menggunakan ID, bukan salinan string URL di setiap konten. File privat tidak boleh tersedia lewat URL publik permanen.

Contoh struktur typed beranda:

```json
{
  "hero": {
    "eyebrow": "Selamat Datang di SMP Nasional KPS",
    "title": "Tempat Bertumbuh, Berkarya, dan Berprestasi.",
    "description": "Mengembangkan pengetahuan, karakter, dan potensi setiap siswa.",
    "imageId": "<id-media-resmi>",
    "focalPoint": { "x": 65, "y": 45 },
    "primaryAction": { "label": "Kenali KPS", "href": "/tentang" },
    "secondaryAction": { "label": "Informasi Pendaftaran", "href": "/pendaftaran" }
  },
  "sections": [
    { "type": "quickLinks", "enabled": true, "order": 1 },
    { "type": "schoolIntro", "enabled": true, "order": 2 },
    { "type": "programs", "enabled": true, "order": 3, "limit": 3 }
  ]
}
```

Contoh berisi placeholder ID: jangan mengimpor literal `<id-media-resmi>` sebagai data produksi.

## 11. Kontrak API dan query publik

Gunakan API CMS bawaan bila memadai; jangan menggandakan API dengan perilaku berbeda. Contoh semantik endpoint:

- `GET /api/public/home`: hanya field publik dan konten yang sudah berlaku.
- `GET /api/public/posts?category=&page=&q=`: pagination dibatasi, urut publish menurun.
- `GET /api/public/posts/:slug`: 404 untuk draft/privat; URL arsip mengikuti kebijakan.
- `GET /api/public/announcements?active=true`: periode tampil dan status benar.
- `GET /api/public/events?from=&to=`: rentang dibatasi, timezone jelas.
- `GET /api/public/search?q=&type=&page=`: whitelist collection, panjang query dibatasi; tidak mengindeks pesan, bukti privat, akun atau draf.
- `POST /api/contact`: validation, anti-spam dan rate limit, hasil generik aman.
- Mutasi admin memerlukan sesi dan permission server-side per objek/per field; menyembunyikan tombol tidak cukup.

Query publik memakai whitelist field; hindari serialisasi seluruh record pengguna/metadata internal. Semua hasil paginated; tidak ada unlimited fetch. Jika memakai cache, invalidasi saat publish, unpublish, perubahan media dan perubahan menu. Terapkan batas usia cache untuk konten berbatas waktu; jangan menunggu editor membuka halaman agar expiry berjalan.

## 12. Arsitektur implementasi

Rekomendasi konsep awal sebelumnya adalah WordPress terstruktur. Paket ini juga dapat dijalankan sebagai proyek custom untuk Claude. Pilihan **bukan keputusan final mengganti sistem sekolah**.

### Default jika repository baru dan hosting mendukung Node

- Next.js + TypeScript untuk frontend SSR/SSG dan routing.
- Payload CMS untuk admin, collections, globals, authentication, revisions dan access control.
- PostgreSQL untuk konten/metadata; object storage kompatibel S3 untuk media produksi.
- CSS terstruktur/Tailwind dan satu sistem komponen accessible; ikon konsisten.
- Search awal memakai query/index database atau fasilitas CMS yang memadai; tidak perlu Elasticsearch untuk skala awal.
- Job scheduler untuk publish/expiry, backup dan tugas berkala; bukan timer pada browser.
- Email provider untuk notifikasi form bila dikonfigurasi; inbox admin tetap sumber utama, sehingga kegagalan email tidak menghilangkan pesan.

Periksa kompatibilitas versi stabil di dokumentasi resmi ketika coding. Pin dependensi dan sertakan lockfile. Jangan menaruh secret dalam source/client bundle. Jangan menjanjikan deployment pada shared hosting PHP jika aplikasi memerlukan Node/PostgreSQL.

### Alternatif bila mempertahankan hosting WordPress

Implementasikan desain sebagai theme khusus dan plugin fitur sekolah: custom post types, taxonomy, custom fields, blok terstruktur, role/capability, revisi, scheduled publish dan expiry. Hindari page builder bebas dengan banyak add-on. Pastikan plugin yang dipilih mendukung kebutuhan review, private media dan backup; jangan menganggap semua tersedia bawaan. Hanya pilih satu arsitektur utama setelah memeriksa proyek/hosting, bukan membangun dua sistem sekaligus.

### Struktur folder usulan untuk custom

```text
src/
  app/                 # public routes + admin integration sesuai konvensi CMS
  components/          # layout, ui, sections, content, forms
  collections/         # schema CMS
  globals/             # school, homepage, navigation, admissions settings
  access/              # permission policies
  hooks/               # audit, cache invalidation, media lifecycle
  lib/                 # query publik, tanggal WITA, SEO, validasi
  jobs/                # scheduling dan expiry
  migrations/
scripts/               # import aset/konten idempotent dan backup helper
public/                # aset publik statis terpilih, tidak berisi dokumen privat
tests/                 # unit/integration/e2e prioritas
```

## 13. Pemakaian gambar resmi yang disertakan

Gunakan file lokal dalam paket. **Jangan hotlink ke server sekolah pada website baru.** `assets/original/` mempertahankan berkas sumber; `assets/web/` menyediakan varian WebP untuk foto. Logo gunakan file transparan asli, bukan varian WebP RGB jika alpha berubah.

Baca `PETA_GAMBAR.md` untuk pemilihan dan `assets-manifest.json` untuk URL sumber, halaman sumber, dimensi, checksum dan jejak unduh. `Katalog_Gambar_*.jpg` adalah lembar pemilihan internal, bukan foto yang diunggah sebagai hero.

Aturan:

1. Gunakan foto besar horizontal untuk hero jika isi dan ketajamannya memadai; jangan memperbesar thumbnail menjadi banner 1920 px.
2. Simpan original; buat turunan AVIF/WebP, responsive widths sekitar 480/768/1200/1920 sesuai kebutuhan dan dimensi sumber. Jangan upscale melebihi resolusi asli.
3. Hero boleh memakai komposisi split background warna + foto bila foto tidak cocok dipotong 3:1.
4. Simpan focal point; wajah siswa tidak terpotong di mobile. Preview crop sebelum publish.
5. Hapus metadata lokasi sensitif dari file turunan publik; jangan mengubah original arsip.
6. Alt menggambarkan adegan yang benar-benar terlihat, bukan nama file. Hindari menyimpulkan identitas siswa dari wajah.
7. Materi lama tetap memakai tanggal lama; jangan mengganti label tahun agar terlihat baru.
8. Poster penerimaan dan hari besar hanya digunakan sesuai periode/konteks; bukan hero evergreen.
9. Foto pimpinan digunakan di profil pimpinan sesuai urutan/nama yang diverifikasi, bukan sebagai testimoni alumni.
10. Jika tidak ada foto relevan untuk program/fasilitas tertentu, sembunyikan gambar/blok atau minta foto tambahan. Jangan memalsukan fasilitas melalui gambar AI.
11. Publikasi ulang foto anak tetap mengikuti persetujuan sekolah. Ketersediaan publik bukan bukti lisensi bebas. Paket ini ditujukan untuk perancangan ulang situs sekolah yang sama, bukan distribusi aset untuk proyek pihak lain.
12. Proses import membuat satu record media per checksum; jangan upload duplikat setiap seed dijalankan. Catat `source_url`, `source_page`, `original_filename`, `downloaded_at`, `sha256` dan status review.

Ukuran target produksi yang dioptimalkan: hero sekitar 200–400 KB jika kualitas memungkinkan; kartu sekitar 60–150 KB; logo tetap tajam. Angka adalah sasaran optimasi, bukan alasan menurunkan keterbacaan/merusak foto. Hero `eager`/priority; gambar di bawah fold lazy-load. Semua `<img>` mempunyai dimensi/aspect-ratio.

## 14. Strategi konten dan migrasi

- Inventarisasi seluruh URL penting dari situs lama, tidak hanya halaman yang dipakai mengambil gambar.
- Pisahkan konten evergreen, berita historis, pengumuman aktif, arsip dan materi yang perlu koreksi.
- Pertahankan judul, tanggal asli, konteks dan sumber. Periksa nama orang sebelum publikasi.
- Snapshot `sources/` membantu inventarisasi awal; bukan bukti migrasi seluruh situs selesai.
- Migrasi bertahap, dry-run, laporan jumlah record, duplikat dan gagal. Jalankan ulang tanpa menduplikasi.
- Buat tabel redirect lengkap old_path → new_path setelah inventarisasi. Contoh `/home/profil/` → `/tentang`; `/home/berita/` → `/berita`; `/home/fasilitas/` → `/tentang/fasilitas`; `/home/prestasi/` → `/prestasi`; `/home/kontak/` → `/kontak`.
- Redirect artikel harus per slug nyata. Jangan mengalihkan semua artikel lama ke beranda.
- Periksa konflik antara prefix `/home/` lama dengan path sistem baru. Terapkan 301 hanya saat cutover disetujui.
- Konten lama yang belum dimigrasi tetap tersedia/diarsipkan sesuai rencana; jangan mematikan domain lama sebelum backup dan verifikasi.
- Seed berita hanya menggunakan artikel resmi yang benar-benar tersedia; jangan memproduksi artikel kemenangan/kegiatan fiktif.
- Program “Pembelajaran Aktif”, “Sains & Teknologi”, “Karakter & Kepedulian” dalam mockup adalah label desain usulan; perlu validasi editorial sebelum dianggap program resmi.

## 15. SEO, aksesibilitas dan performa

### SEO

Title/deskripsi per halaman, canonical konsisten, Open Graph, sitemap hanya URL publik terbit, robots, slug ramah, redirect, alt dan breadcrumb. Structured data School/Organization, Article, Breadcrumb dan Event hanya memakai fakta nyata. Jangan membuat review/rating fiktif. Admin, preview, pencarian internal dan staging diberi aturan noindex yang sesuai; staging juga dibatasi akses bila memuat draf. Sitemap dan metadata tidak boleh membocorkan draft atau file privat.

### Aksesibilitas

Target WCAG 2.2 AA untuk alur utama. Skip link, landmark semantic, fokus terlihat, navigasi keyboard, label form, aria seperlunya, error terhubung field, status tidak dibedakan warna saja. Uji kontras token dan tombol emas dengan teks navy. Foto dekoratif alt kosong; foto informatif alt bermakna. Caption video jika tersedia; tidak autoplay audio. Dialog/drawer menjaga fokus dan mengembalikan fokus saat ditutup.

### Performa

Target setelah data nyata: LCP ≤2,5 detik, CLS ≤0,1, INP ≤200 ms untuk p75 ketika data lapangan tersedia. Sebelum launch, gunakan Lighthouse sebagai pemeriksaan laboratorium, bukan bukti p75. Sasaran awal mobile Performance ≥85 dan Accessibility ≥95 dengan pemeriksaan manual tetap wajib. Catat perangkat, jaringan, URL, konten dan kondisi test. Hindari embed YouTube/peta berat sebelum pengguna berinteraksi; gunakan poster/tautan. Cache halaman publik, responsive image, font subset, loading seperlunya. Jangan memuat semua album foto sekaligus.

## 16. Keamanan dan operasional

- Akun admin individual; password kuat; dukung MFA sesuai stack. Tidak ada kredensial default yang ditanam di source/README publik.
- Rate limit login dan form; proteksi enumerasi; session cookie secure, HttpOnly, SameSite; CSRF sesuai framework.
- Validasi input server-side, sanitasi rich text, query parameterized, cek authorization per operasi dan objek; jangan mengandalkan client-side.
- Upload whitelist mime+signature, ukuran, dimensi; reject executable dan SVG berbahaya, strip metadata pada turunan publik, nama storage acak. Dokumen rahasia terpisah dari storage publik.
- Preview dan draft tidak tersedia publik melalui REST, GraphQL, search, sitemap, storage atau cache.
- Security headers/CSP yang sesuai, TLS, pembaruan dependensi, secrets manager/env; log tanpa password, token, isi dokumen privat.
- Pesan kontak hanya dapat diakses role berwenang; masking data di log/notifikasi; anti-spam tanpa CAPTCHA agresif jika kontrol sederhana cukup.
- Backup database + media + konfigurasi; enkripsi dan retensi ditetapkan pengelola. Usulan awal RPO 24 jam, RTO 4 jam, **target operasional yang harus disepakati dan diuji**, bukan jaminan otomatis.
- Uji restore ke lingkungan terpisah; keberhasilan membuat backup belum membuktikan bisa dipulihkan.
- Health check, error reporting, uptime monitor, pemberitahuan job gagal; jangan mengekspos stack trace ke pengunjung.
- Soft delete/arsip dan restore; hindari menghapus media yang sedang dipakai.
- Tidak ada data siswa/rapor/identitas calon siswa di public repository atau seed demo.

## 17. Tahapan kerja dan hasil per tahap

| Tahap | Pekerjaan | Bukti selesai |
|---|---|---|
| 0 Discovery | Periksa repo, hosting, domain, akun CMS, data dan aset | Keputusan stack, gap data, daftar risiko nyata |
| 1 Foundation | Struktur proyek, tokens, layout, DB, auth, permission | Build jalan; login/akses teruji |
| 2 Media & CMS inti | Collections, globals, media importer, revisi | Editor membuat draf dan unggah gambar |
| 3 Halaman publik | Beranda dan template terhubung CMS | Edit CMS terlihat setelah publish |
| 4 Editorial & layanan | Workflow, expiry, search, agenda, form, pendaftaran/alumni links | Alur nyata end-to-end berfungsi |
| 5 Migrasi | Dry-run, import terpilih, redirect map, review data | Laporan import dan source mapping |
| 6 QA | Functional, access, responsive, performance, security, restore | Checklist dan hasil dengan bukti |
| 7 Serah terima | Manual staf, env example, deployment/runbook, training | Staf berhasil simulasi tanpa kode |
| 8 Cutover | Backup terakhir, persetujuan, deploy, DNS/redirect sesuai otorisasi | Smoke test produksi dan rollback siap |

Jangan menyatakan semua selesai jika database hanya mock/localStorage, tombol belum memiliki tujuan, form tidak menyimpan, atau admin hanya tampilan. Jika layanan eksternal belum dikonfigurasi, tandai jelas dengan langkah pengaktifan, bukan menyembunyikan kegagalan.

## 18. Acceptance test yang wajib

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| CMS-01 | Editor mengganti hero dan CTA | Versi baru muncul setelah publish, crop mobile aman |
| CMS-02 | Kontributor menulis berita | Dapat save/submit; tidak dapat publish via UI maupun API |
| CMS-03 | Pengunjung mengakses URL/API draft | Tidak menerima isi draf; preview tanpa izin ditolak |
| CMS-04 | Edit konten published sebagai draf | Versi publik lama tetap terlihat sampai approval |
| CMS-05 | Publish terjadwal dan expiry | Batas waktu benar dalam WITA; query publik tetap aman bila scheduler terlambat |
| CMS-06 | Restore revisi | Konten pulih sebagai revisi baru; audit tetap ada |
| CMS-07 | Hapus media terpakai | Diblokir/ada alur penggantian; halaman tidak broken |
| CMS-08 | Import aset dua kali | Tidak membuat media duplikat berdasarkan checksum |
| PUB-01 | Semua menu/CTA/list/detail | URL valid; halaman 404/empty state rapi |
| PUB-02 | Cari judul/kata berita | Hasil relevan, paginated; draft/pesan privat tidak muncul |
| PUB-03 | Filter prestasi dan agenda | Tahun/kategori/tanggal/status benar; kosong ditangani |
| PUB-04 | Tidak ada pengumuman prioritas aktif | Strip disembunyikan; tidak menampilkan informasi lama |
| PUB-05 | Penerimaan ditutup/URL belum ada | Tidak menampilkan ajakan “Daftar Sekarang” yang menyesatkan |
| PUB-06 | Portal/alumni URL kosong | Tidak ada tombol rusak; halaman pengantar tetap berguna |
| FORM-01 | Kirim pesan valid | Disimpan sekali, ada sukses, hanya role terkait dapat membaca |
| FORM-02 | Invalid input/spam/email provider gagal | Validasi/rate limit berjalan; pesan tersimpan tidak hilang akibat email gagal |
| SEC-01 | Non-admin mencoba ubah role/settings | Ditolak server; tidak mengubah data |
| SEC-02 | Upload executable/SVG berbahaya/oversize | Ditolak; error aman; tidak ada eksekusi |
| SEC-03 | Input rich text berisi script | Disanitasi/ditolak; tidak terjadi XSS publik/admin |
| SEC-04 | Akses file privat tanpa sesi | Ditolak; signed link bila digunakan kedaluwarsa |
| UX-01 | Keyboard di menu/form/dialog | Fokus urut/terlihat, tidak terjebak, label/error terbaca |
| UX-02 | Lebar 360–1440 px | Tidak overflow; teks terbaca; foto tidak memotong subjek utama |
| SEO-01 | Sitemap/meta/canonical/redirect | Hanya konten publik; tidak ada redirect loop/404 massal |
| OPS-01 | Restore DB+media | Situs dan relasi gambar kembali di staging; durasi dicatat |
| OPS-02 | Build/test/deploy smoke | Tidak ada error fatal; env jelas; rollback terdokumentasi |

Automasi pengujian terutama untuk permission, workflow, batas waktu, form, import idempotent dan query publik. Pemeriksaan visual dan keyboard tetap manual. Simpan hasil di `QA_REPORT.md` dengan pass/fail/blocked, catatan serta bukti, bukan checklist otomatis centang semua.

## 19. Keluaran yang harus diserahkan Claude

1. Source code lengkap dan lockfile.
2. Migrasi database dan seed aman; pemisahan demo/production.
3. Importer media idempotent dari manifest; laporan impor.
4. CMS terhubung dan berfungsi, dengan peran dan contoh workflow.
5. Halaman publik yang responsif dan memakai gambar resmi lokal.
6. `.env.example` tanpa secret; daftar layanan eksternal yang perlu diaktifkan.
7. `README.md` cara install, run, build, migrate dan test.
8. `PANDUAN_ADMIN.md` langkah mengganti hero, berita, pengumuman, agenda, dokumen, pendaftaran dan menu.
9. `DEPLOYMENT_RUNBOOK.md`, backup/restore, rollback dan tugas berkala.
10. `CONTENT_GAPS.md`: fakta/aset/tautan yang belum dikonfirmasi; siapa yang perlu memberi informasi.
11. `MIGRATION_REPORT.md` dan `REDIRECT_MAP.csv`.
12. `QA_REPORT.md` dan `IMPLEMENTATION_STATUS.md`.

Definisi selesai: staf sekolah dapat mengelola konten nyata tanpa kode, konten publik benar, izin teruji, website mudah diakses di HP, gambar resmi terkelola, dan operasionalnya dapat dipelihara.

## 20. Prompt awal siap salin

> Saya melampirkan paket `SMP_KPS_Claude`. Bangun website SMP Nasional KPS beserta CMS berdasarkan `BRIEF_LENGKAP_WEBSITE_SMP_KPS_UNTUK_CLAUDE.md`. Baca README, PETA_GAMBAR dan assets-manifest terlebih dahulu. Gambar produksi memakai file resmi sekolah yang disertakan; mockup sebelumnya hanya acuan komposisi. Periksa repository yang ada dan pertahankan stack layak yang sudah digunakan. Jika proyek baru, jalankan baseline Next.js + TypeScript + Payload CMS + PostgreSQL setelah memeriksa kompatibilitas. Implementasikan bertahap dengan backend, workflow editorial, permission, media dan halaman publik yang benar-benar terhubung. Jangan memakai localStorage sebagai database produksi atau membuat admin dekoratif. Jangan mengarang statistik, akreditasi, biaya, kontak, prestasi atau status pendaftaran. Catat gap konten, lanjutkan pekerjaan independen, uji alur penting, dan simpan progres dalam IMPLEMENTATION_STATUS.md. Mulai dari pemeriksaan proyek dan foundation, lalu lanjutkan hingga hasil dapat diuji lokal/staging.

## 21. Referensi

- Sekolah: https://smp.kps.sch.id/home/
- Profil: https://smp.kps.sch.id/home/profil/
- Fasilitas: https://smp.kps.sch.id/home/fasilitas/
- Prestasi: https://smp.kps.sch.id/home/prestasi/
- Kontak: https://smp.kps.sch.id/home/kontak/
- Referensi keteraturan informasi/layanan: https://www.grandasiaafrika.my.id/
- Sumber gambar individual dan halaman asal: `assets-manifest.json`.

Referensi visual GAA digunakan untuk pola navigasi, akses cepat, pemisahan pengumuman dan kegiatan, serta pintu portal; bukan sumber foto atau identitas untuk KPS.

## 22. Data kontak yang terbaca dari halaman resmi

Halaman https://smp.kps.sch.id/home/kontak/ pada 25 Oktober 2026 menampilkan:

| Field | Nilai dari sumber |
|---|---|
| Alamat | Jl. Sport No.1. Prapatan. Balikpapan |
| Email | smp@kps.sch.id |
| Telepon | 0542 – 421611 |
| Fax | 0542 – 738381 |
| Instagram | @smpnas.kps |
| Kepala sekolah | M. Afcariono, S.Si., M.Pd. |

Data ini **terbaca pada sumber**, belum dibuktikan masih aktif melalui panggilan/email. Masukkan sebagai draf settings untuk diperiksa sekolah. Nomor telepon tidak otomatis merupakan WhatsApp. Jangan membuat link WhatsApp dari nomor tersebut. Alamat peta/koordinat dan jam layanan belum dikonfirmasi. Jadikan email sebagai kandidat kanal kontak setelah persetujuan pemilik situs; jangan mengirim pesan pengujian tanpa otorisasi.
