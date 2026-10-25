import type { CollectionConfig, FieldHook } from 'payload'
import { ValidationError } from 'payload'

import { authenticated } from '../access/authenticated'
import { publishedOrAuthenticated } from '../access/published'
import { slugField } from '../fields/slug'
import { revalidateOnDelete, revalidateOnPublish } from '../hooks/revalidate'
import { describeContentError, emptyPageContent, parsePageContent } from '../puck/schema'

// Roda também nos rascunhos (o `validate` dos campos o Payload pula neles): nenhum conteúdo fora do
// formato chega ao banco. Guarda o resultado do Zod, já migrado e sem campos desconhecidos.
const validateContent: FieldHook = ({ value, req }) => {
  const result = parsePageContent(value)
  if (!result.success) {
    throw new ValidationError({
      collection: 'pages',
      errors: [{ path: 'content', message: describeContentError(result.error) }],
      req,
    })
  }
  return result.data
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: 'Página',
    plural: 'Páginas',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: publishedOrAuthenticated,
    readVersions: authenticated,
    update: authenticated,
  },
  admin: {
    group: 'Site',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
  },
  // Links e menus só precisam do nome e do endereço das páginas, não do conteúdo inteiro.
  defaultPopulate: {
    title: true,
    slug: true,
    _status: true,
  },
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
  hooks: {
    afterChange: [revalidateOnPublish],
    afterDelete: [revalidateOnDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nome da página',
      required: true,
      maxLength: 80,
      admin: {
        description: 'Aparece no menu, na aba do navegador e no Google. Ex.: "Quem somos".',
      },
    },
    slugField,
    {
      name: 'campaign',
      type: 'checkbox',
      label: 'Página de campanha',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Esconde o menu e deixa o rodapé numa linha só, para quem chega por um anúncio não sair da página.',
      },
    },
    {
      name: 'content',
      type: 'json',
      label: 'Conteúdo',
      required: true,
      defaultValue: emptyPageContent(),
      admin: {
        description:
          'Montado pelo editor visual. Por enquanto, as páginas de teste vêm do script de exemplo.',
      },
      hooks: {
        beforeValidate: [validateContent],
      },
    },
    {
      name: 'seo',
      type: 'group',
      label: 'Como aparece no Google',
      admin: {
        description: 'Opcional. Em branco, o site usa o nome da página e o começo do texto dela.',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Título no Google',
          maxLength: 70,
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Descrição no Google',
          maxLength: 160,
          admin: {
            description: 'Uma ou duas frases sobre a página. Até 160 letras.',
          },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Foto ao compartilhar',
          admin: {
            description: 'Aparece quando alguém manda o link da página no WhatsApp ou nas redes.',
          },
        },
      ],
    },
  ],
}
