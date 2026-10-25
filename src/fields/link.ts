import type { GroupField } from 'payload'

import { validateExternalURL } from '../lib/links'

type LinkFieldArgs = {
  name?: string
  label?: string
  required?: boolean
}

/**
 * Link escolhido como no editor: uma página do site (relação, não endereço digitado), o WhatsApp
 * das configurações ou um endereço de fora. O mesmo formato de `linkRefSchema`, com nomes de campo do Payload.
 */
export function linkField({
  name = 'link',
  label = 'Para onde leva',
  required = true,
}: LinkFieldArgs = {}): GroupField {
  return {
    name,
    type: 'group',
    label,
    fields: [
      {
        name: 'kind',
        type: 'radio',
        label: 'Tipo de link',
        defaultValue: 'page',
        options: [
          { label: 'Uma página do site', value: 'page' },
          { label: 'WhatsApp da empresa', value: 'whatsapp' },
          { label: 'Outro site, e-mail ou telefone', value: 'url' },
        ],
        admin: { layout: 'horizontal' },
      },
      {
        name: 'page',
        type: 'relationship',
        relationTo: 'pages',
        label: 'Página',
        admin: {
          condition: (_, siblingData) => (siblingData?.kind ?? 'page') === 'page',
        },
        validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
          !required || (siblingData?.kind ?? 'page') !== 'page' || value
            ? true
            : 'Escolha uma página.',
      },
      {
        name: 'url',
        type: 'text',
        label: 'Endereço',
        admin: {
          condition: (_, siblingData) => siblingData?.kind === 'url',
          description:
            'Endereço completo, como https://instagram.com/seusite, mailto:contato@seusite.com.br ou tel:+5531999990000.',
        },
        validate: (
          value: null | string | undefined,
          { siblingData }: { siblingData: Record<string, unknown> },
        ) =>
          siblingData?.kind === 'url' && (required || value) ? validateExternalURL(value) : true,
      },
    ],
  }
}
