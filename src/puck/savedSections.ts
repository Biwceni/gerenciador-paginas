import { type SectionItem, unpackSection } from './sectionClipboard'

// "Minhas seções" (E2): seções guardadas para usar de novo, em qualquer página e aparelho. Cada uma
// é uma cópia: mudar a seção da página depois não muda a guardada.

/** Quantas seções guardadas um site pode ter. */
export const SAVED_LIMIT = 30

/** Tamanho máximo do nome de uma seção guardada. */
export const SAVED_NAME_MAX = 60

export type SavedSection = {
  id: number
  name: string
  /** A seção pronta para entrar na página, ou `null` se ela não serve mais (formato antigo). */
  item: SectionItem | null
  /** Tipo da seção, para a miniatura, mesmo quando ela não serve mais. */
  type: string
}

/**
 * O nome que a janela de guardar já traz: o título da seção, ou o nome do tipo dela (`label`).
 * O nome do tipo vem de fora porque esta parte também roda na coleção, no servidor.
 */
export function defaultSavedName(item: SectionItem, label: string): string {
  const title = typeof item.props.title === 'string' ? item.props.title : ''
  const plain = title
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const name = plain ? `${label}: ${plain}` : label
  return name.length > SAVED_NAME_MAX ? `${name.slice(0, SAVED_NAME_MAX - 1).trimEnd()}…` : name
}

/** Nome limpo para guardar: sem espaços sobrando e no tamanho máximo. */
export function cleanSavedName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, SAVED_NAME_MAX)
}

type SavedDoc = { id: number; name?: string | null; section?: unknown }

/** Uma seção guardada como vem do banco, conferida e migrada como numa página salva. */
export function readSaved(doc: SavedDoc): SavedSection {
  const section = doc.section as { item?: { type?: unknown } } | null | undefined
  const item = unpackSection(doc.section ? JSON.stringify(doc.section) : null)
  return {
    id: doc.id,
    name: doc.name?.trim() || 'Seção guardada',
    item,
    type: item?.type ?? (typeof section?.item?.type === 'string' ? section.item.type : ''),
  }
}

type Exists = {
  hasPhoto: (id: number) => boolean
  hasPage: (id: number) => boolean
  hasForm: (id: number) => boolean
}

/**
 * A seção sem o que não existe mais no site: foto apagada da biblioteca, página apagada (o link
 * fica sem destino) e formulário apagado. O Publicar já avisa de cada um desses.
 */
export function dropMissingReferences(item: SectionItem, exists: Exists): SectionItem {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk)
    if (!value || typeof value !== 'object') return value
    const record = value as Record<string, unknown>
    if (typeof record.mediaId === 'number' && !exists.hasPhoto(record.mediaId)) return null
    if (typeof record.formId === 'number' && !exists.hasForm(record.formId)) return null
    if (
      (record.kind === 'page' || record.kind === 'section') &&
      typeof record.pageId === 'number' &&
      !exists.hasPage(record.pageId)
    ) {
      return null
    }
    return Object.fromEntries(Object.entries(record).map(([key, inner]) => [key, walk(inner)]))
  }
  return walk(item) as SectionItem
}
