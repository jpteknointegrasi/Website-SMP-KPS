import { portalDbState, portalEnabled, portalSchool, portalStaff } from '@/lib/context'

/** Readiness of the portal for the school on this address. Details only for that school's staff. */
export async function GET() {
  const school = await portalSchool()
  if (!school) return Response.json({ ok: false }, { status: 404 })
  const staff = await portalStaff()
  if (!staff) return Response.json({ ok: true })
  return Response.json({ ok: true, school: school.slug, app: await portalEnabled(), database: await portalDbState() })
}
