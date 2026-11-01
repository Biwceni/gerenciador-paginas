import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site" ADD COLUMN "privacy_page_id" integer;
  ALTER TABLE "_site_v" ADD COLUMN "version_privacy_page_id" integer;
  ALTER TABLE "site" ADD CONSTRAINT "site_privacy_page_id_pages_id_fk" FOREIGN KEY ("privacy_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_v" ADD CONSTRAINT "_site_v_version_privacy_page_id_pages_id_fk" FOREIGN KEY ("version_privacy_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_privacy_page_idx" ON "site" USING btree ("privacy_page_id");
  CREATE INDEX "_site_v_version_version_privacy_page_idx" ON "_site_v" USING btree ("version_privacy_page_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site" DROP CONSTRAINT "site_privacy_page_id_pages_id_fk";
  
  ALTER TABLE "_site_v" DROP CONSTRAINT "_site_v_version_privacy_page_id_pages_id_fk";
  
  DROP INDEX "site_privacy_page_idx";
  DROP INDEX "_site_v_version_version_privacy_page_idx";
  ALTER TABLE "site" DROP COLUMN "privacy_page_id";
  ALTER TABLE "_site_v" DROP COLUMN "version_privacy_page_id";`)
}
