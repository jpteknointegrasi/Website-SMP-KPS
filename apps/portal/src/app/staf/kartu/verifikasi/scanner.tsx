'use client'
import { useEffect, useRef, useState } from 'react'

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }

/**
 * Card QR scanner using the browser's built-in BarcodeDetector (Chrome/Android, Safari 17+). Where it is not available,
 * the manual input next to it still works. The camera stream stays on the device.
 */
export function Scanner() {
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'idle' | 'on' | 'unsupported' | 'denied'>('idle')
  useEffect(() => {
    if (!('BarcodeDetector' in window)) setState('unsupported')
  }, [])
  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const v = video.current!
      v.srcObject = stream
      await v.play()
      setState('on')
      const det = new (window as unknown as { BarcodeDetector: new (o: object) => Detector }).BarcodeDetector({ formats: ['qr_code'] })
      const tick = async () => {
        if (!v.srcObject) return
        const found = await det.detect(v).catch(() => [])
        const m = found[0] && /\/portal\/v\/([A-Za-z0-9_-]{20,40})/.exec(found[0].rawValue)
        if (m) {
          stream.getTracks().forEach((t) => t.stop())
          window.location.assign(`/portal/v/${m[1]}`)
          return
        }
        requestAnimationFrame(tick)
      }
      tick()
    } catch {
      setState('denied')
    }
  }
  if (state === 'unsupported') return <p className="muted small">Pemindai kamera tidak didukung browser ini. Gunakan kamera ponsel (aplikasi kamera bawaan) atau input manual.</p>
  return (
    <div>
      <video ref={video} playsInline muted style={{ width: '100%', maxWidth: 360, borderRadius: 12, background: '#0b2356', display: state === 'on' ? 'block' : 'none' }} />
      {state !== 'on' ? (
        <button className="btn" type="button" onClick={start}>
          Nyalakan kamera & pindai QR
        </button>
      ) : null}
      {state === 'denied' ? <p className="small" style={{ color: 'var(--bad)' }}>Akses kamera ditolak. Izinkan kamera atau gunakan input manual.</p> : null}
    </div>
  )
}
