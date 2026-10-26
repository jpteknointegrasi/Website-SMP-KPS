CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"object_type" text,
	"object_id" text,
	"correlation_id" text,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "school_meta" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"school_id" integer NOT NULL,
	"school_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_meta_single_row" CHECK ("school_meta"."id" = 1)
);
--> statement-breakpoint
CREATE INDEX "audit_events_object_idx" ON "audit_events" USING btree ("object_type","object_id");--> statement-breakpoint
CREATE INDEX "audit_events_occurred_idx" ON "audit_events" USING btree ("occurred_at");