import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { PANEL_PATHS } from '@/lib/panel'
import { getServerURL } from '@/lib/site'

import { loadPageRows } from './data'
import { NewPageForm } from './NewPageForm'
import { PanelTemplate, requireUser } from './PanelTemplate'

/**
 * Tela "Nova página" (`/admin/paginas/nova`): em branco ou cópia de outra página. Os modelos do
 * protótipo (`vNewPage`) chegam com a coleção Modelos, na fase 4.
 */
export async function NewPageView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.newPage)
  const pages = await loadPageRows(payload, user)

  return (
    <PanelTemplate {...props}>
      <NewPageForm
        adminRoute={adminRoute}
        apiRoute={payload.config.routes.api}
        domain={new URL(getServerURL()).host}
        pages={pages
          .map(({ id, title, slug }) => ({ id, title, slug }))
          .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))}
      />
    </PanelTemplate>
  )
}
