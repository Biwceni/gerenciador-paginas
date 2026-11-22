import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_logo_on_dark" AS ENUM('auto', 'white', 'plate');
  CREATE TYPE "public"."enum__site_v_version_logo_on_dark" AS ENUM('auto', 'white', 'plate');
  ALTER TABLE "site" ADD COLUMN "show_name_with_logo" boolean DEFAULT false;
  ALTER TABLE "site" ADD COLUMN "logo_light_id" integer;
  ALTER TABLE "site" ADD COLUMN "logo_on_dark" "enum_site_logo_on_dark" DEFAULT 'auto';
  ALTER TABLE "site" ADD COLUMN "colors_second" varchar;
  ALTER TABLE "_site_v" ADD COLUMN "version_show_name_with_logo" boolean DEFAULT false;
  ALTER TABLE "_site_v" ADD COLUMN "version_logo_light_id" integer;
  ALTER TABLE "_site_v" ADD COLUMN "version_logo_on_dark" "enum__site_v_version_logo_on_dark" DEFAULT 'auto';
  ALTER TABLE "_site_v" ADD COLUMN "version_colors_second" varchar;
  ALTER TABLE "site" ADD CONSTRAINT "site_logo_light_id_media_id_fk" FOREIGN KEY ("logo_light_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_v" ADD CONSTRAINT "_site_v_version_logo_light_id_media_id_fk" FOREIGN KEY ("version_logo_light_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_logo_light_idx" ON "site" USING btree ("logo_light_id");
  CREATE INDEX "_site_v_version_version_logo_light_idx" ON "_site_v" USING btree ("version_logo_light_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site" DROP CONSTRAINT "site_logo_light_id_media_id_fk";
  
  ALTER TABLE "_site_v" DROP CONSTRAINT "_site_v_version_logo_light_id_media_id_fk";
  
  DROP INDEX "site_logo_light_idx";
  DROP INDEX "_site_v_version_version_logo_light_idx";
  ALTER TABLE "site" DROP COLUMN "show_name_with_logo";
  ALTER TABLE "site" DROP COLUMN "logo_light_id";
  ALTER TABLE "site" DROP COLUMN "logo_on_dark";
  ALTER TABLE "site" DROP COLUMN "colors_second";
  ALTER TABLE "_site_v" DROP COLUMN "version_show_name_with_logo";
  ALTER TABLE "_site_v" DROP COLUMN "version_logo_light_id";
  ALTER TABLE "_site_v" DROP COLUMN "version_logo_on_dark";
  ALTER TABLE "_site_v" DROP COLUMN "version_colors_second";
  DROP TYPE "public"."enum_site_logo_on_dark";
  DROP TYPE "public"."enum__site_v_version_logo_on_dark";`)
}
