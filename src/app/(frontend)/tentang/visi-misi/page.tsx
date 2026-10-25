import { getSchoolNames } from '@/lib/queries'
import { SimplePage } from '../_simple'
export const metadata = { title: 'Visi dan Misi', alternates: { canonical: '/tentang/visi-misi' } }
export default async function Page() {
  const { short } = await getSchoolNames()
  return <SimplePage slug="visi-misi" fallbackTitle="Visi dan Misi" crumbs={[{ label: `Tentang ${short}`, href: '/tentang' }, { label: 'Visi & Misi' }]} emptyText="Visi dan misi sedang diperbarui." />
}
