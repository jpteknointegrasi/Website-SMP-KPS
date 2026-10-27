import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_school_applications_level" AS ENUM('tk', 'sd', 'smp', 'sma', 'smk', 'lainnya');
  CREATE TYPE "public"."enum_school_applications_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TABLE "school_applications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar NOT NULL,
  	"school_name" varchar NOT NULL,
  	"short_name" varchar,
  	"level" "enum_school_applications_level",
  	"npsn" varchar,
  	"city" varchar NOT NULL,
  	"province" varchar NOT NULL,
  	"timezone" varchar,
  	"domain" varchar,
  	"want_web" boolean DEFAULT true,
  	"want_app" boolean DEFAULT false,
  	"admin_name" varchar NOT NULL,
  	"admin_email" varchar NOT NULL,
  	"admin_phone" varchar,
  	"admin_position" varchar,
  	"note" varchar,
  	"status" "enum_school_applications_status" DEFAULT 'pending' NOT NULL,
  	"decided_at" timestamp(3) with time zone,
  	"decided_by_id" integer,
  	"decision_note" varchar,
  	"tenant_id" integer,
  	"admin_user_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "school_applications" ADD CONSTRAINT "school_applications_decided_by_id_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "school_applications" ADD CONSTRAINT "school_applications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "school_applications" ADD CONSTRAINT "school_applications_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "school_applications_reference_idx" ON "school_applications" USING btree ("reference");
  CREATE INDEX "school_applications_admin_email_idx" ON "school_applications" USING btree ("admin_email");
  CREATE INDEX "school_applications_status_idx" ON "school_applications" USING btree ("status");
  CREATE INDEX "school_applications_decided_by_idx" ON "school_applications" USING btree ("decided_by_id");
  CREATE INDEX "school_applications_tenant_idx" ON "school_applications" USING btree ("tenant_id");
  CREATE INDEX "school_applications_admin_user_idx" ON "school_applications" USING btree ("admin_user_id");
  CREATE INDEX "school_applications_updated_at_idx" ON "school_applications" USING btree ("updated_at");
  CREATE INDEX "school_applications_created_at_idx" ON "school_applications" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "school_applications" CASCADE;
  DROP TYPE "public"."enum_school_applications_level";
  DROP TYPE "public"."enum_school_applications_status";`)
}
