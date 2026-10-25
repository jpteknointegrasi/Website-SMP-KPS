# Audit Fitur Saat Ini — Addendum P0/P1

Tanggal audit: 25 Oktober 2026. Sumber: kode repository (`main` @ 0ac12a5), bukan tampilan halaman.
Status: **sudah berfungsi** · **perlu diperluas** · **belum ada** · **perlu verifikasi**.

## Ringkasan arsitektur yang dipertahankan

| Lapisan | Implementasi | Bukti |
|---|---|---|
| Framework | Next.js 16 App Router + Payload CMS 3.92 | `package.json`, `src/payload.config.ts` |
| Database | PostgreSQL (produksi: Neon), SQLite hanya untuk uji lokal Windows | `src/payload.config.ts` (`dbUri.startsWith('file:')`) |
| Migrasi | Versioned di `src/migrations/` dan dijalankan oleh `vercel-build` | `package.json` → `vercel-build` |
| Auth & peran | Satu koleksi `users`; peran admin/editor/contributor/admissions | `src/collections/Users.ts`, `src/access/roles.ts` |
| Workflow | Draf → Review → Terbit → Arsip; kontributor tidak bisa terbit (server) | `src/hooks/workflow.ts`, `src/collections/_factory.ts` |
| Audit | Append-only `audit-logs` | `src/hooks/audit.ts` |
| File | Media publik (Blob/disk), dokumen lewat Payload, berkas privat | `src/collections/Media.ts`, `Documents.ts`, `PrivateFiles.ts` |
| Job | Penerbitan terjadwal Payload; cron harian Vercel | `payload.config.ts` (`jobs`), `vercel.json` |

## Matriks kebutuhan

