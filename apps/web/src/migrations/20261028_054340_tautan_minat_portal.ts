import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'syncAppLeads' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'syncAppLeads' BEFORE 'schedulePublish';
  ALTER TABLE "leads" ADD COLUMN "app_link_ref" varchar;
  ALTER TABLE "leads" ADD COLUMN "app_application_no" varchar;
  ALTER TABLE "leads" ADD COLUMN "app_linked_at" timestamp(3) with time zone;
  CREATE INDEX "leads_app_link_ref_idx" ON "leads" USING btree ("app_link_ref");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // job rows of the removed task would block the enum rewrite below
  await db.execute(sql`
  DELETE FROM "payload_jobs_log" WHERE "task_slug" = 'syncAppLeads';
  DELETE FROM "payload_jobs" WHERE "task_slug" = 'syncAppLeads';
   ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'releaseVisitHolds', 'syncAppWorks', 'schedulePublish');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'releaseVisitHolds', 'syncAppWorks', 'schedulePublish');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "leads_app_link_ref_idx";
  ALTER TABLE "leads" DROP COLUMN "app_link_ref";
  ALTER TABLE "leads" DROP COLUMN "app_application_no";
  ALTER TABLE "leads" DROP COLUMN "app_linked_at";`)
}
