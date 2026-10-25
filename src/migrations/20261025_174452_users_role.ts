import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'editor' NOT NULL;`)

  // Contas criadas antes desta migração nasceram sem tipo de acesso: a mais antiga vira
  // administrador, para o site não ficar sem ninguém que cuide dos usuários.
  await db.execute(sql`
  UPDATE "users" SET "role" = 'admin'
  WHERE "id" = (SELECT "id" FROM "users" ORDER BY "created_at", "id" LIMIT 1)
    AND NOT EXISTS (SELECT 1 FROM "users" WHERE "role" = 'admin');`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "role";
  DROP TYPE "public"."enum_users_role";`)
}
