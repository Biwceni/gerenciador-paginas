import { z } from 'zod'

import { isSafeURL } from '../lib/links'

/**
 * Formato do conteúdo de uma página: `{ version, data }`, em que `data` é o JSON do Puck.
 *
 * O Puck ainda é 0.x e pode mudar o formato. Quando mudar (ou quando uma seção ganhar campos novos),
 * suba `CONTENT_VERSION` e acrescente em `migrations` a função que leva da versão anterior à nova.
 * Conteúdo antigo é migrado ao ser lido e ao ser salvo.
 *
 * Os textos aceitam vazio: um rascunho pode ter seções pela metade. O que é obrigatório para ir ao ar
 * fica nas checagens do botão Publicar (fase 2).
 *
 * As seções seguem o protótipo navegável. As demais (destaques, depoimentos, perguntas,
 * contato, formulário e links) entram na fase 2, com a ficha de cada uma.
 */
export const CONTENT_VERSION = 1

const id = z.number().int().positive()

/** Foto da biblioteca, sempre por relação (o id), nunca a URL copiada. */
export const photoRefSchema = z.object({ mediaId: id }).nullable()

/**
 * Para onde um link leva: uma página do site (pelo id, sobrevive à troca de endereço), o WhatsApp
 * das configurações (trocar o número muda o site todo) ou outro site. Seções de uma página
 * (âncoras) entram com o editor, na fase 2.
 */
export const linkRefSchema = z
  .discriminatedUnion('kind', [
    z.object({ kind: z.literal('page'), pageId: id }),
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

const componentId = z.string().min(1).max(100)

export const heroPropsSchema = z.object({
  id: componentId,
  title: z.string().max(120),
  text: z.string().max(300),
  image: photoRefSchema,
  button: buttonSchema.nullable(),
  // `image`: a foto cobre o fundo, escurecida, com texto branco.
  style: z.enum(['image', 'light', 'soft', 'brand']),
  align: z.enum(['left', 'center']),
})

export const textImagePropsSchema = z.object({
  id: componentId,
  title: z.string().max(120),
  text: z.string().max(2000),
  image: photoRefSchema,
  side: z.enum(['left', 'right']),
  style: sectionStyle,
})

export const galleryPropsSchema = z.object({
  id: componentId,
  title: z.string().max(120),
  images: z.array(z.object({ mediaId: id })).max(24),
  style: sectionStyle,
})

export const callToActionPropsSchema = z.object({
  id: componentId,
  title: z.string().max(120),
  text: z.string().max(300),
  button: buttonSchema.nullable(),
  style: sectionStyle,
})

const componentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Hero'), props: heroPropsSchema }),
  z.object({ type: z.literal('TextImage'), props: textImagePropsSchema }),
  z.object({ type: z.literal('Gallery'), props: galleryPropsSchema }),
  z.object({ type: z.literal('CallToAction'), props: callToActionPropsSchema }),
])

export const puckDataSchema = z.object({
  root: z.object({ props: z.object({}).default({}) }).default({ props: {} }),
  content: z.array(componentSchema).max(100),
  zones: z.record(z.string(), z.array(componentSchema)).optional(),
})

export const pageContentSchema = z.object({
  version: z.literal(CONTENT_VERSION),
  data: puckDataSchema,
})

export type PageContent = z.infer<typeof pageContentSchema>
export type PuckPageData = PageContent['data']
export type PageComponent = z.infer<typeof componentSchema>
export type PhotoRef = z.infer<typeof photoRefSchema>
export type LinkRef = z.infer<typeof linkRefSchema>
export type ButtonValue = z.infer<typeof buttonSchema>
export type HeroProps = z.infer<typeof heroPropsSchema>
export type TextImageProps = z.infer<typeof textImagePropsSchema>
export type GalleryProps = z.infer<typeof galleryPropsSchema>
export type CallToActionProps = z.infer<typeof callToActionPropsSchema>

export const emptyPageContent = (): PageContent => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content: [] },
})

// Chave: versão de origem. Cada função leva o conteúdo para a versão seguinte.
const migrations: Record<number, (content: { version: number; data: unknown }) => unknown> = {}

function migrate(raw: unknown): unknown {
  let content = raw as { version?: unknown; data?: unknown }
  while (
    content &&
    typeof content.version === 'number' &&
    content.version < CONTENT_VERSION &&
    migrations[content.version]
  ) {
    content = migrations[content.version](content as { version: number; data: unknown }) as {
      version?: unknown
      data?: unknown
    }
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
