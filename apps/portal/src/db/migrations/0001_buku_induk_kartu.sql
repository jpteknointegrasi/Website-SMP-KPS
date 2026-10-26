CREATE TABLE "academic_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"homeroom_id" uuid NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"year_id" uuid NOT NULL,
	"grade_level_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" date,
	"end_date" date,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grade_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"ordinal" integer NOT NULL,
	"final" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homerooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year_id" uuid NOT NULL,
	"grade_level_id" uuid NOT NULL,
	"name" text NOT NULL,
	"homeroom_teacher_id" uuid,
	"room" text,
	"capacity" integer
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"group" text,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teaching_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"homeroom_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"hours_per_week" integer,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"ordinal" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_replacement_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"card_id" uuid,
	"reason" text NOT NULL,
	"note" text,
	"deactivate_old" integer DEFAULT 1 NOT NULL,
	"requested_by_type" text NOT NULL,
	"requested_by_id" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"processed_by" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"settings" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "student_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_no" text NOT NULL,
	"student_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"token_sealed" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issued_by" text NOT NULL,
	"valid_until" date NOT NULL,
	"printed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	"replaced_by_id" uuid
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"granted" boolean NOT NULL,
	"given_by_account_id" uuid,
	"given_by_staff_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counters" (
	"name" text PRIMARY KEY NOT NULL,
	"value" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classification" text NOT NULL,
	"context_type" text NOT NULL,
	"context_id" text,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"uploaded_by_type" text NOT NULL,
	"uploaded_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mail_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_type" text NOT NULL,
	"recipient_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "operation_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"command" text NOT NULL,
	"fingerprint" text NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone,
	"dead" boolean DEFAULT false NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "staff_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"web_user_id" text,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"nip" text,
	"position" text,
	"web_role" text,
	"active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"role" text NOT NULL,
	"granted_by" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" text
);
--> statement-breakpoint
CREATE TABLE "support_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_email" text NOT NULL,
	"reason" text NOT NULL,
	"granted_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"login" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"person_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"verified_by" text,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activation_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"link_id" uuid,
	"student_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by_account_id" uuid,
	"revoked_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"student_id" uuid NOT NULL,
	"requested_by_type" text NOT NULL,
	"requested_by_id" text NOT NULL,
	"requested_by_name" text,
	"changes" jsonb NOT NULL,
	"reason" text NOT NULL,
	"evidence_file_id" uuid,
	"status" text DEFAULT 'submitted' NOT NULL,
	"review_note" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardian_student_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guardian_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"relation" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"can_view_academic" boolean DEFAULT true NOT NULL,
	"can_view_finance" boolean DEFAULT true NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"verification_method" text,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by" text,
	"revoke_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"account_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text DEFAULT 'students' NOT NULL,
	"file_id" uuid,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"headers" jsonb,
	"mapping" jsonb,
	"rows" jsonb,
	"results" jsonb,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone,
	"summary" jsonb
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"nickname" text,
	"gender" text,
	"birth_place" text,
	"birth_date" date,
	"religion" text,
	"nationality" text,
	"nik" text,
	"family_card_no" text,
	"address" text,
	"phone" text,
	"email" text,
	"occupation" text,
	"education" text,
	"photo_file_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"file_id" uuid NOT NULL,
	"note" text,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"nis" text,
	"nisn" text,
	"status" text DEFAULT 'active' NOT NULL,
	"entry_year" integer,
	"entry_date" date,
	"entry_grade" text,
	"entry_via" text DEFAULT 'manual' NOT NULL,
	"origin_school" text,
	"exit_date" date,
	"exit_reason" text,
	"account_id" uuid,
	"verified_at" timestamp with time zone,
	"verified_by" text,
	"extra" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_placements" ADD CONSTRAINT "class_placements_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_placements" ADD CONSTRAINT "class_placements_homeroom_id_homerooms_id_fk" FOREIGN KEY ("homeroom_id") REFERENCES "public"."homerooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_year_id_academic_years_id_fk" FOREIGN KEY ("year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_grade_level_id_grade_levels_id_fk" FOREIGN KEY ("grade_level_id") REFERENCES "public"."grade_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homerooms" ADD CONSTRAINT "homerooms_year_id_academic_years_id_fk" FOREIGN KEY ("year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homerooms" ADD CONSTRAINT "homerooms_grade_level_id_grade_levels_id_fk" FOREIGN KEY ("grade_level_id") REFERENCES "public"."grade_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homerooms" ADD CONSTRAINT "homerooms_homeroom_teacher_id_staff_members_id_fk" FOREIGN KEY ("homeroom_teacher_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_homeroom_id_homerooms_id_fk" FOREIGN KEY ("homeroom_id") REFERENCES "public"."homerooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_teacher_id_staff_members_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_year_id_academic_years_id_fk" FOREIGN KEY ("year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_replacement_requests" ADD CONSTRAINT "card_replacement_requests_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_replacement_requests" ADD CONSTRAINT "card_replacement_requests_card_id_student_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."student_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_cards" ADD CONSTRAINT "student_cards_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_cards" ADD CONSTRAINT "student_cards_template_id_card_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."card_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_roles" ADD CONSTRAINT "staff_roles_staff_id_staff_members_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_sessions" ADD CONSTRAINT "account_sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_link_id_guardian_student_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."guardian_student_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_corrections" ADD CONSTRAINT "data_corrections_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_corrections" ADD CONSTRAINT "data_corrections_evidence_file_id_files_id_fk" FOREIGN KEY ("evidence_file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_student_links" ADD CONSTRAINT "guardian_student_links_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_student_links" ADD CONSTRAINT "guardian_student_links_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_photo_file_id_files_id_fk" FOREIGN KEY ("photo_file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_years_name_uq" ON "academic_years" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_years_one_active" ON "academic_years" USING btree ("status") WHERE "academic_years"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "class_placements_open_uq" ON "class_placements" USING btree ("enrollment_id") WHERE "class_placements"."valid_to" IS NULL;--> statement-breakpoint
CREATE INDEX "class_placements_homeroom_idx" ON "class_placements" USING btree ("homeroom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_student_year_open_uq" ON "enrollments" USING btree ("student_id","year_id") WHERE "enrollments"."status" <> 'ended';--> statement-breakpoint
CREATE INDEX "enrollments_year_idx" ON "enrollments" USING btree ("year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_levels_name_uq" ON "grade_levels" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "homerooms_year_name_uq" ON "homerooms" USING btree ("year_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_code_uq" ON "subjects" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "teaching_assignments_uq" ON "teaching_assignments" USING btree ("term_id","homeroom_id","subject_id") WHERE "teaching_assignments"."active";--> statement-breakpoint
CREATE INDEX "teaching_assignments_teacher_idx" ON "teaching_assignments" USING btree ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_year_ordinal_uq" ON "terms" USING btree ("year_id","ordinal");--> statement-breakpoint
CREATE INDEX "card_replacements_status_idx" ON "card_replacement_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "student_cards_no_uq" ON "student_cards" USING btree ("card_no");--> statement-breakpoint
CREATE UNIQUE INDEX "student_cards_token_uq" ON "student_cards" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "student_cards_one_active_uq" ON "student_cards" USING btree ("student_id") WHERE "student_cards"."status" = 'active';--> statement-breakpoint
CREATE INDEX "consents_person_idx" ON "consents" USING btree ("person_id","purpose","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "files_storage_key_uq" ON "files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "files_context_idx" ON "files" USING btree ("context_type","context_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_type","recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "outbox_events" USING btree ("available_at") WHERE "outbox_events"."processed_at" IS NULL AND NOT "outbox_events"."dead";--> statement-breakpoint
CREATE UNIQUE INDEX "staff_members_web_user_uq" ON "staff_members" USING btree ("web_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_members_email_uq" ON "staff_members" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_roles_active_uq" ON "staff_roles" USING btree ("staff_id","role") WHERE "staff_roles"."revoked_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_sessions_token_uq" ON "account_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "account_sessions_account_idx" ON "account_sessions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_tokens_hash_uq" ON "account_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_login_uq" ON "accounts" USING btree ("login");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_person_uq" ON "accounts" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "activation_codes_hash_uq" ON "activation_codes" USING btree ("code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "data_corrections_number_uq" ON "data_corrections" USING btree ("number");--> statement-breakpoint
CREATE INDEX "data_corrections_status_idx" ON "data_corrections" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "guardian_links_open_uq" ON "guardian_student_links" USING btree ("guardian_id","student_id") WHERE "guardian_student_links"."status" <> 'revoked';--> statement-breakpoint
CREATE INDEX "guardian_links_student_idx" ON "guardian_student_links" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guardians_person_uq" ON "guardians" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guardians_account_uq" ON "guardians" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "login_attempts_scope_idx" ON "login_attempts" USING btree ("scope","at");--> statement-breakpoint
CREATE INDEX "persons_name_idx" ON "persons" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "student_documents_student_idx" ON "student_documents" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_person_uq" ON "students" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_nis_uq" ON "students" USING btree ("nis");--> statement-breakpoint
CREATE UNIQUE INDEX "students_nisn_uq" ON "students" USING btree ("nisn");--> statement-breakpoint
CREATE UNIQUE INDEX "students_account_uq" ON "students" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "students_status_idx" ON "students" USING btree ("status");