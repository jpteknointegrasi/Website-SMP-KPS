import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "events_rundown" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"time" varchar,
  	"activity" varchar,
  	"highlight" boolean
  );
  
  CREATE TABLE "_events_v_version_rundown" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"time" varchar,
  	"activity" varchar,
  	"highlight" boolean,
  	"_uuid" varchar
  );
  
  ALTER TABLE "events" ADD COLUMN "dress_code" varchar;
  ALTER TABLE "events" ADD COLUMN "home_banner" boolean DEFAULT false;
  ALTER TABLE "_events_v" ADD COLUMN "version_dress_code" varchar;
  ALTER TABLE "_events_v" ADD COLUMN "version_home_banner" boolean DEFAULT false;
  ALTER TABLE "events_rundown" ADD CONSTRAINT "events_rundown_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_rundown" ADD CONSTRAINT "_events_v_version_rundown_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "events_rundown_order_idx" ON "events_rundown" USING btree ("_order");
  CREATE INDEX "events_rundown_parent_id_idx" ON "events_rundown" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_rundown_order_idx" ON "_events_v_version_rundown" USING btree ("_order");
  CREATE INDEX "_events_v_version_rundown_parent_id_idx" ON "_events_v_version_rundown" USING btree ("_parent_id");
  CREATE INDEX "events_home_banner_idx" ON "events" USING btree ("home_banner");
  CREATE INDEX "_events_v_version_version_home_banner_idx" ON "_events_v" USING btree ("version_home_banner");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events_rundown" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v_version_rundown" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "events_rundown" CASCADE;
  DROP TABLE "_events_v_version_rundown" CASCADE;
  DROP INDEX "events_home_banner_idx";
  DROP INDEX "_events_v_version_version_home_banner_idx";
  ALTER TABLE "events" DROP COLUMN "dress_code";
  ALTER TABLE "events" DROP COLUMN "home_banner";
  ALTER TABLE "_events_v" DROP COLUMN "version_dress_code";
  ALTER TABLE "_events_v" DROP COLUMN "version_home_banner";`)
}
