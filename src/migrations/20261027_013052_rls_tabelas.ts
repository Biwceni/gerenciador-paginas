import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// RLS em todas as tabelas do esquema `public`, sem regras (policies): pela Data API do Supabase
// (chave anon), ninguém lê nem escreve. O Payload conecta como `postgres`, dono das tabelas e com
// BYPASSRLS, e continua funcionando. Tabela nova criada por migração precisa ligar o RLS também.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE t record;
    BEGIN
      FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
      END LOOP;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE t record;
    BEGIN
      FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t.tablename);
      END LOOP;
    END $$;
  `)
}
