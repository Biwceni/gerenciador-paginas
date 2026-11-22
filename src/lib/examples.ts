import type { Media, Template } from '../payload-types'
import { type PageComponent, parsePageContent, type PuckPageData } from '../puck/schema'
import { CATALOG_TEXTS } from '../puck/catalogTexts'
import { richTextToPlain } from './richtext'
import { EXAMPLE_PLACEHOLDERS } from './templates'

// O que ainda é exemplo de um modelo (v2, entrega 2a). Nada disso tem campo próprio: é calculado na
// hora. Os avisos só orientam, nenhum bloqueia a publicação.

/** Foto de exemplo: a que veio de um modelo (só a rotina dos modelos grava o `sourceUrl`). */
export function isExamplePhoto(photo: Pick<Media, 'sourceUrl'> | null | undefined): boolean {
  return Boolean(photo?.sourceUrl)
}

// Só os campos de texto corrido: nomes de botão, de menu e de link ficam legíveis nos modelos e a
// pessoa pode manter de propósito ("Fale com a gente" não é texto de exemplo).
const TEXT_KEYS = new Set([
  'title',
  'text',
  'quote',
  'name',
  'question',
  'answer',
  'caption',
  'description',
  // Equipe e Agenda (etapa 4a).
  'role',
  'place',
])

/**
 * Células da Tabela (C5): as linhas guardam listas de textos, sem nome de campo. O nome das colunas
 * ("Plano", "Valor") fica de fora: qualquer negócio mantém.
 */
const isCells = (key: string, field: unknown): field is unknown[][] =>
  key === 'rows' && Array.isArray(field) && field.every((row) => Array.isArray(row))

/**
 * Títulos e nomes legíveis dos modelos, bons para manter: não contam como exemplo. Os modelos
 * (`src/seed/templates/`) usam estes mesmos textos onde o título é genérico.
 */
export const KEEPABLE_TEXTS: readonly string[] = [
  'Perguntas frequentes',
  'Política de privacidade',
  'Como funciona',
  'Como chegar',
  'Onde estamos',
  'Fale com a gente',
  'Galeria',
  'Nossos trabalhos',
  'Cardápio',
  'Serviços e preços',
  'Programação',
  // Títulos curtos de passo e de chamada: a pessoa costuma manter, e o aviso não sumia nunca (teste
  // como usuário leigo, página Encomendas). O texto de cada passo continua contando como exemplo.
  'Faça seu pedido',
  'Faça sua encomenda',
  'Conte o que você quer',
  'Receba o orçamento',
  'Receba o valor',
  'Combine a entrega',
  // Títulos de seção do catálogo que já servem como estão (achado 2.3): o texto de baixo, os
  // itens e os depoimentos de exemplo continuam contando.
  'Nossos produtos',
  'Preços',
  'No Instagram',
  'Nosso dia a dia',
  'O que dizem nossos clientes',
  'Venha nos visitar',
  'Vamos conversar?',
  'Por que escolher a gente',
  'Assista ao nosso vídeo',
  'Nossa equipe',
  'Agenda',
  'Antes e depois',
  'Quem confia na gente',
  'Nossas unidades',
]

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase()

const KEEPABLE = new Set(KEEPABLE_TEXTS.map(normalize))

function collectTexts(value: unknown, found: Set<string>) {
  if (Array.isArray(value)) return value.forEach((item) => collectTexts(item, found))
  if (!value || typeof value !== 'object') return
  for (const [key, field] of Object.entries(value)) {
    if (typeof field === 'string') {
      if (TEXT_KEYS.has(key) || key === 'body') {
        const text = normalize(key === 'body' ? richTextToPlain(field) : field)
        if (text && !KEEPABLE.has(text)) found.add(text)
      }
    } else if (isCells(key, field)) {
      for (const cell of field.flat()) {
        const text = typeof cell === 'string' ? normalize(cell) : ''
        if (text && !KEEPABLE.has(text)) found.add(text)
      }
    } else collectTexts(field, found)
  }
}

/** Os textos corridos de um conteúdo (seções, itens, conteúdo inicial), normalizados. */
export function textsOf(value: unknown): string[] {
  const found = new Set<string>()
  collectTexts(value, found)
  return [...found]
}

/**
 * Junta os textos de todos os modelos gravados, como estão no modelo: com `{nome}` e `{cidade}` no
 * lugar do nome do negócio e da cidade. Modelo num formato inválido fica de fora.
 */
