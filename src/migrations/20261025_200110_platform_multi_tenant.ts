import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Multi-school platform.
 *  - new `tenants` table (schools); every school-owned table gains `tenant_id`
 *  - former globals (homepage, site_settings, navigation, feature_flags) become one row per school
 *  - unique slugs etc. become unique per school
 *  - DATA: when the database already holds content (the SMP Nasional KPS production site), one school is
 *    created for it (slug SEED_TENANT_SLUG, default "kps"; domain from NEXT_PUBLIC_SERVER_URL) and every existing
 *    row — content, files, users, audit log — is assigned to it. Nothing is deleted or rewritten.
 *  - tenant_id is NOT NULL on school-owned tables (users/audit_logs may have none: platform Super Admin).
 */

/** School-owned tables (main) — tenant_id NOT NULL after the backfill. */
const OWNED = ['pages', 'posts', 'categories', 'announcements', 'events', 'event_categories', 'faqs', 'albums', 'documents', 'guides', 'services', 'testimonials', 'programs', 'extracurriculars', 'facilities', 'staff', 'achievements', 'student_works', 'media_items', 'social_accounts', 'admissions_cycles', 'leads', 'visit_sessions', 'visit_bookings', 'contact_messages', 'media', 'private_files', 'redirects', 'analytics_daily', 'homepage', 'site_settings', 'navigation', 'feature_flags']
/** Tables where a missing school is allowed (Super Admin accounts, platform audit entries). */
const OPTIONAL = ['users', 'audit_logs']
const VERSIONS = ['_pages_v', '_posts_v', '_announcements_v', '_events_v', '_faqs_v', '_albums_v', '_documents_v', '_guides_v', '_services_v', '_testimonials_v', '_programs_v', '_extracurriculars_v', '_facilities_v', '_staff_v', '_achievements_v', '_student_works_v', '_media_items_v', '_admissions_cycles_v', '_homepage_v', '_site_settings_v', '_navigation_v', '_feature_flags_v']
/** Former globals: their version rows get the (single) document as parent. */
const SINGLETONS = ['homepage', 'site_settings', 'navigation', 'feature_flags']

