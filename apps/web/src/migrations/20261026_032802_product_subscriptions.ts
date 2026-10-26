import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Sekolahku Web and Sekolahku App are sold separately: the single school `plan` becomes one subscription per product.
 *   tenants.plan (basic|pro)  →  web_plan (none|basic|pro) + web_status   — existing plans are kept as Web plans
 *   new: app_plan (none|pilot|standard) + app_status, app_database (sealed URL of the school's own App database)
 * Rollback refuses while any school has an App subscription or App database, so nothing is silently lost.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tenants_web_plan" AS ENUM('none', 'basic', 'pro');
  CREATE TYPE "public"."enum_tenants_web_status" AS ENUM('active', 'trial', 'paused');
  CREATE TYPE "public"."enum_tenants_app_plan" AS ENUM('none', 'pilot', 'standard');
  CREATE TYPE "public"."enum_tenants_app_status" AS ENUM('active', 'trial', 'paused');
  CREATE TYPE "public"."enum__tenants_v_version_web_plan" AS ENUM('none', 'basic', 'pro');
  CREATE TYPE "public"."enum__tenants_v_version_web_status" AS ENUM('active', 'trial', 'paused');
  CREATE TYPE "public"."enum__tenants_v_version_app_plan" AS ENUM('none', 'pilot', 'standard');
  CREATE TYPE "public"."enum__tenants_v_version_app_status" AS ENUM('active', 'trial', 'paused');
  ALTER TABLE "tenants" ADD COLUMN "web_plan" "enum_tenants_web_plan" DEFAULT 'basic' NOT NULL;
  ALTER TABLE "tenants" ADD COLUMN "web_status" "enum_tenants_web_status" DEFAULT 'active' NOT NULL;
  ALTER TABLE "tenants" ADD COLUMN "app_plan" "enum_tenants_app_plan" DEFAULT 'none' NOT NULL;
  ALTER TABLE "tenants" ADD COLUMN "app_status" "enum_tenants_app_status" DEFAULT 'trial' NOT NULL;
  ALTER TABLE "tenants" ADD COLUMN "app_database" varchar;
  ALTER TABLE "_tenants_v" ADD COLUMN "version_web_plan" "enum__tenants_v_version_web_plan" DEFAULT 'basic' NOT NULL;
  ALTER TABLE "_tenants_v" ADD COLUMN "version_web_status" "enum__tenants_v_version_web_status" DEFAULT 'active' NOT NULL;
  ALTER TABLE "_tenants_v" ADD COLUMN "version_app_plan" "enum__tenants_v_version_app_plan" DEFAULT 'none' NOT NULL;
  ALTER TABLE "_tenants_v" ADD COLUMN "version_app_status" "enum__tenants_v_version_app_status" DEFAULT 'trial' NOT NULL;
  ALTER TABLE "_tenants_v" ADD COLUMN "version_app_database" varchar;`)
  // existing schools keep their plan as their Web plan
  await db.execute(sql`UPDATE tenants SET web_plan = plan::text::enum_tenants_web_plan, web_status = 'active'`)
  await db.execute(sql`UPDATE _tenants_v SET version_web_plan = version_plan::text::enum__tenants_v_version_web_plan`)
  await db.execute(sql`
   ALTER TABLE "tenants" DROP COLUMN "plan";
  ALTER TABLE "_tenants_v" DROP COLUMN "version_plan";
  DROP TYPE "public"."enum_tenants_plan";
  DROP TYPE "public"."enum__tenants_v_version_plan";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  const n = Number(((await db.execute(sql`SELECT count(*) AS n FROM tenants WHERE app_plan <> 'none' OR app_database IS NOT NULL`)).rows[0] as { n: string }).n)
  if (n > 0) throw new Error(`Rollback ditolak: ${n} sekolah berlangganan Sekolahku App atau punya database App.`)
  // the old schema has no "no website" plan: rolling back would silently switch those websites on
  const off = Number(((await db.execute(sql`SELECT count(*) AS n FROM tenants WHERE web_plan = 'none' OR web_status = 'paused'`)).rows[0] as { n: string }).n)
  if (off > 0) throw new Error(`Rollback ditolak: ${off} sekolah tanpa/dijeda langganan Web akan tayang kembali.`)
  await db.execute(sql`
   CREATE TYPE "public"."enum_tenants_plan" AS ENUM('basic', 'pro');
  CREATE TYPE "public"."enum__tenants_v_version_plan" AS ENUM('basic', 'pro');
  ALTER TABLE "tenants" ADD COLUMN "plan" "enum_tenants_plan" DEFAULT 'basic' NOT NULL;
  ALTER TABLE "_tenants_v" ADD COLUMN "version_plan" "enum__tenants_v_version_plan" DEFAULT 'basic' NOT NULL;`)
  await db.execute(sql`UPDATE tenants SET plan = (CASE WHEN web_plan = 'pro' THEN 'pro' ELSE 'basic' END)::enum_tenants_plan`)
  await db.execute(sql`
   ALTER TABLE "tenants" DROP COLUMN "web_plan";
  ALTER TABLE "tenants" DROP COLUMN "web_status";
  ALTER TABLE "tenants" DROP COLUMN "app_plan";
  ALTER TABLE "tenants" DROP COLUMN "app_status";
  ALTER TABLE "tenants" DROP COLUMN "app_database";
  ALTER TABLE "_tenants_v" DROP COLUMN "version_web_plan";
  ALTER TABLE "_tenants_v" DROP COLUMN "version_web_status";
  ALTER TABLE "_tenants_v" DROP COLUMN "version_app_plan";
  ALTER TABLE "_tenants_v" DROP COLUMN "version_app_status";
  ALTER TABLE "_tenants_v" DROP COLUMN "version_app_database";
  DROP TYPE "public"."enum_tenants_web_plan";
  DROP TYPE "public"."enum_tenants_web_status";
  DROP TYPE "public"."enum_tenants_app_plan";
  DROP TYPE "public"."enum_tenants_app_status";
  DROP TYPE "public"."enum__tenants_v_version_web_plan";
  DROP TYPE "public"."enum__tenants_v_version_web_status";
  DROP TYPE "public"."enum__tenants_v_version_app_plan";
  DROP TYPE "public"."enum__tenants_v_version_app_status";`)
}
