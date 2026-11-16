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
      name: 'cta',
      type: 'group',
      label: 'Chamada no fim do site',
      admin: { description: 'Uma faixa antes do rodapé, com o mesmo botão de destaque do topo.' },
      fields: [
        { name: 'show', type: 'checkbox', label: 'Mostrar a chamada', defaultValue: true },
        { name: 'title', type: 'text', label: 'Título da chamada', maxLength: 50 },
      ],
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
    {
      name: 'showHours',
      type: 'checkbox',
      label: 'Mostrar o horário de funcionamento',
      defaultValue: true,
    },
    {
      name: 'showBackToTop',
      type: 'checkbox',
      label: 'Mostrar "Voltar ao topo"',
      defaultValue: true,
    },
  ],
}
