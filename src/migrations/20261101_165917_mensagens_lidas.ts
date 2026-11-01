import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// v2, entrega 3a: mensagens lidas e não lidas. Só acrescenta a coluna, com padrão "não lida", para o
// código que já está no ar continuar funcionando. As que já existem ficam como lidas, para o painel
// não abrir com tudo marcado como novo.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "form_submissions" ADD COLUMN "read" boolean DEFAULT false;
  UPDATE "form_submissions" SET "read" = true;
  CREATE INDEX "form_submissions_read_idx" ON "form_submissions" USING btree ("read");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "form_submissions_read_idx";
  ALTER TABLE "form_submissions" DROP COLUMN "read";`)
}
