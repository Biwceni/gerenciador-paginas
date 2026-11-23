import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_templates_forms_fields_accept" AS ENUM('photo', 'document');
  CREATE TYPE "public"."enum__templates_v_version_forms_fields_accept" AS ENUM('photo', 'document');
  ALTER TYPE "public"."enum_templates_forms_fields_type" ADD VALUE 'file';
  ALTER TYPE "public"."enum__templates_v_version_forms_fields_type" ADD VALUE 'file';
  ALTER TABLE "templates_forms_fields" ADD COLUMN "accept" "enum_templates_forms_fields_accept";
  ALTER TABLE "templates" ADD COLUMN "from_page" boolean DEFAULT false;
  ALTER TABLE "_templates_v_version_forms_fields" ADD COLUMN "accept" "enum__templates_v_version_forms_fields_accept";
  ALTER TABLE "_templates_v" ADD COLUMN "version_from_page" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates_forms_fields" ALTER COLUMN "type" SET DATA TYPE text;
  ALTER TABLE "templates_forms_fields" ALTER COLUMN "type" SET DEFAULT 'text'::text;
  DROP TYPE "public"."enum_templates_forms_fields_type";
  CREATE TYPE "public"."enum_templates_forms_fields_type" AS ENUM('text', 'email', 'textarea');
  ALTER TABLE "templates_forms_fields" ALTER COLUMN "type" SET DEFAULT 'text'::"public"."enum_templates_forms_fields_type";
  ALTER TABLE "templates_forms_fields" ALTER COLUMN "type" SET DATA TYPE "public"."enum_templates_forms_fields_type" USING "type"::"public"."enum_templates_forms_fields_type";
  ALTER TABLE "_templates_v_version_forms_fields" ALTER COLUMN "type" SET DATA TYPE text;
  ALTER TABLE "_templates_v_version_forms_fields" ALTER COLUMN "type" SET DEFAULT 'text'::text;
  DROP TYPE "public"."enum__templates_v_version_forms_fields_type";
  CREATE TYPE "public"."enum__templates_v_version_forms_fields_type" AS ENUM('text', 'email', 'textarea');
  ALTER TABLE "_templates_v_version_forms_fields" ALTER COLUMN "type" SET DEFAULT 'text'::"public"."enum__templates_v_version_forms_fields_type";
  ALTER TABLE "_templates_v_version_forms_fields" ALTER COLUMN "type" SET DATA TYPE "public"."enum__templates_v_version_forms_fields_type" USING "type"::"public"."enum__templates_v_version_forms_fields_type";
  ALTER TABLE "templates_forms_fields" DROP COLUMN "accept";
  ALTER TABLE "templates" DROP COLUMN "from_page";
  ALTER TABLE "_templates_v_version_forms_fields" DROP COLUMN "accept";
  ALTER TABLE "_templates_v" DROP COLUMN "version_from_page";
  DROP TYPE "public"."enum_templates_forms_fields_accept";
  DROP TYPE "public"."enum__templates_v_version_forms_fields_accept";`)
}
