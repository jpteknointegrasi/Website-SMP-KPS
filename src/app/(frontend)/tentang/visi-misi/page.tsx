import { SimplePage } from '../_simple'
export const metadata = { title: 'Visi dan Misi', alternates: { canonical: '/tentang/visi-misi' } }
export default function Page() {
  return <SimplePage slug="visi-misi" fallbackTitle="Visi dan Misi" crumbs={[{ label: 'Tentang KPS', href: '/tentang' }, { label: 'Visi & Misi' }]} emptyText="Visi dan misi sedang diperbarui." />
}
