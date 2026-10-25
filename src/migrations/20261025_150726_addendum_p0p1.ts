import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_faq_block_category" AS ENUM('pendaftaran', 'pembelajaran', 'kegiatan', 'administrasi', 'website');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_block_category" AS ENUM('pendaftaran', 'pembelajaran', 'kegiatan', 'administrasi', 'website');
  CREATE TYPE "public"."enum_events_audience" AS ENUM('semua', 'kelas_7', 'kelas_8', 'kelas_9', 'orang_tua', 'calon_siswa', 'guru');
  CREATE TYPE "public"."enum__events_v_version_audience" AS ENUM('semua', 'kelas_7', 'kelas_8', 'kelas_9', 'orang_tua', 'calon_siswa', 'guru');
  CREATE TYPE "public"."enum_event_categories_color" AS ENUM('teal', 'gold', 'navy', 'red', 'green', 'purple', 'grey');
  CREATE TYPE "public"."enum_faqs_category" AS ENUM('pendaftaran', 'pembelajaran', 'kegiatan', 'administrasi', 'website');
  CREATE TYPE "public"."enum_faqs_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_faqs_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faqs_v_version_category" AS ENUM('pendaftaran', 'pembelajaran', 'kegiatan', 'administrasi', 'website');
  CREATE TYPE "public"."enum__faqs_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__faqs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_services_service_status" AS ENUM('active', 'coming_soon', 'maintenance');
  CREATE TYPE "public"."enum_services_service_category" AS ENUM('umum', 'akademik', 'perpustakaan', 'administrasi');
  CREATE TYPE "public"."enum__services_v_version_service_status" AS ENUM('active', 'coming_soon', 'maintenance');
  CREATE TYPE "public"."enum__services_v_version_service_category" AS ENUM('umum', 'akademik', 'perpustakaan', 'administrasi');
  CREATE TYPE "public"."enum_testimonials_relation" AS ENUM('alumni', 'orang_tua', 'siswa');
  CREATE TYPE "public"."enum__testimonials_v_version_relation" AS ENUM('alumni', 'orang_tua', 'siswa');
  CREATE TYPE "public"."enum_student_works_category" AS ENUM('tulisan', 'seni', 'sains', 'teknologi', 'video', 'proyek_sosial');
  CREATE TYPE "public"."enum_student_works_consent_status" AS ENUM('pending', 'obtained', 'withdrawn');
  CREATE TYPE "public"."enum_student_works_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_student_works_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__student_works_v_version_category" AS ENUM('tulisan', 'seni', 'sains', 'teknologi', 'video', 'proyek_sosial');
  CREATE TYPE "public"."enum__student_works_v_version_consent_status" AS ENUM('pending', 'obtained', 'withdrawn');
  CREATE TYPE "public"."enum__student_works_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__student_works_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_media_items_content_type" AS ENUM('video', 'short', 'podcast', 'playlist', 'social_post', 'channel', 'external_article');
  CREATE TYPE "public"."enum_media_items_display_mode" AS ENUM('click_to_load_embed', 'link_card');
  CREATE TYPE "public"."enum_media_items_aspect_ratio" AS ENUM('16:9', '9:16', '1:1');
  CREATE TYPE "public"."enum_media_items_consent_status" AS ENUM('not_needed', 'obtained', 'pending');
  CREATE TYPE "public"."enum_media_items_availability" AS ENUM('unchecked', 'available', 'unavailable', 'restricted');
  CREATE TYPE "public"."enum_media_items_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum_media_items_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__media_items_v_version_content_type" AS ENUM('video', 'short', 'podcast', 'playlist', 'social_post', 'channel', 'external_article');
  CREATE TYPE "public"."enum__media_items_v_version_display_mode" AS ENUM('click_to_load_embed', 'link_card');
  CREATE TYPE "public"."enum__media_items_v_version_aspect_ratio" AS ENUM('16:9', '9:16', '1:1');
  CREATE TYPE "public"."enum__media_items_v_version_consent_status" AS ENUM('not_needed', 'obtained', 'pending');
  CREATE TYPE "public"."enum__media_items_v_version_availability" AS ENUM('unchecked', 'available', 'unavailable', 'restricted');
  CREATE TYPE "public"."enum__media_items_v_version_workflow_status" AS ENUM('draft', 'in_review', 'published', 'archived');
  CREATE TYPE "public"."enum__media_items_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_social_accounts_platform" AS ENUM('youtube', 'instagram', 'tiktok', 'facebook', 'whatsapp', 'web');
  CREATE TYPE "public"."enum_social_accounts_owner" AS ENUM('sekolah', 'lainnya');
  CREATE TYPE "public"."enum_admissions_cycles_waves_wave_status" AS ENUM('unconfirmed', 'not_open', 'open', 'closed');
  CREATE TYPE "public"."enum_admissions_cycles_mode" AS ENUM('information_only', 'external_system', 'interest_form', 'full_admissions');
  CREATE TYPE "public"."enum_admissions_cycles_closed_offer" AS ENUM('contact', 'interest_next');
  CREATE TYPE "public"."enum__admissions_cycles_v_version_waves_wave_status" AS ENUM('unconfirmed', 'not_open', 'open', 'closed');
  CREATE TYPE "public"."enum__admissions_cycles_v_version_mode" AS ENUM('information_only', 'external_system', 'interest_form', 'full_admissions');
  CREATE TYPE "public"."enum__admissions_cycles_v_version_closed_offer" AS ENUM('contact', 'interest_next');
  CREATE TYPE "public"."enum_leads_interests" AS ENUM('info', 'kunjungan', 'biaya_program', 'lainnya');
  CREATE TYPE "public"."enum_leads_status" AS ENUM('new', 'assigned', 'contacted', 'follow_up', 'interested', 'converted', 'closed');
  CREATE TYPE "public"."enum_leads_close_reason" AS ENUM('not_interested', 'other_school', 'unreachable', 'duplicate', 'test_spam', 'other');
  CREATE TYPE "public"."enum_leads_source" AS ENUM('website', 'pendaftaran', 'kunjungan', 'beranda', 'brosur', 'media_sosial');
  CREATE TYPE "public"."enum_visit_sessions_kind" AS ENUM('open_house', 'individual');
  CREATE TYPE "public"."enum_visit_sessions_session_status" AS ENUM('draft', 'open', 'closed', 'cancelled');
  CREATE TYPE "public"."enum_visit_sessions_startat_tz" AS ENUM('Asia/Makassar');
  CREATE TYPE "public"."enum_visit_sessions_endat_tz" AS ENUM('Asia/Makassar');
  CREATE TYPE "public"."enum_visit_sessions_capacity_unit" AS ENUM('families', 'people');
  CREATE TYPE "public"."enum_visit_bookings_status" AS ENUM('pending', 'confirmed', 'cancelled', 'expired', 'attended', 'no_show');
  CREATE TYPE "public"."enum_analytics_daily_kind" AS ENUM('pageview', 'cta_click', 'form_success');
  ALTER TYPE "public"."enum_announcements_audience" ADD VALUE 'kelas_7' BEFORE 'alumni';
  ALTER TYPE "public"."enum_announcements_audience" ADD VALUE 'kelas_8' BEFORE 'alumni';
  ALTER TYPE "public"."enum_announcements_audience" ADD VALUE 'kelas_9' BEFORE 'alumni';
  ALTER TYPE "public"."enum_announcements_audience" ADD VALUE 'calon_siswa' BEFORE 'alumni';
  ALTER TYPE "public"."enum_announcements_audience" ADD VALUE 'guru' BEFORE 'alumni';
  ALTER TYPE "public"."enum__announcements_v_version_audience" ADD VALUE 'kelas_7' BEFORE 'alumni';
  ALTER TYPE "public"."enum__announcements_v_version_audience" ADD VALUE 'kelas_8' BEFORE 'alumni';
  ALTER TYPE "public"."enum__announcements_v_version_audience" ADD VALUE 'kelas_9' BEFORE 'alumni';
  ALTER TYPE "public"."enum__announcements_v_version_audience" ADD VALUE 'calon_siswa' BEFORE 'alumni';
  ALTER TYPE "public"."enum__announcements_v_version_audience" ADD VALUE 'guru' BEFORE 'alumni';
  ALTER TYPE "public"."enum_staff_group" ADD VALUE 'yayasan' BEFORE 'pimpinan';
  ALTER TYPE "public"."enum__staff_v_version_group" ADD VALUE 'yayasan' BEFORE 'pimpinan';
  ALTER TYPE "public"."enum_contact_messages_category" ADD VALUE 'kegiatan';
  ALTER TYPE "public"."enum_contact_messages_category" ADD VALUE 'kunjungan';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'releaseVisitHolds' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'releaseVisitHolds' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_homepage_sections_type" ADD VALUE 'mediaHub' BEFORE 'facilities';
  ALTER TYPE "public"."enum__homepage_v_version_sections_type" ADD VALUE 'mediaHub' BEFORE 'facilities';
  CREATE TABLE "pages_blocks_highlight_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar DEFAULT 'Prestasi',
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"link_label" varchar DEFAULT 'Lihat semua prestasi',
  	"link_href" varchar,
  	"post_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Pertanyaan umum',
  	"category" "enum_pages_blocks_faq_block_category",
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_events_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Agenda terkait',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_media_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_works_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Karya siswa',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_guide_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"guide_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_admissions_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Mari Mengenal KPS Lebih Dekat',
  	"text" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"faqs_id" integer,
  	"events_id" integer,
  	"media_items_id" integer,
  	"student_works_id" integer
  );
  
  CREATE TABLE "_pages_v_blocks_highlight_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar DEFAULT 'Prestasi',
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"link_label" varchar DEFAULT 'Lihat semua prestasi',
  	"link_href" varchar,
  	"post_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Pertanyaan umum',
  	"category" "enum__pages_v_blocks_faq_block_category",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_events_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Agenda terkait',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_media_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_works_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Karya siswa',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_guide_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"guide_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_admissions_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Mari Mengenal KPS Lebih Dekat',
  	"text" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"faqs_id" integer,
  	"events_id" integer,
  	"media_items_id" integer,
  	"student_works_id" integer
  );
  
  CREATE TABLE "events_audience" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_events_audience",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documents_id" integer
  );
  
  CREATE TABLE "_events_v_version_audience" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__events_v_version_audience",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_events_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documents_id" integer
  );
  
  CREATE TABLE "event_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"color" "enum_event_categories_color" DEFAULT 'teal',
  	"order" numeric DEFAULT 10,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"answer" jsonb,
  	"category" "enum_faqs_category" DEFAULT 'pendaftaran',
  	"related_page" varchar,
  	"featured" boolean DEFAULT false,
  	"order" numeric DEFAULT 10,
  	"last_reviewed_at" timestamp(3) with time zone,
  	"workflow_status" "enum_faqs_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_faqs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_faqs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_answer" jsonb,
  	"version_category" "enum__faqs_v_version_category" DEFAULT 'pendaftaran',
  	"version_related_page" varchar,
  	"version_featured" boolean DEFAULT false,
  	"version_order" numeric DEFAULT 10,
  	"version_last_reviewed_at" timestamp(3) with time zone,
  	"version_workflow_status" "enum__faqs_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__faqs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "programs_activities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_programs_v_version_activities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "extracurriculars_activities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_extracurriculars_v_version_activities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "facilities_activities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_facilities_v_version_activities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "student_works" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"category" "enum_student_works_category",
  	"excerpt" varchar,
  	"content" jsonb,
  	"creators_public" varchar,
  	"year" numeric,
  	"mentor_public" varchar,
  	"cover_id" integer,
  	"consent_status" "enum_student_works_consent_status" DEFAULT 'pending',
  	"consent_record_id" integer,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"workflow_status" "enum_student_works_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_student_works_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "student_works_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"media_items_id" integer
  );
  
  CREATE TABLE "_student_works_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_category" "enum__student_works_v_version_category",
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"version_creators_public" varchar,
  	"version_year" numeric,
  	"version_mentor_public" varchar,
  	"version_cover_id" integer,
  	"version_consent_status" "enum__student_works_v_version_consent_status" DEFAULT 'pending',
  	"version_consent_record_id" integer,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_workflow_status" "enum__student_works_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__student_works_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_student_works_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"media_items_id" integer
  );
  
  CREATE TABLE "media_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"original_url" varchar,
  	"excerpt" varchar,
  	"editorial_body" jsonb,
  	"content_type" "enum_media_items_content_type",
  	"display_mode" "enum_media_items_display_mode" DEFAULT 'click_to_load_embed',
  	"aspect_ratio" "enum_media_items_aspect_ratio",
  	"thumbnail_id" integer,
  	"thumbnail_alt" varchar,
  	"caption" varchar,
  	"source_published_at" timestamp(3) with time zone,
  	"duration_seconds" numeric,
  	"source_account_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"homepage_featured" boolean DEFAULT false,
  	"homepage_order" numeric DEFAULT 10,
  	"consent_status" "enum_media_items_consent_status" DEFAULT 'not_needed',
  	"content_permission_note" varchar,
  	"availability" "enum_media_items_availability" DEFAULT 'unchecked',
  	"last_verified_at" timestamp(3) with time zone,
  	"platform" varchar,
  	"provider_item_id" varchar,
  	"normalized_url" varchar,
  	"workflow_status" "enum_media_items_workflow_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"is_demo" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_media_items_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "media_items_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"events_id" integer
  );
  
  CREATE TABLE "_media_items_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_original_url" varchar,
  	"version_excerpt" varchar,
  	"version_editorial_body" jsonb,
  	"version_content_type" "enum__media_items_v_version_content_type",
  	"version_display_mode" "enum__media_items_v_version_display_mode" DEFAULT 'click_to_load_embed',
  	"version_aspect_ratio" "enum__media_items_v_version_aspect_ratio",
  	"version_thumbnail_id" integer,
  	"version_thumbnail_alt" varchar,
  	"version_caption" varchar,
  	"version_source_published_at" timestamp(3) with time zone,
  	"version_duration_seconds" numeric,
  	"version_source_account_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_homepage_featured" boolean DEFAULT false,
  	"version_homepage_order" numeric DEFAULT 10,
  	"version_consent_status" "enum__media_items_v_version_consent_status" DEFAULT 'not_needed',
  	"version_content_permission_note" varchar,
  	"version_availability" "enum__media_items_v_version_availability" DEFAULT 'unchecked',
  	"version_last_verified_at" timestamp(3) with time zone,
  	"version_platform" varchar,
  	"version_provider_item_id" varchar,
  	"version_normalized_url" varchar,
  	"version_workflow_status" "enum__media_items_v_version_workflow_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__media_items_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_media_items_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"events_id" integer
  );
  
  CREATE TABLE "social_accounts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" "enum_social_accounts_platform" NOT NULL,
  	"display_name" varchar NOT NULL,
  	"handle" varchar,
  	"profile_url" varchar NOT NULL,
  	"profile_image_id" integer,
  	"owner" "enum_social_accounts_owner" DEFAULT 'sekolah',
  	"verification_note" varchar,
  	"verified_by_school" boolean DEFAULT false,
  	"enabled" boolean DEFAULT true,
  	"show_in_footer" boolean DEFAULT true,
  	"show_on_contact" boolean DEFAULT true,
  	"show_on_media_page" boolean DEFAULT true,
  	"verified_at" timestamp(3) with time zone,
  	"verified_by_id" integer,
  	"order" numeric DEFAULT 10,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "admissions_cycles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documents_id" integer,
  	"media_items_id" integer
  );
  
  CREATE TABLE "_admissions_cycles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documents_id" integer,
  	"media_items_id" integer
  );
  
  CREATE TABLE "leads_interests" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_leads_interests",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "leads_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"at" timestamp(3) with time zone,
  	"by" varchar
  );
  
  CREATE TABLE "leads_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"actor" varchar,
  	"event" varchar
  );
  
  CREATE TABLE "leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar,
  	"parent_name" varchar NOT NULL,
  	"email" varchar,
  	"phone" varchar,
  	"phone_normalized" varchar,
  	"cycle_id" integer,
  	"target_year_label" varchar,
  	"student_name" varchar,
  	"origin_school" varchar,
  	"message" varchar,
  	"status" "enum_leads_status" DEFAULT 'new' NOT NULL,
  	"assignee_id" integer,
  	"next_follow_up_at" timestamp(3) with time zone,
  	"close_reason" "enum_leads_close_reason",
  	"converted_note" varchar,
  	"source" "enum_leads_source",
  	"possible_duplicate_of_id" integer,
  	"duplicate_reviewed" boolean DEFAULT false,
  	"is_test" boolean DEFAULT false,
  	"marketing_opt_in" boolean,
  	"consent_version" varchar,
  	"consent_at" timestamp(3) with time zone,
  	"idempotency_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "visit_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"kind" "enum_visit_sessions_kind" DEFAULT 'open_house' NOT NULL,
  	"session_status" "enum_visit_sessions_session_status" DEFAULT 'draft' NOT NULL,
  	"start_at" timestamp(3) with time zone NOT NULL,
  	"startat_tz" "enum_visit_sessions_startat_tz" DEFAULT 'Asia/Makassar' NOT NULL,
  	"end_at" timestamp(3) with time zone,
  	"endat_tz" "enum_visit_sessions_endat_tz" DEFAULT 'Asia/Makassar',
  	"location" varchar,
  	"capacity" numeric NOT NULL,
  	"capacity_unit" "enum_visit_sessions_capacity_unit" DEFAULT 'families' NOT NULL,
  	"booked_count" numeric DEFAULT 0,
  	"booking_deadline" timestamp(3) with time zone,
  	"requires_confirmation" boolean DEFAULT true,
  	"hold_hours" numeric DEFAULT 48,
  	"instructions" varchar,
  	"guide_id" integer,
  	"cycle_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "visit_bookings_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"actor" varchar,
  	"event" varchar
  );
  
  CREATE TABLE "visit_bookings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar,
  	"session_id" integer NOT NULL,
  	"status" "enum_visit_bookings_status" DEFAULT 'pending' NOT NULL,
  	"participants" numeric DEFAULT 1 NOT NULL,
  	"status_reason" varchar,
  	"parent_name" varchar NOT NULL,
  	"email" varchar,
  	"phone" varchar,
  	"phone_normalized" varchar,
  	"target_year_label" varchar,
  	"note" varchar,
  	"internal_note" varchar,
  	"lead_id" integer,
  	"hold_expires_at" timestamp(3) with time zone,
  	"is_test" boolean DEFAULT false,
  	"consent_version" varchar,
  	"consent_at" timestamp(3) with time zone,
  	"cancel_token_hash" varchar,
  	"cancel_token_expires_at" timestamp(3) with time zone,
  	"idempotency_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "analytics_daily" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"day" varchar NOT NULL,
  	"kind" "enum_analytics_daily_kind" NOT NULL,
  	"key" varchar NOT NULL,
  	"count" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "feature_flags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"calendar_month_view" boolean DEFAULT true,
  	"interest_form" boolean DEFAULT false,
  	"school_visits" boolean DEFAULT false,
  	"student_works" boolean DEFAULT false,
  	"media_hub" boolean DEFAULT true,
  	"social_auto_import" boolean DEFAULT false,
  	"visitor_analytics" boolean DEFAULT false,
  	"full_admissions" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_feature_flags_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_calendar_month_view" boolean DEFAULT true,
  	"version_interest_form" boolean DEFAULT false,
  	"version_school_visits" boolean DEFAULT false,
  	"version_student_works" boolean DEFAULT false,
  	"version_media_hub" boolean DEFAULT true,
  	"version_social_auto_import" boolean DEFAULT false,
  	"version_visitor_analytics" boolean DEFAULT false,
  	"version_full_admissions" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "posts_rels" ADD COLUMN "media_items_id" integer;
  ALTER TABLE "_posts_v_rels" ADD COLUMN "media_items_id" integer;
  ALTER TABLE "announcements" ADD COLUMN "related_event_id" integer;
  ALTER TABLE "_announcements_v" ADD COLUMN "version_related_event_id" integer;
  ALTER TABLE "events" ADD COLUMN "category_id" integer;
  ALTER TABLE "events" ADD COLUMN "sequence" numeric DEFAULT 0;
  ALTER TABLE "_events_v" ADD COLUMN "version_category_id" integer;
  ALTER TABLE "_events_v" ADD COLUMN "version_sequence" numeric DEFAULT 0;
  ALTER TABLE "documents" ADD COLUMN "review_due" timestamp(3) with time zone;
  ALTER TABLE "documents" ADD COLUMN "supersedes_id" integer;
  ALTER TABLE "_documents_v" ADD COLUMN "version_review_due" timestamp(3) with time zone;
  ALTER TABLE "_documents_v" ADD COLUMN "version_supersedes_id" integer;
  ALTER TABLE "services" ADD COLUMN "service_status" "enum_services_service_status" DEFAULT 'active';
  ALTER TABLE "services" ADD COLUMN "service_category" "enum_services_service_category" DEFAULT 'umum';
  ALTER TABLE "services" ADD COLUMN "verified_at" timestamp(3) with time zone;
  ALTER TABLE "_services_v" ADD COLUMN "version_service_status" "enum__services_v_version_service_status" DEFAULT 'active';
  ALTER TABLE "_services_v" ADD COLUMN "version_service_category" "enum__services_v_version_service_category" DEFAULT 'umum';
  ALTER TABLE "_services_v" ADD COLUMN "version_verified_at" timestamp(3) with time zone;
  ALTER TABLE "testimonials" ADD COLUMN "relation" "enum_testimonials_relation" DEFAULT 'alumni';
  ALTER TABLE "_testimonials_v" ADD COLUMN "version_relation" "enum__testimonials_v_version_relation" DEFAULT 'alumni';
  ALTER TABLE "programs_rels" ADD COLUMN "media_items_id" integer;
  ALTER TABLE "_programs_v_rels" ADD COLUMN "media_items_id" integer;
  ALTER TABLE "extracurriculars_rels" ADD COLUMN "media_items_id" integer;
  ALTER TABLE "_extracurriculars_v_rels" ADD COLUMN "media_items_id" integer;
  ALTER TABLE "facilities_rels" ADD COLUMN "media_items_id" integer;
  ALTER TABLE "_facilities_v_rels" ADD COLUMN "media_items_id" integer;
  ALTER TABLE "staff" ADD COLUMN "subjects" varchar;
  ALTER TABLE "staff" ADD COLUMN "active" boolean DEFAULT true;
  ALTER TABLE "_staff_v" ADD COLUMN "version_subjects" varchar;
  ALTER TABLE "_staff_v" ADD COLUMN "version_active" boolean DEFAULT true;
  ALTER TABLE "achievements_rels" ADD COLUMN "media_items_id" integer;
  ALTER TABLE "_achievements_v_rels" ADD COLUMN "media_items_id" integer;
  ALTER TABLE "admissions_cycles_waves" ADD COLUMN "capacity" numeric;
  ALTER TABLE "admissions_cycles_waves" ADD COLUMN "wave_status" "enum_admissions_cycles_waves_wave_status" DEFAULT 'unconfirmed';
  ALTER TABLE "admissions_cycles" ADD COLUMN "mode" "enum_admissions_cycles_mode" DEFAULT 'information_only';
  ALTER TABLE "admissions_cycles" ADD COLUMN "levels" varchar;
  ALTER TABLE "admissions_cycles" ADD COLUMN "interest_form_enabled" boolean DEFAULT false;
  ALTER TABLE "admissions_cycles" ADD COLUMN "closed_offer" "enum_admissions_cycles_closed_offer" DEFAULT 'contact';
  ALTER TABLE "_admissions_cycles_v_version_waves" ADD COLUMN "capacity" numeric;
  ALTER TABLE "_admissions_cycles_v_version_waves" ADD COLUMN "wave_status" "enum__admissions_cycles_v_version_waves_wave_status" DEFAULT 'unconfirmed';
  ALTER TABLE "_admissions_cycles_v" ADD COLUMN "version_mode" "enum__admissions_cycles_v_version_mode" DEFAULT 'information_only';
  ALTER TABLE "_admissions_cycles_v" ADD COLUMN "version_levels" varchar;
  ALTER TABLE "_admissions_cycles_v" ADD COLUMN "version_interest_form_enabled" boolean DEFAULT false;
  ALTER TABLE "_admissions_cycles_v" ADD COLUMN "version_closed_offer" "enum__admissions_cycles_v_version_closed_offer" DEFAULT 'contact';
  ALTER TABLE "contact_messages" ADD COLUMN "topic" varchar;
  ALTER TABLE "contact_messages" ADD COLUMN "linked_lead_id" integer;
  ALTER TABLE "users" ADD COLUMN "can_access_leads" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "can_export_leads" boolean DEFAULT false;
  ALTER TABLE "audit_logs" ADD COLUMN "changed_fields" varchar;
  ALTER TABLE "payload_jobs" ADD COLUMN "meta" jsonb;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "event_categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "faqs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "student_works_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "media_items_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "social_accounts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "leads_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "visit_sessions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "visit_bookings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "analytics_daily_id" integer;
  ALTER TABLE "homepage" ADD COLUMN "texts_media_eyebrow" varchar DEFAULT 'KPS TV';
  ALTER TABLE "homepage" ADD COLUMN "texts_media_heading" varchar DEFAULT 'KPS TV & Cerita Digital';
  ALTER TABLE "homepage" ADD COLUMN "texts_media_intro" varchar DEFAULT 'Kenali kehidupan sekolah melalui video, podcast, dan cerita dari komunitas KPS.';
  ALTER TABLE "_homepage_v" ADD COLUMN "version_texts_media_eyebrow" varchar DEFAULT 'KPS TV';
  ALTER TABLE "_homepage_v" ADD COLUMN "version_texts_media_heading" varchar DEFAULT 'KPS TV & Cerita Digital';
  ALTER TABLE "_homepage_v" ADD COLUMN "version_texts_media_intro" varchar DEFAULT 'Kenali kehidupan sekolah melalui video, podcast, dan cerita dari komunitas KPS.';
  ALTER TABLE "pages_blocks_highlight_banner" ADD CONSTRAINT "pages_blocks_highlight_banner_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_highlight_banner" ADD CONSTRAINT "pages_blocks_highlight_banner_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_highlight_banner" ADD CONSTRAINT "pages_blocks_highlight_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_block" ADD CONSTRAINT "pages_blocks_faq_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_events_block" ADD CONSTRAINT "pages_blocks_events_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_block" ADD CONSTRAINT "pages_blocks_media_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_works_block" ADD CONSTRAINT "pages_blocks_works_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_guide_block" ADD CONSTRAINT "pages_blocks_guide_block_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_guide_block" ADD CONSTRAINT "pages_blocks_guide_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_admissions_cta" ADD CONSTRAINT "pages_blocks_admissions_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_student_works_fk" FOREIGN KEY ("student_works_id") REFERENCES "public"."student_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_highlight_banner" ADD CONSTRAINT "_pages_v_blocks_highlight_banner_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_highlight_banner" ADD CONSTRAINT "_pages_v_blocks_highlight_banner_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_highlight_banner" ADD CONSTRAINT "_pages_v_blocks_highlight_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_block" ADD CONSTRAINT "_pages_v_blocks_faq_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_events_block" ADD CONSTRAINT "_pages_v_blocks_events_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_block" ADD CONSTRAINT "_pages_v_blocks_media_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_works_block" ADD CONSTRAINT "_pages_v_blocks_works_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_guide_block" ADD CONSTRAINT "_pages_v_blocks_guide_block_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_guide_block" ADD CONSTRAINT "_pages_v_blocks_guide_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_admissions_cta" ADD CONSTRAINT "_pages_v_blocks_admissions_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_student_works_fk" FOREIGN KEY ("student_works_id") REFERENCES "public"."student_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_audience" ADD CONSTRAINT "events_audience_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_audience" ADD CONSTRAINT "_events_v_version_audience_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faqs" ADD CONSTRAINT "faqs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faqs" ADD CONSTRAINT "faqs_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faqs_v" ADD CONSTRAINT "_faqs_v_parent_id_faqs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."faqs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faqs_v" ADD CONSTRAINT "_faqs_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faqs_v" ADD CONSTRAINT "_faqs_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "programs_activities" ADD CONSTRAINT "programs_activities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_programs_v_version_activities" ADD CONSTRAINT "_programs_v_version_activities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_programs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "extracurriculars_activities" ADD CONSTRAINT "extracurriculars_activities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."extracurriculars"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_extracurriculars_v_version_activities" ADD CONSTRAINT "_extracurriculars_v_version_activities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_extracurriculars_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "facilities_activities" ADD CONSTRAINT "facilities_activities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_facilities_v_version_activities" ADD CONSTRAINT "_facilities_v_version_activities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_facilities_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "student_works" ADD CONSTRAINT "student_works_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "student_works" ADD CONSTRAINT "student_works_consent_record_id_private_files_id_fk" FOREIGN KEY ("consent_record_id") REFERENCES "public"."private_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "student_works" ADD CONSTRAINT "student_works_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "student_works" ADD CONSTRAINT "student_works_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "student_works_rels" ADD CONSTRAINT "student_works_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."student_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "student_works_rels" ADD CONSTRAINT "student_works_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "student_works_rels" ADD CONSTRAINT "student_works_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_student_works_v" ADD CONSTRAINT "_student_works_v_parent_id_student_works_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."student_works"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_student_works_v" ADD CONSTRAINT "_student_works_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_student_works_v" ADD CONSTRAINT "_student_works_v_version_consent_record_id_private_files_id_fk" FOREIGN KEY ("version_consent_record_id") REFERENCES "public"."private_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_student_works_v" ADD CONSTRAINT "_student_works_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_student_works_v" ADD CONSTRAINT "_student_works_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_student_works_v_rels" ADD CONSTRAINT "_student_works_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_student_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_student_works_v_rels" ADD CONSTRAINT "_student_works_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_student_works_v_rels" ADD CONSTRAINT "_student_works_v_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_items" ADD CONSTRAINT "media_items_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_items" ADD CONSTRAINT "media_items_source_account_id_social_accounts_id_fk" FOREIGN KEY ("source_account_id") REFERENCES "public"."social_accounts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_items" ADD CONSTRAINT "media_items_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_items" ADD CONSTRAINT "media_items_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_items_rels" ADD CONSTRAINT "media_items_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_items_rels" ADD CONSTRAINT "media_items_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_items_v" ADD CONSTRAINT "_media_items_v_parent_id_media_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_items_v" ADD CONSTRAINT "_media_items_v_version_thumbnail_id_media_id_fk" FOREIGN KEY ("version_thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_items_v" ADD CONSTRAINT "_media_items_v_version_source_account_id_social_accounts_id_fk" FOREIGN KEY ("version_source_account_id") REFERENCES "public"."social_accounts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_items_v" ADD CONSTRAINT "_media_items_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_items_v" ADD CONSTRAINT "_media_items_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_items_v_rels" ADD CONSTRAINT "_media_items_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_media_items_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_items_v_rels" ADD CONSTRAINT "_media_items_v_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_profile_image_id_media_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "admissions_cycles_rels" ADD CONSTRAINT "admissions_cycles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admissions_cycles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admissions_cycles_rels" ADD CONSTRAINT "admissions_cycles_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admissions_cycles_rels" ADD CONSTRAINT "admissions_cycles_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_admissions_cycles_v_rels" ADD CONSTRAINT "_admissions_cycles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_admissions_cycles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_admissions_cycles_v_rels" ADD CONSTRAINT "_admissions_cycles_v_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_admissions_cycles_v_rels" ADD CONSTRAINT "_admissions_cycles_v_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads_interests" ADD CONSTRAINT "leads_interests_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads_notes" ADD CONSTRAINT "leads_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads_history" ADD CONSTRAINT "leads_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_cycle_id_admissions_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."admissions_cycles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_possible_duplicate_of_id_leads_id_fk" FOREIGN KEY ("possible_duplicate_of_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_guide_id_users_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_cycle_id_admissions_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."admissions_cycles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visit_bookings_history" ADD CONSTRAINT "visit_bookings_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."visit_bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "visit_bookings" ADD CONSTRAINT "visit_bookings_session_id_visit_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visit_sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "visit_bookings" ADD CONSTRAINT "visit_bookings_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_highlight_banner_order_idx" ON "pages_blocks_highlight_banner" USING btree ("_order");
  CREATE INDEX "pages_blocks_highlight_banner_parent_id_idx" ON "pages_blocks_highlight_banner" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_highlight_banner_path_idx" ON "pages_blocks_highlight_banner" USING btree ("_path");
  CREATE INDEX "pages_blocks_highlight_banner_image_idx" ON "pages_blocks_highlight_banner" USING btree ("image_id");
  CREATE INDEX "pages_blocks_highlight_banner_post_idx" ON "pages_blocks_highlight_banner" USING btree ("post_id");
  CREATE INDEX "pages_blocks_faq_block_order_idx" ON "pages_blocks_faq_block" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_block_parent_id_idx" ON "pages_blocks_faq_block" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_block_path_idx" ON "pages_blocks_faq_block" USING btree ("_path");
  CREATE INDEX "pages_blocks_events_block_order_idx" ON "pages_blocks_events_block" USING btree ("_order");
  CREATE INDEX "pages_blocks_events_block_parent_id_idx" ON "pages_blocks_events_block" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_events_block_path_idx" ON "pages_blocks_events_block" USING btree ("_path");
  CREATE INDEX "pages_blocks_media_block_order_idx" ON "pages_blocks_media_block" USING btree ("_order");
  CREATE INDEX "pages_blocks_media_block_parent_id_idx" ON "pages_blocks_media_block" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_media_block_path_idx" ON "pages_blocks_media_block" USING btree ("_path");
  CREATE INDEX "pages_blocks_works_block_order_idx" ON "pages_blocks_works_block" USING btree ("_order");
  CREATE INDEX "pages_blocks_works_block_parent_id_idx" ON "pages_blocks_works_block" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_works_block_path_idx" ON "pages_blocks_works_block" USING btree ("_path");
  CREATE INDEX "pages_blocks_guide_block_order_idx" ON "pages_blocks_guide_block" USING btree ("_order");
  CREATE INDEX "pages_blocks_guide_block_parent_id_idx" ON "pages_blocks_guide_block" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_guide_block_path_idx" ON "pages_blocks_guide_block" USING btree ("_path");
  CREATE INDEX "pages_blocks_guide_block_guide_idx" ON "pages_blocks_guide_block" USING btree ("guide_id");
  CREATE INDEX "pages_blocks_admissions_cta_order_idx" ON "pages_blocks_admissions_cta" USING btree ("_order");
  CREATE INDEX "pages_blocks_admissions_cta_parent_id_idx" ON "pages_blocks_admissions_cta" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_admissions_cta_path_idx" ON "pages_blocks_admissions_cta" USING btree ("_path");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_faqs_id_idx" ON "pages_rels" USING btree ("faqs_id");
  CREATE INDEX "pages_rels_events_id_idx" ON "pages_rels" USING btree ("events_id");
  CREATE INDEX "pages_rels_media_items_id_idx" ON "pages_rels" USING btree ("media_items_id");
  CREATE INDEX "pages_rels_student_works_id_idx" ON "pages_rels" USING btree ("student_works_id");
  CREATE INDEX "_pages_v_blocks_highlight_banner_order_idx" ON "_pages_v_blocks_highlight_banner" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_highlight_banner_parent_id_idx" ON "_pages_v_blocks_highlight_banner" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_highlight_banner_path_idx" ON "_pages_v_blocks_highlight_banner" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_highlight_banner_image_idx" ON "_pages_v_blocks_highlight_banner" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_highlight_banner_post_idx" ON "_pages_v_blocks_highlight_banner" USING btree ("post_id");
  CREATE INDEX "_pages_v_blocks_faq_block_order_idx" ON "_pages_v_blocks_faq_block" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_block_parent_id_idx" ON "_pages_v_blocks_faq_block" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_block_path_idx" ON "_pages_v_blocks_faq_block" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_events_block_order_idx" ON "_pages_v_blocks_events_block" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_events_block_parent_id_idx" ON "_pages_v_blocks_events_block" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_events_block_path_idx" ON "_pages_v_blocks_events_block" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_media_block_order_idx" ON "_pages_v_blocks_media_block" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_media_block_parent_id_idx" ON "_pages_v_blocks_media_block" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_media_block_path_idx" ON "_pages_v_blocks_media_block" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_works_block_order_idx" ON "_pages_v_blocks_works_block" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_works_block_parent_id_idx" ON "_pages_v_blocks_works_block" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_works_block_path_idx" ON "_pages_v_blocks_works_block" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_guide_block_order_idx" ON "_pages_v_blocks_guide_block" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_guide_block_parent_id_idx" ON "_pages_v_blocks_guide_block" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_guide_block_path_idx" ON "_pages_v_blocks_guide_block" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_guide_block_guide_idx" ON "_pages_v_blocks_guide_block" USING btree ("guide_id");
  CREATE INDEX "_pages_v_blocks_admissions_cta_order_idx" ON "_pages_v_blocks_admissions_cta" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_admissions_cta_parent_id_idx" ON "_pages_v_blocks_admissions_cta" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_admissions_cta_path_idx" ON "_pages_v_blocks_admissions_cta" USING btree ("_path");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_faqs_id_idx" ON "_pages_v_rels" USING btree ("faqs_id");
  CREATE INDEX "_pages_v_rels_events_id_idx" ON "_pages_v_rels" USING btree ("events_id");
  CREATE INDEX "_pages_v_rels_media_items_id_idx" ON "_pages_v_rels" USING btree ("media_items_id");
  CREATE INDEX "_pages_v_rels_student_works_id_idx" ON "_pages_v_rels" USING btree ("student_works_id");
  CREATE INDEX "events_audience_order_idx" ON "events_audience" USING btree ("order");
  CREATE INDEX "events_audience_parent_idx" ON "events_audience" USING btree ("parent_id");
  CREATE INDEX "events_audience_value_idx" ON "events_audience" USING btree ("value");
  CREATE INDEX "events_rels_order_idx" ON "events_rels" USING btree ("order");
  CREATE INDEX "events_rels_parent_idx" ON "events_rels" USING btree ("parent_id");
  CREATE INDEX "events_rels_path_idx" ON "events_rels" USING btree ("path");
  CREATE INDEX "events_rels_documents_id_idx" ON "events_rels" USING btree ("documents_id");
  CREATE INDEX "_events_v_version_audience_order_idx" ON "_events_v_version_audience" USING btree ("order");
  CREATE INDEX "_events_v_version_audience_parent_idx" ON "_events_v_version_audience" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_audience_value_idx" ON "_events_v_version_audience" USING btree ("value");
  CREATE INDEX "_events_v_rels_order_idx" ON "_events_v_rels" USING btree ("order");
  CREATE INDEX "_events_v_rels_parent_idx" ON "_events_v_rels" USING btree ("parent_id");
  CREATE INDEX "_events_v_rels_path_idx" ON "_events_v_rels" USING btree ("path");
  CREATE INDEX "_events_v_rels_documents_id_idx" ON "_events_v_rels" USING btree ("documents_id");
  CREATE UNIQUE INDEX "event_categories_slug_idx" ON "event_categories" USING btree ("slug");
  CREATE INDEX "event_categories_updated_at_idx" ON "event_categories" USING btree ("updated_at");
  CREATE INDEX "event_categories_created_at_idx" ON "event_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "faqs_slug_idx" ON "faqs" USING btree ("slug");
  CREATE INDEX "faqs_category_idx" ON "faqs" USING btree ("category");
  CREATE INDEX "faqs_workflow_status_idx" ON "faqs" USING btree ("workflow_status");
  CREATE INDEX "faqs_is_demo_idx" ON "faqs" USING btree ("is_demo");
  CREATE INDEX "faqs_created_by_idx" ON "faqs" USING btree ("created_by_id");
  CREATE INDEX "faqs_updated_by_idx" ON "faqs" USING btree ("updated_by_id");
  CREATE INDEX "faqs_updated_at_idx" ON "faqs" USING btree ("updated_at");
  CREATE INDEX "faqs_created_at_idx" ON "faqs" USING btree ("created_at");
  CREATE INDEX "faqs_deleted_at_idx" ON "faqs" USING btree ("deleted_at");
  CREATE INDEX "faqs__status_idx" ON "faqs" USING btree ("_status");
  CREATE INDEX "_faqs_v_parent_idx" ON "_faqs_v" USING btree ("parent_id");
  CREATE INDEX "_faqs_v_version_version_slug_idx" ON "_faqs_v" USING btree ("version_slug");
  CREATE INDEX "_faqs_v_version_version_category_idx" ON "_faqs_v" USING btree ("version_category");
  CREATE INDEX "_faqs_v_version_version_workflow_status_idx" ON "_faqs_v" USING btree ("version_workflow_status");
  CREATE INDEX "_faqs_v_version_version_is_demo_idx" ON "_faqs_v" USING btree ("version_is_demo");
  CREATE INDEX "_faqs_v_version_version_created_by_idx" ON "_faqs_v" USING btree ("version_created_by_id");
  CREATE INDEX "_faqs_v_version_version_updated_by_idx" ON "_faqs_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_faqs_v_version_version_updated_at_idx" ON "_faqs_v" USING btree ("version_updated_at");
  CREATE INDEX "_faqs_v_version_version_created_at_idx" ON "_faqs_v" USING btree ("version_created_at");
  CREATE INDEX "_faqs_v_version_version_deleted_at_idx" ON "_faqs_v" USING btree ("version_deleted_at");
  CREATE INDEX "_faqs_v_version_version__status_idx" ON "_faqs_v" USING btree ("version__status");
  CREATE INDEX "_faqs_v_created_at_idx" ON "_faqs_v" USING btree ("created_at");
  CREATE INDEX "_faqs_v_updated_at_idx" ON "_faqs_v" USING btree ("updated_at");
  CREATE INDEX "_faqs_v_latest_idx" ON "_faqs_v" USING btree ("latest");
  CREATE INDEX "programs_activities_order_idx" ON "programs_activities" USING btree ("_order");
  CREATE INDEX "programs_activities_parent_id_idx" ON "programs_activities" USING btree ("_parent_id");
  CREATE INDEX "_programs_v_version_activities_order_idx" ON "_programs_v_version_activities" USING btree ("_order");
  CREATE INDEX "_programs_v_version_activities_parent_id_idx" ON "_programs_v_version_activities" USING btree ("_parent_id");
  CREATE INDEX "extracurriculars_activities_order_idx" ON "extracurriculars_activities" USING btree ("_order");
  CREATE INDEX "extracurriculars_activities_parent_id_idx" ON "extracurriculars_activities" USING btree ("_parent_id");
  CREATE INDEX "_extracurriculars_v_version_activities_order_idx" ON "_extracurriculars_v_version_activities" USING btree ("_order");
  CREATE INDEX "_extracurriculars_v_version_activities_parent_id_idx" ON "_extracurriculars_v_version_activities" USING btree ("_parent_id");
  CREATE INDEX "facilities_activities_order_idx" ON "facilities_activities" USING btree ("_order");
  CREATE INDEX "facilities_activities_parent_id_idx" ON "facilities_activities" USING btree ("_parent_id");
  CREATE INDEX "_facilities_v_version_activities_order_idx" ON "_facilities_v_version_activities" USING btree ("_order");
  CREATE INDEX "_facilities_v_version_activities_parent_id_idx" ON "_facilities_v_version_activities" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "student_works_slug_idx" ON "student_works" USING btree ("slug");
  CREATE INDEX "student_works_category_idx" ON "student_works" USING btree ("category");
  CREATE INDEX "student_works_year_idx" ON "student_works" USING btree ("year");
  CREATE INDEX "student_works_cover_idx" ON "student_works" USING btree ("cover_id");
  CREATE INDEX "student_works_consent_status_idx" ON "student_works" USING btree ("consent_status");
  CREATE INDEX "student_works_consent_record_idx" ON "student_works" USING btree ("consent_record_id");
  CREATE INDEX "student_works_workflow_status_idx" ON "student_works" USING btree ("workflow_status");
  CREATE INDEX "student_works_is_demo_idx" ON "student_works" USING btree ("is_demo");
  CREATE INDEX "student_works_created_by_idx" ON "student_works" USING btree ("created_by_id");
  CREATE INDEX "student_works_updated_by_idx" ON "student_works" USING btree ("updated_by_id");
  CREATE INDEX "student_works_updated_at_idx" ON "student_works" USING btree ("updated_at");
  CREATE INDEX "student_works_created_at_idx" ON "student_works" USING btree ("created_at");
  CREATE INDEX "student_works_deleted_at_idx" ON "student_works" USING btree ("deleted_at");
  CREATE INDEX "student_works__status_idx" ON "student_works" USING btree ("_status");
  CREATE INDEX "student_works_rels_order_idx" ON "student_works_rels" USING btree ("order");
  CREATE INDEX "student_works_rels_parent_idx" ON "student_works_rels" USING btree ("parent_id");
  CREATE INDEX "student_works_rels_path_idx" ON "student_works_rels" USING btree ("path");
  CREATE INDEX "student_works_rels_media_id_idx" ON "student_works_rels" USING btree ("media_id");
  CREATE INDEX "student_works_rels_media_items_id_idx" ON "student_works_rels" USING btree ("media_items_id");
  CREATE INDEX "_student_works_v_parent_idx" ON "_student_works_v" USING btree ("parent_id");
  CREATE INDEX "_student_works_v_version_version_slug_idx" ON "_student_works_v" USING btree ("version_slug");
  CREATE INDEX "_student_works_v_version_version_category_idx" ON "_student_works_v" USING btree ("version_category");
  CREATE INDEX "_student_works_v_version_version_year_idx" ON "_student_works_v" USING btree ("version_year");
  CREATE INDEX "_student_works_v_version_version_cover_idx" ON "_student_works_v" USING btree ("version_cover_id");
  CREATE INDEX "_student_works_v_version_version_consent_status_idx" ON "_student_works_v" USING btree ("version_consent_status");
  CREATE INDEX "_student_works_v_version_version_consent_record_idx" ON "_student_works_v" USING btree ("version_consent_record_id");
  CREATE INDEX "_student_works_v_version_version_workflow_status_idx" ON "_student_works_v" USING btree ("version_workflow_status");
  CREATE INDEX "_student_works_v_version_version_is_demo_idx" ON "_student_works_v" USING btree ("version_is_demo");
  CREATE INDEX "_student_works_v_version_version_created_by_idx" ON "_student_works_v" USING btree ("version_created_by_id");
  CREATE INDEX "_student_works_v_version_version_updated_by_idx" ON "_student_works_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_student_works_v_version_version_updated_at_idx" ON "_student_works_v" USING btree ("version_updated_at");
  CREATE INDEX "_student_works_v_version_version_created_at_idx" ON "_student_works_v" USING btree ("version_created_at");
  CREATE INDEX "_student_works_v_version_version_deleted_at_idx" ON "_student_works_v" USING btree ("version_deleted_at");
  CREATE INDEX "_student_works_v_version_version__status_idx" ON "_student_works_v" USING btree ("version__status");
  CREATE INDEX "_student_works_v_created_at_idx" ON "_student_works_v" USING btree ("created_at");
  CREATE INDEX "_student_works_v_updated_at_idx" ON "_student_works_v" USING btree ("updated_at");
  CREATE INDEX "_student_works_v_latest_idx" ON "_student_works_v" USING btree ("latest");
  CREATE INDEX "_student_works_v_rels_order_idx" ON "_student_works_v_rels" USING btree ("order");
  CREATE INDEX "_student_works_v_rels_parent_idx" ON "_student_works_v_rels" USING btree ("parent_id");
  CREATE INDEX "_student_works_v_rels_path_idx" ON "_student_works_v_rels" USING btree ("path");
  CREATE INDEX "_student_works_v_rels_media_id_idx" ON "_student_works_v_rels" USING btree ("media_id");
  CREATE INDEX "_student_works_v_rels_media_items_id_idx" ON "_student_works_v_rels" USING btree ("media_items_id");
  CREATE UNIQUE INDEX "media_items_slug_idx" ON "media_items" USING btree ("slug");
  CREATE INDEX "media_items_thumbnail_idx" ON "media_items" USING btree ("thumbnail_id");
  CREATE INDEX "media_items_source_published_at_idx" ON "media_items" USING btree ("source_published_at");
  CREATE INDEX "media_items_source_account_idx" ON "media_items" USING btree ("source_account_id");
  CREATE INDEX "media_items_homepage_featured_idx" ON "media_items" USING btree ("homepage_featured");
  CREATE UNIQUE INDEX "media_items_normalized_url_idx" ON "media_items" USING btree ("normalized_url");
  CREATE INDEX "media_items_workflow_status_idx" ON "media_items" USING btree ("workflow_status");
  CREATE INDEX "media_items_is_demo_idx" ON "media_items" USING btree ("is_demo");
  CREATE INDEX "media_items_created_by_idx" ON "media_items" USING btree ("created_by_id");
  CREATE INDEX "media_items_updated_by_idx" ON "media_items" USING btree ("updated_by_id");
  CREATE INDEX "media_items_updated_at_idx" ON "media_items" USING btree ("updated_at");
  CREATE INDEX "media_items_created_at_idx" ON "media_items" USING btree ("created_at");
  CREATE INDEX "media_items_deleted_at_idx" ON "media_items" USING btree ("deleted_at");
  CREATE INDEX "media_items__status_idx" ON "media_items" USING btree ("_status");
  CREATE INDEX "media_items_rels_order_idx" ON "media_items_rels" USING btree ("order");
  CREATE INDEX "media_items_rels_parent_idx" ON "media_items_rels" USING btree ("parent_id");
  CREATE INDEX "media_items_rels_path_idx" ON "media_items_rels" USING btree ("path");
  CREATE INDEX "media_items_rels_events_id_idx" ON "media_items_rels" USING btree ("events_id");
  CREATE INDEX "_media_items_v_parent_idx" ON "_media_items_v" USING btree ("parent_id");
  CREATE INDEX "_media_items_v_version_version_slug_idx" ON "_media_items_v" USING btree ("version_slug");
  CREATE INDEX "_media_items_v_version_version_thumbnail_idx" ON "_media_items_v" USING btree ("version_thumbnail_id");
  CREATE INDEX "_media_items_v_version_version_source_published_at_idx" ON "_media_items_v" USING btree ("version_source_published_at");
  CREATE INDEX "_media_items_v_version_version_source_account_idx" ON "_media_items_v" USING btree ("version_source_account_id");
  CREATE INDEX "_media_items_v_version_version_homepage_featured_idx" ON "_media_items_v" USING btree ("version_homepage_featured");
  CREATE INDEX "_media_items_v_version_version_normalized_url_idx" ON "_media_items_v" USING btree ("version_normalized_url");
  CREATE INDEX "_media_items_v_version_version_workflow_status_idx" ON "_media_items_v" USING btree ("version_workflow_status");
  CREATE INDEX "_media_items_v_version_version_is_demo_idx" ON "_media_items_v" USING btree ("version_is_demo");
  CREATE INDEX "_media_items_v_version_version_created_by_idx" ON "_media_items_v" USING btree ("version_created_by_id");
  CREATE INDEX "_media_items_v_version_version_updated_by_idx" ON "_media_items_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_media_items_v_version_version_updated_at_idx" ON "_media_items_v" USING btree ("version_updated_at");
  CREATE INDEX "_media_items_v_version_version_created_at_idx" ON "_media_items_v" USING btree ("version_created_at");
  CREATE INDEX "_media_items_v_version_version_deleted_at_idx" ON "_media_items_v" USING btree ("version_deleted_at");
  CREATE INDEX "_media_items_v_version_version__status_idx" ON "_media_items_v" USING btree ("version__status");
  CREATE INDEX "_media_items_v_created_at_idx" ON "_media_items_v" USING btree ("created_at");
  CREATE INDEX "_media_items_v_updated_at_idx" ON "_media_items_v" USING btree ("updated_at");
  CREATE INDEX "_media_items_v_latest_idx" ON "_media_items_v" USING btree ("latest");
  CREATE INDEX "_media_items_v_rels_order_idx" ON "_media_items_v_rels" USING btree ("order");
  CREATE INDEX "_media_items_v_rels_parent_idx" ON "_media_items_v_rels" USING btree ("parent_id");
  CREATE INDEX "_media_items_v_rels_path_idx" ON "_media_items_v_rels" USING btree ("path");
  CREATE INDEX "_media_items_v_rels_events_id_idx" ON "_media_items_v_rels" USING btree ("events_id");
  CREATE INDEX "social_accounts_profile_image_idx" ON "social_accounts" USING btree ("profile_image_id");
  CREATE INDEX "social_accounts_verified_by_idx" ON "social_accounts" USING btree ("verified_by_id");
  CREATE INDEX "social_accounts_updated_at_idx" ON "social_accounts" USING btree ("updated_at");
  CREATE INDEX "social_accounts_created_at_idx" ON "social_accounts" USING btree ("created_at");
  CREATE INDEX "admissions_cycles_rels_order_idx" ON "admissions_cycles_rels" USING btree ("order");
  CREATE INDEX "admissions_cycles_rels_parent_idx" ON "admissions_cycles_rels" USING btree ("parent_id");
  CREATE INDEX "admissions_cycles_rels_path_idx" ON "admissions_cycles_rels" USING btree ("path");
  CREATE INDEX "admissions_cycles_rels_documents_id_idx" ON "admissions_cycles_rels" USING btree ("documents_id");
  CREATE INDEX "admissions_cycles_rels_media_items_id_idx" ON "admissions_cycles_rels" USING btree ("media_items_id");
  CREATE INDEX "_admissions_cycles_v_rels_order_idx" ON "_admissions_cycles_v_rels" USING btree ("order");
  CREATE INDEX "_admissions_cycles_v_rels_parent_idx" ON "_admissions_cycles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_admissions_cycles_v_rels_path_idx" ON "_admissions_cycles_v_rels" USING btree ("path");
  CREATE INDEX "_admissions_cycles_v_rels_documents_id_idx" ON "_admissions_cycles_v_rels" USING btree ("documents_id");
  CREATE INDEX "_admissions_cycles_v_rels_media_items_id_idx" ON "_admissions_cycles_v_rels" USING btree ("media_items_id");
  CREATE INDEX "leads_interests_order_idx" ON "leads_interests" USING btree ("order");
  CREATE INDEX "leads_interests_parent_idx" ON "leads_interests" USING btree ("parent_id");
  CREATE INDEX "leads_notes_order_idx" ON "leads_notes" USING btree ("_order");
  CREATE INDEX "leads_notes_parent_id_idx" ON "leads_notes" USING btree ("_parent_id");
  CREATE INDEX "leads_history_order_idx" ON "leads_history" USING btree ("_order");
  CREATE INDEX "leads_history_parent_id_idx" ON "leads_history" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "leads_reference_idx" ON "leads" USING btree ("reference");
  CREATE INDEX "leads_phone_normalized_idx" ON "leads" USING btree ("phone_normalized");
  CREATE INDEX "leads_cycle_idx" ON "leads" USING btree ("cycle_id");
  CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");
  CREATE INDEX "leads_assignee_idx" ON "leads" USING btree ("assignee_id");
  CREATE INDEX "leads_next_follow_up_at_idx" ON "leads" USING btree ("next_follow_up_at");
  CREATE INDEX "leads_source_idx" ON "leads" USING btree ("source");
  CREATE INDEX "leads_possible_duplicate_of_idx" ON "leads" USING btree ("possible_duplicate_of_id");
  CREATE INDEX "leads_is_test_idx" ON "leads" USING btree ("is_test");
  CREATE UNIQUE INDEX "leads_idempotency_key_idx" ON "leads" USING btree ("idempotency_key");
  CREATE INDEX "leads_updated_at_idx" ON "leads" USING btree ("updated_at");
  CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");
  CREATE INDEX "visit_sessions_session_status_idx" ON "visit_sessions" USING btree ("session_status");
  CREATE INDEX "visit_sessions_start_at_idx" ON "visit_sessions" USING btree ("start_at");
  CREATE INDEX "visit_sessions_guide_idx" ON "visit_sessions" USING btree ("guide_id");
  CREATE INDEX "visit_sessions_cycle_idx" ON "visit_sessions" USING btree ("cycle_id");
  CREATE INDEX "visit_sessions_updated_at_idx" ON "visit_sessions" USING btree ("updated_at");
  CREATE INDEX "visit_sessions_created_at_idx" ON "visit_sessions" USING btree ("created_at");
  CREATE INDEX "visit_bookings_history_order_idx" ON "visit_bookings_history" USING btree ("_order");
  CREATE INDEX "visit_bookings_history_parent_id_idx" ON "visit_bookings_history" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "visit_bookings_reference_idx" ON "visit_bookings" USING btree ("reference");
  CREATE INDEX "visit_bookings_session_idx" ON "visit_bookings" USING btree ("session_id");
  CREATE INDEX "visit_bookings_status_idx" ON "visit_bookings" USING btree ("status");
  CREATE INDEX "visit_bookings_phone_normalized_idx" ON "visit_bookings" USING btree ("phone_normalized");
  CREATE INDEX "visit_bookings_lead_idx" ON "visit_bookings" USING btree ("lead_id");
  CREATE INDEX "visit_bookings_cancel_token_hash_idx" ON "visit_bookings" USING btree ("cancel_token_hash");
  CREATE UNIQUE INDEX "visit_bookings_idempotency_key_idx" ON "visit_bookings" USING btree ("idempotency_key");
  CREATE INDEX "visit_bookings_updated_at_idx" ON "visit_bookings" USING btree ("updated_at");
  CREATE INDEX "visit_bookings_created_at_idx" ON "visit_bookings" USING btree ("created_at");
  CREATE INDEX "analytics_daily_day_idx" ON "analytics_daily" USING btree ("day");
  CREATE INDEX "analytics_daily_updated_at_idx" ON "analytics_daily" USING btree ("updated_at");
  CREATE INDEX "analytics_daily_created_at_idx" ON "analytics_daily" USING btree ("created_at");
  CREATE UNIQUE INDEX "day_kind_key_idx" ON "analytics_daily" USING btree ("day","kind","key");
  CREATE INDEX "_feature_flags_v_created_at_idx" ON "_feature_flags_v" USING btree ("created_at");
  CREATE INDEX "_feature_flags_v_updated_at_idx" ON "_feature_flags_v" USING btree ("updated_at");
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements" ADD CONSTRAINT "announcements_related_event_id_events_id_fk" FOREIGN KEY ("related_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_announcements_v" ADD CONSTRAINT "_announcements_v_version_related_event_id_events_id_fk" FOREIGN KEY ("version_related_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_category_id_event_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."event_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_category_id_event_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."event_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_supersedes_id_documents_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_version_supersedes_id_documents_id_fk" FOREIGN KEY ("version_supersedes_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "programs_rels" ADD CONSTRAINT "programs_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_programs_v_rels" ADD CONSTRAINT "_programs_v_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "extracurriculars_rels" ADD CONSTRAINT "extracurriculars_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_extracurriculars_v_rels" ADD CONSTRAINT "_extracurriculars_v_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "facilities_rels" ADD CONSTRAINT "facilities_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_facilities_v_rels" ADD CONSTRAINT "_facilities_v_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements_rels" ADD CONSTRAINT "achievements_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievements_v_rels" ADD CONSTRAINT "_achievements_v_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_linked_lead_id_leads_id_fk" FOREIGN KEY ("linked_lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_categories_fk" FOREIGN KEY ("event_categories_id") REFERENCES "public"."event_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_student_works_fk" FOREIGN KEY ("student_works_id") REFERENCES "public"."student_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_items_fk" FOREIGN KEY ("media_items_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_social_accounts_fk" FOREIGN KEY ("social_accounts_id") REFERENCES "public"."social_accounts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leads_fk" FOREIGN KEY ("leads_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_visit_sessions_fk" FOREIGN KEY ("visit_sessions_id") REFERENCES "public"."visit_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_visit_bookings_fk" FOREIGN KEY ("visit_bookings_id") REFERENCES "public"."visit_bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_analytics_daily_fk" FOREIGN KEY ("analytics_daily_id") REFERENCES "public"."analytics_daily"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_rels_media_items_id_idx" ON "posts_rels" USING btree ("media_items_id");
  CREATE INDEX "_posts_v_rels_media_items_id_idx" ON "_posts_v_rels" USING btree ("media_items_id");
  CREATE INDEX "announcements_related_event_idx" ON "announcements" USING btree ("related_event_id");
  CREATE INDEX "_announcements_v_version_version_related_event_idx" ON "_announcements_v" USING btree ("version_related_event_id");
  CREATE INDEX "events_category_idx" ON "events" USING btree ("category_id");
  CREATE INDEX "_events_v_version_version_category_idx" ON "_events_v" USING btree ("version_category_id");
  CREATE INDEX "documents_review_due_idx" ON "documents" USING btree ("review_due");
  CREATE INDEX "documents_supersedes_idx" ON "documents" USING btree ("supersedes_id");
  CREATE INDEX "_documents_v_version_version_review_due_idx" ON "_documents_v" USING btree ("version_review_due");
  CREATE INDEX "_documents_v_version_version_supersedes_idx" ON "_documents_v" USING btree ("version_supersedes_id");
  CREATE INDEX "programs_rels_media_items_id_idx" ON "programs_rels" USING btree ("media_items_id");
  CREATE INDEX "_programs_v_rels_media_items_id_idx" ON "_programs_v_rels" USING btree ("media_items_id");
  CREATE INDEX "extracurriculars_rels_media_items_id_idx" ON "extracurriculars_rels" USING btree ("media_items_id");
  CREATE INDEX "_extracurriculars_v_rels_media_items_id_idx" ON "_extracurriculars_v_rels" USING btree ("media_items_id");
  CREATE INDEX "facilities_rels_media_items_id_idx" ON "facilities_rels" USING btree ("media_items_id");
  CREATE INDEX "_facilities_v_rels_media_items_id_idx" ON "_facilities_v_rels" USING btree ("media_items_id");
  CREATE INDEX "staff_active_idx" ON "staff" USING btree ("active");
  CREATE INDEX "_staff_v_version_version_active_idx" ON "_staff_v" USING btree ("version_active");
  CREATE INDEX "achievements_rels_media_items_id_idx" ON "achievements_rels" USING btree ("media_items_id");
  CREATE INDEX "_achievements_v_rels_media_items_id_idx" ON "_achievements_v_rels" USING btree ("media_items_id");
  CREATE INDEX "contact_messages_linked_lead_idx" ON "contact_messages" USING btree ("linked_lead_id");
  CREATE INDEX "payload_locked_documents_rels_event_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("event_categories_id");
  CREATE INDEX "payload_locked_documents_rels_faqs_id_idx" ON "payload_locked_documents_rels" USING btree ("faqs_id");
  CREATE INDEX "payload_locked_documents_rels_student_works_id_idx" ON "payload_locked_documents_rels" USING btree ("student_works_id");
  CREATE INDEX "payload_locked_documents_rels_media_items_id_idx" ON "payload_locked_documents_rels" USING btree ("media_items_id");
  CREATE INDEX "payload_locked_documents_rels_social_accounts_id_idx" ON "payload_locked_documents_rels" USING btree ("social_accounts_id");
  CREATE INDEX "payload_locked_documents_rels_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("leads_id");
  CREATE INDEX "payload_locked_documents_rels_visit_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("visit_sessions_id");
  CREATE INDEX "payload_locked_documents_rels_visit_bookings_id_idx" ON "payload_locked_documents_rels" USING btree ("visit_bookings_id");
  CREATE INDEX "payload_locked_documents_rels_analytics_daily_id_idx" ON "payload_locked_documents_rels" USING btree ("analytics_daily_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_highlight_banner" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_events_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_media_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_works_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_guide_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_admissions_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_highlight_banner" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_events_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_media_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_works_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_guide_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_admissions_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_audience" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v_version_audience" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_faqs_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "programs_activities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_programs_v_version_activities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "extracurriculars_activities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_extracurriculars_v_version_activities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "facilities_activities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_facilities_v_version_activities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "student_works" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "student_works_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_student_works_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_student_works_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media_items_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_media_items_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_media_items_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "social_accounts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "admissions_cycles_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_admissions_cycles_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "leads_interests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "leads_notes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "leads_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "leads" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "visit_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "visit_bookings_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "visit_bookings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "analytics_daily" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "feature_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_feature_flags_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_stats" DISABLE ROW LEVEL SECURITY;
  DROP TABLE IF EXISTS "pages_blocks_highlight_banner" CASCADE;
  DROP TABLE IF EXISTS "pages_blocks_faq_block" CASCADE;
  DROP TABLE IF EXISTS "pages_blocks_events_block" CASCADE;
  DROP TABLE IF EXISTS "pages_blocks_media_block" CASCADE;
  DROP TABLE IF EXISTS "pages_blocks_works_block" CASCADE;
  DROP TABLE IF EXISTS "pages_blocks_guide_block" CASCADE;
  DROP TABLE IF EXISTS "pages_blocks_admissions_cta" CASCADE;
  DROP TABLE IF EXISTS "pages_rels" CASCADE;
  DROP TABLE IF EXISTS "_pages_v_blocks_highlight_banner" CASCADE;
  DROP TABLE IF EXISTS "_pages_v_blocks_faq_block" CASCADE;
  DROP TABLE IF EXISTS "_pages_v_blocks_events_block" CASCADE;
  DROP TABLE IF EXISTS "_pages_v_blocks_media_block" CASCADE;
  DROP TABLE IF EXISTS "_pages_v_blocks_works_block" CASCADE;
  DROP TABLE IF EXISTS "_pages_v_blocks_guide_block" CASCADE;
  DROP TABLE IF EXISTS "_pages_v_blocks_admissions_cta" CASCADE;
  DROP TABLE IF EXISTS "_pages_v_rels" CASCADE;
  DROP TABLE IF EXISTS "events_audience" CASCADE;
  DROP TABLE IF EXISTS "events_rels" CASCADE;
  DROP TABLE IF EXISTS "_events_v_version_audience" CASCADE;
  DROP TABLE IF EXISTS "_events_v_rels" CASCADE;
  DROP TABLE IF EXISTS "event_categories" CASCADE;
  DROP TABLE IF EXISTS "faqs" CASCADE;
  DROP TABLE IF EXISTS "_faqs_v" CASCADE;
  DROP TABLE IF EXISTS "programs_activities" CASCADE;
  DROP TABLE IF EXISTS "_programs_v_version_activities" CASCADE;
  DROP TABLE IF EXISTS "extracurriculars_activities" CASCADE;
  DROP TABLE IF EXISTS "_extracurriculars_v_version_activities" CASCADE;
  DROP TABLE IF EXISTS "facilities_activities" CASCADE;
  DROP TABLE IF EXISTS "_facilities_v_version_activities" CASCADE;
  DROP TABLE IF EXISTS "student_works" CASCADE;
  DROP TABLE IF EXISTS "student_works_rels" CASCADE;
  DROP TABLE IF EXISTS "_student_works_v" CASCADE;
  DROP TABLE IF EXISTS "_student_works_v_rels" CASCADE;
  DROP TABLE IF EXISTS "media_items" CASCADE;
  DROP TABLE IF EXISTS "media_items_rels" CASCADE;
  DROP TABLE IF EXISTS "_media_items_v" CASCADE;
  DROP TABLE IF EXISTS "_media_items_v_rels" CASCADE;
  DROP TABLE IF EXISTS "social_accounts" CASCADE;
  DROP TABLE IF EXISTS "admissions_cycles_rels" CASCADE;
  DROP TABLE IF EXISTS "_admissions_cycles_v_rels" CASCADE;
  DROP TABLE IF EXISTS "leads_interests" CASCADE;
  DROP TABLE IF EXISTS "leads_notes" CASCADE;
  DROP TABLE IF EXISTS "leads_history" CASCADE;
  DROP TABLE IF EXISTS "leads" CASCADE;
  DROP TABLE IF EXISTS "visit_sessions" CASCADE;
  DROP TABLE IF EXISTS "visit_bookings_history" CASCADE;
  DROP TABLE IF EXISTS "visit_bookings" CASCADE;
  DROP TABLE IF EXISTS "analytics_daily" CASCADE;
  DROP TABLE IF EXISTS "feature_flags" CASCADE;
  DROP TABLE IF EXISTS "_feature_flags_v" CASCADE;
  DROP TABLE IF EXISTS "payload_jobs_stats" CASCADE;
  ALTER TABLE "posts_rels" DROP CONSTRAINT IF EXISTS "posts_rels_media_items_fk";
  
  ALTER TABLE "_posts_v_rels" DROP CONSTRAINT IF EXISTS "_posts_v_rels_media_items_fk";
  
  ALTER TABLE "announcements" DROP CONSTRAINT IF EXISTS "announcements_related_event_id_events_id_fk";
  
  ALTER TABLE "_announcements_v" DROP CONSTRAINT IF EXISTS "_announcements_v_version_related_event_id_events_id_fk";
  
  ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_category_id_event_categories_id_fk";
  
  ALTER TABLE "_events_v" DROP CONSTRAINT IF EXISTS "_events_v_version_category_id_event_categories_id_fk";
  
  ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_supersedes_id_documents_id_fk";
  
  ALTER TABLE "_documents_v" DROP CONSTRAINT IF EXISTS "_documents_v_version_supersedes_id_documents_id_fk";
  
  ALTER TABLE "programs_rels" DROP CONSTRAINT IF EXISTS "programs_rels_media_items_fk";
  
  ALTER TABLE "_programs_v_rels" DROP CONSTRAINT IF EXISTS "_programs_v_rels_media_items_fk";
  
  ALTER TABLE "extracurriculars_rels" DROP CONSTRAINT IF EXISTS "extracurriculars_rels_media_items_fk";
  
  ALTER TABLE "_extracurriculars_v_rels" DROP CONSTRAINT IF EXISTS "_extracurriculars_v_rels_media_items_fk";
  
  ALTER TABLE "facilities_rels" DROP CONSTRAINT IF EXISTS "facilities_rels_media_items_fk";
  
  ALTER TABLE "_facilities_v_rels" DROP CONSTRAINT IF EXISTS "_facilities_v_rels_media_items_fk";
  
  ALTER TABLE "achievements_rels" DROP CONSTRAINT IF EXISTS "achievements_rels_media_items_fk";
  
  ALTER TABLE "_achievements_v_rels" DROP CONSTRAINT IF EXISTS "_achievements_v_rels_media_items_fk";
  
  ALTER TABLE "contact_messages" DROP CONSTRAINT IF EXISTS "contact_messages_linked_lead_id_leads_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_event_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_faqs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_student_works_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_media_items_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_social_accounts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_leads_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_visit_sessions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_visit_bookings_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_analytics_daily_fk";
  
  ALTER TABLE "announcements_audience" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE IF EXISTS "public"."enum_announcements_audience";
  CREATE TYPE "public"."enum_announcements_audience" AS ENUM('umum', 'orang_tua', 'siswa', 'alumni');
  ALTER TABLE "announcements_audience" ALTER COLUMN "value" SET DATA TYPE "public"."enum_announcements_audience" USING "value"::"public"."enum_announcements_audience";
  ALTER TABLE "_announcements_v_version_audience" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE IF EXISTS "public"."enum__announcements_v_version_audience";
  CREATE TYPE "public"."enum__announcements_v_version_audience" AS ENUM('umum', 'orang_tua', 'siswa', 'alumni');
  ALTER TABLE "_announcements_v_version_audience" ALTER COLUMN "value" SET DATA TYPE "public"."enum__announcements_v_version_audience" USING "value"::"public"."enum__announcements_v_version_audience";
  ALTER TABLE "staff" ALTER COLUMN "group" SET DATA TYPE text;
  ALTER TABLE "staff" ALTER COLUMN "group" SET DEFAULT 'pimpinan'::text;
  DROP TYPE IF EXISTS "public"."enum_staff_group";
  CREATE TYPE "public"."enum_staff_group" AS ENUM('pimpinan', 'guru', 'staf');
  ALTER TABLE "staff" ALTER COLUMN "group" SET DEFAULT 'pimpinan'::"public"."enum_staff_group";
  ALTER TABLE "staff" ALTER COLUMN "group" SET DATA TYPE "public"."enum_staff_group" USING "group"::"public"."enum_staff_group";
  ALTER TABLE "_staff_v" ALTER COLUMN "version_group" SET DATA TYPE text;
  ALTER TABLE "_staff_v" ALTER COLUMN "version_group" SET DEFAULT 'pimpinan'::text;
  DROP TYPE IF EXISTS "public"."enum__staff_v_version_group";
  CREATE TYPE "public"."enum__staff_v_version_group" AS ENUM('pimpinan', 'guru', 'staf');
  ALTER TABLE "_staff_v" ALTER COLUMN "version_group" SET DEFAULT 'pimpinan'::"public"."enum__staff_v_version_group";
  ALTER TABLE "_staff_v" ALTER COLUMN "version_group" SET DATA TYPE "public"."enum__staff_v_version_group" USING "version_group"::"public"."enum__staff_v_version_group";
  ALTER TABLE "contact_messages" ALTER COLUMN "category" SET DATA TYPE text;
  DROP TYPE IF EXISTS "public"."enum_contact_messages_category";
  CREATE TYPE "public"."enum_contact_messages_category" AS ENUM('umum', 'pendaftaran', 'akademik', 'saran', 'alumni');
  ALTER TABLE "contact_messages" ALTER COLUMN "category" SET DATA TYPE "public"."enum_contact_messages_category" USING "category"::"public"."enum_contact_messages_category";
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE IF EXISTS "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'schedulePublish');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE IF EXISTS "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'schedulePublish');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  ALTER TABLE "homepage_sections" ALTER COLUMN "type" SET DATA TYPE text;
  DROP TYPE IF EXISTS "public"."enum_homepage_sections_type";
  CREATE TYPE "public"."enum_homepage_sections_type" AS ENUM('quickLinks', 'search', 'highlights', 'schoolIntro', 'programs', 'studentLife', 'achievements', 'announcementsAgenda', 'latestNews', 'facilities', 'communityAlumni', 'admissionsCta');
  ALTER TABLE "homepage_sections" ALTER COLUMN "type" SET DATA TYPE "public"."enum_homepage_sections_type" USING "type"::"public"."enum_homepage_sections_type";
  ALTER TABLE "_homepage_v_version_sections" ALTER COLUMN "type" SET DATA TYPE text;
  DROP TYPE IF EXISTS "public"."enum__homepage_v_version_sections_type";
  CREATE TYPE "public"."enum__homepage_v_version_sections_type" AS ENUM('quickLinks', 'search', 'highlights', 'schoolIntro', 'programs', 'studentLife', 'achievements', 'announcementsAgenda', 'latestNews', 'facilities', 'communityAlumni', 'admissionsCta');
  ALTER TABLE "_homepage_v_version_sections" ALTER COLUMN "type" SET DATA TYPE "public"."enum__homepage_v_version_sections_type" USING "type"::"public"."enum__homepage_v_version_sections_type";
  DROP INDEX IF EXISTS "posts_rels_media_items_id_idx";
  DROP INDEX IF EXISTS "_posts_v_rels_media_items_id_idx";
  DROP INDEX IF EXISTS "announcements_related_event_idx";
  DROP INDEX IF EXISTS "_announcements_v_version_version_related_event_idx";
  DROP INDEX IF EXISTS "events_category_idx";
  DROP INDEX IF EXISTS "_events_v_version_version_category_idx";
  DROP INDEX IF EXISTS "documents_review_due_idx";
  DROP INDEX IF EXISTS "documents_supersedes_idx";
  DROP INDEX IF EXISTS "_documents_v_version_version_review_due_idx";
  DROP INDEX IF EXISTS "_documents_v_version_version_supersedes_idx";
  DROP INDEX IF EXISTS "programs_rels_media_items_id_idx";
  DROP INDEX IF EXISTS "_programs_v_rels_media_items_id_idx";
  DROP INDEX IF EXISTS "extracurriculars_rels_media_items_id_idx";
  DROP INDEX IF EXISTS "_extracurriculars_v_rels_media_items_id_idx";
  DROP INDEX IF EXISTS "facilities_rels_media_items_id_idx";
  DROP INDEX IF EXISTS "_facilities_v_rels_media_items_id_idx";
  DROP INDEX IF EXISTS "staff_active_idx";
  DROP INDEX IF EXISTS "_staff_v_version_version_active_idx";
  DROP INDEX IF EXISTS "achievements_rels_media_items_id_idx";
  DROP INDEX IF EXISTS "_achievements_v_rels_media_items_id_idx";
  DROP INDEX IF EXISTS "contact_messages_linked_lead_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_event_categories_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_faqs_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_student_works_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_media_items_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_social_accounts_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_leads_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_visit_sessions_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_visit_bookings_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_analytics_daily_id_idx";
  ALTER TABLE "posts_rels" DROP COLUMN IF EXISTS "media_items_id";
  ALTER TABLE "_posts_v_rels" DROP COLUMN IF EXISTS "media_items_id";
  ALTER TABLE "announcements" DROP COLUMN IF EXISTS "related_event_id";
  ALTER TABLE "_announcements_v" DROP COLUMN IF EXISTS "version_related_event_id";
  ALTER TABLE "events" DROP COLUMN IF EXISTS "category_id";
  ALTER TABLE "events" DROP COLUMN IF EXISTS "sequence";
  ALTER TABLE "_events_v" DROP COLUMN IF EXISTS "version_category_id";
  ALTER TABLE "_events_v" DROP COLUMN IF EXISTS "version_sequence";
  ALTER TABLE "documents" DROP COLUMN IF EXISTS "review_due";
  ALTER TABLE "documents" DROP COLUMN IF EXISTS "supersedes_id";
  ALTER TABLE "_documents_v" DROP COLUMN IF EXISTS "version_review_due";
  ALTER TABLE "_documents_v" DROP COLUMN IF EXISTS "version_supersedes_id";
  ALTER TABLE "services" DROP COLUMN IF EXISTS "service_status";
  ALTER TABLE "services" DROP COLUMN IF EXISTS "service_category";
  ALTER TABLE "services" DROP COLUMN IF EXISTS "verified_at";
  ALTER TABLE "_services_v" DROP COLUMN IF EXISTS "version_service_status";
  ALTER TABLE "_services_v" DROP COLUMN IF EXISTS "version_service_category";
  ALTER TABLE "_services_v" DROP COLUMN IF EXISTS "version_verified_at";
  ALTER TABLE "testimonials" DROP COLUMN IF EXISTS "relation";
  ALTER TABLE "_testimonials_v" DROP COLUMN IF EXISTS "version_relation";
  ALTER TABLE "programs_rels" DROP COLUMN IF EXISTS "media_items_id";
  ALTER TABLE "_programs_v_rels" DROP COLUMN IF EXISTS "media_items_id";
  ALTER TABLE "extracurriculars_rels" DROP COLUMN IF EXISTS "media_items_id";
  ALTER TABLE "_extracurriculars_v_rels" DROP COLUMN IF EXISTS "media_items_id";
  ALTER TABLE "facilities_rels" DROP COLUMN IF EXISTS "media_items_id";
  ALTER TABLE "_facilities_v_rels" DROP COLUMN IF EXISTS "media_items_id";
  ALTER TABLE "staff" DROP COLUMN IF EXISTS "subjects";
  ALTER TABLE "staff" DROP COLUMN IF EXISTS "active";
  ALTER TABLE "_staff_v" DROP COLUMN IF EXISTS "version_subjects";
  ALTER TABLE "_staff_v" DROP COLUMN IF EXISTS "version_active";
  ALTER TABLE "achievements_rels" DROP COLUMN IF EXISTS "media_items_id";
  ALTER TABLE "_achievements_v_rels" DROP COLUMN IF EXISTS "media_items_id";
  ALTER TABLE "admissions_cycles_waves" DROP COLUMN IF EXISTS "capacity";
  ALTER TABLE "admissions_cycles_waves" DROP COLUMN IF EXISTS "wave_status";
  ALTER TABLE "admissions_cycles" DROP COLUMN IF EXISTS "mode";
  ALTER TABLE "admissions_cycles" DROP COLUMN IF EXISTS "levels";
  ALTER TABLE "admissions_cycles" DROP COLUMN IF EXISTS "interest_form_enabled";
  ALTER TABLE "admissions_cycles" DROP COLUMN IF EXISTS "closed_offer";
  ALTER TABLE "_admissions_cycles_v_version_waves" DROP COLUMN IF EXISTS "capacity";
  ALTER TABLE "_admissions_cycles_v_version_waves" DROP COLUMN IF EXISTS "wave_status";
  ALTER TABLE "_admissions_cycles_v" DROP COLUMN IF EXISTS "version_mode";
  ALTER TABLE "_admissions_cycles_v" DROP COLUMN IF EXISTS "version_levels";
  ALTER TABLE "_admissions_cycles_v" DROP COLUMN IF EXISTS "version_interest_form_enabled";
  ALTER TABLE "_admissions_cycles_v" DROP COLUMN IF EXISTS "version_closed_offer";
  ALTER TABLE "contact_messages" DROP COLUMN IF EXISTS "topic";
  ALTER TABLE "contact_messages" DROP COLUMN IF EXISTS "linked_lead_id";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "can_access_leads";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "can_export_leads";
  ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "changed_fields";
  ALTER TABLE "payload_jobs" DROP COLUMN IF EXISTS "meta";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "event_categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "faqs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "student_works_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "media_items_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "social_accounts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "leads_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "visit_sessions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "visit_bookings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "analytics_daily_id";
  ALTER TABLE "homepage" DROP COLUMN IF EXISTS "texts_media_eyebrow";
  ALTER TABLE "homepage" DROP COLUMN IF EXISTS "texts_media_heading";
  ALTER TABLE "homepage" DROP COLUMN IF EXISTS "texts_media_intro";
  ALTER TABLE "_homepage_v" DROP COLUMN IF EXISTS "version_texts_media_eyebrow";
  ALTER TABLE "_homepage_v" DROP COLUMN IF EXISTS "version_texts_media_heading";
  ALTER TABLE "_homepage_v" DROP COLUMN IF EXISTS "version_texts_media_intro";
  DROP TYPE IF EXISTS "public"."enum_pages_blocks_faq_block_category";
  DROP TYPE IF EXISTS "public"."enum__pages_v_blocks_faq_block_category";
  DROP TYPE IF EXISTS "public"."enum_events_audience";
  DROP TYPE IF EXISTS "public"."enum__events_v_version_audience";
  DROP TYPE IF EXISTS "public"."enum_event_categories_color";
  DROP TYPE IF EXISTS "public"."enum_faqs_category";
  DROP TYPE IF EXISTS "public"."enum_faqs_workflow_status";
  DROP TYPE IF EXISTS "public"."enum_faqs_status";
  DROP TYPE IF EXISTS "public"."enum__faqs_v_version_category";
  DROP TYPE IF EXISTS "public"."enum__faqs_v_version_workflow_status";
  DROP TYPE IF EXISTS "public"."enum__faqs_v_version_status";
  DROP TYPE IF EXISTS "public"."enum_services_service_status";
  DROP TYPE IF EXISTS "public"."enum_services_service_category";
  DROP TYPE IF EXISTS "public"."enum__services_v_version_service_status";
  DROP TYPE IF EXISTS "public"."enum__services_v_version_service_category";
  DROP TYPE IF EXISTS "public"."enum_testimonials_relation";
  DROP TYPE IF EXISTS "public"."enum__testimonials_v_version_relation";
  DROP TYPE IF EXISTS "public"."enum_student_works_category";
  DROP TYPE IF EXISTS "public"."enum_student_works_consent_status";
  DROP TYPE IF EXISTS "public"."enum_student_works_workflow_status";
  DROP TYPE IF EXISTS "public"."enum_student_works_status";
  DROP TYPE IF EXISTS "public"."enum__student_works_v_version_category";
  DROP TYPE IF EXISTS "public"."enum__student_works_v_version_consent_status";
  DROP TYPE IF EXISTS "public"."enum__student_works_v_version_workflow_status";
  DROP TYPE IF EXISTS "public"."enum__student_works_v_version_status";
  DROP TYPE IF EXISTS "public"."enum_media_items_content_type";
  DROP TYPE IF EXISTS "public"."enum_media_items_display_mode";
  DROP TYPE IF EXISTS "public"."enum_media_items_aspect_ratio";
  DROP TYPE IF EXISTS "public"."enum_media_items_consent_status";
  DROP TYPE IF EXISTS "public"."enum_media_items_availability";
  DROP TYPE IF EXISTS "public"."enum_media_items_workflow_status";
  DROP TYPE IF EXISTS "public"."enum_media_items_status";
  DROP TYPE IF EXISTS "public"."enum__media_items_v_version_content_type";
  DROP TYPE IF EXISTS "public"."enum__media_items_v_version_display_mode";
  DROP TYPE IF EXISTS "public"."enum__media_items_v_version_aspect_ratio";
  DROP TYPE IF EXISTS "public"."enum__media_items_v_version_consent_status";
  DROP TYPE IF EXISTS "public"."enum__media_items_v_version_availability";
  DROP TYPE IF EXISTS "public"."enum__media_items_v_version_workflow_status";
  DROP TYPE IF EXISTS "public"."enum__media_items_v_version_status";
  DROP TYPE IF EXISTS "public"."enum_social_accounts_platform";
  DROP TYPE IF EXISTS "public"."enum_social_accounts_owner";
  DROP TYPE IF EXISTS "public"."enum_admissions_cycles_waves_wave_status";
  DROP TYPE IF EXISTS "public"."enum_admissions_cycles_mode";
  DROP TYPE IF EXISTS "public"."enum_admissions_cycles_closed_offer";
  DROP TYPE IF EXISTS "public"."enum__admissions_cycles_v_version_waves_wave_status";
  DROP TYPE IF EXISTS "public"."enum__admissions_cycles_v_version_mode";
  DROP TYPE IF EXISTS "public"."enum__admissions_cycles_v_version_closed_offer";
  DROP TYPE IF EXISTS "public"."enum_leads_interests";
  DROP TYPE IF EXISTS "public"."enum_leads_status";
  DROP TYPE IF EXISTS "public"."enum_leads_close_reason";
  DROP TYPE IF EXISTS "public"."enum_leads_source";
  DROP TYPE IF EXISTS "public"."enum_visit_sessions_kind";
  DROP TYPE IF EXISTS "public"."enum_visit_sessions_session_status";
  DROP TYPE IF EXISTS "public"."enum_visit_sessions_startat_tz";
  DROP TYPE IF EXISTS "public"."enum_visit_sessions_endat_tz";
  DROP TYPE IF EXISTS "public"."enum_visit_sessions_capacity_unit";
  DROP TYPE IF EXISTS "public"."enum_visit_bookings_status";
  DROP TYPE IF EXISTS "public"."enum_analytics_daily_kind";`)
}
