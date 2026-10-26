import Link from 'next/link'
import { accountPage, requestModules } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { familyWidgets } from '@/modules/widgets'
import '@/modules/register'
import { moduleOpen } from '@/server/settings'
import { fmtDayDate, today } from '@/server/time'
import { ActionForm, Card, Field, Flash, Notice, PageHead, sp1, Submit, type SP } from '@/ui/kit'
import { ChildPicker } from '@/ui/child-picker'

export const metadata = { title: 'Beranda' }

/** SIS-01 / WLI-01 home: the selected student's day at a glance (sections come from active modules). */
export default async function FamilyHome({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const modules = (await requestModules())!
  const sections = current ? await Promise.all(familyWidgets().filter((w) => !w.mod || moduleOpen(modules, w.mod, 'family')).map((w) => w.render(ctx, current))) : []
  return (
    <>
      <PageHead title={current?.self ? `Selamat datang, ${current.name}!` : `Selamat datang, ${ctx.account.name}`} sub={fmtDayDate(today(ctx.tz, ctx.now))} />
      <Flash sp={sp} />
      {!ctx.account.emailVerified && ctx.account.email ? (
        <Notice tone="warn" title="Email belum diverifikasi">
          Buka tautan verifikasi di email Anda. <Link href="/akun">Kirim ulang</Link>
        </Notice>
      ) : null}
      <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga" />
      {current ? (
        <div className="grid grid--2">{sections.filter(Boolean).map((s, i) => <div key={i}>{s}</div>)}</div>
      ) : (
        <div className="grid grid--2">
          {moduleOpen(modules, 'penerimaan', 'family') ? (
            <Card title="Mendaftarkan anak ke sekolah ini?">
              <p>Isi formulir penerimaan siswa baru, unggah berkas, dan pantau hasilnya dari portal.</p>
              <Link className="btn" href="/keluarga/penerimaan">
                Buka penerimaan siswa baru
              </Link>
            </Card>
          ) : null}
          <Card title="Orang tua/wali siswa yang sudah bersekolah">
            <p className="muted">Masukkan kode aktivasi dari sekolah untuk menghubungkan akun ini dengan data anak Anda.</p>
            <ActionForm action="akun.kode" back="/keluarga">
              <Field name="kode" label="Kode aktivasi" placeholder="XXXX-XXXX-XXXX" required />
              <Submit>Hubungkan</Submit>
            </ActionForm>
          </Card>
        </div>
      )}
    </>
  )
}
