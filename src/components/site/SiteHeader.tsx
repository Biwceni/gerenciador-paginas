import Link from 'next/link'
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
import { FALLBACK_SITE_NAME, initials } from '@/lib/site'

import { HeaderMenu } from './HeaderMenu'
import { Photo } from './Photo'
import { SiteLink } from './SiteLink'

export type MenuItem = { id: string; label: string; href: string; current: boolean }

/** Itens do menu que levam a algo no ar (os outros somem), marcando a página atual. */
export async function getMenuItems(currentPageId?: number | null): Promise<MenuItem[]> {
  const [site, header, pageAnchors] = await Promise.all([getSite(), getHeader(), getMenuAnchors()])
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
}

export async function SiteHeader({ currentPageId, campaign }: Props) {
  const [site, header, items, pageAnchors] = await Promise.all([
    getSite(),
    getHeader(),
    getMenuItems(currentPageId),
    getMenuAnchors(),
  ])
  const name = site.name || FALLBACK_SITE_NAME
  const logo = populatedMedia(site.logo)
  const buttonHref = header.button?.label
    ? resolveLink(header.button.link, { ...siteLinks(site), pageAnchors })
    : null
  const hasNav = !campaign && (items.length > 0 || buttonHref)

  const navContent = (
    <>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <SiteLink aria-current={item.current ? 'page' : undefined} href={item.href}>
              {item.label}
            </SiteLink>
          </li>
        ))}
      </ul>
      {buttonHref && (
        <SiteLink className="button" href={buttonHref}>
          {header.button?.label}
        </SiteLink>
      )}
    </>
  )

  return (
    <header className="site-header">
      <div className="container site-header__bar">
        <Link className="site-header__brand" href="/">
          {logo ? (
            <Photo className="site-header__logo" media={logo} sizes="160px" />
          ) : (
            <span aria-hidden="true" className="site-header__initials">
              {initials(name)}
            </span>
          )}
          <span>{name}</span>
        </Link>
        {hasNav && (
          <>
            <nav aria-label="Menu principal" className="site-header__nav">
              {navContent}
            </nav>
            <HeaderMenu>{navContent}</HeaderMenu>
          </>
        )}
      </div>
    </header>
  )
}
