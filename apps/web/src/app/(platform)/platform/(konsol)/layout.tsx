import React from 'react'
import { requireOperator } from '@/platform/session'
import { rawPayload } from '@/lib/payload'
import { ConsoleNav } from './nav'
import { SignOutButton } from '../masuk/form'

/** Platform console shell: platform address + signed-in Super Admin only (each page and action checks again). */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const operator = await requireOperator()
  const pending = await (await rawPayload()).count({ collection: 'school-applications', where: { status: { equals: 'pending' } }, overrideAccess: true })
  return (
    <div className="pf">
      <aside className="pf__side">
        <div className="pf__brand">
          <span>SatuSekolah</span>
          <strong>Konsol platform</strong>
        </div>
        <ConsoleNav pending={pending.totalDocs} />
        <div className="pf__user">
          <div>
            <strong>{operator.name}</strong>
            <span>Super Admin · {operator.email}</span>
          </div>
          <SignOutButton className="" />
        </div>
      </aside>
      <main id="main" className="pf__main" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
