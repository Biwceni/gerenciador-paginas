import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { PANEL_PATHS } from '@/lib/panel'
import { getServerURL } from '@/lib/site'
import { parsePageContent, type PuckPageData } from '@/puck/schema'

import { loadPageRows } from './data'
import { NewPageForm } from './NewPageForm'
import { PanelTemplate, requireUser } from './PanelTemplate'

/** Seções que o modelo cria, de cima para baixo: o cartão desenha cada uma. */
const sectionTypes = (data: PuckPageData) => data.content.map((item) => item.type)

/**
 * Tela "Nova página" (`/admin/paginas/nova`): um modelo de página (fase 4), em branco ou cópia de
 * outra página. Segue o `vNewPage` do protótipo.
 */
export async function NewPageView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.newPage)
  const [pages, templates] = await Promise.all([
    loadPageRows(payload, user),
    payload.find({
      collection: 'templates',
      where: { kind: { equals: 'page' } },
      select: { key: true, name: true, description: true, pages: true },
      depth: 0,
      pagination: false,
      sort: 'order',
      overrideAccess: false,
      user,
    }),
  ])

  return (
    <PanelTemplate {...props}>
      <NewPageForm
        adminRoute={adminRoute}
        apiRoute={payload.config.routes.api}
        domain={new URL(getServerURL()).host}
        initialModel={
          typeof props.searchParams?.modelo === 'string' ? props.searchParams.modelo : null
        }
        models={templates.docs.flatMap((doc) => {
          const parsed = parsePageContent(doc.pages?.[0]?.content)
          if (!parsed.success) return []
          return [
            {
              id: doc.id,
              key: doc.key,
              title: doc.name,
              text: doc.description ?? '',
              sections: sectionTypes(parsed.data.data),
            },
          ]
        })}
        pages={pages
          .map(({ id, title, slug }) => ({ id, title, slug }))
          .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))}
      />
    </PanelTemplate>
  )
}
