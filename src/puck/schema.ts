import { z } from 'zod'

import { isSafeURL } from '../lib/links'
import { type Anim, SECTION_ANIMS } from '../lib/motion'
import { sanitizeRichText } from '../lib/richtext'
import { LIMITS, visibleLength } from './limits'
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
  label: z.string().max(LIMITS.buttonLabel),
  link: linkRefSchema,
})

/** Fundo da seção: claro (fundo do site), suave ou na cor principal. */
const sectionStyle = z.enum(['light', 'soft', 'brand'])

/** Nome da seção no menu (opcional). Vira a âncora: `/pagina#servicos`. */
const menuLabel = z.string().max(LIMITS.menuLabel)

const title = z.string().max(LIMITS.title)

/**
 * Animação da seção (redesign v3, entrega 2): "Igual ao site" (padrão), "Sem animação" ou uma das
 * pensadas para a seção (`lib/motion.ts`). Campo novo com padrão, e valor desconhecido também vira
 * "Igual ao site": páginas antigas continuam válidas e iguais, e a versão continua a 2.
 */
const anim = <const T extends readonly Anim[]>(options: T) =>
  // Com a lista genérica, o TypeScript não vê que 'site' está nela (está: é o primeiro item).
  z.enum(['site', 'none', ...options] as ['site', 'none', ...T]).catch('site' as never)

export const heroPropsSchema = z.object({
  id: componentId,
  title,
  text: z.string().max(300),
  image: photoRefSchema,
  button: buttonSchema.nullable(),
  // `image`: a foto cobre o fundo, escurecida, com texto branco. `side`: texto à esquerda e a foto
  // ao lado, com cantos arredondados (opção nova, só um valor a mais: a versão continua a 2).
  style: z.enum(['image', 'side', 'light', 'soft', 'brand']),
  align: z.enum(['left', 'center']),
  // `compact`: banner baixo, para páginas como Contato (opção nova, com padrão: a versão continua 2).
  height: z.enum(['normal', 'compact']).default('normal'),
  // Palavras do título em itálico, na cor do site (redesign v3; com padrão: a versão continua 2).
  highlight: z.string().max(120).default(''),
  anim: anim(SECTION_ANIMS.Hero),
})

export const textImagePropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  text: z.string().max(2000),
  image: photoRefSchema,
  side: z.enum(['left', 'right']),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.TextImage),
})

/** Ícones dos Destaques (desenhos em `components/FeatureIcon.tsx`). */
export const FEATURE_ICONS = [
  'tooth',
  'smile',
  'clock',
  'calendar',
  'card',
  'shield',
  'heart',
  'star',
  'phone',
  'pin',
  'leaf',
  'check',
  'cup',
  'tool',
  'bag',
  'home',
  // Confeitaria e serviços (redesign v3, entrega 4): só valores a mais, a versão continua a 2.
  'cake',
  'cupcake',
  'paw',
  'scissors',
  'gift',
  'truck',
] as const

/** Marcador dos Destaques. `photo` (entrega 4): uma foto pequena e redonda no lugar do ícone. */
export const FEATURE_MARKERS = ['none', 'icon', 'number', 'photo'] as const

/**
 * Destaques. `marker`, `icon` e `photo` são opções novas com valor padrão (sem marcador, ícone
 * "certo", sem foto): páginas salvas antes delas continuam válidas e iguais, sem mudar a versão do
 * conteúdo.
 */
export const featuresPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  // `number`: passo a passo (lista numerada). `icon`: cada item com um ícone. `photo`: foto redonda.
  marker: z.enum(FEATURE_MARKERS).default('none'),
  items: z
    .array(
      z.object({
        title: z.string().max(80),
        text: z.string().max(300),
        icon: z.enum(FEATURE_ICONS).default('check'),
        photo: photoRefSchema.default(null),
      }),
    )
    .min(1)
    .max(6),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Features),
})

