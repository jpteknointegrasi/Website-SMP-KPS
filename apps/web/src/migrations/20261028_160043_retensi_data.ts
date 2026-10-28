import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Data retention (additive): per-school retention settings (empty = off), anonymizedAt on leads, contact messages
 * and visit bookings, and the scheduled task anonymizeExpiredData. No existing data is changed.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'anonymizeExpiredData' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'anonymizeExpiredData' BEFORE 'schedulePublish';
  ALTER TABLE "leads" ADD COLUMN "anonymized_at" timestamp(3) with time zone;
  ALTER TABLE "visit_bookings" ADD COLUMN "anonymized_at" timestamp(3) with time zone;
  ALTER TABLE "contact_messages" ADD COLUMN "anonymized_at" timestamp(3) with time zone;
  ALTER TABLE "site_settings" ADD COLUMN "retensi_minat_bulan" numeric;
  ALTER TABLE "site_settings" ADD COLUMN "retensi_pesan_bulan" numeric;
  ALTER TABLE "site_settings" ADD COLUMN "retensi_kunjungan_bulan" numeric;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_retensi_minat_bulan" numeric;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_retensi_pesan_bulan" numeric;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_retensi_kunjungan_bulan" numeric;
  CREATE INDEX "leads_anonymized_at_idx" ON "leads" USING btree ("anonymized_at");
  CREATE INDEX "visit_bookings_anonymized_at_idx" ON "visit_bookings" USING btree ("anonymized_at");
  CREATE INDEX "contact_messages_anonymized_at_idx" ON "contact_messages" USING btree ("anonymized_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // job rows of the removed task would block the enum rewrite below
  await db.execute(sql`
  DELETE FROM "payload_jobs_log" WHERE "task_slug" = 'anonymizeExpiredData';
  DELETE FROM "payload_jobs" WHERE "task_slug" = 'anonymizeExpiredData';
   ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'releaseVisitHolds', 'syncAppWorks', 'syncAppLeads', 'schedulePublish');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'releaseVisitHolds', 'syncAppWorks', 'syncAppLeads', 'schedulePublish');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "leads_anonymized_at_idx";
  DROP INDEX "visit_bookings_anonymized_at_idx";
  DROP INDEX "contact_messages_anonymized_at_idx";
  ALTER TABLE "leads" DROP COLUMN "anonymized_at";
  ALTER TABLE "visit_bookings" DROP COLUMN "anonymized_at";
  ALTER TABLE "contact_messages" DROP COLUMN "anonymized_at";
  ALTER TABLE "site_settings" DROP COLUMN "retensi_minat_bulan";
  ALTER TABLE "site_settings" DROP COLUMN "retensi_pesan_bulan";
  ALTER TABLE "site_settings" DROP COLUMN "retensi_kunjungan_bulan";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_retensi_minat_bulan";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_retensi_pesan_bulan";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_retensi_kunjungan_bulan";`)
}
