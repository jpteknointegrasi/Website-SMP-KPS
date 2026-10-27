import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_alumni_page_values_icon" AS ENUM('users', 'handshake', 'star', 'heart');
  CREATE TYPE "public"."enum__alumni_page_v_version_values_icon" AS ENUM('users', 'handshake', 'star', 'heart');
  ALTER TYPE "public"."enum_events_audience" ADD VALUE 'alumni';
  ALTER TYPE "public"."enum__events_v_version_audience" ADD VALUE 'alumni';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'syncAppWorks' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'syncAppWorks' BEFORE 'schedulePublish';
  CREATE TABLE "alumni_page_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"icon" "enum_alumni_page_values_icon" DEFAULT 'users',
  	"text" varchar
  );
  
  CREATE TABLE "alumni_page_committee" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" varchar NOT NULL,
  	"photo_id" integer,
  	"note" varchar
  );
  
  CREATE TABLE "alumni_page_activities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"category" varchar,
  	"summary" varchar,
  	"image_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "alumni_page_stories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"image_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "alumni_page_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "alumni_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"heading_accent" varchar,
  	"tagline" varchar,
  	"intro" varchar,
  	"hero_image_id" integer,
  	"hero_caption" varchar,
  	"join_url" varchar,
  	"instagram_url" varchar,
  	"about_heading" varchar,
  	"about_text" varchar,
  	"about_image_id" integer,
  	"committee_note" varchar,
  	"committee_url" varchar,
  	"agenda_heading" varchar,
  	"agenda_text" varchar,
  	"photo_credit" varchar,
  	"cta_heading" varchar,
  	"cta_text" varchar,
  	"tenant_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_alumni_page_v_version_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"icon" "enum__alumni_page_v_version_values_icon" DEFAULT 'users',
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_alumni_page_v_version_committee" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" varchar NOT NULL,
  	"photo_id" integer,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_alumni_page_v_version_activities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"category" varchar,
  	"summary" varchar,
  	"image_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_alumni_page_v_version_stories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"image_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_alumni_page_v_version_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_alumni_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_eyebrow" varchar,
  	"version_heading" varchar,
  	"version_heading_accent" varchar,
  	"version_tagline" varchar,
  	"version_intro" varchar,
  	"version_hero_image_id" integer,
  	"version_hero_caption" varchar,
  	"version_join_url" varchar,
  	"version_instagram_url" varchar,
  	"version_about_heading" varchar,
  	"version_about_text" varchar,
  	"version_about_image_id" integer,
  	"version_committee_note" varchar,
  	"version_committee_url" varchar,
  	"version_agenda_heading" varchar,
  	"version_agenda_text" varchar,
  	"version_photo_credit" varchar,
  	"version_cta_heading" varchar,
  	"version_cta_text" varchar,
  	"version_tenant_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events_rundown" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"time" varchar,
  	"activity" varchar,
  	"highlight" boolean
  );
  
  CREATE TABLE "_events_v_version_rundown" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"time" varchar,
  	"activity" varchar,
  	"highlight" boolean,
  	"_uuid" varchar
  );
  
  DROP INDEX "tenant_slug_7_idx";
  DROP INDEX "version_tenant_version_slug_5_idx";
  DROP INDEX "tenant_slug_9_idx";
  DROP INDEX "version_tenant_version_slug_7_idx";
  DROP INDEX "tenant_slug_10_idx";
  DROP INDEX "version_tenant_version_slug_8_idx";
  DROP INDEX "tenant_slug_11_idx";
  DROP INDEX "version_tenant_version_slug_9_idx";
  DROP INDEX "tenant_slug_12_idx";
  DROP INDEX "version_tenant_version_slug_10_idx";
  DROP INDEX "tenant_slug_13_idx";
  DROP INDEX "version_tenant_version_slug_11_idx";
  DROP INDEX "tenant_slug_14_idx";
  DROP INDEX "version_tenant_version_slug_12_idx";
  DROP INDEX "tenant_slug_15_idx";
  DROP INDEX "version_tenant_version_slug_13_idx";
  DROP INDEX "tenant_slug_16_idx";
  DROP INDEX "version_tenant_version_slug_14_idx";
  DROP INDEX "tenant_1_idx";
  DROP INDEX "version_tenant_1_idx";
  DROP INDEX "tenant_3_idx";
  DROP INDEX "version_tenant_3_idx";
  ALTER TABLE "events" ADD COLUMN "dress_code" varchar;
  ALTER TABLE "events" ADD COLUMN "home_banner" boolean DEFAULT false;
  ALTER TABLE "_events_v" ADD COLUMN "version_dress_code" varchar;
  ALTER TABLE "_events_v" ADD COLUMN "version_home_banner" boolean DEFAULT false;
  ALTER TABLE "alumni_page_values" ADD CONSTRAINT "alumni_page_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."alumni_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "alumni_page_committee" ADD CONSTRAINT "alumni_page_committee_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "alumni_page_committee" ADD CONSTRAINT "alumni_page_committee_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."alumni_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "alumni_page_activities" ADD CONSTRAINT "alumni_page_activities_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "alumni_page_activities" ADD CONSTRAINT "alumni_page_activities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."alumni_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "alumni_page_stories" ADD CONSTRAINT "alumni_page_stories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "alumni_page_stories" ADD CONSTRAINT "alumni_page_stories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."alumni_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "alumni_page_gallery" ADD CONSTRAINT "alumni_page_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "alumni_page_gallery" ADD CONSTRAINT "alumni_page_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."alumni_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "alumni_page" ADD CONSTRAINT "alumni_page_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "alumni_page" ADD CONSTRAINT "alumni_page_about_image_id_media_id_fk" FOREIGN KEY ("about_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "alumni_page" ADD CONSTRAINT "alumni_page_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_values" ADD CONSTRAINT "_alumni_page_v_version_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_alumni_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_committee" ADD CONSTRAINT "_alumni_page_v_version_committee_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_committee" ADD CONSTRAINT "_alumni_page_v_version_committee_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_alumni_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_activities" ADD CONSTRAINT "_alumni_page_v_version_activities_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_activities" ADD CONSTRAINT "_alumni_page_v_version_activities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_alumni_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_stories" ADD CONSTRAINT "_alumni_page_v_version_stories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_stories" ADD CONSTRAINT "_alumni_page_v_version_stories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_alumni_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_gallery" ADD CONSTRAINT "_alumni_page_v_version_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_gallery" ADD CONSTRAINT "_alumni_page_v_version_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_alumni_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_alumni_page_v" ADD CONSTRAINT "_alumni_page_v_parent_id_alumni_page_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."alumni_page"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v" ADD CONSTRAINT "_alumni_page_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v" ADD CONSTRAINT "_alumni_page_v_version_about_image_id_media_id_fk" FOREIGN KEY ("version_about_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v" ADD CONSTRAINT "_alumni_page_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_rundown" ADD CONSTRAINT "events_rundown_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_rundown" ADD CONSTRAINT "_events_v_version_rundown_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "alumni_page_values_order_idx" ON "alumni_page_values" USING btree ("_order");
  CREATE INDEX "alumni_page_values_parent_id_idx" ON "alumni_page_values" USING btree ("_parent_id");
  CREATE INDEX "alumni_page_committee_order_idx" ON "alumni_page_committee" USING btree ("_order");
  CREATE INDEX "alumni_page_committee_parent_id_idx" ON "alumni_page_committee" USING btree ("_parent_id");
  CREATE INDEX "alumni_page_committee_photo_idx" ON "alumni_page_committee" USING btree ("photo_id");
  CREATE INDEX "alumni_page_activities_order_idx" ON "alumni_page_activities" USING btree ("_order");
  CREATE INDEX "alumni_page_activities_parent_id_idx" ON "alumni_page_activities" USING btree ("_parent_id");
  CREATE INDEX "alumni_page_activities_image_idx" ON "alumni_page_activities" USING btree ("image_id");
  CREATE INDEX "alumni_page_stories_order_idx" ON "alumni_page_stories" USING btree ("_order");
  CREATE INDEX "alumni_page_stories_parent_id_idx" ON "alumni_page_stories" USING btree ("_parent_id");
  CREATE INDEX "alumni_page_stories_image_idx" ON "alumni_page_stories" USING btree ("image_id");
  CREATE INDEX "alumni_page_gallery_order_idx" ON "alumni_page_gallery" USING btree ("_order");
  CREATE INDEX "alumni_page_gallery_parent_id_idx" ON "alumni_page_gallery" USING btree ("_parent_id");
  CREATE INDEX "alumni_page_gallery_image_idx" ON "alumni_page_gallery" USING btree ("image_id");
  CREATE INDEX "alumni_page_hero_image_idx" ON "alumni_page" USING btree ("hero_image_id");
  CREATE INDEX "alumni_page_about_image_idx" ON "alumni_page" USING btree ("about_image_id");
  CREATE INDEX "alumni_page_tenant_idx" ON "alumni_page" USING btree ("tenant_id");
  CREATE INDEX "alumni_page_updated_at_idx" ON "alumni_page" USING btree ("updated_at");
  CREATE INDEX "alumni_page_created_at_idx" ON "alumni_page" USING btree ("created_at");
  CREATE UNIQUE INDEX "tenant_1_idx" ON "alumni_page" USING btree ("tenant_id");
  CREATE INDEX "_alumni_page_v_version_values_order_idx" ON "_alumni_page_v_version_values" USING btree ("_order");
  CREATE INDEX "_alumni_page_v_version_values_parent_id_idx" ON "_alumni_page_v_version_values" USING btree ("_parent_id");
  CREATE INDEX "_alumni_page_v_version_committee_order_idx" ON "_alumni_page_v_version_committee" USING btree ("_order");
  CREATE INDEX "_alumni_page_v_version_committee_parent_id_idx" ON "_alumni_page_v_version_committee" USING btree ("_parent_id");
  CREATE INDEX "_alumni_page_v_version_committee_photo_idx" ON "_alumni_page_v_version_committee" USING btree ("photo_id");
  CREATE INDEX "_alumni_page_v_version_activities_order_idx" ON "_alumni_page_v_version_activities" USING btree ("_order");
  CREATE INDEX "_alumni_page_v_version_activities_parent_id_idx" ON "_alumni_page_v_version_activities" USING btree ("_parent_id");
  CREATE INDEX "_alumni_page_v_version_activities_image_idx" ON "_alumni_page_v_version_activities" USING btree ("image_id");
  CREATE INDEX "_alumni_page_v_version_stories_order_idx" ON "_alumni_page_v_version_stories" USING btree ("_order");
  CREATE INDEX "_alumni_page_v_version_stories_parent_id_idx" ON "_alumni_page_v_version_stories" USING btree ("_parent_id");
  CREATE INDEX "_alumni_page_v_version_stories_image_idx" ON "_alumni_page_v_version_stories" USING btree ("image_id");
  CREATE INDEX "_alumni_page_v_version_gallery_order_idx" ON "_alumni_page_v_version_gallery" USING btree ("_order");
  CREATE INDEX "_alumni_page_v_version_gallery_parent_id_idx" ON "_alumni_page_v_version_gallery" USING btree ("_parent_id");
  CREATE INDEX "_alumni_page_v_version_gallery_image_idx" ON "_alumni_page_v_version_gallery" USING btree ("image_id");
  CREATE INDEX "_alumni_page_v_parent_idx" ON "_alumni_page_v" USING btree ("parent_id");
  CREATE INDEX "_alumni_page_v_version_version_hero_image_idx" ON "_alumni_page_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_alumni_page_v_version_version_about_image_idx" ON "_alumni_page_v" USING btree ("version_about_image_id");
  CREATE INDEX "_alumni_page_v_version_version_tenant_idx" ON "_alumni_page_v" USING btree ("version_tenant_id");
  CREATE INDEX "_alumni_page_v_version_version_updated_at_idx" ON "_alumni_page_v" USING btree ("version_updated_at");
  CREATE INDEX "_alumni_page_v_version_version_created_at_idx" ON "_alumni_page_v" USING btree ("version_created_at");
  CREATE INDEX "_alumni_page_v_created_at_idx" ON "_alumni_page_v" USING btree ("created_at");
  CREATE INDEX "_alumni_page_v_updated_at_idx" ON "_alumni_page_v" USING btree ("updated_at");
  CREATE INDEX "version_tenant_1_idx" ON "_alumni_page_v" USING btree ("version_tenant_id");
  CREATE INDEX "events_rundown_order_idx" ON "events_rundown" USING btree ("_order");
  CREATE INDEX "events_rundown_parent_id_idx" ON "events_rundown" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_rundown_order_idx" ON "_events_v_version_rundown" USING btree ("_order");
  CREATE INDEX "_events_v_version_rundown_parent_id_idx" ON "_events_v_version_rundown" USING btree ("_parent_id");
  CREATE INDEX "events_home_banner_idx" ON "events" USING btree ("home_banner");
  CREATE INDEX "_events_v_version_version_home_banner_idx" ON "_events_v" USING btree ("version_home_banner");
  CREATE UNIQUE INDEX "tenant_slug_16_idx" ON "albums" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_14_idx" ON "_albums_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_7_idx" ON "services" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_5_idx" ON "_services_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_15_idx" ON "testimonials" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_13_idx" ON "_testimonials_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_10_idx" ON "programs" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_8_idx" ON "_programs_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_11_idx" ON "extracurriculars" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_9_idx" ON "_extracurriculars_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_12_idx" ON "facilities" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_10_idx" ON "_facilities_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_9_idx" ON "staff" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_7_idx" ON "_staff_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_13_idx" ON "achievements" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_11_idx" ON "_achievements_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_14_idx" ON "student_works" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_12_idx" ON "_student_works_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_3_idx" ON "site_settings" USING btree ("tenant_id");
  CREATE INDEX "version_tenant_3_idx" ON "_site_settings_v" USING btree ("version_tenant_id");
  CREATE UNIQUE INDEX "tenant_4_idx" ON "feature_flags" USING btree ("tenant_id");
  CREATE INDEX "version_tenant_4_idx" ON "_feature_flags_v" USING btree ("version_tenant_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "alumni_page_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "alumni_page_committee" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "alumni_page_activities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "alumni_page_stories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "alumni_page_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "alumni_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_alumni_page_v_version_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_alumni_page_v_version_committee" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_alumni_page_v_version_activities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_alumni_page_v_version_stories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_alumni_page_v_version_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_alumni_page_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_rundown" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v_version_rundown" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "alumni_page_values" CASCADE;
  DROP TABLE "alumni_page_committee" CASCADE;
  DROP TABLE "alumni_page_activities" CASCADE;
  DROP TABLE "alumni_page_stories" CASCADE;
  DROP TABLE "alumni_page_gallery" CASCADE;
  DROP TABLE "alumni_page" CASCADE;
  DROP TABLE "_alumni_page_v_version_values" CASCADE;
  DROP TABLE "_alumni_page_v_version_committee" CASCADE;
  DROP TABLE "_alumni_page_v_version_activities" CASCADE;
  DROP TABLE "_alumni_page_v_version_stories" CASCADE;
  DROP TABLE "_alumni_page_v_version_gallery" CASCADE;
  DROP TABLE "_alumni_page_v" CASCADE;
  DROP TABLE "events_rundown" CASCADE;
  DROP TABLE "_events_v_version_rundown" CASCADE;
  ALTER TABLE "events_audience" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_events_audience";
  CREATE TYPE "public"."enum_events_audience" AS ENUM('semua', 'kelas_7', 'kelas_8', 'kelas_9', 'orang_tua', 'calon_siswa', 'guru');
  ALTER TABLE "events_audience" ALTER COLUMN "value" SET DATA TYPE "public"."enum_events_audience" USING "value"::"public"."enum_events_audience";
  ALTER TABLE "_events_v_version_audience" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum__events_v_version_audience";
  CREATE TYPE "public"."enum__events_v_version_audience" AS ENUM('semua', 'kelas_7', 'kelas_8', 'kelas_9', 'orang_tua', 'calon_siswa', 'guru');
  ALTER TABLE "_events_v_version_audience" ALTER COLUMN "value" SET DATA TYPE "public"."enum__events_v_version_audience" USING "value"::"public"."enum__events_v_version_audience";
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'releaseVisitHolds', 'schedulePublish');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'releaseVisitHolds', 'schedulePublish');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "events_home_banner_idx";
  DROP INDEX "_events_v_version_version_home_banner_idx";
  DROP INDEX "tenant_slug_7_idx";
  DROP INDEX "version_tenant_version_slug_5_idx";
  DROP INDEX "tenant_slug_9_idx";
  DROP INDEX "version_tenant_version_slug_7_idx";
  DROP INDEX "tenant_slug_10_idx";
  DROP INDEX "version_tenant_version_slug_8_idx";
  DROP INDEX "tenant_slug_11_idx";
  DROP INDEX "version_tenant_version_slug_9_idx";
  DROP INDEX "tenant_slug_12_idx";
  DROP INDEX "version_tenant_version_slug_10_idx";
  DROP INDEX "tenant_slug_13_idx";
  DROP INDEX "version_tenant_version_slug_11_idx";
  DROP INDEX "tenant_slug_14_idx";
  DROP INDEX "version_tenant_version_slug_12_idx";
  DROP INDEX "tenant_slug_15_idx";
  DROP INDEX "version_tenant_version_slug_13_idx";
  DROP INDEX "tenant_slug_16_idx";
  DROP INDEX "version_tenant_version_slug_14_idx";
  DROP INDEX "tenant_3_idx";
  DROP INDEX "version_tenant_3_idx";
  DROP INDEX "tenant_4_idx";
  DROP INDEX "version_tenant_4_idx";
  CREATE UNIQUE INDEX "tenant_slug_9_idx" ON "services" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_7_idx" ON "_services_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_14_idx" ON "staff" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_12_idx" ON "_staff_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_11_idx" ON "programs" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_9_idx" ON "_programs_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_12_idx" ON "extracurriculars" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_10_idx" ON "_extracurriculars_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_13_idx" ON "facilities" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_11_idx" ON "_facilities_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_15_idx" ON "achievements" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_13_idx" ON "_achievements_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_16_idx" ON "student_works" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_14_idx" ON "_student_works_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_10_idx" ON "testimonials" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_8_idx" ON "_testimonials_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_slug_7_idx" ON "albums" USING btree ("tenant_id","slug");
  CREATE INDEX "version_tenant_version_slug_5_idx" ON "_albums_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "tenant_1_idx" ON "site_settings" USING btree ("tenant_id");
  CREATE INDEX "version_tenant_1_idx" ON "_site_settings_v" USING btree ("version_tenant_id");
  CREATE UNIQUE INDEX "tenant_3_idx" ON "feature_flags" USING btree ("tenant_id");
  CREATE INDEX "version_tenant_3_idx" ON "_feature_flags_v" USING btree ("version_tenant_id");
  ALTER TABLE "events" DROP COLUMN "dress_code";
  ALTER TABLE "events" DROP COLUMN "home_banner";
  ALTER TABLE "_events_v" DROP COLUMN "version_dress_code";
  ALTER TABLE "_events_v" DROP COLUMN "version_home_banner";
  DROP TYPE "public"."enum_alumni_page_values_icon";
  DROP TYPE "public"."enum__alumni_page_v_version_values_icon";`)
}
