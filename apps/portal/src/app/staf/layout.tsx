import React from 'react'
import { requestBranding, requestModules, staffPage } from '@/server/request'
import { Shell } from '@/ui/shell'

/** Staff workspace. Each page checks its own permissions too (layouts are not re-run on every navigation). */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const ctx = await staffPage('/staf')
  return (
    <Shell ctx={ctx} branding={(await requestBranding())!} modules={(await requestModules())!} who="staff">
      {children}
    </Shell>
  )
}
