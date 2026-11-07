import Link from 'next/link'
import React from 'react'

import { instagramLink, mapsURL, whatsAppURL } from '@/lib/links'
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

/** O destino do botão tem um ícone que diz o que ele faz (WhatsApp, telefone, e-mail). */
export function hasCtaIcon(href: string): boolean {
  return href.startsWith('https://wa.me/') || href.startsWith('tel:') || href.startsWith('mailto:')
}

/**
 * Como o botão de destaque aparece no topo do celular, decidido já no servidor (assim o topo não
 * muda de tamanho depois que a página carrega): com o texto, se ele e o nome do site cabem; só com
 * o ícone, se o destino tem um; senão, só dentro do ☰. Nunca uma seta sem texto. O logo (38 px e
 * o espaço até o nome) ocupa o lugar de umas 6 letras.
 */
export function mobileCtaMode(
  name: string,
  button: { label: string; href: string },
  hasLogo = false,
) {
  const label = button.label.trim()
  const room = hasLogo ? 24 : 30
  if (label.length <= 12 && name.length + label.length <= room) return 'text'
  return hasCtaIcon(button.href) ? 'icon' : 'menu'
}

/** Ícone do destino do botão de destaque, para a versão só com o ícone do topo compacto. */
function CtaIcon({ href }: { href: string }) {
  if (!hasCtaIcon(href)) return null
  const path = href.startsWith('https://wa.me/') ? (
    <>
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8z" />
      <path d="M9 9.5c.3 2.3 2.2 4.2 4.5 4.5l1-1.2 2 .9c-.3 1-1.2 1.6-2.2 1.5-3.3-.3-6-3-6.3-6.3-.1-1 .5-1.9 1.5-2.2l.9 2z" />
    </>
  ) : href.startsWith('tel:') ? (
    <path d="M5 3h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 5.3 5.3l1.4-2.2L19 13.5V17a2 2 0 0 1-2 2A15 15 0 0 1 3 5a2 2 0 0 1 2-2z" />
  ) : (
    <>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="M3.5 6.5L12 13l8.5-6.5" />
    </>
  )
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="20"
    >
      {path}
    </svg>
  )
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
    <header
      className="site-header"
      data-cta={button && hasNav ? mobileCtaMode(name, button, Boolean(logo)) : undefined}
    >
      <div className="container site-header__bar">
        <Link className="site-header__brand" href="/">
          {logo && <Photo className="site-header__logo" media={logo} sizes="160px" />}
          <span>{name}</span>
        </Link>
        {hasNav && (
          <>
            <nav aria-label="Menu principal" className="site-header__nav">
              {navContent}
            </nav>
            {/* Com o ☰: o botão de destaque continua à vista, compacto, ao lado dele. */}
            {button && (
              <SiteLink
                aria-label={button.label}
                className="button site-header__cta"
                href={button.href}
              >
                <CtaIcon href={button.href} />
                <span className="site-header__cta-text">{button.label}</span>
              </SiteLink>
            )}
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
                  {/* O endereço abre o mapa, como na seção Contato e endereço. */}
                  {showContact && contact.address && (
                    <li>
                      <SiteLink className="site-footer__address" href={mapsURL(contact.address)}>
                        {contact.address}
                      </SiteLink>
                    </li>
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
