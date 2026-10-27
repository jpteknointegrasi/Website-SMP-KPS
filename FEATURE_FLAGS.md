# Fitur Aktif (Feature Flags)

Tempat mengatur: **Panel admin → Pengaturan & Akses → Fitur Aktif** (hanya Admin Teknis, tercatat di Log Audit).
Kode: `src/globals/flags.ts` (nilai bawaan), `src/lib/flags.ts` (pembacaan server).

Mematikan fitur **menutup halaman, API dan job-nya**, bukan sekadar menyembunyikan tombol. Bila pengaturan tidak terbaca (misalnya database bermasalah), semua fitur yang menyimpan data pribadi dianggap **mati**.

| Fitur | Bawaan | Bila mati: UI | Bila mati: API | Bila mati: job/lainnya |
|---|---|---|---|---|
| `calendarMonthView` Kalender bulanan | hidup | Tab "Kalender" hilang; `?tampilan=kalender` menampilkan daftar | — | — |
| `interestForm` Form minat | **mati** | `/pendaftaran/minat` 404; tombol "Saya tertarik" hilang; menu disaring | `POST /api/leads/submit` → 404 | — (data lama tetap bisa dikelola petugas) |
| `schoolVisits` Kunjungan | **mati** | `/kunjungan`, `/kunjungan/batal` 404; tombol hilang | `GET /api/visit-sessions/available`, `POST /api/visit-bookings/submit`, `POST /api/visit-bookings/cancel` → 404 | Job `releaseVisitHolds` dilewati |
| `studentWorks` Karya siswa | **mati** | `/karya-siswa` 404; blok karya & menu hilang; tidak muncul di pencarian/sitemap | REST publik tetap dibatasi persetujuan | — |
| `mediaHub` Video & media sosial | hidup | `/media` 404; section KPS TV, blok media, hasil pencarian & sitemap hilang | — | — |
| `visitorAnalytics` Statistik pengunjung | **mati** | Skrip penghitung tidak dimuat | `POST /api/analytics-daily/track` → 404; form tidak menghitung | Panel statistik dasbor hilang |
| `socialAutoImport` Impor otomatis | mati, **terkunci** | Belum dibangun (butuh API resmi + kredensial server) | — | — |
| `fullAdmissions` Seleksi lengkap (P2) | mati, **terkunci** | Mode "pendaftaran lengkap" ditolak di CMS | — | Lihat `P2_ADMISSIONS_BACKLOG.md` |

Catatan:
- Section KPS TV juga tersembunyi otomatis bila belum ada video yang terbit, walau `mediaHub` hidup.
- Form minat tampil hanya bila flag hidup **dan** siklus pendaftaran mengizinkan (*Tampilkan form minat* atau mode *Form minat*).
- Tautan menu/footer menuju fitur yang mati otomatis disaring (`hrefAllowed` di `src/lib/queries.ts`).
- Uji: `tests/int/addendum.int.spec.ts` → FLAG-01.
