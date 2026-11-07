import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Redesign v3, entrega 1: personalidade do site (Clássico, Vitrine, Aconchego, Editorial). Só
// acrescenta a coluna, com padrão "classico" (o visual de antes): nenhum site muda sozinho e o
// código que já está no ar continua funcionando.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_personality" AS ENUM('classico', 'vitrine', 'aconchego', 'editorial');
  CREATE TYPE "public"."enum__site_v_version_personality" AS ENUM('classico', 'vitrine', 'aconchego', 'editorial');
  ALTER TABLE "site" ADD COLUMN "personality" "enum_site_personality" DEFAULT 'classico';
  ALTER TABLE "_site_v" ADD COLUMN "version_personality" "enum__site_v_version_personality" DEFAULT 'classico';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site" DROP COLUMN "personality";
  ALTER TABLE "_site_v" DROP COLUMN "version_personality";
  DROP TYPE "public"."enum_site_personality";
  DROP TYPE "public"."enum__site_v_version_personality";`)
}
