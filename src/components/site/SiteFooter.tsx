import React from 'react'

import { getFooter, getSite } from '@/lib/content'
import { FALLBACK_SITE_NAME } from '@/lib/site'

import { footerContact, footerSocial, SiteFooterView } from './SiteChrome'
import { getMenuItems } from './SiteHeader'

/** Rodapé publicado. Sem rodapé publicado, as três opções valem o padrão (ligadas). */
export async function SiteFooter({ campaign }: { campaign?: boolean }) {
  const [site, footer] = await Promise.all([getSite(), getFooter()])

  return (
    <SiteFooterView
      campaign={campaign}
      contact={footerContact(site)}
      menu={!campaign && footer.showMenu !== false ? await getMenuItems() : []}
      name={site.name || FALLBACK_SITE_NAME}
      showContact={footer.showContact !== false}
      social={footer.showSocial !== false ? footerSocial(site) : []}
      text={footer.text ?? null}
    />
  )
}