const hostOf = (url?: string) => {
  try {
    const h = new URL(url ?? '').hostname.toLowerCase()
    return h && h !== 'localhost' && !h.endsWith('.vercel.app') && h.includes('.') ? h : null
  } catch {
    return null
  }
}

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tenants_status" AS ENUM('active', 'trial', 'suspended');
  CREATE TYPE "public"."enum_tenants_plan" AS ENUM('basic', 'pro');
  CREATE TYPE "public"."enum_tenants_timezone" AS ENUM('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura');
  CREATE TYPE "public"."enum__tenants_v_version_status" AS ENUM('active', 'trial', 'suspended');
  CREATE TYPE "public"."enum__tenants_v_version_plan" AS ENUM('basic', 'pro');
  CREATE TYPE "public"."enum__tenants_v_version_timezone" AS ENUM('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura');
  ALTER TYPE "public"."enum_events_startat_tz" ADD VALUE 'Asia/Jakarta' BEFORE 'Asia/Makassar';
  ALTER TYPE "public"."enum_events_startat_tz" ADD VALUE 'Asia/Jayapura';
  ALTER TYPE "public"."enum_events_endat_tz" ADD VALUE 'Asia/Jakarta' BEFORE 'Asia/Makassar';
  ALTER TYPE "public"."enum_events_endat_tz" ADD VALUE 'Asia/Jayapura';
  ALTER TYPE "public"."enum__events_v_version_startat_tz" ADD VALUE 'Asia/Jakarta' BEFORE 'Asia/Makassar';
  ALTER TYPE "public"."enum__events_v_version_startat_tz" ADD VALUE 'Asia/Jayapura';
  ALTER TYPE "public"."enum__events_v_version_endat_tz" ADD VALUE 'Asia/Jakarta' BEFORE 'Asia/Makassar';
  ALTER TYPE "public"."enum__events_v_version_endat_tz" ADD VALUE 'Asia/Jayapura';
  ALTER TYPE "public"."enum_visit_sessions_startat_tz" ADD VALUE 'Asia/Jakarta' BEFORE 'Asia/Makassar';
  ALTER TYPE "public"."enum_visit_sessions_startat_tz" ADD VALUE 'Asia/Jayapura';
  ALTER TYPE "public"."enum_visit_sessions_endat_tz" ADD VALUE 'Asia/Jakarta' BEFORE 'Asia/Makassar';
  ALTER TYPE "public"."enum_visit_sessions_endat_tz" ADD VALUE 'Asia/Jayapura';
  ALTER TYPE "public"."enum_users_role" ADD VALUE 'superadmin' BEFORE 'admin';
  CREATE TABLE "tenants_domains" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"domain" varchar NOT NULL,
  	"primary" boolean DEFAULT false
  );
  
  CREATE TABLE "tenants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "enum_tenants_status" DEFAULT 'trial' NOT NULL,
  	"plan" "enum_tenants_plan" DEFAULT 'basic' NOT NULL,
  	"timezone" "enum_tenants_timezone" DEFAULT 'Asia/Jakarta' NOT NULL,
  	"contact_name" varchar,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_tenants_v_version_domains" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"domain" varchar NOT NULL,
  	"primary" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tenants_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_status" "enum__tenants_v_version_status" DEFAULT 'trial' NOT NULL,
  	"version_plan" "enum__tenants_v_version_plan" DEFAULT 'basic' NOT NULL,
  	"version_timezone" "enum__tenants_v_version_timezone" DEFAULT 'Asia/Jakarta' NOT NULL,
  	"version_contact_name" varchar,
  	"version_contact_email" varchar,
  	"version_contact_phone" varchar,
  	"version_notes" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  DROP INDEX "day_kind_key_idx";
  DROP INDEX "pages_slug_idx";
  DROP INDEX "posts_slug_idx";
  DROP INDEX "categories_slug_idx";
  DROP INDEX "announcements_slug_idx";
  DROP INDEX "events_slug_idx";
  DROP INDEX "event_categories_slug_idx";
  DROP INDEX "faqs_slug_idx";
  DROP INDEX "albums_slug_idx";
  DROP INDEX "guides_slug_idx";
  DROP INDEX "services_slug_idx";
  DROP INDEX "testimonials_slug_idx";
  DROP INDEX "programs_slug_idx";
  DROP INDEX "extracurriculars_slug_idx";
  DROP INDEX "facilities_slug_idx";
  DROP INDEX "staff_slug_idx";
  DROP INDEX "achievements_slug_idx";
  DROP INDEX "student_works_slug_idx";
  DROP INDEX "media_items_slug_idx";
  DROP INDEX "media_items_normalized_url_idx";
  DROP INDEX "admissions_cycles_academic_year_idx";
  DROP INDEX "media_sha256_idx";
  DROP INDEX "redirects_old_path_idx";
  ALTER TABLE "pages_blocks_admissions_cta" ALTER COLUMN "heading" SET DEFAULT 'Mari Mengenal Kami Lebih Dekat';
  ALTER TABLE "_pages_v_blocks_admissions_cta" ALTER COLUMN "heading" SET DEFAULT 'Mari Mengenal Kami Lebih Dekat';
  ALTER TABLE "events" ALTER COLUMN "startat_tz" DROP DEFAULT;
  ALTER TABLE "events" ALTER COLUMN "endat_tz" DROP DEFAULT;
  ALTER TABLE "_events_v" ALTER COLUMN "version_startat_tz" DROP DEFAULT;
  ALTER TABLE "_events_v" ALTER COLUMN "version_endat_tz" DROP DEFAULT;
  ALTER TABLE "visit_sessions" ALTER COLUMN "startat_tz" DROP DEFAULT;
  ALTER TABLE "visit_sessions" ALTER COLUMN "endat_tz" DROP DEFAULT;
  ALTER TABLE "homepage" ALTER COLUMN "hero_primary_label" SET DEFAULT 'Kenali Sekolah';
  ALTER TABLE "homepage" ALTER COLUMN "intro_heading" SET DEFAULT 'Mengenal Sekolah Kami';
  ALTER TABLE "homepage" ALTER COLUMN "texts_news_heading" SET DEFAULT 'Cerita dari Sekolah';
  ALTER TABLE "homepage" ALTER COLUMN "texts_community_heading" SET DEFAULT 'Terhubung dalam Keluarga Sekolah';
  ALTER TABLE "homepage" ALTER COLUMN "texts_media_eyebrow" SET DEFAULT 'Video Sekolah';
  ALTER TABLE "homepage" ALTER COLUMN "texts_media_heading" SET DEFAULT 'Video & Cerita Digital';
  ALTER TABLE "homepage" ALTER COLUMN "texts_media_intro" SET DEFAULT 'Kenali kehidupan sekolah melalui video, podcast, dan cerita dari komunitas sekolah.';
  ALTER TABLE "homepage" ALTER COLUMN "texts_cta_heading" SET DEFAULT 'Mari Mengenal Sekolah Kami Lebih Dekat';
  ALTER TABLE "homepage" ALTER COLUMN "updated_at" SET DEFAULT now();
  ALTER TABLE "homepage" ALTER COLUMN "updated_at" SET NOT NULL;
  ALTER TABLE "homepage" ALTER COLUMN "created_at" SET DEFAULT now();
  ALTER TABLE "homepage" ALTER COLUMN "created_at" SET NOT NULL;
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_hero_primary_label" SET DEFAULT 'Kenali Sekolah';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_intro_heading" SET DEFAULT 'Mengenal Sekolah Kami';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_texts_news_heading" SET DEFAULT 'Cerita dari Sekolah';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_texts_community_heading" SET DEFAULT 'Terhubung dalam Keluarga Sekolah';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_texts_media_eyebrow" SET DEFAULT 'Video Sekolah';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_texts_media_heading" SET DEFAULT 'Video & Cerita Digital';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_texts_media_intro" SET DEFAULT 'Kenali kehidupan sekolah melalui video, podcast, dan cerita dari komunitas sekolah.';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_texts_cta_heading" SET DEFAULT 'Mari Mengenal Sekolah Kami Lebih Dekat';
  ALTER TABLE "site_settings" ALTER COLUMN "school_name" DROP DEFAULT;
  ALTER TABLE "site_settings" ALTER COLUMN "city" DROP DEFAULT;
  ALTER TABLE "site_settings" ALTER COLUMN "values_line" DROP DEFAULT;
  ALTER TABLE "site_settings" ALTER COLUMN "updated_at" SET DEFAULT now();
  ALTER TABLE "site_settings" ALTER COLUMN "updated_at" SET NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "created_at" SET DEFAULT now();
  ALTER TABLE "site_settings" ALTER COLUMN "created_at" SET NOT NULL;
  ALTER TABLE "_site_settings_v" ALTER COLUMN "version_school_name" DROP DEFAULT;
  ALTER TABLE "_site_settings_v" ALTER COLUMN "version_city" DROP DEFAULT;
  ALTER TABLE "_site_settings_v" ALTER COLUMN "version_values_line" DROP DEFAULT;
  ALTER TABLE "navigation" ALTER COLUMN "updated_at" SET DEFAULT now();
  ALTER TABLE "navigation" ALTER COLUMN "updated_at" SET NOT NULL;
  ALTER TABLE "navigation" ALTER COLUMN "created_at" SET DEFAULT now();
  ALTER TABLE "navigation" ALTER COLUMN "created_at" SET NOT NULL;
  ALTER TABLE "feature_flags" ALTER COLUMN "updated_at" SET DEFAULT now();
  ALTER TABLE "feature_flags" ALTER COLUMN "updated_at" SET NOT NULL;
  ALTER TABLE "feature_flags" ALTER COLUMN "created_at" SET DEFAULT now();
  ALTER TABLE "feature_flags" ALTER COLUMN "created_at" SET NOT NULL;
  ALTER TABLE "pages" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_pages_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "posts" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "categories" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "announcements" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_announcements_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "events" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_events_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "event_categories" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "faqs" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_faqs_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "albums" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_albums_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "documents" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_documents_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "guides" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_guides_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "services" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_services_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "testimonials" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_testimonials_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "programs" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_programs_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "extracurriculars" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_extracurriculars_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "facilities" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_facilities_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "staff" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_staff_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "achievements" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_achievements_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "student_works" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_student_works_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "media_items" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_media_items_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "social_accounts" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "admissions_cycles" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_admissions_cycles_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "leads" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "visit_sessions" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "visit_bookings" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "contact_messages" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "media" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "private_files" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "redirects" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "users" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "analytics_daily" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "homepage_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "site_settings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "navigation_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "feature_flags_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tenants_id" integer;
  ALTER TABLE "homepage" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_homepage_v" ADD COLUMN "parent_id" integer;
  ALTER TABLE "_homepage_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "short_name" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "og_image_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "notify_contact_email" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "notify_admissions_email" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "parent_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_short_name" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_og_image_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_notify_contact_email" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_notify_admissions_email" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "navigation" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_navigation_v" ADD COLUMN "parent_id" integer;
  ALTER TABLE "_navigation_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "feature_flags" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_feature_flags_v" ADD COLUMN "parent_id" integer;
  ALTER TABLE "_feature_flags_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "tenants_domains" ADD CONSTRAINT "tenants_domains_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tenants_v_version_domains" ADD CONSTRAINT "_tenants_v_version_domains_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tenants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tenants_v" ADD CONSTRAINT "_tenants_v_parent_id_tenants_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "tenants_domains_order_idx" ON "tenants_domains" USING btree ("_order");
  CREATE INDEX "tenants_domains_parent_id_idx" ON "tenants_domains" USING btree ("_parent_id");
  CREATE INDEX "tenants_domains_domain_idx" ON "tenants_domains" USING btree ("domain");
  CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");
  CREATE INDEX "tenants_updated_at_idx" ON "tenants" USING btree ("updated_at");
  CREATE INDEX "tenants_created_at_idx" ON "tenants" USING btree ("created_at");
  CREATE INDEX "_tenants_v_version_domains_order_idx" ON "_tenants_v_version_domains" USING btree ("_order");
  CREATE INDEX "_tenants_v_version_domains_parent_id_idx" ON "_tenants_v_version_domains" USING btree ("_parent_id");
  CREATE INDEX "_tenants_v_version_domains_domain_idx" ON "_tenants_v_version_domains" USING btree ("domain");
  CREATE INDEX "_tenants_v_parent_idx" ON "_tenants_v" USING btree ("parent_id");
  CREATE INDEX "_tenants_v_version_version_slug_idx" ON "_tenants_v" USING btree ("version_slug");
  CREATE INDEX "_tenants_v_version_version_updated_at_idx" ON "_tenants_v" USING btree ("version_updated_at");
  CREATE INDEX "_tenants_v_version_version_created_at_idx" ON "_tenants_v" USING btree ("version_created_at");
  CREATE INDEX "_tenants_v_created_at_idx" ON "_tenants_v" USING btree ("created_at");
  CREATE INDEX "_tenants_v_updated_at_idx" ON "_tenants_v" USING btree ("updated_at");
  ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "announcements" ADD CONSTRAINT "announcements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_announcements_v" ADD CONSTRAINT "_announcements_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_categories" ADD CONSTRAINT "event_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faqs" ADD CONSTRAINT "faqs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faqs_v" ADD CONSTRAINT "_faqs_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "albums" ADD CONSTRAINT "albums_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_albums_v" ADD CONSTRAINT "_albums_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guides" ADD CONSTRAINT "guides_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guides_v" ADD CONSTRAINT "_guides_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "programs" ADD CONSTRAINT "programs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_programs_v" ADD CONSTRAINT "_programs_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "extracurriculars" ADD CONSTRAINT "extracurriculars_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_extracurriculars_v" ADD CONSTRAINT "_extracurriculars_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "facilities" ADD CONSTRAINT "facilities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_facilities_v" ADD CONSTRAINT "_facilities_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "staff" ADD CONSTRAINT "staff_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_staff_v" ADD CONSTRAINT "_staff_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievements" ADD CONSTRAINT "achievements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievements_v" ADD CONSTRAINT "_achievements_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "student_works" ADD CONSTRAINT "student_works_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_student_works_v" ADD CONSTRAINT "_student_works_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_items" ADD CONSTRAINT "media_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_items_v" ADD CONSTRAINT "_media_items_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "admissions_cycles" ADD CONSTRAINT "admissions_cycles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_admissions_cycles_v" ADD CONSTRAINT "_admissions_cycles_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visit_bookings" ADD CONSTRAINT "visit_bookings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "private_files" ADD CONSTRAINT "private_files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "redirects" ADD CONSTRAINT "redirects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "analytics_daily" ADD CONSTRAINT "analytics_daily_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_homepage_fk" FOREIGN KEY ("homepage_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_settings_fk" FOREIGN KEY ("site_settings_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_navigation_fk" FOREIGN KEY ("navigation_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_feature_flags_fk" FOREIGN KEY ("feature_flags_id") REFERENCES "public"."feature_flags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tenants_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage" ADD CONSTRAINT "homepage_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_homepage_v" ADD CONSTRAINT "_homepage_v_parent_id_homepage_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."homepage"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_homepage_v" ADD CONSTRAINT "_homepage_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_parent_id_site_settings_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_og_image_id_media_id_fk" FOREIGN KEY ("version_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation" ADD CONSTRAINT "navigation_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_navigation_v" ADD CONSTRAINT "_navigation_v_parent_id_navigation_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."navigation"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_navigation_v" ADD CONSTRAINT "_navigation_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_feature_flags_v" ADD CONSTRAINT "_feature_flags_v_parent_id_feature_flags_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."feature_flags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_feature_flags_v" ADD CONSTRAINT "_feature_flags_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_tenant_idx" ON "pages" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_idx" ON "pages" USING btree ("tenant_id","slug");
  CREATE INDEX "_pages_v_version_version_tenant_idx" ON "_pages_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_idx" ON "_pages_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "posts_tenant_idx" ON "posts" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_1_idx" ON "posts" USING btree ("tenant_id","slug");
  CREATE INDEX "_posts_v_version_version_tenant_idx" ON "_posts_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_1_idx" ON "_posts_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "categories_tenant_idx" ON "categories" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_2_idx" ON "categories" USING btree ("tenant_id","slug");
  CREATE INDEX "announcements_tenant_idx" ON "announcements" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_3_idx" ON "announcements" USING btree ("tenant_id","slug");
  CREATE INDEX "_announcements_v_version_version_tenant_idx" ON "_announcements_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_2_idx" ON "_announcements_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "events_tenant_idx" ON "events" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_4_idx" ON "events" USING btree ("tenant_id","slug");
  CREATE INDEX "_events_v_version_version_tenant_idx" ON "_events_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_3_idx" ON "_events_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "event_categories_tenant_idx" ON "event_categories" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_5_idx" ON "event_categories" USING btree ("tenant_id","slug");
  CREATE INDEX "faqs_tenant_idx" ON "faqs" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_6_idx" ON "faqs" USING btree ("tenant_id","slug");
  CREATE INDEX "_faqs_v_version_version_tenant_idx" ON "_faqs_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_4_idx" ON "_faqs_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "albums_tenant_idx" ON "albums" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_7_idx" ON "albums" USING btree ("tenant_id","slug");
  CREATE INDEX "_albums_v_version_version_tenant_idx" ON "_albums_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_5_idx" ON "_albums_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "documents_tenant_idx" ON "documents" USING btree ("tenant_id");
  CREATE INDEX "_documents_v_version_version_tenant_idx" ON "_documents_v" USING btree ("version_tenant_id");
  CREATE INDEX "guides_tenant_idx" ON "guides" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_8_idx" ON "guides" USING btree ("tenant_id","slug");
  CREATE INDEX "_guides_v_version_version_tenant_idx" ON "_guides_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_6_idx" ON "_guides_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "services_tenant_idx" ON "services" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_9_idx" ON "services" USING btree ("tenant_id","slug");
  CREATE INDEX "_services_v_version_version_tenant_idx" ON "_services_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_7_idx" ON "_services_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "testimonials_tenant_idx" ON "testimonials" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_10_idx" ON "testimonials" USING btree ("tenant_id","slug");
  CREATE INDEX "_testimonials_v_version_version_tenant_idx" ON "_testimonials_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_8_idx" ON "_testimonials_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "programs_tenant_idx" ON "programs" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_11_idx" ON "programs" USING btree ("tenant_id","slug");
  CREATE INDEX "_programs_v_version_version_tenant_idx" ON "_programs_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_9_idx" ON "_programs_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "extracurriculars_tenant_idx" ON "extracurriculars" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_12_idx" ON "extracurriculars" USING btree ("tenant_id","slug");
  CREATE INDEX "_extracurriculars_v_version_version_tenant_idx" ON "_extracurriculars_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_10_idx" ON "_extracurriculars_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "facilities_tenant_idx" ON "facilities" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_13_idx" ON "facilities" USING btree ("tenant_id","slug");
  CREATE INDEX "_facilities_v_version_version_tenant_idx" ON "_facilities_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_11_idx" ON "_facilities_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "staff_tenant_idx" ON "staff" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_14_idx" ON "staff" USING btree ("tenant_id","slug");
  CREATE INDEX "_staff_v_version_version_tenant_idx" ON "_staff_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_12_idx" ON "_staff_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "achievements_tenant_idx" ON "achievements" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_15_idx" ON "achievements" USING btree ("tenant_id","slug");
  CREATE INDEX "_achievements_v_version_version_tenant_idx" ON "_achievements_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_13_idx" ON "_achievements_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "student_works_tenant_idx" ON "student_works" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_16_idx" ON "student_works" USING btree ("tenant_id","slug");
  CREATE INDEX "_student_works_v_version_version_tenant_idx" ON "_student_works_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_14_idx" ON "_student_works_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "media_items_tenant_idx" ON "media_items" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_17_idx" ON "media_items" USING btree ("tenant_id","slug");
  CREATE UNIQUE INDEX "tenant_normalizedUrl_idx" ON "media_items" USING btree ("tenant_id","normalized_url");
  CREATE INDEX "_media_items_v_version_version_tenant_idx" ON "_media_items_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_15_idx" ON "_media_items_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "version_tenant_version_normalizedUrl_idx" ON "_media_items_v" USING btree ("version_tenant_id","version_normalized_url");
  CREATE INDEX "social_accounts_tenant_idx" ON "social_accounts" USING btree ("tenant_id");
  CREATE INDEX "admissions_cycles_tenant_idx" ON "admissions_cycles" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_academicYear_idx" ON "admissions_cycles" USING btree ("tenant_id","academic_year");
  CREATE INDEX "_admissions_cycles_v_version_version_tenant_idx" ON "_admissions_cycles_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_academicYear_idx" ON "_admissions_cycles_v" USING btree ("version_tenant_id","version_academic_year");
  CREATE INDEX "leads_tenant_idx" ON "leads" USING btree ("tenant_id");
  CREATE INDEX "visit_sessions_tenant_idx" ON "visit_sessions" USING btree ("tenant_id");
  CREATE INDEX "visit_bookings_tenant_idx" ON "visit_bookings" USING btree ("tenant_id");
  CREATE INDEX "contact_messages_tenant_idx" ON "contact_messages" USING btree ("tenant_id");
  CREATE INDEX "media_tenant_idx" ON "media" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_sha256_idx" ON "media" USING btree ("tenant_id","sha256");
  CREATE INDEX "private_files_tenant_idx" ON "private_files" USING btree ("tenant_id");
  CREATE INDEX "redirects_tenant_idx" ON "redirects" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_oldPath_idx" ON "redirects" USING btree ("tenant_id","old_path");
  CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");
  CREATE INDEX "audit_logs_tenant_idx" ON "audit_logs" USING btree ("tenant_id");
  CREATE INDEX "analytics_daily_tenant_idx" ON "analytics_daily" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_day_kind_key_idx" ON "analytics_daily" USING btree ("tenant_id","day","kind","key");
  CREATE INDEX "payload_locked_documents_rels_homepage_id_idx" ON "payload_locked_documents_rels" USING btree ("homepage_id");
  CREATE INDEX "payload_locked_documents_rels_site_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("site_settings_id");
  CREATE INDEX "payload_locked_documents_rels_navigation_id_idx" ON "payload_locked_documents_rels" USING btree ("navigation_id");
  CREATE INDEX "payload_locked_documents_rels_feature_flags_id_idx" ON "payload_locked_documents_rels" USING btree ("feature_flags_id");
  CREATE INDEX "payload_locked_documents_rels_tenants_id_idx" ON "payload_locked_documents_rels" USING btree ("tenants_id");
  CREATE INDEX "homepage_tenant_idx" ON "homepage" USING btree ("tenant_id");
  CREATE INDEX "homepage_updated_at_idx" ON "homepage" USING btree ("updated_at");
  CREATE INDEX "homepage_created_at_idx" ON "homepage" USING btree ("created_at");
  CREATE UNIQUE INDEX "tenant_idx" ON "homepage" USING btree ("tenant_id");
  CREATE INDEX "_homepage_v_parent_idx" ON "_homepage_v" USING btree ("parent_id");
  CREATE INDEX "_homepage_v_version_version_tenant_idx" ON "_homepage_v" USING btree ("version_tenant_id");
  CREATE INDEX "_homepage_v_version_version_updated_at_idx" ON "_homepage_v" USING btree ("version_updated_at");
  CREATE INDEX "_homepage_v_version_version_created_at_idx" ON "_homepage_v" USING btree ("version_created_at");
  CREATE INDEX "version_tenant_idx" ON "_homepage_v" USING btree ("version_tenant_id");
  CREATE INDEX "site_settings_og_image_idx" ON "site_settings" USING btree ("og_image_id");
  CREATE INDEX "site_settings_tenant_idx" ON "site_settings" USING btree ("tenant_id");
  CREATE INDEX "site_settings_updated_at_idx" ON "site_settings" USING btree ("updated_at");
  CREATE INDEX "site_settings_created_at_idx" ON "site_settings" USING btree ("created_at");
  CREATE UNIQUE INDEX "tenant_1_idx" ON "site_settings" USING btree ("tenant_id");
  CREATE INDEX "_site_settings_v_parent_idx" ON "_site_settings_v" USING btree ("parent_id");
  CREATE INDEX "_site_settings_v_version_version_og_image_idx" ON "_site_settings_v" USING btree ("version_og_image_id");
  CREATE INDEX "_site_settings_v_version_version_tenant_idx" ON "_site_settings_v" USING btree ("version_tenant_id");
  CREATE INDEX "_site_settings_v_version_version_updated_at_idx" ON "_site_settings_v" USING btree ("version_updated_at");
  CREATE INDEX "_site_settings_v_version_version_created_at_idx" ON "_site_settings_v" USING btree ("version_created_at");
  CREATE INDEX "version_tenant_1_idx" ON "_site_settings_v" USING btree ("version_tenant_id");
  CREATE INDEX "navigation_tenant_idx" ON "navigation" USING btree ("tenant_id");
  CREATE INDEX "navigation_updated_at_idx" ON "navigation" USING btree ("updated_at");
  CREATE INDEX "navigation_created_at_idx" ON "navigation" USING btree ("created_at");
  CREATE UNIQUE INDEX "tenant_2_idx" ON "navigation" USING btree ("tenant_id");
  CREATE INDEX "_navigation_v_parent_idx" ON "_navigation_v" USING btree ("parent_id");
  CREATE INDEX "_navigation_v_version_version_tenant_idx" ON "_navigation_v" USING btree ("version_tenant_id");
  CREATE INDEX "_navigation_v_version_version_updated_at_idx" ON "_navigation_v" USING btree ("version_updated_at");
  CREATE INDEX "_navigation_v_version_version_created_at_idx" ON "_navigation_v" USING btree ("version_created_at");
  CREATE INDEX "version_tenant_2_idx" ON "_navigation_v" USING btree ("version_tenant_id");
  CREATE INDEX "feature_flags_tenant_idx" ON "feature_flags" USING btree ("tenant_id");
  CREATE INDEX "feature_flags_updated_at_idx" ON "feature_flags" USING btree ("updated_at");
  CREATE INDEX "feature_flags_created_at_idx" ON "feature_flags" USING btree ("created_at");
  CREATE UNIQUE INDEX "tenant_3_idx" ON "feature_flags" USING btree ("tenant_id");
  CREATE INDEX "_feature_flags_v_parent_idx" ON "_feature_flags_v" USING btree ("parent_id");
  CREATE INDEX "_feature_flags_v_version_version_tenant_idx" ON "_feature_flags_v" USING btree ("version_tenant_id");
  CREATE INDEX "_feature_flags_v_version_version_updated_at_idx" ON "_feature_flags_v" USING btree ("version_updated_at");
  CREATE INDEX "_feature_flags_v_version_version_created_at_idx" ON "_feature_flags_v" USING btree ("version_created_at");
  CREATE INDEX "version_tenant_3_idx" ON "_feature_flags_v" USING btree ("version_tenant_id");
  CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "announcements_slug_idx" ON "announcements" USING btree ("slug");
  CREATE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "event_categories_slug_idx" ON "event_categories" USING btree ("slug");
  CREATE INDEX "faqs_slug_idx" ON "faqs" USING btree ("slug");
  CREATE INDEX "albums_slug_idx" ON "albums" USING btree ("slug");
  CREATE INDEX "guides_slug_idx" ON "guides" USING btree ("slug");
  CREATE INDEX "services_slug_idx" ON "services" USING btree ("slug");
  CREATE INDEX "testimonials_slug_idx" ON "testimonials" USING btree ("slug");
  CREATE INDEX "programs_slug_idx" ON "programs" USING btree ("slug");
  CREATE INDEX "extracurriculars_slug_idx" ON "extracurriculars" USING btree ("slug");
  CREATE INDEX "facilities_slug_idx" ON "facilities" USING btree ("slug");
  CREATE INDEX "staff_slug_idx" ON "staff" USING btree ("slug");
  CREATE INDEX "achievements_slug_idx" ON "achievements" USING btree ("slug");
  CREATE INDEX "student_works_slug_idx" ON "student_works" USING btree ("slug");
  CREATE INDEX "media_items_slug_idx" ON "media_items" USING btree ("slug");
  CREATE INDEX "media_items_normalized_url_idx" ON "media_items" USING btree ("normalized_url");
  CREATE INDEX "admissions_cycles_academic_year_idx" ON "admissions_cycles" USING btree ("academic_year");
  CREATE INDEX "media_sha256_idx" ON "media" USING btree ("sha256");
  CREATE INDEX "redirects_old_path_idx" ON "redirects" USING btree ("old_path");`)

  // ---------- data: the existing single-school site becomes the first school ----------
  const count = await db.execute(
    sql`SELECT (SELECT count(*) FROM users) + (SELECT count(*) FROM posts) + (SELECT count(*) FROM media) + (SELECT count(*) FROM site_settings) AS n`,
  )
  if (Number((count.rows[0] as { n: string | number }).n) > 0) {
    const slug = (process.env.SEED_TENANT_SLUG || 'kps').toLowerCase()
    const settings = (await db.execute(sql`SELECT school_name FROM site_settings ORDER BY id LIMIT 1`)).rows[0] as { school_name?: string } | undefined
    const name = settings?.school_name || 'SMP Nasional KPS'
    const tz = process.env.NEXT_PUBLIC_SCHOOL_TIMEZONE || 'Asia/Makassar'
    const created = await db.execute(sql`
      INSERT INTO tenants (name, slug, status, plan, timezone)
      VALUES (${name}, ${slug}, 'active', 'pro', ${tz}::enum_tenants_timezone)
      RETURNING id`)
    const tid = Number((created.rows[0] as { id: number }).id)
    const domain = hostOf(process.env.NEXT_PUBLIC_SERVER_URL)
    if (domain)
      await db.execute(sql`INSERT INTO tenants_domains (_order, _parent_id, id, domain, "primary") VALUES (1, ${tid}, substr(md5(random()::text), 1, 24), ${domain}, true)`)
    for (const t of [...OWNED, ...OPTIONAL]) await db.execute(sql.raw(`UPDATE "${t}" SET tenant_id = ${tid} WHERE tenant_id IS NULL`))
    for (const t of VERSIONS) await db.execute(sql.raw(`UPDATE "${t}" SET version_tenant_id = ${tid} WHERE version_tenant_id IS NULL`))
    for (const t of SINGLETONS) await db.execute(sql.raw(`UPDATE "_${t}_v" SET parent_id = (SELECT id FROM "${t}" ORDER BY id LIMIT 1) WHERE parent_id IS NULL`))
    // short name used in texts ("Tentang KPS"): the trailing acronym of the school name, if any
    const acronym = name.trim().split(/\s+/).pop() ?? ''
    if (/^[A-Z]{2,8}$/.test(acronym)) await db.execute(sql`UPDATE site_settings SET short_name = ${acronym} WHERE short_name IS NULL`)
    payload.logger.info(`Data lama dipindahkan ke sekolah "${name}" (kode ${slug}, id ${tid}${domain ? `, domain ${domain}` : ''}).`)
  }
  for (const t of OWNED) await db.execute(sql.raw(`ALTER TABLE "${t}" ALTER COLUMN tenant_id SET NOT NULL`))
}



export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Going back to a single-school schema is only safe while the platform holds exactly that one school.
  const schools = Number(((await db.execute(sql`SELECT count(*) AS n FROM tenants`)).rows[0] as { n: string }).n)
  if (schools > 1) throw new Error(`Rollback ditolak: ada ${schools} sekolah. Pindahkan/ekspor sekolah lain dulu.`)
  const supers = Number(((await db.execute(sql`SELECT count(*) AS n FROM users WHERE role = 'superadmin'`)).rows[0] as { n: string }).n)
  if (supers > 0) throw new Error('Rollback ditolak: hapus atau ubah peran akun Super Admin platform terlebih dahulu.')
  for (const [t, p] of [['events', ''], ['visit_sessions', ''], ['_events_v', 'version_']])
    for (const c of [`${p}startat_tz`, `${p}endat_tz`]) {
      const n = Number(((await db.execute(sql.raw(`SELECT count(*) AS n FROM "${t}" WHERE ${c} IS NOT NULL AND ${c}::text <> 'Asia/Makassar'`))).rows[0] as { n: string }).n)
      if (n > 0) throw new Error(`Rollback ditolak: ${t}.${c} memakai zona selain WITA.`)
    }
  // (generated statements below; DROP TABLE … CASCADE already removes the foreign keys, hence IF EXISTS)
  await db.execute(sql`
   ALTER TABLE "tenants_domains" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tenants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_tenants_v_version_domains" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_tenants_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "tenants_domains" CASCADE;
  DROP TABLE "tenants" CASCADE;
  DROP TABLE "_tenants_v_version_domains" CASCADE;
  DROP TABLE "_tenants_v" CASCADE;
  ALTER TABLE "pages" DROP CONSTRAINT IF EXISTS "pages_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT IF EXISTS "_pages_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT IF EXISTS "_posts_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_tenant_id_tenants_id_fk";
  
  ALTER TABLE "announcements" DROP CONSTRAINT IF EXISTS "announcements_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_announcements_v" DROP CONSTRAINT IF EXISTS "_announcements_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_events_v" DROP CONSTRAINT IF EXISTS "_events_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "event_categories" DROP CONSTRAINT IF EXISTS "event_categories_tenant_id_tenants_id_fk";
  
  ALTER TABLE "faqs" DROP CONSTRAINT IF EXISTS "faqs_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_faqs_v" DROP CONSTRAINT IF EXISTS "_faqs_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "albums" DROP CONSTRAINT IF EXISTS "albums_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_albums_v" DROP CONSTRAINT IF EXISTS "_albums_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_documents_v" DROP CONSTRAINT IF EXISTS "_documents_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "guides" DROP CONSTRAINT IF EXISTS "guides_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_guides_v" DROP CONSTRAINT IF EXISTS "_guides_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "services" DROP CONSTRAINT IF EXISTS "services_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_services_v" DROP CONSTRAINT IF EXISTS "_services_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "testimonials" DROP CONSTRAINT IF EXISTS "testimonials_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_testimonials_v" DROP CONSTRAINT IF EXISTS "_testimonials_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "programs" DROP CONSTRAINT IF EXISTS "programs_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_programs_v" DROP CONSTRAINT IF EXISTS "_programs_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "extracurriculars" DROP CONSTRAINT IF EXISTS "extracurriculars_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_extracurriculars_v" DROP CONSTRAINT IF EXISTS "_extracurriculars_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "facilities" DROP CONSTRAINT IF EXISTS "facilities_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_facilities_v" DROP CONSTRAINT IF EXISTS "_facilities_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "staff" DROP CONSTRAINT IF EXISTS "staff_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_staff_v" DROP CONSTRAINT IF EXISTS "_staff_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "achievements" DROP CONSTRAINT IF EXISTS "achievements_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_achievements_v" DROP CONSTRAINT IF EXISTS "_achievements_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "student_works" DROP CONSTRAINT IF EXISTS "student_works_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_student_works_v" DROP CONSTRAINT IF EXISTS "_student_works_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "media_items" DROP CONSTRAINT IF EXISTS "media_items_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_media_items_v" DROP CONSTRAINT IF EXISTS "_media_items_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "social_accounts" DROP CONSTRAINT IF EXISTS "social_accounts_tenant_id_tenants_id_fk";
  
  ALTER TABLE "admissions_cycles" DROP CONSTRAINT IF EXISTS "admissions_cycles_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_admissions_cycles_v" DROP CONSTRAINT IF EXISTS "_admissions_cycles_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_tenant_id_tenants_id_fk";
  
  ALTER TABLE "visit_sessions" DROP CONSTRAINT IF EXISTS "visit_sessions_tenant_id_tenants_id_fk";
  
  ALTER TABLE "visit_bookings" DROP CONSTRAINT IF EXISTS "visit_bookings_tenant_id_tenants_id_fk";
  
  ALTER TABLE "contact_messages" DROP CONSTRAINT IF EXISTS "contact_messages_tenant_id_tenants_id_fk";
  
  ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_tenant_id_tenants_id_fk";
  
  ALTER TABLE "private_files" DROP CONSTRAINT IF EXISTS "private_files_tenant_id_tenants_id_fk";
  
  ALTER TABLE "redirects" DROP CONSTRAINT IF EXISTS "redirects_tenant_id_tenants_id_fk";
  
  ALTER TABLE "analytics_daily" DROP CONSTRAINT IF EXISTS "analytics_daily_tenant_id_tenants_id_fk";
  
  ALTER TABLE "homepage" DROP CONSTRAINT IF EXISTS "homepage_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_homepage_v" DROP CONSTRAINT IF EXISTS "_homepage_v_parent_id_homepage_id_fk";
  
  ALTER TABLE "_homepage_v" DROP CONSTRAINT IF EXISTS "_homepage_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT IF EXISTS "site_settings_og_image_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT IF EXISTS "site_settings_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT IF EXISTS "_site_settings_v_parent_id_site_settings_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT IF EXISTS "_site_settings_v_version_og_image_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT IF EXISTS "_site_settings_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "navigation" DROP CONSTRAINT IF EXISTS "navigation_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_navigation_v" DROP CONSTRAINT IF EXISTS "_navigation_v_parent_id_navigation_id_fk";
  
  ALTER TABLE "_navigation_v" DROP CONSTRAINT IF EXISTS "_navigation_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "feature_flags" DROP CONSTRAINT IF EXISTS "feature_flags_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_feature_flags_v" DROP CONSTRAINT IF EXISTS "_feature_flags_v_parent_id_feature_flags_id_fk";
  
  ALTER TABLE "_feature_flags_v" DROP CONSTRAINT IF EXISTS "_feature_flags_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_tenant_id_tenants_id_fk";
  
  ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_tenant_id_tenants_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_homepage_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_site_settings_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_navigation_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_feature_flags_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_tenants_fk";
  
  ALTER TABLE "events" ALTER COLUMN "startat_tz" SET DATA TYPE text;
  ALTER TABLE "events" ALTER COLUMN "startat_tz" SET DEFAULT 'Asia/Makassar'::text;
  DROP TYPE "public"."enum_events_startat_tz";
  CREATE TYPE "public"."enum_events_startat_tz" AS ENUM('Asia/Makassar');
  ALTER TABLE "events" ALTER COLUMN "startat_tz" SET DEFAULT 'Asia/Makassar'::"public"."enum_events_startat_tz";
  ALTER TABLE "events" ALTER COLUMN "startat_tz" SET DATA TYPE "public"."enum_events_startat_tz" USING "startat_tz"::"public"."enum_events_startat_tz";
  ALTER TABLE "events" ALTER COLUMN "endat_tz" SET DATA TYPE text;
  ALTER TABLE "events" ALTER COLUMN "endat_tz" SET DEFAULT 'Asia/Makassar'::text;
  DROP TYPE "public"."enum_events_endat_tz";
  CREATE TYPE "public"."enum_events_endat_tz" AS ENUM('Asia/Makassar');
  ALTER TABLE "events" ALTER COLUMN "endat_tz" SET DEFAULT 'Asia/Makassar'::"public"."enum_events_endat_tz";
  ALTER TABLE "events" ALTER COLUMN "endat_tz" SET DATA TYPE "public"."enum_events_endat_tz" USING "endat_tz"::"public"."enum_events_endat_tz";
  ALTER TABLE "_events_v" ALTER COLUMN "version_startat_tz" SET DATA TYPE text;
  ALTER TABLE "_events_v" ALTER COLUMN "version_startat_tz" SET DEFAULT 'Asia/Makassar'::text;
  DROP TYPE "public"."enum__events_v_version_startat_tz";
  CREATE TYPE "public"."enum__events_v_version_startat_tz" AS ENUM('Asia/Makassar');
  ALTER TABLE "_events_v" ALTER COLUMN "version_startat_tz" SET DEFAULT 'Asia/Makassar'::"public"."enum__events_v_version_startat_tz";
  ALTER TABLE "_events_v" ALTER COLUMN "version_startat_tz" SET DATA TYPE "public"."enum__events_v_version_startat_tz" USING "version_startat_tz"::"public"."enum__events_v_version_startat_tz";
  ALTER TABLE "_events_v" ALTER COLUMN "version_endat_tz" SET DATA TYPE text;
  ALTER TABLE "_events_v" ALTER COLUMN "version_endat_tz" SET DEFAULT 'Asia/Makassar'::text;
  DROP TYPE "public"."enum__events_v_version_endat_tz";
  CREATE TYPE "public"."enum__events_v_version_endat_tz" AS ENUM('Asia/Makassar');
  ALTER TABLE "_events_v" ALTER COLUMN "version_endat_tz" SET DEFAULT 'Asia/Makassar'::"public"."enum__events_v_version_endat_tz";
  ALTER TABLE "_events_v" ALTER COLUMN "version_endat_tz" SET DATA TYPE "public"."enum__events_v_version_endat_tz" USING "version_endat_tz"::"public"."enum__events_v_version_endat_tz";
  ALTER TABLE "visit_sessions" ALTER COLUMN "startat_tz" SET DATA TYPE text;
  ALTER TABLE "visit_sessions" ALTER COLUMN "startat_tz" SET DEFAULT 'Asia/Makassar'::text;
  DROP TYPE "public"."enum_visit_sessions_startat_tz";
  CREATE TYPE "public"."enum_visit_sessions_startat_tz" AS ENUM('Asia/Makassar');
  ALTER TABLE "visit_sessions" ALTER COLUMN "startat_tz" SET DEFAULT 'Asia/Makassar'::"public"."enum_visit_sessions_startat_tz";
  ALTER TABLE "visit_sessions" ALTER COLUMN "startat_tz" SET DATA TYPE "public"."enum_visit_sessions_startat_tz" USING "startat_tz"::"public"."enum_visit_sessions_startat_tz";
  ALTER TABLE "visit_sessions" ALTER COLUMN "endat_tz" SET DATA TYPE text;
  ALTER TABLE "visit_sessions" ALTER COLUMN "endat_tz" SET DEFAULT 'Asia/Makassar'::text;
  DROP TYPE "public"."enum_visit_sessions_endat_tz";
  CREATE TYPE "public"."enum_visit_sessions_endat_tz" AS ENUM('Asia/Makassar');
  ALTER TABLE "visit_sessions" ALTER COLUMN "endat_tz" SET DEFAULT 'Asia/Makassar'::"public"."enum_visit_sessions_endat_tz";
  ALTER TABLE "visit_sessions" ALTER COLUMN "endat_tz" SET DATA TYPE "public"."enum_visit_sessions_endat_tz" USING "endat_tz"::"public"."enum_visit_sessions_endat_tz";
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'contributor'::text;
  DROP TYPE "public"."enum_users_role";
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'contributor', 'admissions');
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'contributor'::"public"."enum_users_role";
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";
  DROP INDEX IF EXISTS "pages_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_idx";
  DROP INDEX IF EXISTS "_pages_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_idx";
  DROP INDEX IF EXISTS "posts_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_1_idx";
  DROP INDEX IF EXISTS "_posts_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_1_idx";
  DROP INDEX IF EXISTS "categories_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_2_idx";
  DROP INDEX IF EXISTS "announcements_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_3_idx";
  DROP INDEX IF EXISTS "_announcements_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_2_idx";
  DROP INDEX IF EXISTS "events_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_4_idx";
  DROP INDEX IF EXISTS "_events_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_3_idx";
  DROP INDEX IF EXISTS "event_categories_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_5_idx";
  DROP INDEX IF EXISTS "faqs_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_6_idx";
  DROP INDEX IF EXISTS "_faqs_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_4_idx";
  DROP INDEX IF EXISTS "albums_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_7_idx";
  DROP INDEX IF EXISTS "_albums_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_5_idx";
  DROP INDEX IF EXISTS "documents_tenant_idx";
  DROP INDEX IF EXISTS "_documents_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "guides_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_8_idx";
  DROP INDEX IF EXISTS "_guides_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_6_idx";
  DROP INDEX IF EXISTS "services_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_9_idx";
  DROP INDEX IF EXISTS "_services_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_7_idx";
  DROP INDEX IF EXISTS "testimonials_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_10_idx";
  DROP INDEX IF EXISTS "_testimonials_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_8_idx";
  DROP INDEX IF EXISTS "programs_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_11_idx";
  DROP INDEX IF EXISTS "_programs_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_9_idx";
  DROP INDEX IF EXISTS "extracurriculars_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_12_idx";
  DROP INDEX IF EXISTS "_extracurriculars_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_10_idx";
  DROP INDEX IF EXISTS "facilities_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_13_idx";
  DROP INDEX IF EXISTS "_facilities_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_11_idx";
  DROP INDEX IF EXISTS "staff_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_14_idx";
  DROP INDEX IF EXISTS "_staff_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_12_idx";
  DROP INDEX IF EXISTS "achievements_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_15_idx";
  DROP INDEX IF EXISTS "_achievements_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_13_idx";
  DROP INDEX IF EXISTS "student_works_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_16_idx";
  DROP INDEX IF EXISTS "_student_works_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_14_idx";
  DROP INDEX IF EXISTS "media_items_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_17_idx";
  DROP INDEX IF EXISTS "tenant_normalizedUrl_idx";
  DROP INDEX IF EXISTS "_media_items_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_15_idx";
  DROP INDEX IF EXISTS "version_tenant_version_normalizedUrl_idx";
  DROP INDEX IF EXISTS "social_accounts_tenant_idx";
  DROP INDEX IF EXISTS "admissions_cycles_tenant_idx";
  DROP INDEX IF EXISTS "tenant_academicYear_idx";
  DROP INDEX IF EXISTS "_admissions_cycles_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_academicYear_idx";
  DROP INDEX IF EXISTS "leads_tenant_idx";
  DROP INDEX IF EXISTS "visit_sessions_tenant_idx";
  DROP INDEX IF EXISTS "visit_bookings_tenant_idx";
  DROP INDEX IF EXISTS "contact_messages_tenant_idx";
  DROP INDEX IF EXISTS "media_tenant_idx";
  DROP INDEX IF EXISTS "tenant_sha256_idx";
  DROP INDEX IF EXISTS "private_files_tenant_idx";
  DROP INDEX IF EXISTS "redirects_tenant_idx";
  DROP INDEX IF EXISTS "tenant_oldPath_idx";
  DROP INDEX IF EXISTS "analytics_daily_tenant_idx";
  DROP INDEX IF EXISTS "tenant_day_kind_key_idx";
  DROP INDEX IF EXISTS "homepage_tenant_idx";
  DROP INDEX IF EXISTS "homepage_updated_at_idx";
  DROP INDEX IF EXISTS "homepage_created_at_idx";
  DROP INDEX IF EXISTS "tenant_idx";
  DROP INDEX IF EXISTS "_homepage_v_parent_idx";
  DROP INDEX IF EXISTS "_homepage_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "_homepage_v_version_version_updated_at_idx";
  DROP INDEX IF EXISTS "_homepage_v_version_version_created_at_idx";
  DROP INDEX IF EXISTS "version_tenant_idx";
  DROP INDEX IF EXISTS "site_settings_og_image_idx";
  DROP INDEX IF EXISTS "site_settings_tenant_idx";
  DROP INDEX IF EXISTS "site_settings_updated_at_idx";
  DROP INDEX IF EXISTS "site_settings_created_at_idx";
  DROP INDEX IF EXISTS "tenant_1_idx";
  DROP INDEX IF EXISTS "_site_settings_v_parent_idx";
  DROP INDEX IF EXISTS "_site_settings_v_version_version_og_image_idx";
  DROP INDEX IF EXISTS "_site_settings_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "_site_settings_v_version_version_updated_at_idx";
  DROP INDEX IF EXISTS "_site_settings_v_version_version_created_at_idx";
  DROP INDEX IF EXISTS "version_tenant_1_idx";
  DROP INDEX IF EXISTS "navigation_tenant_idx";
  DROP INDEX IF EXISTS "navigation_updated_at_idx";
  DROP INDEX IF EXISTS "navigation_created_at_idx";
  DROP INDEX IF EXISTS "tenant_2_idx";
  DROP INDEX IF EXISTS "_navigation_v_parent_idx";
  DROP INDEX IF EXISTS "_navigation_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "_navigation_v_version_version_updated_at_idx";
  DROP INDEX IF EXISTS "_navigation_v_version_version_created_at_idx";
  DROP INDEX IF EXISTS "version_tenant_2_idx";
  DROP INDEX IF EXISTS "feature_flags_tenant_idx";
  DROP INDEX IF EXISTS "feature_flags_updated_at_idx";
  DROP INDEX IF EXISTS "feature_flags_created_at_idx";
  DROP INDEX IF EXISTS "tenant_3_idx";
  DROP INDEX IF EXISTS "_feature_flags_v_parent_idx";
  DROP INDEX IF EXISTS "_feature_flags_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "_feature_flags_v_version_version_updated_at_idx";
  DROP INDEX IF EXISTS "_feature_flags_v_version_version_created_at_idx";
  DROP INDEX IF EXISTS "version_tenant_3_idx";
  DROP INDEX IF EXISTS "audit_logs_tenant_idx";
  DROP INDEX IF EXISTS "users_tenant_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_homepage_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_site_settings_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_navigation_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_feature_flags_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_tenants_id_idx";
  DROP INDEX IF EXISTS "pages_slug_idx";
  DROP INDEX IF EXISTS "posts_slug_idx";
  DROP INDEX IF EXISTS "categories_slug_idx";
  DROP INDEX IF EXISTS "announcements_slug_idx";
  DROP INDEX IF EXISTS "events_slug_idx";
  DROP INDEX IF EXISTS "event_categories_slug_idx";
  DROP INDEX IF EXISTS "faqs_slug_idx";
  DROP INDEX IF EXISTS "albums_slug_idx";
  DROP INDEX IF EXISTS "guides_slug_idx";
  DROP INDEX IF EXISTS "services_slug_idx";
  DROP INDEX IF EXISTS "testimonials_slug_idx";
  DROP INDEX IF EXISTS "programs_slug_idx";
  DROP INDEX IF EXISTS "extracurriculars_slug_idx";
  DROP INDEX IF EXISTS "facilities_slug_idx";
  DROP INDEX IF EXISTS "staff_slug_idx";
  DROP INDEX IF EXISTS "achievements_slug_idx";
  DROP INDEX IF EXISTS "student_works_slug_idx";
  DROP INDEX IF EXISTS "media_items_slug_idx";
  DROP INDEX IF EXISTS "media_items_normalized_url_idx";
  DROP INDEX IF EXISTS "admissions_cycles_academic_year_idx";
  DROP INDEX IF EXISTS "media_sha256_idx";
  DROP INDEX IF EXISTS "redirects_old_path_idx";
  ALTER TABLE "pages_blocks_admissions_cta" ALTER COLUMN "heading" SET DEFAULT 'Mari Mengenal KPS Lebih Dekat';
  ALTER TABLE "_pages_v_blocks_admissions_cta" ALTER COLUMN "heading" SET DEFAULT 'Mari Mengenal KPS Lebih Dekat';
  ALTER TABLE "homepage" ALTER COLUMN "hero_primary_label" SET DEFAULT 'Kenali KPS';
  ALTER TABLE "homepage" ALTER COLUMN "intro_heading" SET DEFAULT 'Mengenal SMP Nasional KPS';
  ALTER TABLE "homepage" ALTER COLUMN "texts_news_heading" SET DEFAULT 'Cerita dari KPS';
  ALTER TABLE "homepage" ALTER COLUMN "texts_community_heading" SET DEFAULT 'Terhubung dalam Keluarga KPS';
  ALTER TABLE "homepage" ALTER COLUMN "texts_media_eyebrow" SET DEFAULT 'KPS TV';
  ALTER TABLE "homepage" ALTER COLUMN "texts_media_heading" SET DEFAULT 'KPS TV & Cerita Digital';
  ALTER TABLE "homepage" ALTER COLUMN "texts_media_intro" SET DEFAULT 'Kenali kehidupan sekolah melalui video, podcast, dan cerita dari komunitas KPS.';
  ALTER TABLE "homepage" ALTER COLUMN "texts_cta_heading" SET DEFAULT 'Mari Mengenal KPS Lebih Dekat';
  ALTER TABLE "homepage" ALTER COLUMN "updated_at" DROP DEFAULT;
  ALTER TABLE "homepage" ALTER COLUMN "updated_at" DROP NOT NULL;
  ALTER TABLE "homepage" ALTER COLUMN "created_at" DROP DEFAULT;
  ALTER TABLE "homepage" ALTER COLUMN "created_at" DROP NOT NULL;
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_hero_primary_label" SET DEFAULT 'Kenali KPS';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_intro_heading" SET DEFAULT 'Mengenal SMP Nasional KPS';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_texts_news_heading" SET DEFAULT 'Cerita dari KPS';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_texts_community_heading" SET DEFAULT 'Terhubung dalam Keluarga KPS';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_texts_media_eyebrow" SET DEFAULT 'KPS TV';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_texts_media_heading" SET DEFAULT 'KPS TV & Cerita Digital';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_texts_media_intro" SET DEFAULT 'Kenali kehidupan sekolah melalui video, podcast, dan cerita dari komunitas KPS.';
  ALTER TABLE "_homepage_v" ALTER COLUMN "version_texts_cta_heading" SET DEFAULT 'Mari Mengenal KPS Lebih Dekat';
  ALTER TABLE "site_settings" ALTER COLUMN "school_name" SET DEFAULT 'SMP Nasional KPS';
  ALTER TABLE "site_settings" ALTER COLUMN "city" SET DEFAULT 'Balikpapan';
  ALTER TABLE "site_settings" ALTER COLUMN "values_line" SET DEFAULT 'Berakhlak Mulia, Berwawasan Lingkungan, dan Berbudaya Nasional';
  ALTER TABLE "site_settings" ALTER COLUMN "updated_at" DROP DEFAULT;
  ALTER TABLE "site_settings" ALTER COLUMN "updated_at" DROP NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "created_at" DROP DEFAULT;
  ALTER TABLE "site_settings" ALTER COLUMN "created_at" DROP NOT NULL;
  ALTER TABLE "_site_settings_v" ALTER COLUMN "version_school_name" SET DEFAULT 'SMP Nasional KPS';
  ALTER TABLE "_site_settings_v" ALTER COLUMN "version_city" SET DEFAULT 'Balikpapan';
  ALTER TABLE "_site_settings_v" ALTER COLUMN "version_values_line" SET DEFAULT 'Berakhlak Mulia, Berwawasan Lingkungan, dan Berbudaya Nasional';
  ALTER TABLE "navigation" ALTER COLUMN "updated_at" DROP DEFAULT;
  ALTER TABLE "navigation" ALTER COLUMN "updated_at" DROP NOT NULL;
  ALTER TABLE "navigation" ALTER COLUMN "created_at" DROP DEFAULT;
  ALTER TABLE "navigation" ALTER COLUMN "created_at" DROP NOT NULL;
  ALTER TABLE "feature_flags" ALTER COLUMN "updated_at" DROP DEFAULT;
  ALTER TABLE "feature_flags" ALTER COLUMN "updated_at" DROP NOT NULL;
  ALTER TABLE "feature_flags" ALTER COLUMN "created_at" DROP DEFAULT;
  ALTER TABLE "feature_flags" ALTER COLUMN "created_at" DROP NOT NULL;
  CREATE UNIQUE INDEX "day_kind_key_idx" ON "analytics_daily" USING btree ("day","kind","key");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE UNIQUE INDEX "announcements_slug_idx" ON "announcements" USING btree ("slug");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE UNIQUE INDEX "event_categories_slug_idx" ON "event_categories" USING btree ("slug");
  CREATE UNIQUE INDEX "faqs_slug_idx" ON "faqs" USING btree ("slug");
  CREATE UNIQUE INDEX "albums_slug_idx" ON "albums" USING btree ("slug");
  CREATE UNIQUE INDEX "guides_slug_idx" ON "guides" USING btree ("slug");
  CREATE UNIQUE INDEX "services_slug_idx" ON "services" USING btree ("slug");
  CREATE UNIQUE INDEX "testimonials_slug_idx" ON "testimonials" USING btree ("slug");
  CREATE UNIQUE INDEX "programs_slug_idx" ON "programs" USING btree ("slug");
  CREATE UNIQUE INDEX "extracurriculars_slug_idx" ON "extracurriculars" USING btree ("slug");
  CREATE UNIQUE INDEX "facilities_slug_idx" ON "facilities" USING btree ("slug");
  CREATE UNIQUE INDEX "staff_slug_idx" ON "staff" USING btree ("slug");
  CREATE UNIQUE INDEX "achievements_slug_idx" ON "achievements" USING btree ("slug");
  CREATE UNIQUE INDEX "student_works_slug_idx" ON "student_works" USING btree ("slug");
  CREATE UNIQUE INDEX "media_items_slug_idx" ON "media_items" USING btree ("slug");
  CREATE UNIQUE INDEX "media_items_normalized_url_idx" ON "media_items" USING btree ("normalized_url");
  CREATE UNIQUE INDEX "admissions_cycles_academic_year_idx" ON "admissions_cycles" USING btree ("academic_year");
  CREATE UNIQUE INDEX "media_sha256_idx" ON "media" USING btree ("sha256");
  CREATE UNIQUE INDEX "redirects_old_path_idx" ON "redirects" USING btree ("old_path");
  ALTER TABLE "pages" DROP COLUMN "tenant_id";
  ALTER TABLE "_pages_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "posts" DROP COLUMN "tenant_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "categories" DROP COLUMN "tenant_id";
  ALTER TABLE "announcements" DROP COLUMN "tenant_id";
  ALTER TABLE "_announcements_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "events" DROP COLUMN "tenant_id";
  ALTER TABLE "_events_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "event_categories" DROP COLUMN "tenant_id";
  ALTER TABLE "faqs" DROP COLUMN "tenant_id";
  ALTER TABLE "_faqs_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "albums" DROP COLUMN "tenant_id";
  ALTER TABLE "_albums_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "documents" DROP COLUMN "tenant_id";
  ALTER TABLE "_documents_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "guides" DROP COLUMN "tenant_id";
  ALTER TABLE "_guides_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "services" DROP COLUMN "tenant_id";
  ALTER TABLE "_services_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "testimonials" DROP COLUMN "tenant_id";
  ALTER TABLE "_testimonials_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "programs" DROP COLUMN "tenant_id";
  ALTER TABLE "_programs_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "extracurriculars" DROP COLUMN "tenant_id";
  ALTER TABLE "_extracurriculars_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "facilities" DROP COLUMN "tenant_id";
  ALTER TABLE "_facilities_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "staff" DROP COLUMN "tenant_id";
  ALTER TABLE "_staff_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "achievements" DROP COLUMN "tenant_id";
  ALTER TABLE "_achievements_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "student_works" DROP COLUMN "tenant_id";
  ALTER TABLE "_student_works_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "media_items" DROP COLUMN "tenant_id";
  ALTER TABLE "_media_items_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "social_accounts" DROP COLUMN "tenant_id";
  ALTER TABLE "admissions_cycles" DROP COLUMN "tenant_id";
  ALTER TABLE "_admissions_cycles_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "leads" DROP COLUMN "tenant_id";
  ALTER TABLE "visit_sessions" DROP COLUMN "tenant_id";
  ALTER TABLE "visit_bookings" DROP COLUMN "tenant_id";
  ALTER TABLE "contact_messages" DROP COLUMN "tenant_id";
  ALTER TABLE "media" DROP COLUMN "tenant_id";
  ALTER TABLE "private_files" DROP COLUMN "tenant_id";
  ALTER TABLE "redirects" DROP COLUMN "tenant_id";
  ALTER TABLE "analytics_daily" DROP COLUMN "tenant_id";
  ALTER TABLE "homepage" DROP COLUMN "tenant_id";
  ALTER TABLE "_homepage_v" DROP COLUMN "parent_id";
  ALTER TABLE "_homepage_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "site_settings" DROP COLUMN "short_name";
  ALTER TABLE "site_settings" DROP COLUMN "og_image_id";
  ALTER TABLE "site_settings" DROP COLUMN "notify_contact_email";
  ALTER TABLE "site_settings" DROP COLUMN "notify_admissions_email";
  ALTER TABLE "site_settings" DROP COLUMN "tenant_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "parent_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_short_name";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_og_image_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_notify_contact_email";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_notify_admissions_email";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "navigation" DROP COLUMN "tenant_id";
  ALTER TABLE "_navigation_v" DROP COLUMN "parent_id";
  ALTER TABLE "_navigation_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "feature_flags" DROP COLUMN "tenant_id";
  ALTER TABLE "_feature_flags_v" DROP COLUMN "parent_id";
  ALTER TABLE "_feature_flags_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "audit_logs" DROP COLUMN "tenant_id";
  ALTER TABLE "users" DROP COLUMN "tenant_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "homepage_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "site_settings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "navigation_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "feature_flags_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "tenants_id";
  DROP TYPE "public"."enum_tenants_status";
  DROP TYPE "public"."enum_tenants_plan";
  DROP TYPE "public"."enum_tenants_timezone";
  DROP TYPE "public"."enum__tenants_v_version_status";
  DROP TYPE "public"."enum__tenants_v_version_plan";
  DROP TYPE "public"."enum__tenants_v_version_timezone";`)
}
