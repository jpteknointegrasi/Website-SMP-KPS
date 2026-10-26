import { staffPage, requestBranding } from '@/server/request'
import { cardsForPrint } from '@/modules/cards/service'
import { PrintButton } from '@/ui/client'
import { CardBack, CardFront } from '@/ui/student-card'
import { ActionForm, Card, Empty, Notice, PageHead, Submit, type SP } from '@/ui/kit'

export const metadata = { title: 'Cetak kartu siswa' }

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

/**
 * KRT-02 A4 print: 2 × 5 cards per page at real size (margin 10 mm, gutters 4 / 1.5 mm); backs on the following page,
 * mirrored for duplex. Print at 100% scale; test-scan and check duplex alignment before a mass run.
 */
export default async function PrintCards({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await staffPage('/staf/kartu/cetak', ['cards.manage'], 'kartu')
  const sp = await searchParams
  const ids = [...String(sp.kartu ?? '').split(','), ...(Array.isArray(sp.k) ? sp.k : sp.k ? [sp.k] : [])].filter((x) => /^[0-9a-f-]{36}$/.test(x))
  const b = (await requestBranding())!
  const cards = await cardsForPrint(ctx, ids.slice(0, 200))
  const pages = chunk(cards, 10)
  return (
    <>
      <div className="no-print">
        <PageHead title="Cetak kartu siswa" sub={`${cards.length} kartu · ${pages.length} lembar A4 (depan) + ${pages.length} lembar (belakang).`} crumbs={[['Kartu siswa', '/staf/kartu'], ['Cetak']]} actions={cards.length ? <PrintButton /> : null} />
        {cards.length ? (
          <>
            <Notice tone="warn">Pastikan ukuran cetak 100% (tanpa skala) agar kartu sesuai ukuran sebenarnya. Uji pindai QR dan kesejajaran bolak-balik pada satu lembar sebelum mencetak massal.</Notice>
            <Card>
              <ActionForm action="kartu.tercetak" back="/staf/kartu" className="row">
                {cards.map((c) => (
                  <input key={c.card.id} type="hidden" name="kartu" value={c.card.id} />
                ))}
                <span className="grow muted">Setelah dicetak dan diperiksa, tandai kartu sebagai tercetak.</span>
                <Submit tone="ok" icon="check">Tandai sudah dicetak</Submit>
              </ActionForm>
            </Card>
          </>
        ) : (
          <Empty icon="card">Tidak ada kartu berlaku yang dipilih.</Empty>
        )}
      </div>
      {pages.map((p, i) => (
        <div key={`f${i}`} className="sheet">
          {p.map((c) => (
            <CardFront key={c.card.id} d={{ name: c.name, nis: c.nis, nisn: c.nisn, entryYear: c.entryYear, photo: c.photo, cardNo: c.card.cardNo, validUntil: c.card.validUntil, qr: c.qr }} s={c.tpl.settings} b={b} schoolName={ctx.school.name} />
          ))}
        </div>
      ))}
      {pages.map((p, i) => (
        <div key={`b${i}`} className="sheet sheet--back">
          {p.map((c) => (
            <CardBack key={c.card.id} s={c.tpl.settings} b={b} schoolName={ctx.school.name} />
          ))}
        </div>
      ))}
    </>
  )
}
