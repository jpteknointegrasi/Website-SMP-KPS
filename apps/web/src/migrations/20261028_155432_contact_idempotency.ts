import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "contact_messages" ADD COLUMN "idempotency_key" varchar;
  CREATE UNIQUE INDEX "contact_messages_idempotency_key_idx" ON "contact_messages" USING btree ("idempotency_key");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "contact_messages_idempotency_key_idx";
  ALTER TABLE "contact_messages" DROP COLUMN "idempotency_key";`)
}
