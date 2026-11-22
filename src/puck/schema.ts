import { z } from 'zod'

import { isSafeURL } from '../lib/links'
import { slugify } from '../lib/slug'
import { type Anim, SECTION_ANIMS } from '../lib/motion'
import { sanitizeRichText } from '../lib/richtext'
import { LIMITS, visibleLength } from './limits'
import { VIMEO_KEY, YOUTUBE_ID } from '../lib/youtube'

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

/**
 * Como a foto ocupa o espaço (C2): "Preencher" (pode cortar as bordas, no ponto de foco da foto) ou
 * "Foto inteira" (sem corte, com um fundo atrás). Fundo da foto inteira: neutro do visual, cor do
 * site ou nenhum. Opções novas com padrão (Preencher, neutro): as páginas salvas continuam iguais e a
 * versão do conteúdo continua a 2.
 */
export const PHOTO_FITS = ['cover', 'contain'] as const
export const PHOTO_BACKDROPS = ['neutral', 'brand', 'none'] as const
export type PhotoFit = (typeof PHOTO_FITS)[number]
export type PhotoBackdrop = (typeof PHOTO_BACKDROPS)[number]

/** Foto da biblioteca, sempre por relação (o id), nunca a URL copiada. */
export const photoRefSchema = z
  .object({
    mediaId: id,
    fit: z.enum(PHOTO_FITS).catch('cover').optional(),
    backdrop: z.enum(PHOTO_BACKDROPS).catch('neutral').optional(),
  })
  .nullable()

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

/**
 * Onde a seção aparece (Elementor, E3): no computador e no celular, só no computador ou só no
 * celular. Opcional (sem o campo é nos dois): as páginas de antes continuam válidas e a versão
 * continua a 2.
 */
export const SECTION_DEVICES = ['all', 'desktop', 'mobile'] as const
export type SectionDevices = (typeof SECTION_DEVICES)[number]
const devices = z.enum(SECTION_DEVICES).optional()

/** Fundo da seção: claro (fundo do site), suave ou na cor principal. */
const sectionStyle = z.enum(['light', 'soft', 'brand'])

/**
 * Nome da seção no menu (opcional). Vira a âncora: `/pagina#servicos`. Só emoji ou símbolos ("⭐⭐")
 * não viram âncora, e o botão que leva até a seção cairia no topo da página (achado 13.8).
 */
export const MENU_LABEL_NEEDS_WORD =
  'precisa de pelo menos uma letra ou número, para o link chegar até a seção. Use uma palavra, como “Novidades ⭐”.'

const menuLabel = z
  .string()
  .max(LIMITS.menuLabel)
  .refine((value) => !value.trim() || slugify(value) !== '', { message: MENU_LABEL_NEEDS_WORD })

const title = z.string().max(LIMITS.title)

/**
 * Animação da seção (redesign v3, entrega 2): "Igual ao site" (padrão), "Sem animação" ou uma das
 * pensadas para a seção (`lib/motion.ts`). Campo novo com padrão, e valor desconhecido também vira
 * "Igual ao site": páginas antigas continuam válidas e iguais, e a versão continua a 2.
 */
const anim = <const T extends readonly Anim[]>(options: T) =>
  // Com a lista genérica, o TypeScript não vê que 'site' está nela (está: é o primeiro item).
  z.enum(['site', 'none', ...options] as ['site', 'none', ...T]).catch('site' as never)

/**
 * Banner com várias chamadas (C1): a primeira chamada são os campos de sempre do banner (título,
 * frase, foto e botões); estas são a 2ª e a 3ª. Cada uma com título, frase, foto e até dois botões.
 * Lista nova com padrão vazio: os banners salvos continuam iguais, com uma chamada só, e a versão do
 * conteúdo continua a 2 (nada muda de forma, só se acrescenta).
 */
export const HERO_EXTRA_SLIDES = 2
export const heroSlideSchema = z.object({
  title,
  text: z.string().max(300).default(''),
  image: photoRefSchema.default(null),
  button: buttonSchema.nullable().default(null),
  button2: buttonSchema.nullable().default(null),
})

/** Tempo de cada chamada na tela, em segundos (C1). */
export const HERO_INTERVALS = ['4', '6', '8', '10'] as const