/** Depoimentos. A foto é opcional e nova, com padrão "sem foto". */
export const testimonialsPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  items: z
    .array(
      z.object({
        quote: z.string().max(500),
        name: z.string().max(80),
        photo: photoRefSchema.default(null),
      }),
    )
    .min(1)
    .max(8),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Testimonials),
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
  anim: anim(SECTION_ANIMS.Faq),
})

/** Arrumação da galeria: grade de quadrados (a de antes) ou mosaico em colunas (entrega 4). */
export const GALLERY_LAYOUTS = ['grid', 'masonry'] as const

/**
 * Galeria. A legenda de cada foto, o "Mostrar legendas" e a arrumação são novos (entrega 4), com
 * padrão: sem legenda, legendas escondidas e grade. Páginas antigas continuam iguais.
 */
export const galleryPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  images: z
    .array(
      z.object({
        mediaId: id,
        // Vazia: vale a descrição da foto.
        caption: z.string().max(120).default(''),
      }),
    )
    .max(24),
  layout: z.enum(GALLERY_LAYOUTS).default('grid'),
  showCaptions: z.boolean().default(false),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Gallery),
})

// Seções novas da entrega 4 (redesign v3): só tipos a mais, com padrão em tudo o que é opção. As
// outras seções não mudam, então a versão continua a 2.

/** Arrumação da Vitrine de produtos: 3 por linha, 2 grandes ou lista com foto. */
export const PRODUCT_LAYOUTS = ['three', 'two', 'list'] as const

export const productsPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  text: z.string().max(300).default(''),
  layout: z.enum(PRODUCT_LAYOUTS).default('three'),
  items: z
    .array(
      z.object({
        // Obrigatória para ir ao ar: produto sem foto não aparece no site (o Publicar avisa).
        image: photoRefSchema.default(null),
        name: z.string().max(80),
        text: z.string().max(200).default(''),
        // Texto livre: "R$ 45", "a partir de R$ 120", "sob consulta". Vazio: sem preço.
        price: z.string().max(LIMITS.price).default(''),
        // "Pedir pelo WhatsApp" monta a mensagem com o nome do produto; ou um link qualquer.
        button: buttonSchema.nullable().default({ label: '', link: null }),
      }),
    )
    .min(1)
    .max(12),
  style: sectionStyle.default('light'),
  anim: anim(SECTION_ANIMS.Products),
})

/** Cardápio: uma ou duas colunas de grupos; entre o nome e o preço, pontilhado ou linha. */
export const PRICE_COLUMNS = ['two', 'one'] as const
export const PRICE_LEADERS = ['dots', 'line'] as const

export const priceListPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  text: z.string().max(300).default(''),
  columns: z.enum(PRICE_COLUMNS).default('two'),
  leader: z.enum(PRICE_LEADERS).default('dots'),
  groups: z
    .array(
      z.object({
        name: z.string().max(60),
        // Opcional: a foto fica ao lado do grupo.
        image: photoRefSchema.default(null),
        items: z
          .array(
            z.object({
              name: z.string().max(80),
              description: z.string().max(160).default(''),
              price: z.string().max(LIMITS.price).default(''),
            }),
          )
          .min(1)
          .max(30),
      }),
    )
    .min(1)
    .max(8),
  style: sectionStyle.default('light'),
  anim: anim(SECTION_ANIMS.PriceList),
})

/**
 * Faixa de aviso: frases curtas que correm na faixa, ou paradas. Não tem "Animação" (o movimento é
 * o dela) nem "Nome no menu" (é uma faixa fina, não um lugar da página).
 */
export const ANNOUNCEMENT_MODES = ['move', 'static'] as const

export const announcementPropsSchema = z.object({
  id: componentId,
  items: z
    .array(z.object({ text: z.string().max(LIMITS.announcement) }))
    .min(1)
    .max(5),
  mode: z.enum(ANNOUNCEMENT_MODES).default('move'),
  // Na cor principal por padrão.
  style: sectionStyle.default('brand'),
})

/** Instagram: fotos escolhidas da biblioteca (não atualizam sozinhas) e o @ das Configurações. */
export const INSTAGRAM_MIN_PHOTOS = 4
export const INSTAGRAM_MAX_PHOTOS = 8

