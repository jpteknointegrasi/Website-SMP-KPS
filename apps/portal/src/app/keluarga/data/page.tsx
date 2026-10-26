import { accountPage } from '@/server/request'
import { getStudent, myCorrections } from '@/modules/students/service'
import { selectedStudent } from '@/modules/family'
import { FIELD, GENDER_LABEL, RELATIONS, STUDENT_FIELDS } from '@/modules/students/fields'
import { fmtDate, fmtDateTime } from '@/server/time'
import { CORRECTION_TONE } from '@/ui/tones'
import { CorrectionForm } from '@/ui/correction-form'
import { Card, Empty, Flash, PageHead, sp1, Status, type SP } from '@/ui/kit'
import { ChildPicker } from '@/ui/child-picker'

export const metadata = { title: 'Data siswa' }

/** Family view of the Buku Induk record (no sensitive identifiers) and correction requests. */
export default async function FamilyData({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/data', 'buku_induk')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  if (!current) return <Empty icon="user">Akun ini belum terhubung dengan siswa.</Empty>
  const d = await getStudent(ctx, current.studentId)
  const mine = (await myCorrections(ctx)).filter((c) => c.c.studentId === current.studentId)
  const values = { ...d.person, ...d.student } as Record<string, unknown>
  return (
    <>
      <PageHead title="Data siswa" sub="Data pada Buku Induk sekolah. Perubahan diajukan sebagai usulan koreksi dan ditinjau petugas." />
      <Flash sp={sp} />
      <ChildPicker items={list} current={current.studentId} path="/keluarga/data" />
      <div className="grid grid--2">
        <Card title="Identitas">
          <dl className="kv">
            {STUDENT_FIELDS.filter((f) => !f.sensitive).map((f) => (
              <div key={f.key} style={{ display: 'contents' }}>
                <dt>{f.label}</dt>
                <dd>{f.key === 'gender' ? (GENDER_LABEL[String(values.gender)] ?? '—') : f.type === 'date' ? fmtDate(values[f.key] as string) : ((values[f.key] as string) ?? '—')}</dd>
              </div>
            ))}
            <dt>Rombel</dt>
            <dd>{d.placement?.homeroom ?? '—'}</dd>
          </dl>
        </Card>
        <div>
          <Card title="Orang tua / wali tercatat">
            <ul className="list">
              {d.links
                .filter((l) => l.link.status === 'active')
                .map((l) => (
                  <li key={l.link.id}>
                    <span className="grow">
                      {l.person.fullName} <span className="muted">· {RELATIONS[l.link.relation]}</span>
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
          <Card title="Usulan koreksi saya">
            {mine.length ? (
              <ul className="list">
                {mine.map(({ c }) => (
                  <li key={c.id}>
                    <span className="grow">
                      {c.changes.map((x) => FIELD[x.field]?.label).join(', ')}
                      <div className="small muted">
                        {c.number} · {fmtDateTime(c.createdAt, ctx.tz)}
                        {c.reviewNote ? ` · Catatan: ${c.reviewNote}` : ''}
                      </div>
                    </span>
                    <Status value={c.status} map={CORRECTION_TONE} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Belum ada usulan.</Empty>
            )}
          </Card>
        </div>
      </div>
      <Card title="Ajukan koreksi data">
        <CorrectionForm studentId={current.studentId} values={values as never} back={`/keluarga/data?anak=${current.studentId}`} sensitive={false} />
      </Card>
    </>
  )
}