export const heroPropsSchema = z.object({
  id: componentId,
  devices,
  title,
  text: z.string().max(300),
  image: photoRefSchema,
  button: buttonSchema.nullable(),
  // Segundo botão (C1), ao lado do primeiro, com o desenho de contorno.
  button2: buttonSchema.nullable().default(null),
  slides: z.array(heroSlideSchema).max(HERO_EXTRA_SLIDES).default([]),
  // Com mais de uma chamada: trocar sozinho, tempo de cada uma, bolinhas e jeito de trocar. Sem
  // setas nem botão de pausa (decisão de 22/11): a troca para com o mouse, o toque ou o teclado e
  // para de vez depois de 3 voltas.
  autoplay: z.boolean().default(true),
  interval: z.enum(HERO_INTERVALS).catch('6').default('6'),
  dots: z.boolean().default(true),
  transition: z.enum(['fade', 'slide']).catch('fade').default('fade'),
  // `image`: a foto cobre o fundo, escurecida, com texto branco. `side`: texto à esquerda e a foto
  // ao lado, com cantos arredondados (opção nova, só um valor a mais: a versão continua a 2).
  style: z.enum(['image', 'side', 'light', 'soft', 'brand']),
  // `right` (componentes, C1): texto à direita; com Foto ao lado, a foto vai para a esquerda.
  align: z.enum(['left', 'center', 'right']),
  // `compact`: banner baixo, para páginas como Contato (opção nova, com padrão: a versão continua 2).
  height: z.enum(['normal', 'compact']).default('normal'),
  // Palavras do título em itálico, na cor do site (redesign v3; com padrão: a versão continua 2).
  highlight: z.string().max(120).default(''),
  anim: anim(SECTION_ANIMS.Hero),
})

/** Os campos novos do banner (C1) com o valor padrão: um banner de uma chamada, como os de antes. */
export const HERO_SLIDE_DEFAULTS: Pick<
  z.infer<typeof heroPropsSchema>,
  'button2' | 'slides' | 'autoplay' | 'interval' | 'dots' | 'transition'
> = {
  button2: null,
  slides: [],
  autoplay: true,
  interval: '6',
  dots: true,
  transition: 'fade',
}

export const textImagePropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  text: z.string().max(2000),
  image: photoRefSchema,
  // Botão embaixo do texto (C4), com a largura do próprio texto. Sem botão por padrão.
  button: buttonSchema.nullable().default(null),
  side: z.enum(['left', 'right']),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.TextImage),
})

/** Ícones a mais da biblioteca (C3), por tema. */
const FEATURE_ICONS_MORE = [
  // Geral
  'chat',
  'mail',
  'user',
  'users',
  'award',
  'lock',
  'globe',
  'bolt',
  'target',
  'sparkle',
  'bulb',
  'camera',
  'music',
  // Comércio
  'cart',
  'store',
  'box',
  'cash',
  'tag',
  // Saúde
  'stethoscope',
  'pill',
  'syringe',
  'thermometer',
  'pulse',
  'baby',
  'plus',
  'eye',
  // Beleza
  'drop',
  'flower',
  'mirror',
  // Veículos
  'car',
  'bike',
  'fuel',
  'key',
  'gauge',
  'plane',
  // Casa
  'building',
  'bed',
  'ruler',
  'paint',
  'tree',
  // Tecnologia
  'laptop',
  'mobile',
  'wifi',
  'chart',
  'gear',
  'headset',
  'gamepad',
  // Esporte
  'ball',
  'trophy',
  'dumbbell',
  'ticket',
  // Educação
  'book',
  'cap',
  'pencil',
  'file',
  // Comida
  'cutlery',
  'pizza',
  'wine',
  'burger',
  'icecream',
  'apple',
] as const

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
  // Biblioteca para qualquer ramo (C3): só valores a mais, a versão continua a 2. Os desenhos, os
  // nomes, os temas e as palavras da busca ficam em `components/FeatureIcon.tsx`.
  ...FEATURE_ICONS_MORE,
] as const

/**
 * Marcador dos Destaques. `photo` (entrega 4): uma foto pequena e redonda no lugar do ícone.
 * `cover` (C3, "Foto grande"): a foto ocupa o item todo, com o título branco embaixo.
 */
export const FEATURE_MARKERS = ['none', 'icon', 'number', 'photo', 'cover'] as const

/** Destaques numa seção (C3): até 12. Os modelos novos ficam entre 3 e 6. */
export const FEATURES_MAX = 12

