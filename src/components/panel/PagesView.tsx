import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { canFixOrphans } from '@/endpoints/orphanDrafts'
import { findOrphanDrafts } from '@/hooks/orphanVersions'
import { menuPageOrder } from '@/hooks/protectPage'
import { PANEL_PATHS, sortPagesForList } from '@/lib/panel'
import { backupPages } from '@/lib/siteBackup'
import { getServerURL } from '@/lib/site'

import { loadPageRows } from './data'
import { PagesList, type SiteBackupRow } from './PagesList'
import { PanelTemplate, requireUser } from './PanelTemplate'

/**
 * Tela "Páginas" (`/admin/paginas`): todas as páginas com status e ações, na ordem do menu (a
 * inicial no topo), e o grupo "Arquivadas", com os sites anteriores (A8). Segue o `vPages`.
 */
export async function PagesView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.pages)
  const { req } = props.initPageResult
  const [pages, menuOrder, orphans, backups] = await Promise.all([
    loadPageRows(payload, user),
    menuPageOrder(req),
    // B9 v2: rascunho que ficou sem página, com Recuperar e Apagar (só para quem pode).
    canFixOrphans(req).then((can) => (can ? findOrphanDrafts(req) : [])),
    // A8: os sites guardados antes de trocar de negócio. Só o administrador vê e volta.
    user.role === 'admin'
      ? payload.find({
          collection: 'site-backups',
          depth: 0,
          sort: '-createdAt',
          pagination: false,
          overrideAccess: false,
          user,
        })
      : null,
  ])
  const siteBackups: SiteBackupRow[] = (backups?.docs ?? []).map((doc) => ({
    id: doc.id,
    name: doc.name,
    createdAt: doc.createdAt,
    pages: backupPages(doc).length,
  }))
  const sorted = sortPagesForList(pages, menuOrder)

  return (
    <PanelTemplate {...props}>
      <PagesList
        adminRoute={adminRoute}
        apiRoute={payload.config.routes.api}
        archived={sorted.filter((page) => page.archived)}
        domain={new URL(getServerURL()).host}
        inMenu={menuOrder}
        orphans={orphans}
        pages={sorted.filter((page) => !page.archived)}
        siteBackups={siteBackups}
      />
    </PanelTemplate>
  )
}
