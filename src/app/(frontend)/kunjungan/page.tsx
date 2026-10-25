import { getSchoolNames } from '@/lib/queries'
import { schoolMeta } from '@/lib/meta'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getFlags, listFaqs } from '@/lib/queries'
import { payloadClient } from '@/lib/payload'
import { listPublicSessions } from '@/endpoints/visits'
import { PageHeader, Container, EmptyState } from '@/components/ui/bits'
import { VisitForm } from '@/components/forms/VisitForm'
import { FaqList } from '@/components/content/FaqList'
import { formatEventWhen } from '@/lib/format'

export const generateMetadata = schoolMeta(({ name }) => ({ title: 'Kunjungan Sekolah & Open House', description: `Pesan jadwal kunjungan atau open house ${name}.`, alternates: { canonical: '/kunjungan' } }))
export const dynamic = 'force-dynamic'

export default async function Page() {
  const { name } = await getSchoolNames()
  if (!(await getFlags()).schoolVisits) notFound()
  const [sessions, faqs] = await Promise.all([listPublicSessions(await payloadClient()), listFaqs({ category: 'pendaftaran', limit: 6, featured: true })])
  return (
    <>
      <PageHeader title="Kunjungan Sekolah" lead={`Lihat langsung suasana belajar ${name}. Pilih jadwal yang tersedia; kuota dihitung otomatis.`} crumbs={[{ label: 'Pendaftaran', href: '/pendaftaran' }, { label: 'Kunjungan' }]} />
      <section className="section">
        <Container className="layout-form">
          {sessions.length ? (
            <VisitForm
              sessions={sessions.map((s) => ({
                id: s.id,
                title: s.title,
                when: formatEventWhen({ startAt: s.startAt, endAt: s.endAt }),
                location: s.location,
                remaining: s.remaining,
                full: s.full,
                unit: s.capacityUnit,
                requiresConfirmation: s.requiresConfirmation,
                instructions: s.instructions,
              }))}
            />
          ) : (
            <EmptyState title="Belum ada jadwal kunjungan yang dibuka" text="Jadwal kunjungan atau open house akan diumumkan di sini. Anda bisa bertanya lebih dulu kepada sekolah." action={{ label: 'Tanya jadwal kunjungan', href: '/kontak?kategori=kunjungan' }} />
          )}
          {faqs.length ? (
            <div className="block faq">
              <h2>Pertanyaan umum</h2>
              <FaqList items={faqs} />
            </div>
          ) : null}
          <p className="muted" style={{ marginTop: 24 }}>Butuh jadwal khusus? <Link href="/kontak?kategori=kunjungan">Hubungi sekolah</Link>.</p>
        </Container>
      </section>
    </>
  )
}