/**
 * Destaques. `marker`, `icon` e `photo` são opções novas com valor padrão (sem marcador, ícone
 * "certo", sem foto): páginas salvas antes delas continuam válidas e iguais, sem mudar a versão do
 * conteúdo.
 */
export const featuresPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  // `number`: passo a passo (lista numerada). `icon`: cada item com um ícone. `photo`: foto redonda.
  marker: z.enum(FEATURE_MARKERS).default('none'),
  // Com Números: os passos em grade ou numa linha ligada (componentes, C6; com padrão, a versão
  // continua a 2).
  steps: z.enum(['grid', 'line']).default('grid'),
  items: z
    .array(
      z.object({
        title: z.string().max(80),
        text: z.string().max(300),
        icon: z.enum(FEATURE_ICONS).default('check'),
        photo: photoRefSchema.default(null),
        // Link do item (C3): o item todo vira clicável, com "Saiba mais →" (ou o texto escolhido).
        button: buttonSchema.nullable().optional(),
      }),
    )
    .min(1)
    .max(FEATURES_MAX),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Features),
})

/** Depoimentos. A foto é opcional e nova, com padrão "sem foto". */
export const testimonialsPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  items: z
    .array(
      z.object({
        // Até 300 letras (componentes, C7): depoimento curto se lê; longo vira um bloco cinza.
        quote: z.string().max(LIMITS.testimonial),
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
  devices,
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
  devices,
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
  // Como as fotos ocupam os quadrados (C2): preencher (padrão, como antes) ou fotos inteiras.
  fit: z.enum(PHOTO_FITS).catch('cover').default('cover'),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Gallery),
})

// Seções novas da entrega 4 (redesign v3): só tipos a mais, com padrão em tudo o que é opção. As
// outras seções não mudam, então a versão continua a 2.

/** Arrumação da Vitrine de produtos: 3 por linha, 2 grandes ou lista com foto. */
export const PRODUCT_LAYOUTS = ['three', 'two', 'list'] as const

/** Situação do item (B2): disponível (nada aparece), esgotado (sem botão) ou sob consulta. */
export const PRODUCT_STATUSES = ['available', 'soldout', 'consult'] as const

/** Ordem da Vitrine (extra do B3): a da lista, por nome, por preço ou os mais novos primeiro. */
export const PRODUCT_SORTS = ['manual', 'name', 'price', 'newest'] as const

/** Itens numa Vitrine (B3): antes 12; com categorias e busca, até 60. */
export const PRODUCTS_MAX = 60

/** Fotos a mais de um item (B2), que aparecem em "Mais detalhes". */
export const PRODUCT_EXTRA_PHOTOS = 4

/**
 * Vitrine. Preço antigo, selo, situação, fotos a mais, detalhes e categoria (B2, B3) são novos e
 * são opcionais (sem eles: vazio, disponível, nenhuma): páginas salvas antes continuam iguais, na
 * versão 2.
 */
export const productsPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  text: z.string().max(300).default(''),
  layout: z.enum(PRODUCT_LAYOUTS).default('three'),
  // Selo em cima da foto (padrão) ou embaixo dela, quando a foto já tem texto (B2).
  badgeBelow: z.boolean().optional(),
  sort: z.enum(PRODUCT_SORTS).optional().catch(undefined),
  items: z
    .array(
      z.object({
        // Obrigatória para ir ao ar: produto sem foto não aparece no site (o Publicar avisa).
        image: photoRefSchema.default(null),
        name: z.string().max(80),
        text: z.string().max(200).default(''),
        // Texto livre: "R$ 45", "a partir de R$ 120", "sob consulta". Vazio: sem preço.
        price: z.string().max(LIMITS.price).default(''),
        // Preço de antes, riscado ao lado do preço (B2). Vazio: sem preço antigo.
        oldPrice: z.string().max(LIMITS.price).optional(),
        // "-30%", "Novo", "Mais vendido" (B2), na segunda cor do site.
        badge: z.string().max(LIMITS.productBadge).optional(),
        status: z.enum(PRODUCT_STATUSES).optional().catch(undefined),
        // Categoria para o filtro da seção (B3). Vazia: só aparece em "Todos".
        category: z.string().max(LIMITS.productCategory).optional(),
        // "Mais detalhes" (B2): texto e fotos a mais, numa janela no próprio site.
        details: z.string().max(LIMITS.productDetails).optional(),
        photos: z
          .array(z.object({ image: photoRefSchema.default(null) }))
          .max(PRODUCT_EXTRA_PHOTOS)
          .optional(),
        // "Pedir pelo WhatsApp" monta a mensagem com o nome do produto; ou um link qualquer. Até 22
        // letras, para caber numa linha no cartão (componentes, C3).
        button: buttonSchema
          .extend({ label: z.string().max(LIMITS.productButton) })
          .nullable()
          .default({ label: '', link: null }),
      }),
    )
    .min(1)
    .max(PRODUCTS_MAX),
  style: sectionStyle.default('light'),
  anim: anim(SECTION_ANIMS.Products),
})

