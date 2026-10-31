import type { Payload, TypedUser } from 'payload'

import { exampleTexts, findExampleSections, isExamplePhoto } from '@/lib/examples'
import { type FinishInput, NOT_ARCHIVED, pageStatus, type PageStatus } from '@/lib/panel'
import { relationID } from '@/lib/relations'
import { collectReferences, pageHref } from '@/puck/references'
import { parsePageContent } from '@/puck/schema'

export type PageRow = {
  id: number
  title: string
  slug: string
  path: string
  status: PageStatus
  home: boolean
  /** Guardada em "Arquivadas": fora do site, do menu e da contagem de páginas. */
  archived: boolean
  updatedAt: string
}

/**
 * Páginas como o painel mostra: rascunho mais recente (nome e data) e se a página está no ar, da
 * mais recente para a mais antiga. Inclui as arquivadas (`archived`).
 * Lido com o usuário logado (`overrideAccess: false`), como qualquer tela do painel.
 */
export async function loadPageRows(payload: Payload, user: TypedUser): Promise<PageRow[]> {
  const access = { overrideAccess: false, user } as const
  const [latest, live, site] = await Promise.all([
    payload.find({
      collection: 'pages',
      select: { title: true, slug: true, _status: true, archived: true, updatedAt: true },
      depth: 0,
      draft: true,
      limit: 500,
      pagination: false,
      sort: '-updatedAt',
      ...access,
    }),
    payload.find({
      collection: 'pages',
      where: { _status: { equals: 'published' } },
      select: { title: true },
      depth: 0,
      draft: false,
      limit: 500,
      pagination: false,
      ...access,
    }),
    payload.findGlobal({ slug: 'site', depth: 0, draft: false, ...access }),
  ])
  const liveIds = new Set(live.docs.map((doc) => doc.id))
  const homepageId = relationID(site.homepage)

  return latest.docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    path: pageHref(doc, homepageId),
    status: pageStatus(doc._status, liveIds.has(doc.id)),
    home: doc.id === homepageId,
    archived: Boolean(doc.archived),
    updatedAt: doc.updatedAt,
  }))
}

/** Textos dos modelos gravados, para achar o que ainda é exemplo. */
export async function loadExampleTexts(payload: Payload, user: TypedUser): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'templates',
    select: { pages: true },
    depth: 0,
    pagination: false,
    overrideAccess: false,
    user,
  })
  return exampleTexts(docs)
}

/**
 * O que o cartão "Para terminar seu site" precisa. Vale o que a pessoa está editando (o rascunho
 * mais recente de cada página fora de "Arquivadas") e as configurações que estão no ar. `pageOrder`
 * é a ordem da tela Páginas: a primeira com texto de exemplo é a que o botão abre.
 */
export async function loadFinishInput(
  payload: Payload,
  user: TypedUser,
  pageOrder: PageRow[],
): Promise<FinishInput> {
  const access = { overrideAccess: false, user } as const
  const [latest, photos, site, texts] = await Promise.all([
    payload.find({
      collection: 'pages',
      where: NOT_ARCHIVED,
      select: { content: true, seo: true },
      depth: 0,
      draft: true,
      limit: 500,
      pagination: false,
      ...access,
    }),
    payload.find({
      collection: 'media',
      select: { sourceUrl: true },
      depth: 0,
      limit: 1000,
      pagination: false,
      ...access,
    }),
    payload.findGlobal({ slug: 'site', depth: 0, draft: false, ...access }),
    loadExampleTexts(payload, user),
  ])

  const examplePhotos = new Set(photos.docs.filter(isExamplePhoto).map((photo) => photo.id))
  const withTexts = new Set<number>()
  let examplePhotoPages = 0
  for (const doc of latest.docs) {
    const content = parsePageContent(doc.content)
    const used = content.success ? collectReferences(content.data.data).mediaIds : []
    if ([...used, relationID(doc.seo?.image)].some((id) => id && examplePhotos.has(id))) {
      examplePhotoPages++
    }
    if (content.success && findExampleSections(content.data.data, texts).length) {
      withTexts.add(doc.id)
    }
  }

  const home = pageOrder.find((page) => page.home)
  return {
    tagline: site.tagline,
    whatsapp: site.contact?.whatsapp,
    email: site.contact?.email,
    examplePages: pageOrder
      .filter((page) => withTexts.has(page.id))
      .map(({ id, title }) => ({ id, title })),
    examplePhotoPages,
    home: home ? { id: home.id, live: home.status !== 'draft' } : null,
  }
}

export type PendingGlobal = { slug: 'site' | 'header' | 'footer'; label: string }

const GLOBAL_LABELS: Record<PendingGlobal['slug'], string> = {
  site: 'Configurações',
  header: 'Menu do topo',
  footer: 'Rodapé',
}

/** Configurações, topo e rodapé com mudança salva e ainda não publicada. */
export async function loadPendingGlobals(
  payload: Payload,
  user: TypedUser,
): Promise<PendingGlobal[]> {
  const slugs = Object.keys(GLOBAL_LABELS) as PendingGlobal['slug'][]
  const drafts = await Promise.all(
    slugs.map((slug) =>
      payload.findGlobal({ slug, depth: 0, draft: true, overrideAccess: false, user }),
    ),
  )
  return slugs
    .filter((_, index) => drafts[index]._status === 'draft')
    .map((slug) => ({ slug, label: GLOBAL_LABELS[slug] }))
}
