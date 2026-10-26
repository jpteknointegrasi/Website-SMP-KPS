import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_image_text_image_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_pages_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_blocks_image_text_image_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__pages_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_posts_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_announcements_audience" AS ENUM('umum', 'orang_tua', 'siswa', 'alumni');
  CREATE TYPE "public"."enum_announcements_category" AS ENUM('umum', 'akademik', 'pendaftaran', 'kegiatan');
  CREATE TYPE "public"."enum_announcements_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_announcements_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__announcements_v_version_audience" AS ENUM('umum', 'orang_tua', 'siswa', 'alumni');
  CREATE TYPE "public"."enum__announcements_v_version_category" AS ENUM('umum', 'akademik', 'pendaftaran', 'kegiatan');
  CREATE TYPE "public"."enum__announcements_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__announcements_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_events_startat_tz" AS ENUM('Asia/Makassar');
  CREATE TYPE "public"."enum_events_endat_tz" AS ENUM('Asia/Makassar');
  CREATE TYPE "public"."enum_events_event_status" AS ENUM('scheduled', 'postponed', 'cancelled', 'completed');
  CREATE TYPE "public"."enum_events_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_version_startat_tz" AS ENUM('Asia/Makassar');
  CREATE TYPE "public"."enum__events_v_version_endat_tz" AS ENUM('Asia/Makassar');
  CREATE TYPE "public"."enum__events_v_version_event_status" AS ENUM('scheduled', 'postponed', 'cancelled', 'completed');
  CREATE TYPE "public"."enum__events_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_albums_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_albums_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__albums_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__albums_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_documents_category" AS ENUM('umum', 'bos', 'kalender', 'panduan', 'buletin');
  CREATE TYPE "public"."enum_documents_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_documents_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__documents_v_version_category" AS ENUM('umum', 'bos', 'kalender', 'panduan', 'buletin');
  CREATE TYPE "public"."enum__documents_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__documents_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_guides_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_guides_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__guides_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__guides_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_services_icon" AS ENUM('link', 'book', 'report', 'calendar', 'megaphone', 'users', 'grid', 'pencil', 'file', 'school');
  CREATE TYPE "public"."enum_services_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_services_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__services_v_version_icon" AS ENUM('link', 'book', 'report', 'calendar', 'megaphone', 'users', 'grid', 'pencil', 'file', 'school');
  CREATE TYPE "public"."enum__services_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__services_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_testimonials_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_testimonials_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__testimonials_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__testimonials_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_programs_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_programs_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__programs_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__programs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_extracurriculars_kind" AS ENUM('ekskul', 'organisasi', 'kegiatan');
  CREATE TYPE "public"."enum_extracurriculars_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_extracurriculars_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__extracurriculars_v_version_kind" AS ENUM('ekskul', 'organisasi', 'kegiatan');
  CREATE TYPE "public"."enum__extracurriculars_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__extracurriculars_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_facilities_availability" AS ENUM('available', 'renovation', 'planned');
  CREATE TYPE "public"."enum_facilities_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_facilities_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__facilities_v_version_availability" AS ENUM('available', 'renovation', 'planned');
  CREATE TYPE "public"."enum__facilities_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__facilities_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_staff_group" AS ENUM('pimpinan', 'guru', 'staf');
  CREATE TYPE "public"."enum_staff_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_staff_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__staff_v_version_group" AS ENUM('pimpinan', 'guru', 'staf');
  CREATE TYPE "public"."enum__staff_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__staff_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_achievements_category" AS ENUM('akademik', 'olahraga', 'seni', 'keagamaan', 'lainnya');
  CREATE TYPE "public"."enum_achievements_level" AS ENUM('sekolah', 'kota', 'provinsi', 'nasional', 'internasional');
  CREATE TYPE "public"."enum_achievements_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_achievements_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__achievements_v_version_category" AS ENUM('akademik', 'olahraga', 'seni', 'keagamaan', 'lainnya');
  CREATE TYPE "public"."enum__achievements_v_version_level" AS ENUM('sekolah', 'kota', 'provinsi', 'nasional', 'internasional');
  CREATE TYPE "public"."enum__achievements_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__achievements_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_admissions_cycles_admission_status" AS ENUM('unconfirmed', 'not_open', 'open', 'closed');
  CREATE TYPE "public"."enum_admissions_cycles_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_admissions_cycles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__admissions_cycles_v_version_admission_status" AS ENUM('unconfirmed', 'not_open', 'open', 'closed');
  CREATE TYPE "public"."enum__admissions_cycles_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__admissions_cycles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_contact_messages_category" AS ENUM('umum', 'pendaftaran', 'akademik', 'saran', 'alumni');
  CREATE TYPE "public"."enum_contact_messages_status" AS ENUM('new', 'in_progress', 'done', 'spam');
  CREATE TYPE "public"."enum_media_consent" AS ENUM('unknown', 'approved', 'not_required');
  CREATE TYPE "public"."enum_media_review_status" AS ENUM('pending', 'approved', 'blocked');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'contributor', 'admissions');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'schedulePublish');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'schedulePublish');
  CREATE TYPE "public"."enum_homepage_quick_links_icon" AS ENUM('link', 'book', 'report', 'calendar', 'megaphone', 'users', 'grid', 'pencil', 'file', 'school');
  CREATE TYPE "public"."enum_homepage_sections_type" AS ENUM('quickLinks', 'search', 'highlights', 'schoolIntro', 'programs', 'studentLife', 'achievements', 'announcementsAgenda', 'latestNews', 'facilities', 'communityAlumni', 'admissionsCta');
  CREATE TYPE "public"."enum_homepage_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__homepage_v_version_quick_links_icon" AS ENUM('link', 'book', 'report', 'calendar', 'megaphone', 'users', 'grid', 'pencil', 'file', 'school');
  CREATE TYPE "public"."enum__homepage_v_version_sections_type" AS ENUM('quickLinks', 'search', 'highlights', 'schoolIntro', 'programs', 'studentLife', 'achievements', 'announcementsAgenda', 'latestNews', 'facilities', 'communityAlumni', 'admissionsCta');
  CREATE TYPE "public"."enum__homepage_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_site_settings_socials_platform" AS ENUM('instagram', 'youtube', 'facebook', 'tiktok');
  CREATE TYPE "public"."enum__site_settings_v_version_socials_platform" AS ENUM('instagram', 'youtube', 'facebook', 'tiktok');
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"content" jsonb,
  	"image_id" integer,
  	"image_side" "enum_pages_blocks_image_text_image_side" DEFAULT 'right',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_values_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"label" varchar,
  	"href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"cover_id" integer,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"workflow_status" "enum_pages_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"content" jsonb,
  	"image_id" integer,
  	"image_side" "enum__pages_v_blocks_image_text_image_side" DEFAULT 'right',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_values_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"label" varchar,
  	"href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_cover_id" integer,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_workflow_status" "enum__pages_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"cover_id" integer,
  	"cover_caption" varchar,
  	"content" jsonb,
  	"author_name" varchar,
  	"published_at" timestamp(3) with time zone,
  	"source_url" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"workflow_status" "enum_posts_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"categories_id" integer
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_cover_id" integer,
  	"version_cover_caption" varchar,
  	"version_content" jsonb,
  	"version_author_name" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_source_url" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_workflow_status" "enum__posts_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"categories_id" integer
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "announcements_audience" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_announcements_audience",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "announcements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"content" jsonb,
  	"category" "enum_announcements_category" DEFAULT 'umum',
  	"priority" numeric DEFAULT 0,
  	"display_start" timestamp(3) with time zone,
  	"display_end" timestamp(3) with time zone,
  	"contact" varchar,
  	"cover_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"workflow_status" "enum_announcements_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_announcements_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "announcements_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documents_id" integer
  );
  
  CREATE TABLE "_announcements_v_version_audience" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__announcements_v_version_audience",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_announcements_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"version_category" "enum__announcements_v_version_category" DEFAULT 'umum',
  	"version_priority" numeric DEFAULT 0,
  	"version_display_start" timestamp(3) with time zone,
  	"version_display_end" timestamp(3) with time zone,
  	"version_contact" varchar,
  	"version_cover_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_workflow_status" "enum__announcements_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__announcements_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_announcements_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documents_id" integer
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"start_at" timestamp(3) with time zone,
  	"startat_tz" "enum_events_startat_tz" DEFAULT 'Asia/Makassar',
  	"end_at" timestamp(3) with time zone,
  	"endat_tz" "enum_events_endat_tz" DEFAULT 'Asia/Makassar',
  	"all_day" boolean DEFAULT false,
  	"location" varchar,
  	"organizer" varchar,
  	"event_status" "enum_events_event_status" DEFAULT 'scheduled',
  	"excerpt" varchar,
  	"content" jsonb,
  	"registration_url" varchar,
  	"cover_id" integer,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"workflow_status" "enum_events_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_start_at" timestamp(3) with time zone,
  	"version_startat_tz" "enum__events_v_version_startat_tz" DEFAULT 'Asia/Makassar',
  	"version_end_at" timestamp(3) with time zone,
  	"version_endat_tz" "enum__events_v_version_endat_tz" DEFAULT 'Asia/Makassar',
  	"version_all_day" boolean DEFAULT false,
  	"version_location" varchar,
  	"version_organizer" varchar,
  	"version_event_status" "enum__events_v_version_event_status" DEFAULT 'scheduled',
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"version_registration_url" varchar,
  	"version_cover_id" integer,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_workflow_status" "enum__events_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "albums_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar
  );
  
  CREATE TABLE "albums" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"event_date" timestamp(3) with time zone,
  	"excerpt" varchar,
  	"cover_id" integer,
  	"publication_consent" boolean DEFAULT false,
  	"workflow_status" "enum_albums_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_albums_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_albums_v_version_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_albums_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_event_date" timestamp(3) with time zone,
  	"version_excerpt" varchar,
  	"version_cover_id" integer,
  	"version_publication_consent" boolean DEFAULT false,
  	"version_workflow_status" "enum__albums_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__albums_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"category" "enum_documents_category" DEFAULT 'umum',
  	"period" varchar,
  	"version" varchar DEFAULT '1.0',
  	"description" varchar,
  	"approved_at" timestamp(3) with time zone,
  	"original_filename" varchar,
  	"published_at" timestamp(3) with time zone,
  	"workflow_status" "enum_documents_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_documents_status" DEFAULT 'draft',
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "_documents_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_category" "enum__documents_v_version_category" DEFAULT 'umum',
  	"version_period" varchar,
  	"version_version" varchar DEFAULT '1.0',
  	"version_description" varchar,
  	"version_approved_at" timestamp(3) with time zone,
  	"version_original_filename" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_workflow_status" "enum__documents_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__documents_v_version_status" DEFAULT 'draft',
  	"version_url" varchar,
  	"version_thumbnail_u_r_l" varchar,
  	"version_filename" varchar,
  	"version_mime_type" varchar,
  	"version_filesize" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version_focal_x" numeric,
  	"version_focal_y" numeric,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "guides_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"detail" varchar
  );
  
  CREATE TABLE "guides" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"category" varchar,
  	"excerpt" varchar,
  	"content" jsonb,
  	"last_reviewed_at" timestamp(3) with time zone,
  	"workflow_status" "enum_guides_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_guides_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "guides_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documents_id" integer
  );
  
  CREATE TABLE "_guides_v_version_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"detail" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_guides_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_category" varchar,
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"version_last_reviewed_at" timestamp(3) with time zone,
  	"version_workflow_status" "enum__guides_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__guides_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_guides_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documents_id" integer
  );
  
  CREATE TABLE "services" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"icon" "enum_services_icon" DEFAULT 'link',
  	"url" varchar,
  	"external" boolean DEFAULT true,
  	"order" numeric DEFAULT 10,
  	"workflow_status" "enum_services_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_services_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_services_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_icon" "enum__services_v_version_icon" DEFAULT 'link',
  	"version_url" varchar,
  	"version_external" boolean DEFAULT true,
  	"version_order" numeric DEFAULT 10,
  	"version_workflow_status" "enum__services_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__services_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "testimonials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"public_name" varchar,
  	"slug" varchar,
  	"role_line" varchar,
  	"quote" varchar,
  	"photo_id" integer,
  	"consent" boolean DEFAULT false,
  	"workflow_status" "enum_testimonials_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_testimonials_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_testimonials_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_public_name" varchar,
  	"version_slug" varchar,
  	"version_role_line" varchar,
  	"version_quote" varchar,
  	"version_photo_id" integer,
  	"version_consent" boolean DEFAULT false,
  	"version_workflow_status" "enum__testimonials_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__testimonials_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "programs_benefits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "programs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"cover_id" integer,
  	"content" jsonb,
  	"featured" boolean DEFAULT false,
  	"order" numeric DEFAULT 10,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"workflow_status" "enum_programs_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_programs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "programs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_programs_v_version_benefits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_programs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_cover_id" integer,
  	"version_content" jsonb,
  	"version_featured" boolean DEFAULT false,
  	"version_order" numeric DEFAULT 10,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_workflow_status" "enum__programs_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__programs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_programs_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "extracurriculars" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"cover_id" integer,
  	"content" jsonb,
  	"kind" "enum_extracurriculars_kind" DEFAULT 'ekskul',
  	"mentor" varchar,
  	"schedule" varchar,
  	"featured" boolean DEFAULT false,
  	"order" numeric DEFAULT 10,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"workflow_status" "enum_extracurriculars_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_extracurriculars_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "extracurriculars_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_extracurriculars_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_cover_id" integer,
  	"version_content" jsonb,
  	"version_kind" "enum__extracurriculars_v_version_kind" DEFAULT 'ekskul',
  	"version_mentor" varchar,
  	"version_schedule" varchar,
  	"version_featured" boolean DEFAULT false,
  	"version_order" numeric DEFAULT 10,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_workflow_status" "enum__extracurriculars_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__extracurriculars_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_extracurriculars_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "facilities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"cover_id" integer,
  	"content" jsonb,
  	"category" varchar,
  	"availability" "enum_facilities_availability" DEFAULT 'available',
  	"featured" boolean DEFAULT false,
  	"order" numeric DEFAULT 10,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"workflow_status" "enum_facilities_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_facilities_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "facilities_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_facilities_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_cover_id" integer,
  	"version_content" jsonb,
  	"version_category" varchar,
  	"version_availability" "enum__facilities_v_version_availability" DEFAULT 'available',
  	"version_featured" boolean DEFAULT false,
  	"version_order" numeric DEFAULT 10,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_workflow_status" "enum__facilities_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__facilities_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_facilities_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "staff" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"slug" varchar,
  	"position" varchar,
  	"group" "enum_staff_group" DEFAULT 'pimpinan',
  	"photo_id" integer,
  	"bio" varchar,
  	"publication_consent" boolean DEFAULT false,
  	"order" numeric DEFAULT 10,
  	"workflow_status" "enum_staff_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_staff_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_staff_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_position" varchar,
  	"version_group" "enum__staff_v_version_group" DEFAULT 'pimpinan',
  	"version_photo_id" integer,
  	"version_bio" varchar,
  	"version_publication_consent" boolean DEFAULT false,
  	"version_order" numeric DEFAULT 10,
  	"version_workflow_status" "enum__staff_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__staff_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "achievements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"category" "enum_achievements_category",
  	"level" "enum_achievements_level",
  	"year" numeric,
  	"recipient_public" varchar,
  	"organizer" varchar,
  	"date" timestamp(3) with time zone,
  	"excerpt" varchar,
  	"content" jsonb,
  	"cover_id" integer,
  	"verified" boolean DEFAULT false,
  	"proof_id" integer,
  	"featured" boolean DEFAULT false,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"workflow_status" "enum_achievements_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_achievements_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "achievements_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_achievements_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_category" "enum__achievements_v_version_category",
  	"version_level" "enum__achievements_v_version_level",
  	"version_year" numeric,
  	"version_recipient_public" varchar,
  	"version_organizer" varchar,
  	"version_date" timestamp(3) with time zone,
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"version_cover_id" integer,
  	"version_verified" boolean DEFAULT false,
  	"version_proof_id" integer,
  	"version_featured" boolean DEFAULT false,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_workflow_status" "enum__achievements_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__achievements_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_achievements_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "admissions_cycles_waves" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"start" timestamp(3) with time zone,
  	"end" timestamp(3) with time zone,
  	"note" varchar
  );
  
  CREATE TABLE "admissions_cycles_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"detail" varchar
  );
  
  CREATE TABLE "admissions_cycles_requirements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "admissions_cycles_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "admissions_cycles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"academic_year" varchar,
  	"admission_status" "enum_admissions_cycles_admission_status" DEFAULT 'unconfirmed',
  	"intro" varchar,
  	"registration_url" varchar,
  	"fees_approved" boolean DEFAULT false,
  	"fees" jsonb,
  	"contact_note" varchar,
  	"workflow_status" "enum_admissions_cycles_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_admissions_cycles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_admissions_cycles_v_version_waves" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"start" timestamp(3) with time zone,
  	"end" timestamp(3) with time zone,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_admissions_cycles_v_version_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"detail" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_admissions_cycles_v_version_requirements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_admissions_cycles_v_version_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_admissions_cycles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_academic_year" varchar,
  	"version_admission_status" "enum__admissions_cycles_v_version_admission_status" DEFAULT 'unconfirmed',
  	"version_intro" varchar,
  	"version_registration_url" varchar,
  	"version_fees_approved" boolean DEFAULT false,
  	"version_fees" jsonb,
  	"version_contact_note" varchar,
  	"version_workflow_status" "enum__admissions_cycles_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__admissions_cycles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "contact_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar,
  	"name" varchar NOT NULL,
  	"email" varchar,
  	"phone" varchar,
  	"category" "enum_contact_messages_category" NOT NULL,
  	"message" varchar NOT NULL,
  	"consent" boolean,
  	"status" "enum_contact_messages_status" DEFAULT 'new',
  	"assigned_to_id" integer,
  	"internal_note" varchar,
  	"email_notified" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"decorative" boolean DEFAULT false,
  	"caption" varchar,
  	"source_id" varchar,
  	"source_url" varchar,
  	"source_page" varchar,
  	"original_filename" varchar,
  	"downloaded_at" timestamp(3) with time zone,
  	"sha256" varchar,
  	"license" varchar,
  	"consent" "enum_media_consent" DEFAULT 'unknown',
  	"review_status" "enum_media_review_status" DEFAULT 'pending',
  	"editorial_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "private_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"original_filename" varchar,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"old_path" varchar NOT NULL,
  	"new_path" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'contributor' NOT NULL,
  	"can_publish_admissions" boolean DEFAULT false,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" varchar,
  	"collection_slug" varchar,
  	"doc_id" varchar,
  	"doc_title" varchar,
  	"status" varchar,
  	"workflow_status" varchar,
  	"actor_id" integer,
  	"actor_email" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"posts_id" integer,
  	"categories_id" integer,
  	"announcements_id" integer,
  	"events_id" integer,
  	"albums_id" integer,
  	"documents_id" integer,
  	"guides_id" integer,
  	"services_id" integer,
  	"testimonials_id" integer,
  	"programs_id" integer,
  	"extracurriculars_id" integer,
  	"facilities_id" integer,
  	"staff_id" integer,
  	"achievements_id" integer,
  	"admissions_cycles_id" integer,
  	"contact_messages_id" integer,
  	"media_id" integer,
  	"private_files_id" integer,
  	"redirects_id" integer,
  	"users_id" integer,
  	"audit_logs_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "homepage_quick_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"icon" "enum_homepage_quick_links_icon" DEFAULT 'link',
  	"href" varchar
  );
  
  CREATE TABLE "homepage_intro_pillars" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "homepage_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_homepage_sections_type",
  	"enabled" boolean DEFAULT true,
  	"limit" numeric
  );
  
  CREATE TABLE "homepage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_eyebrow" varchar,
  	"hero_title" varchar,
  	"hero_description" varchar,
  	"hero_image_id" integer,
  	"hero_image_mobile_id" integer,
  	"hero_primary_label" varchar DEFAULT 'Kenali KPS',
  	"hero_primary_href" varchar,
  	"hero_secondary_label" varchar DEFAULT 'Informasi Pendaftaran',
  	"hero_secondary_href" varchar,
  	"hero_show_live_clock" boolean DEFAULT true,
  	"intro_eyebrow" varchar DEFAULT 'Mengenal',
  	"intro_heading" varchar DEFAULT 'Mengenal SMP Nasional KPS',
  	"intro_text" varchar,
  	"intro_intro_image_id" integer,
  	"texts_programs_eyebrow" varchar DEFAULT 'Pembelajaran',
  	"texts_programs_heading" varchar DEFAULT 'Belajar dengan Makna',
  	"texts_programs_intro" varchar,
  	"texts_student_life_eyebrow" varchar DEFAULT 'Kehidupan Siswa',
  	"texts_achievements_eyebrow" varchar DEFAULT 'Prestasi',
  	"texts_achievements_text" varchar,
  	"texts_info_eyebrow" varchar DEFAULT 'Informasi',
  	"texts_news_eyebrow" varchar DEFAULT 'Berita Sekolah',
  	"texts_community_eyebrow" varchar DEFAULT 'Komunitas',
  	"texts_alumni_title" varchar DEFAULT 'Jejaring Alumni',
  	"texts_alumni_text" varchar,
  	"texts_cta_eyebrow" varchar DEFAULT 'Pendaftaran Siswa Baru',
  	"texts_student_life_heading" varchar DEFAULT 'Ruang untuk Setiap Potensi',
  	"texts_achievements_heading" varchar DEFAULT 'Semangat untuk Berprestasi',
  	"texts_news_heading" varchar DEFAULT 'Cerita dari KPS',
  	"texts_community_heading" varchar DEFAULT 'Terhubung dalam Keluarga KPS',
  	"texts_community_text" varchar,
  	"texts_community_image_id" integer,
  	"texts_achievements_album_id" integer,
  	"texts_cta_heading" varchar DEFAULT 'Mari Mengenal KPS Lebih Dekat',
  	"texts_cta_text" varchar,
  	"_status" "enum_homepage_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "homepage_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_homepage_v_version_quick_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"icon" "enum__homepage_v_version_quick_links_icon" DEFAULT 'link',
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_homepage_v_version_intro_pillars" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_homepage_v_version_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__homepage_v_version_sections_type",
  	"enabled" boolean DEFAULT true,
  	"limit" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_homepage_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_eyebrow" varchar,
  	"version_hero_title" varchar,
  	"version_hero_description" varchar,
  	"version_hero_image_id" integer,
  	"version_hero_image_mobile_id" integer,
  	"version_hero_primary_label" varchar DEFAULT 'Kenali KPS',
  	"version_hero_primary_href" varchar,
  	"version_hero_secondary_label" varchar DEFAULT 'Informasi Pendaftaran',
  	"version_hero_secondary_href" varchar,
  	"version_hero_show_live_clock" boolean DEFAULT true,
  	"version_intro_eyebrow" varchar DEFAULT 'Mengenal',
  	"version_intro_heading" varchar DEFAULT 'Mengenal SMP Nasional KPS',
  	"version_intro_text" varchar,
  	"version_intro_intro_image_id" integer,
  	"version_texts_programs_eyebrow" varchar DEFAULT 'Pembelajaran',
  	"version_texts_programs_heading" varchar DEFAULT 'Belajar dengan Makna',
  	"version_texts_programs_intro" varchar,
  	"version_texts_student_life_eyebrow" varchar DEFAULT 'Kehidupan Siswa',
  	"version_texts_achievements_eyebrow" varchar DEFAULT 'Prestasi',
  	"version_texts_achievements_text" varchar,
  	"version_texts_info_eyebrow" varchar DEFAULT 'Informasi',
  	"version_texts_news_eyebrow" varchar DEFAULT 'Berita Sekolah',
  	"version_texts_community_eyebrow" varchar DEFAULT 'Komunitas',
  	"version_texts_alumni_title" varchar DEFAULT 'Jejaring Alumni',
  	"version_texts_alumni_text" varchar,
  	"version_texts_cta_eyebrow" varchar DEFAULT 'Pendaftaran Siswa Baru',
  	"version_texts_student_life_heading" varchar DEFAULT 'Ruang untuk Setiap Potensi',
  	"version_texts_achievements_heading" varchar DEFAULT 'Semangat untuk Berprestasi',
  	"version_texts_news_heading" varchar DEFAULT 'Cerita dari KPS',
  	"version_texts_community_heading" varchar DEFAULT 'Terhubung dalam Keluarga KPS',
  	"version_texts_community_text" varchar,
  	"version_texts_community_image_id" integer,
  	"version_texts_achievements_album_id" integer,
  	"version_texts_cta_heading" varchar DEFAULT 'Mari Mengenal KPS Lebih Dekat',
  	"version_texts_cta_text" varchar,
  	"version__status" "enum__homepage_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_homepage_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "site_settings_socials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_site_settings_socials_platform" NOT NULL,
  	"handle" varchar,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"school_name" varchar DEFAULT 'SMP Nasional KPS' NOT NULL,
  	"city" varchar DEFAULT 'Balikpapan',
  	"logo_id" integer,
  	"values_line" varchar DEFAULT 'Berakhlak Mulia, Berwawasan Lingkungan, dan Berbudaya Nasional',
  	"short_profile" varchar,
  	"address" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"fax" varchar,
  	"whatsapp" varchar,
  	"service_hours" varchar,
  	"map_url" varchar,
  	"contact_verified" boolean DEFAULT false,
  	"portal_url" varchar,
  	"alumni_url" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_site_settings_v_version_socials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" "enum__site_settings_v_version_socials_platform" NOT NULL,
  	"handle" varchar,
  	"url" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_site_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_school_name" varchar DEFAULT 'SMP Nasional KPS' NOT NULL,
  	"version_city" varchar DEFAULT 'Balikpapan',
  	"version_logo_id" integer,
  	"version_values_line" varchar DEFAULT 'Berakhlak Mulia, Berwawasan Lingkungan, dan Berbudaya Nasional',
  	"version_short_profile" varchar,
  	"version_address" varchar,
  	"version_email" varchar,
  	"version_phone" varchar,
  	"version_fax" varchar,
  	"version_whatsapp" varchar,
  	"version_service_hours" varchar,
  	"version_map_url" varchar,
  	"version_contact_verified" boolean DEFAULT false,
  	"version_portal_url" varchar,
  	"version_alumni_url" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "navigation_header_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "navigation_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_footer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_navigation_v_version_header_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navigation_v_version_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navigation_v_version_footer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navigation_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text" ADD CONSTRAINT "pages_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text" ADD CONSTRAINT "pages_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_values_items" ADD CONSTRAINT "pages_blocks_values_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_values" ADD CONSTRAINT "pages_blocks_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta" ADD CONSTRAINT "pages_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text" ADD CONSTRAINT "_pages_v_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text" ADD CONSTRAINT "_pages_v_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_values_items" ADD CONSTRAINT "_pages_v_blocks_values_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_values" ADD CONSTRAINT "_pages_v_blocks_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta" ADD CONSTRAINT "_pages_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements_audience" ADD CONSTRAINT "announcements_audience_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements" ADD CONSTRAINT "announcements_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "announcements" ADD CONSTRAINT "announcements_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "announcements_rels" ADD CONSTRAINT "announcements_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements_rels" ADD CONSTRAINT "announcements_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_announcements_v_version_audience" ADD CONSTRAINT "_announcements_v_version_audience_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_announcements_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_announcements_v" ADD CONSTRAINT "_announcements_v_parent_id_announcements_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."announcements"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_announcements_v" ADD CONSTRAINT "_announcements_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_announcements_v" ADD CONSTRAINT "_announcements_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_announcements_v" ADD CONSTRAINT "_announcements_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_announcements_v_rels" ADD CONSTRAINT "_announcements_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_announcements_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_announcements_v_rels" ADD CONSTRAINT "_announcements_v_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "albums_items" ADD CONSTRAINT "albums_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "albums_items" ADD CONSTRAINT "albums_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "albums" ADD CONSTRAINT "albums_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "albums" ADD CONSTRAINT "albums_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "albums" ADD CONSTRAINT "albums_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_albums_v_version_items" ADD CONSTRAINT "_albums_v_version_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_albums_v_version_items" ADD CONSTRAINT "_albums_v_version_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_albums_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_albums_v" ADD CONSTRAINT "_albums_v_parent_id_albums_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."albums"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_albums_v" ADD CONSTRAINT "_albums_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_albums_v" ADD CONSTRAINT "_albums_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_albums_v" ADD CONSTRAINT "_albums_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_parent_id_documents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guides_steps" ADD CONSTRAINT "guides_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guides" ADD CONSTRAINT "guides_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guides" ADD CONSTRAINT "guides_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guides_rels" ADD CONSTRAINT "guides_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guides_rels" ADD CONSTRAINT "guides_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v_version_steps" ADD CONSTRAINT "_guides_v_version_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v" ADD CONSTRAINT "_guides_v_parent_id_guides_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guides_v" ADD CONSTRAINT "_guides_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guides_v" ADD CONSTRAINT "_guides_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guides_v_rels" ADD CONSTRAINT "_guides_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v_rels" ADD CONSTRAINT "_guides_v_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services" ADD CONSTRAINT "services_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services" ADD CONSTRAINT "services_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_parent_id_services_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_parent_id_testimonials_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "programs_benefits" ADD CONSTRAINT "programs_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "programs" ADD CONSTRAINT "programs_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "programs" ADD CONSTRAINT "programs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "programs" ADD CONSTRAINT "programs_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "programs_rels" ADD CONSTRAINT "programs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "programs_rels" ADD CONSTRAINT "programs_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_programs_v_version_benefits" ADD CONSTRAINT "_programs_v_version_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_programs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_programs_v" ADD CONSTRAINT "_programs_v_parent_id_programs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_programs_v" ADD CONSTRAINT "_programs_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_programs_v" ADD CONSTRAINT "_programs_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_programs_v" ADD CONSTRAINT "_programs_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_programs_v_rels" ADD CONSTRAINT "_programs_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_programs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_programs_v_rels" ADD CONSTRAINT "_programs_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "extracurriculars" ADD CONSTRAINT "extracurriculars_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "extracurriculars" ADD CONSTRAINT "extracurriculars_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "extracurriculars" ADD CONSTRAINT "extracurriculars_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "extracurriculars_rels" ADD CONSTRAINT "extracurriculars_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."extracurriculars"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "extracurriculars_rels" ADD CONSTRAINT "extracurriculars_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_extracurriculars_v" ADD CONSTRAINT "_extracurriculars_v_parent_id_extracurriculars_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."extracurriculars"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_extracurriculars_v" ADD CONSTRAINT "_extracurriculars_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_extracurriculars_v" ADD CONSTRAINT "_extracurriculars_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_extracurriculars_v" ADD CONSTRAINT "_extracurriculars_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_extracurriculars_v_rels" ADD CONSTRAINT "_extracurriculars_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_extracurriculars_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_extracurriculars_v_rels" ADD CONSTRAINT "_extracurriculars_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "facilities" ADD CONSTRAINT "facilities_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "facilities" ADD CONSTRAINT "facilities_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "facilities" ADD CONSTRAINT "facilities_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "facilities_rels" ADD CONSTRAINT "facilities_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "facilities_rels" ADD CONSTRAINT "facilities_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_facilities_v" ADD CONSTRAINT "_facilities_v_parent_id_facilities_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_facilities_v" ADD CONSTRAINT "_facilities_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_facilities_v" ADD CONSTRAINT "_facilities_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_facilities_v" ADD CONSTRAINT "_facilities_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_facilities_v_rels" ADD CONSTRAINT "_facilities_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_facilities_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_facilities_v_rels" ADD CONSTRAINT "_facilities_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "staff" ADD CONSTRAINT "staff_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "staff" ADD CONSTRAINT "staff_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "staff" ADD CONSTRAINT "staff_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_staff_v" ADD CONSTRAINT "_staff_v_parent_id_staff_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_staff_v" ADD CONSTRAINT "_staff_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_staff_v" ADD CONSTRAINT "_staff_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_staff_v" ADD CONSTRAINT "_staff_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievements" ADD CONSTRAINT "achievements_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievements" ADD CONSTRAINT "achievements_proof_id_private_files_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."private_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievements" ADD CONSTRAINT "achievements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievements" ADD CONSTRAINT "achievements_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievements_rels" ADD CONSTRAINT "achievements_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements_rels" ADD CONSTRAINT "achievements_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievements_v" ADD CONSTRAINT "_achievements_v_parent_id_achievements_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."achievements"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievements_v" ADD CONSTRAINT "_achievements_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievements_v" ADD CONSTRAINT "_achievements_v_version_proof_id_private_files_id_fk" FOREIGN KEY ("version_proof_id") REFERENCES "public"."private_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievements_v" ADD CONSTRAINT "_achievements_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievements_v" ADD CONSTRAINT "_achievements_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievements_v_rels" ADD CONSTRAINT "_achievements_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_achievements_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievements_v_rels" ADD CONSTRAINT "_achievements_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admissions_cycles_waves" ADD CONSTRAINT "admissions_cycles_waves_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admissions_cycles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admissions_cycles_steps" ADD CONSTRAINT "admissions_cycles_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admissions_cycles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admissions_cycles_requirements" ADD CONSTRAINT "admissions_cycles_requirements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admissions_cycles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admissions_cycles_faqs" ADD CONSTRAINT "admissions_cycles_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admissions_cycles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admissions_cycles" ADD CONSTRAINT "admissions_cycles_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "admissions_cycles" ADD CONSTRAINT "admissions_cycles_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_admissions_cycles_v_version_waves" ADD CONSTRAINT "_admissions_cycles_v_version_waves_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_admissions_cycles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_admissions_cycles_v_version_steps" ADD CONSTRAINT "_admissions_cycles_v_version_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_admissions_cycles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_admissions_cycles_v_version_requirements" ADD CONSTRAINT "_admissions_cycles_v_version_requirements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_admissions_cycles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_admissions_cycles_v_version_faqs" ADD CONSTRAINT "_admissions_cycles_v_version_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_admissions_cycles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_admissions_cycles_v" ADD CONSTRAINT "_admissions_cycles_v_parent_id_admissions_cycles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admissions_cycles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_admissions_cycles_v" ADD CONSTRAINT "_admissions_cycles_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_admissions_cycles_v" ADD CONSTRAINT "_admissions_cycles_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_announcements_fk" FOREIGN KEY ("announcements_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_albums_fk" FOREIGN KEY ("albums_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_guides_fk" FOREIGN KEY ("guides_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_programs_fk" FOREIGN KEY ("programs_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_extracurriculars_fk" FOREIGN KEY ("extracurriculars_id") REFERENCES "public"."extracurriculars"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_facilities_fk" FOREIGN KEY ("facilities_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_staff_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_achievements_fk" FOREIGN KEY ("achievements_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admissions_cycles_fk" FOREIGN KEY ("admissions_cycles_id") REFERENCES "public"."admissions_cycles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_messages_fk" FOREIGN KEY ("contact_messages_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_private_files_fk" FOREIGN KEY ("private_files_id") REFERENCES "public"."private_files"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage_quick_links" ADD CONSTRAINT "homepage_quick_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage_intro_pillars" ADD CONSTRAINT "homepage_intro_pillars_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage_sections" ADD CONSTRAINT "homepage_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage" ADD CONSTRAINT "homepage_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "homepage" ADD CONSTRAINT "homepage_hero_image_mobile_id_media_id_fk" FOREIGN KEY ("hero_image_mobile_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "homepage" ADD CONSTRAINT "homepage_intro_intro_image_id_media_id_fk" FOREIGN KEY ("intro_intro_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "homepage" ADD CONSTRAINT "homepage_texts_community_image_id_media_id_fk" FOREIGN KEY ("texts_community_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "homepage" ADD CONSTRAINT "homepage_texts_achievements_album_id_albums_id_fk" FOREIGN KEY ("texts_achievements_album_id") REFERENCES "public"."albums"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "homepage_rels" ADD CONSTRAINT "homepage_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage_rels" ADD CONSTRAINT "homepage_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_homepage_v_version_quick_links" ADD CONSTRAINT "_homepage_v_version_quick_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_homepage_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_homepage_v_version_intro_pillars" ADD CONSTRAINT "_homepage_v_version_intro_pillars_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_homepage_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_homepage_v_version_sections" ADD CONSTRAINT "_homepage_v_version_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_homepage_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_homepage_v" ADD CONSTRAINT "_homepage_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_homepage_v" ADD CONSTRAINT "_homepage_v_version_hero_image_mobile_id_media_id_fk" FOREIGN KEY ("version_hero_image_mobile_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_homepage_v" ADD CONSTRAINT "_homepage_v_version_intro_intro_image_id_media_id_fk" FOREIGN KEY ("version_intro_intro_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_homepage_v" ADD CONSTRAINT "_homepage_v_version_texts_community_image_id_media_id_fk" FOREIGN KEY ("version_texts_community_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_homepage_v" ADD CONSTRAINT "_homepage_v_version_texts_achievements_album_id_albums_id_fk" FOREIGN KEY ("version_texts_achievements_album_id") REFERENCES "public"."albums"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_homepage_v_rels" ADD CONSTRAINT "_homepage_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_homepage_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_homepage_v_rels" ADD CONSTRAINT "_homepage_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_socials" ADD CONSTRAINT "site_settings_socials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v_version_socials" ADD CONSTRAINT "_site_settings_v_version_socials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_header_children" ADD CONSTRAINT "navigation_header_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_header" ADD CONSTRAINT "navigation_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer" ADD CONSTRAINT "navigation_footer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_header_children" ADD CONSTRAINT "_navigation_v_version_header_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_header" ADD CONSTRAINT "_navigation_v_version_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_footer" ADD CONSTRAINT "_navigation_v_version_footer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_text_order_idx" ON "pages_blocks_image_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_text_parent_id_idx" ON "pages_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_text_path_idx" ON "pages_blocks_image_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_text_image_idx" ON "pages_blocks_image_text" USING btree ("image_id");
  CREATE INDEX "pages_blocks_values_items_order_idx" ON "pages_blocks_values_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_values_items_parent_id_idx" ON "pages_blocks_values_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_values_order_idx" ON "pages_blocks_values" USING btree ("_order");
  CREATE INDEX "pages_blocks_values_parent_id_idx" ON "pages_blocks_values" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_values_path_idx" ON "pages_blocks_values" USING btree ("_path");
  CREATE INDEX "pages_blocks_cta_order_idx" ON "pages_blocks_cta" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_parent_id_idx" ON "pages_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_path_idx" ON "pages_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_cover_idx" ON "pages" USING btree ("cover_id");
  CREATE INDEX "pages_workflow_status_idx" ON "pages" USING btree ("workflow_status");
  CREATE INDEX "pages_is_demo_idx" ON "pages" USING btree ("is_demo");
  CREATE INDEX "pages_created_by_idx" ON "pages" USING btree ("created_by_id");
  CREATE INDEX "pages_updated_by_idx" ON "pages" USING btree ("updated_by_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages_deleted_at_idx" ON "pages" USING btree ("deleted_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_text_order_idx" ON "_pages_v_blocks_image_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_image_text_parent_id_idx" ON "_pages_v_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_image_text_path_idx" ON "_pages_v_blocks_image_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_text_image_idx" ON "_pages_v_blocks_image_text" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_values_items_order_idx" ON "_pages_v_blocks_values_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_values_items_parent_id_idx" ON "_pages_v_blocks_values_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_values_order_idx" ON "_pages_v_blocks_values" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_values_parent_id_idx" ON "_pages_v_blocks_values" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_values_path_idx" ON "_pages_v_blocks_values" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_cta_order_idx" ON "_pages_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_parent_id_idx" ON "_pages_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_path_idx" ON "_pages_v_blocks_cta" USING btree ("_path");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_cover_idx" ON "_pages_v" USING btree ("version_cover_id");
  CREATE INDEX "_pages_v_version_version_workflow_status_idx" ON "_pages_v" USING btree ("version_workflow_status");
  CREATE INDEX "_pages_v_version_version_is_demo_idx" ON "_pages_v" USING btree ("version_is_demo");
  CREATE INDEX "_pages_v_version_version_created_by_idx" ON "_pages_v" USING btree ("version_created_by_id");
  CREATE INDEX "_pages_v_version_version_updated_by_idx" ON "_pages_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version_deleted_at_idx" ON "_pages_v" USING btree ("version_deleted_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_cover_idx" ON "posts" USING btree ("cover_id");
  CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at");
  CREATE INDEX "posts_workflow_status_idx" ON "posts" USING btree ("workflow_status");
  CREATE INDEX "posts_is_demo_idx" ON "posts" USING btree ("is_demo");
  CREATE INDEX "posts_created_by_idx" ON "posts" USING btree ("created_by_id");
  CREATE INDEX "posts_updated_by_idx" ON "posts" USING btree ("updated_by_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts_deleted_at_idx" ON "posts" USING btree ("deleted_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "posts_rels_order_idx" ON "posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_media_id_idx" ON "posts_rels" USING btree ("media_id");
  CREATE INDEX "posts_rels_categories_id_idx" ON "posts_rels" USING btree ("categories_id");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_cover_idx" ON "_posts_v" USING btree ("version_cover_id");
  CREATE INDEX "_posts_v_version_version_published_at_idx" ON "_posts_v" USING btree ("version_published_at");
  CREATE INDEX "_posts_v_version_version_workflow_status_idx" ON "_posts_v" USING btree ("version_workflow_status");
  CREATE INDEX "_posts_v_version_version_is_demo_idx" ON "_posts_v" USING btree ("version_is_demo");
  CREATE INDEX "_posts_v_version_version_created_by_idx" ON "_posts_v" USING btree ("version_created_by_id");
  CREATE INDEX "_posts_v_version_version_updated_by_idx" ON "_posts_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version_deleted_at_idx" ON "_posts_v" USING btree ("version_deleted_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_rels_order_idx" ON "_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_media_id_idx" ON "_posts_v_rels" USING btree ("media_id");
  CREATE INDEX "_posts_v_rels_categories_id_idx" ON "_posts_v_rels" USING btree ("categories_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE INDEX "announcements_audience_order_idx" ON "announcements_audience" USING btree ("order");
  CREATE INDEX "announcements_audience_parent_idx" ON "announcements_audience" USING btree ("parent_id");
  CREATE UNIQUE INDEX "announcements_slug_idx" ON "announcements" USING btree ("slug");
  CREATE INDEX "announcements_priority_idx" ON "announcements" USING btree ("priority");
  CREATE INDEX "announcements_display_start_idx" ON "announcements" USING btree ("display_start");
  CREATE INDEX "announcements_display_end_idx" ON "announcements" USING btree ("display_end");
  CREATE INDEX "announcements_cover_idx" ON "announcements" USING btree ("cover_id");
  CREATE INDEX "announcements_workflow_status_idx" ON "announcements" USING btree ("workflow_status");
  CREATE INDEX "announcements_is_demo_idx" ON "announcements" USING btree ("is_demo");
  CREATE INDEX "announcements_created_by_idx" ON "announcements" USING btree ("created_by_id");
  CREATE INDEX "announcements_updated_by_idx" ON "announcements" USING btree ("updated_by_id");
  CREATE INDEX "announcements_updated_at_idx" ON "announcements" USING btree ("updated_at");
  CREATE INDEX "announcements_created_at_idx" ON "announcements" USING btree ("created_at");
  CREATE INDEX "announcements_deleted_at_idx" ON "announcements" USING btree ("deleted_at");
  CREATE INDEX "announcements__status_idx" ON "announcements" USING btree ("_status");
  CREATE INDEX "announcements_rels_order_idx" ON "announcements_rels" USING btree ("order");
  CREATE INDEX "announcements_rels_parent_idx" ON "announcements_rels" USING btree ("parent_id");
  CREATE INDEX "announcements_rels_path_idx" ON "announcements_rels" USING btree ("path");
  CREATE INDEX "announcements_rels_documents_id_idx" ON "announcements_rels" USING btree ("documents_id");
  CREATE INDEX "_announcements_v_version_audience_order_idx" ON "_announcements_v_version_audience" USING btree ("order");
  CREATE INDEX "_announcements_v_version_audience_parent_idx" ON "_announcements_v_version_audience" USING btree ("parent_id");
  CREATE INDEX "_announcements_v_parent_idx" ON "_announcements_v" USING btree ("parent_id");
  CREATE INDEX "_announcements_v_version_version_slug_idx" ON "_announcements_v" USING btree ("version_slug");
  CREATE INDEX "_announcements_v_version_version_priority_idx" ON "_announcements_v" USING btree ("version_priority");
  CREATE INDEX "_announcements_v_version_version_display_start_idx" ON "_announcements_v" USING btree ("version_display_start");
  CREATE INDEX "_announcements_v_version_version_display_end_idx" ON "_announcements_v" USING btree ("version_display_end");
  CREATE INDEX "_announcements_v_version_version_cover_idx" ON "_announcements_v" USING btree ("version_cover_id");
  CREATE INDEX "_announcements_v_version_version_workflow_status_idx" ON "_announcements_v" USING btree ("version_workflow_status");
  CREATE INDEX "_announcements_v_version_version_is_demo_idx" ON "_announcements_v" USING btree ("version_is_demo");
  CREATE INDEX "_announcements_v_version_version_created_by_idx" ON "_announcements_v" USING btree ("version_created_by_id");
  CREATE INDEX "_announcements_v_version_version_updated_by_idx" ON "_announcements_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_announcements_v_version_version_updated_at_idx" ON "_announcements_v" USING btree ("version_updated_at");
  CREATE INDEX "_announcements_v_version_version_created_at_idx" ON "_announcements_v" USING btree ("version_created_at");
  CREATE INDEX "_announcements_v_version_version_deleted_at_idx" ON "_announcements_v" USING btree ("version_deleted_at");
  CREATE INDEX "_announcements_v_version_version__status_idx" ON "_announcements_v" USING btree ("version__status");
  CREATE INDEX "_announcements_v_created_at_idx" ON "_announcements_v" USING btree ("created_at");
  CREATE INDEX "_announcements_v_updated_at_idx" ON "_announcements_v" USING btree ("updated_at");
  CREATE INDEX "_announcements_v_latest_idx" ON "_announcements_v" USING btree ("latest");
  CREATE INDEX "_announcements_v_rels_order_idx" ON "_announcements_v_rels" USING btree ("order");
  CREATE INDEX "_announcements_v_rels_parent_idx" ON "_announcements_v_rels" USING btree ("parent_id");
  CREATE INDEX "_announcements_v_rels_path_idx" ON "_announcements_v_rels" USING btree ("path");
  CREATE INDEX "_announcements_v_rels_documents_id_idx" ON "_announcements_v_rels" USING btree ("documents_id");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_start_at_idx" ON "events" USING btree ("start_at");
  CREATE INDEX "events_cover_idx" ON "events" USING btree ("cover_id");
  CREATE INDEX "events_workflow_status_idx" ON "events" USING btree ("workflow_status");
  CREATE INDEX "events_is_demo_idx" ON "events" USING btree ("is_demo");
  CREATE INDEX "events_created_by_idx" ON "events" USING btree ("created_by_id");
  CREATE INDEX "events_updated_by_idx" ON "events" USING btree ("updated_by_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events_deleted_at_idx" ON "events" USING btree ("deleted_at");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_start_at_idx" ON "_events_v" USING btree ("version_start_at");
  CREATE INDEX "_events_v_version_version_cover_idx" ON "_events_v" USING btree ("version_cover_id");
  CREATE INDEX "_events_v_version_version_workflow_status_idx" ON "_events_v" USING btree ("version_workflow_status");
  CREATE INDEX "_events_v_version_version_is_demo_idx" ON "_events_v" USING btree ("version_is_demo");
  CREATE INDEX "_events_v_version_version_created_by_idx" ON "_events_v" USING btree ("version_created_by_id");
  CREATE INDEX "_events_v_version_version_updated_by_idx" ON "_events_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version_deleted_at_idx" ON "_events_v" USING btree ("version_deleted_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");
  CREATE INDEX "albums_items_order_idx" ON "albums_items" USING btree ("_order");
  CREATE INDEX "albums_items_parent_id_idx" ON "albums_items" USING btree ("_parent_id");
  CREATE INDEX "albums_items_media_idx" ON "albums_items" USING btree ("media_id");
  CREATE UNIQUE INDEX "albums_slug_idx" ON "albums" USING btree ("slug");
  CREATE INDEX "albums_event_date_idx" ON "albums" USING btree ("event_date");
  CREATE INDEX "albums_cover_idx" ON "albums" USING btree ("cover_id");
  CREATE INDEX "albums_workflow_status_idx" ON "albums" USING btree ("workflow_status");
  CREATE INDEX "albums_is_demo_idx" ON "albums" USING btree ("is_demo");
  CREATE INDEX "albums_created_by_idx" ON "albums" USING btree ("created_by_id");
  CREATE INDEX "albums_updated_by_idx" ON "albums" USING btree ("updated_by_id");
  CREATE INDEX "albums_updated_at_idx" ON "albums" USING btree ("updated_at");
  CREATE INDEX "albums_created_at_idx" ON "albums" USING btree ("created_at");
  CREATE INDEX "albums_deleted_at_idx" ON "albums" USING btree ("deleted_at");
  CREATE INDEX "albums__status_idx" ON "albums" USING btree ("_status");
  CREATE INDEX "_albums_v_version_items_order_idx" ON "_albums_v_version_items" USING btree ("_order");
  CREATE INDEX "_albums_v_version_items_parent_id_idx" ON "_albums_v_version_items" USING btree ("_parent_id");
  CREATE INDEX "_albums_v_version_items_media_idx" ON "_albums_v_version_items" USING btree ("media_id");
  CREATE INDEX "_albums_v_parent_idx" ON "_albums_v" USING btree ("parent_id");
  CREATE INDEX "_albums_v_version_version_slug_idx" ON "_albums_v" USING btree ("version_slug");
  CREATE INDEX "_albums_v_version_version_event_date_idx" ON "_albums_v" USING btree ("version_event_date");
  CREATE INDEX "_albums_v_version_version_cover_idx" ON "_albums_v" USING btree ("version_cover_id");
  CREATE INDEX "_albums_v_version_version_workflow_status_idx" ON "_albums_v" USING btree ("version_workflow_status");
  CREATE INDEX "_albums_v_version_version_is_demo_idx" ON "_albums_v" USING btree ("version_is_demo");
  CREATE INDEX "_albums_v_version_version_created_by_idx" ON "_albums_v" USING btree ("version_created_by_id");
  CREATE INDEX "_albums_v_version_version_updated_by_idx" ON "_albums_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_albums_v_version_version_updated_at_idx" ON "_albums_v" USING btree ("version_updated_at");
  CREATE INDEX "_albums_v_version_version_created_at_idx" ON "_albums_v" USING btree ("version_created_at");
  CREATE INDEX "_albums_v_version_version_deleted_at_idx" ON "_albums_v" USING btree ("version_deleted_at");
  CREATE INDEX "_albums_v_version_version__status_idx" ON "_albums_v" USING btree ("version__status");
  CREATE INDEX "_albums_v_created_at_idx" ON "_albums_v" USING btree ("created_at");
  CREATE INDEX "_albums_v_updated_at_idx" ON "_albums_v" USING btree ("updated_at");
  CREATE INDEX "_albums_v_latest_idx" ON "_albums_v" USING btree ("latest");
  CREATE INDEX "documents_category_idx" ON "documents" USING btree ("category");
  CREATE INDEX "documents_period_idx" ON "documents" USING btree ("period");
  CREATE INDEX "documents_workflow_status_idx" ON "documents" USING btree ("workflow_status");
  CREATE INDEX "documents_is_demo_idx" ON "documents" USING btree ("is_demo");
  CREATE INDEX "documents_created_by_idx" ON "documents" USING btree ("created_by_id");
  CREATE INDEX "documents_updated_by_idx" ON "documents" USING btree ("updated_by_id");
  CREATE INDEX "documents_updated_at_idx" ON "documents" USING btree ("updated_at");
  CREATE INDEX "documents_created_at_idx" ON "documents" USING btree ("created_at");
  CREATE INDEX "documents_deleted_at_idx" ON "documents" USING btree ("deleted_at");
  CREATE INDEX "documents__status_idx" ON "documents" USING btree ("_status");
  CREATE UNIQUE INDEX "documents_filename_idx" ON "documents" USING btree ("filename");
  CREATE INDEX "_documents_v_parent_idx" ON "_documents_v" USING btree ("parent_id");
  CREATE INDEX "_documents_v_version_version_category_idx" ON "_documents_v" USING btree ("version_category");
  CREATE INDEX "_documents_v_version_version_period_idx" ON "_documents_v" USING btree ("version_period");
  CREATE INDEX "_documents_v_version_version_workflow_status_idx" ON "_documents_v" USING btree ("version_workflow_status");
  CREATE INDEX "_documents_v_version_version_is_demo_idx" ON "_documents_v" USING btree ("version_is_demo");
  CREATE INDEX "_documents_v_version_version_created_by_idx" ON "_documents_v" USING btree ("version_created_by_id");
  CREATE INDEX "_documents_v_version_version_updated_by_idx" ON "_documents_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_documents_v_version_version_updated_at_idx" ON "_documents_v" USING btree ("version_updated_at");
  CREATE INDEX "_documents_v_version_version_created_at_idx" ON "_documents_v" USING btree ("version_created_at");
  CREATE INDEX "_documents_v_version_version_deleted_at_idx" ON "_documents_v" USING btree ("version_deleted_at");
  CREATE INDEX "_documents_v_version_version__status_idx" ON "_documents_v" USING btree ("version__status");
  CREATE INDEX "_documents_v_version_version_filename_idx" ON "_documents_v" USING btree ("version_filename");
  CREATE INDEX "_documents_v_created_at_idx" ON "_documents_v" USING btree ("created_at");
  CREATE INDEX "_documents_v_updated_at_idx" ON "_documents_v" USING btree ("updated_at");
  CREATE INDEX "_documents_v_latest_idx" ON "_documents_v" USING btree ("latest");
  CREATE INDEX "guides_steps_order_idx" ON "guides_steps" USING btree ("_order");
  CREATE INDEX "guides_steps_parent_id_idx" ON "guides_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "guides_slug_idx" ON "guides" USING btree ("slug");
  CREATE INDEX "guides_workflow_status_idx" ON "guides" USING btree ("workflow_status");
  CREATE INDEX "guides_is_demo_idx" ON "guides" USING btree ("is_demo");
  CREATE INDEX "guides_created_by_idx" ON "guides" USING btree ("created_by_id");
  CREATE INDEX "guides_updated_by_idx" ON "guides" USING btree ("updated_by_id");
  CREATE INDEX "guides_updated_at_idx" ON "guides" USING btree ("updated_at");
  CREATE INDEX "guides_created_at_idx" ON "guides" USING btree ("created_at");
  CREATE INDEX "guides_deleted_at_idx" ON "guides" USING btree ("deleted_at");
  CREATE INDEX "guides__status_idx" ON "guides" USING btree ("_status");
  CREATE INDEX "guides_rels_order_idx" ON "guides_rels" USING btree ("order");
  CREATE INDEX "guides_rels_parent_idx" ON "guides_rels" USING btree ("parent_id");
  CREATE INDEX "guides_rels_path_idx" ON "guides_rels" USING btree ("path");
  CREATE INDEX "guides_rels_documents_id_idx" ON "guides_rels" USING btree ("documents_id");
  CREATE INDEX "_guides_v_version_steps_order_idx" ON "_guides_v_version_steps" USING btree ("_order");
  CREATE INDEX "_guides_v_version_steps_parent_id_idx" ON "_guides_v_version_steps" USING btree ("_parent_id");
  CREATE INDEX "_guides_v_parent_idx" ON "_guides_v" USING btree ("parent_id");
  CREATE INDEX "_guides_v_version_version_slug_idx" ON "_guides_v" USING btree ("version_slug");
  CREATE INDEX "_guides_v_version_version_workflow_status_idx" ON "_guides_v" USING btree ("version_workflow_status");
  CREATE INDEX "_guides_v_version_version_is_demo_idx" ON "_guides_v" USING btree ("version_is_demo");
  CREATE INDEX "_guides_v_version_version_created_by_idx" ON "_guides_v" USING btree ("version_created_by_id");
  CREATE INDEX "_guides_v_version_version_updated_by_idx" ON "_guides_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_guides_v_version_version_updated_at_idx" ON "_guides_v" USING btree ("version_updated_at");
  CREATE INDEX "_guides_v_version_version_created_at_idx" ON "_guides_v" USING btree ("version_created_at");
  CREATE INDEX "_guides_v_version_version_deleted_at_idx" ON "_guides_v" USING btree ("version_deleted_at");
  CREATE INDEX "_guides_v_version_version__status_idx" ON "_guides_v" USING btree ("version__status");
  CREATE INDEX "_guides_v_created_at_idx" ON "_guides_v" USING btree ("created_at");
  CREATE INDEX "_guides_v_updated_at_idx" ON "_guides_v" USING btree ("updated_at");
  CREATE INDEX "_guides_v_latest_idx" ON "_guides_v" USING btree ("latest");
  CREATE INDEX "_guides_v_rels_order_idx" ON "_guides_v_rels" USING btree ("order");
  CREATE INDEX "_guides_v_rels_parent_idx" ON "_guides_v_rels" USING btree ("parent_id");
  CREATE INDEX "_guides_v_rels_path_idx" ON "_guides_v_rels" USING btree ("path");
  CREATE INDEX "_guides_v_rels_documents_id_idx" ON "_guides_v_rels" USING btree ("documents_id");
  CREATE UNIQUE INDEX "services_slug_idx" ON "services" USING btree ("slug");
  CREATE INDEX "services_workflow_status_idx" ON "services" USING btree ("workflow_status");
  CREATE INDEX "services_is_demo_idx" ON "services" USING btree ("is_demo");
  CREATE INDEX "services_created_by_idx" ON "services" USING btree ("created_by_id");
  CREATE INDEX "services_updated_by_idx" ON "services" USING btree ("updated_by_id");
  CREATE INDEX "services_updated_at_idx" ON "services" USING btree ("updated_at");
  CREATE INDEX "services_created_at_idx" ON "services" USING btree ("created_at");
  CREATE INDEX "services_deleted_at_idx" ON "services" USING btree ("deleted_at");
  CREATE INDEX "services__status_idx" ON "services" USING btree ("_status");
  CREATE INDEX "_services_v_parent_idx" ON "_services_v" USING btree ("parent_id");
  CREATE INDEX "_services_v_version_version_slug_idx" ON "_services_v" USING btree ("version_slug");
  CREATE INDEX "_services_v_version_version_workflow_status_idx" ON "_services_v" USING btree ("version_workflow_status");
  CREATE INDEX "_services_v_version_version_is_demo_idx" ON "_services_v" USING btree ("version_is_demo");
  CREATE INDEX "_services_v_version_version_created_by_idx" ON "_services_v" USING btree ("version_created_by_id");
  CREATE INDEX "_services_v_version_version_updated_by_idx" ON "_services_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_services_v_version_version_updated_at_idx" ON "_services_v" USING btree ("version_updated_at");
  CREATE INDEX "_services_v_version_version_created_at_idx" ON "_services_v" USING btree ("version_created_at");
  CREATE INDEX "_services_v_version_version_deleted_at_idx" ON "_services_v" USING btree ("version_deleted_at");
  CREATE INDEX "_services_v_version_version__status_idx" ON "_services_v" USING btree ("version__status");
  CREATE INDEX "_services_v_created_at_idx" ON "_services_v" USING btree ("created_at");
  CREATE INDEX "_services_v_updated_at_idx" ON "_services_v" USING btree ("updated_at");
  CREATE INDEX "_services_v_latest_idx" ON "_services_v" USING btree ("latest");
  CREATE UNIQUE INDEX "testimonials_slug_idx" ON "testimonials" USING btree ("slug");
  CREATE INDEX "testimonials_photo_idx" ON "testimonials" USING btree ("photo_id");
  CREATE INDEX "testimonials_workflow_status_idx" ON "testimonials" USING btree ("workflow_status");
  CREATE INDEX "testimonials_is_demo_idx" ON "testimonials" USING btree ("is_demo");
  CREATE INDEX "testimonials_created_by_idx" ON "testimonials" USING btree ("created_by_id");
  CREATE INDEX "testimonials_updated_by_idx" ON "testimonials" USING btree ("updated_by_id");
  CREATE INDEX "testimonials_updated_at_idx" ON "testimonials" USING btree ("updated_at");
  CREATE INDEX "testimonials_created_at_idx" ON "testimonials" USING btree ("created_at");
  CREATE INDEX "testimonials_deleted_at_idx" ON "testimonials" USING btree ("deleted_at");
  CREATE INDEX "testimonials__status_idx" ON "testimonials" USING btree ("_status");
  CREATE INDEX "_testimonials_v_parent_idx" ON "_testimonials_v" USING btree ("parent_id");
  CREATE INDEX "_testimonials_v_version_version_slug_idx" ON "_testimonials_v" USING btree ("version_slug");
  CREATE INDEX "_testimonials_v_version_version_photo_idx" ON "_testimonials_v" USING btree ("version_photo_id");
  CREATE INDEX "_testimonials_v_version_version_workflow_status_idx" ON "_testimonials_v" USING btree ("version_workflow_status");
  CREATE INDEX "_testimonials_v_version_version_is_demo_idx" ON "_testimonials_v" USING btree ("version_is_demo");
  CREATE INDEX "_testimonials_v_version_version_created_by_idx" ON "_testimonials_v" USING btree ("version_created_by_id");
  CREATE INDEX "_testimonials_v_version_version_updated_by_idx" ON "_testimonials_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_testimonials_v_version_version_updated_at_idx" ON "_testimonials_v" USING btree ("version_updated_at");
  CREATE INDEX "_testimonials_v_version_version_created_at_idx" ON "_testimonials_v" USING btree ("version_created_at");
  CREATE INDEX "_testimonials_v_version_version_deleted_at_idx" ON "_testimonials_v" USING btree ("version_deleted_at");
  CREATE INDEX "_testimonials_v_version_version__status_idx" ON "_testimonials_v" USING btree ("version__status");
  CREATE INDEX "_testimonials_v_created_at_idx" ON "_testimonials_v" USING btree ("created_at");
  CREATE INDEX "_testimonials_v_updated_at_idx" ON "_testimonials_v" USING btree ("updated_at");
  CREATE INDEX "_testimonials_v_latest_idx" ON "_testimonials_v" USING btree ("latest");
  CREATE INDEX "programs_benefits_order_idx" ON "programs_benefits" USING btree ("_order");
  CREATE INDEX "programs_benefits_parent_id_idx" ON "programs_benefits" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "programs_slug_idx" ON "programs" USING btree ("slug");
  CREATE INDEX "programs_cover_idx" ON "programs" USING btree ("cover_id");
  CREATE INDEX "programs_featured_idx" ON "programs" USING btree ("featured");
  CREATE INDEX "programs_workflow_status_idx" ON "programs" USING btree ("workflow_status");
  CREATE INDEX "programs_is_demo_idx" ON "programs" USING btree ("is_demo");
  CREATE INDEX "programs_created_by_idx" ON "programs" USING btree ("created_by_id");
  CREATE INDEX "programs_updated_by_idx" ON "programs" USING btree ("updated_by_id");
  CREATE INDEX "programs_updated_at_idx" ON "programs" USING btree ("updated_at");
  CREATE INDEX "programs_created_at_idx" ON "programs" USING btree ("created_at");
  CREATE INDEX "programs_deleted_at_idx" ON "programs" USING btree ("deleted_at");
  CREATE INDEX "programs__status_idx" ON "programs" USING btree ("_status");
  CREATE INDEX "programs_rels_order_idx" ON "programs_rels" USING btree ("order");
  CREATE INDEX "programs_rels_parent_idx" ON "programs_rels" USING btree ("parent_id");
  CREATE INDEX "programs_rels_path_idx" ON "programs_rels" USING btree ("path");
  CREATE INDEX "programs_rels_media_id_idx" ON "programs_rels" USING btree ("media_id");
  CREATE INDEX "_programs_v_version_benefits_order_idx" ON "_programs_v_version_benefits" USING btree ("_order");
  CREATE INDEX "_programs_v_version_benefits_parent_id_idx" ON "_programs_v_version_benefits" USING btree ("_parent_id");
  CREATE INDEX "_programs_v_parent_idx" ON "_programs_v" USING btree ("parent_id");
  CREATE INDEX "_programs_v_version_version_slug_idx" ON "_programs_v" USING btree ("version_slug");
  CREATE INDEX "_programs_v_version_version_cover_idx" ON "_programs_v" USING btree ("version_cover_id");
  CREATE INDEX "_programs_v_version_version_featured_idx" ON "_programs_v" USING btree ("version_featured");
  CREATE INDEX "_programs_v_version_version_workflow_status_idx" ON "_programs_v" USING btree ("version_workflow_status");
  CREATE INDEX "_programs_v_version_version_is_demo_idx" ON "_programs_v" USING btree ("version_is_demo");
  CREATE INDEX "_programs_v_version_version_created_by_idx" ON "_programs_v" USING btree ("version_created_by_id");
  CREATE INDEX "_programs_v_version_version_updated_by_idx" ON "_programs_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_programs_v_version_version_updated_at_idx" ON "_programs_v" USING btree ("version_updated_at");
  CREATE INDEX "_programs_v_version_version_created_at_idx" ON "_programs_v" USING btree ("version_created_at");
  CREATE INDEX "_programs_v_version_version_deleted_at_idx" ON "_programs_v" USING btree ("version_deleted_at");
  CREATE INDEX "_programs_v_version_version__status_idx" ON "_programs_v" USING btree ("version__status");
  CREATE INDEX "_programs_v_created_at_idx" ON "_programs_v" USING btree ("created_at");
  CREATE INDEX "_programs_v_updated_at_idx" ON "_programs_v" USING btree ("updated_at");
  CREATE INDEX "_programs_v_latest_idx" ON "_programs_v" USING btree ("latest");
  CREATE INDEX "_programs_v_rels_order_idx" ON "_programs_v_rels" USING btree ("order");
  CREATE INDEX "_programs_v_rels_parent_idx" ON "_programs_v_rels" USING btree ("parent_id");
  CREATE INDEX "_programs_v_rels_path_idx" ON "_programs_v_rels" USING btree ("path");
  CREATE INDEX "_programs_v_rels_media_id_idx" ON "_programs_v_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "extracurriculars_slug_idx" ON "extracurriculars" USING btree ("slug");
  CREATE INDEX "extracurriculars_cover_idx" ON "extracurriculars" USING btree ("cover_id");
  CREATE INDEX "extracurriculars_featured_idx" ON "extracurriculars" USING btree ("featured");
  CREATE INDEX "extracurriculars_workflow_status_idx" ON "extracurriculars" USING btree ("workflow_status");
  CREATE INDEX "extracurriculars_is_demo_idx" ON "extracurriculars" USING btree ("is_demo");
  CREATE INDEX "extracurriculars_created_by_idx" ON "extracurriculars" USING btree ("created_by_id");
  CREATE INDEX "extracurriculars_updated_by_idx" ON "extracurriculars" USING btree ("updated_by_id");
  CREATE INDEX "extracurriculars_updated_at_idx" ON "extracurriculars" USING btree ("updated_at");
  CREATE INDEX "extracurriculars_created_at_idx" ON "extracurriculars" USING btree ("created_at");
  CREATE INDEX "extracurriculars_deleted_at_idx" ON "extracurriculars" USING btree ("deleted_at");
  CREATE INDEX "extracurriculars__status_idx" ON "extracurriculars" USING btree ("_status");
  CREATE INDEX "extracurriculars_rels_order_idx" ON "extracurriculars_rels" USING btree ("order");
  CREATE INDEX "extracurriculars_rels_parent_idx" ON "extracurriculars_rels" USING btree ("parent_id");
  CREATE INDEX "extracurriculars_rels_path_idx" ON "extracurriculars_rels" USING btree ("path");
  CREATE INDEX "extracurriculars_rels_media_id_idx" ON "extracurriculars_rels" USING btree ("media_id");
  CREATE INDEX "_extracurriculars_v_parent_idx" ON "_extracurriculars_v" USING btree ("parent_id");
  CREATE INDEX "_extracurriculars_v_version_version_slug_idx" ON "_extracurriculars_v" USING btree ("version_slug");
  CREATE INDEX "_extracurriculars_v_version_version_cover_idx" ON "_extracurriculars_v" USING btree ("version_cover_id");
  CREATE INDEX "_extracurriculars_v_version_version_featured_idx" ON "_extracurriculars_v" USING btree ("version_featured");
  CREATE INDEX "_extracurriculars_v_version_version_workflow_status_idx" ON "_extracurriculars_v" USING btree ("version_workflow_status");
  CREATE INDEX "_extracurriculars_v_version_version_is_demo_idx" ON "_extracurriculars_v" USING btree ("version_is_demo");
  CREATE INDEX "_extracurriculars_v_version_version_created_by_idx" ON "_extracurriculars_v" USING btree ("version_created_by_id");
  CREATE INDEX "_extracurriculars_v_version_version_updated_by_idx" ON "_extracurriculars_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_extracurriculars_v_version_version_updated_at_idx" ON "_extracurriculars_v" USING btree ("version_updated_at");
  CREATE INDEX "_extracurriculars_v_version_version_created_at_idx" ON "_extracurriculars_v" USING btree ("version_created_at");
  CREATE INDEX "_extracurriculars_v_version_version_deleted_at_idx" ON "_extracurriculars_v" USING btree ("version_deleted_at");
  CREATE INDEX "_extracurriculars_v_version_version__status_idx" ON "_extracurriculars_v" USING btree ("version__status");
  CREATE INDEX "_extracurriculars_v_created_at_idx" ON "_extracurriculars_v" USING btree ("created_at");
  CREATE INDEX "_extracurriculars_v_updated_at_idx" ON "_extracurriculars_v" USING btree ("updated_at");
  CREATE INDEX "_extracurriculars_v_latest_idx" ON "_extracurriculars_v" USING btree ("latest");
  CREATE INDEX "_extracurriculars_v_rels_order_idx" ON "_extracurriculars_v_rels" USING btree ("order");
  CREATE INDEX "_extracurriculars_v_rels_parent_idx" ON "_extracurriculars_v_rels" USING btree ("parent_id");
  CREATE INDEX "_extracurriculars_v_rels_path_idx" ON "_extracurriculars_v_rels" USING btree ("path");
  CREATE INDEX "_extracurriculars_v_rels_media_id_idx" ON "_extracurriculars_v_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "facilities_slug_idx" ON "facilities" USING btree ("slug");
  CREATE INDEX "facilities_cover_idx" ON "facilities" USING btree ("cover_id");
  CREATE INDEX "facilities_featured_idx" ON "facilities" USING btree ("featured");
  CREATE INDEX "facilities_workflow_status_idx" ON "facilities" USING btree ("workflow_status");
  CREATE INDEX "facilities_is_demo_idx" ON "facilities" USING btree ("is_demo");
  CREATE INDEX "facilities_created_by_idx" ON "facilities" USING btree ("created_by_id");
  CREATE INDEX "facilities_updated_by_idx" ON "facilities" USING btree ("updated_by_id");
  CREATE INDEX "facilities_updated_at_idx" ON "facilities" USING btree ("updated_at");
  CREATE INDEX "facilities_created_at_idx" ON "facilities" USING btree ("created_at");
  CREATE INDEX "facilities_deleted_at_idx" ON "facilities" USING btree ("deleted_at");
  CREATE INDEX "facilities__status_idx" ON "facilities" USING btree ("_status");
  CREATE INDEX "facilities_rels_order_idx" ON "facilities_rels" USING btree ("order");
  CREATE INDEX "facilities_rels_parent_idx" ON "facilities_rels" USING btree ("parent_id");
  CREATE INDEX "facilities_rels_path_idx" ON "facilities_rels" USING btree ("path");
  CREATE INDEX "facilities_rels_media_id_idx" ON "facilities_rels" USING btree ("media_id");
  CREATE INDEX "_facilities_v_parent_idx" ON "_facilities_v" USING btree ("parent_id");
  CREATE INDEX "_facilities_v_version_version_slug_idx" ON "_facilities_v" USING btree ("version_slug");
  CREATE INDEX "_facilities_v_version_version_cover_idx" ON "_facilities_v" USING btree ("version_cover_id");
  CREATE INDEX "_facilities_v_version_version_featured_idx" ON "_facilities_v" USING btree ("version_featured");
  CREATE INDEX "_facilities_v_version_version_workflow_status_idx" ON "_facilities_v" USING btree ("version_workflow_status");
  CREATE INDEX "_facilities_v_version_version_is_demo_idx" ON "_facilities_v" USING btree ("version_is_demo");
  CREATE INDEX "_facilities_v_version_version_created_by_idx" ON "_facilities_v" USING btree ("version_created_by_id");
  CREATE INDEX "_facilities_v_version_version_updated_by_idx" ON "_facilities_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_facilities_v_version_version_updated_at_idx" ON "_facilities_v" USING btree ("version_updated_at");
  CREATE INDEX "_facilities_v_version_version_created_at_idx" ON "_facilities_v" USING btree ("version_created_at");
  CREATE INDEX "_facilities_v_version_version_deleted_at_idx" ON "_facilities_v" USING btree ("version_deleted_at");
  CREATE INDEX "_facilities_v_version_version__status_idx" ON "_facilities_v" USING btree ("version__status");
  CREATE INDEX "_facilities_v_created_at_idx" ON "_facilities_v" USING btree ("created_at");
  CREATE INDEX "_facilities_v_updated_at_idx" ON "_facilities_v" USING btree ("updated_at");
  CREATE INDEX "_facilities_v_latest_idx" ON "_facilities_v" USING btree ("latest");
  CREATE INDEX "_facilities_v_rels_order_idx" ON "_facilities_v_rels" USING btree ("order");
  CREATE INDEX "_facilities_v_rels_parent_idx" ON "_facilities_v_rels" USING btree ("parent_id");
  CREATE INDEX "_facilities_v_rels_path_idx" ON "_facilities_v_rels" USING btree ("path");
  CREATE INDEX "_facilities_v_rels_media_id_idx" ON "_facilities_v_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "staff_slug_idx" ON "staff" USING btree ("slug");
  CREATE INDEX "staff_photo_idx" ON "staff" USING btree ("photo_id");
  CREATE INDEX "staff_workflow_status_idx" ON "staff" USING btree ("workflow_status");
  CREATE INDEX "staff_is_demo_idx" ON "staff" USING btree ("is_demo");
  CREATE INDEX "staff_created_by_idx" ON "staff" USING btree ("created_by_id");
  CREATE INDEX "staff_updated_by_idx" ON "staff" USING btree ("updated_by_id");
  CREATE INDEX "staff_updated_at_idx" ON "staff" USING btree ("updated_at");
  CREATE INDEX "staff_created_at_idx" ON "staff" USING btree ("created_at");
  CREATE INDEX "staff_deleted_at_idx" ON "staff" USING btree ("deleted_at");
  CREATE INDEX "staff__status_idx" ON "staff" USING btree ("_status");
  CREATE INDEX "_staff_v_parent_idx" ON "_staff_v" USING btree ("parent_id");
  CREATE INDEX "_staff_v_version_version_slug_idx" ON "_staff_v" USING btree ("version_slug");
  CREATE INDEX "_staff_v_version_version_photo_idx" ON "_staff_v" USING btree ("version_photo_id");
  CREATE INDEX "_staff_v_version_version_workflow_status_idx" ON "_staff_v" USING btree ("version_workflow_status");
  CREATE INDEX "_staff_v_version_version_is_demo_idx" ON "_staff_v" USING btree ("version_is_demo");
  CREATE INDEX "_staff_v_version_version_created_by_idx" ON "_staff_v" USING btree ("version_created_by_id");
  CREATE INDEX "_staff_v_version_version_updated_by_idx" ON "_staff_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_staff_v_version_version_updated_at_idx" ON "_staff_v" USING btree ("version_updated_at");
  CREATE INDEX "_staff_v_version_version_created_at_idx" ON "_staff_v" USING btree ("version_created_at");
  CREATE INDEX "_staff_v_version_version_deleted_at_idx" ON "_staff_v" USING btree ("version_deleted_at");
  CREATE INDEX "_staff_v_version_version__status_idx" ON "_staff_v" USING btree ("version__status");
  CREATE INDEX "_staff_v_created_at_idx" ON "_staff_v" USING btree ("created_at");
  CREATE INDEX "_staff_v_updated_at_idx" ON "_staff_v" USING btree ("updated_at");
  CREATE INDEX "_staff_v_latest_idx" ON "_staff_v" USING btree ("latest");
  CREATE UNIQUE INDEX "achievements_slug_idx" ON "achievements" USING btree ("slug");
  CREATE INDEX "achievements_year_idx" ON "achievements" USING btree ("year");
  CREATE INDEX "achievements_cover_idx" ON "achievements" USING btree ("cover_id");
  CREATE INDEX "achievements_proof_idx" ON "achievements" USING btree ("proof_id");
  CREATE INDEX "achievements_featured_idx" ON "achievements" USING btree ("featured");
  CREATE INDEX "achievements_workflow_status_idx" ON "achievements" USING btree ("workflow_status");
  CREATE INDEX "achievements_is_demo_idx" ON "achievements" USING btree ("is_demo");
  CREATE INDEX "achievements_created_by_idx" ON "achievements" USING btree ("created_by_id");
  CREATE INDEX "achievements_updated_by_idx" ON "achievements" USING btree ("updated_by_id");
  CREATE INDEX "achievements_updated_at_idx" ON "achievements" USING btree ("updated_at");
  CREATE INDEX "achievements_created_at_idx" ON "achievements" USING btree ("created_at");
  CREATE INDEX "achievements_deleted_at_idx" ON "achievements" USING btree ("deleted_at");
  CREATE INDEX "achievements__status_idx" ON "achievements" USING btree ("_status");
  CREATE INDEX "achievements_rels_order_idx" ON "achievements_rels" USING btree ("order");
  CREATE INDEX "achievements_rels_parent_idx" ON "achievements_rels" USING btree ("parent_id");
  CREATE INDEX "achievements_rels_path_idx" ON "achievements_rels" USING btree ("path");
  CREATE INDEX "achievements_rels_media_id_idx" ON "achievements_rels" USING btree ("media_id");
  CREATE INDEX "_achievements_v_parent_idx" ON "_achievements_v" USING btree ("parent_id");
  CREATE INDEX "_achievements_v_version_version_slug_idx" ON "_achievements_v" USING btree ("version_slug");
  CREATE INDEX "_achievements_v_version_version_year_idx" ON "_achievements_v" USING btree ("version_year");
  CREATE INDEX "_achievements_v_version_version_cover_idx" ON "_achievements_v" USING btree ("version_cover_id");
  CREATE INDEX "_achievements_v_version_version_proof_idx" ON "_achievements_v" USING btree ("version_proof_id");
  CREATE INDEX "_achievements_v_version_version_featured_idx" ON "_achievements_v" USING btree ("version_featured");
  CREATE INDEX "_achievements_v_version_version_workflow_status_idx" ON "_achievements_v" USING btree ("version_workflow_status");
  CREATE INDEX "_achievements_v_version_version_is_demo_idx" ON "_achievements_v" USING btree ("version_is_demo");
  CREATE INDEX "_achievements_v_version_version_created_by_idx" ON "_achievements_v" USING btree ("version_created_by_id");
  CREATE INDEX "_achievements_v_version_version_updated_by_idx" ON "_achievements_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_achievements_v_version_version_updated_at_idx" ON "_achievements_v" USING btree ("version_updated_at");
  CREATE INDEX "_achievements_v_version_version_created_at_idx" ON "_achievements_v" USING btree ("version_created_at");
  CREATE INDEX "_achievements_v_version_version_deleted_at_idx" ON "_achievements_v" USING btree ("version_deleted_at");
  CREATE INDEX "_achievements_v_version_version__status_idx" ON "_achievements_v" USING btree ("version__status");
  CREATE INDEX "_achievements_v_created_at_idx" ON "_achievements_v" USING btree ("created_at");
  CREATE INDEX "_achievements_v_updated_at_idx" ON "_achievements_v" USING btree ("updated_at");
  CREATE INDEX "_achievements_v_latest_idx" ON "_achievements_v" USING btree ("latest");
  CREATE INDEX "_achievements_v_rels_order_idx" ON "_achievements_v_rels" USING btree ("order");
  CREATE INDEX "_achievements_v_rels_parent_idx" ON "_achievements_v_rels" USING btree ("parent_id");
  CREATE INDEX "_achievements_v_rels_path_idx" ON "_achievements_v_rels" USING btree ("path");
  CREATE INDEX "_achievements_v_rels_media_id_idx" ON "_achievements_v_rels" USING btree ("media_id");
  CREATE INDEX "admissions_cycles_waves_order_idx" ON "admissions_cycles_waves" USING btree ("_order");
  CREATE INDEX "admissions_cycles_waves_parent_id_idx" ON "admissions_cycles_waves" USING btree ("_parent_id");
  CREATE INDEX "admissions_cycles_steps_order_idx" ON "admissions_cycles_steps" USING btree ("_order");
  CREATE INDEX "admissions_cycles_steps_parent_id_idx" ON "admissions_cycles_steps" USING btree ("_parent_id");
  CREATE INDEX "admissions_cycles_requirements_order_idx" ON "admissions_cycles_requirements" USING btree ("_order");
  CREATE INDEX "admissions_cycles_requirements_parent_id_idx" ON "admissions_cycles_requirements" USING btree ("_parent_id");
  CREATE INDEX "admissions_cycles_faqs_order_idx" ON "admissions_cycles_faqs" USING btree ("_order");
  CREATE INDEX "admissions_cycles_faqs_parent_id_idx" ON "admissions_cycles_faqs" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "admissions_cycles_academic_year_idx" ON "admissions_cycles" USING btree ("academic_year");
  CREATE INDEX "admissions_cycles_workflow_status_idx" ON "admissions_cycles" USING btree ("workflow_status");
  CREATE INDEX "admissions_cycles_is_demo_idx" ON "admissions_cycles" USING btree ("is_demo");
  CREATE INDEX "admissions_cycles_created_by_idx" ON "admissions_cycles" USING btree ("created_by_id");
  CREATE INDEX "admissions_cycles_updated_by_idx" ON "admissions_cycles" USING btree ("updated_by_id");
  CREATE INDEX "admissions_cycles_updated_at_idx" ON "admissions_cycles" USING btree ("updated_at");
  CREATE INDEX "admissions_cycles_created_at_idx" ON "admissions_cycles" USING btree ("created_at");
  CREATE INDEX "admissions_cycles_deleted_at_idx" ON "admissions_cycles" USING btree ("deleted_at");
  CREATE INDEX "admissions_cycles__status_idx" ON "admissions_cycles" USING btree ("_status");
  CREATE INDEX "_admissions_cycles_v_version_waves_order_idx" ON "_admissions_cycles_v_version_waves" USING btree ("_order");
  CREATE INDEX "_admissions_cycles_v_version_waves_parent_id_idx" ON "_admissions_cycles_v_version_waves" USING btree ("_parent_id");
  CREATE INDEX "_admissions_cycles_v_version_steps_order_idx" ON "_admissions_cycles_v_version_steps" USING btree ("_order");
  CREATE INDEX "_admissions_cycles_v_version_steps_parent_id_idx" ON "_admissions_cycles_v_version_steps" USING btree ("_parent_id");
  CREATE INDEX "_admissions_cycles_v_version_requirements_order_idx" ON "_admissions_cycles_v_version_requirements" USING btree ("_order");
  CREATE INDEX "_admissions_cycles_v_version_requirements_parent_id_idx" ON "_admissions_cycles_v_version_requirements" USING btree ("_parent_id");
  CREATE INDEX "_admissions_cycles_v_version_faqs_order_idx" ON "_admissions_cycles_v_version_faqs" USING btree ("_order");
  CREATE INDEX "_admissions_cycles_v_version_faqs_parent_id_idx" ON "_admissions_cycles_v_version_faqs" USING btree ("_parent_id");
  CREATE INDEX "_admissions_cycles_v_parent_idx" ON "_admissions_cycles_v" USING btree ("parent_id");
  CREATE INDEX "_admissions_cycles_v_version_version_academic_year_idx" ON "_admissions_cycles_v" USING btree ("version_academic_year");
  CREATE INDEX "_admissions_cycles_v_version_version_workflow_status_idx" ON "_admissions_cycles_v" USING btree ("version_workflow_status");
  CREATE INDEX "_admissions_cycles_v_version_version_is_demo_idx" ON "_admissions_cycles_v" USING btree ("version_is_demo");
  CREATE INDEX "_admissions_cycles_v_version_version_created_by_idx" ON "_admissions_cycles_v" USING btree ("version_created_by_id");
  CREATE INDEX "_admissions_cycles_v_version_version_updated_by_idx" ON "_admissions_cycles_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_admissions_cycles_v_version_version_updated_at_idx" ON "_admissions_cycles_v" USING btree ("version_updated_at");
  CREATE INDEX "_admissions_cycles_v_version_version_created_at_idx" ON "_admissions_cycles_v" USING btree ("version_created_at");
  CREATE INDEX "_admissions_cycles_v_version_version_deleted_at_idx" ON "_admissions_cycles_v" USING btree ("version_deleted_at");
  CREATE INDEX "_admissions_cycles_v_version_version__status_idx" ON "_admissions_cycles_v" USING btree ("version__status");
  CREATE INDEX "_admissions_cycles_v_created_at_idx" ON "_admissions_cycles_v" USING btree ("created_at");
  CREATE INDEX "_admissions_cycles_v_updated_at_idx" ON "_admissions_cycles_v" USING btree ("updated_at");
  CREATE INDEX "_admissions_cycles_v_latest_idx" ON "_admissions_cycles_v" USING btree ("latest");
  CREATE UNIQUE INDEX "contact_messages_reference_idx" ON "contact_messages" USING btree ("reference");
  CREATE INDEX "contact_messages_category_idx" ON "contact_messages" USING btree ("category");
  CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status");
  CREATE INDEX "contact_messages_assigned_to_idx" ON "contact_messages" USING btree ("assigned_to_id");
  CREATE INDEX "contact_messages_updated_at_idx" ON "contact_messages" USING btree ("updated_at");
  CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at");
  CREATE INDEX "media_source_id_idx" ON "media" USING btree ("source_id");
  CREATE UNIQUE INDEX "media_sha256_idx" ON "media" USING btree ("sha256");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "private_files_updated_at_idx" ON "private_files" USING btree ("updated_at");
  CREATE INDEX "private_files_created_at_idx" ON "private_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "private_files_filename_idx" ON "private_files" USING btree ("filename");
  CREATE UNIQUE INDEX "redirects_old_path_idx" ON "redirects" USING btree ("old_path");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
  CREATE INDEX "audit_logs_collection_slug_idx" ON "audit_logs" USING btree ("collection_slug");
  CREATE INDEX "audit_logs_doc_id_idx" ON "audit_logs" USING btree ("doc_id");
  CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");
  CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_announcements_id_idx" ON "payload_locked_documents_rels" USING btree ("announcements_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_albums_id_idx" ON "payload_locked_documents_rels" USING btree ("albums_id");
  CREATE INDEX "payload_locked_documents_rels_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("documents_id");
  CREATE INDEX "payload_locked_documents_rels_guides_id_idx" ON "payload_locked_documents_rels" USING btree ("guides_id");
  CREATE INDEX "payload_locked_documents_rels_services_id_idx" ON "payload_locked_documents_rels" USING btree ("services_id");
  CREATE INDEX "payload_locked_documents_rels_testimonials_id_idx" ON "payload_locked_documents_rels" USING btree ("testimonials_id");
  CREATE INDEX "payload_locked_documents_rels_programs_id_idx" ON "payload_locked_documents_rels" USING btree ("programs_id");
  CREATE INDEX "payload_locked_documents_rels_extracurriculars_id_idx" ON "payload_locked_documents_rels" USING btree ("extracurriculars_id");
  CREATE INDEX "payload_locked_documents_rels_facilities_id_idx" ON "payload_locked_documents_rels" USING btree ("facilities_id");
  CREATE INDEX "payload_locked_documents_rels_staff_id_idx" ON "payload_locked_documents_rels" USING btree ("staff_id");
  CREATE INDEX "payload_locked_documents_rels_achievements_id_idx" ON "payload_locked_documents_rels" USING btree ("achievements_id");
  CREATE INDEX "payload_locked_documents_rels_admissions_cycles_id_idx" ON "payload_locked_documents_rels" USING btree ("admissions_cycles_id");
  CREATE INDEX "payload_locked_documents_rels_contact_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_messages_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_private_files_id_idx" ON "payload_locked_documents_rels" USING btree ("private_files_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_logs_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "homepage_quick_links_order_idx" ON "homepage_quick_links" USING btree ("_order");
  CREATE INDEX "homepage_quick_links_parent_id_idx" ON "homepage_quick_links" USING btree ("_parent_id");
  CREATE INDEX "homepage_intro_pillars_order_idx" ON "homepage_intro_pillars" USING btree ("_order");
  CREATE INDEX "homepage_intro_pillars_parent_id_idx" ON "homepage_intro_pillars" USING btree ("_parent_id");
  CREATE INDEX "homepage_sections_order_idx" ON "homepage_sections" USING btree ("_order");
  CREATE INDEX "homepage_sections_parent_id_idx" ON "homepage_sections" USING btree ("_parent_id");
  CREATE INDEX "homepage_hero_hero_image_idx" ON "homepage" USING btree ("hero_image_id");
  CREATE INDEX "homepage_hero_hero_image_mobile_idx" ON "homepage" USING btree ("hero_image_mobile_id");
  CREATE INDEX "homepage_intro_intro_intro_image_idx" ON "homepage" USING btree ("intro_intro_image_id");
  CREATE INDEX "homepage_texts_texts_community_image_idx" ON "homepage" USING btree ("texts_community_image_id");
  CREATE INDEX "homepage_texts_texts_achievements_album_idx" ON "homepage" USING btree ("texts_achievements_album_id");
  CREATE INDEX "homepage__status_idx" ON "homepage" USING btree ("_status");
  CREATE INDEX "homepage_rels_order_idx" ON "homepage_rels" USING btree ("order");
  CREATE INDEX "homepage_rels_parent_idx" ON "homepage_rels" USING btree ("parent_id");
  CREATE INDEX "homepage_rels_path_idx" ON "homepage_rels" USING btree ("path");
  CREATE INDEX "homepage_rels_media_id_idx" ON "homepage_rels" USING btree ("media_id");
  CREATE INDEX "_homepage_v_version_quick_links_order_idx" ON "_homepage_v_version_quick_links" USING btree ("_order");
  CREATE INDEX "_homepage_v_version_quick_links_parent_id_idx" ON "_homepage_v_version_quick_links" USING btree ("_parent_id");
  CREATE INDEX "_homepage_v_version_intro_pillars_order_idx" ON "_homepage_v_version_intro_pillars" USING btree ("_order");
  CREATE INDEX "_homepage_v_version_intro_pillars_parent_id_idx" ON "_homepage_v_version_intro_pillars" USING btree ("_parent_id");
  CREATE INDEX "_homepage_v_version_sections_order_idx" ON "_homepage_v_version_sections" USING btree ("_order");
  CREATE INDEX "_homepage_v_version_sections_parent_id_idx" ON "_homepage_v_version_sections" USING btree ("_parent_id");
  CREATE INDEX "_homepage_v_version_hero_version_hero_image_idx" ON "_homepage_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_homepage_v_version_hero_version_hero_image_mobile_idx" ON "_homepage_v" USING btree ("version_hero_image_mobile_id");
  CREATE INDEX "_homepage_v_version_intro_version_intro_intro_image_idx" ON "_homepage_v" USING btree ("version_intro_intro_image_id");
  CREATE INDEX "_homepage_v_version_texts_version_texts_community_image_idx" ON "_homepage_v" USING btree ("version_texts_community_image_id");
  CREATE INDEX "_homepage_v_version_texts_version_texts_achievements_alb_idx" ON "_homepage_v" USING btree ("version_texts_achievements_album_id");
  CREATE INDEX "_homepage_v_version_version__status_idx" ON "_homepage_v" USING btree ("version__status");
  CREATE INDEX "_homepage_v_created_at_idx" ON "_homepage_v" USING btree ("created_at");
  CREATE INDEX "_homepage_v_updated_at_idx" ON "_homepage_v" USING btree ("updated_at");
  CREATE INDEX "_homepage_v_latest_idx" ON "_homepage_v" USING btree ("latest");
  CREATE INDEX "_homepage_v_rels_order_idx" ON "_homepage_v_rels" USING btree ("order");
  CREATE INDEX "_homepage_v_rels_parent_idx" ON "_homepage_v_rels" USING btree ("parent_id");
  CREATE INDEX "_homepage_v_rels_path_idx" ON "_homepage_v_rels" USING btree ("path");
  CREATE INDEX "_homepage_v_rels_media_id_idx" ON "_homepage_v_rels" USING btree ("media_id");
  CREATE INDEX "site_settings_socials_order_idx" ON "site_settings_socials" USING btree ("_order");
  CREATE INDEX "site_settings_socials_parent_id_idx" ON "site_settings_socials" USING btree ("_parent_id");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "_site_settings_v_version_socials_order_idx" ON "_site_settings_v_version_socials" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_socials_parent_id_idx" ON "_site_settings_v_version_socials" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_version_logo_idx" ON "_site_settings_v" USING btree ("version_logo_id");
  CREATE INDEX "_site_settings_v_created_at_idx" ON "_site_settings_v" USING btree ("created_at");
  CREATE INDEX "_site_settings_v_updated_at_idx" ON "_site_settings_v" USING btree ("updated_at");
  CREATE INDEX "navigation_header_children_order_idx" ON "navigation_header_children" USING btree ("_order");
  CREATE INDEX "navigation_header_children_parent_id_idx" ON "navigation_header_children" USING btree ("_parent_id");
  CREATE INDEX "navigation_header_order_idx" ON "navigation_header" USING btree ("_order");
  CREATE INDEX "navigation_header_parent_id_idx" ON "navigation_header" USING btree ("_parent_id");
  CREATE INDEX "navigation_footer_order_idx" ON "navigation_footer" USING btree ("_order");
  CREATE INDEX "navigation_footer_parent_id_idx" ON "navigation_footer" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_header_children_order_idx" ON "_navigation_v_version_header_children" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_header_children_parent_id_idx" ON "_navigation_v_version_header_children" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_header_order_idx" ON "_navigation_v_version_header" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_header_parent_id_idx" ON "_navigation_v_version_header" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_footer_order_idx" ON "_navigation_v_version_footer" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_footer_parent_id_idx" ON "_navigation_v_version_footer" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_created_at_idx" ON "_navigation_v" USING btree ("created_at");
  CREATE INDEX "_navigation_v_updated_at_idx" ON "_navigation_v" USING btree ("updated_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_image_text" CASCADE;
  DROP TABLE "pages_blocks_values_items" CASCADE;
  DROP TABLE "pages_blocks_values" CASCADE;
  DROP TABLE "pages_blocks_cta" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_image_text" CASCADE;
  DROP TABLE "_pages_v_blocks_values_items" CASCADE;
  DROP TABLE "_pages_v_blocks_values" CASCADE;
  DROP TABLE "_pages_v_blocks_cta" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_rels" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_rels" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "announcements_audience" CASCADE;
  DROP TABLE "announcements" CASCADE;
  DROP TABLE "announcements_rels" CASCADE;
  DROP TABLE "_announcements_v_version_audience" CASCADE;
  DROP TABLE "_announcements_v" CASCADE;
  DROP TABLE "_announcements_v_rels" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  DROP TABLE "albums_items" CASCADE;
  DROP TABLE "albums" CASCADE;
  DROP TABLE "_albums_v_version_items" CASCADE;
  DROP TABLE "_albums_v" CASCADE;
  DROP TABLE "documents" CASCADE;
  DROP TABLE "_documents_v" CASCADE;
  DROP TABLE "guides_steps" CASCADE;
  DROP TABLE "guides" CASCADE;
  DROP TABLE "guides_rels" CASCADE;
  DROP TABLE "_guides_v_version_steps" CASCADE;
  DROP TABLE "_guides_v" CASCADE;
  DROP TABLE "_guides_v_rels" CASCADE;
  DROP TABLE "services" CASCADE;
  DROP TABLE "_services_v" CASCADE;
  DROP TABLE "testimonials" CASCADE;
  DROP TABLE "_testimonials_v" CASCADE;
  DROP TABLE "programs_benefits" CASCADE;
  DROP TABLE "programs" CASCADE;
  DROP TABLE "programs_rels" CASCADE;
  DROP TABLE "_programs_v_version_benefits" CASCADE;
  DROP TABLE "_programs_v" CASCADE;
  DROP TABLE "_programs_v_rels" CASCADE;
  DROP TABLE "extracurriculars" CASCADE;
  DROP TABLE "extracurriculars_rels" CASCADE;
  DROP TABLE "_extracurriculars_v" CASCADE;
  DROP TABLE "_extracurriculars_v_rels" CASCADE;
  DROP TABLE "facilities" CASCADE;
  DROP TABLE "facilities_rels" CASCADE;
  DROP TABLE "_facilities_v" CASCADE;
  DROP TABLE "_facilities_v_rels" CASCADE;
  DROP TABLE "staff" CASCADE;
  DROP TABLE "_staff_v" CASCADE;
  DROP TABLE "achievements" CASCADE;
  DROP TABLE "achievements_rels" CASCADE;
  DROP TABLE "_achievements_v" CASCADE;
  DROP TABLE "_achievements_v_rels" CASCADE;
  DROP TABLE "admissions_cycles_waves" CASCADE;
  DROP TABLE "admissions_cycles_steps" CASCADE;
  DROP TABLE "admissions_cycles_requirements" CASCADE;
  DROP TABLE "admissions_cycles_faqs" CASCADE;
  DROP TABLE "admissions_cycles" CASCADE;
  DROP TABLE "_admissions_cycles_v_version_waves" CASCADE;
  DROP TABLE "_admissions_cycles_v_version_steps" CASCADE;
  DROP TABLE "_admissions_cycles_v_version_requirements" CASCADE;
  DROP TABLE "_admissions_cycles_v_version_faqs" CASCADE;
  DROP TABLE "_admissions_cycles_v" CASCADE;
  DROP TABLE "contact_messages" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "private_files" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "audit_logs" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "homepage_quick_links" CASCADE;
  DROP TABLE "homepage_intro_pillars" CASCADE;
  DROP TABLE "homepage_sections" CASCADE;
  DROP TABLE "homepage" CASCADE;
  DROP TABLE "homepage_rels" CASCADE;
  DROP TABLE "_homepage_v_version_quick_links" CASCADE;
  DROP TABLE "_homepage_v_version_intro_pillars" CASCADE;
  DROP TABLE "_homepage_v_version_sections" CASCADE;
  DROP TABLE "_homepage_v" CASCADE;
  DROP TABLE "_homepage_v_rels" CASCADE;
  DROP TABLE "site_settings_socials" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "_site_settings_v_version_socials" CASCADE;
  DROP TABLE "_site_settings_v" CASCADE;
  DROP TABLE "navigation_header_children" CASCADE;
  DROP TABLE "navigation_header" CASCADE;
  DROP TABLE "navigation_footer" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TABLE "_navigation_v_version_header_children" CASCADE;
  DROP TABLE "_navigation_v_version_header" CASCADE;
  DROP TABLE "_navigation_v_version_footer" CASCADE;
  DROP TABLE "_navigation_v" CASCADE;
  DROP TYPE "public"."enum_pages_blocks_image_text_image_side";
  DROP TYPE "public"."enum_pages_workflow_status";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_blocks_image_text_image_side";
  DROP TYPE "public"."enum__pages_v_version_workflow_status";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum_posts_workflow_status";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_workflow_status";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum_announcements_audience";
  DROP TYPE "public"."enum_announcements_category";
  DROP TYPE "public"."enum_announcements_workflow_status";
  DROP TYPE "public"."enum_announcements_status";
  DROP TYPE "public"."enum__announcements_v_version_audience";
  DROP TYPE "public"."enum__announcements_v_version_category";
  DROP TYPE "public"."enum__announcements_v_version_workflow_status";
  DROP TYPE "public"."enum__announcements_v_version_status";
  DROP TYPE "public"."enum_events_startat_tz";
  DROP TYPE "public"."enum_events_endat_tz";
  DROP TYPE "public"."enum_events_event_status";
  DROP TYPE "public"."enum_events_workflow_status";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum__events_v_version_startat_tz";
  DROP TYPE "public"."enum__events_v_version_endat_tz";
  DROP TYPE "public"."enum__events_v_version_event_status";
  DROP TYPE "public"."enum__events_v_version_workflow_status";
  DROP TYPE "public"."enum__events_v_version_status";
  DROP TYPE "public"."enum_albums_workflow_status";
  DROP TYPE "public"."enum_albums_status";
  DROP TYPE "public"."enum__albums_v_version_workflow_status";
  DROP TYPE "public"."enum__albums_v_version_status";
  DROP TYPE "public"."enum_documents_category";
  DROP TYPE "public"."enum_documents_workflow_status";
  DROP TYPE "public"."enum_documents_status";
  DROP TYPE "public"."enum__documents_v_version_category";
  DROP TYPE "public"."enum__documents_v_version_workflow_status";
  DROP TYPE "public"."enum__documents_v_version_status";
  DROP TYPE "public"."enum_guides_workflow_status";
  DROP TYPE "public"."enum_guides_status";
  DROP TYPE "public"."enum__guides_v_version_workflow_status";
  DROP TYPE "public"."enum__guides_v_version_status";
  DROP TYPE "public"."enum_services_icon";
  DROP TYPE "public"."enum_services_workflow_status";
  DROP TYPE "public"."enum_services_status";
  DROP TYPE "public"."enum__services_v_version_icon";
  DROP TYPE "public"."enum__services_v_version_workflow_status";
  DROP TYPE "public"."enum__services_v_version_status";
  DROP TYPE "public"."enum_testimonials_workflow_status";
  DROP TYPE "public"."enum_testimonials_status";
  DROP TYPE "public"."enum__testimonials_v_version_workflow_status";
  DROP TYPE "public"."enum__testimonials_v_version_status";
  DROP TYPE "public"."enum_programs_workflow_status";
  DROP TYPE "public"."enum_programs_status";
  DROP TYPE "public"."enum__programs_v_version_workflow_status";
  DROP TYPE "public"."enum__programs_v_version_status";
  DROP TYPE "public"."enum_extracurriculars_kind";
  DROP TYPE "public"."enum_extracurriculars_workflow_status";
  DROP TYPE "public"."enum_extracurriculars_status";
  DROP TYPE "public"."enum__extracurriculars_v_version_kind";
  DROP TYPE "public"."enum__extracurriculars_v_version_workflow_status";
  DROP TYPE "public"."enum__extracurriculars_v_version_status";
  DROP TYPE "public"."enum_facilities_availability";
  DROP TYPE "public"."enum_facilities_workflow_status";
  DROP TYPE "public"."enum_facilities_status";
  DROP TYPE "public"."enum__facilities_v_version_availability";
  DROP TYPE "public"."enum__facilities_v_version_workflow_status";
  DROP TYPE "public"."enum__facilities_v_version_status";
  DROP TYPE "public"."enum_staff_group";
  DROP TYPE "public"."enum_staff_workflow_status";
  DROP TYPE "public"."enum_staff_status";
  DROP TYPE "public"."enum__staff_v_version_group";
  DROP TYPE "public"."enum__staff_v_version_workflow_status";
  DROP TYPE "public"."enum__staff_v_version_status";
  DROP TYPE "public"."enum_achievements_category";
  DROP TYPE "public"."enum_achievements_level";
  DROP TYPE "public"."enum_achievements_workflow_status";
  DROP TYPE "public"."enum_achievements_status";
  DROP TYPE "public"."enum__achievements_v_version_category";
  DROP TYPE "public"."enum__achievements_v_version_level";
  DROP TYPE "public"."enum__achievements_v_version_workflow_status";
  DROP TYPE "public"."enum__achievements_v_version_status";
  DROP TYPE "public"."enum_admissions_cycles_admission_status";
  DROP TYPE "public"."enum_admissions_cycles_workflow_status";
  DROP TYPE "public"."enum_admissions_cycles_status";
  DROP TYPE "public"."enum__admissions_cycles_v_version_admission_status";
  DROP TYPE "public"."enum__admissions_cycles_v_version_workflow_status";
  DROP TYPE "public"."enum__admissions_cycles_v_version_status";
  DROP TYPE "public"."enum_contact_messages_category";
  DROP TYPE "public"."enum_contact_messages_status";
  DROP TYPE "public"."enum_media_consent";
  DROP TYPE "public"."enum_media_review_status";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  DROP TYPE "public"."enum_homepage_quick_links_icon";
  DROP TYPE "public"."enum_homepage_sections_type";
  DROP TYPE "public"."enum_homepage_status";
  DROP TYPE "public"."enum__homepage_v_version_quick_links_icon";
  DROP TYPE "public"."enum__homepage_v_version_sections_type";
  DROP TYPE "public"."enum__homepage_v_version_status";
  DROP TYPE "public"."enum_site_settings_socials_platform";
  DROP TYPE "public"."enum__site_settings_v_version_socials_platform";`)
}
