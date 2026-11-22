import Link from 'next/link'
import React from 'react'

import { readableTextColor, safeColor } from '@/lib/colors'
import { shortTagline } from '@/lib/highlight'
import { instagramLink, mapsURL, telHref, whatsAppURL } from '@/lib/links'
import { ContactIcon } from '@/puck/components/FeatureIcon'
import { DEFAULT_COLORS, type Personality } from '@/lib/theme'
import type { Media, Site } from '@/payload-types'

import { HeaderGroup } from './HeaderGroup'
import { HeaderMenu } from './HeaderMenu'
import { HeaderWatch } from './HeaderWatch'
import { Photo } from './Photo'
import { SiteLink } from './SiteLink'
import { SOCIAL_NAMES, SocialIcon } from './SocialIcon'
import { sitePersonality } from './theme'

// Desenho do topo e do rodapé, só a partir dos dados. O site passa o que está publicado
// (`SiteHeader`, `SiteFooter`); a tela "Menu e rodapé" do painel passa o rascunho, na prévia.

/** Link do menu. Um grupo (M1) tem `children` e não leva a lugar nenhum (`href` vazio). */
export type MenuItem = {
  id: string
  label: string
  href: string
  current: boolean
  children?: MenuItem[]
}

/** Coluna de links própria do rodapé (M1). */
export type FooterColumn = { id: string; title: string; links: MenuItem[] }

/**
 * O que muda no topo e no rodapé com a personalidade (redesign v3). No Clássico, nada: o topo e o
 * rodapé ficam como antes. Nas outras, o logo cresce (redondo, quando é quadrado ou em pé), a frase
 * de apresentação curta vai embaixo do nome e o logo aparece também no rodapé.
 */
export type SiteBrand = { personality: Personality; tagline: string | null }

export function siteBrand(site: Partial<Site>): SiteBrand {
  return { personality: sitePersonality(site), tagline: shortTagline(site.tagline) }
}

/** Logo quadrado ou em pé: fica redondo (o deitado, com o nome escrito, fica inteiro). */
export function isRoundLogo(logo: Media): boolean {
  return Boolean(logo.width && logo.height && logo.width <= logo.height * 1.15)
}

const isBranded = (brand: SiteBrand | undefined): brand is SiteBrand =>
  Boolean(brand && brand.personality !== 'classico')

/** O logo sobre fundo escuro, sem a versão clara (E2): como está, branco ou com uma placa branca. */
export type LogoOnDark = 'auto' | 'white' | 'plate'

/**
 * Como o logo aparece (A3, E2): só o logo no topo ou com o nome ao lado, a versão clara e o que
 * fazer sobre fundo escuro. `darkBar` e `darkFooter` dizem se o topo e o rodapé são escuros (a cor
 * das letras deles é a branca); o topo por cima da foto do banner também conta como escuro (CSS).
 */
export type LogoLook = {
  showName: boolean
  light: Media | null
  onDark: LogoOnDark
  darkBar: boolean
  darkFooter: boolean
}

const isDark = (color: string) => readableTextColor(color) === '#ffffff'

export function logoLook(
  site: Pick<Partial<Site>, 'showNameWithLogo' | 'logoOnDark' | 'colors'>,
  light: Media | null,
): LogoLook {
  return {
    showName: site.showNameWithLogo === true,
    light,
    onDark: site.logoOnDark === 'white' || site.logoOnDark === 'plate' ? site.logoOnDark : 'auto',
    darkBar: isDark(safeColor(site.colors?.background, DEFAULT_COLORS.background)),
    darkFooter: isDark(safeColor(site.colors?.footer, DEFAULT_COLORS.footer)),
  }
}

/** Atributos da marca para o CSS: versão clara presente e o tratamento sobre fundo escuro. */
function logoData(look: LogoLook | undefined) {
  return {
    'data-light': look?.light ? '' : undefined,
    'data-on-dark': look && !look.light && look.onDark !== 'auto' ? look.onDark : undefined,
  }
}

/** O contorno do T6 só vale quando a pessoa não escolheu outro jeito para o fundo escuro. */
const ringAllowed = (look: LogoLook | undefined) => !look || (!look.light && look.onDark === 'auto')

/**
 * Atalhos do menu do celular (T3), embaixo dos links: WhatsApp e Instagram, endereço e horário. Vêm
 * das Configurações; o que estiver vazio não aparece.
 */
export type HeaderShortcuts = {
  whatsappHref: string | null
  instagram: { url: string; label: string } | null
  address: string | null
  hours: string | null
}

