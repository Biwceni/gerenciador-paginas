import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_form_files_status" AS ENUM('pending', 'attached');
  CREATE TYPE "public"."enum_forms_blocks_file_accept" AS ENUM('photo', 'document');
  CREATE TABLE "form_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"form_id" integer,
  	"field" varchar NOT NULL,
  	"filename" varchar NOT NULL,
  	"mime_type" varchar,
  	"size" numeric NOT NULL,
  	"key" varchar NOT NULL,
  	"token_hash" varchar NOT NULL,
  	"status" "enum_form_files_status" DEFAULT 'pending',
  	"submission_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "forms_blocks_date" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"days" numeric DEFAULT 30,
  	"weekdays" varchar DEFAULT '1,2,3,4,5,6',
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_time" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"from" varchar DEFAULT '08:00',
  	"to" varchar DEFAULT '18:00',
  	"step" numeric DEFAULT 30,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_unit" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_file" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"accept" "enum_forms_blocks_file_accept" DEFAULT 'photo',
  	"block_name" varchar
  );
  
  CREATE TABLE "form_submissions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"form_files_id" integer
  );
  
  CREATE TABLE "site_contact_units" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"address" varchar,
  	"phone" varchar,
  	"phone2" varchar,
  	"whatsapp" varchar,
  	"schedule" jsonb,
  	"hours_note" varchar,
  	"specials" jsonb
  );
  
  CREATE TABLE "_site_v_version_contact_units" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"address" varchar,
  	"phone" varchar,
  	"phone2" varchar,
  	"whatsapp" varchar,
  	"schedule" jsonb,
  	"hours_note" varchar,
  	"specials" jsonb,
  	"_uuid" varchar
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "form_files_id" integer;
  ALTER TABLE "form_files" ADD CONSTRAINT "form_files_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_files" ADD CONSTRAINT "form_files_submission_id_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms_blocks_date" ADD CONSTRAINT "forms_blocks_date_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_time" ADD CONSTRAINT "forms_blocks_time_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_unit" ADD CONSTRAINT "forms_blocks_unit_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_file" ADD CONSTRAINT "forms_blocks_file_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions_rels" ADD CONSTRAINT "form_submissions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions_rels" ADD CONSTRAINT "form_submissions_rels_form_files_fk" FOREIGN KEY ("form_files_id") REFERENCES "public"."form_files"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_contact_units" ADD CONSTRAINT "site_contact_units_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_v_version_contact_units" ADD CONSTRAINT "_site_v_version_contact_units_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "form_files_form_idx" ON "form_files" USING btree ("form_id");
  CREATE INDEX "form_files_status_idx" ON "form_files" USING btree ("status");
  CREATE INDEX "form_files_submission_idx" ON "form_files" USING btree ("submission_id");
  CREATE INDEX "form_files_updated_at_idx" ON "form_files" USING btree ("updated_at");
  CREATE INDEX "form_files_created_at_idx" ON "form_files" USING btree ("created_at");
  CREATE INDEX "forms_blocks_date_order_idx" ON "forms_blocks_date" USING btree ("_order");
  CREATE INDEX "forms_blocks_date_parent_id_idx" ON "forms_blocks_date" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_date_path_idx" ON "forms_blocks_date" USING btree ("_path");
  CREATE INDEX "forms_blocks_time_order_idx" ON "forms_blocks_time" USING btree ("_order");
  CREATE INDEX "forms_blocks_time_parent_id_idx" ON "forms_blocks_time" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_time_path_idx" ON "forms_blocks_time" USING btree ("_path");
  CREATE INDEX "forms_blocks_unit_order_idx" ON "forms_blocks_unit" USING btree ("_order");
  CREATE INDEX "forms_blocks_unit_parent_id_idx" ON "forms_blocks_unit" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_unit_path_idx" ON "forms_blocks_unit" USING btree ("_path");
  CREATE INDEX "forms_blocks_file_order_idx" ON "forms_blocks_file" USING btree ("_order");
  CREATE INDEX "forms_blocks_file_parent_id_idx" ON "forms_blocks_file" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_file_path_idx" ON "forms_blocks_file" USING btree ("_path");
  CREATE INDEX "form_submissions_rels_order_idx" ON "form_submissions_rels" USING btree ("order");
  CREATE INDEX "form_submissions_rels_parent_idx" ON "form_submissions_rels" USING btree ("parent_id");
  CREATE INDEX "form_submissions_rels_path_idx" ON "form_submissions_rels" USING btree ("path");
  CREATE INDEX "form_submissions_rels_form_files_id_idx" ON "form_submissions_rels" USING btree ("form_files_id");
  CREATE INDEX "site_contact_units_order_idx" ON "site_contact_units" USING btree ("_order");
  CREATE INDEX "site_contact_units_parent_id_idx" ON "site_contact_units" USING btree ("_parent_id");
  CREATE INDEX "_site_v_version_contact_units_order_idx" ON "_site_v_version_contact_units" USING btree ("_order");
  CREATE INDEX "_site_v_version_contact_units_parent_id_idx" ON "_site_v_version_contact_units" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_files_fk" FOREIGN KEY ("form_files_id") REFERENCES "public"."form_files"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_form_files_id_idx" ON "payload_locked_documents_rels" USING btree ("form_files_id");`)

  // D1: o contato de hoje (WhatsApp, telefone, endereço e horário) vira a primeira unidade, no
  // site no ar e em cada versão guardada (o rascunho do painel lê a última). O horário de antes é
  // texto livre: vai para a observação, e o dono marca os dias quando quiser.
  await db.execute(sql`
  INSERT INTO "site_contact_units" ("_order", "_parent_id", "id", "phone", "whatsapp", "address", "hours_note")
  SELECT 1, "id", substr(md5(random()::text || "id"::text), 1, 24), "contact_phone", "contact_whatsapp", "contact_address", "contact_hours"
  FROM "site"
  WHERE coalesce(nullif(trim("contact_phone"), ''), nullif(trim("contact_whatsapp"), ''), nullif(trim("contact_address"), ''), nullif(trim("contact_hours"), '')) IS NOT NULL;

  INSERT INTO "_site_v_version_contact_units" ("_order", "_parent_id", "phone", "whatsapp", "address", "hours_note", "_uuid")
  SELECT 1, "id", "version_contact_phone", "version_contact_whatsapp", "version_contact_address", "version_contact_hours", substr(md5(random()::text || "id"::text), 1, 24)
  FROM "_site_v"
  WHERE coalesce(nullif(trim("version_contact_phone"), ''), nullif(trim("version_contact_whatsapp"), ''), nullif(trim("version_contact_address"), ''), nullif(trim("version_contact_hours"), '')) IS NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "form_files" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_blocks_date" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_blocks_time" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_blocks_unit" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_blocks_file" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "form_submissions_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_contact_units" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_v_version_contact_units" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "form_files" CASCADE;
  DROP TABLE "forms_blocks_date" CASCADE;
  DROP TABLE "forms_blocks_time" CASCADE;
  DROP TABLE "forms_blocks_unit" CASCADE;
  DROP TABLE "forms_blocks_file" CASCADE;
  DROP TABLE "form_submissions_rels" CASCADE;
  DROP TABLE "site_contact_units" CASCADE;
  DROP TABLE "_site_v_version_contact_units" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_form_files_fk";
  
  DROP INDEX "payload_locked_documents_rels_form_files_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "form_files_id";
  DROP TYPE "public"."enum_form_files_status";
  DROP TYPE "public"."enum_forms_blocks_file_accept";`)
}
