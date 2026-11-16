import React from 'react'

import { getFooter, getSite, populatedMedia, privacyHref } from '@/lib/content'
import { FALLBACK_SITE_NAME } from '@/lib/site'
import type { Site } from '@/payload-types'

import {
  DEFAULT_CTA_TITLE,
  footerContact,
  footerSocial,
  siteBrand,
  SiteFooterView,
} from './SiteChrome'
import { getHeaderButton, getMenuItems } from './SiteHeader'

/**
 * Rodapé publicado, com a chamada antes dele. Sem rodapé publicado, as opções valem o padrão
 * (ligadas). `site` é o
 * rascunho das configurações, nas prévias do painel.
 */
export async function SiteFooter({
  campaign,
  site: draftSite,
}: {
  campaign?: boolean
  site?: Partial<Site>
}) {
  const [site, footer, button] = await Promise.all([
    draftSite ?? getSite(),
    getFooter(),
    campaign ? null : getHeaderButton(draftSite),
  ])
  // A chamada do fim usa o botão de destaque do topo: sem botão, não há chamada.
  const cta =
    button && footer.cta?.show !== false
      ? { title: footer.cta?.title?.trim() || DEFAULT_CTA_TITLE, button }
      : null

  return (
    <SiteFooterView
      backToTop={footer.showBackToTop !== false}
      brand={siteBrand(site)}
      campaign={campaign}
      cta={cta}
      logo={populatedMedia(site.logo)}
      logoRing={Boolean(site.logoRing?.footer)}
      contact={footerContact(site)}
      menu={!campaign && footer.showMenu !== false ? await getMenuItems(null, draftSite) : []}
      name={site.name || FALLBACK_SITE_NAME}
      privacyHref={privacyHref(site)}
      showContact={footer.showContact !== false}
      showHours={footer.showHours !== false}
      social={footer.showSocial !== false ? footerSocial(site) : []}
      text={footer.text ?? null}
    />
  )
}
