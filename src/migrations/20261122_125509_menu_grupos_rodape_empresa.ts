import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_header_items_children_link_kind" AS ENUM('page', 'section', 'whatsapp', 'url');
  CREATE TYPE "public"."enum_header_top_bar_link_kind" AS ENUM('page', 'section', 'whatsapp', 'url');
  CREATE TYPE "public"."enum__header_v_version_items_children_link_kind" AS ENUM('page', 'section', 'whatsapp', 'url');
  CREATE TYPE "public"."enum__header_v_version_top_bar_link_kind" AS ENUM('page', 'section', 'whatsapp', 'url');
  CREATE TYPE "public"."enum_footer_columns_links_link_kind" AS ENUM('page', 'section', 'whatsapp', 'url');
  CREATE TYPE "public"."enum__footer_v_version_columns_links_link_kind" AS ENUM('page', 'section', 'whatsapp', 'url');
  CREATE TABLE "header_items_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_kind" "enum_header_items_children_link_kind" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_section" varchar,
  	"link_url" varchar
  );
  
  CREATE TABLE "_header_v_version_items_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_kind" "enum__header_v_version_items_children_link_kind" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_section" varchar,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "footer_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_kind" "enum_footer_columns_links_link_kind" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_section" varchar,
  	"link_url" varchar
  );
  
  CREATE TABLE "footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );
  
  CREATE TABLE "_footer_v_version_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_kind" "enum__footer_v_version_columns_links_link_kind" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_section" varchar,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_footer_v_version_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "site" ADD COLUMN "company_legal_name" varchar;
  ALTER TABLE "site" ADD COLUMN "company_cnpj" varchar;
  ALTER TABLE "site" ADD COLUMN "company_responsible" varchar;
  ALTER TABLE "_site_v" ADD COLUMN "version_company_legal_name" varchar;
  ALTER TABLE "_site_v" ADD COLUMN "version_company_cnpj" varchar;
  ALTER TABLE "_site_v" ADD COLUMN "version_company_responsible" varchar;
  ALTER TABLE "header" ADD COLUMN "top_bar_phone" boolean DEFAULT false;
  ALTER TABLE "header" ADD COLUMN "top_bar_hours" boolean DEFAULT false;
  ALTER TABLE "header" ADD COLUMN "top_bar_link_label" varchar;
  ALTER TABLE "header" ADD COLUMN "top_bar_link_kind" "enum_header_top_bar_link_kind" DEFAULT 'page';
  ALTER TABLE "header" ADD COLUMN "top_bar_link_page_id" integer;
  ALTER TABLE "header" ADD COLUMN "top_bar_link_section" varchar;
  ALTER TABLE "header" ADD COLUMN "top_bar_link_url" varchar;
  ALTER TABLE "_header_v" ADD COLUMN "version_top_bar_phone" boolean DEFAULT false;
  ALTER TABLE "_header_v" ADD COLUMN "version_top_bar_hours" boolean DEFAULT false;
  ALTER TABLE "_header_v" ADD COLUMN "version_top_bar_link_label" varchar;
  ALTER TABLE "_header_v" ADD COLUMN "version_top_bar_link_kind" "enum__header_v_version_top_bar_link_kind" DEFAULT 'page';
  ALTER TABLE "_header_v" ADD COLUMN "version_top_bar_link_page_id" integer;
  ALTER TABLE "_header_v" ADD COLUMN "version_top_bar_link_section" varchar;
  ALTER TABLE "_header_v" ADD COLUMN "version_top_bar_link_url" varchar;
  ALTER TABLE "header_items_children" ADD CONSTRAINT "header_items_children_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "header_items_children" ADD CONSTRAINT "header_items_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_header_v_version_items_children" ADD CONSTRAINT "_header_v_version_items_children_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_header_v_version_items_children" ADD CONSTRAINT "_header_v_version_items_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_header_v_version_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns_links" ADD CONSTRAINT "footer_columns_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer_columns_links" ADD CONSTRAINT "footer_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns" ADD CONSTRAINT "footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_columns_links" ADD CONSTRAINT "_footer_v_version_columns_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_footer_v_version_columns_links" ADD CONSTRAINT "_footer_v_version_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v_version_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_columns" ADD CONSTRAINT "_footer_v_version_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "header_items_children_order_idx" ON "header_items_children" USING btree ("_order");
  CREATE INDEX "header_items_children_parent_id_idx" ON "header_items_children" USING btree ("_parent_id");
  CREATE INDEX "header_items_children_link_link_page_idx" ON "header_items_children" USING btree ("link_page_id");
  CREATE INDEX "_header_v_version_items_children_order_idx" ON "_header_v_version_items_children" USING btree ("_order");
  CREATE INDEX "_header_v_version_items_children_parent_id_idx" ON "_header_v_version_items_children" USING btree ("_parent_id");
  CREATE INDEX "_header_v_version_items_children_link_link_page_idx" ON "_header_v_version_items_children" USING btree ("link_page_id");
  CREATE INDEX "footer_columns_links_order_idx" ON "footer_columns_links" USING btree ("_order");
  CREATE INDEX "footer_columns_links_parent_id_idx" ON "footer_columns_links" USING btree ("_parent_id");
  CREATE INDEX "footer_columns_links_link_link_page_idx" ON "footer_columns_links" USING btree ("link_page_id");
  CREATE INDEX "footer_columns_order_idx" ON "footer_columns" USING btree ("_order");
  CREATE INDEX "footer_columns_parent_id_idx" ON "footer_columns" USING btree ("_parent_id");
  CREATE INDEX "_footer_v_version_columns_links_order_idx" ON "_footer_v_version_columns_links" USING btree ("_order");
  CREATE INDEX "_footer_v_version_columns_links_parent_id_idx" ON "_footer_v_version_columns_links" USING btree ("_parent_id");
  CREATE INDEX "_footer_v_version_columns_links_link_link_page_idx" ON "_footer_v_version_columns_links" USING btree ("link_page_id");
  CREATE INDEX "_footer_v_version_columns_order_idx" ON "_footer_v_version_columns" USING btree ("_order");
  CREATE INDEX "_footer_v_version_columns_parent_id_idx" ON "_footer_v_version_columns" USING btree ("_parent_id");
  ALTER TABLE "header" ADD CONSTRAINT "header_top_bar_link_page_id_pages_id_fk" FOREIGN KEY ("top_bar_link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_header_v" ADD CONSTRAINT "_header_v_version_top_bar_link_page_id_pages_id_fk" FOREIGN KEY ("version_top_bar_link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "header_top_bar_link_top_bar_link_page_idx" ON "header" USING btree ("top_bar_link_page_id");
  CREATE INDEX "_header_v_version_top_bar_link_version_top_bar_link_page_idx" ON "_header_v" USING btree ("version_top_bar_link_page_id");
  ALTER TABLE "header_items_children" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "_header_v_version_items_children" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "footer_columns_links" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "footer_columns" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "_footer_v_version_columns_links" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "_footer_v_version_columns" ENABLE ROW LEVEL SECURITY;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "header_items_children" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_header_v_version_items_children" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "footer_columns_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "footer_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_footer_v_version_columns_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_footer_v_version_columns" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "header_items_children" CASCADE;
  DROP TABLE "_header_v_version_items_children" CASCADE;
  DROP TABLE "footer_columns_links" CASCADE;
  DROP TABLE "footer_columns" CASCADE;
  DROP TABLE "_footer_v_version_columns_links" CASCADE;
  DROP TABLE "_footer_v_version_columns" CASCADE;
  ALTER TABLE "header" DROP CONSTRAINT "header_top_bar_link_page_id_pages_id_fk";
  
  ALTER TABLE "_header_v" DROP CONSTRAINT "_header_v_version_top_bar_link_page_id_pages_id_fk";
  
  DROP INDEX "header_top_bar_link_top_bar_link_page_idx";
  DROP INDEX "_header_v_version_top_bar_link_version_top_bar_link_page_idx";
  ALTER TABLE "site" DROP COLUMN "company_legal_name";
  ALTER TABLE "site" DROP COLUMN "company_cnpj";
  ALTER TABLE "site" DROP COLUMN "company_responsible";
  ALTER TABLE "_site_v" DROP COLUMN "version_company_legal_name";
  ALTER TABLE "_site_v" DROP COLUMN "version_company_cnpj";
  ALTER TABLE "_site_v" DROP COLUMN "version_company_responsible";
  ALTER TABLE "header" DROP COLUMN "top_bar_phone";
  ALTER TABLE "header" DROP COLUMN "top_bar_hours";
  ALTER TABLE "header" DROP COLUMN "top_bar_link_label";
  ALTER TABLE "header" DROP COLUMN "top_bar_link_kind";
  ALTER TABLE "header" DROP COLUMN "top_bar_link_page_id";
  ALTER TABLE "header" DROP COLUMN "top_bar_link_section";
  ALTER TABLE "header" DROP COLUMN "top_bar_link_url";
  ALTER TABLE "_header_v" DROP COLUMN "version_top_bar_phone";
  ALTER TABLE "_header_v" DROP COLUMN "version_top_bar_hours";
  ALTER TABLE "_header_v" DROP COLUMN "version_top_bar_link_label";
  ALTER TABLE "_header_v" DROP COLUMN "version_top_bar_link_kind";
  ALTER TABLE "_header_v" DROP COLUMN "version_top_bar_link_page_id";
  ALTER TABLE "_header_v" DROP COLUMN "version_top_bar_link_section";
  ALTER TABLE "_header_v" DROP COLUMN "version_top_bar_link_url";
  DROP TYPE "public"."enum_header_items_children_link_kind";
  DROP TYPE "public"."enum_header_top_bar_link_kind";
  DROP TYPE "public"."enum__header_v_version_items_children_link_kind";
  DROP TYPE "public"."enum__header_v_version_top_bar_link_kind";
  DROP TYPE "public"."enum_footer_columns_links_link_kind";
  DROP TYPE "public"."enum__footer_v_version_columns_links_link_kind";`)
}
