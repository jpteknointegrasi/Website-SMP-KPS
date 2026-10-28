import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { onPlatformHost, platformOperator } from '@/platform/session'
import { rawPayload } from '@/lib/payload'
import { LoginForm, SignOutButton } from './form'

export const metadata = { title: 'Masuk konsol platform' }

export default async function MasukPlatform() {
  if (!(await onPlatformHost())) notFound()
  if (await platformOperator()) redirect('/platform')
  // signed in, but not as the platform Super Admin (e.g. a school account on a preview address)
  const { user } = await (await rawPayload()).auth({ headers: await headers() })
  return (
    <div className="pub__main">
      <main id="main" className="pub__box pub__box--narrow" tabIndex={-1}>
        <p className="small muted" style={{ letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
          Satu Sekolah
        </p>
        <h1>Konsol platform</h1>
        <p className="muted">Khusus Super Admin platform. Admin dan staf sekolah masuk lewat alamat website sekolahnya masing-masing.</p>
        {user ? (
          <div className="note note--warn">
            Anda masuk sebagai <b>{user.email}</b>, yang bukan Super Admin platform.
            <div style={{ marginTop: 8 }}>
              <SignOutButton />
            </div>
          </div>
        ) : (
          <LoginForm />
        )}
      </main>
    </div>
  )
}
