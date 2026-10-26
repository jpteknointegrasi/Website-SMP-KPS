import Link from 'next/link'
import { myCards } from './service'
import { familyWidget } from '../widgets'
import { Card } from '@/ui/kit'

familyWidget({
  order: 80,
  mod: 'kartu',
  render: async (ctx, s) => {
    const card = (await myCards(ctx)).find((c) => c.studentId === s.studentId)
    return (
      <Card title="Kartu siswa digital">
        <p className="muted">{card ? `Kartu ${card.card.cardNo} berlaku.` : 'Kartu belum diterbitkan.'}</p>
        {card ? (
          <Link className="btn btn--ghost" href={`/keluarga/kartu?anak=${s.studentId}`}>
            Lihat kartu siswa
          </Link>
        ) : null}
      </Card>
    )
  },
})
