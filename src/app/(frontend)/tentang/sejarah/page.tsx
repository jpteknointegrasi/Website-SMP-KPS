import { SimplePage } from '../_simple'
export const metadata = { title: 'Sejarah', alternates: { canonical: '/tentang/sejarah' } }
export default function Page() {
  return <SimplePage slug="sejarah" fallbackTitle="Sejarah Sekolah" crumbs={[{ label: 'Tentang KPS', href: '/tentang' }, { label: 'Sejarah' }]} emptyText="Ringkasan sejarah sekolah sedang disiapkan dan akan dimuat setelah diverifikasi." />
}
