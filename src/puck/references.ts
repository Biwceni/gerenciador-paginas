import type { Payload } from 'payload'

import type { Media } from '../payload-types'
import type { LinkRef, PhotoRef, PuckPageData } from './schema'

/** O que as seções precisam para desenhar: fotos e endereços já buscados no banco. */
export type ContentMetadata = {
  photos: Record<number, Media>
  pageHrefs: Record<number, string>
  /** Link do WhatsApp das configurações; sem número cadastrado, os links de WhatsApp somem. */
  whatsappHref: string | null
  /** Seção de abertura que é a primeira da página: o título dela vira o título principal (h1). */
  mainHeadingId?: string
}

type References = { mediaIds: number[]; pageIds: number[] }

/** Junta os ids de fotos e páginas citados no conteúdo, em qualquer seção ou nível. */
export function collectReferences(data: PuckPageData): References {
  const mediaIds = new Set<number>()
  const pageIds = new Set<number>()

  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk)
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    if (typeof record.mediaId === 'number') mediaIds.add(record.mediaId)
    if (record.kind === 'page' && typeof record.pageId === 'number') pageIds.add(record.pageId)
    Object.values(record).forEach(walk)
  }
  walk(data)

  return { mediaIds: [...mediaIds], pageIds: [...pageIds] }
}

export function pageHref(page: { id: number; slug?: string | null }, homepageId?: number | null) {
  return page.id === homepageId ? '/' : `/${page.slug}`
}

/**
 * Busca de uma vez as fotos e as páginas citadas, como visitante (só o que está publicado).
 * Foto apagada ou link para página que não está no ar simplesmente não aparecem.
 */
export async function resolveReferences(
  payload: Payload,
  data: PuckPageData,
  site: { homepageId: number | null; whatsappHref: string | null },
): Promise<ContentMetadata> {
  const { mediaIds, pageIds } = collectReferences(data)

  const [media, pages] = await Promise.all([
    mediaIds.length
      ? payload.find({
          collection: 'media',
          where: { id: { in: mediaIds } },
          depth: 0,
          limit: mediaIds.length,
          pagination: false,
          overrideAccess: false,
        })
      : null,
    pageIds.length
      ? payload.find({
          collection: 'pages',
          where: { id: { in: pageIds } },
          select: { slug: true },
          depth: 0,
          draft: false,
          limit: pageIds.length,
          pagination: false,
          overrideAccess: false,
        })
      : null,
  ])

  const first = data.content[0]

  return {
    photos: Object.fromEntries((media?.docs ?? []).map((doc) => [doc.id, doc])),
    pageHrefs: Object.fromEntries(
      (pages?.docs ?? []).map((doc) => [doc.id, pageHref(doc, site.homepageId)]),
    ),
    whatsappHref: site.whatsappHref,
    mainHeadingId: first?.type === 'Hero' ? first.props.id : undefined,
  }
}

export function getPhoto(metadata: ContentMetadata, ref: PhotoRef): Media | null {
  return (ref && metadata.photos[ref.mediaId]) || null
}

export function getHref(metadata: ContentMetadata, link: LinkRef): string | null {
  if (!link) return null
  if (link.kind === 'url') return link.url
  if (link.kind === 'whatsapp') return metadata.whatsappHref
  return metadata.pageHrefs[link.pageId] ?? null
}
