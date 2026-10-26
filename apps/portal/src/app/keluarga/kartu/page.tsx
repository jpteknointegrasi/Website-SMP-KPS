import { accountPage, requestBranding } from '@/server/request'
import { myCards, REPLACE_REASONS } from '@/modules/cards/service'
import { selectedStudent } from '@/modules/family'
import { fmtDate } from '@/server/time'
import { CardBack, CardFront } from '@/ui/student-card'
import { ChildPicker } from '@/ui/child-picker'
import { ActionForm, Card, Check, Empty, Flash, PageHead, Select, sp1, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Kartu siswa' }

/** KRT-03 digital card: show on screen when needed; report lost/damaged for a replacement. */
export default async function DigitalCard({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/kartu', 'kartu')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const b = (await requestBranding())!
  const card = current ? (await myCards(ctx)).find((c) => c.studentId === current.studentId) : null
  return (
    <>
      <PageHead title="Kartu siswa digital" sub="Tunjukkan kartu ini saat diperlukan di lingkungan sekolah." />
      <Flash sp={sp} />
      <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga/kartu" />
      {card ? (
        <div className="grid grid--side">
          <Card>
            <div className="scard-preview">
              <CardFront d={{ name: card.name, nis: card.nis, nisn: card.nisn, entryYear: card.entryYear, photo: card.photo, cardNo: card.card.cardNo, validUntil: card.card.validUntil, qr: card.qr }} s={card.tpl.settings} b={b} schoolName={ctx.school.name} />
            </div>
            <div className="scard-preview" style={{ marginTop: 12 }}>
              <CardBack s={card.tpl.settings} b={b} schoolName={ctx.school.name} />
            </div>
          </Card>
          <div>
            <Card title="Informasi kartu">
              <dl className="kv">
                <dt>Status</dt>
                <dd>Berlaku</dd>
                <dt>Nomor kartu</dt>
                <dd className="mono">{card.card.cardNo}</dd>
                <dt>Tanggal terbit</dt>
                <dd>{fmtDate(card.card.issuedAt, ctx.tz)}</dd>
                <dt>Berlaku sampai</dt>
                <dd>{fmtDate(card.card.validUntil)}</dd>
              </dl>
            </Card>
            <Card title="Laporkan hilang / minta penggantian">
              <ActionForm action="kartu.ganti" back={`/keluarga/kartu?anak=${current!.studentId}`} hidden={{ siswa: current!.studentId }} confirm="Kirim permohonan penggantian kartu?">
                <Select name="alasan" label="Alasan" required empty="— pilih —" options={Object.entries(REPLACE_REASONS)} />
                <TextArea name="catatan" label="Keterangan (opsional)" rows={2} />
                <Check name="nonaktifkan" checked label="Nonaktifkan kartu lama sekarang (disarankan bila hilang)" />
                <Submit tone="danger">Kirim permohonan</Submit>
              </ActionForm>
            </Card>
          </div>
        </div>
      ) : (
        <Empty icon="card">{current ? 'Kartu siswa belum diterbitkan sekolah.' : 'Akun ini belum terhubung dengan siswa.'}</Empty>
      )}
    </>
  )
}
