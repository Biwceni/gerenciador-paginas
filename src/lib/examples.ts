import type { Media, Template } from '../payload-types'
import { type PageComponent, parsePageContent, type PuckPageData } from '../puck/schema'
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
])

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
    } else collectTexts(field, found)
  }
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

/**
 * As seções da página que ainda têm algum texto igual a um texto dos modelos, ou o "Lorem ipsum" de
 * preenchimento.
 */
export function findExampleSections(data: PuckPageData, texts: readonly string[]): PageComponent[] {
  // O editor confere a cada mudança, sempre com a mesma lista: os padrões são montados uma vez.
  let isExample = matchers.get(texts)
  if (!isExample) {
    isExample = exampleMatcher(texts)
    matchers.set(texts, isExample)
  }
  return data.content.filter((section) => {
    const found = new Set<string>()
    collectTexts(section, found)
    return [...found].some((text) => isExample(text) || FILLER.test(text))
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
