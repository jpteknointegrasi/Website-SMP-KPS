/**
 * Creates (or promotes) the platform Super Admin — the operator who manages schools.
 *
 *   npm run platform:superadmin -- --email anda@domain.id [--nama "Nama Anda"]
 *
 * A new account gets a temporary password printed ONCE. An existing account with that email is promoted
 * (it then belongs to no school). Uses .env (DATABASE_URI); the :prod variant uses .env.vercel.
 */
import 'dotenv/config'
import { randomBytes } from 'crypto'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const args = process.argv.slice(2)
const arg = (n: string) => args[args.indexOf(`--${n}`) + 1]
const email = args.includes('--email') ? arg('email')?.toLowerCase() : undefined
const name = args.includes('--nama') ? arg('nama') : 'Super Admin Platform'
if (!email) {
  console.error('✗ Wajib: --email')
  process.exit(1)
}
const payload = await getPayload({ config })
const found = (await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })).docs[0]
if (found) {
  await payload.update({ collection: 'users', id: found.id, overrideAccess: true, data: { role: 'superadmin', tenant: null } as never })
  console.log(`✓ ${email} sekarang Super Admin platform (tidak lagi terikat ke satu sekolah).`)
} else {
  const password = randomBytes(12).toString('base64url')
  await payload.create({ collection: 'users', overrideAccess: true, data: { email, password, name: name!, role: 'superadmin' } as never })
  console.log(`✓ Super Admin dibuat: ${email}\n  Kata sandi sementara (hanya ditampilkan sekali): ${password}`)
}
process.exit(0)
