import React from 'react'

import {
  getHeader,
  getMenuAnchors,
  getSite,
  populatedMedia,
  relationID,
  resolveLink,
  siteLinks,
} from '@/lib/content'
import { FALLBACK_SITE_NAME } from '@/lib/site'
import type { Site } from '@/payload-types'

import { type MenuItem, SiteHeaderView } from './SiteChrome'

export type { MenuItem }

/** Itens do menu que levam a algo no ar (os outros somem), marcando a página atual. */
export async function getMenuItems(
  currentPageId?: number | null,
  draftSite?: Partial<Site>,
): Promise<MenuItem[]> {
  const [site, header, pageAnchors] = await Promise.all([
    draftSite ?? getSite(),
    getHeader(),
    getMenuAnchors(),
  ])
  const links = { ...siteLinks(site), pageAnchors }
  return (header.items ?? []).flatMap((item, index) => {
    const href = resolveLink(item.link, links)
    if (!href) return []
    const current =
      currentPageId != null &&
      item.link?.kind === 'page' &&
      relationID(item.link.page) === currentPageId
    return [{ id: item.id ?? String(index), label: item.label, href, current }]
  })
}

type Props = {
  /** Página aberta, para marcar o item dela no menu. */
  currentPageId?: number | null
  /** Página de campanha: só a marca, sem menu, para o visitante não sair da página. */
  campaign?: boolean
  /** Rascunho das configurações, nas prévias do painel. Sem ele, vale o publicado. */
  site?: Partial<Site>
}

/** Topo publicado. */
export async function SiteHeader({ currentPageId, campaign, site: draftSite }: Props) {
  const [site, header, items, pageAnchors] = await Promise.all([
    draftSite ?? getSite(),
    getHeader(),
    getMenuItems(currentPageId, draftSite),
    getMenuAnchors(),
  ])
  const buttonHref = header.button?.label
    ? resolveLink(header.button.link, { ...siteLinks(site), pageAnchors })
    : null

  return (
    <SiteHeaderView
      button={buttonHref ? { label: header.button?.label ?? '', href: buttonHref } : null}
      campaign={campaign}
      items={items}
      logo={populatedMedia(site.logo)}
      name={site.name || FALLBACK_SITE_NAME}
    />
  )
}
