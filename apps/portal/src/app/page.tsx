import { portalDbState, portalEnabled, portalSchool, portalStaff } from '@/lib/context'

const ROLE: Record<string, string> = {
  superadmin: 'Super Admin Platform',
  admin: 'Admin Teknis',
  editor: 'Editor / Humas',
  contributor: 'Kontributor',
  admissions: 'Petugas Pendaftaran',
}
const DB: Record<string, string> = {
  ok: 'Database App sekolah siap.',
  not_configured: 'Database App sekolah belum diatur (Platform → Sekolah → Langganan produk).',
  not_migrated: 'Database App sudah diatur tetapi belum disiapkan (jalankan migrasi portal).',
  wrong_school: 'Database yang diatur milik sekolah lain — koneksi ditolak. Periksa pengaturan sekolah.',
  unavailable: 'Database App tidak dapat dihubungi.',
}

/** Portal home. Shows only what really works; modules still in development are labelled as such (Blueprint §49.3). */
export default async function PortalHome() {
  const school = await portalSchool()
  if (!school) return <Notice title="Portal tidak ditemukan" text="Alamat ini tidak terhubung ke sekolah yang aktif." />
  if (!(await portalEnabled()))
    return <Notice title={school.name} text="Portal sekolah belum aktif untuk sekolah ini." link={{ href: '/', label: 'Kembali ke website sekolah' }} />

  const staff = await portalStaff()
  return (
    <div className="wrap">
      <header className="head">
        <p className="eyebrow">Portal sekolah</p>
        <h1>{school.name}</h1>
      </header>

      {staff ? (
        <section className="card" aria-labelledby="staff-title">
          <h2 id="staff-title">Masuk sebagai {staff.name}</h2>
          <p>{ROLE[staff.role] ?? staff.role}</p>
          <p className="muted">{DB[await portalDbState()]}</p>
        </section>
      ) : null}

      <section className="grid" aria-label="Layanan portal">
        <a className="tile" href="/portal/pendaftaran">
          <strong>Penerimaan Siswa Baru</strong>
          <span>Pendaftaran, berkas, hasil dan daftar ulang</span>
        </a>
        <div className="tile tile--soon" aria-disabled="true">
          <strong>Siswa & Wali</strong>
          <span>Rencana pengembangan — belum tersedia</span>
        </div>
        <div className="tile tile--soon" aria-disabled="true">
          <strong>Guru & Wali Kelas</strong>
          <span>Rencana pengembangan — belum tersedia</span>
        </div>
      </section>

      {!staff ? (
        <p className="muted">
          Staf sekolah: <a href="/admin/login?redirect=%2Fportal">masuk lewat CMS sekolah</a>, lalu kembali ke portal.
        </p>
      ) : null}
    </div>
  )
}

function Notice({ title, text, link }: { title: string; text: string; link?: { href: string; label: string } }) {
  return (
    <div className="wrap wrap--narrow">
      <h1>{title}</h1>
      <p>{text}</p>
      {link ? <a href={link.href}>{link.label}</a> : null}
    </div>
  )
}
