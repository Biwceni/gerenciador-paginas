import type { CollectionBeforeValidateHook, CollectionConfig, Field, GroupField } from 'payload'
import { ValidationError } from 'payload'

import { isAdmin } from '../access/users'
import { authenticated } from '../access/authenticated'
import { applyTemplateEndpoint, templatePageEndpoint } from '../endpoints/applyTemplate'
import { colorField } from '../fields/color'
import { validateExternalURL } from '../lib/links'
import { SLUG_PATTERN } from '../lib/slug'
import { checkTemplateReferences, isTemplatePhotoURL, SEGMENTS, SITE_TYPES } from '../lib/templates'
import { DEFAULT_COLORS, FONT_NAME_PATTERN } from '../lib/theme'
import { describeContentError, parsePageContent } from '../puck/schema'

type TemplateData = {
  kind?: 'site' | 'page'
  pages?: { content?: unknown }[] | null
  photos?: unknown[] | null
  forms?: unknown[] | null
}

/**
 * O conteúdo de cada página do modelo passa pelo mesmo esquema das páginas (já migrado para a
 * versão atual) e só pode citar fotos, páginas e formulários que o modelo tem.
 */
const validateTemplate: CollectionBeforeValidateHook = ({ data, req }) => {
  const template = data as TemplateData | undefined
  if (!template?.pages) return data
  const counts = {
    pages: template.kind === 'page' ? 0 : template.pages.length,
    photos: template.photos?.length ?? 0,
    forms: template.forms?.length ?? 0,
  }
  template.pages.forEach((page, index) => {
    const result = parsePageContent(page.content)
    const message = result.success
      ? checkTemplateReferences(result.data.data, counts)
      : describeContentError(result.error)
    if (message !== true) {
      throw new ValidationError({
        collection: 'templates',
        errors: [{ path: `pages.${index}.content`, message }],
        req,
      })
    }
    page.content = result.data
  })
  return data
}

/** Posição de uma página do modelo (1 é a primeira). */
const pagePosition: Field = {
  name: 'page',
  type: 'number',
  label: 'Página do modelo (1 é a primeira)',
  min: 1,
  admin: {
    condition: (_, siblingData) => ['page', 'section'].includes(siblingData?.kind),
  },
}

/** Link do menu de um modelo: como o do Cabeçalho, mas com a posição da página no lugar dela. */
const templateLink = (required: boolean): GroupField => ({
  name: 'link',
  type: 'group',
  label: 'Para onde leva',
  fields: [
    {
      name: 'kind',
      type: 'select',
      label: 'Tipo de link',
      defaultValue: 'page',
      required,
      options: [
        { label: 'Uma página do modelo', value: 'page' },
        { label: 'Uma seção de uma página do modelo', value: 'section' },
        { label: 'WhatsApp da empresa', value: 'whatsapp' },
        { label: 'Outro site', value: 'url' },
      ],
    },
    pagePosition,
    {
      name: 'section',
      type: 'text',
      label: 'Id da seção',
      admin: { condition: (_, siblingData) => siblingData?.kind === 'section' },
    },
    {
      name: 'url',
      type: 'text',
      label: 'Endereço',
      admin: { condition: (_, siblingData) => siblingData?.kind === 'url' },
      validate: (
        value: null | string | undefined,
        { siblingData }: { siblingData: { kind?: string } },
      ) => (siblingData?.kind === 'url' ? validateExternalURL(value) : true),
    },
  ],
})

const isSite = (data: Partial<TemplateData>) => data?.kind !== 'page'

const fontField = (name: string, label: string): Field => ({
  name,
  type: 'text',
  label,
  validate: (value: null | string | undefined, { data }: { data: Partial<TemplateData> }) =>
    (!value && !isSite(data)) || (value && FONT_NAME_PATTERN.test(value))
      ? true
      : 'Use só o nome da fonte do Google Fonts.',
})

