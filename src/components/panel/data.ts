import type { Payload, TypedUser } from 'payload'

import { pageStatus, type PageStatus } from '@/lib/panel'
import { relationID } from '@/lib/relations'
import { pageHref } from '@/puck/references'

export type PageRow = {
  id: number
  title: string
  slug: string
  path: string
  status: PageStatus
  home: boolean
  updatedAt: string
}

/**
 * Páginas como o painel mostra: rascunho mais recente (nome e data) e se a página está no ar.
 * Lido com o usuário logado (`overrideAccess: false`), como qualquer tela do painel.
 */
export async function loadPageRows(payload: Payload, user: TypedUser): Promise<PageRow[]> {
  const access = { overrideAccess: false, user } as const
  const [latest, live, site] = await Promise.all([
    payload.find({
      collection: 'pages',
      select: { title: true, slug: true, _status: true, updatedAt: true },
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
    updatedAt: doc.updatedAt,
  }))
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
