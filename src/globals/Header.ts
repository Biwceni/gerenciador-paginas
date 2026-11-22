import type { GlobalConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { publishedOrAuthenticated } from '../access/published'
import { linkField } from '../fields/link'
import { revalidateGlobalOnPublish } from '../hooks/revalidate'
import { MENU_GROUP_LIMIT, TOPBAR_LABEL_MAX } from '../lib/menu'
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
      // Linha de cima (M1): fina, acima do topo, com o telefone, o horário ou um link curto.
      name: 'topBar',
      type: 'group',
      label: 'Linha de cima',
      admin: { description: 'Opcional. Telefone e horário vêm das configurações do site.' },
      fields: [
        { name: 'phone', type: 'checkbox', label: 'Mostrar o telefone', defaultValue: false },
        { name: 'hours', type: 'checkbox', label: 'Mostrar o horário', defaultValue: false },
        {
          name: 'linkLabel',
          type: 'text',
          label: 'Texto do link curto',
          maxLength: TOPBAR_LABEL_MAX,
        },
        linkField({ required: false }),
      ],
    },
    {
      name: 'items',
      type: 'array',
      label: 'Menu',
      labels: { singular: 'Item do menu', plural: 'Itens do menu' },
      maxRows: 8,
      admin: {
        description:
          'Itens que levam para páginas que não estão no ar ficam escondidos. Um item com links dentro vira um grupo, que abre ao clicar.',
      },
      fields: [
        { name: 'label', type: 'text', label: 'Texto no menu', required: true, maxLength: 30 },
        // Num grupo (com links dentro), o item só abre a lista e não leva a lugar nenhum.
        linkField({ required: false }),
        {
          name: 'children',
          type: 'array',
          label: 'Links dentro do grupo',
          labels: { singular: 'Link do grupo', plural: 'Links do grupo' },
          maxRows: MENU_GROUP_LIMIT,
          fields: [
            { name: 'label', type: 'text', label: 'Texto no menu', required: true, maxLength: 30 },
            linkField(),
          ],
        },
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
