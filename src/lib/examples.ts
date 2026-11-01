import type { Media, Template } from '../payload-types'
import { type PageComponent, parsePageContent, type PuckPageData } from '../puck/schema'
import { richTextToPlain } from './richtext'

// O que ainda é exemplo de um modelo (v2, entrega 2a). Nada disso tem campo próprio: é calculado na
// hora. Os avisos só orientam, nenhum bloqueia a publicação.

/** Foto de exemplo: a que veio de um modelo (só a rotina dos modelos grava o `sourceUrl`). */
export function isExamplePhoto(photo: Pick<Media, 'sourceUrl'> | null | undefined): boolean {
  return Boolean(photo?.sourceUrl)
}

// Só os campos de texto corrido: nomes de botão, de menu e de link ficam legíveis nos modelos e a
// pessoa pode manter de propósito ("Fale com a gente" não é texto de exemplo).
const TEXT_KEYS = new Set(['title', 'text', 'quote', 'name', 'question', 'answer', 'caption'])

// Títulos legíveis dos modelos, bons para manter: não contam como exemplo.
const KEEPABLE_TEXTS = new Set(['perguntas frequentes', 'política de privacidade'])

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase()

function collectTexts(value: unknown, found: Set<string>) {
  if (Array.isArray(value)) return value.forEach((item) => collectTexts(item, found))
  if (!value || typeof value !== 'object') return
  for (const [key, field] of Object.entries(value)) {
    if (typeof field === 'string') {
      if (TEXT_KEYS.has(key) || key === 'body') {
        const text = normalize(key === 'body' ? richTextToPlain(field) : field)
        if (text && !KEEPABLE_TEXTS.has(text)) found.add(text)
      }
    } else collectTexts(field, found)
  }
}

/** Junta os textos de todos os modelos gravados. Modelo num formato inválido fica de fora. */
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

/** As seções da página que ainda têm algum texto igual a um texto dos modelos. */
export function findExampleSections(data: PuckPageData, texts: readonly string[]): PageComponent[] {
  const known = new Set(texts)
  return data.content.filter((section) => {
    const found = new Set<string>()
    collectTexts(section, found)
    return [...found].some((text) => known.has(text))
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
