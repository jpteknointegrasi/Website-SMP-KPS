# Laporan Migrasi Konten Awal

Tanggal: 25 Oktober 2026. Sumber: snapshot `content/sources/` (11 halaman) dan `content/assets-manifest.json` dari https://smp.kps.sch.id/home/. **Ini bukan migrasi seluruh situs lama** — inventarisasi lengkap URL WordPress masih perlu dilakukan.

## Ringkasan
| Jenis | Sumber | Diimpor | Duplikat dilewati | Gagal |
|---|---|---|---|---|
| Media (gambar) | 31 di manifest | 31 (setiap record menyimpan source_url, halaman sumber, nama asli, tanggal unduh, SHA-256) | Dijalankan ulang 3×: 0 baru | 0 |
| Berita resmi | 6 artikel | 6, tanggal publikasi asli dipertahankan, `source_url` tercatat | 0 | 0 |
| Halaman (Tentang, Visi-Misi, Kebijakan Privasi) | profil.txt | 3 | — | 0 |
| Pengaturan & kontak | kontak.txt | 1 (berstatus belum terverifikasi) | — | 0 |
| Pengalihan URL | REDIRECT_MAP.csv | 21 | — | 0 |

Uji idempotensi: seed dijalankan pada database kosong (migrasi → seed) dan pada database berisi; hasil jumlah record sama (6 berita, 31 media), tidak ada duplikat.

## Pemetaan gambar
| Posisi | Aset |
|---|---|
| Logo header/footer | KPS-001 (PNG transparan asli, di atas latar navy) |
| Hero | KPS-030 |
| Kolase "Mengenal" | KPS-010 (utama), KPS-007, KPS-013 |
| Program | KPS-028 (Pembelajaran Aktif), KPS-009 (Tahfidz) |
| Kehidupan siswa | KPS-008 Pramuka, KPS-011 Keagamaan, KPS-012 Studi Edukasi, KPS-029 Seni & Musik |
| Prestasi | Album arsip 2022: KPS-017–026 (tanpa klaim kemenangan) |
| Komunitas | KPS-027 |
| Tidak dipakai | KPS-005, KPS-006, KPS-031 (lihat CONTENT_GAPS #17); KPS-014–016 (ikon lama) |

## Belum dimigrasi
- Artikel WordPress lain di luar 6 snapshot, halaman kalender, e-buletin, dokumen BOS lama.
- Redirect per artikel selain 6 artikel di atas — tambahkan setelah inventarisasi.
