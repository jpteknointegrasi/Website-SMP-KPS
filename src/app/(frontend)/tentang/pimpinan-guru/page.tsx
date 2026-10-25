import { listCollection } from '@/lib/queries'
import { PageHeader, Container, EmptyState } from '@/components/ui/bits'
import { Img } from '@/components/ui/Img'
import type { Staff, Media } from '@/payload-types'

export const metadata = { title: 'Pimpinan & Guru', alternates: { canonical: '/tentang/pimpinan-guru' } }

const initials = (n: string) => n.replace(/[,.].*$/, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

// PNG photos with a transparent background (e.g. the official hexagon portraits) are shown as-is, without our own crop.
const cutout = (m: Staff['photo']) => Boolean(m && typeof m === 'object' && (m as Media).mimeType === 'image/png')

export default async function Page() {
  const res = await listCollection('staff', { sort: 'order', limit: 48 })
  const staff = res.docs as unknown as Staff[]
  const groups: [string, string][] = [['pimpinan', 'Pimpinan'], ['guru', 'Guru'], ['staf', 'Tenaga kependidikan']]
  return (
    <>
      <PageHeader title="Pimpinan & Guru" lead="Pendidik yang mendampingi siswa SMP Nasional KPS." crumbs={[{ label: 'Tentang KPS', href: '/tentang' }, { label: 'Pimpinan & Guru' }]} />
      <section className="section">
        <Container>
          {staff.length === 0 ? <EmptyState title="Data belum tersedia" text="Daftar pimpinan dan guru akan dimuat setelah dikonfirmasi sekolah." /> : null}
          {groups.map(([key, label]) => {
            const list = staff.filter((s) => (s.group ?? 'pimpinan') === key)
            if (!list.length) return null
            return (
              <div key={key} className="block">
                <h2>{label}</h2>
                <ul className="people">
                  {list.map((s) => (
                    <li key={s.id} className="person">
                      <div className={`person__photo${cutout(s.photo) ? ' is-cutout' : ''}`}>
                        {s.photo && typeof s.photo === 'object' ? <Img media={s.photo as Media} sizes="180px" alt={`Foto ${s.name}`} /> : <span className="person__initials" aria-hidden="true">{initials(s.name)}</span>}
                      </div>
                      <h3>{s.name}</h3>
                      <p>{s.position}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </Container>
      </section>
    </>
  )
}
