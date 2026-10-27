import Link from 'next/link'
import { notFound } from 'next/navigation'
import { onPlatformHost } from '@/platform/session'

export const metadata = { title: 'Pendaftaran terkirim' }

export default async function Terkirim({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await onPlatformHost())) notFound()
  const raw = (await searchParams).ref
  const ref = typeof raw === 'string' && /^SK-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(raw) ? raw : null
  return (
    <div className="pub__main">
      <main id="main" className="pub__box pub__box--narrow" tabIndex={-1}>
        <h1>Pendaftaran terkirim</h1>
        {ref ? (
          <p>
            Nomor pendaftaran Anda: <b className="mono">{ref}</b>. Simpan nomor ini bila perlu menghubungi kami.
          </p>
        ) : null}
        <div className="note note--info">
          Tim platform akan meninjau pendaftaran Anda. Bila disetujui, pengelola menerima email berisi tautan untuk mengatur kata sandi akun Admin Teknis sekolah.
        </div>
        <p>
          <Link href="/daftar-sekolah">Daftarkan sekolah lain</Link>
        </p>
      </main>
    </div>
  )
}
