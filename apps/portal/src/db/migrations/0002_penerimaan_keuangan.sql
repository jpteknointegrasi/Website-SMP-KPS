CREATE TABLE "admission_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"target_year" text NOT NULL,
	"target_grade" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"open_at" timestamp with time zone,
	"close_at" timestamp with time zone,
	"selection_enabled" boolean DEFAULT true NOT NULL,
	"offer_days" integer DEFAULT 14 NOT NULL,
	"reenroll_days" integer DEFAULT 21 NOT NULL,
	"require_nik" boolean DEFAULT false NOT NULL,
	"form_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"form_version" integer DEFAULT 1 NOT NULL,
	"info" text,
	"data_notice" text,
	"help_contact" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"quota" integer NOT NULL,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"registration_fee" integer DEFAULT 0 NOT NULL,
	"reenroll_fee" integer DEFAULT 0 NOT NULL,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_waves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"name" text NOT NULL,
	"open_at" timestamp with time zone NOT NULL,
	"close_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applicant_student_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"mapped_by" text NOT NULL,
	"mapped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"matched" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"code" text NOT NULL,
	"version_no" integer NOT NULL,
	"file_id" uuid NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"uploaded_by" text NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"wave_id" uuid,
	"path_id" uuid NOT NULL,
	"owner_account_id" uuid NOT NULL,
	"applicant_person_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"registration_no" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"snapshot" jsonb,
	"form_version" integer,
	"submitted_at" timestamp with time zone,
	"resubmitted_at" timestamp with time zone,
	"verifier_id" uuid,
	"revision_note" text,
	"revision_fields" jsonb,
	"revision_due" timestamp with time zone,
	"eligibility" text DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"verified_at" timestamp with time zone,
	"verified_by" text,
	"assisted_by" text,
	"assisted_reason" text,
	"duplicate_of" uuid,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversion_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"student_id" uuid,
	"error" text,
	"by" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"release_at" timestamp with time zone,
	"instructions" text,
	"proposed_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"released_by" text,
	"released_at" timestamp with time zone,
	"notified_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"outcome" text NOT NULL,
	"reason_code" text,
	"internal_note" text,
	"superseded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reenrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"checklist" jsonb NOT NULL,
	"due_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seat_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"path_id" uuid NOT NULL,
	"decision_version_id" uuid NOT NULL,
	"state" text DEFAULT 'reserved' NOT NULL,
	"expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selection_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"component" text NOT NULL,
	"assessor_id" uuid NOT NULL,
	"score" numeric(6, 2) NOT NULL,
	"note" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"locked_by" text,
	"locked_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selection_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"path_id" uuid,
	"title" text NOT NULL,
	"kind" text DEFAULT 'tes' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"location" text NOT NULL,
	"capacity" integer NOT NULL,
	"instructions" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selection_session_assessors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selection_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"state" text DEFAULT 'scheduled' NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"items" jsonb NOT NULL,
	"amount" integer NOT NULL,
	"paid" integer DEFAULT 0 NOT NULL,
	"application_id" uuid,
	"student_id" uuid,
	"account_id" uuid,
	"due_date" date,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"note" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"paid_on" date NOT NULL,
	"payer_name" text,
	"proof_file_id" uuid,
	"external_reference" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"submitted_by_type" text NOT NULL,
	"submitted_by_id" text NOT NULL,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"reject_reason" text,
	"receipt_no" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admission_paths" ADD CONSTRAINT "admission_paths_cycle_id_admission_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."admission_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_waves" ADD CONSTRAINT "admission_waves_cycle_id_admission_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."admission_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_student_mappings" ADD CONSTRAINT "applicant_student_mappings_application_id_admission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."admission_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_student_mappings" ADD CONSTRAINT "applicant_student_mappings_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_student_mappings" ADD CONSTRAINT "applicant_student_mappings_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_admission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."admission_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_cycle_id_admission_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."admission_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_wave_id_admission_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."admission_waves"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_path_id_admission_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."admission_paths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_owner_account_id_accounts_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_applicant_person_id_persons_id_fk" FOREIGN KEY ("applicant_person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_verifier_id_staff_members_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_operations" ADD CONSTRAINT "conversion_operations_application_id_admission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."admission_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_operations" ADD CONSTRAINT "conversion_operations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_batches" ADD CONSTRAINT "decision_batches_cycle_id_admission_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."admission_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_versions" ADD CONSTRAINT "decision_versions_application_id_admission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."admission_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_versions" ADD CONSTRAINT "decision_versions_batch_id_decision_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."decision_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reenrollments" ADD CONSTRAINT "reenrollments_application_id_admission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."admission_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_reservations" ADD CONSTRAINT "seat_reservations_application_id_admission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."admission_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_reservations" ADD CONSTRAINT "seat_reservations_path_id_admission_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."admission_paths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_reservations" ADD CONSTRAINT "seat_reservations_decision_version_id_decision_versions_id_fk" FOREIGN KEY ("decision_version_id") REFERENCES "public"."decision_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_scores" ADD CONSTRAINT "selection_scores_application_id_admission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."admission_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_scores" ADD CONSTRAINT "selection_scores_assessor_id_staff_members_id_fk" FOREIGN KEY ("assessor_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_sessions" ADD CONSTRAINT "selection_sessions_cycle_id_admission_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."admission_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_sessions" ADD CONSTRAINT "selection_sessions_path_id_admission_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."admission_paths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_session_assessors" ADD CONSTRAINT "selection_session_assessors_session_id_selection_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."selection_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_session_assessors" ADD CONSTRAINT "selection_session_assessors_staff_id_staff_members_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_participants" ADD CONSTRAINT "selection_participants_session_id_selection_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."selection_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_participants" ADD CONSTRAINT "selection_participants_application_id_admission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."admission_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_application_id_admission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."admission_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_invoice_id_billing_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."billing_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admission_cycles_code_uq" ON "admission_cycles" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "applicant_mapping_application_uq" ON "applicant_student_mappings" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "application_documents_version_uq" ON "application_documents" USING btree ("application_id","code","version_no");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_regno_uq" ON "admission_applications" USING btree ("registration_no");--> statement-breakpoint