export function exampleTexts(templates: Pick<Template, 'pages'>[]): string[] {
  const found = new Set<string>()
  for (const template of templates) {
    for (const page of template.pages ?? []) {
      const content = parsePageContent(page.content)
      if (content.success) collectTexts(content.data.data.content, found)
    }
  }
  return [...found]
}

/**
 * O que um marcador aceita: um nome ou uma cidade, de 1 a 6 palavras, sem pontuação. Assim a frase
 * que a pessoa reescreveu em volta do marcador ("em uberlândia e região, com entrega grátis") deixa
 * de contar como exemplo.
 */
const SLOT = String.raw`[^\s.,;:!?]+(?: [^\s.,;:!?]+){0,5}?`

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Os textos dos modelos prontos para comparar. Texto com marcador vira um padrão em que o marcador
 * aceita um nome ou uma cidade (`SLOT`): "doces feitos à mão em {cidade}" reconhece "doces feitos à mão em
 * uberlândia". Os outros são comparados por igual.
 */
export function exampleMatcher(texts: readonly string[]): (text: string) => boolean {
  const exact = new Set<string>()
  const patterns: RegExp[] = []
  const markers = Object.values(EXAMPLE_PLACEHOLDERS)
  for (const text of texts) {
    if (!markers.some((marker) => text.includes(marker))) {
      exact.add(text)
      continue
    }
    // Só o nome (o título da página de links): reconheceria qualquer texto. Fica de fora.
    const rest = markers.reduce((left, marker) => left.replaceAll(marker, ''), text)
    if (!/\p{L}/u.test(rest)) continue
    let source = escapeRegExp(text)
    for (const marker of markers) source = source.replaceAll(escapeRegExp(marker), SLOT)
    patterns.push(new RegExp(`^${source}$`, 's'))
  }
  return (text) => exact.has(text) || patterns.some((pattern) => pattern.test(text))
}

const matchers = new WeakMap<readonly string[], (text: string) => boolean>()

/** Texto de preenchimento ("Lorem ipsum…"): nunca é o texto final, venha de onde vier. */
const FILLER = /\blorem ipsum\b/

/** Um texto de exemplo e onde ele está: a seção e o caminho do campo dentro dela. */
export type ExampleHit = {
  /** Posição da seção na página. */
  sectionIndex: number
  sectionId: string
  sectionType: string
  /** Caminho do campo nas propriedades da seção: `['items', 0, 'answer']`. */
  path: (string | number)[]
  /** O texto como está na página (sem a formatação, no texto formatado). */
  text: string
}

const PLACEHOLDERS = new Set(CATALOG_TEXTS)

/** Quantas palavras um título pode ter e ainda ser "curto" (genérico, a pessoa pode manter). */
const SHORT_TITLE_WORDS = 2

type HitOptions = {
  /** Nome da página: título igual a ele não é exemplo (A7). */
  pageTitle?: string
}

/** Os textos que a pessoa escolheu manter nesta página ("Manter assim", A7). */
export function keptTexts(data: { root?: { props?: unknown } }): string[] {
  const kept = (data.root?.props as { keptTexts?: unknown } | undefined)?.keptTexts
  return Array.isArray(kept) ? kept.filter((text): text is string => typeof text === 'string') : []
}

function matcherFor(texts: readonly string[]) {
  // O editor confere a cada mudança, sempre com a mesma lista: os padrões são montados uma vez.
  let isExample = matchers.get(texts)
  if (!isExample) {
    isExample = exampleMatcher(texts)
    matchers.set(texts, isExample)
  }
  return isExample
}

/**
 * Regras do A7 para um texto que bate com um modelo: título curto, título igual ao nome da página e
 * pergunta ficam de fora (qualquer negócio mantém "Perguntas frequentes" ou "Vocês entregam?").
 * O "Lorem ipsum" conta sempre.
 */
function countsAsExample(
  key: string,
  text: string,
  isExample: (text: string) => boolean,
  options: HitOptions & { kept: Set<string> },
): boolean {
  if (options.kept.has(text)) return false
  // O "Lorem ipsum" e o texto com que a seção entra pelo catálogo ("Nova pergunta?", "Novo
  // destaque") nunca são o texto final: contam sempre.
  if (FILLER.test(text) || PLACEHOLDERS.has(text)) return true
  if (!isExample(text)) return false
  if (text.endsWith('?')) return false
  if (key === 'title') {
    if (text.split(' ').length <= SHORT_TITLE_WORDS) return false
    if (options.pageTitle && normalize(options.pageTitle) === text) return false
  }
  return true
}

