import { inArray } from 'drizzle-orm'
import { files } from '@/db/schema'
import { accountPage } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { CATEGORIES, familyList, STATUS } from '@/modules/works/service'
import { fmtDate } from '@/server/time'
import { ChildPicker } from '@/ui/child-picker'
import { ActionForm, Badge, Card, Empty, fileUrl, Flash, Notice, PageHead, sp1, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Karya untuk website' }

/** KRY-02: guardians decide whether a proposed work may appear on the school website; consent can be withdrawn. */
export default async function FamilyWorks({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/karya', 'kesiswaan')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const works = current ? await familyList(ctx, current.studentId) : []
  const fids = works.flatMap((w) => w.fileIds)
  const fileRows = fids.length ? await ctx.db.select().from(files).where(inArray(files.id, fids)) : []
  const back = `/keluarga/karya${current ? `?anak=${current.studentId}` : ''}`
  const guardian = current && !current.self
  return (
    <>
      <PageHead title="Karya untuk website sekolah" sub="Guru mengusulkan karya terbaik siswa untuk ditampilkan di website. Karya hanya tampil dengan izin Anda." />
      <Flash sp={sp} />
      <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga/karya" />
      {current?.self ? <Notice tone="info">Izin publikasi diberikan oleh orang tua/wali melalui akunnya.</Notice> : null}
      {works.length ? (
        <div className="grid grid--2">
          {works.map((w) => (
            <Card key={w.id} title={w.title} actions={<Badge tone={w.status === 'awaiting_consent' ? 'warn' : w.status === 'refused' || w.status === 'withdrawn' ? 'muted' : 'ok'}>{STATUS[w.status as keyof typeof STATUS]}</Badge>}>
              <p className="small muted">
                {CATEGORIES[w.category as keyof typeof CATEGORIES]} · diusulkan {fmtDate(w.createdAt, ctx.tz)} · nama yang tampil: <strong>{w.publicName}</strong>
              </p>
              <div className="prose small">{w.description}</div>
              {w.fileIds.length ? (
                <div className="row" style={{ marginTop: 8 }}>
                  {w.fileIds.map((f) => (
                    <a key={f} href={fileUrl(f)!} target="_blank" rel="noopener" className="small">
                      {fileRows.find((x) => x.id === f)?.originalName ?? 'Foto'}
                    </a>
                  ))}
                </div>
              ) : null}
              {guardian && w.status === 'awaiting_consent' ? (
                <ActionForm action="karya.izin" back={back} hidden={{ id: w.id }} className="row">
                  <Submit name="keputusan" value="setuju" tone="ok">
                    Izinkan tampil di website
                  </Submit>
                  <Submit name="keputusan" value="tolak" tone="ghost">
                    Tidak mengizinkan
                  </Submit>
                </ActionForm>
              ) : null}
              {guardian && ['consented', 'imported'].includes(w.status) ? (
                <ActionForm action="karya.tarik" back={back} hidden={{ id: w.id }} className="inline" confirm="Tarik izin? Karya akan disembunyikan dari website.">
                  <Submit tone="ghost">Tarik izin</Submit>
                </ActionForm>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Empty icon="star">Belum ada karya yang diusulkan.</Empty>
      )}
    </>
  )
}
