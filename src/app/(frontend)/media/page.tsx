import { getSchoolNames } from '@/lib/queries'
import { schoolMeta } from '@/lib/meta'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getFlags, listMediaItems, listSocialAccounts } from '@/lib/queries'
import { PageHeader, Container, EmptyState, Pagination } from '@/components/ui/bits'
import { MediaCard } from '@/components/media/MediaCard'
import { Icon } from '@/components/ui/Icon'
import { PLATFORM_ICON } from '@/components/layout/Footer'
import type { MediaItem } from '@/payload-types'

export const generateMetadata = schoolMeta(({ name }) => ({ title: 'Video & Media Sosial', description: `video, podcast, dokumentasi kegiatan dan kanal resmi ${name}.`, alternates: { canonical: '/media' } }))
type SP = { searchParams: Promise<{ jenis?: string; page?: string }> }

const TYPES: Record<string, string> = { video: 'Video', podcast: 'Podcast', short: 'Video pendek', playlist: 'Playlist', social_post: 'Postingan', external_article: 'Liputan' }

export default async function Page({ searchParams }: SP) {
  const { short } = await getSchoolNames()
  if (!(await getFlags()).mediaHub) notFound()
  const sp = await searchParams
  const type = sp.jenis && sp.jenis in TYPES ? sp.jenis : undefined
  const page = Math.max(1, Number(sp.page) || 1)
  const [res, accounts] = await Promise.all([listMediaItems({ page, type, limit: 12 }), listSocialAccounts('showOnMediaPage')])
  const items = res.docs as MediaItem[]
  return (
    <>
      <PageHeader title="Video & Media Sosial" lead={`Kenali kehidupan sekolah melalui video, podcast, dan cerita dari komunitas ${short}. Video tetap diputar dari platform asalnya.`} crumbs={[{ label: 'Informasi', href: '/informasi' }, { label: 'Video & Media' }]} />
      <section className="section">
        <Container>
          {accounts.length ? (
            <ul className="accounts" aria-label="Kanal & akun resmi">
              {accounts.map((a) => (
                <li key={a.id}>
                  <a className="account" href={a.profileUrl} target="_blank" rel="noopener noreferrer" data-cta={`akun-${a.platform}`}>
                    <span className="account__icon"><Icon name={PLATFORM_ICON[a.platform] ?? 'globe'} size={22} /></span>
                    <span>
                      <strong>{a.displayName}</strong>
                      {a.handle ? <small>{a.handle}</small> : null}
                    </span>
                    <span className="account__cta">{a.platform === 'youtube' ? 'Kunjungi Kanal YouTube' : 'Kunjungi akun'} <Icon name="external" size={15} /></span>
                    <span className="sr-only"> (membuka tab baru)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <nav className="filters" aria-label="Jenis konten">
            <Link className="chip" href="/media" aria-current={!type ? 'true' : undefined}>Semua</Link>
            {Object.entries(TYPES).map(([k, v]) => (
              <Link key={k} className="chip" href={`/media?jenis=${k}`} aria-current={type === k ? 'true' : undefined}>{v}</Link>
            ))}
          </nav>
          {items.length ? (
            <ul className="mgrid">{items.map((m) => <li key={m.id}><MediaCard m={m} /></li>)}</ul>
          ) : (
            <EmptyState title="Belum ada video atau postingan" text="Konten video dan media sosial pilihan akan tampil di sini setelah dikurasi sekolah." action={{ label: 'Lihat berita sekolah', href: '/berita' }} />
          )}
          <Pagination page={page} totalPages={res.totalPages} base="/media" params={{ jenis: type }} />
        </Container>
      </section>
    </>
  )
}
