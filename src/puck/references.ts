import type { Payload } from 'payload'

import { type FormDefinition, toFormDefinition } from '../lib/forms'
import { relationID } from '../lib/relations'
import type { Media, Site } from '../payload-types'
import { sectionAnchors } from './anchors'
import { type LinkRef, parsePageContent, type PhotoRef, type PuckPageData } from './schema'

/** O que as seções precisam para desenhar: fotos, endereços e contato já buscados no banco. */
export type ContentMetadata = {
  photos: Record<number, Media>
  /** Formulários citados pelas seções "Formulário". */
  forms: Record<number, FormDefinition>
  /** Página que está sendo desenhada (vai junto com as mensagens dos formulários). */
  pageId?: number
  pageHrefs: Record<number, string>
  /** Âncoras das seções de outras páginas citadas em links, por página e por id da seção. */
  pageAnchors: Record<number, Record<string, string>>
  /** Âncoras das seções desta página (o `id` de cada uma no site). */
  anchors: Record<string, string>
  /** Link do WhatsApp das configurações; sem número cadastrado, os links de WhatsApp somem. */
  whatsappHref: string | null
  /** O que a seção de contato e a lista de links mostram, das configurações do site. */
  site: SiteInfo
  /** Seção de abertura que é a primeira da página: o título dela vira o título principal (h1). */
  mainHeadingId?: string
  /**
   * Prévia do editor: o que está vazio aparece com um aviso (para dar para clicar e preencher) e
   * botões e links aparecem mesmo sem destino no ar, sem levar a lugar nenhum.
   */
  editing?: boolean
}

export type SiteInfo = {
  name: string
  logo: Media | null
  contact: NonNullable<Site['contact']>
}

type References = {
  mediaIds: number[]
  pageIds: number[]
  sectionPageIds: number[]
  formIds: number[]
}

/** Junta os ids de fotos e páginas citados no conteúdo, em qualquer seção ou nível. */
export function collectReferences(data: PuckPageData): References {
  const mediaIds = new Set<number>()
  const pageIds = new Set<number>()
  const sectionPageIds = new Set<number>()
  const formIds = new Set<number>()

  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk)
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    if (typeof record.mediaId === 'number') mediaIds.add(record.mediaId)
    if (typeof record.formId === 'number') formIds.add(record.formId)
    if ((record.kind === 'page' || record.kind === 'section') && typeof record.pageId === 'number')
      pageIds.add(record.pageId)
    if (record.kind === 'section' && typeof record.pageId === 'number')
      sectionPageIds.add(record.pageId)
    Object.values(record).forEach(walk)
  }
  walk(data)

  return {
    mediaIds: [...mediaIds],
    pageIds: [...pageIds],
    sectionPageIds: [...sectionPageIds],
    formIds: [...formIds],
  }
}

/** Fotos que a página mostra: as das seções e a escolhida para o Google e o compartilhamento. */
export function pagePhotoIds(
  data: PuckPageData | null,
  seoImage: number | { id: number } | null | undefined,
): number[] {
  const sections = data ? collectReferences(data).mediaIds : []
  const seo = relationID(seoImage)
  return seo && !sections.includes(seo) ? [...sections, seo] : sections
}

/** A página tem algum botão (com texto) que leva ao WhatsApp? Sem número, ele não aparece no site. */
export function usesWhatsApp(data: PuckPageData): boolean {
  const walk = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(walk)
    if (!value || typeof value !== 'object') return false
    const record = value as { label?: unknown; link?: { kind?: unknown } | null }
    if (
      typeof record.label === 'string' &&
      record.label.trim() &&
      record.link?.kind === 'whatsapp'
    ) {
      return true
    }
    return Object.values(value).some(walk)
  }
  return walk(data.content)
}

export function pageHref(page: { id: number; slug?: string | null }, homepageId?: number | null) {
  return page.id === homepageId ? '/' : `/${page.slug}`
}

/** Primeira seção que pode ter o título principal da página: banner ou lista de links. */
export function mainHeadingID(data: PuckPageData): string | undefined {
  const first = data.content[0]
  return first?.type === 'Hero' || first?.type === 'LinkList' ? first.props.id : undefined
}

/**
 * Busca de uma vez as fotos e as páginas citadas, como visitante (só o que está publicado).
 * Foto apagada ou link para página que não está no ar simplesmente não aparecem.
 */
export async function resolveReferences(
  payload: Payload,
  data: PuckPageData,
  site: { homepageId: number | null; whatsappHref: string | null; info: SiteInfo },
  pageId?: number,
): Promise<ContentMetadata> {
  const { mediaIds, pageIds, sectionPageIds, formIds } = collectReferences(data)

  const [media, pages, forms] = await Promise.all([
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
          // O conteúdo só é preciso para achar as âncoras das páginas com links para seções.
          select: sectionPageIds.length ? { slug: true, content: true } : { slug: true },
          depth: 0,
          draft: false,
          limit: pageIds.length,
          pagination: false,
          overrideAccess: false,
        })
      : null,
    formIds.length
      ? payload.find({
          collection: 'forms',
          where: { id: { in: formIds } },
          select: { title: true, submitButtonLabel: true, confirmationMessage: true, fields: true },
          depth: 0,
          limit: formIds.length,
          pagination: false,
          overrideAccess: false,
        })
      : null,
  ])

  const pageAnchors: Record<number, Record<string, string>> = {}
  for (const doc of pages?.docs ?? []) {
    if (!sectionPageIds.includes(doc.id)) continue
    const parsed = parsePageContent(doc.content)
    if (parsed.success) pageAnchors[doc.id] = sectionAnchors(parsed.data.data)
  }

  return {
    photos: Object.fromEntries((media?.docs ?? []).map((doc) => [doc.id, doc])),
    forms: Object.fromEntries((forms?.docs ?? []).map((doc) => [doc.id, toFormDefinition(doc)])),
    pageId,
    pageHrefs: Object.fromEntries(
      (pages?.docs ?? []).map((doc) => [doc.id, pageHref(doc, site.homepageId)]),
    ),
    pageAnchors,
    anchors: sectionAnchors(data),
    whatsappHref: site.whatsappHref,
    site: site.info,
    mainHeadingId: mainHeadingID(data),
  }
}

export function getPhoto(metadata: ContentMetadata, ref: PhotoRef): Media | null {
  return (ref && metadata.photos[ref.mediaId]) || null
}

/**
 * Endereço de um link. Seção que não existe mais na versão publicada leva para a página;
 * página fora do ar, ou WhatsApp sem número, dá `null` e o link some.
 */
export function getHref(metadata: ContentMetadata, link: LinkRef): string | null {
  if (!link) return null
  if (link.kind === 'url') return link.url
  if (link.kind === 'whatsapp') return metadata.whatsappHref
  const href = metadata.pageHrefs[link.pageId]
  if (!href || link.kind === 'page') return href ?? null
  const anchor = metadata.pageAnchors[link.pageId]?.[link.sectionId]
  return anchor ? `${href}#${anchor}` : href
}