function walkTexts(
  value: unknown,
  path: (string | number)[],
  visit: (key: string, raw: string, path: (string | number)[]) => void,
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkTexts(item, [...path, index], visit))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, field] of Object.entries(value)) {
    if (typeof field === 'string') {
      if (TEXT_KEYS.has(key) || key === 'body') {
        visit(key, key === 'body' ? richTextToPlain(field) : field, [...path, key])
      }
    } else if (isCells(key, field)) {
      field.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (typeof cell === 'string') visit('cell', cell, [...path, key, r, c])
        }),
      )
    } else walkTexts(field, [...path, key], visit)
  }
}

/**
 * Cada texto de exemplo da página, com o lugar dele (A7): o aviso mostra o texto e leva até o
 * campo, em vez de só dizer a seção. Os textos que a pessoa mandou manter ficam de fora.
 */
export function findExampleTexts(
  data: PuckPageData,
  texts: readonly string[],
  options: HitOptions = {},
): ExampleHit[] {
  const isExample = matcherFor(texts)
  const kept = new Set(keptTexts(data).map(normalize))
  const hits: ExampleHit[] = []
  for (const [sectionIndex, section] of data.content.entries()) {
    const props = section.props as Record<string, unknown>
    const seen = new Set<string>()
    walkTexts(props, [], (key, raw, path) => {
      const text = normalize(raw)
      if (!text || KEEPABLE.has(text) || seen.has(text)) return
      if (!countsAsExample(key, text, isExample, { ...options, kept })) return
      seen.add(text)
      hits.push({
        sectionIndex,
        sectionId: String(props.id),
        sectionType: section.type,
        path,
        text: raw.replace(/\s+/g, ' ').trim(),
      })
    })
  }
  return hits
}

/**
 * As seções da página que ainda têm algum texto igual a um texto dos modelos, ou o "Lorem ipsum" de
 * preenchimento (com as regras do A7).
 */
export function findExampleSections(
  data: PuckPageData,
  texts: readonly string[],
  options: HitOptions = {},
): PageComponent[] {
  const found = new Set(findExampleTexts(data, texts, options).map((hit) => hit.sectionIndex))
  return data.content.filter((_, index) => found.has(index))
}

/** Textos do rodapé que vêm dos modelos (a frase e a chamada), com `{cidade}` no lugar da cidade. */
export function footerExampleTexts(
  templates: { footer?: { text?: string | null; ctaTitle?: string | null } | null }[],
): string[] {
  const found = new Set<string>()
  for (const template of templates) {
    for (const text of [template.footer?.text, template.footer?.ctaTitle]) {
      const clean = normalize(text ?? '')
      if (clean && !KEEPABLE.has(clean)) found.add(clean)
    }
  }
  return [...found]
}

/** Um texto de exemplo fora das páginas: no menu ou no rodapé (A7). */
export type ChromeExample = { place: string; text: string }

/**
 * Os textos de exemplo do topo e do rodapé, que valem para o site todo: a frase e a chamada do
 * rodapé, quando ainda são as do modelo. Pergunta não conta (como nas páginas).
 */
export function findChromeExamples(
  footer: { text?: string | null; cta?: { title?: string | null } | null } | null | undefined,
  texts: readonly string[],
): ChromeExample[] {
  const isExample = matcherFor(texts)
  const kept = new Set<string>()
  const places: [string, string | null | undefined][] = [
    ['Rodapé › Frase', footer?.text],
    ['Rodapé › Chamada', footer?.cta?.title],
  ]
  return places.flatMap(([place, raw]) => {
    const text = normalize(raw ?? '')
    if (!text || !countsAsExample('text', text, isExample, { kept })) return []
    return [{ place, text: (raw ?? '').replace(/\s+/g, ' ').trim() }]
  })
}

type ModelSite = Pick<Template, 'site'>

/**
 * Frase de exemplo para a dica do campo nas Configurações. Nenhum campo guarda qual modelo foi
 * aplicado: vale o modelo com as mesmas cores do site e, com as cores já mudadas, uma frase geral.
 */
export function exampleTagline(
  colors: Record<string, string | null | undefined> | null | undefined,
  templates: ModelSite[],
): string {
  const same = (model: ModelSite) => {
    const entries = Object.entries(model.site?.colors ?? {})
    return entries.length > 0 && entries.every(([key, color]) => colors?.[key] === color)
  }
  return templates.find(same)?.site?.tagline ?? 'Uma frase curta sobre o que você faz e para quem.'
}
