import type { PayloadRequest } from 'payload'
import { commitTransaction, initTransaction, killTransaction } from 'payload'

import type { Page, SiteBackup } from '../payload-types'
import { relationID } from './relations'

// A8: cópia de segurança do site antes de trocar de negócio, e o "Voltar para este site". A cópia
// guarda o que está no ar das Configurações, do menu e do rodapé, e a lista das páginas que vão
// para "Arquivadas" (o conteúdo delas continua nas próprias páginas, arquivadas como rascunho).

export type BackupPage = { id: number; slug: string; live: boolean }

/**
 * Ao voltar, a página inicial guardada volta como estava, no ar ou em rascunho (site que ainda não
 * tinha ido ao ar). A regra "a inicial não sai do ar" deixa passar só esse caso (`context` só existe
 * na API local).
 */
export const RESTORE_CONTEXT = { siteRestore: true } as const

const META = new Set(['id', 'createdAt', 'updatedAt', 'globalType', '_status'])

/** O documento sem os campos que o Payload controla. */
function strip(doc: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(doc).filter(([key]) => !META.has(key)))
}

/**
 * Guarda o site de agora. `pages` são as páginas que não estão arquivadas (as que vão sair), com o
 * endereço de antes de arquivar e se estavam no ar. Sem página nenhuma, não guarda nada.
 */
export async function backupSite(req: PayloadRequest, pages: Page[]): Promise<number | null> {
  const current = pages.filter((page) => !page.archived)
  if (!current.length) return null
  const access = { overrideAccess: false, req } as const
  const read = { depth: 0, draft: false, ...access } as const
  const [site, header, footer] = await Promise.all([
    req.payload.findGlobal({ slug: 'site', ...read }),
    req.payload.findGlobal({ slug: 'header', ...read }),
    req.payload.findGlobal({ slug: 'footer', ...read }),
  ])
  // Quais estão no ar: a versão publicada existe (o rascunho mais recente pode ser só rascunho).
  const { docs: live } = await req.payload.find({
    collection: 'pages',
    where: { id: { in: current.map((page) => page.id) } },
    // O `_status` tem de vir junto: sem ele no `select`, toda página parecia fora do ar.
    select: { slug: true, _status: true },
    depth: 0,
    draft: false,
    pagination: false,
    ...access,
  })
  const liveIds = new Set(
    live.filter((page) => (page as Page)._status === 'published').map((page) => page.id),
  )
  const doc = await req.payload.create({
    collection: 'site-backups',
    data: {
      name: site.name?.trim() || 'Site sem nome',
      site: strip(site),
      header: strip(header),
      footer: strip(footer),
      pages: current.map((page): BackupPage => ({
        id: page.id,
        slug: page.slug,
        live: liveIds.has(page.id),
      })),
    },
    // Só o servidor cria cópias (a coleção é fechada para a API).
    overrideAccess: true,
    req,
  })
  return doc.id
}

/** As páginas guardadas na cópia, como estão no banco. */
export function backupPages(backup: Pick<SiteBackup, 'pages'>): BackupPage[] {
  if (!Array.isArray(backup.pages)) return []
  return backup.pages.flatMap((item) => {
    const page = item as Partial<BackupPage> | null
    return page && typeof page.id === 'number' && typeof page.slug === 'string'
      ? [{ id: page.id, slug: page.slug, live: Boolean(page.live) }]
      : []
  })
}

/** Ids das fotos que ainda existem, entre os pedidos. */
async function existingMedia(req: PayloadRequest, ids: (number | null)[]) {
  const wanted = ids.filter((id): id is number => typeof id === 'number')
  if (!wanted.length) return new Set<number>()
  const { docs } = await req.payload.find({
    collection: 'media',
    where: { id: { in: wanted } },
    select: { filename: true },
    depth: 0,
    pagination: false,
    overrideAccess: false,
    req,
  })
  return new Set(docs.map((doc) => doc.id))
}

/**
 * Links do menu e do rodapé que levam a páginas que não existem mais: saem da lista (o Payload
 * recusaria salvar). Vale também para os links de dentro de um grupo.
 */
export function keepLinks<T>(value: T, pages: Set<number>): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => {
        const link = (item as { link?: { kind?: string; page?: unknown } } | null)?.link
        const page = relationID(link?.page as number | { id: number } | null | undefined)
        return !(
          link &&
          (link.kind === 'page' || link.kind === 'section') &&
          page &&
          !pages.has(page)
        )
      })
      .map((item) => keepLinks(item, pages)) as T
  }
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      // Link solto (botão do topo, linha de cima): sem a página, fica vazio.
      if (key === 'link' && item && typeof item === 'object') {
        const link = item as { kind?: string; page?: unknown }
        const page = relationID(link.page as number | { id: number } | null | undefined)
        if ((link.kind === 'page' || link.kind === 'section') && page && !pages.has(page)) {
          return [key, { kind: 'page', page: null }]
        }
      }
      return [key, keepLinks(item, pages)]
    }),
  ) as T
}

