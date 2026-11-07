import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Redesign v3, entrega 2: Animação do site (Nenhuma, Suave, Marcante). Só acrescenta a coluna, com
// padrão "suave": o código que já está no ar não lê o campo, e nada muda até a entrega ir ao ar.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_motion" AS ENUM('nenhum', 'suave', 'marcante');
  CREATE TYPE "public"."enum__site_v_version_motion" AS ENUM('nenhum', 'suave', 'marcante');
  ALTER TABLE "site" ADD COLUMN "motion" "enum_site_motion" DEFAULT 'suave';
  ALTER TABLE "_site_v" ADD COLUMN "version_motion" "enum__site_v_version_motion" DEFAULT 'suave';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site" DROP COLUMN "motion";
  ALTER TABLE "_site_v" DROP COLUMN "version_motion";
  DROP TYPE "public"."enum_site_motion";
  DROP TYPE "public"."enum__site_v_version_motion";`)
}
