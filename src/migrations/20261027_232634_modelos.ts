import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Fase 4: coleção Modelos (com versões) e, nas fotos, o endereço de onde a foto de um modelo foi
// copiada. Só acrescenta. As tabelas novas já nascem com RLS (ver a migração `rls_tabelas`).

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_templates_forms_fields_type" AS ENUM('text', 'email', 'textarea');
  CREATE TYPE "public"."enum_templates_header_items_link_kind" AS ENUM('page', 'section', 'whatsapp', 'url');
  CREATE TYPE "public"."enum_templates_kind" AS ENUM('site', 'page');
  CREATE TYPE "public"."enum_templates_site_type" AS ENUM('institucional', 'onepage', 'landing', 'evento', 'pessoal', 'links', 'embreve');
  CREATE TYPE "public"."enum_templates_segment" AS ENUM('cafe', 'saude', 'servicos', 'loja', 'outro');
  CREATE TYPE "public"."enum_templates_header_button_link_kind" AS ENUM('page', 'section', 'whatsapp', 'url');
  CREATE TYPE "public"."enum__templates_v_version_forms_fields_type" AS ENUM('text', 'email', 'textarea');
  CREATE TYPE "public"."enum__templates_v_version_header_items_link_kind" AS ENUM('page', 'section', 'whatsapp', 'url');
  CREATE TYPE "public"."enum__templates_v_version_kind" AS ENUM('site', 'page');
  CREATE TYPE "public"."enum__templates_v_version_site_type" AS ENUM('institucional', 'onepage', 'landing', 'evento', 'pessoal', 'links', 'embreve');
  CREATE TYPE "public"."enum__templates_v_version_segment" AS ENUM('cafe', 'saude', 'servicos', 'loja', 'outro');
  CREATE TYPE "public"."enum__templates_v_version_header_button_link_kind" AS ENUM('page', 'section', 'whatsapp', 'url');
  CREATE TABLE "templates_pages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"campaign" boolean DEFAULT false,
  	"content" jsonb NOT NULL
  );
  
  CREATE TABLE "templates_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"alt" varchar NOT NULL
  );
  
  CREATE TABLE "templates_forms_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_templates_forms_fields_type" DEFAULT 'text' NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"required" boolean DEFAULT false
  );
  
  CREATE TABLE "templates_forms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"submit_button_label" varchar NOT NULL
  );
  
  CREATE TABLE "templates_header_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_kind" "enum_templates_header_items_link_kind" DEFAULT 'page',
  	"link_page" numeric,
  	"link_section" varchar,
  	"link_url" varchar
  );
  
  CREATE TABLE "templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"kind" "enum_templates_kind" DEFAULT 'site' NOT NULL,
  	"site_type" "enum_templates_site_type",
  	"segment" "enum_templates_segment",
  	"order" numeric DEFAULT 0,
  	"site_name" varchar,
  	"site_tagline" varchar,
  	"site_colors_primary" varchar DEFAULT '#1d4ed8',
  	"site_colors_background" varchar DEFAULT '#ffffff',
  	"site_colors_surface" varchar DEFAULT '#f3f4f6',
  	"site_colors_text" varchar DEFAULT '#1f2933',
  	"site_colors_footer" varchar DEFAULT '#111827',
  	"site_fonts_headings" varchar,
  	"site_fonts_body" varchar,
  	"site_address" varchar,
  	"site_hours" varchar,
  	"header_button_label" varchar,
  	"header_button_link_kind" "enum_templates_header_button_link_kind" DEFAULT 'page',
  	"header_button_link_page" numeric,
  	"header_button_link_section" varchar,
  	"header_button_link_url" varchar,
  	"footer_text" varchar,
  	"footer_show_menu" boolean DEFAULT true,
  	"footer_show_contact" boolean DEFAULT true,
  	"footer_show_social" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_templates_v_version_pages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"campaign" boolean DEFAULT false,
  	"content" jsonb NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_version_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"alt" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_version_forms_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__templates_v_version_forms_fields_type" DEFAULT 'text' NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"required" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_version_forms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"submit_button_label" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_version_header_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_kind" "enum__templates_v_version_header_items_link_kind" DEFAULT 'page',
  	"link_page" numeric,
  	"link_section" varchar,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_key" varchar NOT NULL,
  	"version_name" varchar NOT NULL,
  	"version_description" varchar,
  	"version_kind" "enum__templates_v_version_kind" DEFAULT 'site' NOT NULL,
  	"version_site_type" "enum__templates_v_version_site_type",
  	"version_segment" "enum__templates_v_version_segment",
  	"version_order" numeric DEFAULT 0,
  	"version_site_name" varchar,
  	"version_site_tagline" varchar,
  	"version_site_colors_primary" varchar DEFAULT '#1d4ed8',
  	"version_site_colors_background" varchar DEFAULT '#ffffff',
  	"version_site_colors_surface" varchar DEFAULT '#f3f4f6',
  	"version_site_colors_text" varchar DEFAULT '#1f2933',
  	"version_site_colors_footer" varchar DEFAULT '#111827',
  	"version_site_fonts_headings" varchar,
  	"version_site_fonts_body" varchar,
  	"version_site_address" varchar,
  	"version_site_hours" varchar,
  	"version_header_button_label" varchar,
  	"version_header_button_link_kind" "enum__templates_v_version_header_button_link_kind" DEFAULT 'page',
  	"version_header_button_link_page" numeric,
  	"version_header_button_link_section" varchar,
  	"version_header_button_link_url" varchar,
  	"version_footer_text" varchar,
  	"version_footer_show_menu" boolean DEFAULT true,
  	"version_footer_show_contact" boolean DEFAULT true,
  	"version_footer_show_social" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "media" ADD COLUMN "source_url" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "templates_id" integer;
  ALTER TABLE "templates_pages" ADD CONSTRAINT "templates_pages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_photos" ADD CONSTRAINT "templates_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_forms_fields" ADD CONSTRAINT "templates_forms_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_forms" ADD CONSTRAINT "templates_forms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_header_items" ADD CONSTRAINT "templates_header_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_version_pages" ADD CONSTRAINT "_templates_v_version_pages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_version_photos" ADD CONSTRAINT "_templates_v_version_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_version_forms_fields" ADD CONSTRAINT "_templates_v_version_forms_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_version_forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_version_forms" ADD CONSTRAINT "_templates_v_version_forms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_version_header_items" ADD CONSTRAINT "_templates_v_version_header_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v" ADD CONSTRAINT "_templates_v_parent_id_templates_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "templates_pages_order_idx" ON "templates_pages" USING btree ("_order");
  CREATE INDEX "templates_pages_parent_id_idx" ON "templates_pages" USING btree ("_parent_id");
  CREATE INDEX "templates_photos_order_idx" ON "templates_photos" USING btree ("_order");
  CREATE INDEX "templates_photos_parent_id_idx" ON "templates_photos" USING btree ("_parent_id");
  CREATE INDEX "templates_forms_fields_order_idx" ON "templates_forms_fields" USING btree ("_order");
  CREATE INDEX "templates_forms_fields_parent_id_idx" ON "templates_forms_fields" USING btree ("_parent_id");
  CREATE INDEX "templates_forms_order_idx" ON "templates_forms" USING btree ("_order");
  CREATE INDEX "templates_forms_parent_id_idx" ON "templates_forms" USING btree ("_parent_id");
  CREATE INDEX "templates_header_items_order_idx" ON "templates_header_items" USING btree ("_order");
  CREATE INDEX "templates_header_items_parent_id_idx" ON "templates_header_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "templates_key_idx" ON "templates" USING btree ("key");
  CREATE INDEX "templates_updated_at_idx" ON "templates" USING btree ("updated_at");
  CREATE INDEX "templates_created_at_idx" ON "templates" USING btree ("created_at");
  CREATE INDEX "_templates_v_version_pages_order_idx" ON "_templates_v_version_pages" USING btree ("_order");
  CREATE INDEX "_templates_v_version_pages_parent_id_idx" ON "_templates_v_version_pages" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_version_photos_order_idx" ON "_templates_v_version_photos" USING btree ("_order");
  CREATE INDEX "_templates_v_version_photos_parent_id_idx" ON "_templates_v_version_photos" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_version_forms_fields_order_idx" ON "_templates_v_version_forms_fields" USING btree ("_order");
  CREATE INDEX "_templates_v_version_forms_fields_parent_id_idx" ON "_templates_v_version_forms_fields" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_version_forms_order_idx" ON "_templates_v_version_forms" USING btree ("_order");
  CREATE INDEX "_templates_v_version_forms_parent_id_idx" ON "_templates_v_version_forms" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_version_header_items_order_idx" ON "_templates_v_version_header_items" USING btree ("_order");
  CREATE INDEX "_templates_v_version_header_items_parent_id_idx" ON "_templates_v_version_header_items" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_parent_idx" ON "_templates_v" USING btree ("parent_id");
  CREATE INDEX "_templates_v_version_version_key_idx" ON "_templates_v" USING btree ("version_key");
  CREATE INDEX "_templates_v_version_version_updated_at_idx" ON "_templates_v" USING btree ("version_updated_at");
  CREATE INDEX "_templates_v_version_version_created_at_idx" ON "_templates_v" USING btree ("version_created_at");
  CREATE INDEX "_templates_v_created_at_idx" ON "_templates_v" USING btree ("created_at");
  CREATE INDEX "_templates_v_updated_at_idx" ON "_templates_v" USING btree ("updated_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_templates_fk" FOREIGN KEY ("templates_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_source_url_idx" ON "media" USING btree ("source_url");
  CREATE INDEX "payload_locked_documents_rels_templates_id_idx" ON "payload_locked_documents_rels" USING btree ("templates_id");
  ALTER TABLE "templates_pages" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_photos" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_forms_fields" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_forms" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_header_items" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_version_pages" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_version_photos" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_version_forms_fields" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_version_forms" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_version_header_items" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v" ENABLE ROW LEVEL SECURITY;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_forms_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_forms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_header_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_version_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_version_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_version_forms_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_version_forms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_version_header_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "templates_pages" CASCADE;
  DROP TABLE "templates_photos" CASCADE;
  DROP TABLE "templates_forms_fields" CASCADE;
  DROP TABLE "templates_forms" CASCADE;
  DROP TABLE "templates_header_items" CASCADE;
  DROP TABLE "templates" CASCADE;
  DROP TABLE "_templates_v_version_pages" CASCADE;
  DROP TABLE "_templates_v_version_photos" CASCADE;
  DROP TABLE "_templates_v_version_forms_fields" CASCADE;
  DROP TABLE "_templates_v_version_forms" CASCADE;
  DROP TABLE "_templates_v_version_header_items" CASCADE;
  DROP TABLE "_templates_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_templates_fk";
  
  DROP INDEX "media_source_url_idx";
  DROP INDEX "payload_locked_documents_rels_templates_id_idx";
  ALTER TABLE "media" DROP COLUMN "source_url";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "templates_id";
  DROP TYPE "public"."enum_templates_forms_fields_type";
  DROP TYPE "public"."enum_templates_header_items_link_kind";
  DROP TYPE "public"."enum_templates_kind";
  DROP TYPE "public"."enum_templates_site_type";
  DROP TYPE "public"."enum_templates_segment";
  DROP TYPE "public"."enum_templates_header_button_link_kind";
  DROP TYPE "public"."enum__templates_v_version_forms_fields_type";
  DROP TYPE "public"."enum__templates_v_version_header_items_link_kind";
  DROP TYPE "public"."enum__templates_v_version_kind";
  DROP TYPE "public"."enum__templates_v_version_site_type";
  DROP TYPE "public"."enum__templates_v_version_segment";
  DROP TYPE "public"."enum__templates_v_version_header_button_link_kind";`)
}
