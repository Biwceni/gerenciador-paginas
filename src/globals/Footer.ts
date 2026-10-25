import type { GlobalConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { publishedOrAuthenticated } from '../access/published'
import { revalidateGlobalOnPublish } from '../hooks/revalidate'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Rodapé',
  access: {
    read: publishedOrAuthenticated,
    readVersions: authenticated,
    update: authenticated,
  },
  admin: {
    group: 'Site',
    description:
      'Fim de todas as páginas. Telefone, e-mail, endereço e horário vêm das configurações do site.',
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
      name: 'text',
      type: 'textarea',
      label: 'Frase do rodapé',
      maxLength: 300,
    },
    {
      name: 'showMenu',
      type: 'checkbox',
      label: 'Repetir os links do menu',
      defaultValue: true,
    },
    {
      name: 'showContact',
      type: 'checkbox',
      label: 'Mostrar contato e endereço',
      defaultValue: true,
    },
    {
      name: 'showSocial',
      type: 'checkbox',
      label: 'Mostrar as redes sociais',
      defaultValue: true,
    },
  ],
}
