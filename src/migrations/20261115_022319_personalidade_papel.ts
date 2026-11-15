import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Componentes, direção B do redesenho (D1): personalidade nova "Papel", padrão dos sites novos.
// Esta acrescenta o valor; a seguinte troca o padrão da coluna (o Postgres só deixa usar o valor
// novo depois que esta transação termina). Assim, os sites que já existem guardam a personalidade
// deles e não mudam sozinhos.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_site_personality" ADD VALUE 'papel' BEFORE 'classico';
  ALTER TYPE "public"."enum__site_v_version_personality" ADD VALUE 'papel' BEFORE 'classico';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "site" SET "personality" = 'classico' WHERE "personality" = 'papel';
  UPDATE "_site_v" SET "version_personality" = 'classico' WHERE "version_personality" = 'papel';
  ALTER TABLE "site" ALTER COLUMN "personality" SET DATA TYPE text;
  ALTER TABLE "site" ALTER COLUMN "personality" SET DEFAULT 'classico'::text;
  DROP TYPE "public"."enum_site_personality";
  CREATE TYPE "public"."enum_site_personality" AS ENUM('classico', 'vitrine', 'aconchego', 'editorial');
  ALTER TABLE "site" ALTER COLUMN "personality" SET DEFAULT 'classico'::"public"."enum_site_personality";
  ALTER TABLE "site" ALTER COLUMN "personality" SET DATA TYPE "public"."enum_site_personality" USING "personality"::"public"."enum_site_personality";
  ALTER TABLE "_site_v" ALTER COLUMN "version_personality" SET DATA TYPE text;
  ALTER TABLE "_site_v" ALTER COLUMN "version_personality" SET DEFAULT 'classico'::text;
  DROP TYPE "public"."enum__site_v_version_personality";
  CREATE TYPE "public"."enum__site_v_version_personality" AS ENUM('classico', 'vitrine', 'aconchego', 'editorial');
  ALTER TABLE "_site_v" ALTER COLUMN "version_personality" SET DEFAULT 'classico'::"public"."enum__site_v_version_personality";
  ALTER TABLE "_site_v" ALTER COLUMN "version_personality" SET DATA TYPE "public"."enum__site_v_version_personality" USING "version_personality"::"public"."enum__site_v_version_personality";`)
}
