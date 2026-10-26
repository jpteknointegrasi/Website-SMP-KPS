import { staffPage, requestModules } from '@/server/request'
import { MODULES, MODULE_STATES } from '@/server/settings'
import { MODULE_TONE } from '@/ui/tones'
import { ActionForm, Card, Flash, Notice, PageHead, Status, type SP } from '@/ui/kit'

export const metadata = { title: 'Aktivasi modul' }

/** MOD-01: modules are switched on step by step as the school is ready. */
export default async function Modules({ searchParams }: { searchParams: Promise<SP> }) {
  await staffPage('/staf/pengaturan/modul', ['settings.manage'])
  const sp = await searchParams
  const m = (await requestModules())!
  return (
    <>
      <PageHead title="Aktivasi modul" sub="Tahapan kesiapan dan aktivasi modul sesuai rencana pengembangan sekolah." />
      <Flash sp={sp} />
      <Notice tone="warn">Modul diaktifkan bertahap sesuai kesiapan sekolah. Konfigurasi/Pilot: hanya staf (dan keluarga pilot) yang melihat; Aktif: terbuka untuk seluruh keluarga.</Notice>
      <Card flush>
        <table className="t">
          <thead>
            <tr>
              <th>Tahap</th>
              <th>Modul</th>
              <th>Deskripsi</th>
              <th>Status</th>
              <th>Ubah status</th>
            </tr>
          </thead>
          <tbody>
            {[...MODULES].sort((a, b) => a.stage - b.stage).map((mod) => (
              <tr key={mod.code}>
                <td>{mod.stage}</td>
                <td>
                  <strong>{mod.label}</strong>
                </td>
                <td className="muted">{mod.desc}</td>
                <td>
                  <Status value={m[mod.code]} map={MODULE_TONE} />
                </td>
                <td>
                  <ActionForm action="pengaturan.modul" back="/staf/pengaturan/modul" hidden={{ modul: mod.code }} className="row">
                    <select name="status" defaultValue={m[mod.code]} aria-label={`Status ${mod.label}`} style={{ maxWidth: 170 }}>
                      {Object.entries(MODULE_STATES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn--ghost btn--sm" type="submit">
                      Simpan
                    </button>
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
