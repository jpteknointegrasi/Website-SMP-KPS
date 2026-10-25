import { notFound } from 'next/navigation'
import { getFlags } from '@/lib/queries'
import { PageHeader, Container } from '@/components/ui/bits'
import { CancelVisit } from '@/components/forms/CancelVisit'

export const metadata = { title: 'Batalkan Kunjungan', robots: { index: false, follow: false }, referrer: 'no-referrer' as const }

export default async function Page() {
  if (!(await getFlags()).schoolVisits) notFound()
  return (
    <>
      <PageHeader title="Batalkan Kunjungan" crumbs={[{ label: 'Kunjungan', href: '/kunjungan' }, { label: 'Batalkan' }]} />
      <section className="section">
        <Container className="layout-form">
          <CancelVisit />
        </Container>
      </section>
    </>
  )
}
