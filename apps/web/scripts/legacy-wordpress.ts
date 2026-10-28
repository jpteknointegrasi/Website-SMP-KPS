/**
 * Inventory of the old WordPress site (smp.kps.sch.id/home/…), taken from its wp-sitemap.xml on 28 Oct 2026:
 * 21 pages, 109 posts, 6 categories, 1 tag, 2 author archives. Used by the seed to fill the CMS "Pengalihan URL"
 * table (active only with LEGACY_REDIRECTS=true). Posts that were not migrated go to the news index rather than a 404.
 */
export const LEGACY_PAGES: [string, string][] = [
  ['/home/home', '/'],
  ['/home/agenda', '/agenda'],
  ['/home/link-tugas', '/layanan'],
  ['/home/link', '/layanan'],
  ['/home/lphb', '/layanan'],
  ['/home/download-buku', '/unduhan'],
  ['/home/site-kegiatan', '/kehidupan-siswa'],
  ['/home/form', '/kontak'],
  ['/home/pengelolaan-dana', '/transparansi-bos'],
  ['/home/category/prestasi', '/prestasi'],
  ['/home/category/pengumuman', '/pengumuman'],
  ['/home/category/umum', '/berita'],
  ['/home/category/pendidikan', '/berita'],
  ['/home/category/berita-umum', '/berita'],
  ['/home/category/motivasi', '/berita'],
  ['/home/tag/stage', '/berita'],
  ['/home/author/adminsmp', '/berita'],
  ['/home/author/suradi', '/berita'],
]

