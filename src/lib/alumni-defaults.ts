/**
 * Starting content for /alumni (IKA KPS), from the "IKA KPS Desain dan Materi" package (26 Oct 2026).
 * Facts are limited to what the source states: two officers named in the founding post caption,
 * three activity posts, two Spill The Tea episodes. Images are captures of @ika_kps posts
 * (credit shown on the page). Any field filled in the CMS global "alumni-page" replaces these.
 */
export const ALUMNI_PORTAL_FALLBACK = 'https://alumniku.my.id/'
export const IKA_JOIN_URL = 'https://forms.gle/s2GRhLH3nk2Cncyu6'
export const IKA_INSTAGRAM = 'https://www.instagram.com/ika_kps/'

export type StaticPic = { src: string; width: number; height: number; alt: string }
const pic = (file: string, width: number, height: number, alt: string): StaticPic => ({ src: `/alumni/ika/${file}.jpg`, width, height, alt })

export const ALUMNI_DEFAULTS = {
  eyebrow: 'Ikatan Keluarga Alumni KPS',
  heading: 'Satu Almamater.',
  headingAccent: 'Sejuta Cerita.',
  tagline: 'Connect • Collaborate • Contribute',
  intro: 'Ruang silaturahmi, kolaborasi, dan kontribusi keluarga besar alumni KPS.',
  heroImage: pic('silaturahmi-dinner', 632, 842, 'Para alumni berfoto bersama pada Dinner IKA KPS di Kampung Pasir, Balikpapan'),
  heroCaption: 'Silaturahmi keluarga besar IKA KPS',
  aboutHeading: 'Tentang IKA KPS',
  aboutText:
    'Ikatan Keluarga Alumni KPS (IKA KPS) menjadi ruang bersama bagi alumni KPS dari TK, SD, SMP hingga SMA, lintas angkatan. Melalui silaturahmi, pertukaran pengalaman, dan kolaborasi, alumni dapat menjaga hubungan dengan sesama alumni serta mendukung kemajuan almamater.\n\nHalaman ini menjadi penghubung alumni SMP Nasional KPS dengan keluarga besar IKA KPS.',
  aboutImage: pic('road-to-pelantikan-2', 283, 347, 'Pengurus IKA KPS berdiskusi dalam rapat persiapan pelantikan'),
  values: [
    { title: 'Terhubung', icon: 'users', text: 'Menjaga silaturahmi antaralumni lintas angkatan.' },
    { title: 'Berkolaborasi', icon: 'handshake', text: 'Berbagi pengalaman, pengetahuan, dan peluang.' },
    { title: 'Berkontribusi', icon: 'star', text: 'Menghadirkan manfaat bagi almamater dan masyarakat.' },
  ],
  committeeNote: 'Data awal dari @ika_kps • susunan lengkap menunggu konfirmasi pengurus',
  committee: [
    { name: 'Adam Dustin Bhakti', role: 'Ketua IKA KPS' },
    { name: 'Inge Sondaryani', role: 'Ketua Dewan Penasihat' },
  ],
  activities: [
    {
      title: 'Road to Pelantikan IKA KPS 2026',
      category: 'Organisasi',
      summary: 'Koordinasi dan persiapan pelantikan menjadi upaya menyatukan langkah serta memperkuat kolaborasi keluarga besar IKA KPS.',
      image: pic('road-to-pelantikan-1', 283, 348, 'Rapat persiapan pelantikan IKA KPS'),
      url: 'https://www.instagram.com/ika_kps/reel/DetVW5ryy79/',
    },
    {
      title: 'International Seminar',
      category: 'Pendidikan',
      summary: 'IKA KPS menghadiri International Seminar yang diselenggarakan Sekolah Nasional KPS Balikpapan sebagai bentuk dukungan alumni bagi pendidikan dan almamater.',
      image: pic('international-seminar', 283, 377, 'Peserta International Seminar Sekolah Nasional KPS berfoto bersama'),
      url: 'https://www.instagram.com/ika_kps/reel/DdBnKUrTNa6/',
    },
    {
      title: 'Silaturahmi Alumni',
      category: 'Kebersamaan',
      summary: 'Pertemuan alumni dalam suasana hangat untuk berbagi cerita, menjaga persaudaraan, dan mempererat hubungan lintas angkatan.',
      image: pic('silaturahmi-dinner', 632, 842, 'Para alumni berfoto bersama pada Dinner IKA KPS'),
      url: 'https://www.instagram.com/ika_kps/p/DdArQmBj-xZ/',
    },
  ],
  agendaHeading: 'Nantikan agenda berikutnya',
  agendaText: 'Informasi kegiatan, waktu, lokasi, dan pendaftaran akan diumumkan melalui kanal resmi IKA KPS.',
  stories: [
    {
      title: 'IKA Spill The Tea — Episode 1',
      text: 'Setiap angkatan punya cerita. Simak obrolan dan kenangan para alumni tentang momen memorable di KPS.',
      image: pic('spill-the-tea-1', 283, 348, 'Sampul video IKA Spill The Tea episode 1: Moment Memorable di KPS'),
      url: 'https://www.instagram.com/ika_kps/reel/De14dUsybwX/',
    },
    {
      title: 'IKA Spill The Tea — Episode 2',
      text: 'Lanjutan cerita dan kenangan lintas angkatan dari keluarga besar alumni KPS.',
      image: pic('spill-the-tea-2', 283, 348, 'Sampul video IKA Spill The Tea episode 2: Moment Memorable di KPS Part 2'),
      url: 'https://www.instagram.com/ika_kps/reel/De7KOvuylZq/',
    },
  ],
  gallery: [
    { image: pic('pelantikan-ketua', 283, 377, 'Pelantikan Ketua Umum IKA KPS 2026, bendera dikibarkan di tengah para alumni'), caption: 'Pelantikan Ketua Umum IKA KPS 2026' },
    { image: pic('rapat-koordinasi', 283, 347, 'Pengurus IKA KPS dalam rapat koordinasi'), caption: 'Rapat koordinasi' },
    { image: pic('road-to-pelantikan-2', 283, 347, 'Rapat persiapan pelantikan IKA KPS'), caption: 'Rapat persiapan pelantikan' },
    { image: pic('road-to-pelantikan-1', 283, 348, 'Rapat persiapan pelantikan IKA KPS di sebuah kafe'), caption: 'Road to Pelantikan IKA KPS' },
  ],
  posters: [
    pic('arsip-8-hari', 283, 378, 'Poster arsip: 8 hari menuju pelantikan IKA KPS'),
    pic('arsip-7-hari', 283, 378, 'Poster arsip: 7 hari menuju pelantikan IKA KPS'),
  ],
  ctaHeading: 'Sudah terhubung dengan keluarga KPS?',
  ctaText: 'Mari kembali terhubung, berbagi kabar, dan bergerak bersama keluarga besar IKA KPS.',
}
