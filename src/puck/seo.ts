import { richTextToPlain } from '../lib/richtext'
import { CATALOG_TEXTS } from './catalogTexts'
import type { ColumnPiece, PageComponent, PuckPageData } from './schema'

const MAX_DESCRIPTION = 160

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length)}…`
}

const columnPieces = (item: PageComponent): ColumnPiece[] =>
  item.type === 'Columns'
    ? [...item.props.column1, ...item.props.column2, ...item.props.column3]
    : []

/** Texto corrido de uma seção, na ordem em que aparece. */
function sectionText(item: PageComponent): string {
  switch (item.type) {
    case 'Hero':
    case 'TextImage':
    case 'CallToAction':
    case 'Contact':
    case 'LinkList':
    case 'Form':
    case 'Products':
    case 'PriceList':
      return item.props.text
    case 'Features':
      return item.props.items[0]?.text ?? ''
    case 'Faq':
      return item.props.items[0]?.answer ?? ''
    case 'RichText':
      return richTextToPlain(item.props.body)
    case 'Video':
      return item.props.caption
    case 'Columns':
      return columnPieces(item).find((piece) => piece.type === 'ColumnText')?.props.text ?? ''
    case 'Testimonials':
    case 'Gallery':
    case 'Privacy':
    case 'Announcement':
    case 'InstagramStrip':
      return ''
  }
}

const CATALOG = new Set(CATALOG_TEXTS)
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase()

/** Texto que ninguém escreveu: o que a seção traz ao entrar, ou o "Lorem ipsum" de preencher. */
export const isCatalogText = (text: string): boolean => {
  const clean = normalize(text)
  return CATALOG.has(clean) || /\blorem ipsum\b/.test(clean)
}

/**
 * Descrição automática para o Google: o primeiro texto corrido da página que não seja texto de
 * exemplo (achado 9.4). `isExample` recebe o texto já em minúsculas e sem espaços sobrando; o
 * editor passa também os textos dos modelos prontos.
 */
export function extractDescription(
  data: PuckPageData,
  isExample: (normalized: string) => boolean = isCatalogText,
): string | null {
  for (const item of data.content) {
    const text = sectionText(item)
    if (text.trim() && !isExample(normalize(text))) return truncate(text, MAX_DESCRIPTION)
  }
  return null
}

function sectionPhotoId(item: PageComponent): number | null {
  switch (item.type) {
    case 'Hero':
    case 'TextImage':
      return item.props.image?.mediaId ?? null
    case 'Gallery':
    case 'InstagramStrip':
      return item.props.images[0]?.mediaId ?? null
    case 'Products':
      return item.props.items.find((entry) => entry.image)?.image?.mediaId ?? null
    case 'Video':
      return item.props.cover?.mediaId ?? null
    case 'Columns':
      for (const piece of columnPieces(item)) {
        if (piece.type === 'ColumnImage' && piece.props.image) return piece.props.image.mediaId
      }
      return null
    default:
      return null
  }
}

/** Primeira foto da página, usada ao compartilhar quando não há uma escolhida. */
export function firstPhotoId(data: PuckPageData): number | null {
  for (const item of data.content) {
    const photoId = sectionPhotoId(item)
    if (photoId) return photoId
  }
  return null
}

type GoogleTitleSite = { name: string; tagline?: string | null }

/** Página inicial sem título próprio: "Nome do site | primeira frase da apresentação". */
export function homeGoogleTitle({ name, tagline }: GoogleTitleSite): string {
  const sentence = firstSentence(tagline)
  return sentence ? `${name} | ${sentence}` : name
}

/** O título que a página tem no Google. O site, o Publicar e "Página e Google" usam só este. */
export function googleTitle(
  page: { title: string; seoTitle?: string | null },
  site: GoogleTitleSite,
  isHome: boolean,
): string {
  if (isHome) return page.seoTitle || homeGoogleTitle(site)
  return `${page.seoTitle || page.title} | ${site.name}`
}

/** "Café especial. Torrado toda semana." → "Café especial" (para o título da página inicial). */
export function firstSentence(text: string | null | undefined): string {
  return (text ?? '').split(/[.!?](\s|$)/)[0].trim()
}
