import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Página fantasma (B9 v2): ao apagar uma página, o banco desfazia o vínculo das versões dela
// ("set null") em vez de apagá-las. Se o passo do Payload que apaga as versões não terminasse, sobrava
// uma versão sem página, que as listas mostravam como página. Com "cascade", apagar a página apaga as
// versões no mesmo passo.
//
// O snapshot (.json) desta migração continua com "set null" de propósito: é o que o Payload gera a
// partir da coleção, e assim o próximo `migrate:create` não tenta desfazer esta troca.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_pages_v" DROP CONSTRAINT IF EXISTS "_pages_v_parent_id_pages_id_fk";
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_pages_v" DROP CONSTRAINT IF EXISTS "_pages_v_parent_id_pages_id_fk";
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;`)
}