| Kode | Kebutuhan | Status awal | Bukti / temuan | Keputusan |
|---|---|---|---|---|
| F01 | Agenda daftar + filter waktu/status | sudah berfungsi | `app/(frontend)/agenda/page.tsx` (`waktu`, `status`) | Dipertahankan; parameter lama tetap didukung |
| F01 | Detail agenda, status ditunda/dibatalkan | sudah berfungsi | `agenda/[slug]/page.tsx` | Tambah sasaran, kategori, lampiran, Google Calendar |
| F01 | ICS | perlu diperluas | `lib/ics.ts`: UID stabil, folding, DTEND all-day eksklusif; **tanpa SEQUENCE** | Tambah field `sequence` (naik otomatis saat diubah) |
| F01 | Kalender bulan, kategori, sasaran | belum ada | `events` tidak punya `category`/`audience` | Tambah koleksi `event-categories`, field `audience`, tampilan bulan |
| F01 | Validasi selesai ≥ mulai | sudah berfungsi | `collections/content.ts` (`endAt.validate`) | — |
| F02 | Sasaran, prioritas, periode tampil, lampiran | sudah berfungsi | `Announcements` di `content.ts` | Perluas opsi sasaran (kelas 7/8/9, calon siswa, guru) |
| F02 | Expiry tanpa bergantung scheduler | sudah berfungsi | `lib/queries.ts` `activeAnnouncementWhere()` memfilter tanggal di query | — |
| F02 | Detail "Sudah berakhir" + arsip | sudah berfungsi | `pengumuman/[slug]/page.tsx` baris 23–38, `pengumuman?arsip=1` | — |
| F02 | Relasi ke agenda, peringatan tanpa tanggal berakhir | belum ada | — | Tambah `relatedEvent` + peringatan di CMS |
| F03 | Siklus, status unconfirmed/not_open/open/closed, gelombang, alur, syarat, biaya, FAQ | sudah berfungsi | `AdmissionsCycles` di `collections/system.ts`; `pendaftaran/page.tsx` | — |
| F03 | Mode penerimaan, kapasitas & status gelombang, dokumen info, video | belum ada | — | Tambah field; mode `full_admissions` terkunci flag |
| F04 | Form minat + pipeline calon orang tua | belum ada | Hanya `contact-messages` kategori `pendaftaran` | Koleksi baru `leads` (privat) + endpoint |
| F05 | Kunjungan / open house | belum ada | — | Koleksi `visit-sessions`, `visit-bookings` |
| F06 | FAQ terpusat | perlu diperluas | FAQ hanya array di siklus pendaftaran | Koleksi `faqs` + `/faq`; FAQ siklus tetap tampil |
| F06 | Form kontak (validasi server, honeypot, rate limit, consent) | sudah berfungsi | `endpoints/contact.ts` | Tambah kategori kegiatan & kunjungan, relasi ke lead |
| F06 | Layanan tanpa `href="#"` | sudah berfungsi | `layanan/page.tsx` (`valid()`) | Tambah status aktif/segera/pemeliharaan, kategori, tanggal verifikasi |
| F07 | Prestasi + bukti privat | sudah berfungsi | `Achievements` (`proof` → `private-files`) | — |
| F07 | Karya siswa | belum ada | — | Koleksi `student-works` (flag `studentWorks`) |
| F08 | Program/ekskul detail, pembina, jadwal | sudah berfungsi | `Programs`, `Extracurriculars` | Tambah aktivitas & media terkait; minat lewat form kontak |
| F09 | Data staf, foto, persetujuan | perlu diperluas | `Staff`: tanpa mapel/aktif; foto tampil tanpa cek persetujuan | Tambah `subjects`, `active`; foto hanya bila persetujuan |
| F10 | Unduhan kategori/periode/versi | sudah berfungsi | `Documents.ts`, `unduhan/page.tsx` | Tambah tanggal review & relasi "menggantikan" |
| F11 | Cerita alumni dengan consent wajib | sudah berfungsi | `Testimonials` (`consent.validate`) | Tambah jenis hubungan (alumni/orang tua) |
| F12 | Dashboard admin | perlu diperluas | `components/admin/Dashboard.tsx` (konten) | Tambah panel minat/kunjungan/pengingat sesuai izin |
| F12 | Analitik pengunjung | belum ada | — | Agregat harian tanpa PII (flag `visitorAnalytics`, default off) |
| F13 | Draf/review/terbit/jadwal/arsip, revisi | sudah berfungsi | `_factory.ts` (`versions.drafts.schedulePublish`) | — |
| F13 | Pratinjau desktop/mobile | belum ada | — | Rute `/pratinjau` khusus staf |
| F13 | Turunan foto responsif, focal point, validasi berkas | sudah berfungsi | `Media.ts` (`imageSizes`, `focalPoint`), `hooks/uploadSecurity.ts` (magic bytes) | — |
| F13 | Audit field berubah | perlu diperluas | `hooks/audit.ts` tidak mencatat field | Catat nama field yang berubah (bukan nilai) |
| F13 | Blok reusable | perlu diperluas | `Pages.layout`: teks, gambar+teks, nilai, CTA | Tambah blok FAQ, agenda pilihan, media, CTA pendaftaran |
| F13 | Feature flag | belum ada | — | Global `feature-flags` |
| F14 | Seleksi lengkap (P2) | belum ada (sesuai scope) | — | Hanya backlog + flag terkunci |
| F15 | Akun media sosial | perlu diperluas | `site-settings.socials` (tanpa verifikasi) | Koleksi `social-accounts`; data lama dipindahkan |
| F15 | Video/KPS TV/media hub | belum ada | — | Koleksi `media-items`, `/media`, section beranda |
| — | Zona waktu | perlu diperluas | `lib/format.ts` `TZ = 'Asia/Makassar'` (hardcode) | Dibaca dari `NEXT_PUBLIC_SCHOOL_TIMEZONE`, default WITA |

## Temuan keamanan saat audit
- `audit-logs.docTitle` diambil dari `title`/`name`/`email`. Untuk koleksi privat baru ini bisa membocorkan nama/email ke log → diubah agar memakai `reference` bila ada.
- Halaman guru menampilkan foto meski `publicationConsent = false` → diperbaiki.
- `site-settings.socials` tidak membedakan akun terverifikasi → koleksi baru dengan status verifikasi.

## Catatan deployment
Setiap push ke `main` menjalankan `payload migrate` ke database produksi (lihat `vercel-build`). Pekerjaan addendum dikerjakan di cabang `fitur-tambahan-p0p1` dan **tidak** digabung ke `main` tanpa persetujuan.
