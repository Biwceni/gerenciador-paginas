import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// v2, entrega 1: páginas arquivadas (grupo "Arquivadas" da tela Páginas). Só acrescenta a coluna,
// com padrão "não arquivada", para o código que já está no ar continuar funcionando com ela.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" ADD COLUMN "archived" boolean DEFAULT false;
  ALTER TABLE "_pages_v" ADD COLUMN "version_archived" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" DROP COLUMN "archived";
  ALTER TABLE "_pages_v" DROP COLUMN "version_archived";`)
}
