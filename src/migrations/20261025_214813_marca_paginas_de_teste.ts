import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" ADD COLUMN "created_by_seed" boolean DEFAULT false;
  ALTER TABLE "_pages_v" ADD COLUMN "version_created_by_seed" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" DROP COLUMN "created_by_seed";
  ALTER TABLE "_pages_v" DROP COLUMN "version_created_by_seed";`)
}
