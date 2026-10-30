import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { footerContact, footerSocial } from '@/components/site/SiteChrome'
import { themeStyle } from '@/components/site/theme'
import { populatedMedia, siteLinks } from '@/lib/content'
import { NOT_ARCHIVED, PANEL_PATHS } from '@/lib/panel'
import { FALLBACK_SITE_NAME } from '@/lib/site'
import { pageSummary } from '@/puck/summary'

import { MenuEditor } from './MenuEditor'
import { PanelTemplate, requireUser } from './PanelTemplate'

/**
 * Tela "Menu e rodapé" (`/admin/menu-e-rodape`): os links do topo, o botão de destaque e o rodapé,
 * com prévia e publicação própria. Segue o `vHeaderFooter` do protótipo.
 */
export async function MenuView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.menu)
  const access = { overrideAccess: false, user } as const
  const [header, footer, latest, live, site] = await Promise.all([
    payload.findGlobal({ slug: 'header', depth: 0, draft: true, ...access }),
    payload.findGlobal({ slug: 'footer', depth: 0, draft: true, ...access }),
    // Destinos dos links: as páginas arquivadas ficam de fora.
    payload.find({
      collection: 'pages',
      where: NOT_ARCHIVED,
      select: { title: true, slug: true, content: true },
      depth: 0,
      draft: true,
      limit: 500,
      pagination: false,
      sort: 'title',
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
    payload.findGlobal({ slug: 'site', depth: 1, draft: false, ...access }),
  ])
  const liveIds = new Set(live.docs.map((doc) => doc.id))

  return (
    <PanelTemplate {...props}>
      <MenuEditor
        adminRoute={adminRoute}
        apiRoute={payload.config.routes.api}
        initial={{
          header: { items: header.items ?? [], button: header.button ?? {} },
          footer: {
            text: footer.text ?? '',
            showMenu: footer.showMenu !== false,
            showContact: footer.showContact !== false,
            showSocial: footer.showSocial !== false,
          },
          pending: header._status === 'draft' || footer._status === 'draft',
        }}
        pages={latest.docs.map((doc) => pageSummary(doc, liveIds.has(doc.id)))}
        site={{
          name: site.name || FALLBACK_SITE_NAME,
          logo: populatedMedia(site.logo),
          contact: footerContact(site),
          social: footerSocial(site),
          whatsappHref: siteLinks(site).whatsappHref,
          theme: themeStyle(site) as Record<string, string>,
          fontFaces: site.fontFaces ?? null,
        }}
      />
    </PanelTemplate>
  )
}
