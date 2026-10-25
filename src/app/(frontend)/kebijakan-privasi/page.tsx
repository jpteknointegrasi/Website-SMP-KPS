import { SimplePage } from '../tentang/_simple'

export const metadata = { title: 'Kebijakan Privasi', alternates: { canonical: '/kebijakan-privasi' } }

export default function Page() {
  return (
    <SimplePage
      slug="kebijakan-privasi"
      fallbackTitle="Kebijakan Privasi"
      crumbs={[{ label: 'Kebijakan Privasi' }]}
      emptyText="Pemberitahuan penggunaan data sedang disusun dan menunggu persetujuan sekolah."
    />
  )
}
