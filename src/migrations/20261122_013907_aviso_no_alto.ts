import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "header" ADD COLUMN "notice_text" varchar;
  ALTER TABLE "header" ADD COLUMN "notice_until" timestamp(3) with time zone;
  ALTER TABLE "_header_v" ADD COLUMN "version_notice_text" varchar;
  ALTER TABLE "_header_v" ADD COLUMN "version_notice_until" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "header" DROP COLUMN "notice_text";
  ALTER TABLE "header" DROP COLUMN "notice_until";
  ALTER TABLE "_header_v" DROP COLUMN "version_notice_text";
  ALTER TABLE "_header_v" DROP COLUMN "version_notice_until";`)
}
