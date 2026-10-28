import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { PANEL_PATHS } from '@/lib/panel'
import { getServerURL } from '@/lib/site'
import { parsePageContent, type PuckPageData } from '@/puck/schema'

import { loadPageRows } from './data'
import { type MiniBlock, NewPageForm } from './NewPageForm'
import { PanelTemplate, requireUser } from './PanelTemplate'

/** Desenho em blocos da página, para o cartão do modelo (como o `mini` do protótipo). */
function miniBlocks(data: PuckPageData): MiniBlock[] {
  return data.content.slice(0, 5).map((item) => {
    if (item.type === 'Hero') return 'hero'
    if (item.type === 'Features' || item.type === 'Gallery' || item.type === 'Columns')
      return 'cols'
    if (item.type === 'CallToAction') return 'cta'
    return 'l'
  })
}

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
      select: { name: true, description: true, pages: true },
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
        models={templates.docs.flatMap((doc) => {
          const parsed = parsePageContent(doc.pages?.[0]?.content)
          if (!parsed.success) return []
          return [
            {
              id: doc.id,
              title: doc.name,
              text: doc.description ?? '',
              mini: miniBlocks(parsed.data.data),
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
