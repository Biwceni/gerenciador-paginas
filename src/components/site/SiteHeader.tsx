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

import { headerShortcuts, logoLook, type MenuItem, siteBrand, SiteHeaderView } from './SiteChrome'

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
  const isCurrent = (link: (typeof header.items & object)[number]['link']) =>
    currentPageId != null && link?.kind === 'page' && relationID(link.page) === currentPageId
  return (header.items ?? []).flatMap((item, index): MenuItem[] => {
    const id = item.id ?? String(index)
    // Grupo (M1): fica no menu se ao menos um link de dentro está no ar.
    if (item.children?.length) {
      const children = item.children.flatMap((child, childIndex): MenuItem[] => {
        const href = resolveLink(child.link, links)
        return href
          ? [
              {
                id: child.id ?? `${id}-${childIndex}`,
                label: child.label,
                href,
                current: isCurrent(child.link),
              },
            ]
          : []
      })
      return children.length
        ? [{ id, label: item.label, href: '', current: children.some((c) => c.current), children }]
        : []
    }
    const href = resolveLink(item.link, links)
    if (!href) return []
    return [{ id, label: item.label, href, current: isCurrent(item.link) }]
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
  const href = label ? resolveLink(header.button?.link, { ...siteLinks(site), pageAnchors }) : null
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
      look={logoLook(site, populatedMedia(site.logoLight))}
      name={site.name || FALLBACK_SITE_NAME}
      shortcuts={headerShortcuts(site)}
    />
  )
}
