import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_header_items_link_kind" ADD VALUE 'section' BEFORE 'whatsapp';
  ALTER TYPE "public"."enum_header_button_link_kind" ADD VALUE 'section' BEFORE 'whatsapp';
  ALTER TYPE "public"."enum__header_v_version_items_link_kind" ADD VALUE 'section' BEFORE 'whatsapp';
  ALTER TYPE "public"."enum__header_v_version_button_link_kind" ADD VALUE 'section' BEFORE 'whatsapp';
  ALTER TABLE "header_items" ADD COLUMN "link_section" varchar;
  ALTER TABLE "header" ADD COLUMN "button_link_section" varchar;
  ALTER TABLE "_header_v_version_items" ADD COLUMN "link_section" varchar;
  ALTER TABLE "_header_v" ADD COLUMN "version_button_link_section" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "header_items" ALTER COLUMN "link_kind" SET DATA TYPE text;
  ALTER TABLE "header_items" ALTER COLUMN "link_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum_header_items_link_kind";
  CREATE TYPE "public"."enum_header_items_link_kind" AS ENUM('page', 'whatsapp', 'url');
  ALTER TABLE "header_items" ALTER COLUMN "link_kind" SET DEFAULT 'page'::"public"."enum_header_items_link_kind";
  ALTER TABLE "header_items" ALTER COLUMN "link_kind" SET DATA TYPE "public"."enum_header_items_link_kind" USING "link_kind"::"public"."enum_header_items_link_kind";
  ALTER TABLE "header" ALTER COLUMN "button_link_kind" SET DATA TYPE text;
  ALTER TABLE "header" ALTER COLUMN "button_link_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum_header_button_link_kind";
  CREATE TYPE "public"."enum_header_button_link_kind" AS ENUM('page', 'whatsapp', 'url');
  ALTER TABLE "header" ALTER COLUMN "button_link_kind" SET DEFAULT 'page'::"public"."enum_header_button_link_kind";
  ALTER TABLE "header" ALTER COLUMN "button_link_kind" SET DATA TYPE "public"."enum_header_button_link_kind" USING "button_link_kind"::"public"."enum_header_button_link_kind";
  ALTER TABLE "_header_v_version_items" ALTER COLUMN "link_kind" SET DATA TYPE text;
  ALTER TABLE "_header_v_version_items" ALTER COLUMN "link_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum__header_v_version_items_link_kind";
  CREATE TYPE "public"."enum__header_v_version_items_link_kind" AS ENUM('page', 'whatsapp', 'url');
  ALTER TABLE "_header_v_version_items" ALTER COLUMN "link_kind" SET DEFAULT 'page'::"public"."enum__header_v_version_items_link_kind";
  ALTER TABLE "_header_v_version_items" ALTER COLUMN "link_kind" SET DATA TYPE "public"."enum__header_v_version_items_link_kind" USING "link_kind"::"public"."enum__header_v_version_items_link_kind";
  ALTER TABLE "_header_v" ALTER COLUMN "version_button_link_kind" SET DATA TYPE text;
  ALTER TABLE "_header_v" ALTER COLUMN "version_button_link_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum__header_v_version_button_link_kind";
  CREATE TYPE "public"."enum__header_v_version_button_link_kind" AS ENUM('page', 'whatsapp', 'url');
  ALTER TABLE "_header_v" ALTER COLUMN "version_button_link_kind" SET DEFAULT 'page'::"public"."enum__header_v_version_button_link_kind";
  ALTER TABLE "_header_v" ALTER COLUMN "version_button_link_kind" SET DATA TYPE "public"."enum__header_v_version_button_link_kind" USING "version_button_link_kind"::"public"."enum__header_v_version_button_link_kind";
  ALTER TABLE "header_items" DROP COLUMN "link_section";
  ALTER TABLE "header" DROP COLUMN "button_link_section";
  ALTER TABLE "_header_v_version_items" DROP COLUMN "link_section";
  ALTER TABLE "_header_v" DROP COLUMN "version_button_link_section";`)
}
