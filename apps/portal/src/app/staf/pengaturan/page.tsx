import { staffPage, requestBranding } from '@/server/request'
import { mailConfigured } from '@/server/mail'
import { ActionForm, Card, Field, FileField, Flash, Notice, PageHead, publicFileUrl, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Pengaturan sekolah' }

/** School identity used by the App: crest, photo, contact, principal (for documents), brand colours. */
export default async function Settings({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/pengaturan', ['settings.manage'])
  const sp = await searchParams
  const b = (await requestBranding())!
  return (
    <>
      <PageHead title="Pengaturan sekolah" sub="Identitas sekolah untuk portal, kartu siswa dan dokumen cetak." />
      <Flash sp={sp} />
      {!mailConfigured() ? <Notice tone="warn" title="Server email belum diatur">Email verifikasi dan notifikasi belum terkirim (SMTP_HOST kosong). Atur SMTP di pengaturan deployment portal.</Notice> : null}
      <ActionForm action="pengaturan.branding" back="/staf/pengaturan" files>
        <div className="grid grid--2">
          <Card title="Identitas">
            <div className="stack">
              <Field name="nama_singkat" label="Nama ringkas" value={b.shortName} placeholder={ctx.school.name} hint={`Nama lengkap: ${ctx.school.name} (diatur di platform).`} />
              <Field name="kota" label="Lokasi / kota" value={b.city} placeholder="Balikpapan" />
              <Field name="alamat" label="Alamat sekolah" value={b.address} />
              <div className="f__row">
                <Field name="telepon" label="Telepon" value={b.phone} />
                <Field name="email" label="Email sekolah" value={b.email} />
              </div>
              <div className="f__row">
                <Field name="kepala" label="Nama kepala sekolah" value={b.principalName} />
                <Field name="nip_kepala" label="NIP kepala sekolah" value={b.principalNip} />
              </div>
            </div>
          </Card>
          <Card title="Logo, foto & warna">
            <div className="stack">
              <div className="row">
                {b.logoFileId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicFileUrl(b.logoFileId)!} alt="Logo saat ini" style={{ width: 72, height: 72, objectFit: 'contain' }} />
                ) : null}
                <FileField name="logo" label="Logo sekolah (PNG/JPG/WEBP, maks. 2 MB)" accept=".png,.jpg,.jpeg,.webp" hint="Dipakai utuh (tidak dipotong) di sidebar, login, kartu dan dokumen." />
              </div>
              <div className="row">
                {b.heroFileId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicFileUrl(b.heroFileId)!} alt="Foto saat ini" style={{ width: 120, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                ) : null}
                <FileField name="foto" label="Foto gedung/sekolah (maks. 4 MB)" accept=".png,.jpg,.jpeg,.webp" hint="Untuk halaman masuk dan sisi belakang kartu." />
              </div>
              <div className="f__row">
                <Field name="warna_utama" type="color" label="Warna utama" value={b.primary} />
                <Field name="warna_navy" type="color" label="Warna sidebar" value={b.navy} />
              </div>
            </div>
          </Card>
        </div>
        <div className="f__actions">
          <Submit>Simpan pengaturan</Submit>
        </div>
      </ActionForm>
    </>
  )
}
