import React from 'react'

import { getHeader, getMenuAnchors, getSite, resolveLink, siteLinks } from '@/lib/content'
import { telHref } from '@/lib/links'
import type { Header, Site } from '@/payload-types'

import { hasTopBar, SiteTopBarView, type TopBar } from './SiteTopBarView'

/** A linha de cima com o telefone e o horário das configurações e o link resolvido. */
export function topBarData(
  topBar: Header['topBar'] | null | undefined,
  site: Partial<Site>,
  resolve: (link: NonNullable<Header['topBar']>['link']) => string | null,
): TopBar {
  const phone = site.contact?.phone?.trim()
  const phoneHref = telHref(phone)
  const hours = site.contact?.hours?.trim()
  const label = topBar?.linkLabel?.trim()
  const href = label ? resolve(topBar?.link) : null
  return {
    phone: topBar?.phone && phone && phoneHref ? { label: phone, href: phoneHref } : null,
    hours: topBar?.hours && hours ? hours : null,
    link: label && href ? { label, href } : null,
  }
}

/** A linha de cima publicada; sem nada ligado, nada. */
export async function SiteTopBar() {
  const [site, header, pageAnchors] = await Promise.all([getSite(), getHeader(), getMenuAnchors()])
  const bar = topBarData(header.topBar, site, (link) =>
    resolveLink(link, { ...siteLinks(site), pageAnchors }),
  )
  return hasTopBar(bar) ? <SiteTopBarView bar={bar} /> : null
}
