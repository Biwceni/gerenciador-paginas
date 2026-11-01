import { z } from 'zod'

import { isSafeURL } from '../lib/links'
import { sanitizeRichText } from '../lib/richtext'
import { YOUTUBE_ID } from '../lib/youtube'

/**
 * Formato do conteúdo de uma página: `{ version, data }`, em que `data` é o JSON do Puck.
 *
 * O Puck ainda é 0.x e pode mudar o formato. Quando mudar (ou quando uma seção ganhar campos novos),
 * suba `CONTENT_VERSION` e acrescente em `migrations` a função que leva da versão anterior à nova.
 * Conteúdo antigo é migrado ao ser lido e ao ser salvo.
 *
 * Os textos aceitam vazio: um rascunho pode ter seções pela metade. O que é obrigatório para ir ao ar
 * fica nas checagens do botão Publicar.
 *
 * Campos, limites e opções de cada seção: ficha das seções (fase 2).
 */
export const CONTENT_VERSION = 2

const id = z.number().int().positive()

/** Foto da biblioteca, sempre por relação (o id), nunca a URL copiada. */
export const photoRefSchema = z.object({ mediaId: id }).nullable()

const componentId = z.string().min(1).max(100)

/**
 * Para onde um link leva: uma página do site (pelo id, sobrevive à troca de endereço), uma seção de
 * uma página (pelo id da seção, sobrevive à troca do nome no menu), o WhatsApp das configurações
 * (trocar o número muda o site todo) ou outro site.
 */
export const linkRefSchema = z
  .discriminatedUnion('kind', [
    z.object({ kind: z.literal('page'), pageId: id }),
    z.object({ kind: z.literal('section'), pageId: id, sectionId: componentId }),
    z.object({ kind: z.literal('whatsapp') }),
    z.object({
      kind: z.literal('url'),
      url: z.string().refine(isSafeURL, 'Endereço de link inválido.'),
    }),
  ])
  .nullable()

export const buttonSchema = z.object({
  label: z.string().max(60),
  link: linkRefSchema,
})

/** Fundo da seção: claro (fundo do site), suave ou na cor principal. */
const sectionStyle = z.enum(['light', 'soft', 'brand'])

/** Nome da seção no menu (opcional). Vira a âncora: `/pagina#servicos`. */
const menuLabel = z.string().max(40)

const title = z.string().max(120)

export const heroPropsSchema = z.object({
  id: componentId,
  title,
  text: z.string().max(300),
  image: photoRefSchema,
  button: buttonSchema.nullable(),
  // `image`: a foto cobre o fundo, escurecida, com texto branco.
  style: z.enum(['image', 'light', 'soft', 'brand']),
  align: z.enum(['left', 'center']),
})

export const textImagePropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  text: z.string().max(2000),
  image: photoRefSchema,
  side: z.enum(['left', 'right']),
  style: sectionStyle,
})

export const featuresPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  items: z
    .array(z.object({ title: z.string().max(80), text: z.string().max(300) }))
    .min(1)
    .max(6),
  style: sectionStyle,
})

export const testimonialsPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  items: z
    .array(z.object({ quote: z.string().max(500), name: z.string().max(80) }))
    .min(1)
    .max(8),
  style: sectionStyle,
})

export const faqPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  items: z
    .array(z.object({ question: z.string().max(200), answer: z.string().max(1500) }))
    .min(1)
    .max(12),
  style: sectionStyle,
})

export const galleryPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  images: z.array(z.object({ mediaId: id })).max(24),
  style: sectionStyle,
})

export const callToActionPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  text: z.string().max(300),
  button: buttonSchema.nullable(),
  style: sectionStyle,
})

/** Os dados de contato vêm das configurações do site; a seção só tem título e frase. */
export const contactPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  text: z.string().max(300),
  style: sectionStyle,
})

export const linkListPropsSchema = z.object({
  id: componentId,
  title,
  text: z.string().max(300),
  items: z.array(buttonSchema).min(1).max(12),
  style: sectionStyle,
})

/** HTML limpo no servidor (lista fechada de marcações), porque o Puck o desenha sem filtro. */
const richText = z.string().max(20000).transform(sanitizeRichText)

export const richTextPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  body: richText,
  style: sectionStyle,
})

export const videoPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  // Vazio enquanto o cliente não colou o endereço.
  videoId: z.union([z.literal(''), z.string().regex(YOUTUBE_ID)]),
  caption: z.string().max(200),
  cover: photoRefSchema,
  style: sectionStyle,
})

// Peças que só existem dentro das Colunas.

export const columnTextPropsSchema = z.object({
  id: componentId,
  title,
  text: z.string().max(1000),
})

export const columnImagePropsSchema = z.object({
  id: componentId,
  image: photoRefSchema,
  caption: z.string().max(120),
})

/** Formulário do plugin de formulários, por relação (o id), como as fotos. */
export const formRefSchema = z.object({ formId: id }).nullable()

export const formPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  text: z.string().max(600),
  form: formRefSchema,
  /** Frase que aparece no lugar do formulário depois de enviar. */
  successMessage: z.string().max(200),
  style: sectionStyle,
})

export const columnButtonPropsSchema = z.object({
  id: componentId,
  button: buttonSchema.nullable(),
})

const columnPieceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ColumnText'), props: columnTextPropsSchema }),
  z.object({ type: z.literal('ColumnImage'), props: columnImagePropsSchema }),
  z.object({ type: z.literal('ColumnButton'), props: columnButtonPropsSchema }),
])

const column = z.array(columnPieceSchema).max(6)

