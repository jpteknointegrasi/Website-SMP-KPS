CREATE TABLE "grade_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"score" numeric(6, 2),
	"note" text,
	"entered_by" text NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grade_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"date" date,
	"max_score" integer DEFAULT 100 NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"task_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_card_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_card_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"reason" text,
	"released" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"homeroom_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"promotion" text,
	"snapshot" jsonb,
	"version_no" integer DEFAULT 0 NOT NULL,
	"submitted_by" uuid,
	"submitted_at" timestamp with time zone,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"released_by" text,
	"released_at" timestamp with time zone,
	"return_note" text,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "result_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"submitted_by" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"returned_by" text,
	"returned_at" timestamp with time zone,
	"return_note" text
);
--> statement-breakpoint
CREATE TABLE "subject_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"computed" numeric(6, 2),
	"final_score" numeric(6, 2),
	"adjust_reason" text,
	"description" text,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"title" text NOT NULL,
	"field" text,
	"level" text NOT NULL,
	"rank" text,
	"organizer" text,
	"date" date NOT NULL,
	"evidence_file_id" uuid,
	"status" text DEFAULT 'submitted' NOT NULL,
	"public_consent" boolean DEFAULT false NOT NULL,
	"submitted_by_type" text NOT NULL,
	"submitted_by_id" text NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'minat' NOT NULL,
	"description" text,
	"coach_id" uuid,
	"schedule" text,
	"location" text,
	"capacity" integer,
	"requires_consent" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"predicate" text,
	"description" text,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" text DEFAULT 'applied' NOT NULL,
	"motivation" text,
	"consent_by" text,
	"consent_at" timestamp with time zone,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"date" date NOT NULL,
	"topic" text,
	"attendance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recorded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affairs_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_name" text,
	"action" text NOT NULL,
	"note" text,
	"internal" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affairs_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"occurred_on" date,
	"location" text,
	"student_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reporter_type" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reporter_name" text,
	"hide_identity" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"assigned_to" uuid,
	"outcome" text,
	"file_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counseling_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"student_id" uuid NOT NULL,
	"source" text NOT NULL,
	"category" text NOT NULL,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"request" text NOT NULL,
	"preferred_time" text,
	"requested_by_type" text NOT NULL,
	"requested_by_id" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"assigned_to" uuid,
	"closed_at" timestamp with time zone,
	"closing_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counseling_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"date" date NOT NULL,
	"mode" text DEFAULT 'tatap_muka' NOT NULL,
	"notes" text,
	"shared_summary" text,
	"share_with_guardian" boolean DEFAULT false NOT NULL,
	"share_with_homeroom" boolean DEFAULT false NOT NULL,
	"follow_up_on" date,
	"counselor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_year_id" uuid NOT NULL,
	"to_year_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"executed_by" text,
	"executed_at" timestamp with time zone,
	"effective_date" date
);
--> statement-breakpoint
ALTER TABLE "grade_entries" ADD CONSTRAINT "grade_entries_item_id_grade_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."grade_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_entries" ADD CONSTRAINT "grade_entries_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_items" ADD CONSTRAINT "grade_items_assignment_id_teaching_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_card_versions" ADD CONSTRAINT "report_card_versions_report_card_id_report_cards_id_fk" FOREIGN KEY ("report_card_id") REFERENCES "public"."report_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_homeroom_id_homerooms_id_fk" FOREIGN KEY ("homeroom_id") REFERENCES "public"."homerooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_submitted_by_staff_members_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_submissions" ADD CONSTRAINT "result_submissions_assignment_id_teaching_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_results" ADD CONSTRAINT "subject_results_assignment_id_teaching_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_results" ADD CONSTRAINT "subject_results_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_year_id_academic_years_id_fk" FOREIGN KEY ("year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_coach_id_staff_members_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_evaluations" ADD CONSTRAINT "activity_evaluations_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_evaluations" ADD CONSTRAINT "activity_evaluations_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_evaluations" ADD CONSTRAINT "activity_evaluations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_members" ADD CONSTRAINT "activity_members_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_members" ADD CONSTRAINT "activity_members_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_sessions" ADD CONSTRAINT "activity_sessions_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affairs_events" ADD CONSTRAINT "affairs_events_report_id_affairs_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."affairs_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affairs_reports" ADD CONSTRAINT "affairs_reports_assigned_to_staff_members_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_cases" ADD CONSTRAINT "counseling_cases_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_cases" ADD CONSTRAINT "counseling_cases_assigned_to_staff_members_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_case_id_counseling_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."counseling_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_counselor_id_staff_members_id_fk" FOREIGN KEY ("counselor_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_runs" ADD CONSTRAINT "promotion_runs_from_year_id_academic_years_id_fk" FOREIGN KEY ("from_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_runs" ADD CONSTRAINT "promotion_runs_to_year_id_academic_years_id_fk" FOREIGN KEY ("to_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "grade_entries_uq" ON "grade_entries" USING btree ("item_id","student_id");--> statement-breakpoint
CREATE INDEX "grade_items_assignment_idx" ON "grade_items" USING btree ("assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_card_versions_uq" ON "report_card_versions" USING btree ("report_card_id","version_no");--> statement-breakpoint
CREATE UNIQUE INDEX "report_cards_uq" ON "report_cards" USING btree ("term_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "result_submissions_uq" ON "result_submissions" USING btree ("assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_results_uq" ON "subject_results" USING btree ("assignment_id","student_id");--> statement-breakpoint
CREATE INDEX "achievements_student_idx" ON "achievements" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "activities_year_name_uq" ON "activities" USING btree ("year_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_evaluations_uq" ON "activity_evaluations" USING btree ("activity_id","term_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_members_uq" ON "activity_members" USING btree ("activity_id","student_id");--> statement-breakpoint
CREATE INDEX "counseling_cases_student_idx" ON "counseling_cases" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "counseling_cases_assigned_idx" ON "counseling_cases" USING btree ("assigned_to");