export function headerShortcuts(site: Partial<Site>): HeaderShortcuts {
  return {
    whatsappHref: whatsAppURL(site.contact?.whatsapp),
    instagram: instagramLink(site.social?.instagram),
    address: site.contact?.address?.trim() || null,
    hours: site.contact?.hours?.trim() || null,
  }
}

type HeaderProps = {
  name: string
  logo: Media | null
  items: MenuItem[]
  button: { label: string; href: string } | null
  /** Página de campanha: só a marca, sem menu, para o visitante não sair da página. */
  campaign?: boolean
  brand?: SiteBrand
  shortcuts?: HeaderShortcuts
  /** Logo que some no fundo do topo ganha um contorno (T6, calculado em Sua marca). */
  logoRing?: boolean
  /** Só o logo ou com o nome, versão clara e fundo escuro (A3, E2). Sem ele, como antes. */
  look?: LogoLook
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
  logoOnly = false,
) {
  const label = button.label.trim()
  const room = hasLogo ? 24 : 30
  // Só o logo (até 160 px no celular): ocupa o lugar de umas 12 letras, e o nome não aparece.
  const used = logoOnly ? 12 : name.length
  if (label.length <= 12 && used + label.length <= room + (logoOnly ? 6 : 0)) return 'text'
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

export function SiteHeaderView({
  name,
  logo,
  items,
  button,
  campaign,
  brand,
  shortcuts,
  logoRing,
  look,
}: HeaderProps) {
  const hasNav = !campaign && (items.length > 0 || button)
  const branded = isBranded(brand)
  // A3: com logo, o topo mostra só o logo, a não ser que a pessoa peça o nome ao lado.
  const logoOnly = Boolean(logo && look && !look.showName)
  const tagline = branded && !logoOnly ? brand.tagline : null
  const brandClass = [
    'site-header__brand',
    tagline && 'site-header__brand--tagline',
    tagline && logo && 'site-header__brand--logo',
    logoOnly && 'site-header__brand--only',
  ]
  const round = branded && logo && isRoundLogo(logo)
  const light = look?.light ?? null

  const links = (
    <ul>
      {items.map((item) =>
        item.children?.length ? (
          <HeaderGroup item={item} key={item.id} />
        ) : (
          <li key={item.id}>
            <SiteLink aria-current={item.current ? 'page' : undefined} href={item.href}>
              {item.label}
            </SiteLink>
          </li>
        ),
      )}
    </ul>
  )
  const mainButton = button && (
    <SiteLink className="button" href={button.href}>
      {button.label}
    </SiteLink>
  )
  const quick = shortcuts && (shortcuts.whatsappHref || shortcuts.instagram)
  const info = shortcuts && (shortcuts.address || shortcuts.hours)
  // Menu do celular em tela cheia (T3): os links, os atalhos de contato e, no fim, ao alcance do
  // polegar, o botão de destaque.
  const mobileContent = (
    <>
      {links}
      {quick && (
        <div className="site-header__quick">
          {shortcuts.whatsappHref && (
            <SiteLink href={shortcuts.whatsappHref}>
              <ContactIcon name="whatsapp" />
              <span>WhatsApp</span>
            </SiteLink>
          )}
          {shortcuts.instagram && (
            <SiteLink href={shortcuts.instagram.url}>
              <SocialIcon name="instagram" />
              <span>{shortcuts.instagram.label}</span>
            </SiteLink>
          )}
        </div>
      )}
      {info && (
        <div className="site-header__info">
          {shortcuts.address && (
            <SiteLink href={mapsURL(shortcuts.address)}>
              <ContactIcon name="map" />
              <span>{shortcuts.address}</span>
            </SiteLink>
          )}
          {shortcuts.hours && (
            <p>
              <ContactIcon name="clock" />
              <span>{shortcuts.hours}</span>
            </p>
          )}
        </div>
      )}
      {mainButton}
    </>
  )

  return (
    <header
      className={['site-header', look?.darkBar && 'site-header--dark'].filter(Boolean).join(' ')}
      data-cta={button && hasNav ? mobileCtaMode(name, button, Boolean(logo), logoOnly) : undefined}
    >
      <div className="container site-header__bar">
        <Link className={brandClass.filter(Boolean).join(' ')} href="/" {...logoData(look)}>
          {logo && (
            <Photo
              className={[
                'site-header__logo',
                round && 'site-header__logo--round',
                logoRing && ringAllowed(look) && 'site-header__logo--ring',
              ]
                .filter(Boolean)
                .join(' ')}
              media={logo}
              sizes="200px"
            />
          )}
          {logo && light && (
            <Photo
              className={[
                'site-header__logo',
                'site-header__logo--light',
                round && 'site-header__logo--round',
              ]
                .filter(Boolean)
                .join(' ')}
              media={light}
              sizes="200px"
            />
          )}
          {/* Só o logo: o nome continua no link, para o leitor de tela. */}
          <span className={logoOnly ? 'visually-hidden' : undefined}>{name}</span>
          {tagline && <small className="site-header__tagline">{tagline}</small>}
        </Link>
        {hasNav && (
          <>
            <nav aria-label="Menu principal" className="site-header__nav">
              {links}
              {mainButton}
            </nav>
            {/*
             * Com o ☰ (ou com os links numa segunda linha, no computador): o botão de destaque
             * continua à vista, ao lado do nome.
             */}
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
            <HeaderMenu>{mobileContent}</HeaderMenu>
          </>
        )}
        <HeaderWatch />
      </div>
    </header>
  )
}

export type FooterContact = {
  whatsapp: string | null
  whatsappHref: string | null
  phone: string | null
  phoneHref: string | null
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
    phone: contact?.phone ?? null,
    phoneHref: telHref(contact?.phone),
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

/** Título da chamada antes do rodapé quando o rodapé ainda não tem um (sites de antes do R6). */
export const DEFAULT_CTA_TITLE = 'Vamos conversar?'

/** Páginas no rodapé em duas colunas a partir deste número (R1). */
const TWO_COLUMN_PAGES = 6

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
  /** Logo do site, na coluna da marca. */
  logo?: Media | null
  brand?: SiteBrand
  /** Chamada no fim do site (R1, R6): o título e o botão de destaque do topo. */
  cta?: { title: string; button: { label: string; href: string } } | null
  /** Coluna "Horário" (R3). */
  showHours?: boolean
  /** "Voltar ao topo" na barra de baixo. */
  backToTop?: boolean
  /** Logo que some no fundo do rodapé ganha um contorno (T6). */
  logoRing?: boolean
  /** Versão clara e fundo escuro do logo (E2). */
  look?: LogoLook
  /** Colunas de links próprias do rodapé (M1), depois de "Páginas". */
  columns?: FooterColumn[]
  /** Razão social, CNPJ e responsável técnico (D3), numa linha no fim. */
  company?: string[]
}

function FooterItem({
  href,
  icon,
  label,
  children,
  className,
}: {
  href: string
  icon: React.ComponentProps<typeof ContactIcon>['name']
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <li>
      <SiteLink className={['site-footer__item', className].filter(Boolean).join(' ')} href={href}>
        <ContactIcon name={icon} />
        <span>
          <small>{label}</small>
          <span className="site-footer__value">{children}</span>
        </span>
      </SiteLink>
    </li>
  )
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
  logo,
  cta,
  showHours = true,
  backToTop = true,
  logoRing,
  look,
  columns = [],
  company = [],
}: FooterProps) {
  const year = new Date().getFullYear()
  // No rodapé, um grupo do menu (M1) vira os links de dentro dele, sem repetir o mesmo endereço
  // (dois grupos com a mesma página dariam o link duas vezes).
  const pages = menu
    .flatMap((item) => (item.children?.length ? item.children : [item]))
    .filter((item, index, all) => all.findIndex((other) => other.href === item.href) === index)
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

  const contactItems =
    showContact && (contact.whatsappHref || contact.phoneHref || contact.email || contact.address)
  const hours = showHours ? contact.hours?.trim() || null : null
  // Rodapé escuro com versão clara do logo (E2): ela entra no lugar. Sem ela, o tratamento escolhido.
  const darkFooter = Boolean(look?.darkFooter)
  const footerLogo = logo && darkFooter && look?.light ? look.light : logo
  const onDark = darkFooter && look && !look.light && look.onDark !== 'auto' ? look.onDark : null
  const logoImage = footerLogo && (
    <Photo
      className={[
        'site-footer__logo',
        isRoundLogo(footerLogo) && 'site-footer__logo--round',
        logoRing && ringAllowed(look) && 'site-footer__logo--ring',
        onDark && `site-footer__logo--${onDark}`,
      ]
        .filter(Boolean)
        .join(' ')}
      media={footerLogo}
      sizes="200px"
    />
  )
  const copy = (
    <span>
      © {year} {name}
      {privacy}
    </span>
  )
  const band = cta && (
    <section aria-label="Chamada" className="site-cta section--brand">
      <div className="container site-cta__inner">
        <p className="site-cta__title">{cta.title}</p>
        <SiteLink className="button" href={cta.button.href}>
          {cta.button.label}
        </SiteLink>
      </div>
    </section>
  )

  const companyLine = company.length > 0 && (
    <p className="site-footer__company">
      {company.map((part, index) => (
        <span key={part}>
          {index > 0 && ' · '}
          {part}
        </span>
      ))}
    </p>
  )
  // Colunas sem nenhum link no ar não aparecem.
  const linkColumns = columns.filter((column) => column.links.length > 0)

  // Tudo desligado (R5): uma linha só, com a marca e o ©, em vez de um nome solto e um vazio.
  if (!text && !pages.length && !contactItems && !hours && !social.length && !linkColumns.length) {
    return (
      <>
        {band}
        <footer className="site-footer site-footer--line">
          <div className="container site-footer__line">
            <span className="site-footer__brandline">
              {logoImage}
              <b>{name}</b>
            </span>
            <span>
              © {year}
              {privacy}
            </span>
          </div>
          {companyLine && <div className="container">{companyLine}</div>}
        </footer>
      </>
    )
  }

  return (
    <>
      {band}
      <footer className="site-footer">
        <div className="container">
          <div className="site-footer__cols">
            <div className="site-footer__brand">
              {logoImage}
              <h2 className="site-footer__name">{name}</h2>
              {text && <p>{text}</p>}
              {social.length > 0 && (
                <ul aria-label="Redes sociais" className="site-footer__social">
                  {social.map((item) => (
                    <li key={item.key}>
                      <SiteLink
                        aria-label={`${SOCIAL_NAMES[item.key] ?? item.label} de ${name}`}
                        href={item.url}
                      >
                        <SocialIcon name={item.key} />
                      </SiteLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {pages.length > 0 && (
              <nav
                aria-labelledby="rodape-paginas"
                className={
                  pages.length >= TWO_COLUMN_PAGES ? 'site-footer__pagescol--two' : undefined
                }
              >
                <h2 className="site-footer__title" id="rodape-paginas">
                  Páginas
                </h2>
                <ul
                  className={
                    pages.length >= TWO_COLUMN_PAGES
                      ? 'site-footer__pages site-footer__pages--two'
                      : 'site-footer__pages'
                  }
                >
                  {pages.map((item) => (
                    <li key={item.id}>
                      <SiteLink href={item.href}>{item.label}</SiteLink>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {linkColumns.map((column) => (
              <nav aria-labelledby={`rodape-${column.id}`} key={column.id}>
                <h2 className="site-footer__title" id={`rodape-${column.id}`}>
                  {column.title}
                </h2>
                <ul className="site-footer__pages">
                  {column.links.map((link) => (
                    <li key={link.id}>
                      <SiteLink href={link.href}>{link.label}</SiteLink>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            {contactItems && (
              <div className="site-footer__contactcol">
                <h2 className="site-footer__title">Contato</h2>
                <address>
                  <ul className="site-footer__contact">
                    {contact.whatsappHref && (
                      <FooterItem href={contact.whatsappHref} icon="whatsapp" label="WhatsApp">
                        {contact.whatsapp}
                      </FooterItem>
                    )}
                    {contact.phoneHref && (
                      <FooterItem href={contact.phoneHref} icon="phone" label="Telefone">
                        {contact.phone}
                      </FooterItem>
                    )}
                    {contact.email && (
                      <FooterItem href={`mailto:${contact.email}`} icon="mail" label="E-mail">
                        {contact.email}
                      </FooterItem>
                    )}
                    {/* O endereço abre o mapa, como na seção Contato e endereço. */}
                    {contact.address && (
                      <FooterItem
                        className="site-footer__address"
                        href={mapsURL(contact.address)}
                        icon="map"
                        label="Endereço · ver no mapa"
                      >
                        {contact.address}
                      </FooterItem>
                    )}
                  </ul>
                </address>
              </div>
            )}

            {hours && (
              <div>
                <h2 className="site-footer__title">Horário</h2>
                <p className="site-footer__hours">
                  <ContactIcon name="clock" />
                  <span>{hours}</span>
                </p>
              </div>
            )}
          </div>

          {companyLine}
          <div className="site-footer__copy">
            {copy}
            {backToTop && (
              <a className="site-footer__top" href="#">
                Voltar ao topo
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="16"
                >
                  <path d="M12 19V5M6 11l6-6 6 6" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </footer>
    </>
  )
}