/** Modelos fixos de colunas (nada de grade de 1 a 12). `thirds` usa as três; os outros, duas. */
export const COLUMN_LAYOUTS = ['half', 'thirds', 'wide-left', 'wide-right'] as const

/** Quantas colunas cada modelo mostra na página. */
export const COLUMN_COUNT: Record<(typeof COLUMN_LAYOUTS)[number], number> = {
  half: 2,
  thirds: 3,
  'wide-left': 2,
  'wide-right': 2,
}

export const columnsPropsSchema = z.object({
  id: componentId,
  menuLabel,
  layout: z.enum(COLUMN_LAYOUTS),
  column1: column,
  column2: column,
  column3: column,
  style: sectionStyle,
})

const componentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Hero'), props: heroPropsSchema }),
  z.object({ type: z.literal('TextImage'), props: textImagePropsSchema }),
  z.object({ type: z.literal('Features'), props: featuresPropsSchema }),
  z.object({ type: z.literal('Testimonials'), props: testimonialsPropsSchema }),
  z.object({ type: z.literal('Faq'), props: faqPropsSchema }),
  z.object({ type: z.literal('Gallery'), props: galleryPropsSchema }),
  z.object({ type: z.literal('CallToAction'), props: callToActionPropsSchema }),
  z.object({ type: z.literal('Contact'), props: contactPropsSchema }),
  z.object({ type: z.literal('LinkList'), props: linkListPropsSchema }),
  z.object({ type: z.literal('Columns'), props: columnsPropsSchema }),
  z.object({ type: z.literal('RichText'), props: richTextPropsSchema }),
  z.object({ type: z.literal('Video'), props: videoPropsSchema }),
  // Seção nova (fase 3): só acrescenta um tipo, as outras não mudam, então a versão continua a 2.
  z.object({ type: z.literal('Form'), props: formPropsSchema }),
])

export const puckDataSchema = z.object({
  root: z.object({ props: z.object({}).default({}) }).default({ props: {} }),
  content: z.array(componentSchema).max(100),
  // Áreas soltas (DropZone) não são usadas: as Colunas guardam as peças nos próprios campos.
  zones: z.record(z.string(), z.array(z.never())).optional(),
})

export const pageContentSchema = z.object({
  version: z.literal(CONTENT_VERSION),
  data: puckDataSchema,
})

export type PageContent = z.infer<typeof pageContentSchema>
export type PuckPageData = PageContent['data']
export type PageComponent = z.infer<typeof componentSchema>
export type SectionType = PageComponent['type']
export type ColumnPiece = z.infer<typeof columnPieceSchema>
export type PhotoRef = z.infer<typeof photoRefSchema>
export type LinkRef = z.infer<typeof linkRefSchema>
export type ButtonValue = z.infer<typeof buttonSchema>
export type HeroProps = z.infer<typeof heroPropsSchema>
export type TextImageProps = z.infer<typeof textImagePropsSchema>
export type FeaturesProps = z.infer<typeof featuresPropsSchema>
export type TestimonialsProps = z.infer<typeof testimonialsPropsSchema>
export type FaqProps = z.infer<typeof faqPropsSchema>
export type GalleryProps = z.infer<typeof galleryPropsSchema>
export type CallToActionProps = z.infer<typeof callToActionPropsSchema>
export type ContactProps = z.infer<typeof contactPropsSchema>
export type LinkListProps = z.infer<typeof linkListPropsSchema>
export type RichTextProps = z.infer<typeof richTextPropsSchema>
export type VideoProps = z.infer<typeof videoPropsSchema>
export type FormProps = z.infer<typeof formPropsSchema>
export type FormRef = z.infer<typeof formRefSchema>
export type ColumnsProps = z.infer<typeof columnsPropsSchema>
export type ColumnTextProps = z.infer<typeof columnTextPropsSchema>
export type ColumnImageProps = z.infer<typeof columnImagePropsSchema>
export type ColumnButtonProps = z.infer<typeof columnButtonPropsSchema>

export const emptyPageContent = (): PageContent => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content: [] },
})

type RawContent = { version: number; data: unknown }

// Chave: versão de origem. Cada função leva o conteúdo para a versão seguinte.
const migrations: Record<number, (content: RawContent) => RawContent> = {
  // 1 → 2: seções ganharam o "Nome no menu" (âncora). O banner não tem.
  1: ({ data }) => {
    const puck = (data ?? {}) as { content?: unknown }
    const content = Array.isArray(puck.content)
      ? puck.content.map((item: { type?: unknown; props?: Record<string, unknown> }) =>
          item && item.type !== 'Hero' && item.props
            ? { ...item, props: { menuLabel: '', ...item.props } }
            : item,
        )
      : puck.content
    return { version: 2, data: { ...puck, content } }
  },
}

function migrate(raw: unknown): unknown {
  let content = raw as { version?: unknown; data?: unknown }
  while (
    content &&
    typeof content.version === 'number' &&
    content.version < CONTENT_VERSION &&
    migrations[content.version]
  ) {
    content = migrations[content.version](content as RawContent)
  }
  return content
}

/** Migra para a versão atual e confere o formato. Campos desconhecidos são descartados. */
export function parsePageContent(raw: unknown) {
  return pageContentSchema.safeParse(migrate(raw ?? emptyPageContent()))
}

/** Mensagem curta com o primeiro problema, para o painel. */
export function describeContentError(error: z.ZodError): string {
  const issue = error.issues[0]
  const where = issue?.path.length ? ` (em ${issue.path.join('.')})` : ''
  return `O conteúdo da página está num formato inválido${where}: ${issue?.message ?? 'erro desconhecido'}`
}
