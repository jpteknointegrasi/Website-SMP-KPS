import Link from 'next/link'
import { staffPage } from '@/server/request'
import { cycleDetail, cyclesOverview, publicSummary } from '@/modules/admissions/config'
import { hasPerm } from '@/server/context'
import { fmtDate } from '@/server/time'
import { CYCLE_TONE } from '@/ui/tones'
import { ActionForm, Card, Empty, Field, Flash, PageHead, Select, Stat, Status, Submit, TextArea, type SP } from '@/ui/kit'

export const metadata = { title: 'Penerimaan siswa baru' }

/** PAN dashboard: cycles with counts, new cycle, assisted registration. */
export default async function PpdbHome({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/ppdb', ['admissions.manage', 'admissions.verify', 'admissions.assess', 'admissions.approve', 'admissions.release', 'admissions.reenroll', 'admissions.convert'], 'penerimaan')
  const sp = await searchParams
  const cycles = await cyclesOverview(ctx)
  const open = (await publicSummary(ctx.db, ctx.now)).filter((c) => c.status === 'open')
  const openDetails = await Promise.all(open.map((c) => cycleDetail(ctx.db, c.id)))
  const sum = (k: string[]) => cycles.reduce((a, c) => a + k.reduce((b, s) => b + (c.counts[s] ?? 0), 0), 0)
  return (
    <>
      <PageHead title="Penerimaan siswa baru" sub="Periode, pendaftar, seleksi, keputusan dan daftar ulang." />
      <Flash sp={sp} />
      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Stat icon="clipboard" label="Menunggu verifikasi" value={sum(['submitted', 'resubmitted', 'under_verification'])} tone="warn" />
        <Stat icon="edit" label="Perlu perbaikan" value={sum(['needs_revision'])} />
        <Stat icon="checkCircle" tone="ok" label="Terverifikasi" value={sum(['verified'])} />
        <Stat icon="file" label="Draf (belum dikirim)" value={sum(['draft'])} note="Tidak dihitung sebagai pendaftar" />
      </div>
      <div className="grid grid--side">
        <Card title="Periode penerimaan">
          {cycles.length ? (
            <ul className="list">
              {cycles.map((c) => (
                <li key={c.id}>
                  <div className="grow">
                    <Link href={`/staf/ppdb/${c.id}`}>
                      <strong>{c.name}</strong>
                    </Link>
                    <div className="small muted">
                      {c.code} · Kelas {c.targetGrade} TA {c.targetYear} · {fmtDate(c.openAt, ctx.tz)} – {fmtDate(c.closeAt, ctx.tz)} · {Object.entries(c.counts).filter(([k]) => k !== 'draft').reduce((a, [, n]) => a + n, 0)} pendaftar
                    </div>
                  </div>
                  <Status value={c.status} map={CYCLE_TONE} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="calendar">Belum ada periode.</Empty>
          )}
        </Card>
        <div>
          {hasPerm(ctx, 'admissions.manage') ? (
            <Card title="Periode baru">
              <ActionForm action="ppdb.periode_baru" back="/staf/ppdb">
                <Field name="nama" label="Nama periode" placeholder="Penerimaan Siswa Baru 2027/2028" required />
                <div className="f__row">
                  <Field name="kode" label="Kode (awalan nomor)" placeholder="PPDB27" required />
                  <Field name="tingkat" label="Tingkat tujuan" placeholder="VII" required />
                </div>
                <Field name="tahun" label="Tahun ajaran masuk" placeholder="2027/2028" required />
                <Submit icon="plus">Buat periode</Submit>
              </ActionForm>
            </Card>
          ) : null}
          {hasPerm(ctx, 'admissions.manage') && open.length ? (
            <Card title="Pendaftaran dibantu panitia">
              <p className="small muted">Untuk keluarga yang perlu bantuan. Keluarga mendapat akun sendiri; kata sandi sementara tampil sekali.</p>
              <ActionForm action="ppdb.bantu" back="/staf/ppdb">
                <Field name="nama_wali" label="Nama orang tua/wali" required />
                <Field name="login" label="Email atau nama pengguna keluarga" required hint="Bila sudah punya akun, akun yang ada dipakai." />
                <Field name="nama_anak" label="Nama calon siswa" required />
                <Select name="pilihan" label="Periode & jalur" required options={openDetails.flatMap((d) => d!.paths.filter((p) => p.active).map((p) => [`${d!.cycle.id}:${p.id}`, `${d!.cycle.name} — ${p.name}`] as [string, string]))} />
                <TextArea name="alasan" label="Alasan dibantu" required rows={2} />
                <Submit>Buat akun & draf</Submit>
              </ActionForm>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  )
}