/** Every post slug of the old site (articles migrated with the same slug get their own redirect in the seed). */
export const LEGACY_POST_SLUGS = `
bimtek-penguatan-ekstra-kurikuler-smp ramadhan-at-school buka-puasa-bersama-dinas-lingkungan-hidup-bagian-kebersihan-dan-berbagi-bingkisan
penghargaan-karya-buku prestasi-siswa-smp-nasional-kps-mendapatkan-penghargaan-dari-walikota-dan-kepala-dinas-pendidikan-kota-balikpapan
jumbara-madya-smp-nasional-kps juara-1-kepala-sekolah-smp-nasional-kps tim-olimpiade-biologi-smp-nasional-kps asmopss-smp-nasional-kps
team-tennis-meja-nasional-kps green-generation-trip-kebun-raya-balikpapan budidaya-tanaman-menggunakan-air-kolam-lele-sebagai-nutrisi
kunjungan-smp-negeri-dari-jawa-timur lomba-jumbara-dan-festival-muharram selamat-hari-batik-nasional kps-field-study-ke-pertamina-hulu-mahakam
bazar-smp-sekolah-nasional-kps selamat-hari-sumpah-pemuda ora-et-labora atlet-cabang-taichi-tingkat-nasional study-tour-smp-nasional-kps-2019
piagam-adiwiyata-mandiri perjusa-2020 bdr-smp-nasional-kps memperingati-bulan-bahasa-sumpah-pemuda-dan-hari-pahlawan-di-masa-pandemi
tetap-berprestasi-di-masa-pandemi pekan-pertama-bdr-2021 integrated-learning-berkurban-di-masa-pandemi
orasi-calon-ketua-dan-wakil-ketua-osis-dan-gg-masa-bakti-2021-2022 kps-memilih pelantikan-pengurus-osis-gg-masa-bakti-2021-2022
dirgahayu-indonesiaku juara-lomba-classmeeting-2021 juara-lomba-class-meeting-2021 juara-1-kihajar-stem-2021-kota-balikpapan
semangat-unjuk-gigi-di-fls2n-2021-tingkat-provinsi juara-1-di-indonesia-expo-battle finalis-lomba-cerdas-cermat-tingkat-kaltim
3-siswa-kps-mendapat-penghargaan-siswa-berprestasi juara-1-ksn-matematika siap-untuk-kihajar-2021 hip-stage-for-a-groovin-experience
penilaian-tengah-semester-1-dimulai 873-2 sukses-vaksinasi-covid-19 siap-berlaga-di-sekolah-peduli-rupiah-2021
rapat-eksternal-sekolah-siaga-kependudukan-smp-nasional-kps-bersama-disdikbud-dan-dp3akb-kota-balikpapan arkana-si-jago-video-edukasi
bangga-memakai-batik-balikpapan sukses-dan-lancar-pelaksanaan-anbk-2021 peresmian-lapangan-pickle-ball ptm-terbatas-dan-bdr-akhirnya-terlaksana
sosialisasi-sekolah-siaga-kependudukan-kepada-sekolah-binaan peresmian-pojok-kependudukan-smp-nasional-kps-oleh-dp3akb
profil-sekolah-siaga-kependudukan-smp-nasional-kps-tahun-2021 sosialisasi-pojok-kependudukan-bersama-masyarakat-sekolah-siaga-kependudukan-smp-nasional-kps
berpacu-dalam-lomba-bulan-bahasa-di-mgmp-bahasa-indonesia menyumbang-prestasi-di-masa-pandemi maju-bersama-guru-penggerak
bridge-school-welcome-and-get-to-know-you pengisi-acara-di-cgh-award-exclusive-live-2021 intip-kegiatan-ptm-100-di-smp-nasional-kps
menilik-kegiatan-manasik-haji-kelas-ix kegiatan-keagamaan-hindu-kelas-ix belajar-bersama-bulan-ramadhan horeee-juara-2-di-festival-ramadhan-2022
kantongi-juara-2-di-drum-competition-2022 semarak-pelepasan-siswa-kelas-9-penuh-haru-dan-tawa berkunjung-ke-pekan-budaya-kaltim
pembukaan-mpls-tahun-pelajaran-2022-2023 integrated-learning-di-hari-pertama-sekolah juara-1-tarian-batik-balikpapan 4-piala-satu-nama
stage-kembali panen-penghargaan-di-hari-senin menjelang-study-ke-bridge juara-2-lomba-perpustakaan akreditasi-a-perpustakaan-smp-nasional-kps
green-generation-awards-juara-kompetensi-pengurus operasi-semut-di-lingkungan-sekolah 1389-2 semarak-panen-karya-p5-budaya-indonesia
usai-panen-karya-terbitlah-panen-juara juara-1-ssk-tingkat-provinsi mulai-lagi-program-student-exchange-kelas-8 nawasena-perpisahan-kelas-9
penilaian-lomba-pik-r-bersahabat 2-tim-meraih-juara-di-fls2n meraih-medali-emas-di-kompetisi-imaso student-exchange-smp-kps-x-smp-labschool-kebayoran
student-exchange-smp-kps-x-smp-budi-mulia-2 home-stay-pare-2024 prototipe-penjernih-air-sederhana
mempererat-kekompakan-kebhinekaan-harmoni-alam-smp-nasional-kps-lamin-etam-amborse-km-28 semarak-peringatan-hari-sumpah-pemuda-smp-nasional-kps
panen-karya-p5-semarak-nusantara-merayakan-bahasa-budaya-dan-sumpah-pemuda sehari-belajar-di-luar-kelas-ocd-di-smp-nasional-kpselementor-1654
pelatihan-kemampuan-numerasi-untuk-pengembangan-talenta-siswa serunya-perjusa-dan-e-camp-smp-nasional-kps-meriah-dengan-kompetisi-dan-kebersamaan
smp-nasional-kps-goes-to-kampung-inggris-pare-kediri-januari-2025 studi-budaya-kelas-8-smp-nasional-kps-di-desa-pampang
peringatan-isra-miraj-smp-nasional-kps-2025 celebrating-balikpapans-128th-anniversary-through-stage-2025-unlock-your-potential-the-key-to-success
kapolsek-kawasan-pelabuhan-semayang-menjadi-pembina-upacara-bendera-di-smp-nasional-kps studi-edukasi-kelas-9-smp-nasional-kps-menjelajah-sejarah-ilmu-pengetahuan-dan-rekreasi
siswa-kelas-9-smp-nasional-kps-balikpapan-melaksanakan-praktik-manasik-haji upacara-bendera-senin-28-april-2025-kapolresta-balikpapan-bangun-kesadaran-pelajar
smp-nasional-kps-gelar-wisuda-tahfidz semangat-kebersamaan-dan-kemandirian-di-perjusa-smp-nasional-kps-2025
`
  .split(/\s+/)
  .filter(Boolean)
