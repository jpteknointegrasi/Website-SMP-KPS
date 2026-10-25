import { getSchoolNames } from '@/lib/queries'
import { SimplePage } from '../_simple'
export const metadata = { title: 'Sejarah', alternates: { canonical: '/tentang/sejarah' } }
export default async function Page() {
  const { short } = await getSchoolNames()
  return <SimplePage slug="sejarah" fallbackTitle="Sejarah Sekolah" crumbs={[{ label: `Tentang ${short}`, href: '/tentang' }, { label: 'Sejarah' }]} emptyText="Ringkasan sejarah sekolah sedang disiapkan dan akan dimuat setelah diverifikasi." />
}
