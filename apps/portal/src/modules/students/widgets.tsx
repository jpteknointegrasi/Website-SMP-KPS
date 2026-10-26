import Link from 'next/link'
import { getStudent } from './service'
import { familyWidget } from '../widgets'
import { Badge, Card, Progress } from '@/ui/kit'

familyWidget({
  order: 90,
  mod: 'buku_induk',
  render: async (ctx, s) => {
    const d = await getStudent(ctx, s.studentId)
    return (
      <Card title="Data siswa" actions={<Link href={`/keluarga/data?anak=${s.studentId}`}>Lihat</Link>}>
        <p>
          {d.person.fullName} · NIS {d.student.nis ?? '—'} · {d.placement?.homeroom ?? 'Rombel —'}
        </p>
        <div className="row">
          <span className="grow">
            <Progress value={d.completeness.percent} ok={d.completeness.percent === 100} />
          </span>
          {d.completeness.percent === 100 ? <Badge tone="ok">Lengkap</Badge> : <Badge tone="warn">{d.completeness.percent}%</Badge>}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          Ada data yang keliru? Ajukan koreksi dari halaman Data siswa.
        </p>
      </Card>
    )
  },
})
