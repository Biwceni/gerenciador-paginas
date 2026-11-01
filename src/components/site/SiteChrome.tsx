import Link from 'next/link'
import React from 'react'

import { instagramLink, whatsAppURL } from '@/lib/links'
import { initials } from '@/lib/site'
import type { Media, Site } from '@/payload-types'

import { HeaderMenu } from './HeaderMenu'
import { Photo } from './Photo'
import { SiteLink } from './SiteLink'

// Desenho do topo e do rodapé, só a partir dos dados. O site passa o que está publicado
// (`SiteHeader`, `SiteFooter`); a tela "Menu e rodapé" do painel passa o rascunho, na prévia.

export type MenuItem = { id: string; label: string; href: string; current: boolean }

type HeaderProps = {
  name: string
  logo: Media | null
  items: MenuItem[]
  button: { label: string; href: string } | null
  /** Página de campanha: só a marca, sem menu, para o visitante não sair da página. */
  campaign?: boolean
}

export function SiteHeaderView({ name, logo, items, button, campaign }: HeaderProps) {
  const hasNav = !campaign && (items.length > 0 || button)

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
      {button && (
        <SiteLink className="button" href={button.href}>
          {button.label}
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

export type FooterContact = {
  whatsapp: string | null
  whatsappHref: string | null
  email: string | null
  address: string | null
  hours: string | null
}

export type FooterSocial = { key: string; label: string; url: string }

export function footerContact(site: Partial<Site>): FooterContact {
  const contact = site.contact
  return {
    whatsapp: contact?.whatsapp ?? null,
    whatsappHref: whatsAppURL(contact?.whatsapp),
    email: contact?.email ?? null,
    address: contact?.address ?? null,
    hours: contact?.hours ?? null,
  }
}

const OTHER_SOCIAL: Record<Exclude<keyof NonNullable<Site['social']>, 'instagram'>, string> = {
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
}

/** Redes das configurações, com o Instagram primeiro ("Instagram @perfil"). */
export function footerSocial(site: Partial<Site>): FooterSocial[] {
  const instagram = instagramLink(site.social?.instagram)
  const others = (Object.keys(OTHER_SOCIAL) as (keyof typeof OTHER_SOCIAL)[]).flatMap((key) => {
    const url = site.social?.[key]
    return url ? [{ key, label: OTHER_SOCIAL[key], url }] : []
  })
  return [
    ...(instagram
      ? [{ key: 'instagram', label: `Instagram ${instagram.label}`, url: instagram.url }]
      : []),
    ...others,
  ]
}

type FooterProps = {
  name: string
  text: string | null
  /** Links do menu repetidos no rodapé (vazio quando a opção está desligada). */
  menu: MenuItem[]
  contact: FooterContact
  showContact: boolean
  social: FooterSocial[]
  campaign?: boolean
  /** Página de privacidade, só quando está no ar. */
  privacyHref?: string | null
}

export function SiteFooterView({
  name,
  text,
  menu,
  contact,
  showContact,
  social,
  campaign,
  privacyHref,
}: FooterProps) {
  const year = new Date().getFullYear()
  const privacy = privacyHref && (
    <>
      {' · '}
      <SiteLink className="site-footer__privacy" href={privacyHref}>
        Privacidade
      </SiteLink>
    </>
  )

  // Página de campanha: uma linha só, com o WhatsApp para quem quiser falar.
  if (campaign) {
    return (
      <footer className="site-footer site-footer--campaign">
        <div className="container site-footer__copy">
          <span>
            © {year} {name}
            {privacy}
          </span>
          {contact.whatsappHref && (
            <SiteLink href={contact.whatsappHref}>WhatsApp {contact.whatsapp}</SiteLink>
          )}
        </div>
      </footer>
    )
  }

  const contactItems = showContact && (contact.whatsappHref || contact.email || contact.address)

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__cols">
          <div>
            <h2 className="site-footer__title">{name}</h2>
            {text && <p>{text}</p>}
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

          {(contactItems || social.length > 0) && (
            <div>
              <h2 className="site-footer__title">Contato</h2>
              <address>
                <ul>
                  {showContact && contact.whatsappHref && (
                    <li>
                      <SiteLink href={contact.whatsappHref}>{contact.whatsapp} (WhatsApp)</SiteLink>
                    </li>
                  )}
                  {showContact && contact.email && (
                    <li>
                      <SiteLink href={`mailto:${contact.email}`}>{contact.email}</SiteLink>
                    </li>
                  )}
                  {showContact && contact.address && (
                    <li className="site-footer__address">{contact.address}</li>
                  )}
                  {social.map((item) => (
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
            {privacy}
          </span>
          {contact.hours && <span>{contact.hours}</span>}
        </div>
      </div>
    </footer>
  )
}
