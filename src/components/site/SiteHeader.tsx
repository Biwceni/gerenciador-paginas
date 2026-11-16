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

import { headerShortcuts, type MenuItem, siteBrand, SiteHeaderView } from './SiteChrome'

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

/** O botão de destaque do topo, com o destino resolvido; sem texto ou sem destino, nenhum. */
export async function getHeaderButton(
  draftSite?: Partial<Site>,
): Promise<{ label: string; href: string } | null> {
  const [site, header, pageAnchors] = await Promise.all([
    draftSite ?? getSite(),
    getHeader(),
    getMenuAnchors(),
  ])
  const label = header.button?.label?.trim()
  const href = label
    ? resolveLink(header.button?.link, { ...siteLinks(site), pageAnchors })
    : null
  return label && href ? { label, href } : null
}

/** Topo publicado. */
export async function SiteHeader({ currentPageId, campaign, site: draftSite }: Props) {
  const [site, items, button] = await Promise.all([
    draftSite ?? getSite(),
    getMenuItems(currentPageId, draftSite),
    getHeaderButton(draftSite),
  ])

  return (
    <SiteHeaderView
      brand={siteBrand(site)}
      button={button}
      campaign={campaign}
      items={items}
      logo={populatedMedia(site.logo)}
      logoRing={Boolean(site.logoRing?.header)}
      name={site.name || FALLBACK_SITE_NAME}
      shortcuts={headerShortcuts(site)}
    />
  )
}
