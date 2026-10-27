import type { CollectionConfig, FieldHook } from 'payload'
import { ValidationError } from 'payload'

import { authenticated } from '../access/authenticated'
import { publishedOrAuthenticated } from '../access/published'
import { slugField } from '../fields/slug'
import { protectHomepageUnpublish, protectPageDelete } from '../hooks/protectPage'
import { revalidateOnDelete, revalidateOnPublish } from '../hooks/revalidate'
import { describeContentError, emptyPageContent, parsePageContent } from '../puck/schema'

// Roda também nos rascunhos (o `validate` dos campos o Payload pula neles): nenhum conteúdo fora do
// formato chega ao banco. Guarda o resultado do Zod, já migrado e sem campos desconhecidos.
const validateContent: FieldHook = ({ value, req, operation }) => {
  // Atualização sem o conteúdo (ex.: só o nome ou o Google, pelo editor): o Payload mantém o que já
  // está salvo. Trocar por conteúdo vazio aqui apagaria a página.
  if (value === undefined && operation === 'update') return value
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
    // O editor salva o rascunho sozinho a cada mudança. Com `autosave`, esses salvamentos
    // atualizam um único rascunho em vez de criar uma versão nova cada vez.
    drafts: { autosave: { interval: 2000 } },
    maxPerDoc: 50,
  },
  hooks: {
    afterChange: [revalidateOnPublish],
    afterDelete: [revalidateOnDelete],
    beforeChange: [protectHomepageUnpublish],
    beforeDelete: [protectPageDelete],
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
      name: 'openEditor',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/components/admin/OpenEditorButton#OpenEditorButton' },
      },
    },
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
        // Fora do formulário do painel: o conteúdo só muda pelo editor visual. Assim o formulário
        // (que também salva sozinho) nunca grava por cima o conteúdo que o editor acabou de salvar.
        disabled: true,
      },
      hooks: {
        beforeValidate: [validateContent],
      },
    },
    {
      // Marca as páginas de teste do `npm run seed`, para o `recriar` apagar só elas.
      // Só o script (com `overrideAccess`) escreve; pela API o campo é recusado.
      name: 'createdBySeed',
      type: 'checkbox',
      defaultValue: false,
      access: {
        create: () => false,
        update: () => false,
      },
      admin: { hidden: true },
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
