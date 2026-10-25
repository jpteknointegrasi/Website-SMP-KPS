import { getSchoolNames } from '@/lib/queries'
import { schoolMeta } from '@/lib/meta'
import Link from 'next/link'
import { listCollection } from '@/lib/queries'
import { PageHeader, Container, EmptyState, ArrowLink } from '@/components/ui/bits'
import { StudentLife } from '@/components/sections/home'
import type { Extracurricular } from '@/payload-types'

export const generateMetadata = schoolMeta(({ name }) => ({ title: 'Kehidupan Siswa', description: `Kegiatan, organisasi siswa, karya dan ekstrakurikuler ${name}.`, alternates: { canonical: '/kehidupan-siswa' } }))

export default async function Page() {
  const { short } = await getSchoolNames()
  const res = await listCollection('extracurriculars', { sort: 'order', limit: 24 })
  const items = res.docs as Extracurricular[]
  return (
    <>
      <PageHeader title="Ruang untuk Setiap Potensi" lead="Kegiatan, karya, organisasi siswa dan ekstrakurikuler." crumbs={[{ label: 'Kehidupan Siswa' }]} />
      {items.length ? <StudentLife heading="Kegiatan & ekstrakurikuler" items={items} /> : (
        <section className="section"><Container><EmptyState title="Daftar kegiatan sedang disiapkan" /></Container></section>
      )}
      <section className="section section--ivory">
        <Container>
          <ul className="hub">
            <li><Link href="/prestasi"><strong>Prestasi</strong><span>Capaian siswa yang terverifikasi</span></Link></li>
            <li><Link href="/galeri"><strong>Galeri</strong><span>Dokumentasi kegiatan</span></Link></li>
            <li><Link href="/berita"><strong>Berita kegiatan</strong><span>Cerita dari {short}</span></Link></li>
          </ul>
          <p style={{ marginTop: 24 }}><ArrowLink href="/alumni">Terhubung dengan alumni</ArrowLink></p>
        </Container>
      </section>
    </>
  )
}
