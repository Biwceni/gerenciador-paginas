import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * As tabelas novas da etapa 4b ficaram sem RLS. Sem ela, a API pública do Supabase (chave anônima)
 * alcança as linhas. Com RLS ligada e sem nenhuma política, só o Payload (dono das tabelas) lê e
 * grava, como nas outras tabelas.
 */
const TABLES = [
  'form_files',
  'forms_blocks_date',
  'forms_blocks_time',
  'forms_blocks_unit',
  'forms_blocks_file',
  'form_submissions_rels',
  'site_contact_units',
  '_site_v_version_contact_units',
]

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const table of TABLES) {
    await db.execute(sql.raw(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`))
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const table of TABLES) {
    await db.execute(sql.raw(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`))
  }
}
