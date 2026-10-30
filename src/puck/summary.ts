import { sectionAnchors } from './anchors'
import { parsePageContent } from './schema'

/** Página como destino de link: nome, endereço, se está no ar e as seções com nome no menu. */
export type PageSummary = {
  id: number
  title: string
  slug: string
  published: boolean
  /** Arquivada: fica fora das listas de destino de link. */
  archived?: boolean
  sections: { id: string; label: string }[]
}

export function pageSummary(
  doc: { id: number; title: string; slug: string; content?: unknown; archived?: boolean | null },
  published: boolean,
): PageSummary {
  const parsed = parsePageContent(doc.content)
  const anchors = parsed.success ? sectionAnchors(parsed.data.data) : {}
  const labels = parsed.success
    ? Object.fromEntries(
        parsed.data.data.content.map((item) => [
          item.props.id,
          'menuLabel' in item.props ? item.props.menuLabel : '',
        ]),
      )
    : {}
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    published,
    archived: Boolean(doc.archived),
    sections: Object.keys(anchors).map((sectionId) => ({
      id: sectionId,
      label: labels[sectionId] || sectionId,
    })),
  }
}
