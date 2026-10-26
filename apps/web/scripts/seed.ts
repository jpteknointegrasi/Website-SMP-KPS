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
import { contentPackSchool } from './content-pack'

// Content pack of SMP Nasional KPS → only into that school (see content-pack.ts)
const payload = await contentPackSchool(await getPayload({ config }))
runSeed(payload)
  .then((r) => process.exit(r.done ? 0 : 1))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
