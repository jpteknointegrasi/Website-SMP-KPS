CREATE TABLE "announcement_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"recipient_type" text NOT NULL,
	"recipient_id" text NOT NULL,
	"student_id" uuid,
	"read_at" timestamp with time zone,
	"ack_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"requires_ack" boolean DEFAULT false NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"file_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_by_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "service_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_name" text,
	"action" text NOT NULL,
	"note" text,
	"file_id" uuid,
	"internal" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"type_id" uuid NOT NULL,
	"student_id" uuid,
	"requester_type" text NOT NULL,
	"requester_id" text NOT NULL,
	"requester_name" text,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"purpose" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"assigned_to" text,
	"output_file_id" uuid,
	"output_no" text,
	"due_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'surat' NOT NULL,
	"sla_days" integer DEFAULT 3 NOT NULL,
	"requires_file" boolean DEFAULT false NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"ordinal" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'kegiatan' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"date" date NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"reason" text NOT NULL,
	"requested_by_type" text NOT NULL,
	"requested_by_id" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"student_id" uuid NOT NULL,
	"homeroom_id" uuid NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"source" text DEFAULT 'homeroom' NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"reason" text NOT NULL,
	"file_id" uuid,
	"requested_by_type" text NOT NULL,
	"requested_by_id" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"entry_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"homeroom_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"status" text DEFAULT 'held' NOT NULL,
	"topic" text,
	"notes" text,
	"realization" text,
	"journal_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"title" text NOT NULL,
	"unit" text,
	"body" text,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"file_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"homeroom_id" uuid,
	"slot_id" uuid,
	"kind" text NOT NULL,
	"substitute_teacher_id" uuid,
	"note" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"text" text,
	"file_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"late" boolean DEFAULT false NOT NULL,
	"submitted_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"score" numeric(6, 2),
	"feedback" text,
	"status" text DEFAULT 'returned' NOT NULL,
	"reviewed_by" text NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'tugas' NOT NULL,
	"instructions" text,
	"file_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"due_at" timestamp with time zone,
	"max_score" integer DEFAULT 100 NOT NULL,
	"allow_late" boolean DEFAULT true NOT NULL,
	"submission_type" text DEFAULT 'file_or_text' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ordinal" integer NOT NULL,
	"label" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"kind" text DEFAULT 'lesson' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"homeroom_id" uuid NOT NULL,
	"day" integer NOT NULL,
	"slot_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"room" text
);
--> statement-breakpoint
CREATE TABLE "timetable_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"note" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by" text,
	"published_at" timestamp with time zone,
	"effective_from" date
);
--> statement-breakpoint
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_events" ADD CONSTRAINT "service_events_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_type_id_service_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."service_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_attendance" ADD CONSTRAINT "daily_attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_attendance" ADD CONSTRAINT "daily_attendance_homeroom_id_homerooms_id_fk" FOREIGN KEY ("homeroom_id") REFERENCES "public"."homerooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_attendance" ADD CONSTRAINT "lesson_attendance_session_id_lesson_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."lesson_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_attendance" ADD CONSTRAINT "lesson_attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_entry_id_timetable_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."timetable_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_assignment_id_teaching_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_homeroom_id_homerooms_id_fk" FOREIGN KEY ("homeroom_id") REFERENCES "public"."homerooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_teacher_id_staff_members_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_assignment_id_teaching_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_homeroom_id_homerooms_id_fk" FOREIGN KEY ("homeroom_id") REFERENCES "public"."homerooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_slot_id_time_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."time_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_substitute_teacher_id_staff_members_id_fk" FOREIGN KEY ("substitute_teacher_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_task_id_learning_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."learning_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reviews" ADD CONSTRAINT "task_reviews_task_id_learning_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."learning_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reviews" ADD CONSTRAINT "task_reviews_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_tasks" ADD CONSTRAINT "learning_tasks_assignment_id_teaching_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_version_id_timetable_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."timetable_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_homeroom_id_homerooms_id_fk" FOREIGN KEY ("homeroom_id") REFERENCES "public"."homerooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_slot_id_time_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."time_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_assignment_id_teaching_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."teaching_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_versions" ADD CONSTRAINT "timetable_versions_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "announcement_receipts_uq" ON "announcement_receipts" USING btree ("announcement_id","recipient_type","recipient_id");--> statement-breakpoint
CREATE INDEX "announcements_status_idx" ON "announcements" USING btree ("status","publish_at");--> statement-breakpoint
CREATE INDEX "service_events_request_idx" ON "service_events" USING btree ("request_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_requests_number_uq" ON "service_requests" USING btree ("number");--> statement-breakpoint
CREATE INDEX "service_requests_status_idx" ON "service_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "service_types_code_uq" ON "service_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "academic_events_date_idx" ON "academic_events" USING btree ("start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_attendance_uq" ON "daily_attendance" USING btree ("date","student_id");--> statement-breakpoint
CREATE INDEX "daily_attendance_homeroom_idx" ON "daily_attendance" USING btree ("homeroom_id","date");--> statement-breakpoint
CREATE INDEX "leave_requests_student_idx" ON "leave_requests" USING btree ("student_id","from_date");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_attendance_uq" ON "lesson_attendance" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_sessions_entry_date_uq" ON "lesson_sessions" USING btree ("entry_id","date");--> statement-breakpoint
CREATE INDEX "lesson_sessions_assignment_idx" ON "lesson_sessions" USING btree ("assignment_id","date");--> statement-breakpoint
CREATE INDEX "materials_assignment_idx" ON "learning_materials" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "schedule_exceptions_date_idx" ON "schedule_exceptions" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_version_uq" ON "task_submissions" USING btree ("task_id","student_id","version_no");--> statement-breakpoint
CREATE UNIQUE INDEX "task_reviews_uq" ON "task_reviews" USING btree ("task_id","student_id");--> statement-breakpoint
CREATE INDEX "tasks_assignment_idx" ON "learning_tasks" USING btree ("assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "time_slots_ordinal_uq" ON "time_slots" USING btree ("ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "timetable_entries_cell_uq" ON "timetable_entries" USING btree ("version_id","homeroom_id","day","slot_id");--> statement-breakpoint
CREATE INDEX "timetable_entries_assignment_idx" ON "timetable_entries" USING btree ("assignment_id");