import { getPayload } from 'payload'
import { cache } from 'react'

import config from '@/payload.config'
import type { Footer, Header, Media, Page, Site } from '@/payload-types'

import { whatsAppURL } from './links'
import { pageHref } from '../puck/references'
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

export function relationID(value: number | { id: number } | null | undefined): number | null {
  if (value == null) return null
  return typeof value === 'number' ? value : value.id
}

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

/** O que os links precisam saber do site: qual é a página inicial e o WhatsApp. */
export type SiteLinks = { homepageId: number | null; whatsappHref: string | null }

export function siteLinks(site: Partial<Site>): SiteLinks {
  return {
    homepageId: relationID(site.homepage),
    whatsappHref: whatsAppURL(site.contact?.whatsapp),
  }
}

type LinkValue = {
  kind?: 'page' | 'whatsapp' | 'url' | null
  page?: number | Page | null
  url?: string | null
}

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
  return pageHref(page, site.homepageId)
}
