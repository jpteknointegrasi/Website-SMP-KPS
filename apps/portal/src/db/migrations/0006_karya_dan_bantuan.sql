CREATE TABLE "work_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"public_name" text NOT NULL,
	"mentor_public" text,
	"year" integer NOT NULL,
	"file_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_submission_id" uuid,
	"proposed_by" uuid NOT NULL,
	"status" text DEFAULT 'awaiting_consent' NOT NULL,
	"consent_by" text,
	"consent_at" timestamp with time zone,
	"consent_note" text,
	"imported_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_grants" ADD COLUMN "scope" text DEFAULT 'operasional' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_proposals" ADD CONSTRAINT "work_proposals_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_proposals" ADD CONSTRAINT "work_proposals_proposed_by_staff_members_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_proposals_student_idx" ON "work_proposals" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "work_proposals_status_idx" ON "work_proposals" USING btree ("status");