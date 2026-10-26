import { redirect } from 'next/navigation'
import { DefaultListView } from '@payloadcms/ui'
import type { ListViewServerProps } from 'payload'
import React from 'react'
import { adminSchool } from '@/tenancy/admin'
import { findSingleton } from '@/tenancy/scoped'
import type { SingletonSlug } from '@/tenancy/config'

/**
 * List view of a per-school settings collection (former global). School staff never see a list: they go straight
 * to their school's document (created on first visit if it is missing). The Super Admin on the platform address
 * gets the normal list of all schools' documents.
 */
export async function SingletonList(props: ListViewServerProps) {
  const { payload, user, collectionConfig } = props
  const slug = collectionConfig.slug as SingletonSlug
  const school = await adminSchool(payload, user)
  if (school) {
    const doc = await findSingleton(payload, slug, school.id, { depth: 0, overrideAccess: true, draft: true })
    redirect(doc ? `/admin/collections/${slug}/${doc.id}` : `/admin/collections/${slug}/create`)
  }
  const {
    collectionConfig: _c,
    data: _d,
    limit: _l,
    listPreferences: _p,
    listSearchableFields: _s,
    payload: _pl,
    i18n: _i,
    locale: _lo,
    params: _pa,
    permissions: _pe,
    searchParams: _sp,
    user: _u,
    ...client
  } = props as ListViewServerProps & Record<string, unknown>
  return <DefaultListView {...(client as React.ComponentProps<typeof DefaultListView>)} />
}