/**
 * Volta para o site guardado na cópia: guarda o de agora numa cópia nova (dá para voltar de novo),
 * tira as páginas guardadas de "Arquivadas" (no endereço de antes e no ar, as que estavam no ar),
 * põe de volta as Configurações, o menu e o rodapé e arquiva as páginas de agora. A cópia usada
 * é apagada no fim: as páginas dela voltaram a ser o site.
 */
export async function restoreSiteBackup(
  req: PayloadRequest,
  backupId: number,
): Promise<{ homepage: number | null; restored: number; missing: number }> {
  const access = { overrideAccess: false, req } as const
  const backup = await req.payload.findByID({
    collection: 'site-backups',
    id: backupId,
    depth: 0,
    ...access,
  })

  const shouldCommit = await initTransaction(req)
  try {
    const { docs: all } = await req.payload.find({
      collection: 'pages',
      depth: 0,
      draft: true,
      pagination: false,
      ...access,
    })
    const byId = new Map(all.map((page) => [page.id, page]))
    const saved = backupPages(backup).filter((page) => byId.has(page.id))
    const missing = backupPages(backup).length - saved.length
    if (!saved.length) {
      throw new Error('As páginas deste site foram excluídas. Não dá para voltar para ele.')
    }
    const savedIds = new Set(saved.map((page) => page.id))
    const current = all.filter((page) => !page.archived && !savedIds.has(page.id))
    await backupSite(req, current)

    // 1. As páginas guardadas saem de "Arquivadas". O endereço de antes volta depois, quando as
    // páginas de agora liberarem.
    for (const item of saved) {
      const page = byId.get(item.id)!
      await req.payload.update({
        collection: 'pages',
        id: page.id,
        data: {
          title: page.title,
          campaign: page.campaign,
          content: page.content,
          seo: { ...page.seo, image: relationID(page.seo?.image) },
          archived: false,
          _status: item.live ? 'published' : 'draft',
        },
        draft: !item.live,
        // A página que vai voltar a ser a inicial pode ter sido rascunho no site guardado.
        context: RESTORE_CONTEXT,
        ...access,
      })
    }

    // 2. Configurações, menu e rodapé de volta, com o que não existe mais tirado.
    const pageIds = new Set(all.map((page) => page.id))
    const site = backup.site as Record<string, unknown>
    const media = await existingMedia(req, [
      relationID(site.logo as number | null),
      relationID(site.logoLight as number | null),
      relationID(site.shareImage as number | null),
    ])
    const mediaOrNull = (value: unknown) => {
      const id = relationID(value as number | null)
      return id && media.has(id) ? id : null
    }
    const pageOrNull = (value: unknown) => {
      const id = relationID(value as number | null)
      return id && pageIds.has(id) ? id : null
    }
    const homepage = pageOrNull(site.homepage)
    await req.payload.updateGlobal({
      slug: 'site',
      data: {
        ...site,
        logo: mediaOrNull(site.logo),
        logoLight: mediaOrNull(site.logoLight),
        shareImage: mediaOrNull(site.shareImage),
        homepage,
        privacyPage: pageOrNull(site.privacyPage),
        _status: 'published',
      },
      ...access,
    })
    await req.payload.updateGlobal({
      slug: 'header',
      data: {
        ...keepLinks(backup.header as Record<string, unknown>, pageIds),
        _status: 'published',
      },
      ...access,
    })
    await req.payload.updateGlobal({
      slug: 'footer',
      data: {
        ...keepLinks(backup.footer as Record<string, unknown>, pageIds),
        _status: 'published',
      },
      ...access,
    })

    // 3. As páginas de agora vão para "Arquivadas" (já não são a inicial nem estão no menu).
    for (const page of current) {
      await req.payload.update({
        collection: 'pages',
        id: page.id,
        data: {
          title: page.title,
          campaign: page.campaign,
          content: page.content,
          seo: { ...page.seo, image: relationID(page.seo?.image) },
          archived: true,
          _status: 'draft',
        },
        ...access,
      })
    }

    // 4. O endereço de antes, se ficou livre.
    const { docs: now } = await req.payload.find({
      collection: 'pages',
      select: { slug: true },
      depth: 0,
      draft: true,
      pagination: false,
      ...access,
    })
    for (const item of saved) {
      const page = now.find((doc) => doc.id === item.id)
      if (!page || page.slug === item.slug) continue
      if (now.some((doc) => doc.id !== item.id && doc.slug === item.slug)) continue
      const latest = await req.payload.findByID({
        collection: 'pages',
        id: item.id,
        depth: 0,
        draft: true,
        ...access,
      })
      await req.payload.update({
        collection: 'pages',
        id: item.id,
        data: {
          title: latest.title,
          slug: item.slug,
          campaign: latest.campaign,
          content: latest.content,
          seo: { ...latest.seo, image: relationID(latest.seo?.image) },
          _status: item.live ? 'published' : 'draft',
        },
        draft: !item.live,
        context: RESTORE_CONTEXT,
        ...access,
      })
      page.slug = item.slug
    }

    await req.payload.delete({ collection: 'site-backups', id: backup.id, ...access })
    if (shouldCommit) await commitTransaction(req)
    return { homepage, restored: saved.length, missing }
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}
