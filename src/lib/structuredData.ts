import type { Media, Site } from '@/payload-types'

import { telHref } from './links'
import { type Schedule, siteUnits, type SpecialDay, unitName } from './units'

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

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** O horário da semana de uma unidade (D1) no formato do Google: dias com o mesmo horário juntos. */
export function openingHoursJsonLd(schedule: Schedule | null): JsonLd[] | undefined {
  if (!schedule) return undefined
  const byHours = new Map<string, string[]>()
  schedule.forEach((day, index) => {
    if (!day) return
    const key = `${day.open}|${day.close}`
    byHours.set(key, [...(byHours.get(key) ?? []), WEEKDAYS[index]])
  })
  return [...byHours].map(([key, days]) => {
    const [opens, closes] = key.split('|')
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens, closes }
  })
}

/** Feriados e horário especial (D1). Fechado o dia todo, para o Google, abre e fecha às 00:00. */
export function specialHoursJsonLd(specials: SpecialDay[]): JsonLd[] | undefined {
  if (!specials.length) return undefined
  return specials.map((special) => ({
    '@type': 'OpeningHoursSpecification',
    validFrom: special.date,
    validThrough: special.date,
    opens: special.closed ? '00:00' : special.open,
    closes: special.closed ? '00:00' : special.close,
  }))
}

/**
 * O negócio, como o Google pede. Com as unidades (D1), o horário vai no formato próprio do Google,
 * com os feriados; a observação livre de antes continua na descrição. As outras unidades entram
 * como departamentos, cada uma com endereço, telefone e horário.
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
  const units = siteUnits(contact)
  const main = units[0]
  const hours = filled(contact?.hours)
  const description = [about, hours && `Horário: ${hours}`].filter(Boolean).join(' ') || undefined
  const address = filled(contact?.address)
  const departments = units.slice(1).map((unit, index) => {
    const department: JsonLd = {
      '@type': 'LocalBusiness',
      name: `${name} ${unitName(unit, index + 1)}`,
      address: unit.address ? { '@type': 'PostalAddress', streetAddress: unit.address } : undefined,
      telephone: internationalPhone(unit.phone || unit.phone2) ?? internationalPhone(unit.whatsapp),
      openingHoursSpecification: openingHoursJsonLd(unit.schedule),
      specialOpeningHoursSpecification: specialHoursJsonLd(unit.specials),
    }
    return Object.fromEntries(Object.entries(department).filter(([, value]) => value !== undefined))
  })
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
    openingHoursSpecification: openingHoursJsonLd(main?.schedule ?? null),
    specialOpeningHoursSpecification: specialHoursJsonLd(main?.specials ?? []),
    department: departments.length ? departments : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  }
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
}

/** Caminho da página a partir do Início (só fora da página inicial: o Google pede dois itens). */
export function breadcrumbJsonLd(input: {
  homeName: string
  homeURL: string
  page: { title: string; url: string }
}): JsonLd {
  const items = [
    { name: input.homeName, url: input.homeURL },
    { name: input.page.title, url: input.page.url },
  ]
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
 * Texto do `<script type="application/ld+json">`. O `<` vira o escape Unicode dele (o `replace`
 * abaixo), para um nome ou frase com "</script>" não fechar a tag antes da hora.
 */
export function jsonLdText(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
