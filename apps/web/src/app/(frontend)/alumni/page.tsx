import { currentTenant } from '@/lib/payload'
import { CONTENT_PACK_SLUG } from '../../../../scripts/content-pack'
import { IkaAlumniPage, ikaMetadata } from './ika'
import { GenericAlumniPage, genericMetadata } from './generic'

/**
 * /alumni. SMP Nasional KPS has the IKA KPS page (its alumni association, with starting content from the IKA KPS
 * material); every other school gets the general alumni page, so no KPS content ever appears on another school's site.
 */
const isKps = async () => (await currentTenant())?.slug === CONTENT_PACK_SLUG

export async function generateMetadata() {
  return (await isKps()) ? ikaMetadata : genericMetadata()
}

export default async function Page() {
  return (await isKps()) ? <IkaAlumniPage /> : <GenericAlumniPage />
}
