import { schoolMeta } from '@/lib/meta'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getFlags, listCollection } from '@/lib/queries'
import { PageHeader, Container, EmptyState } from '@/components/ui/bits'
import { InterestForm } from '@/components/forms/InterestForm'
import type { AdmissionsCycle } from '@/payload-types'
import { interestOpenFor } from '@/lib/admissions'

export const generateMetadata = schoolMeta(({ name }) => ({ title: 'Titipkan Minat', description: `Sampaikan minat Anda pada ${name}; petugas penerimaan akan menghubungi Anda.`, alternates: { canonical: '/pendaftaran/minat' }, robots: { index: false } }))

export default async function Page() {
  if (!(await getFlags()).interestForm) notFound()
  const res = await listCollection('admissions-cycles', { sort: '-academicYear', limit: 5, depth: 0 })
  // same rule as /pendaftaran and POST /api/leads/submit (closed cycle with "contact the school" → no form)
  const cycles = (res.docs as unknown as AdmissionsCycle[]).filter(interestOpenFor)
  return (
    <>
      <PageHeader title="Saya Tertarik" lead="Isi data singkat. Petugas penerimaan akan menghubungi Anda — ini bukan pendaftaran resmi." crumbs={[{ label: 'Pendaftaran', href: '/pendaftaran' }, { label: 'Titipkan minat' }]} />
      <section className="section">
        <Container className="layout-form">
          {cycles.length ? (
            <InterestForm cycles={cycles.map((c) => ({ id: c.id, academicYear: c.academicYear }))} />
          ) : (
            <EmptyState title="Form minat sedang tidak dibuka" text="Silakan hubungi sekolah untuk informasi penerimaan." action={{ label: 'Hubungi sekolah', href: '/kontak?kategori=pendaftaran' }} />
          )}
          <p className="muted" style={{ marginTop: 24 }}>Ingin bertanya langsung? <Link href="/kontak?kategori=pendaftaran">Kirim pertanyaan</Link>.</p>
        </Container>
      </section>
    </>
  )
}
