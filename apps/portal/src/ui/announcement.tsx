import type { readAnnouncement } from '@/modules/comms/service'
import { AUDIENCE_LABEL } from '@/modules/comms/service'
import { fmtDateTime } from '@/server/time'
import { ActionForm, Badge, Card, fileUrl, Notice, Submit } from './kit'

/** Body of one announcement (staff and family views) with attachments and the acknowledgement button. */
export function AnnouncementView({ d, tz, back }: { d: Awaited<ReturnType<typeof readAnnouncement>>; tz: string; back: string }) {
  const { a, receipt } = d
  return (
    <Card
      title={a.title}
      actions={
        <span className="row">
          {a.pinned ? <Badge tone="brand">Disematkan</Badge> : null}
          <span className="small muted">{a.publishedAt ? fmtDateTime(a.publishedAt, tz) : 'Belum terbit'}</span>
        </span>
      }
    >
      <p className="small muted">
        Dari {a.createdByName ?? 'Sekolah'} · untuk {AUDIENCE_LABEL[a.audience.type].toLowerCase()}
      </p>
      <div className="prose">{a.body}</div>
      {d.files.length ? (
        <>
          <hr className="divider" />
          <ul className="small">
            {d.files.map((f) => (
              <li key={f.id}>
                <a href={fileUrl(f.id)!} target="_blank" rel="noopener">
                  {f.originalName}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {a.requiresAck && receipt ? (
        <div style={{ marginTop: 16 }}>
          {receipt.ackAt ? (
            <Notice tone="ok">Anda telah mengonfirmasi pada {fmtDateTime(receipt.ackAt, tz)}.</Notice>
          ) : (
            <ActionForm action="pengumuman.baca" back={back} hidden={{ id: a.id, konfirmasi: 'on' }}>
              <Notice tone="warn" title="Sekolah meminta konfirmasi">
                Tekan tombol di bawah untuk menyatakan Anda telah membaca dan memahami pengumuman ini.
              </Notice>
              <Submit icon="check">Saya sudah membaca</Submit>
            </ActionForm>
          )}
        </div>
      ) : null}
    </Card>
  )
}
