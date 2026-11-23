import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/users'
import { restoreBackupEndpoint } from '../endpoints/applyTemplate'

/**
 * A8: cópia de segurança do site antes de trocar de negócio no Começar. Guarda as Configurações,
 * o menu e o rodapé como estavam no ar, e as páginas que foram para "Arquivadas" (com o endereço e
 * se estavam no ar). "Voltar para este site", em Páginas › Arquivadas, põe tudo de volta.
 * Só o servidor escreve (`lib/siteBackup.ts`); o administrador lê e pode apagar.
 */
export const SiteBackups: CollectionConfig = {
  slug: 'site-backups',
  labels: { singular: 'Site anterior', plural: 'Sites anteriores' },
  admin: { hidden: true, useAsTitle: 'name' },
  access: {
    read: isAdmin,
    create: () => false,
    update: () => false,
    delete: isAdmin,
  },
  endpoints: [restoreBackupEndpoint],
  fields: [
    { name: 'name', type: 'text', label: 'Nome do site', required: true },
    { name: 'site', type: 'json', required: true },
    { name: 'header', type: 'json', required: true },
    { name: 'footer', type: 'json', required: true },
    // [{ id, slug, live }]: as páginas guardadas, com o endereço de antes e se estavam no ar.
    { name: 'pages', type: 'json', required: true },
  ],
}
