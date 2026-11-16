import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates" ADD COLUMN "site_whatsapp_message" varchar;
  ALTER TABLE "templates" ADD COLUMN "footer_cta_title" varchar;
  ALTER TABLE "_templates_v" ADD COLUMN "version_site_whatsapp_message" varchar;
  ALTER TABLE "_templates_v" ADD COLUMN "version_footer_cta_title" varchar;
  ALTER TABLE "site" ADD COLUMN "logo_ring_header" boolean DEFAULT false;
  ALTER TABLE "site" ADD COLUMN "logo_ring_footer" boolean DEFAULT false;
  ALTER TABLE "site" ADD COLUMN "contact_whatsapp_message" varchar;
  ALTER TABLE "site" ADD COLUMN "contact_whatsapp_float_phone" boolean DEFAULT true;
  ALTER TABLE "site" ADD COLUMN "contact_whatsapp_float_desktop" boolean DEFAULT false;
  ALTER TABLE "_site_v" ADD COLUMN "version_logo_ring_header" boolean DEFAULT false;
  ALTER TABLE "_site_v" ADD COLUMN "version_logo_ring_footer" boolean DEFAULT false;
  ALTER TABLE "_site_v" ADD COLUMN "version_contact_whatsapp_message" varchar;
  ALTER TABLE "_site_v" ADD COLUMN "version_contact_whatsapp_float_phone" boolean DEFAULT true;
  ALTER TABLE "_site_v" ADD COLUMN "version_contact_whatsapp_float_desktop" boolean DEFAULT false;
  ALTER TABLE "footer" ADD COLUMN "cta_show" boolean DEFAULT true;
  ALTER TABLE "footer" ADD COLUMN "cta_title" varchar;
  ALTER TABLE "footer" ADD COLUMN "show_hours" boolean DEFAULT true;
  ALTER TABLE "footer" ADD COLUMN "show_back_to_top" boolean DEFAULT true;
  ALTER TABLE "_footer_v" ADD COLUMN "version_cta_show" boolean DEFAULT true;
  ALTER TABLE "_footer_v" ADD COLUMN "version_cta_title" varchar;
  ALTER TABLE "_footer_v" ADD COLUMN "version_show_hours" boolean DEFAULT true;
  ALTER TABLE "_footer_v" ADD COLUMN "version_show_back_to_top" boolean DEFAULT true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates" DROP COLUMN "site_whatsapp_message";
  ALTER TABLE "templates" DROP COLUMN "footer_cta_title";
  ALTER TABLE "_templates_v" DROP COLUMN "version_site_whatsapp_message";
  ALTER TABLE "_templates_v" DROP COLUMN "version_footer_cta_title";
  ALTER TABLE "site" DROP COLUMN "logo_ring_header";
  ALTER TABLE "site" DROP COLUMN "logo_ring_footer";
  ALTER TABLE "site" DROP COLUMN "contact_whatsapp_message";
  ALTER TABLE "site" DROP COLUMN "contact_whatsapp_float_phone";
  ALTER TABLE "site" DROP COLUMN "contact_whatsapp_float_desktop";
  ALTER TABLE "_site_v" DROP COLUMN "version_logo_ring_header";
  ALTER TABLE "_site_v" DROP COLUMN "version_logo_ring_footer";
  ALTER TABLE "_site_v" DROP COLUMN "version_contact_whatsapp_message";
  ALTER TABLE "_site_v" DROP COLUMN "version_contact_whatsapp_float_phone";
  ALTER TABLE "_site_v" DROP COLUMN "version_contact_whatsapp_float_desktop";
  ALTER TABLE "footer" DROP COLUMN "cta_show";
  ALTER TABLE "footer" DROP COLUMN "cta_title";
  ALTER TABLE "footer" DROP COLUMN "show_hours";
  ALTER TABLE "footer" DROP COLUMN "show_back_to_top";
  ALTER TABLE "_footer_v" DROP COLUMN "version_cta_show";
  ALTER TABLE "_footer_v" DROP COLUMN "version_cta_title";
  ALTER TABLE "_footer_v" DROP COLUMN "version_show_hours";
  ALTER TABLE "_footer_v" DROP COLUMN "version_show_back_to_top";`)
}
