import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_start_shows" AS ENUM('products', 'services', 'units', 'agenda', 'team', 'files', 'contact');
  CREATE TYPE "public"."enum__site_v_version_start_shows" AS ENUM('products', 'services', 'units', 'agenda', 'team', 'files', 'contact');
  CREATE TABLE "site_backups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"site" jsonb NOT NULL,
  	"header" jsonb NOT NULL,
  	"footer" jsonb NOT NULL,
  	"pages" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_start_shows" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_site_start_shows",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_site_v_version_start_shows" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__site_v_version_start_shows",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "site_backups_id" integer;
  ALTER TABLE "site_start_shows" ADD CONSTRAINT "site_start_shows_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_v_version_start_shows" ADD CONSTRAINT "_site_v_version_start_shows_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_site_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_backups_updated_at_idx" ON "site_backups" USING btree ("updated_at");
  CREATE INDEX "site_backups_created_at_idx" ON "site_backups" USING btree ("created_at");
  CREATE INDEX "site_start_shows_order_idx" ON "site_start_shows" USING btree ("order");
  CREATE INDEX "site_start_shows_parent_idx" ON "site_start_shows" USING btree ("parent_id");
  CREATE INDEX "_site_v_version_start_shows_order_idx" ON "_site_v_version_start_shows" USING btree ("order");
  CREATE INDEX "_site_v_version_start_shows_parent_idx" ON "_site_v_version_start_shows" USING btree ("parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_backups_fk" FOREIGN KEY ("site_backups_id") REFERENCES "public"."site_backups"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_site_backups_id_idx" ON "payload_locked_documents_rels" USING btree ("site_backups_id");
  ALTER TABLE "site_backups" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_start_shows" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_v_version_start_shows" ENABLE ROW LEVEL SECURITY;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_backups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_start_shows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_v_version_start_shows" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "site_backups" CASCADE;
  DROP TABLE "site_start_shows" CASCADE;
  DROP TABLE "_site_v_version_start_shows" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_site_backups_fk";
  
  DROP INDEX "payload_locked_documents_rels_site_backups_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "site_backups_id";
  DROP TYPE "public"."enum_site_start_shows";
  DROP TYPE "public"."enum__site_v_version_start_shows";`)
}
