import { getPayload } from 'payload'
import { cache } from 'react'

import config from '@/payload.config'
import type { Footer, Header, Media, Page, Site } from '@/payload-types'

import { whatsAppURL } from './links'
import { relationID } from './relations'
import { FALLBACK_SITE_NAME } from './site'
import { sectionAnchors } from '../puck/anchors'
import { pageHref, type SiteInfo } from '../puck/references'
import { parsePageContent, type PuckPageData } from '../puck/schema'

// Tudo aqui lê como visitante (`overrideAccess: false`, sem usuário) e só o que está publicado:
// o site público nunca mostra rascunho, mesmo se alguém errar a chamada.

export const getPayloadClient = () => getPayload({ config })

// `cache` do React: layout, página e metadados da mesma requisição dividem a mesma busca.
export const getSite = cache(async (): Promise<Partial<Site>> => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'site', depth: 1, draft: false, overrideAccess: false })
})

export const getHeader = cache(async (): Promise<Partial<Header>> => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'header', depth: 1, draft: false, overrideAccess: false })
})

export const getFooter = cache(async (): Promise<Partial<Footer>> => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'footer', depth: 1, draft: false, overrideAccess: false })
})

export const getPageBySlug = cache(async (slug: string): Promise<Page | null> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    depth: 1,
    draft: false,
    limit: 1,
    pagination: false,
    overrideAccess: false,
  })
  return docs[0] ?? null
})

export const getPageByID = cache(async (id: number): Promise<Page | null> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    where: { id: { equals: id } },
    depth: 1,
    draft: false,
    limit: 1,
    pagination: false,
    overrideAccess: false,
  })
  return docs[0] ?? null
})

export { relationID } from './relations'

/** A página inicial escolhida nas configurações, se estiver publicada. */
export async function getHomepage(): Promise<Page | null> {
  const id = relationID((await getSite()).homepage)
  return id ? getPageByID(id) : null
}

/** Conteúdo pronto para desenhar. Conteúdo fora do formato vira página vazia, sem derrubar o site. */
export function readPageContent(page: Page): PuckPageData {
  const result = parsePageContent(page.content)
  if (result.success) return result.data.data
  console.error(`Conteúdo inválido na página ${page.id}:`, result.error.issues[0])
  return { root: { props: {} }, content: [] }
}

/** Foto de uma relação já carregada (depth 1); id solto ou foto apagada viram `null`. */
export function populatedMedia(value: number | Media | null | undefined): Media | null {
  return value && typeof value === 'object' && value.url ? value : null
}

/**
 * O que os links precisam saber do site: qual é a página inicial, o WhatsApp e, para links a uma
 * seção, as âncoras das páginas citadas (por página e por id da seção).
 */
export type SiteLinks = {
  homepageId: number | null
  whatsappHref: string | null
  pageAnchors?: Record<number, Record<string, string>>
}

export function siteLinks(site: Partial<Site>): SiteLinks {
  return {
    homepageId: relationID(site.homepage),
    whatsappHref: whatsAppURL(site.contact?.whatsapp),
  }
}

/** O que as seções mostram das configurações: nome, logo, contato e a página de privacidade. */
export function siteInfo(site: Partial<Site>): SiteInfo {
  return {
    name: site.name || FALLBACK_SITE_NAME,
    logo: populatedMedia(site.logo),
    contact: site.contact ?? {},
    privacyHref: privacyHref(site),
  }
}

/** Endereço da página de privacidade, só com ela publicada. Precisa do site lido com depth 1. */
export function privacyHref(site: Partial<Site>): string | null {
  return resolveLink({ kind: 'page', page: site.privacyPage }, siteLinks(site))
}

type LinkValue = {
  kind?: 'page' | 'section' | 'whatsapp' | 'url' | null
  page?: number | Page | null
  section?: string | null
  url?: string | null
}

/**
 * Âncoras das páginas que o cabeçalho cita com links para seção, lidas na versão publicada.
 * Uma busca só por requisição, dividida entre cabeçalho e rodapé.
 */
export const getMenuAnchors = cache(async (): Promise<Record<number, Record<string, string>>> => {
  const header = await getHeader()
  const links = [...(header.items ?? []).map((item) => item.link), header.button?.link]
  const ids = [
    ...new Set(links.flatMap((link) => (link?.kind === 'section' ? [relationID(link.page)] : []))),
  ].filter((id): id is number => id !== null)
  if (!ids.length) return {}

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    where: { id: { in: ids } },
    select: { content: true },
    depth: 0,
    draft: false,
    limit: ids.length,
    pagination: false,
    overrideAccess: false,
  })
  return Object.fromEntries(
    docs.map((doc) => {
      const parsed = parsePageContent(doc.content)
      return [doc.id, parsed.success ? sectionAnchors(parsed.data.data) : {}]
    }),
  )
})

/**
 * Endereço de um link dos globals. Página que não está no ar chega só como id (o visitante não
 * pode lê-la) e o link some, em vez de levar a uma página de erro.
 */
export function resolveLink(link: LinkValue | null | undefined, site: SiteLinks): string | null {
  if (!link) return null
  if (link.kind === 'url') return link.url || null
  if (link.kind === 'whatsapp') return site.whatsappHref
  const page = link.page
  if (!page || typeof page !== 'object' || page._status !== 'published') return null
  const href = pageHref(page, site.homepageId)
  if (link.kind !== 'section') return href
  // Seção que saiu da página (ou ganhou outro nome) leva para a página.
  const anchor = link.section ? site.pageAnchors?.[page.id]?.[link.section] : undefined
  return anchor ? `${href}#${anchor}` : href
}
