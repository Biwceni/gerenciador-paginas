import type { PuckPageData } from './schema'

const MAX_DESCRIPTION = 160

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length)}…`
}

/** Descrição automática para o Google: o primeiro texto corrido da página. */
export function extractDescription(data: PuckPageData): string | null {
  for (const item of data.content) {
    const text = item.type === 'Gallery' ? '' : item.props.text
    if (text.trim()) return truncate(text, MAX_DESCRIPTION)
  }
  return null
}

/** Primeira foto da página, usada ao compartilhar quando não há uma escolhida. */
export function firstPhotoId(data: PuckPageData): number | null {
  for (const item of data.content) {
    if (item.type === 'Gallery') {
      if (item.props.images[0]) return item.props.images[0].mediaId
    } else if (item.type !== 'CallToAction' && item.props.image) {
      return item.props.image.mediaId
    }
  }
  return null
}

/** "Café especial. Torrado toda semana." → "Café especial" (para o título da página inicial). */
export function firstSentence(text: string | null | undefined): string {
  return (text ?? '').split(/[.!?](\s|$)/)[0].trim()
}
