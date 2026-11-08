import type { PanelIconName } from '../components/panel/PanelIcon'
import { collectReferences } from '../puck/references'
import type { PuckPageData } from '../puck/schema'
import { type Personality, PERSONALITIES } from './theme'

// Modelos de site e de página (fase 4). Ficam na coleção Modelos; aqui está o que o painel, a
// coleção e a rotina que aplica um modelo dividem.

/** Tipos de site da estreia, na ordem da primeira tela do início guiado (`tipos-de-site.md`). */
export const SITE_TYPES = [
  {
    value: 'institucional',
    label: 'Site da empresa',
    text: 'Várias páginas: início, sobre, serviços e contato',
    icon: 'layout',
  },
  {
    value: 'onepage',
    label: 'Site de uma página só',
    text: 'Tudo numa página, e o menu leva às seções',
    icon: 'file',
  },
  {
    value: 'landing',
    label: 'Landing page',
    text: 'Uma oferta e um formulário, para campanhas e anúncios',
    icon: 'target',
  },
  {
    value: 'evento',
    label: 'Página de evento',
    text: 'Programação, local e inscrição',
    icon: 'calendar',
  },
  {
    value: 'pessoal',
    label: 'Site pessoal ou currículo',
    text: 'Quem você é, seus trabalhos e como falar com você',
    icon: 'user',
  },
  { value: 'links', label: 'Página de links', text: 'O “link na bio” do Instagram', icon: 'link' },
  {
    value: 'embreve',
    label: 'Página “em breve”',
    text: 'Para anunciar algo que vai abrir',
    icon: 'clock',
  },
] as const satisfies readonly { value: string; label: string; text: string; icon: PanelIconName }[]

export type SiteType = (typeof SITE_TYPES)[number]['value']

/**
 * Valores do campo "Ramo" da coleção Modelos, como estão no banco (fase 4). Os ramos de hoje são
 * mais (`BUSINESSES`); para não precisar de migração, cada um guarda aqui o grupo mais próximo, e o
 * ramo de verdade vai no identificador do modelo (`templateBusiness`).
 */
export const SEGMENTS = [
  { value: 'cafe', label: 'Comida (confeitaria, restaurante)' },
  { value: 'saude', label: 'Cuidados (saúde, salão e estética)' },
  { value: 'servicos', label: 'Serviços (escritório, serviços em casa)' },
  { value: 'loja', label: 'Loja' },
  { value: 'outro', label: 'Outro' },
] as const

export type Segment = (typeof SEGMENTS)[number]['value']

/**
 * Ramos do "Site da empresa" (redesign v3, entrega 6): escolhem as páginas, a ordem das seções e os
 * textos de exemplo, e sugerem a personalidade, as letras e as cores dos dois modelos de cada um.
 */
export const BUSINESSES = [
  {
    value: 'confeitaria',
    label: 'Confeitaria e doces',
    text: 'Bolos, doces, salgados, encomendas',
    icon: 'cake',
    segment: 'cafe',
  },
  {
    value: 'restaurante',
    label: 'Restaurante e lanchonete',
    text: 'Restaurante, lanchonete, café, marmitas',
    icon: 'cup',
    segment: 'cafe',
  },
  {
    value: 'beleza',
    label: 'Salão e estética',
    text: 'Cabelo, unhas, sobrancelha, estética',
    icon: 'scissors',
    segment: 'saude',
  },
  {
    value: 'saude',
    label: 'Saúde e clínica',
    text: 'Dentista, psicólogo, fisioterapia, nutrição',
    icon: 'heart',
    segment: 'saude',
  },
  {
    value: 'escritorio',
    label: 'Advocacia e contabilidade',
    text: 'Escritório de advocacia, contabilidade, consultoria',
    icon: 'briefcase',
    segment: 'servicos',
  },
  {
    value: 'loja',
    label: 'Loja',
    text: 'Roupas, presentes, artesanato, feitos à mão',
    icon: 'bag',
    segment: 'loja',
  },
  {
    value: 'casa',
    label: 'Serviços em casa',
    text: 'Reformas, eletricista, limpeza, jardinagem',
    icon: 'tool',
    segment: 'servicos',
  },
  {
    value: 'outro',
    label: 'Outro',
    text: 'Um site simples de 3 páginas para adaptar',
    icon: 'file',
    segment: 'outro',
  },
] as const satisfies readonly {
  value: string
  label: string
  text: string
  icon: PanelIconName
  segment: Segment
}[]

export type BusinessType = (typeof BUSINESSES)[number]['value']

/**
 * O identificador de um modelo de site é `<ramo ou tipo>-<personalidade>` (ex.: `confeitaria-vitrine`,
 * `evento-aconchego`). Assim o ramo e a personalidade sugerida ficam no modelo sem campo novo no
 * banco.
 */
export function templateKey(prefix: string, personality: Personality): string {
  return `${prefix}-${personality}`
}

/** O ramo de um modelo do "Site da empresa", pelo identificador; `null` nos outros. */
export function templateBusiness(
  template: { key?: string | null; siteType?: string | null } | null | undefined,
): BusinessType | null {
  if (template?.siteType !== 'institucional') return null
  const prefix = template.key?.split('-')[0]
  return BUSINESSES.find((item) => item.value === prefix)?.value ?? null
}

/** A personalidade que o modelo sugere, pelo identificador; `null` quando não tem. */
export function templatePersonality(key: string | null | undefined): Personality | null {
  const suffix = key?.split('-').at(-1)
  return (PERSONALITIES as readonly string[]).includes(suffix ?? '')
    ? (suffix as Personality)
    : null
}

