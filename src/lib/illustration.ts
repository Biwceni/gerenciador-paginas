import type { ColumnPiece, PageComponent, PuckPageData } from '../puck/schema'
import { blendColors, safeColor } from './colors'
import { DEFAULT_COLORS } from './theme'

// Ilustração neutra no lugar das fotos nas prévias dos modelos (redesign v3, entrega 6). Os modelos
// não trazem foto de banco: no site da pessoa, o lugar da foto fica vazio, com o aviso "Escolha uma
// foto sua" no editor. Na prévia do modelo, um desenho simples (sol e morros) nas cores do site
// mostra onde vai cada foto, sem fingir que é foto do cliente.

/** Largura e altura do desenho (3:2, como uma foto de celular deitada). */
export const ILLUSTRATION_SIZE = { width: 1500, height: 1000 } as const

/** Fotos que a galeria e o Instagram da prévia mostram, quando o modelo não escolheu nenhuma. */
const GALLERY_SLOTS = 6

type Colors = { primary?: string | null; surface?: string | null } | null | undefined

/**
 * O desenho como endereço `data:` (SVG). `index` muda a posição do sol e dos morros, para as fotos
 * de uma galeria não ficarem todas iguais.
 */
export function illustrationURL(colors: Colors, index = 0): string {
  const primary = safeColor(colors?.primary, DEFAULT_COLORS.primary)
  const surface = safeColor(colors?.surface, DEFAULT_COLORS.surface)
  const { width, height } = ILLUSTRATION_SIZE
  const shift = (index * 37) % 100
  const sunX = 380 + shift * 7.5
  const back = blendColors(primary, surface, 0.22)
  const front = blendColors(primary, surface, 0.38)
  const sun = blendColors(primary, surface, 0.3)
  const peak = 520 + ((index * 53) % 160)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<rect width="${width}" height="${height}" fill="${surface}"/>` +
    `<circle cx="${sunX}" cy="300" r="110" fill="${sun}"/>` +
    `<path d="M0 ${peak + 160} L${360 + shift * 3} ${peak} L${820 + shift * 2} ${peak + 220} L${width} ${peak + 40} V${height} H0Z" fill="${back}"/>` +
    `<path d="M0 ${height - 180} Q${width * 0.35} ${height - 360} ${width * 0.62} ${height - 220} T${width} ${height - 260} V${height} H0Z" fill="${front}"/>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * O conteúdo de um modelo com um número de foto em cada lugar de foto vazio (banner com foto, texto
 * com foto, galeria, produtos, Instagram, foto nas colunas), contando de 1. A prévia põe a
 * ilustração em cada número. `count`: quantos lugares foram preenchidos.
 */
export function fillPhotoSlots(data: PuckPageData): { data: PuckPageData; count: number } {
  let count = 0
  const next = () => ({ mediaId: ++count })
  const many = (images: { mediaId: number }[]) =>
    images.length ? images : Array.from({ length: GALLERY_SLOTS }, () => next())

  const piece = (item: ColumnPiece): ColumnPiece =>
    item.type === 'ColumnImage' && !item.props.image
      ? { ...item, props: { ...item.props, image: next() } }
      : item

  const section = (item: PageComponent): PageComponent => {
    switch (item.type) {
      case 'Hero':
        return (item.props.style === 'image' || item.props.style === 'side') && !item.props.image
          ? { ...item, props: { ...item.props, image: next() } }
          : item
      case 'TextImage':
        return item.props.image ? item : { ...item, props: { ...item.props, image: next() } }
      case 'Gallery':
        return {
          ...item,
          props: {
            ...item.props,
            images: item.props.images.length
              ? item.props.images
              : many([]).map((ref) => ({ ...ref, caption: '' })),
          },
        }
      case 'InstagramStrip':
        return { ...item, props: { ...item.props, images: many(item.props.images) } }
      case 'Products':
        return {
          ...item,
          props: {
            ...item.props,
            items: item.props.items.map((product) =>
              product.image ? product : { ...product, image: next() },
            ),
          },
        }
      case 'Features':
        return item.props.marker === 'photo'
          ? {
              ...item,
              props: {
                ...item.props,
                items: item.props.items.map((feature) =>
                  feature.photo ? feature : { ...feature, photo: next() },
                ),
              },
            }
          : item
      case 'Columns':
        return {
          ...item,
          props: {
            ...item.props,
            column1: item.props.column1.map(piece),
            column2: item.props.column2.map(piece),
            column3: item.props.column3.map(piece),
          },
        }
      default:
        return item
    }
  }

  return { data: { ...data, content: data.content.map(section) }, count }
}
