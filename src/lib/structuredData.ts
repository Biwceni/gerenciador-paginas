import type { Media, Site } from '@/payload-types'

import { telHref } from './links'

// Dados estruturados (JSON-LD) para o Google entender o negócio: `LocalBusiness` na página inicial
// e `BreadcrumbList` em todas. Só entra o que está preenchido nas Configurações.

type JsonLd = Record<string, unknown>

/** Endereço completo: as fotos do Storage já vêm completas; as do servidor, não. */
function absoluteURL(url: string | null | undefined, base: string): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url, base).toString()
  } catch {
    return undefined
  }
}

/** Telefone no formato internacional (+55...), ou nada se o número não for reconhecido. */
function internationalPhone(value: string | null | undefined): string | undefined {
  const href = telHref(value)
  return href?.startsWith('tel:+') ? href.slice(4) : undefined
}

const filled = (value: string | null | undefined) => value?.trim() || undefined

type BusinessInput = {
  site: Partial<Site>
  name: string
  /** Endereço do site (a página inicial), como `https://seusite.com.br/`. */
  url: string
  logo: Media | null
  image: Media | null
  /** Endereços dos perfis nas redes (Instagram primeiro). */
  sameAs: string[]
}

/**
 * O negócio, como o Google pede. O horário fica no texto da descrição: o campo das Configurações é
 * livre ("Seg a sáb, das 7h às 19h") e não dá para transformar com segurança em horários fixos.
 */
export function localBusinessJsonLd({
  site,
  name,
  url,
  logo,
  image,
  sameAs,
}: BusinessInput): JsonLd {
  const contact = site.contact
  const about = filled(site.seoDescription) ?? filled(site.tagline)
  const hours = filled(contact?.hours)
  const description = [about, hours && `Horário: ${hours}`].filter(Boolean).join(' ') || undefined
  const address = filled(contact?.address)
  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${url}#negocio`,
    name,
    url,
    description,
    logo: absoluteURL(logo?.url, url),
    image: absoluteURL(image?.url ?? logo?.url, url),
    telephone: internationalPhone(contact?.phone) ?? internationalPhone(contact?.whatsapp),
    email: filled(contact?.email),
    address: address ? { '@type': 'PostalAddress', streetAddress: address } : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  }
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
}

/** Caminho da página a partir do Início. Na própria página inicial, só ela. */
export function breadcrumbJsonLd(input: {
  homeName: string
  homeURL: string
  page: { title: string; url: string } | null
}): JsonLd {
  const items = [{ name: input.homeName, url: input.homeURL }]
  if (input.page) items.push({ name: input.page.title, url: input.page.url })
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Texto do `<script type="application/ld+json">`. O `<` vira `<`, para um nome ou frase com
 * "</script>" não fechar a tag antes da hora.
 */
export function jsonLdText(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
