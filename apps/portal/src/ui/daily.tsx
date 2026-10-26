/** Shared pieces of the daily-academics screens: lesson agenda, week timetable, attendance roll and recap meter. */
import type React from 'react'
import type { Lesson } from '@/modules/schedule/service'
import { Badge } from './kit'

const STAT = [
  ['H', 'Hadir'],
  ['S', 'Sakit'],
  ['I', 'Izin'],
  ['A', 'Alpa'],
  ['D', 'Dispensasi'],
] as const

/** Lessons of one day, in time order; cancelled ones dimmed, the current one highlighted. */
export function Agenda({ lessons, now, show = 'teacher', action, compact }: { lessons: Lesson[]; now?: string; show?: 'teacher' | 'homeroom'; action?: (l: Lesson) => React.ReactNode; compact?: boolean }) {
  return (
    <ul className={compact ? 'agenda agenda--compact' : 'agenda'}>
      {(compact ? merge(lessons) : lessons).map((l) => {
        const on = now && !l.cancelled && l.start <= now && now < l.end
        return (
          <li key={l.entryId} className={l.cancelled ? 'is-off' : on ? 'is-now' : undefined}>
            <time>
              {l.start}–{l.end}
            </time>
            <span className="grow">
              <strong>{l.subject}</strong>
              <small>
                {show === 'teacher' ? l.homeroom : l.substitute ? `${l.substitute} (pengganti)` : l.teacher}
                {l.room ? ` · ${l.room}` : ''}
                {show === 'teacher' && l.substitute ? ` · pengganti: ${l.substitute}` : ''}
              </small>
            </span>
            {l.cancelled ? <Badge tone="muted">{l.cancelled}</Badge> : on ? <Badge tone="brand">Sekarang</Badge> : null}
            {action && !l.cancelled ? action(l) : null}
          </li>
        )
      })}
    </ul>
  )
}

/** Joins back-to-back periods of the same class & subject (double lessons) for compact views. */
function merge(lessons: Lesson[]) {
  const out: Lesson[] = []
  for (const l of lessons) {
    const p = out[out.length - 1]
    if (p && p.assignmentId === l.assignmentId && p.cancelled === l.cancelled && p.substitute === l.substitute && p.end === l.start) out[out.length - 1] = { ...p, end: l.end }
    else out.push(l)
  }
  return out
}

type Slot = { id: string; label: string; startTime: string; endTime: string; kind: string }
type Cell = { e: { day: number; slotId: string; room: string | null; assignmentId: string }; subject: string; teacher: string }

/** Monday–Friday (or Saturday) grid of a homeroom. `edit` renders the editor for a cell. */
export function WeekGrid({ slots, cells, days = 5, today, edit }: { slots: Slot[]; cells: Cell[]; days?: number; today?: number; edit?: (day: number, slot: Slot, cell: Cell | undefined) => React.ReactNode }) {
  const names = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].slice(0, days)
  return (
    <div className="tablewrap">
      <table className="tt">
        <thead>
          <tr>
            <th className="tt__slot">Jam</th>
            {names.map((n, i) => (
              <th key={n} style={today === i + 1 ? { color: 'var(--brand)' } : undefined}>
                {n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((s) =>
            s.kind === 'break' ? (
              <tr key={s.id}>
                <th className="tt__slot">
                  <strong>{s.label}</strong>
                  {s.startTime}–{s.endTime}
                </th>
                <td className="tt__break" colSpan={days}>
                  {s.label}
                </td>
              </tr>
            ) : (
              <tr key={s.id}>
                <th className="tt__slot">
                  <strong>{s.label}</strong>
                  {s.startTime}–{s.endTime}
                </th>
                {names.map((_, i) => {
                  const c = cells.find((x) => x.e.day === i + 1 && x.e.slotId === s.id)
                  return (
                    <td key={i} className={c ? 'tt__on' : undefined}>
                      {edit ? (
                        edit(i + 1, s, c)
                      ) : c ? (
                        <>
                          <strong>{c.subject}</strong>
                          <small>
                            {c.teacher}
                            {c.e.room ? ` · ${c.e.room}` : ''}
                          </small>
                        </>
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}

/** Attendance roll rows: one segmented H/S/I/A/D radio per student (`st:<id>`) and an optional note (`cat:<id>`). */
export function RollRows({ rows, disabled }: { rows: { studentId: string; name: string; nis: string | null; status: string; note?: string | null; hint?: React.ReactNode }[]; disabled?: boolean }) {
  return (
    <div className="tablewrap">
      <table className="t">
        <thead>
          <tr>
            <th>#</th>
            <th>Siswa</th>
            <th>Kehadiran</th>
            <th className="hide-sm">Catatan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.studentId}>
              <td className="muted">{i + 1}</td>
              <td>
                <strong>{r.name}</strong>
                <div className="small muted">
                  {r.nis ?? '—'} {r.hint}
                </div>
              </td>
              <td>
                <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="sr">Kehadiran {r.name}</legend>
                  <div className="att">
                  {STAT.map(([v, l]) => (
                    <label key={v} title={l}>
                      <input type="radio" name={`st:${r.studentId}`} value={v} defaultChecked={r.status === v} />
                      <span>{v}</span>
                    </label>
                  ))}
                  </div>
                </fieldset>
              </td>
              <td className="hide-sm">
                <input name={`cat:${r.studentId}`} defaultValue={r.note ?? ''} maxLength={200} aria-label={`Catatan ${r.name}`} disabled={disabled} style={{ width: '100%' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Proportional bar of a recap (H/S/I/A/D) with the attendance rate. */
export function RecapMeter({ r }: { r: { H: number; S: number; I: number; A: number; D: number; total: number; rate: number | null } }) {
  if (!r.total) return <span className="muted small">Belum ada catatan presensi.</span>
  const seg = [
    ['H', 'var(--ok)'],
    ['D', 'var(--info)'],
    ['S', '#d08a00'],
    ['I', '#f0c35a'],
    ['A', 'var(--bad)'],
  ] as const
  return (
    <div className="stack">
      <div className="meter" role="img" aria-label={`Kehadiran ${r.rate}%`}>
        {seg.map(([k, c]) => (r[k] ? <i key={k} style={{ width: `${(r[k] / r.total) * 100}%`, background: c }} /> : null))}
      </div>
      <div className="row small">
        <strong>{r.rate}% hadir</strong>
        <span className="muted">
          H {r.H} · S {r.S} · I {r.I} · A {r.A} · D {r.D} (dari {r.total} hari)
        </span>
      </div>
    </div>
  )
}

export const ATT_STATUS = STAT
