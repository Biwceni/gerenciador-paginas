import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { footerSocial } from '@/components/site/SiteChrome'
import { getMenuItems } from '@/components/site/SiteHeader'
import { getMenuAnchors, privacyHref, resolveLink, siteInfo, siteLinks } from '@/lib/content'
import { guessBusiness } from '@/lib/fontPairs'
import { toFormDefinition } from '@/lib/forms'
import { NOT_ARCHIVED, PANEL_PATHS } from '@/lib/panel'
import { relationID } from '@/lib/relations'
import { collectReferences } from '@/puck/references'
import { parsePageContent } from '@/puck/schema'

import { type BrandHome, BrandEditor } from './BrandEditor'
import { PanelTemplate, requireUser } from './PanelTemplate'
import { toSettingsState } from './settings'

/**
 * Tela "Sua marca" (`/admin/sua-marca`, redesign v3): logo, cores, letras, jeito e animação do site,
 * com a página inicial de verdade em miniatura. Usa o mesmo rascunho das Configurações (global
 * `site`) e o mesmo "Publicar".
 */
export async function BrandView(props: AdminViewServerProps) {
  const { payload, user } = requireUser(props, PANEL_PATHS.brand)
  const access = { overrideAccess: false, user } as const
  const [site, photos, header, footer, pages, templates, pageAnchors] = await Promise.all([
    // O rascunho mais recente: a tela abre com as mudanças ainda fora do ar.
    payload.findGlobal({ slug: 'site', depth: 0, draft: true, ...access }),
    payload.find({
      collection: 'media',
      depth: 0,
      limit: 1000,
      pagination: false,
      sort: '-createdAt',
      ...access,
    }),
    payload.findGlobal({ slug: 'header', depth: 0, draft: true, ...access }),
    payload.findGlobal({ slug: 'footer', depth: 0, draft: true, ...access }),
    payload.find({
      collection: 'pages',
      where: NOT_ARCHIVED,
      select: { slug: true },
      depth: 0,
      draft: true,
      limit: 500,
      pagination: false,
      ...access,
    }),
    payload.find({
      collection: 'templates',
      where: { kind: { equals: 'site' } },
      select: { key: true, siteType: true, site: true, pages: true },
      depth: 0,
      pagination: false,
      ...access,
    }),
    getMenuAnchors(),
  ])

  // A página inicial como está no rascunho: a prévia mostra o site de verdade.
  const homeId = relationID(site.homepage)
  const homeDoc = homeId
    ? await payload.findByID({
        collection: 'pages',
        id: homeId,
        select: { title: true, content: true, campaign: true },
        depth: 0,
        draft: true,
        disableErrors: true,
        ...access,
      })
    : null
  const parsed = homeDoc ? parsePageContent(homeDoc.content) : null
  const homeData = parsed?.success ? parsed.data.data : null
  const formIds = homeData ? collectReferences(homeData).formIds : []
  const forms = formIds.length
    ? await payload.find({
        collection: 'forms',
        where: { id: { in: formIds } },
        depth: 0,
        limit: formIds.length,
        pagination: false,
        ...access,
      })
    : null

  const links = { ...siteLinks(site), pageAnchors }
  const menu = await getMenuItems(homeId, site)
  const buttonHref = header.button?.label ? resolveLink(header.button.link, links) : null
  const home: BrandHome | null =
    homeDoc && homeData
      ? {
          id: homeDoc.id,
          data: homeData,
          campaign: Boolean(homeDoc.campaign),
          forms: Object.fromEntries(
            (forms?.docs ?? []).map((doc) => [doc.id, toFormDefinition(doc)]),
          ),
          info: siteInfo(site),
          whatsappHref: links.whatsappHref,
        }
      : null

  return (
    <PanelTemplate {...props}>
      <BrandEditor
        apiRoute={payload.config.routes.api}
        business={guessBusiness(
          site,
          pages.docs.map((page) => page.slug ?? ''),
          templates.docs,
        )}
        chrome={{
          items: menu,
          button: buttonHref ? { label: header.button?.label ?? '', href: buttonHref } : null,
          footerMenu: footer.showMenu !== false ? menu : [],
          footerText: footer.text ?? null,
          showContact: footer.showContact !== false,
          social: footer.showSocial !== false ? footerSocial(site) : [],
          privacyHref: privacyHref(site),
        }}
        fontFaces={site.fontFaces ?? null}
        home={home}
        initial={toSettingsState(site)}
        pending={site._status === 'draft'}
        photos={photos.docs}
      />
    </PanelTemplate>
  )
}
