import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "documents" ADD COLUMN "prefix" varchar DEFAULT 'documents';
  ALTER TABLE "documents" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "_documents_v" ADD COLUMN "version_prefix" varchar DEFAULT 'documents';
  ALTER TABLE "_documents_v" ADD COLUMN "version__objectkey" varchar;
  ALTER TABLE "media" ADD COLUMN "prefix" varchar DEFAULT 'media';
  ALTER TABLE "media" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "private_files" ADD COLUMN "prefix" varchar DEFAULT 'private';
  ALTER TABLE "private_files" ADD COLUMN "_objectkey" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "documents" DROP COLUMN "prefix";
  ALTER TABLE "documents" DROP COLUMN "_objectkey";
  ALTER TABLE "_documents_v" DROP COLUMN "version_prefix";
  ALTER TABLE "_documents_v" DROP COLUMN "version__objectkey";
  ALTER TABLE "media" DROP COLUMN "prefix";
  ALTER TABLE "media" DROP COLUMN "_objectkey";
  ALTER TABLE "private_files" DROP COLUMN "prefix";
  ALTER TABLE "private_files" DROP COLUMN "_objectkey";`)
}
