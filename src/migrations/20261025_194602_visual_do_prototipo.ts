import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_header_items_link_kind" ADD VALUE 'whatsapp' BEFORE 'url';
  ALTER TYPE "public"."enum_header_button_link_kind" ADD VALUE 'whatsapp' BEFORE 'url';
  ALTER TYPE "public"."enum__header_v_version_items_link_kind" ADD VALUE 'whatsapp' BEFORE 'url';
  ALTER TYPE "public"."enum__header_v_version_button_link_kind" ADD VALUE 'whatsapp' BEFORE 'url';
  DROP TABLE "footer_links" CASCADE;
  DROP TABLE "_footer_v_version_links" CASCADE;
  ALTER TABLE "pages" ADD COLUMN "campaign" boolean DEFAULT false;
  ALTER TABLE "_pages_v" ADD COLUMN "version_campaign" boolean DEFAULT false;
  ALTER TABLE "site" ADD COLUMN "font_faces" varchar;
  ALTER TABLE "site" ADD COLUMN "font_key" varchar;
  ALTER TABLE "site" ADD COLUMN "contact_hours" varchar;
  ALTER TABLE "site" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "_site_v" ADD COLUMN "version_font_faces" varchar;
  ALTER TABLE "_site_v" ADD COLUMN "version_font_key" varchar;
  ALTER TABLE "_site_v" ADD COLUMN "version_contact_hours" varchar;
  ALTER TABLE "_site_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "footer" ADD COLUMN "show_menu" boolean DEFAULT true;
  ALTER TABLE "_footer_v" ADD COLUMN "version_show_menu" boolean DEFAULT true;
  DROP TYPE "public"."enum_footer_links_link_kind";
  DROP TYPE "public"."enum__footer_v_version_links_link_kind";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_footer_links_link_kind" AS ENUM('page', 'url');
  CREATE TYPE "public"."enum__footer_v_version_links_link_kind" AS ENUM('page', 'url');
  CREATE TABLE "footer_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_kind" "enum_footer_links_link_kind" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_url" varchar
  );
  
  CREATE TABLE "_footer_v_version_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_kind" "enum__footer_v_version_links_link_kind" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "header_items" ALTER COLUMN "link_kind" SET DATA TYPE text;
  ALTER TABLE "header_items" ALTER COLUMN "link_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum_header_items_link_kind";
  CREATE TYPE "public"."enum_header_items_link_kind" AS ENUM('page', 'url');
  ALTER TABLE "header_items" ALTER COLUMN "link_kind" SET DEFAULT 'page'::"public"."enum_header_items_link_kind";
  ALTER TABLE "header_items" ALTER COLUMN "link_kind" SET DATA TYPE "public"."enum_header_items_link_kind" USING "link_kind"::"public"."enum_header_items_link_kind";
  ALTER TABLE "header" ALTER COLUMN "button_link_kind" SET DATA TYPE text;
  ALTER TABLE "header" ALTER COLUMN "button_link_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum_header_button_link_kind";
  CREATE TYPE "public"."enum_header_button_link_kind" AS ENUM('page', 'url');
  ALTER TABLE "header" ALTER COLUMN "button_link_kind" SET DEFAULT 'page'::"public"."enum_header_button_link_kind";
  ALTER TABLE "header" ALTER COLUMN "button_link_kind" SET DATA TYPE "public"."enum_header_button_link_kind" USING "button_link_kind"::"public"."enum_header_button_link_kind";
  ALTER TABLE "_header_v_version_items" ALTER COLUMN "link_kind" SET DATA TYPE text;
  ALTER TABLE "_header_v_version_items" ALTER COLUMN "link_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum__header_v_version_items_link_kind";
  CREATE TYPE "public"."enum__header_v_version_items_link_kind" AS ENUM('page', 'url');
  ALTER TABLE "_header_v_version_items" ALTER COLUMN "link_kind" SET DEFAULT 'page'::"public"."enum__header_v_version_items_link_kind";
  ALTER TABLE "_header_v_version_items" ALTER COLUMN "link_kind" SET DATA TYPE "public"."enum__header_v_version_items_link_kind" USING "link_kind"::"public"."enum__header_v_version_items_link_kind";
  ALTER TABLE "_header_v" ALTER COLUMN "version_button_link_kind" SET DATA TYPE text;
  ALTER TABLE "_header_v" ALTER COLUMN "version_button_link_kind" SET DEFAULT 'page'::text;
  DROP TYPE "public"."enum__header_v_version_button_link_kind";
  CREATE TYPE "public"."enum__header_v_version_button_link_kind" AS ENUM('page', 'url');
  ALTER TABLE "_header_v" ALTER COLUMN "version_button_link_kind" SET DEFAULT 'page'::"public"."enum__header_v_version_button_link_kind";
  ALTER TABLE "_header_v" ALTER COLUMN "version_button_link_kind" SET DATA TYPE "public"."enum__header_v_version_button_link_kind" USING "version_button_link_kind"::"public"."enum__header_v_version_button_link_kind";
  ALTER TABLE "footer_links" ADD CONSTRAINT "footer_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer_links" ADD CONSTRAINT "footer_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_links" ADD CONSTRAINT "_footer_v_version_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_footer_v_version_links" ADD CONSTRAINT "_footer_v_version_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "footer_links_order_idx" ON "footer_links" USING btree ("_order");
  CREATE INDEX "footer_links_parent_id_idx" ON "footer_links" USING btree ("_parent_id");
  CREATE INDEX "footer_links_link_link_page_idx" ON "footer_links" USING btree ("link_page_id");
  CREATE INDEX "_footer_v_version_links_order_idx" ON "_footer_v_version_links" USING btree ("_order");
  CREATE INDEX "_footer_v_version_links_parent_id_idx" ON "_footer_v_version_links" USING btree ("_parent_id");
  CREATE INDEX "_footer_v_version_links_link_link_page_idx" ON "_footer_v_version_links" USING btree ("link_page_id");
  ALTER TABLE "pages" DROP COLUMN "campaign";
  ALTER TABLE "_pages_v" DROP COLUMN "version_campaign";
  ALTER TABLE "site" DROP COLUMN "font_faces";
  ALTER TABLE "site" DROP COLUMN "font_key";
  ALTER TABLE "site" DROP COLUMN "contact_hours";
  ALTER TABLE "site" DROP COLUMN "seo_description";
  ALTER TABLE "_site_v" DROP COLUMN "version_font_faces";
  ALTER TABLE "_site_v" DROP COLUMN "version_font_key";
  ALTER TABLE "_site_v" DROP COLUMN "version_contact_hours";
  ALTER TABLE "_site_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "footer" DROP COLUMN "show_menu";
  ALTER TABLE "_footer_v" DROP COLUMN "version_show_menu";`)
}
