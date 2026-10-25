'use client'
import React, { useEffect, useState } from 'react'

const fmtNow = (TZ: string) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    .format(new Date())
    .replace(/\./g, ':')

/** Live clock in the school's time zone for the CMS dashboard (client-only to avoid hydration drift). */
export const AdminClock = ({ tz, zone }: { tz: string; zone: string }) => {
  const [t, setT] = useState('')
  useEffect(() => {
    setT(fmtNow(tz))
    const i = setInterval(() => setT(fmtNow(tz)), 1000)
    return () => clearInterval(i)
  }, [tz])
  return (
    <p className="kps-dash__clock" aria-live="off">
      <span className="kps-dash__pulse" aria-hidden="true" />
      {t ? `${t} ${zone}` : zone}
    </p>
  )
}

/** Compact "dalam 3 hari 4 jam" countdown, refreshed every 30 s. */
export const AdminCountdown = ({ to }: { to: string }) => {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const i = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(i)
  }, [])
  if (now === null) return null
  const diff = new Date(to).getTime() - now
  if (diff <= 0) return <em className="kps-dash__soon">berlangsung</em>
  const d = Math.floor(diff / 864e5)
  const h = Math.floor((diff % 864e5) / 36e5)
  const m = Math.floor((diff % 36e5) / 6e4)
  return <em className={`kps-dash__soon ${d < 1 ? 'is-hot' : ''}`}>dalam {d ? `${d} hari ` : ''}{h} jam{d ? '' : ` ${m} menit`}</em>
}
