import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Rate limit counters shared by every server instance (src/lib/rate-limit.ts). Not a Payload collection: one row per
 * (key, fixed time window), written with a single upsert. Holds no personal data — the key is a hash of IP + route.
 * Additive only; rollback drops the table (counters are disposable).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "rate_limit_hits" (
  	"key" varchar(128) NOT NULL,
  	"bucket" timestamp(3) with time zone NOT NULL,
  	"count" integer DEFAULT 0 NOT NULL,
  	CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY("key","bucket")
  );
  CREATE INDEX IF NOT EXISTS "rate_limit_hits_bucket_idx" ON "rate_limit_hits" USING btree ("bucket");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE IF EXISTS "rate_limit_hits";`)
}
