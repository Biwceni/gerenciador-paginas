import { SEGMENTS, type Segment, SITE_TYPES, type SiteType } from './templates'

// Pares de letras sugeridos em "Sua marca" (redesign v3, entrega 3), conforme o ramo escolhido no
// Começar. São só atalhos: qualquer fonte do Google Fonts continua valendo.

export type FontPair = { name: string; headings: string; body: string }

/** Ramo do site: o ramo do "Site da empresa" ou o próprio tipo de site; `geral` quando não dá para saber. */
export type Business = Segment | Exclude<SiteType, 'institucional'> | 'geral'

export const FONT_PAIRS: Record<Business, FontPair[]> = {
  cafe: [
    { name: 'Elegante', headings: 'Cormorant Garamond', body: 'Montserrat' },
    { name: 'Aconchegante', headings: 'Fraunces', body: 'Nunito' },
    { name: 'Clássica', headings: 'Playfair Display', body: 'Lato' },
  ],
  saude: [
    { name: 'Limpa', headings: 'Manrope', body: 'Manrope' },
    { name: 'Acolhedora', headings: 'Lora', body: 'Figtree' },
    { name: 'Suave', headings: 'Nunito', body: 'Nunito' },
  ],
  servicos: [
    { name: 'Firme', headings: 'Archivo', body: 'Inter' },
    { name: 'Tradicional', headings: 'Libre Baskerville', body: 'Source Sans 3' },
    { name: 'Forte', headings: 'Oswald', body: 'Work Sans' },
  ],
  loja: [
    { name: 'Artesanal', headings: 'Fraunces', body: 'Nunito' },
    { name: 'Vitrine', headings: 'DM Serif Display', body: 'DM Sans' },
    { name: 'Moderna', headings: 'Space Grotesk', body: 'Karla' },
  ],
  outro: [
    { name: 'Clássica', headings: 'Lora', body: 'Figtree' },
    { name: 'Moderna', headings: 'DM Sans', body: 'DM Sans' },
    { name: 'Elegante', headings: 'Playfair Display', body: 'Lato' },
  ],
  onepage: [
    { name: 'Moderna', headings: 'Manrope', body: 'Manrope' },
    { name: 'Clássica', headings: 'Lora', body: 'Figtree' },
    { name: 'Amigável', headings: 'Fraunces', body: 'Nunito' },
  ],
  landing: [
    { name: 'Direta', headings: 'Poppins', body: 'Inter' },
    { name: 'Forte', headings: 'Oswald', body: 'Work Sans' },
    { name: 'Elegante', headings: 'DM Serif Display', body: 'DM Sans' },
  ],
  evento: [
    { name: 'Cartaz', headings: 'Bebas Neue', body: 'Open Sans' },
    { name: 'Festa', headings: 'Abril Fatface', body: 'Lato' },
    { name: 'Moderna', headings: 'Space Grotesk', body: 'Inter' },
  ],
  pessoal: [
    { name: 'Autoral', headings: 'Fraunces', body: 'Karla' },
    { name: 'Moderna', headings: 'Space Grotesk', body: 'Inter' },
    { name: 'Clássica', headings: 'Libre Baskerville', body: 'Source Sans 3' },
  ],
  links: [
    { name: 'Moderna', headings: 'Poppins', body: 'Poppins' },
    { name: 'À mão', headings: 'Pacifico', body: 'Quicksand' },
    { name: 'Limpa', headings: 'DM Sans', body: 'DM Sans' },
  ],
  embreve: [
    { name: 'Festa', headings: 'Abril Fatface', body: 'Lato' },
    { name: 'Moderna', headings: 'Space Grotesk', body: 'Inter' },
    { name: 'Elegante', headings: 'Cormorant Garamond', body: 'Montserrat' },
  ],
  geral: [
    { name: 'Clássica', headings: 'Lora', body: 'Figtree' },
    { name: 'Moderna', headings: 'DM Sans', body: 'DM Sans' },
    { name: 'Amigável', headings: 'Fraunces', body: 'Nunito' },
  ],
}

/** Nome do ramo para a tela ("Sugestões para restaurante ou café"). */
export function businessLabel(business: Business): string | null {
  if (business === 'geral') return null
  const label =
    SEGMENTS.find((item) => item.value === business)?.label ??
    SITE_TYPES.find((item) => item.value === business)?.label
  return label ? label.charAt(0).toLowerCase() + label.slice(1) : null
}

type SiteLook = {
  colors?: Record<string, string | null | undefined> | null
  fonts?: { headings?: string | null; body?: string | null } | null
}

export type BusinessTemplate = {
  siteType?: SiteType | null
  segment?: Segment | null
  site?: SiteLook | null
  pages?: { slug?: string | null }[] | null
}

// Endereços que quase todo modelo tem: não dizem nada sobre o ramo.
const COMMON_SLUGS = new Set(['inicio', 'sobre', 'contato', 'politica-de-privacidade'])

/**
 * O ramo do site. Nenhum campo guarda o modelo aplicado no Começar (e criar um pediria migração),
 * então vale o modelo mais parecido: as mesmas fontes, as mesmas cores e os endereços das páginas
 * típicos do ramo (como "tratamentos" ou "nossos-cafes"). Sem pista nenhuma, `geral`.
 */
export function guessBusiness(
  site: SiteLook,
  pageSlugs: string[],
  templates: BusinessTemplate[],
): Business {
  const slugs = new Set(pageSlugs)
  const same = (a: unknown, b: unknown) =>
    typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase()

  let best: { business: Business; score: number } = { business: 'geral', score: 0 }
  for (const template of templates) {
    if (!template.siteType) continue
    const business: Business =
      template.siteType === 'institucional' ? (template.segment ?? 'outro') : template.siteType
    let score = 0
    const fonts = template.site?.fonts
    if (fonts?.headings && same(fonts.headings, site.fonts?.headings)) score += 2
    if (fonts?.body && same(fonts.body, site.fonts?.body)) score += 1
    const colors = Object.entries(template.site?.colors ?? {})
    if (colors.length && colors.every(([key, color]) => same(color, site.colors?.[key]))) {
      score += 3
    }
    for (const page of template.pages ?? []) {
      if (page.slug && !COMMON_SLUGS.has(page.slug) && slugs.has(page.slug)) score += 2
    }
    if (score > best.score) best = { business, score }
  }
  return best.business
}
