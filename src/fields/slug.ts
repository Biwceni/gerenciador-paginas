import type { TextField } from 'payload'

import { slugify, validateSlug } from '../lib/slug'

/**
 * Endereço da página, gerado do título quando fica vazio. Não usa o `slugField` do Payload,
 * que ainda é experimental e pode mudar no Payload 4.
 */
export const slugField: TextField = {
  name: 'slug',
  type: 'text',
  label: 'Endereço da página',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description:
      'Fim do endereço no navegador. Ex.: "quem-somos" fica seusite.com.br/quem-somos. Deixe vazio para criar a partir do nome da página.',
  },
  hooks: {
    beforeValidate: [
      ({ value, data, originalDoc }) => {
        const typed = typeof value === 'string' ? slugify(value) : ''
        if (typed) return typed
        const fromTitle = slugify(String(data?.title ?? originalDoc?.title ?? ''))
        // Rascunho sem nome ainda: um endereço provisório evita conflito entre rascunhos vazios.
        return fromTitle || `pagina-${Date.now().toString(36)}`
      },
    ],
  },
  validate: (value: null | string | undefined) => validateSlug(value),
}
