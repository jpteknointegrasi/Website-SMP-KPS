/**
 * Runs queued Payload jobs once (scheduled publish/unpublish), then exits.
 * Use from a system cron when the web server does not run jobs itself (DISABLE_JOB_AUTORUN=true):
 *   * * * * *  cd /srv/smp-kps && npm run jobs:run >> /var/log/kps-jobs.log 2>&1
 * Idempotent: running it twice processes nothing extra. Announcement expiry never depends on it
 * (public queries already filter by display_end).
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function main() {
  process.env.DISABLE_JOB_AUTORUN = 'true'
  const payload = await getPayload({ config })
  const res = await payload.jobs.run({ limit: 50 })
  payload.logger.info(`Jobs selesai: ${JSON.stringify(res)}`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
