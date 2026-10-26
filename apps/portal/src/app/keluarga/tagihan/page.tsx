import { accountPage } from '@/server/request'
import { selectedStudent } from '@/modules/family'
import { invoicesFor } from '@/modules/finance/service'
import { BillsList } from '@/ui/application'
import { ChildPicker } from '@/ui/child-picker'
import { Empty, Flash, Notice, PageHead, rupiah, sp1, Stat, type SP } from '@/ui/kit'

export const metadata = { title: 'Tagihan' }

/** FIN-02 family: the selected child's invoices; proof of payment is checked by the finance office. */
export default async function FamilyBills({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await accountPage('/keluarga/tagihan', 'keuangan')
  const sp = await searchParams
  const { list, current } = await selectedStudent(ctx, sp1(sp, 'anak'))
  const ok = current && (current.canViewFinance || current.self)
  const bills = ok ? await invoicesFor(ctx, { studentId: current!.studentId }) : []
  const open = bills.filter((b) => ['unpaid', 'partial'].includes(b.status))
  return (
    <>
      <PageHead title="Tagihan" sub={current?.name} />
      <Flash sp={sp} />
      <ChildPicker items={list} current={current?.studentId ?? null} path="/keluarga/tagihan" />
      {current && !ok ? <Notice tone="info">Akses keuangan untuk anak ini tidak diberikan pada akun Anda.</Notice> : null}
      {ok ? (
        <>
          <div className="grid grid--2" style={{ marginBottom: 16 }}>
            <Stat icon="wallet" tone={open.length ? 'warn' : 'ok'} label="Belum terbayar" value={rupiah(open.reduce((a, b) => a + b.amount - b.paid, 0))} />
            <Stat icon="checkCircle" tone="ok" label="Sudah terverifikasi" value={rupiah(bills.reduce((a, b) => a + b.paid, 0))} />
          </div>
          {bills.length ? <BillsList bills={bills} back={`/keluarga/tagihan?anak=${current!.studentId}`} canPay={!current!.self} /> : <Empty icon="wallet">Tidak ada tagihan.</Empty>}
          <p className="small muted" style={{ marginTop: 12 }}>
            Pembayaran dihitung lunas setelah bukti dicocokkan bagian keuangan. Bila ada pertanyaan, hubungi tata usaha.
          </p>
        </>
      ) : null}
    </>
  )
}
