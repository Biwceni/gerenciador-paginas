import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { NOT_ARCHIVED, panelHref, PANEL_PATHS } from '@/lib/panel'
import { parsePageContent } from '@/puck/schema'

import { PanelTemplate, requireUser } from './PanelTemplate'
import { StartWizard, type StartTemplate } from './StartWizard'

/**
 * Início guiado (`/admin/comecar`, fase 4): tipo de site, ramo (no site da empresa), modelo com
 * prévia e o básico (nome, frase e WhatsApp). Segue o `vOnboarding` do protótipo, em tela cheia.
 * Abre sozinho quando o site não tem nenhuma página; com páginas, o administrador chega pelas
 * Configurações ("Começar de novo com um modelo"), e o nome, a frase e o WhatsApp já vêm
 * preenchidos com o que está lá.
 */
export async function StartView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.start)

  if (user.role !== 'admin') {
    return (
      <PanelTemplate {...props}>
        <div className="gp-page">
          <header className="gp-pagehead">
            <div>
              <h1>Começar com um modelo</h1>
              <p>Só quem administra o site pode montá-lo com um modelo.</p>
            </div>
          </header>
          <div>
            <Link className="gp-btn" href={panelHref(adminRoute, 'dashboard')}>
              Voltar para o painel
            </Link>
          </div>
        </div>
      </PanelTemplate>
    )
  }

  const access = { overrideAccess: false, user } as const
  const [templates, pages, live, site] = await Promise.all([
    payload.find({
      collection: 'templates',
      where: { kind: { equals: 'site' } },
      depth: 0,
      pagination: false,
      sort: 'order',
      ...access,
    }),
    // As arquivadas não contam: já estão guardadas e fora do ar.
    payload.count({ collection: 'pages', where: NOT_ARCHIVED, ...access }),
    payload.count({ collection: 'pages', where: { _status: { equals: 'published' } }, ...access }),
    // O rascunho mais recente, como a tela Configurações mostra.
    payload.findGlobal({ slug: 'site', depth: 0, draft: true, ...access }),
  ])

  const list: StartTemplate[] = templates.docs.flatMap((doc) => {
    const first = doc.pages?.[0]
    const parsed = first ? parsePageContent(first.content) : null
    if (!first || !parsed?.success || !doc.siteType) return []
    return [
      {
        id: doc.id,
        name: doc.name,
        description: doc.description ?? null,
        siteType: doc.siteType,
        segment: doc.segment ?? null,
        photos: doc.photos,
        forms: doc.forms,
        site: doc.site,
        header: doc.header,
        footer: doc.footer,
        home: { title: first.title, campaign: Boolean(first.campaign), data: parsed.data.data },
        pageTitles: (doc.pages ?? []).map((page) => page.title),
      },
    ]
  })

  return (
    <StartWizard
      adminRoute={adminRoute}
      apiRoute={payload.config.routes.api}
      existingPages={pages.totalDocs}
      initial={
        pages.totalDocs > 0
          ? {
              name: site.name ?? '',
              tagline: site.tagline ?? '',
              whatsapp: site.contact?.whatsapp ?? '',
            }
          : null
      }
      livePages={live.totalDocs}
      templates={list}
    />
  )
}
