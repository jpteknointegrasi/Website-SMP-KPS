import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "student_works" ADD COLUMN "app_ref" varchar;
  ALTER TABLE "_student_works_v" ADD COLUMN "version_app_ref" varchar;
  CREATE INDEX "student_works_app_ref_idx" ON "student_works" USING btree ("app_ref");
  CREATE INDEX "_student_works_v_version_version_app_ref_idx" ON "_student_works_v" USING btree ("version_app_ref");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "student_works_app_ref_idx";
  DROP INDEX "_student_works_v_version_version_app_ref_idx";
  ALTER TABLE "student_works" DROP COLUMN "app_ref";
  ALTER TABLE "_student_works_v" DROP COLUMN "version_app_ref";`)
}
