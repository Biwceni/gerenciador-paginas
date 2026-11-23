import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { NOT_ARCHIVED, panelHref, PANEL_PATHS } from '@/lib/panel'
import { relationID } from '@/lib/relations'
import { cleanShows } from '@/lib/siteShows'
import { cityFromAddress } from '@/lib/templates'
import type { Media } from '@/payload-types'
import { parsePageContent } from '@/puck/schema'

import { PanelTemplate, requireUser } from './PanelTemplate'
import { type StartBrand, type StartPrevious, StartWizard, type StartTemplate } from './StartWizard'

/**
 * Início guiado (`/admin/comecar`, fase 4): tipo de site, o básico (nome, cidade, frase e
 * WhatsApp) e, no site da empresa, o que ele mostra e o visual (F1); nos outros tipos, o modelo
 * com prévia. No fim, Revisar, com o que sai do site anterior (A8). Em tela cheia.
 * Abre sozinho quando o site não tem nenhuma página; com páginas, o administrador chega pelas
 * Configurações ("Começar de novo com um modelo"), e o nome, a frase e o WhatsApp já vêm
 * preenchidos com o que está lá.
 */
export async function StartView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.start)

  if (user.role !== 'admin') {
    return (
      <PanelTemplate {...props}>
        <div className="gp-page" role="main">
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
    payload.findGlobal({ slug: 'site', depth: 1, draft: true, ...access }),
  ])

  const list: StartTemplate[] = templates.docs.flatMap((doc) => {
    const first = doc.pages?.[0]
    const parsed = first ? parsePageContent(first.content) : null
    if (!first || !parsed?.success || !doc.siteType) return []
    return [
      {
        id: doc.id,
        key: doc.key,
        name: doc.name,
        description: doc.description ?? null,
        siteType: doc.siteType,
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

  // A8: o que o site de hoje tem preenchido e pode sair do site novo.
  const logo = site.logo && typeof site.logo === 'object' ? (site.logo as Media) : null
  const contact = site.contact
  const unit = contact?.units?.[0]
  const previous: StartPrevious | null =
    pages.totalDocs > 0
      ? {
          logo: logo ? logo.alt?.trim() || logo.filename || 'O logo de hoje' : null,
          social: Object.values(site.social ?? {}).filter(
            (value): value is string => typeof value === 'string' && Boolean(value.trim()),
          ),
          contact:
            [unit?.address ?? contact?.address, unit?.phone ?? contact?.phone]
              .filter((value) => value?.trim())
              .join(' · ') || null,
          seo: site.seoDescription?.trim() || null,
        }
      : null
  const brand =
    relationID(site.logo) && site.colors?.primary && site.fonts
      ? { colors: site.colors as StartBrand['colors'], fonts: site.fonts }
      : null

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
              city: cityFromAddress(site.contact?.address),
            }
          : null
      }
      initialShows={cleanShows(site.start?.shows)}
      livePages={live.totalDocs}
      previous={previous}
      brand={brand}
      settingsDraft={site._status === 'draft'}
      templates={list}
    />
  )
}