/** Cardápio: uma ou duas colunas de grupos; entre o nome e o preço, pontilhado ou linha. */
export const PRICE_COLUMNS = ['two', 'one'] as const
export const PRICE_LEADERS = ['dots', 'line'] as const

export const priceListPropsSchema = z.object({
  id: componentId,
  devices,
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
  devices,
  items: z
    .array(z.object({ text: z.string().max(LIMITS.announcement) }))
    .min(1)
    .max(5),
  mode: z.enum(ANNOUNCEMENT_MODES).default('move'),
  // Na cor principal por padrão. "Segunda cor" (E1) usa a segunda cor de Sua marca, ou a principal.
  style: z.enum(['light', 'soft', 'brand', 'second']).default('brand'),
})

/** Instagram: fotos escolhidas da biblioteca (não atualizam sozinhas) e o @ das Configurações. */
export const INSTAGRAM_MIN_PHOTOS = 4
export const INSTAGRAM_MAX_PHOTOS = 8

export const instagramStripPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  images: z.array(z.object({ mediaId: id })).max(INSTAGRAM_MAX_PHOTOS),
  style: sectionStyle.default('light'),
  anim: anim(SECTION_ANIMS.InstagramStrip),
})

/** Tamanho da Chamada (C4): o bloco de sempre ou uma faixa fina, numa linha, com selo opcional. */
export const CTA_LAYOUTS = ['block', 'strip'] as const

export const callToActionPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  text: z.string().max(300),
  button: buttonSchema.nullable(),
  layout: z.enum(CTA_LAYOUTS).catch('block').default('block'),
  // Selo curto antes do título, só na faixa fina: "Novo", "Até domingo".
  tag: z.string().max(LIMITS.ctaTag).default(''),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.CallToAction),
})

/** Os dados de contato vêm das configurações do site; a seção só tem título e frase. */
/** Canais do Contato, na ordem em que aparecem (os dados vêm das Configurações). */
export const CONTACT_CHANNELS = ['whatsapp', 'phone', 'email', 'address', 'hours'] as const
/** Canais que podem ficar em destaque, num bloco com botão. */
export const CONTACT_FEATURED = ['whatsapp', 'phone', 'email', 'none'] as const

export const contactPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  text: z.string().max(300),
  // Componentes, C11 (com padrão: a versão continua a 2). Quais canais esta seção mostra, e qual
  // fica em destaque, num bloco na cor do site com botão.
  show: z.array(z.enum(CONTACT_CHANNELS)).default([...CONTACT_CHANNELS]),
  featured: z.enum(CONTACT_FEATURED).default('whatsapp'),
  // Elementor, E9: mapa do endereço das Configurações (opcional; sem o campo, desligado).
  map: z.boolean().optional(),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Contact),
})

/** O texto é montado na hora, com os dados das configurações (`lib/privacy.ts`). */
export const privacyPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Privacy),
})

export const linkListPropsSchema = z.object({
  id: componentId,
  devices,
  // Componentes, C12 (com padrão: a versão continua a 2): a Lista de links também vira item do menu.
  menuLabel: menuLabel.default(''),
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
  devices,
  menuLabel,
  title,
  body: richText,
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.RichText),
})

export const videoPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  // Vazio enquanto o cliente não colou o endereço.
  // YouTube (o código de 11 letras) ou Vimeo (`vimeo:123`), V1.
  videoId: z.union([z.literal(''), z.string().regex(YOUTUBE_ID), z.string().regex(VIMEO_KEY)]),
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
  devices,
  menuLabel,
  title,
  text: z.string().max(600),
  form: formRefSchema,
  /** Frase que aparece no lugar do formulário depois de enviar. */
  successMessage: z.string().max(200),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Form),
})

/** Peça Título das Colunas (componentes, C13): um título sozinho, entre as outras peças. */
export const columnTitlePropsSchema = z.object({
  id: componentId,
  title: z.string().max(LIMITS.title),
})

