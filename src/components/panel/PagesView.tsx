import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { pagesInMenu } from '@/hooks/protectPage'
import { PANEL_PATHS } from '@/lib/panel'
import { getServerURL } from '@/lib/site'

import { loadPageRows } from './data'
import { PagesList } from './PagesList'
import { PanelTemplate, requireUser } from './PanelTemplate'

/** Tela "Páginas" (`/admin/paginas`): todas as páginas com status e ações. Segue o `vPages`. */
export async function PagesView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.pages)
  const { req } = props.initPageResult
  const [pages, inMenu] = await Promise.all([loadPageRows(payload, user), pagesInMenu(req)])

  return (
    <PanelTemplate {...props}>
      <PagesList
        adminRoute={adminRoute}
        apiRoute={payload.config.routes.api}
        domain={new URL(getServerURL()).host}
        inMenu={[...inMenu]}
        pages={pages}
      />
    </PanelTemplate>
  )
}