CREATE INDEX "applications_cycle_status_idx" ON "admission_applications" USING btree ("cycle_id","status");--> statement-breakpoint
CREATE INDEX "applications_owner_idx" ON "admission_applications" USING btree ("owner_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversion_ops_application_uq" ON "conversion_operations" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "decision_versions_uq" ON "decision_versions" USING btree ("application_id","version_no");--> statement-breakpoint
CREATE INDEX "decision_versions_batch_idx" ON "decision_versions" USING btree ("batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reenrollments_application_uq" ON "reenrollments" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seat_reservations_active_uq" ON "seat_reservations" USING btree ("application_id") WHERE "seat_reservations"."state" IN ('reserved', 'confirmed');--> statement-breakpoint
CREATE INDEX "seat_reservations_path_idx" ON "seat_reservations" USING btree ("path_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "selection_scores_current_uq" ON "selection_scores" USING btree ("application_id","component","assessor_id") WHERE "selection_scores"."status" <> 'superseded';--> statement-breakpoint
CREATE UNIQUE INDEX "session_assessors_uq" ON "selection_session_assessors" USING btree ("session_id","staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_open_uq" ON "selection_participants" USING btree ("session_id","application_id") WHERE "selection_participants"."state" NOT IN ('rescheduled', 'cancelled');--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_uq" ON "billing_invoices" USING btree ("number");--> statement-breakpoint
CREATE INDEX "invoices_student_idx" ON "billing_invoices" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "invoices_application_idx" ON "billing_invoices" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_external_uq" ON "billing_payments" USING btree ("external_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_receipt_uq" ON "billing_payments" USING btree ("receipt_no");--> statement-breakpoint
CREATE INDEX "payments_invoice_idx" ON "billing_payments" USING btree ("invoice_id");