export const columnButtonPropsSchema = z.object({
  id: componentId,
  button: buttonSchema.nullable(),
})

export const columnPieceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ColumnTitle'), props: columnTitlePropsSchema }),
  z.object({ type: z.literal('ColumnText'), props: columnTextPropsSchema }),
  z.object({ type: z.literal('ColumnImage'), props: columnImagePropsSchema }),
  z.object({ type: z.literal('ColumnButton'), props: columnButtonPropsSchema }),
])

const column = z.array(columnPieceSchema).max(LIMITS.columnPieces)

/**
 * Modelos fixos de colunas (nada de grade de 1 a 12). `thirds` usa três, `fourths` as quatro
 * (rodada Colunas, C8); os outros, duas.
 */
export const COLUMN_LAYOUTS = ['half', 'thirds', 'wide-left', 'wide-right', 'fourths'] as const

/** Quantas colunas cada modelo mostra na página. */
export const COLUMN_COUNT: Record<(typeof COLUMN_LAYOUTS)[number], number> = {
  half: 2,
  thirds: 3,
  'wide-left': 2,
  'wide-right': 2,
  fourths: 4,
}

/** As áreas de peças das Colunas, na ordem. Um modelo de duas guarda as outras sem mostrar. */
export const COLUMN_SLOTS = ['column1', 'column2', 'column3', 'column4'] as const

/** No celular, qual coluna vem primeiro (C6): a 1ª, como no computador, ou a última. */
export const COLUMN_MOBILE_ORDERS = ['first', 'last'] as const

/** Alinhamento das colunas no computador (C7): pelo alto, pelo meio ou por baixo. */
export const COLUMN_ALIGNS = ['start', 'center', 'end'] as const

export const columnsPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  layout: z.enum(COLUMN_LAYOUTS),
  column1: column,
  column2: column,
  column3: column,
  // Páginas de antes das quatro colunas não têm a quarta.
  column4: column.default([]),
  mobileOrder: z.enum(COLUMN_MOBILE_ORDERS).default('first'),
  align: z.enum(COLUMN_ALIGNS).default('start'),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Columns),
})

/**
 * "Números do negócio" (Elementor, E10): de 1 a 4 números curtos (um só, C4, vira um número grande com a frase ao lado) ("12", "+3.000", "4,9") com uma
 * frase embaixo. No site, contam do zero até o valor quando aparecem (com a animação do site).
 */
export const statsPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  items: z
    .array(
      z.object({
        value: z.string().max(LIMITS.statValue),
        text: z.string().max(LIMITS.statLabel),
      }),
    )
    .min(1)
    .max(4),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Stats),
})

/**
 * Seções novas da etapa 4a (C5, B5): Tabela, Equipe, Faixa de logos, Antes e depois e Agenda. Só
 * acrescentam tipos: as páginas de antes não mudam e a versão continua a 2.
 */

/** Tabela (C5): até 8 colunas e 30 linhas de texto curto, coladas da planilha ou escritas. */
export const TABLE_MAX_COLUMNS = 8
export const TABLE_MAX_ROWS = 30
const tableCell = z.string().max(LIMITS.tableCell)

export const tablePropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  text: z.string().max(300).default(''),
  // A linha de cima: o nome de cada coluna.
  head: z.array(tableCell).min(1).max(TABLE_MAX_COLUMNS),
  // Cada linha tem uma célula por coluna (o editor completa e corta).
  rows: z.array(z.array(tableCell).max(TABLE_MAX_COLUMNS)).max(TABLE_MAX_ROWS),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Table),
})

/** Equipe (C5): foto, cargo em cima do nome, uma frase e um contato opcional. */
export const TEAM_MAX = 24

export const teamPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  text: z.string().max(300).default(''),
  items: z
    .array(
      z.object({
        photo: photoRefSchema.default(null),
        role: z.string().max(LIMITS.teamRole).default(''),
        name: z.string().max(LIMITS.teamName),
        text: z.string().max(LIMITS.teamText).default(''),
        // Contato opcional: WhatsApp, e-mail, Instagram ou outro link, com o texto do link.
        contact: buttonSchema.nullable().default(null),
      }),
    )
    .min(1)
    .max(TEAM_MAX),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Team),
})

