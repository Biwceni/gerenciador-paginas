import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { menuPageOrder } from '@/hooks/protectPage'
import { PANEL_PATHS, sortPagesForList } from '@/lib/panel'
import { getServerURL } from '@/lib/site'

import { loadPageRows } from './data'
import { PagesList } from './PagesList'
import { PanelTemplate, requireUser } from './PanelTemplate'

/**
 * Tela "Páginas" (`/admin/paginas`): todas as páginas com status e ações, na ordem do menu (a
 * inicial no topo), e o grupo "Arquivadas". Segue o `vPages`.
 */
export async function PagesView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.pages)
  const { req } = props.initPageResult
  const [pages, menuOrder] = await Promise.all([loadPageRows(payload, user), menuPageOrder(req)])
  const sorted = sortPagesForList(pages, menuOrder)

  return (
    <PanelTemplate {...props}>
      <PagesList
        adminRoute={adminRoute}
        apiRoute={payload.config.routes.api}
        archived={sorted.filter((page) => page.archived)}
        domain={new URL(getServerURL()).host}
        inMenu={menuOrder}
        pages={sorted.filter((page) => !page.archived)}
      />
    </PanelTemplate>
  )
}
