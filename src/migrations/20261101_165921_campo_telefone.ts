import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// v2, entrega 3a: tipo de campo "WhatsApp ou telefone". Só acrescenta a tabela, que o código no ar
// ignora. A conversão dos campos existentes é a migração seguinte, `converter_whatsapp`.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "forms_blocks_phone" (
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
  
  ALTER TABLE "forms_blocks_phone" ADD CONSTRAINT "forms_blocks_phone_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "forms_blocks_phone_order_idx" ON "forms_blocks_phone" USING btree ("_order");
  CREATE INDEX "forms_blocks_phone_parent_id_idx" ON "forms_blocks_phone" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_phone_path_idx" ON "forms_blocks_phone" USING btree ("_path");
  ALTER TABLE "forms_blocks_phone" ENABLE ROW LEVEL SECURITY;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "forms_blocks_phone" CASCADE;`)
}
