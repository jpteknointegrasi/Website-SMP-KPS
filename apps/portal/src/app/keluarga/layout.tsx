import React from 'react'
import { accountPage, requestBranding, requestModules } from '@/server/request'
import { Shell } from '@/ui/shell'

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const ctx = await accountPage('/keluarga')
  return (
    <Shell ctx={ctx} branding={(await requestBranding())!} modules={(await requestModules())!} who="family">
      {children}
    </Shell>
  )
}
