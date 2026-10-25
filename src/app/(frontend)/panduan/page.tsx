import { schoolMeta } from '@/lib/meta'
import Link from 'next/link'
import { listCollection } from '@/lib/queries'
import { PageHeader, Container, EmptyState, DemoBadge } from '@/components/ui/bits'
import type { Guide } from '@/payload-types'

export const generateMetadata = schoolMeta(({ name }) => ({ title: 'Panduan', description: `Panduan layanan dan kegiatan ${name}.`, alternates: { canonical: '/panduan' } }))

export default async function Page() {
  const res = await listCollection('guides', { sort: 'title', limit: 48, depth: 0 })
  const guides = res.docs as unknown as Guide[]
  const groups = new Map<string, Guide[]>()
  guides.forEach((g) => groups.set(g.category || 'Umum', [...(groups.get(g.category || 'Umum') ?? []), g]))
  return (
    <>
      <PageHeader title="Panduan Sekolah" lead="Langkah-langkah praktis untuk orang tua dan siswa." crumbs={[{ label: 'Informasi', href: '/informasi' }, { label: 'Panduan' }]} />
      <section className="section">
        <Container>
          {guides.length ? (
            [...groups.entries()].map(([cat, list]) => (
              <div key={cat} className="block">
                <h2>{cat}</h2>
                <ul className="list-rows">
                  {list.map((g) => (
                    <li key={g.id}>
                      <Link className="row-link" href={`/panduan/${g.slug}`}>
                        <strong>{g.title} <DemoBadge show={g.isDemo} /></strong>
                        {g.excerpt ? <span>{g.excerpt}</span> : null}
                        {g.steps?.length ? <span className="row-meta">{g.steps.length} langkah</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <EmptyState title="Panduan sedang disiapkan" text="Panduan layanan akan tersedia setelah ditinjau sekolah. Sementara itu, silakan hubungi sekolah." action={{ label: 'Hubungi sekolah', href: '/kontak' }} />
          )}
        </Container>
      </section>
    </>
  )
}
