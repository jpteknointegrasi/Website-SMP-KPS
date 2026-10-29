ALTER TABLE "admission_applications" ADD COLUMN "lead_link_state" text;--> statement-breakpoint
ALTER TABLE "admission_applications" ADD COLUMN "lead_link_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admission_applications" ADD COLUMN "lead_ref" text;--> statement-breakpoint
ALTER TABLE "admission_applications" ADD COLUMN "lead_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admission_applications" ADD COLUMN "lead_checked_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "applications_lead_link_idx" ON "admission_applications" USING btree ("lead_link_state");