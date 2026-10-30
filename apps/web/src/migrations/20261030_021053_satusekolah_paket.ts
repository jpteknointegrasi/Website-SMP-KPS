import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_school_applications_package" AS ENUM('gratis', 'cms', 'lengkap');
  ALTER TABLE "tenants" ADD COLUMN "web_cms_until" timestamp(3) with time zone;
  ALTER TABLE "_tenants_v" ADD COLUMN "version_web_cms_until" timestamp(3) with time zone;
  ALTER TABLE "school_applications" ADD COLUMN "package" "enum_school_applications_package";`)
  // Paket Lengkap: a school with SatuSekolah App always has Website + CMS (there is no App-only package).
  await db.execute(sql`UPDATE "tenants" SET "web_plan" = 'pro' WHERE "app_plan" <> 'none' AND "web_plan" <> 'pro';`)
  // Earlier applications: derive the package from the products they asked for (Web only → Website Gratis).
  await db.execute(sql`UPDATE "school_applications" SET "package" = CASE WHEN "want_app" THEN 'lengkap' ELSE 'gratis' END::"enum_school_applications_package" WHERE "package" IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tenants" DROP COLUMN "web_cms_until";
  ALTER TABLE "_tenants_v" DROP COLUMN "version_web_cms_until";
  ALTER TABLE "school_applications" DROP COLUMN "package";
  DROP TYPE "public"."enum_school_applications_package";`)
}
