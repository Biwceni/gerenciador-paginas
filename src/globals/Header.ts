import type { GlobalConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { publishedOrAuthenticated } from '../access/published'
import { linkField } from '../fields/link'
import { revalidateGlobalOnPublish } from '../hooks/revalidate'

export const Header: GlobalConfig = {
  slug: 'header',
  label: 'Cabeçalho',
  access: {
    read: publishedOrAuthenticated,
    readVersions: authenticated,
    update: authenticated,
  },
  admin: {
    group: 'Site',
    description: 'Topo de todas as páginas: logo, menu e um botão de destaque.',
  },
  versions: {
    drafts: true,
    max: 20,
  },
  hooks: {
    afterChange: [revalidateGlobalOnPublish],
  },
  fields: [
    {
      name: 'items',
      type: 'array',
      label: 'Menu',
      labels: { singular: 'Item do menu', plural: 'Itens do menu' },
      maxRows: 8,
      admin: {
        description: 'Itens que levam para páginas que não estão no ar ficam escondidos.',
      },
      fields: [
        { name: 'label', type: 'text', label: 'Texto no menu', required: true, maxLength: 30 },
        linkField(),
      ],
    },
    {
      name: 'button',
      type: 'group',
      label: 'Botão de destaque',
      admin: { description: 'Opcional. Ex.: "Fale conosco".' },
      fields: [
        { name: 'label', type: 'text', label: 'Texto do botão', maxLength: 30 },
        linkField({ required: false }),
      ],
    },
  ],
}
