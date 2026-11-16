import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Elementor, E2: "Minhas seções", as seções guardadas no editor. Tabela nova, com RLS ligado como
// todas as outras (só o Payload, dono da tabela, lê e escreve).

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "saved_sections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"section" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "saved_sections_id" integer;
  CREATE INDEX "saved_sections_updated_at_idx" ON "saved_sections" USING btree ("updated_at");
  CREATE INDEX "saved_sections_created_at_idx" ON "saved_sections" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_saved_sections_fk" FOREIGN KEY ("saved_sections_id") REFERENCES "public"."saved_sections"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_saved_sections_id_idx" ON "payload_locked_documents_rels" USING btree ("saved_sections_id");
  ALTER TABLE "saved_sections" ENABLE ROW LEVEL SECURITY;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_saved_sections_fk";
  DROP INDEX "payload_locked_documents_rels_saved_sections_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "saved_sections_id";
  DROP TABLE "saved_sections" CASCADE;`)
}
