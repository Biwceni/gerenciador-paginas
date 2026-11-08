import type { Media } from '../payload-types'
import type { PuckPageData } from '../puck/schema'

// Aviso de foto pequena (redesign v3, entrega 3): uma foto de 400 px esticada num banner de 1.440 px
// fica borrada. O aviso só orienta; nada é bloqueado.

/** O banner com foto ocupa a largura toda do computador. */
export const BANNER_MIN_WIDTH = 1200

/** Nas outras seções, a foto ocupa mais ou menos meia tela. */
export const SECTION_MIN_WIDTH = 700

export const SMALL_PHOTO_TITLE = 'Foto pequena: fica borrada no computador.'

export const SMALL_PHOTO_TEXT =
  'Foto pequena: fica borrada no computador. Use uma foto do celular, não um print, com pelo menos 1.600 px.'

/** Largura mínima de uma foto em cada lugar: banner ou outra seção. */
export function minPhotoWidth(inBanner: boolean): number {
  return inBanner ? BANNER_MIN_WIDTH : SECTION_MIN_WIDTH
}

/** A foto é menor que o lugar pede? Sem a largura (foto antiga, sem medida), não avisa. */
export function isSmallPhoto(
  photo: Pick<Media, 'width'> | null | undefined,
  minWidth: number,
): boolean {
  return typeof photo?.width === 'number' && photo.width > 0 && photo.width < minWidth
}

type Section = { type?: unknown; props?: Record<string, unknown> }

/**
 * Quanto cada foto da página precisa ter de largura: o banner com foto pede 1.200 px, as outras
 * seções 700 px. A foto que aparece em vários lugares fica com a maior exigência. As fotinhas
 * redondas dos depoimentos e o banner sem foto (fundo de cor) não contam.
 */
export function photoNeeds(data: PuckPageData | null): Map<number, number> {
  const needs = new Map<number, number>()
  const add = (mediaId: number, width: number) =>
    needs.set(mediaId, Math.max(needs.get(mediaId) ?? 0, width))

  const walk = (value: unknown, width: number) => {
    if (Array.isArray(value)) return value.forEach((item) => walk(item, width))
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown> & Section
    if (typeof record.mediaId === 'number') add(record.mediaId, width)
    if (typeof record.type === 'string' && record.props && typeof record.props === 'object') {
      const { image, ...rest } = record.props
      if (record.type === 'Testimonials') return
      if (record.type === 'Hero') {
        const style = record.props.style
        if (style === 'image' || style === 'side') walk(image, BANNER_MIN_WIDTH)
        walk(rest, SECTION_MIN_WIDTH)
        return
      }
      walk(record.props, SECTION_MIN_WIDTH)
      return
    }
    Object.values(record).forEach((item) => walk(item, width))
  }
  // As Colunas guardam as peças dentro das props (slots): o passeio chega nelas também.
  if (data) walk(data.content, SECTION_MIN_WIDTH)
  return needs
}

/** As fotos da página que ficam borradas no computador, com a largura que cada uma precisaria. */
export function smallPhotos(
  data: PuckPageData | null,
  photoById: (id: number) => Pick<Media, 'width'> | null | undefined,
): { id: number; minWidth: number }[] {
  return [...photoNeeds(data)]
    .filter(([id, minWidth]) => isSmallPhoto(photoById(id), minWidth))
    .map(([id, minWidth]) => ({ id, minWidth }))
}