export const instagramStripPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  images: z.array(z.object({ mediaId: id })).max(INSTAGRAM_MAX_PHOTOS),
  style: sectionStyle.default('light'),
  anim: anim(SECTION_ANIMS.InstagramStrip),
})

export const callToActionPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  text: z.string().max(300),
  button: buttonSchema.nullable(),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.CallToAction),
})

/** Os dados de contato vêm das configurações do site; a seção só tem título e frase. */
export const contactPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  text: z.string().max(300),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Contact),
})

/** O texto é montado na hora, com os dados das configurações (`lib/privacy.ts`). */
export const privacyPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Privacy),
})

export const linkListPropsSchema = z.object({
  id: componentId,
  title,
  text: z.string().max(300),
  items: z.array(buttonSchema).min(1).max(12),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.LinkList),
})

/**
 * HTML limpo no servidor (lista fechada de marcações), porque o Puck o desenha sem filtro. O limite
 * conta só as letras que aparecem: negrito, itálico e parágrafos não gastam o espaço da pessoa.
 */
const richText = z
  .string()
  .max(LIMITS.richTextHTML)
  .transform(sanitizeRichText)
  .refine((html) => visibleLength(html) <= LIMITS.richTextLetters, {
    message: `O texto passou do limite de ${LIMITS.richTextLetters} letras.`,
    params: { visibleMax: LIMITS.richTextLetters },
  })

export const richTextPropsSchema = z.object({
  id: componentId,
  menuLabel,
  title,
  body: richText,
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.RichText),
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
  anim: anim(SECTION_ANIMS.Video),
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
  anim: anim(SECTION_ANIMS.Form),
})

export const columnButtonPropsSchema = z.object({
  id: componentId,
  button: buttonSchema.nullable(),
})

export const columnPieceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ColumnText'), props: columnTextPropsSchema }),
  z.object({ type: z.literal('ColumnImage'), props: columnImagePropsSchema }),
  z.object({ type: z.literal('ColumnButton'), props: columnButtonPropsSchema }),
])

const column = z.array(columnPieceSchema).max(LIMITS.columnPieces)

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
  anim: anim(SECTION_ANIMS.Columns),
})

export const componentSchema = z.discriminatedUnion('type', [
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
  // Seção nova (v2): idem.
  z.object({ type: z.literal('Privacy'), props: privacyPropsSchema }),
  // Seções novas (redesign v3, entrega 4): idem.
  z.object({ type: z.literal('Products'), props: productsPropsSchema }),
  z.object({ type: z.literal('PriceList'), props: priceListPropsSchema }),
  z.object({ type: z.literal('Announcement'), props: announcementPropsSchema }),
  z.object({ type: z.literal('InstagramStrip'), props: instagramStripPropsSchema }),
])

export const puckDataSchema = z.object({
  root: z.object({ props: z.object({}).default({}) }).default({ props: {} }),
  content: z.array(componentSchema).max(LIMITS.sections),
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
export type FeatureIconName = (typeof FEATURE_ICONS)[number]
export type TestimonialsProps = z.infer<typeof testimonialsPropsSchema>
export type FaqProps = z.infer<typeof faqPropsSchema>
export type GalleryProps = z.infer<typeof galleryPropsSchema>
export type GalleryImage = GalleryProps['images'][number]
export type FeatureMarker = (typeof FEATURE_MARKERS)[number]
export type ProductsProps = z.infer<typeof productsPropsSchema>
export type ProductItem = ProductsProps['items'][number]
export type PriceListProps = z.infer<typeof priceListPropsSchema>
export type AnnouncementProps = z.infer<typeof announcementPropsSchema>
export type InstagramStripProps = z.infer<typeof instagramStripPropsSchema>
export type CallToActionProps = z.infer<typeof callToActionPropsSchema>
export type ContactProps = z.infer<typeof contactPropsSchema>
export type PrivacyProps = z.infer<typeof privacyPropsSchema>
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
