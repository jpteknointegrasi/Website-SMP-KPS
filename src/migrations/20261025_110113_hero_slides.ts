import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "homepage" ADD COLUMN "hero_slide_interval" numeric DEFAULT 6;
  ALTER TABLE "_homepage_v" ADD COLUMN "version_hero_slide_interval" numeric DEFAULT 6;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "homepage" DROP COLUMN "hero_slide_interval";
  ALTER TABLE "_homepage_v" DROP COLUMN "version_hero_slide_interval";`)
}
