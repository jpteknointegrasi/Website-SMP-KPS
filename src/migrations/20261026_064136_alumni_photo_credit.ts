import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "alumni_page" ADD COLUMN "photo_credit" varchar;
  ALTER TABLE "_alumni_page_v" ADD COLUMN "version_photo_credit" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "alumni_page" DROP COLUMN "photo_credit";
  ALTER TABLE "_alumni_page_v" DROP COLUMN "version_photo_credit";`)
}
