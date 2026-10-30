import Link from 'next/link'
import { notFound } from 'next/navigation'
import { onPlatformHost } from '@/platform/session'

export const metadata = { title: 'Terkirim' }

export default async function Terkirim({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await onPlatformHost())) notFound()
  const sp = await searchParams
  const raw = sp.ref
  const demo = sp.demo === '1'
  const ref = typeof raw === 'string' && /^SK-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(raw) ? raw : null
  return (
    <div className="pub__main">
      <main id="main" className="pub__box pub__box--narrow" tabIndex={-1}>
        <h1>{demo ? 'Pengajuan demo terkirim' : 'Pendaftaran terkirim'}</h1>
        {ref ? (
          <p>
            Nomor pendaftaran Anda: <b className="mono">{ref}</b>. Simpan nomor ini bila perlu menghubungi kami.
          </p>
        ) : null}
        <div className="note note--info">
          {demo
            ? 'Tim SatuSekolah akan menghubungi Anda melalui email atau telepon untuk menjadwalkan demo Paket Lengkap.'
            : 'Tim SatuSekolah akan meninjau pendaftaran Anda. Bila disetujui, pengelola menerima email berisi tautan untuk mengatur kata sandi akun Admin Teknis sekolah.'}
        </div>
        <p>
          <Link href="/">Kembali ke beranda SatuSekolah</Link>
        </p>
      </main>
    </div>
  )
}
