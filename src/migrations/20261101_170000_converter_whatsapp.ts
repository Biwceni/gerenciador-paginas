import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// v2, entrega 3a: os campos de texto chamados `whatsapp` viram "WhatsApp ou telefone", com o mesmo
// nome técnico, id e posição. O código de antes desta entrega não lê a tabela nova e deixa de mostrar
// o campo até o merge. Não mexe na estrutura do banco.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   INSERT INTO "forms_blocks_phone" ("_order", "_parent_id", "_path", "id", "name", "label", "width", "required", "block_name")
    SELECT "_order", "_parent_id", "_path", "id", "name", "label", "width", "required", "block_name"
    FROM "forms_blocks_text" WHERE "name" = 'whatsapp';
  DELETE FROM "forms_blocks_text" WHERE "name" = 'whatsapp';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   INSERT INTO "forms_blocks_text" ("_order", "_parent_id", "_path", "id", "name", "label", "width", "required", "block_name")
    SELECT "_order", "_parent_id", "_path", "id", "name", "label", "width", "required", "block_name"
    FROM "forms_blocks_phone" WHERE "name" = 'whatsapp';
  DELETE FROM "forms_blocks_phone" WHERE "name" = 'whatsapp';`)
}
