/**
 * Home-page sections for family/student portals, contributed by modules (schedule today, tasks, attendance,
 * announcements, report). Each widget receives the selected student and returns nothing when it has nothing to show.
 */
import type React from 'react'
import type { Ctx } from '@/server/context'
import type { ModuleCode } from '@/server/settings'

export type FamilyWidget = { order: number; mod?: ModuleCode; render: (ctx: Ctx, s: { studentId: string; name: string; self?: boolean; canViewAcademic: boolean; canViewFinance: boolean }) => Promise<React.ReactNode> }
const widgets: FamilyWidget[] = []
export const familyWidget = (w: FamilyWidget) => void widgets.push(w)
export const familyWidgets = () => [...widgets].sort((a, b) => a.order - b.order)
