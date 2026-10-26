CREATE TABLE "alumni_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"graduation_year" text NOT NULL,
	"continuing_to" text,
	"contact_email" text,
	"contact_phone" text,
	"story" text,
	"consent_contact" boolean DEFAULT false NOT NULL,
	"consent_public" boolean DEFAULT false NOT NULL,
	"consent_recorded_by" text,
	"consent_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"complaint" text NOT NULL,
	"action" text,
	"notes" text,
	"outcome" text NOT NULL,
	"family_note" text,
	"guardian_notified" boolean DEFAULT false NOT NULL,
	"follow_up_on" date,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"isbn" text,
	"title" text NOT NULL,
	"author" text,
	"publisher" text,
	"year" integer,
	"category" text,
	"location" text,
	"copies" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"student_id" uuid,
	"staff_id" uuid,
	"borrowed_on" date NOT NULL,
	"due_on" date NOT NULL,
	"returned_on" date,
	"status" text DEFAULT 'active' NOT NULL,
	"renewals" integer DEFAULT 0 NOT NULL,
	"note" text,
	"handled_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"position" text DEFAULT 'Anggota' NOT NULL,
	"can_propose" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"location" text,
	"budget" integer,
	"participants" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"submitted_by_type" text NOT NULL,
	"submitted_by_id" text NOT NULL,
	"submitted_by_name" text,
	"review_note" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"event_id" uuid,
	"report" text,
	"report_file_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"advisor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alumni_profiles" ADD CONSTRAINT "alumni_profiles_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_visits" ADD CONSTRAINT "health_visits_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_visits" ADD CONSTRAINT "health_visits_recorded_by_staff_members_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_loans" ADD CONSTRAINT "library_loans_book_id_library_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."library_books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_loans" ADD CONSTRAINT "library_loans_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_loans" ADD CONSTRAINT "library_loans_staff_id_staff_members_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_proposals" ADD CONSTRAINT "org_proposals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_year_id_academic_years_id_fk" FOREIGN KEY ("year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_advisor_id_staff_members_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alumni_profiles_student_uq" ON "alumni_profiles" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "health_visits_student_idx" ON "health_visits" USING btree ("student_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "library_books_code_uq" ON "library_books" USING btree ("code");--> statement-breakpoint
CREATE INDEX "library_books_title_idx" ON "library_books" USING btree ("title");--> statement-breakpoint
CREATE INDEX "library_loans_book_idx" ON "library_loans" USING btree ("book_id","status");--> statement-breakpoint
CREATE INDEX "library_loans_student_idx" ON "library_loans" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_uq" ON "org_members" USING btree ("org_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_year_name_uq" ON "organizations" USING btree ("year_id","name");