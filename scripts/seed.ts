/**
 * CLI seed. Idempotent: re-running updates records by slug and skips media by checksum.
 *
 *   npm run seed                 # content + media (uses .env)
 *   npm run seed:prod            # same, using .env.vercel (production database + Vercel Blob)
 *   SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run seed   # also creates the first admin account
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { runSeed } from './seed-core'

const payload = await getPayload({ config })
runSeed(payload)
  .then((r) => process.exit(r.done ? 0 : 1))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
