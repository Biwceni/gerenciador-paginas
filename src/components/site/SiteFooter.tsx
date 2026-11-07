import React from 'react'

import { getFooter, getSite, populatedMedia, privacyHref } from '@/lib/content'
import { FALLBACK_SITE_NAME } from '@/lib/site'
import type { Site } from '@/payload-types'

import { footerContact, footerSocial, siteBrand, SiteFooterView } from './SiteChrome'
import { getMenuItems } from './SiteHeader'

/**
 * Rodapé publicado. Sem rodapé publicado, as três opções valem o padrão (ligadas). `site` é o
 * rascunho das configurações, nas prévias do painel.
 */
export async function SiteFooter({
  campaign,
  site: draftSite,
}: {
  campaign?: boolean
  site?: Partial<Site>
}) {
  const [site, footer] = await Promise.all([draftSite ?? getSite(), getFooter()])

  return (
    <SiteFooterView
      brand={siteBrand(site)}
      campaign={campaign}
      logo={populatedMedia(site.logo)}
      contact={footerContact(site)}
      menu={!campaign && footer.showMenu !== false ? await getMenuItems(null, draftSite) : []}
      name={site.name || FALLBACK_SITE_NAME}
      privacyHref={privacyHref(site)}
      showContact={footer.showContact !== false}
      social={footer.showSocial !== false ? footerSocial(site) : []}
      text={footer.text ?? null}
    />
  )
}