/**
 * Faixa de logos (C5): parceiros, clientes, marcas. `trim` é a parte do logo sem a sobra em volta
 * (fundo branco ou transparente), em frações da foto, medida no editor quando o logo entra.
 */
export const LOGOS_MAX = 16
export const LOGO_LOOKS = ['color', 'gray', 'card'] as const
const fraction = z.number().min(0).max(1)

export const logoStripPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  images: z
    .array(
      z.object({
        mediaId: id,
        trim: z.object({ x: fraction, y: fraction, w: fraction, h: fraction }).optional(),
      }),
    )
    .max(LOGOS_MAX),
  look: z.enum(LOGO_LOOKS).optional().catch(undefined),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.LogoStrip),
})

/** Antes e depois (C5): pares de fotos. No computador, lado a lado; no celular, deslizante. */
export const BEFORE_AFTER_MAX = 6
export const BEFORE_AFTER_LAYOUTS = ['auto', 'slider'] as const

export const beforeAfterPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  text: z.string().max(300).default(''),
  layout: z.enum(BEFORE_AFTER_LAYOUTS).optional().catch(undefined),
  items: z
    .array(
      z.object({
        before: photoRefSchema.default(null),
        after: photoRefSchema.default(null),
        caption: z.string().max(LIMITS.beforeAfterCaption).default(''),
      }),
    )
    .min(1)
    .max(BEFORE_AFTER_MAX),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.BeforeAfter),
})

/**
 * Agenda (B5): datas com título, local, horário e botão. A data é o dia no calendário
 * (`2026-12-14`) e o horário é o de Brasília (`19:30`, ou vazio). Os passados saem sozinhos ou vão
 * para "Já aconteceu".
 */
export const EVENTS_MAX = 40
export const EVENT_PAST = ['hide', 'list'] as const
export const EVENT_DATE = /^\d{4}-\d{2}-\d{2}$/
export const EVENT_TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export const eventsPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  text: z.string().max(300).default(''),
  items: z
    .array(
      z.object({
        // Vazio num rascunho; data errada também vira vazio (o Publicar avisa).
        date: z.string().regex(EVENT_DATE).or(z.literal('')).catch(''),
        time: z.string().regex(EVENT_TIME).or(z.literal('')).catch(''),
        title: z.string().max(LIMITS.eventTitle),
        place: z.string().max(LIMITS.eventPlace).default(''),
        text: z.string().max(LIMITS.eventText).default(''),
        button: buttonSchema.nullable().default(null),
      }),
    )
    .min(1)
    .max(EVENTS_MAX),
  past: z.enum(EVENT_PAST).optional().catch(undefined),
  // Contagem até a próxima data: só dias e horas.
  countdown: z.boolean().optional(),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Events),
})

/**
 * D1: Nossas unidades. Os dados vêm das unidades das Configurações; a seção só escolhe o título,
 * o texto e se cada cartão tem o "Ver no mapa" (o mapa só carrega depois do toque).
 */
export const unitsPropsSchema = z.object({
  id: componentId,
  devices,
  menuLabel,
  title,
  text: z.string().max(300).default(''),
  map: z.boolean().optional(),
  style: sectionStyle,
  anim: anim(SECTION_ANIMS.Units),
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
  // Seção nova (Elementor, E10): idem.
  z.object({ type: z.literal('Stats'), props: statsPropsSchema }),
  // Seções novas (etapa 4a): idem.
  z.object({ type: z.literal('Table'), props: tablePropsSchema }),
  z.object({ type: z.literal('Team'), props: teamPropsSchema }),
  z.object({ type: z.literal('LogoStrip'), props: logoStripPropsSchema }),
  z.object({ type: z.literal('BeforeAfter'), props: beforeAfterPropsSchema }),
  z.object({ type: z.literal('Events'), props: eventsPropsSchema }),
  z.object({ type: z.literal('Units'), props: unitsPropsSchema }),
])

