import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" ALTER COLUMN "content" SET DEFAULT '{"version":2,"data":{"root":{"props":{}},"content":[]}}'::jsonb;
  ALTER TABLE "_pages_v" ALTER COLUMN "version_content" SET DEFAULT '{"version":2,"data":{"root":{"props":{}},"content":[]}}'::jsonb;
  ALTER TABLE "_pages_v" ADD COLUMN "autosave" boolean;
  CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" USING btree ("autosave");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "_pages_v_autosave_idx";
  ALTER TABLE "pages" ALTER COLUMN "content" SET DEFAULT '{"version":1,"data":{"root":{"props":{}},"content":[]}}'::jsonb;
  ALTER TABLE "_pages_v" ALTER COLUMN "version_content" SET DEFAULT '{"version":1,"data":{"root":{"props":{}},"content":[]}}'::jsonb;
  ALTER TABLE "_pages_v" DROP COLUMN "autosave";`)
}
