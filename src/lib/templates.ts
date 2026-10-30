import type { PanelIconName } from '../components/panel/PanelIcon'
import { collectReferences } from '../puck/references'
import type { PuckPageData } from '../puck/schema'

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

/** Ramos do "Site da empresa": escolhem as páginas, os textos e as fotos de exemplo. */
export const SEGMENTS = [
  {
    value: 'cafe',
    label: 'Restaurante ou café',
    text: 'Cafeteria, padaria, restaurante, lanchonete',
    icon: 'cup',
  },
  {
    value: 'saude',
    label: 'Clínica ou consultório',
    text: 'Dentista, psicólogo, fisioterapia, estética',
    icon: 'heart',
  },
  {
    value: 'servicos',
    label: 'Prestador de serviços',
    text: 'Reformas, contabilidade, advocacia, limpeza',
    icon: 'tool',
  },
  {
    value: 'loja',
    label: 'Loja e produtos',
    text: 'Artesanato, roupas, presentes, feitos à mão',
    icon: 'bag',
  },
  {
    value: 'outro',
    label: 'Outro tipo',
    text: 'Um site simples de 3 páginas para adaptar',
    icon: 'file',
  },
] as const satisfies readonly { value: string; label: string; text: string; icon: PanelIconName }[]

export type Segment = (typeof SEGMENTS)[number]['value']

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
