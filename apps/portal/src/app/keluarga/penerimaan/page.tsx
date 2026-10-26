import Link from 'next/link'
import { inArray } from 'drizzle-orm'
import { admissionCycles, persons } from '@/db/schema'
import { accountPage } from '@/server/request'
import { myApplications } from '@/modules/admissions/apply'
import { cycleDetail, publicSummary } from '@/modules/admissions/config'
import { fmtDate, fmtDateTime } from '@/server/time'
import { APP_TONE } from '@/ui/tones'
import { ActionForm, Card, Empty, Field, Flash, Notice, PageHead, rupiah, Select, Status, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Penerimaan siswa baru' }

/** ADM-01 applications of this account (one per child) and a form to start a new one. */
export default async function MyApplications({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/penerimaan', 'penerimaan')
  const sp = await searchParams
  const apps = await myApplications(ctx)
  const names = apps.length ? await ctx.db.select({ id: persons.id, name: persons.fullName }).from(persons).where(inArray(persons.id, apps.map((a) => a.applicantPersonId))) : []
  const cycles = apps.length ? await ctx.db.select().from(admissionCycles).where(inArray(admissionCycles.id, [...new Set(apps.map((a) => a.cycleId))])) : []
  const open = (await publicSummary(ctx.db, ctx.now)).filter((c) => c.status === 'open')
  const openDetails = await Promise.all(open.map((c) => cycleDetail(ctx.db, c.id)))
  return (
    <>
      <PageHead title="Penerimaan siswa baru" sub="Pantau pendaftaran anak Anda: berkas, seleksi, hasil dan daftar ulang." />
      <Flash sp={sp} />
      {!ctx.account.emailVerified ? <Notice tone="warn">Verifikasi email akun Anda sebelum mengirim pendaftaran (cek kotak masuk). <Link href="/akun">Kirim ulang verifikasi</Link></Notice> : null}
      <div className="grid grid--side">
        <Card title="Pendaftaran saya">
          {apps.length ? (
            <ul className="list">
              {apps.map((a) => (
                <li key={a.id}>
                  <div className="grow">
                    <Link href={`/keluarga/penerimaan/${a.id}`}>
                      <strong>{names.find((n) => n.id === a.applicantPersonId)?.name}</strong>
                    </Link>
                    <div className="small muted">
                      {cycles.find((c) => c.id === a.cycleId)?.name} · {a.registrationNo ?? 'belum dikirim'} {a.submittedAt ? `· dikirim ${fmtDateTime(a.submittedAt, ctx.tz)}` : ''}
                    </div>
                  </div>
                  <Status value={a.status} map={APP_TONE} />
                  <Link className="btn btn--ghost btn--sm" href={`/keluarga/penerimaan/${a.id}`}>
                    Buka
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="clipboard">Belum ada pendaftaran.</Empty>
          )}
        </Card>
        <Card title="Daftarkan anak">
          {open.length ? (
            <ActionForm action="ppdb.mulai" back="/keluarga/penerimaan">
              <Field name="nama_anak" label="Nama lengkap calon siswa" required maxLength={120} />
              <Select name="pilihan" label="Periode & jalur" required options={openDetails.flatMap((d) => d!.paths.filter((p) => p.active).map((p) => [`${d!.cycle.id}:${p.id}`, `${d!.cycle.name} — ${p.name}${p.registrationFee ? ` (biaya ${rupiah(p.registrationFee)})` : ''}`] as [string, string]))} hint="Satu pendaftaran untuk setiap anak. Saudara/kembar didaftarkan masing-masing." />
              <Submit icon="plus">Mulai pendaftaran</Submit>
            </ActionForm>
          ) : (
            <Empty icon="calendar">Tidak ada periode pendaftaran yang sedang dibuka.</Empty>
          )}
          <p className="small" style={{ marginTop: 12 }}>
            <Link href="/penerimaan">Informasi penerimaan</Link>
          </p>
        </Card>
      </div>
    </>
  )
}