export const puckDataSchema = z.object({
  root: z
    .object({
      props: z
        .object({
          // O Puck conhece o `title` da página (não usamos: o nome fica em "Página e Google").
          title: z.string().max(200).optional(),
          // Textos de exemplo que a pessoa mandou manter ("Manter assim", A7): saem do aviso.
          keptTexts: z.array(z.string().max(5000)).max(100).optional(),
        })
        .default({}),
    })
    .default({ props: {} }),
  // A primeira seção aparece sempre, nos dois (E3): é o começo da página e o que o Google mede.
  content: z
    .array(componentSchema)
    .max(LIMITS.sections)
    .transform((content) => {
      const first = content[0]
      if (!first || !first.props.devices || first.props.devices === 'all') return content
      const fixed = { ...first, props: { ...first.props, devices: 'all' } } as typeof first
      return [fixed, ...content.slice(1)]
    }),
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
export type StatsProps = z.infer<typeof statsPropsSchema>
export type TableProps = z.infer<typeof tablePropsSchema>
export type TeamProps = z.infer<typeof teamPropsSchema>
export type TeamMember = TeamProps['items'][number]
export type LogoStripProps = z.infer<typeof logoStripPropsSchema>
export type LogoLook = (typeof LOGO_LOOKS)[number]
export type BeforeAfterProps = z.infer<typeof beforeAfterPropsSchema>
export type EventsProps = z.infer<typeof eventsPropsSchema>
export type UnitsProps = z.infer<typeof unitsPropsSchema>
export type EventItem = EventsProps['items'][number]
export type CallToActionProps = z.infer<typeof callToActionPropsSchema>
export type ContactProps = z.infer<typeof contactPropsSchema>
export type ContactChannel = (typeof CONTACT_CHANNELS)[number]
export type PrivacyProps = z.infer<typeof privacyPropsSchema>
export type LinkListProps = z.infer<typeof linkListPropsSchema>
export type RichTextProps = z.infer<typeof richTextPropsSchema>
export type VideoProps = z.infer<typeof videoPropsSchema>
export type FormProps = z.infer<typeof formPropsSchema>
export type FormRef = z.infer<typeof formRefSchema>
export type ColumnsProps = z.infer<typeof columnsPropsSchema>

/** As colunas que aparecem na página, cada uma com as suas peças. */
export const visibleColumns = (
  props: Pick<ColumnsProps, 'layout' | (typeof COLUMN_SLOTS)[number]>,
) => COLUMN_SLOTS.slice(0, COLUMN_COUNT[props.layout]).map((slot) => props[slot] ?? [])
export type ColumnTextProps = z.infer<typeof columnTextPropsSchema>
export type ColumnTitleProps = z.infer<typeof columnTitlePropsSchema>
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

/** Corta um texto salvo que passou de um limite que diminuiu, no fim de uma palavra, com "…". */
function shorten(value: unknown, max: number): unknown {
  if (typeof value !== 'string' || value.length <= max) return value
  const cut = value.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
}

/**
 * Limites que diminuíram sem mudar a versão (componentes, C3 e C7). Um texto salvo antes, maior que
 * o limite novo, faria a página inteira deixar de abrir no site e no editor; aqui ele é encurtado.
 * Só mexe em texto que passou do limite, então rodar de novo não muda nada.
 */
function fitTightenedLimits(raw: unknown): unknown {
  const content = raw as { data?: { content?: unknown } } | null
  const sections = content?.data?.content
  if (!Array.isArray(sections)) return raw
  const fitted = sections.map((section: { type?: unknown; props?: Record<string, unknown> }) => {
    const items = section?.props?.items
    if (!Array.isArray(items)) return section
    if (section.type === 'Testimonials') {
      const next = items.map((item: Record<string, unknown> | null) =>
        item && typeof item === 'object'
          ? { ...item, quote: shorten(item.quote, LIMITS.testimonial) }
          : item,
      )
      return { ...section, props: { ...section.props, items: next } }
    }
    if (section.type === 'Products') {
      const next = items.map((item: { button?: Record<string, unknown> | null } | null) =>
        item?.button && typeof item.button === 'object'
          ? {
              ...item,
              button: { ...item.button, label: shorten(item.button.label, LIMITS.productButton) },
            }
          : item,
      )
      return { ...section, props: { ...section.props, items: next } }
    }
    return section
  })
  return { ...content, data: { ...content!.data, content: fitted } }
}

/** Migra para a versão atual e confere o formato. Campos desconhecidos são descartados. */
export function parsePageContent(raw: unknown) {
  return pageContentSchema.safeParse(fitTightenedLimits(migrate(raw ?? emptyPageContent())))
}

/** Mensagem curta com o primeiro problema, para o painel. */
export function describeContentError(error: z.ZodError): string {
  const issue = error.issues[0]
  const where = issue?.path.length ? ` (em ${issue.path.join('.')})` : ''
  return `O conteúdo da página está num formato inválido${where}: ${issue?.message ?? 'erro desconhecido'}`
}
