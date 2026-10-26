import { permanentRedirect } from 'next/navigation'

/** Old address of the admissions portal: "pendaftaran" was ambiguous with open-house sign-up on the website. */
export default function OldAddress() {
  permanentRedirect('/penerimaan')
}
