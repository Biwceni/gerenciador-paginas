import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Segunda parte da personalidade "Papel": vira o padrão da coluna (sites novos). Separada da
// anterior porque o Postgres só deixa usar um valor novo de enum depois que a transação que o criou
// termina.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site" ALTER COLUMN "personality" SET DEFAULT 'papel';
  ALTER TABLE "_site_v" ALTER COLUMN "version_personality" SET DEFAULT 'papel';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site" ALTER COLUMN "personality" SET DEFAULT 'classico';
  ALTER TABLE "_site_v" ALTER COLUMN "version_personality" SET DEFAULT 'classico';`)
}
