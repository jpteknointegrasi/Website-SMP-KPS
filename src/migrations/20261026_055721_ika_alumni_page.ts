import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_alumni_page_values_icon" AS ENUM('users', 'handshake', 'star', 'heart');
  CREATE TYPE "public"."enum__alumni_page_v_version_values_icon" AS ENUM('users', 'handshake', 'star', 'heart');
  ALTER TYPE "public"."enum_events_audience" ADD VALUE 'alumni';
  ALTER TYPE "public"."enum__events_v_version_audience" ADD VALUE 'alumni';
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
  	"cta_heading" varchar,
  	"cta_text" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
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
  	"version_cta_heading" varchar,
  	"version_cta_text" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
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
  ALTER TABLE "_alumni_page_v_version_values" ADD CONSTRAINT "_alumni_page_v_version_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_alumni_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_committee" ADD CONSTRAINT "_alumni_page_v_version_committee_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_committee" ADD CONSTRAINT "_alumni_page_v_version_committee_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_alumni_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_activities" ADD CONSTRAINT "_alumni_page_v_version_activities_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_activities" ADD CONSTRAINT "_alumni_page_v_version_activities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_alumni_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_stories" ADD CONSTRAINT "_alumni_page_v_version_stories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_stories" ADD CONSTRAINT "_alumni_page_v_version_stories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_alumni_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_gallery" ADD CONSTRAINT "_alumni_page_v_version_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v_version_gallery" ADD CONSTRAINT "_alumni_page_v_version_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_alumni_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_alumni_page_v" ADD CONSTRAINT "_alumni_page_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_alumni_page_v" ADD CONSTRAINT "_alumni_page_v_version_about_image_id_media_id_fk" FOREIGN KEY ("version_about_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
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
  CREATE INDEX "_alumni_page_v_version_version_hero_image_idx" ON "_alumni_page_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_alumni_page_v_version_version_about_image_idx" ON "_alumni_page_v" USING btree ("version_about_image_id");
  CREATE INDEX "_alumni_page_v_created_at_idx" ON "_alumni_page_v" USING btree ("created_at");
  CREATE INDEX "_alumni_page_v_updated_at_idx" ON "_alumni_page_v" USING btree ("updated_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
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
  DELETE FROM "events_audience" WHERE "value" = 'alumni';
  DELETE FROM "_events_v_version_audience" WHERE "value" = 'alumni';
  ALTER TABLE "events_audience" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_events_audience";
  CREATE TYPE "public"."enum_events_audience" AS ENUM('semua', 'kelas_7', 'kelas_8', 'kelas_9', 'orang_tua', 'calon_siswa', 'guru');
  ALTER TABLE "events_audience" ALTER COLUMN "value" SET DATA TYPE "public"."enum_events_audience" USING "value"::"public"."enum_events_audience";
  ALTER TABLE "_events_v_version_audience" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum__events_v_version_audience";
  CREATE TYPE "public"."enum__events_v_version_audience" AS ENUM('semua', 'kelas_7', 'kelas_8', 'kelas_9', 'orang_tua', 'calon_siswa', 'guru');
  ALTER TABLE "_events_v_version_audience" ALTER COLUMN "value" SET DATA TYPE "public"."enum__events_v_version_audience" USING "value"::"public"."enum__events_v_version_audience";
  DROP TYPE "public"."enum_alumni_page_values_icon";
  DROP TYPE "public"."enum__alumni_page_v_version_values_icon";`)
}
