import type { GlobalConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { publishedOrAuthenticated } from '../access/published'
import { linkField } from '../fields/link'
import { revalidateGlobalOnPublish } from '../hooks/revalidate'
import { NOTICE_MAX } from '../lib/notice'

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
      // Faixa fina no alto de todas as páginas (extra do A2), com data para sair do ar sozinha.
      name: 'notice',
      type: 'group',
      label: 'Aviso no alto do site',
      admin: { description: 'Opcional. Aparece em todas as páginas, acima do topo.' },
      fields: [
        { name: 'text', type: 'text', label: 'Texto do aviso', maxLength: NOTICE_MAX },
        {
          name: 'until',
          type: 'date',
          label: 'Mostrar até',
          admin: {
            date: { pickerAppearance: 'dayOnly' },
            description: 'Opcional. Depois desse dia, o aviso some sozinho.',
          },
        },
      ],
    },
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
