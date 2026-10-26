import { getSchoolNames } from '@/lib/queries'
import { listCollection } from '@/lib/queries'
import { PageHeader, Container, EmptyState } from '@/components/ui/bits'
import { Img } from '@/components/ui/Img'
import type { Staff, Media } from '@/payload-types'

export const metadata = { title: 'Pimpinan & Guru', alternates: { canonical: '/tentang/pimpinan-guru' } }

const initials = (n: string) => n.replace(/[,.].*$/, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

// PNG photos with a transparent background (e.g. the official hexagon portraits) are shown as-is, without our own crop.
const cutout = (m: Staff['photo']) => Boolean(m && typeof m === 'object' && (m as Media).mimeType === 'image/png')

type SP = { searchParams: Promise<{ kelompok?: string; mapel?: string }> }

export default async function Page({ searchParams }: SP) {
  const { name, short } = await getSchoolNames()
  const sp = await searchParams
  const res = await listCollection('staff', { sort: 'order', limit: 48 })
  const all = res.docs as unknown as Staff[]
  const subjectsOf = (s: Staff) => (s.subjects ?? '').split(',').map((x) => x.trim()).filter(Boolean)
  const subjects = [...new Set(all.flatMap(subjectsOf))].sort((a, b) => a.localeCompare(b, 'id'))
  const group = ['yayasan', 'pimpinan', 'guru', 'staf'].includes(sp.kelompok ?? '') ? sp.kelompok : undefined
  const subject = subjects.find((x) => x === sp.mapel)
  const staff = all.filter((s) => (!group || (s.group ?? 'pimpinan') === group) && (!subject || subjectsOf(s).includes(subject)))
  const groups: [string, string][] = [['yayasan', 'Pimpinan Yayasan'], ['pimpinan', 'Pimpinan Sekolah'], ['guru', 'Guru'], ['staf', 'Tenaga kependidikan']]
  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ kelompok: group, mapel: subject, ...o }).filter(([, v]) => v) as [string, string][]).toString()
    return p ? `/tentang/pimpinan-guru?${p}` : '/tentang/pimpinan-guru'
  }
  return (
    <>
      <PageHeader title="Pimpinan & Guru" lead={`Pendidik yang mendampingi siswa ${name}.`} crumbs={[{ label: `Tentang ${short}`, href: '/tentang' }, { label: 'Pimpinan & Guru' }]} />
      <section className="section">
        <Container>
          {all.length > 3 ? (
            <>
              <nav className="filters" aria-label="Kelompok">
                <a className="chip" href={q({ kelompok: undefined })} aria-current={!group ? 'true' : undefined}>Semua</a>
                {groups.map(([k, l]) => <a key={k} className="chip" href={q({ kelompok: k })} aria-current={group === k ? 'true' : undefined}>{l}</a>)}
              </nav>
              {subjects.length ? (
                <nav className="filters" aria-label="Mata pelajaran">
                  <a className="chip" href={q({ mapel: undefined })} aria-current={!subject ? 'true' : undefined}>Semua mapel</a>
                  {subjects.map((m) => <a key={m} className="chip" href={q({ mapel: m })} aria-current={subject === m ? 'true' : undefined}>{m}</a>)}
                </nav>
              ) : null}
            </>
          ) : null}
          {staff.length === 0 ? <EmptyState title="Data belum tersedia" text="Daftar pimpinan dan guru akan dimuat setelah dikonfirmasi sekolah." /> : null}
          {groups.map(([key, label]) => {
            const list = staff.filter((s) => (s.group ?? 'pimpinan') === key)
            if (!list.length) return null
            return (
              <div key={key} className="block">
                <h2>{label}</h2>
                {key === 'pimpinan' || key === 'yayasan' ? (
                  <ul className="leaders">
                    {list.map((s) => {
                      const photo = s.publicationConsent && s.photo && typeof s.photo === 'object' ? (s.photo as Media) : null
                      return (
                        <li key={s.id} className="leader">
                          <div className={`leader__photo${photo && cutout(s.photo) ? ' is-cutout' : ''}`}>
                            {photo ? <Img media={photo} sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 100vw" alt={`Foto ${s.name}`} /> : <span className="person__initials" aria-hidden="true">{initials(s.name)}</span>}
                          </div>
                          <div className="leader__body">
                            {/* uppercase name, academic titles keep their spelling (S.Si., M.Pd.) */}
                            <h3>
                              <span className="leader__name">{s.name.split(',')[0]}</span>
                              {s.name.includes(',') ? s.name.slice(s.name.indexOf(',')) : null}
                            </h3>
                            <span className="leader__rule" aria-hidden="true" />
                            <p>{s.position}</p>
                            {s.bio ? <p className="person__bio">{s.bio}</p> : null}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                <ul className="people">
                  {list.map((s) => (
                    <li key={s.id} className="person">
                      <div className={`person__photo${s.publicationConsent && cutout(s.photo) ? ' is-cutout' : ''}`}>
                        {/* photo only with publication consent */}
                        {s.publicationConsent && s.photo && typeof s.photo === 'object' ? <Img media={s.photo as Media} sizes="180px" alt={`Foto ${s.name}`} /> : <span className="person__initials" aria-hidden="true">{initials(s.name)}</span>}
                      </div>
                      <h3>{s.name}</h3>
                      <p>{s.position}</p>
                      {s.subjects ? <p className="muted">{s.subjects}</p> : null}
                      {s.bio ? <p className="person__bio">{s.bio}</p> : null}
                    </li>
                  ))}
                </ul>
                )}
              </div>
            )
          })}
        </Container>
      </section>
    </>
  )
}
