# Backlog P2 — Pendaftaran & Seleksi Lengkap (F14)

> **Digantikan (Oktober 2026):** pendaftaran & seleksi lengkap dibangun di **Satu Sekolah App** (modul M14, `/portal/penerimaan`), bukan di website. Lihat `docs/BLUEPRINT_ADDENDUM_v2.1.md` bagian C. Dokumen ini disimpan sebagai catatan prasyarat kebijakan; flag website `fullAdmissions` tetap mati.

Status di website: **tidak dibangun, flag `fullAdmissions` terkunci mati.** Mode "Pendaftaran lengkap" ditolak di CMS. Tidak ada pengumpulan dokumen siswa atau keputusan seleksi di website saat ini.

## Prasyarat kebijakan dari sekolah (wajib sebelum mulai)
1. Apakah sekolah sudah memakai sistem resmi lain (mis. `kps.sch.id/ppdb`)? Bila ya, P2 **tidak dibangun**. Website cukup menautkan sistem itu (mode *Sistem eksternal*) agar tidak terjadi pencatatan ganda.
2. Daftar dokumen wajib per siklus, ukuran/format, dan siapa verifikatornya.
3. Tahapan seleksi (tes/wawancara), rubrik, dan bobot, ditetapkan **sebelum** penilaian.
4. Siapa berwenang memutuskan dan merilis hasil. Alur banding/pertanyaan.
5. Batas daftar ulang. Pembayaran tetap di luar website.
6. Retensi dokumen pendaftar dan penanggung jawab penghapusan.
7. Provider notifikasi (email/WA resmi), template, dan persetujuan penggunaan kontak.

## Arsitektur yang disiapkan (dapat dipakai ulang)
- Satu sistem akun (koleksi `users` Payload) diperluas dengan peran *wali*; **tidak** membuat auth kedua.
- Data minat (`leads`) dapat dihubungkan ke aplikasi; dokumen **tidak** disalin ke inbox Humas.
- Berkas privat memakai pola `private-files` (selalu lewat pemeriksaan akses Payload). Untuk dokumen identitas anak, disarankan object storage privat dengan URL bertanda tangan berumur pendek (Vercel Blob hanya publik, lihat PANDUAN_GO_LIVE_VERCEL.md).
- Peran tambahan: Verifikator, Penilai, Petugas Rilis, Wali.

## Model data usulan
`applicants`, `guardian_applicant_links`, `applications` (nomor aplikasi dibuat atomik saat submit), `application_documents` (status per dokumen), `document_reviews`, `selection_sessions` (kapasitas, ruang, petugas), `assessment_rubrics` (versioned, total bobot divalidasi), `assessments`, `decisions` (pending/accepted/waitlisted/not_accepted; terpisah dari rilis), `result_releases`, `reenrollments`.

## Aturan yang wajib diuji (dari addendum §17)
- P2-01: wali A tidak bisa membaca aplikasi/dokumen wali B (termasuk API langsung & URL berkas).
- P2-02: keputusan yang belum dirilis tidak terlihat wali/publik.
- P2-03: penilai tidak bisa merilis hasil; percobaan tercatat audit.
- Rubrik berubah setelah penilaian → versi baru; hasil lama tidak berubah diam-diam.
- Tidak ada keputusan otomatis dari foto, nama, latar keluarga atau data sensitif.

## Estimasi kasar (setelah prasyarat jelas)
| Paket | Isi | Perkiraan |
|---|---|---|
| A | Akun wali, aplikasi draf → submit, nomor aplikasi, unggah dokumen privat, verifikasi per dokumen | 3–4 minggu kerja |
| B | Jadwal tes/wawancara dengan kapasitas, penilaian rubrik | 2–3 minggu |
| C | Keputusan, rilis hasil, daftar ulang, notifikasi opsional | 2 minggu |
| D | Uji keamanan/izin, E2E staging, pelatihan | 1–2 minggu |

Perkiraan ini bukan janji tanggal. Angkanya dinilai ulang setelah discovery dan keputusan kebijakan di atas.