/**
 * Modelos do início guiado e da "Nova página" (fase 4). Criados pela equipe (`npm run modelos`) e
 * mexidos só por administrador, nas telas padrão em "Avançado". Aplicar um modelo copia as páginas,
 * o menu, o rodapé, as cores, as fontes e as fotos (`src/lib/applyTemplate.ts`).
 */
export const Templates: CollectionConfig = {
  slug: 'templates',
  labels: { singular: 'Modelo', plural: 'Modelos' },
  access: {
    read: authenticated,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    group: 'Avançado',
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'siteType', 'segment', 'order'],
    description:
      'Modelos de site (início guiado) e de página (Nova página). O conteúdo usa a posição das fotos, páginas e formulários do modelo no lugar dos ids.',
  },
  defaultSort: 'order',
  versions: { maxPerDoc: 10 },
  hooks: {
    beforeValidate: [validateTemplate],
  },
  endpoints: [applyTemplateEndpoint, templatePageEndpoint],
  fields: [
    {
      // Nome fixo do modelo para o script `npm run modelos` saber o que já existe.
      name: 'key',
      type: 'text',
      label: 'Identificador',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'name', type: 'text', label: 'Nome', required: true, maxLength: 60 },
    { name: 'description', type: 'text', label: 'Descrição curta', maxLength: 120 },
    {
      name: 'kind',
      type: 'select',
      label: 'Modelo de',
      required: true,
      defaultValue: 'site',
      options: [
        { label: 'Site inteiro (início guiado)', value: 'site' },
        { label: 'Uma página (Nova página)', value: 'page' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'siteType',
      type: 'select',
      label: 'Tipo de site',
      options: SITE_TYPES.map(({ value, label }) => ({ value, label })),
      admin: { position: 'sidebar', condition: isSite },
      validate: (value: unknown, { data }: { data: Partial<TemplateData> }) =>
        !isSite(data) || value ? true : 'Escolha o tipo de site.',
    },
    {
      name: 'segment',
      type: 'select',
      label: 'Ramo',
      options: SEGMENTS.map(({ value, label }) => ({ value, label })),
      admin: {
        position: 'sidebar',
        condition: (data) => isSite(data) && data?.siteType === 'institucional',
      },
      validate: (
        value: unknown,
        { data }: { data: Partial<TemplateData> & { siteType?: string } },
      ) =>
        !isSite(data) || data?.siteType !== 'institucional' || value ? true : 'Escolha o ramo.',
    },
    {
      name: 'order',
      type: 'number',
      label: 'Ordem na tela',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'pages',
      type: 'array',
      label: 'Páginas',
      labels: { singular: 'Página', plural: 'Páginas' },
      minRows: 1,
      maxRows: 10,
      admin: { description: 'A primeira vira a página inicial. Modelo de página tem uma só.' },
      fields: [
        { name: 'title', type: 'text', label: 'Nome da página', required: true, maxLength: 80 },
        {
          name: 'slug',
          type: 'text',
          label: 'Endereço',
          required: true,
          validate: (value: null | string | undefined) =>
            value && SLUG_PATTERN.test(value) ? true : 'Use letras minúsculas, números e hífens.',
        },
        { name: 'campaign', type: 'checkbox', label: 'Página de campanha', defaultValue: false },
        // Conferido e migrado em `validateTemplate`, como o conteúdo das páginas.
        { name: 'content', type: 'json', label: 'Conteúdo (JSON do Puck)', required: true },
      ],
    },
    {
      name: 'photos',
      type: 'array',
      label: 'Fotos de exemplo',
      labels: { singular: 'Foto', plural: 'Fotos' },
      maxRows: 20,
      admin: {
        description:
          'Endereços do Pexels ou do Unsplash. Ao aplicar o modelo, cada foto é copiada uma vez para a biblioteca.',
      },
      fields: [
        {
          name: 'url',
          type: 'text',
          label: 'Endereço da foto',
          required: true,
          validate: (value: null | string | undefined) =>
            isTemplatePhotoURL(value) ? true : 'Use um endereço https do Pexels ou do Unsplash.',
        },
        { name: 'alt', type: 'text', label: 'Texto alternativo', required: true, maxLength: 200 },
      ],
    },
    {
      name: 'forms',
      type: 'array',
      label: 'Formulários',
      labels: { singular: 'Formulário', plural: 'Formulários' },
      maxRows: 3,
      admin: { description: 'Criados junto com o site, para as seções "Formulário" do modelo.' },
      fields: [
        { name: 'title', type: 'text', label: 'Nome', required: true },
        { name: 'submitButtonLabel', type: 'text', label: 'Texto do botão', required: true },
        {
          name: 'fields',
          type: 'array',
          label: 'Campos',
          minRows: 1,
          maxRows: 8,
          fields: [
            {
              name: 'type',
              type: 'select',
              label: 'Tipo',
              required: true,
              defaultValue: 'text',
              options: [
                { label: 'Texto curto', value: 'text' },
                { label: 'E-mail', value: 'email' },
                { label: 'Texto longo', value: 'textarea' },
              ],
            },
            { name: 'name', type: 'text', label: 'Nome do campo', required: true },
            { name: 'label', type: 'text', label: 'Pergunta', required: true },
            { name: 'required', type: 'checkbox', label: 'Obrigatório', defaultValue: false },
          ],
        },
      ],
    },
    {
      name: 'site',
      type: 'group',
      label: 'Configurações do site',
      admin: { condition: isSite },
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Nome de exemplo',
          admin: { description: 'Sugestão no início guiado e na prévia.' },
        },
        {
          name: 'tagline',
          type: 'text',
          label: 'Frase de exemplo',
          admin: { description: 'Usada se a pessoa deixar a frase em branco.' },
        },
        {
          name: 'colors',
          type: 'group',
          label: 'Cores',
          fields: [
            colorField('primary', 'Cor principal', DEFAULT_COLORS.primary),
            colorField('background', 'Fundo', DEFAULT_COLORS.background),
            colorField('surface', 'Fundo suave', DEFAULT_COLORS.surface),
            colorField('text', 'Texto', DEFAULT_COLORS.text),
            colorField('footer', 'Rodapé', DEFAULT_COLORS.footer),
          ],
        },
        {
          name: 'fonts',
          type: 'group',
          label: 'Fontes',
          fields: [
            fontField('headings', 'Fonte dos títulos'),
            fontField('body', 'Fonte dos textos'),
          ],
        },
        {
          name: 'address',
          type: 'text',
          label: 'Endereço de exemplo',
          admin: { description: 'Só entra se as Configurações estiverem sem endereço.' },
        },
        {
          name: 'hours',
          type: 'text',
          label: 'Horário de exemplo',
          admin: { description: 'Só entra se as Configurações estiverem sem horário.' },
        },
      ],
    },
    {
      name: 'header',
      type: 'group',
      label: 'Menu do topo',
      admin: { condition: isSite },
      fields: [
        {
          name: 'items',
          type: 'array',
          label: 'Itens',
          maxRows: 8,
          fields: [
            { name: 'label', type: 'text', label: 'Texto no menu', required: true, maxLength: 30 },
            templateLink(true),
          ],
        },
        {
          name: 'button',
          type: 'group',
          label: 'Botão de destaque',
          fields: [
            { name: 'label', type: 'text', label: 'Texto do botão', maxLength: 30 },
            templateLink(false),
          ],
        },
      ],
    },
    {
      name: 'footer',
      type: 'group',
      label: 'Rodapé',
      admin: { condition: isSite },
      fields: [
        { name: 'text', type: 'textarea', label: 'Frase do rodapé', maxLength: 300 },
        {
          name: 'showMenu',
          type: 'checkbox',
          label: 'Repetir os links do menu',
          defaultValue: true,
        },
        { name: 'showContact', type: 'checkbox', label: 'Mostrar contato', defaultValue: true },
        {
          name: 'showSocial',
          type: 'checkbox',
          label: 'Mostrar redes sociais',
          defaultValue: true,
        },
      ],
    },
  ],
}