/**
 * Marcadores dos textos de exemplo dos modelos: viram o nome do negócio e a cidade respondidos no
 * Começar. Também marcam o texto como exemplo para a checagem "Ainda há texto de exemplo"
 * (`lib/examples.ts`): o texto do modelo com qualquer nome e cidade no lugar continua sendo exemplo.
 */
export const EXAMPLE_PLACEHOLDERS = { name: '{nome}', city: '{cidade}' } as const

export type ExampleAnswers = { name: string; city: string }

/**
 * A cidade do endereço das Configurações, para o "Começar de novo" não pedir de novo. Só quando dá
 * para ter certeza: a parte do endereço junto do estado ("Uberlândia/MG", "Lavras - MG" ou
 * "Lavras, MG"). Sem o estado, a última parte pode ser a rua ou o bairro: fica vazio.
 */
export function cityFromAddress(address: string | null | undefined): string {
  const parts = (address ?? '')
    .split(/[·,\n]| - /)
    .map((part) => part.trim())
    // O CEP não conta.
    .filter((part) => part && !/^[\d\s.-]+$/.test(part))
  const state = /^[A-Z]{2}$/
  for (let index = parts.length - 1; index >= 0; index--) {
    const part = parts[index]
    const joined = part.match(/^(.+?)\s*[/-]\s*[A-Z]{2}$/)
    const city = joined ? joined[1] : state.test(part) ? parts[index - 1] : null
    if (city === null) continue
    return city && /\p{L}/u.test(city) && !/\d/.test(city) && city.length <= 60 ? city : ''
  }
  return ''
}

/** Texto com os marcadores trocados. Sem cidade, vale "sua cidade". */
export function fillExampleText(text: string, answers: ExampleAnswers): string {
  return text
    .replaceAll(EXAMPLE_PLACEHOLDERS.name, answers.name.trim() || 'Seu negócio')
    .replaceAll(EXAMPLE_PLACEHOLDERS.city, answers.city.trim() || 'sua cidade')
}

/** Troca os marcadores em todos os textos de um valor (o conteúdo de uma página, por exemplo). */
export function fillExamples<T>(value: T, answers: ExampleAnswers): T {
  if (typeof value === 'string') return fillExampleText(value, answers) as T
  if (Array.isArray(value)) return value.map((item) => fillExamples(item, answers)) as T
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, fillExamples(item, answers)]),
  ) as T
}

/**
 * Bancos de fotos de onde vêm as fotos dos modelos. O modelo guarda só o endereço; ao aplicar, a
 * foto é copiada para a biblioteca, e o site nunca depende desses serviços.
 */
export const TEMPLATE_PHOTO_HOSTS = ['images.pexels.com', 'images.unsplash.com'] as const

export function isTemplatePhotoURL(value: string | null | undefined): boolean {
  try {
    const url = new URL(value ?? '')
    return (
      url.protocol === 'https:' &&
      (TEMPLATE_PHOTO_HOSTS as readonly string[]).includes(url.hostname)
    )
  } catch {
    return false
  }
}

/**
 * Referências dentro do conteúdo de um modelo. Como as páginas, as fotos e os formulários ainda não
 * existem, o conteúdo usa a **posição** de cada um no modelo (começando em 1) no lugar do id:
 * `{ mediaId: 2 }` é a 2ª foto do modelo; `{ kind: 'page', pageId: 3 }`, a 3ª página; `{ formId: 1 }`,
 * o 1º formulário. Assim o conteúdo segue o mesmo esquema das páginas (e as mesmas migrações).
 */
export type TemplateCounts = { pages: number; photos: number; forms: number }

/** Mensagem com a primeira referência fora do modelo, ou `true` quando todas existem. */
export function checkTemplateReferences(data: PuckPageData, counts: TemplateCounts): string | true {
  const { mediaIds, pageIds, formIds } = collectReferences(data)
  const photo = mediaIds.find((n) => n > counts.photos)
  if (photo) return `A foto ${photo} não existe no modelo (ele tem ${counts.photos}).`
  const page = pageIds.find((n) => n > counts.pages)
  if (page) return `A página ${page} não existe no modelo (ele tem ${counts.pages}).`
  const form = formIds.find((n) => n > counts.forms)
  if (form) return `O formulário ${form} não existe no modelo (ele tem ${counts.forms}).`
  return true
}

/** Ids de verdade, na ordem do modelo: `photos[0]` é o id da foto 1. */
export type TemplateIds = { pages: number[]; photos: number[]; forms: number[] }

const MISSING = Symbol('missing')

function remap(value: unknown, ids: TemplateIds): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => remap(item, ids)).filter((item) => item !== MISSING)
  }
  if (!value || typeof value !== 'object') return value
  const record = value as Record<string, unknown>

  if (typeof record.mediaId === 'number') {
    const id = ids.photos[record.mediaId - 1]
    return id ? { ...record, mediaId: id } : MISSING
  }
  if (typeof record.formId === 'number') {
    const id = ids.forms[record.formId - 1]
    return id ? { ...record, formId: id } : MISSING
  }
  if ((record.kind === 'page' || record.kind === 'section') && typeof record.pageId === 'number') {
    const id = ids.pages[record.pageId - 1]
    // Sem a página (modelo de página avulsa), o botão leva ao WhatsApp, como no protótipo.
    return id ? { ...record, pageId: id } : { kind: 'whatsapp' }
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => {
      const next = remap(item, ids)
      // Foto ou formulário que faltam viram "vazio" no campo; numa lista, saem dela.
      return [key, next === MISSING ? null : next]
    }),
  )
}

/** Conteúdo de um modelo com as posições trocadas pelos ids de verdade. */
export function remapTemplateContent(data: PuckPageData, ids: TemplateIds): PuckPageData {
  return remap(data, ids) as PuckPageData
}
