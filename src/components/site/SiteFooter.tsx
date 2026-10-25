import React from 'react'

import { getFooter, getSite } from '@/lib/content'
import { instagramLink, whatsAppURL } from '@/lib/links'
import { FALLBACK_SITE_NAME } from '@/lib/site'
import type { Site } from '@/payload-types'

import { getMenuItems } from './SiteHeader'
import { SiteLink } from './SiteLink'

const OTHER_SOCIAL: Record<Exclude<keyof NonNullable<Site['social']>, 'instagram'>, string> = {
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
}

export async function SiteFooter({ campaign }: { campaign?: boolean }) {
  const [site, footer] = await Promise.all([getSite(), getFooter()])
  const name = site.name || FALLBACK_SITE_NAME
  const year = new Date().getFullYear()
  const contact = site.contact
  const whatsapp = whatsAppURL(contact?.whatsapp)

  // Página de campanha: uma linha só, com o WhatsApp para quem quiser falar.
  if (campaign) {
    return (
      <footer className="site-footer site-footer--campaign">
        <div className="container site-footer__copy">
          <span>
            © {year} {name}
          </span>
          {whatsapp && <SiteLink href={whatsapp}>WhatsApp {contact?.whatsapp}</SiteLink>}
        </div>
      </footer>
    )
  }

  // Sem rodapé publicado, os três campos valem o padrão (ligados).
  const menu = footer.showMenu !== false ? await getMenuItems() : []
  const showContact = footer.showContact !== false
  const instagram = footer.showSocial !== false ? instagramLink(site.social?.instagram) : null
  const otherSocial =
    footer.showSocial !== false
      ? (Object.keys(OTHER_SOCIAL) as (keyof typeof OTHER_SOCIAL)[]).flatMap((key) => {
          const url = site.social?.[key]
          return url ? [{ key, label: OTHER_SOCIAL[key], url }] : []
        })
      : []
  const contactItems = showContact && (whatsapp || contact?.email || contact?.address)

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__cols">
          <div>
            <h2 className="site-footer__title">{name}</h2>
            {footer.text && <p>{footer.text}</p>}
          </div>

          {menu.length > 0 && (
            <nav aria-labelledby="rodape-paginas">
              <h2 className="site-footer__title" id="rodape-paginas">
                Páginas
              </h2>
              <ul>
                {menu.map((item) => (
                  <li key={item.id}>
                    <SiteLink href={item.href}>{item.label}</SiteLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {(contactItems || instagram || otherSocial.length > 0) && (
            <div>
              <h2 className="site-footer__title">Contato</h2>
              <address>
                <ul>
                  {showContact && whatsapp && (
                    <li>
                      <SiteLink href={whatsapp}>{contact?.whatsapp} (WhatsApp)</SiteLink>
                    </li>
                  )}
                  {showContact && contact?.email && (
                    <li>
                      <SiteLink href={`mailto:${contact.email}`}>{contact.email}</SiteLink>
                    </li>
                  )}
                  {showContact && contact?.address && (
                    <li className="site-footer__address">{contact.address}</li>
                  )}
                  {instagram && (
                    <li>
                      <SiteLink href={instagram.url}>Instagram {instagram.label}</SiteLink>
                    </li>
                  )}
                  {otherSocial.map((item) => (
                    <li key={item.key}>
                      <SiteLink href={item.url}>{item.label}</SiteLink>
                    </li>
                  ))}
                </ul>
              </address>
            </div>
          )}
        </div>

        <div className="site-footer__copy">
          <span>
            © {year} {name}
          </span>
          {contact?.hours && <span>{contact.hours}</span>}
        </div>
      </div>
    </footer>
  )
}
