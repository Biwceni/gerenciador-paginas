import { COLUMN_COUNT, type PuckPageData } from './schema'

// Seções que não vão aparecer no site (achado 13.2). O site esconde a seção sem conteúdo (vídeo sem
// endereço, galeria sem foto, destaques vazios); as Colunas sem peças viram um espaço vazio e o
// Formulário sem formulário fica só com o título. O editor mostra todas, então a pessoa não sabe.
// As regras seguem as de `components/sections.tsx`.

export type HiddenSection = {
  id: string
  type: string
  /** Por que ela não aparece, para depois do nome da seção: "falta o endereço do vídeo". */
  reason: string
}

type Item = PuckPageData['content'][number]
type Piece = { type: string; props: Record<string, unknown> }

const text = (value: unknown) =>
  typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : ''

/** Peça das Colunas que o site mostra (a mesma regra das peças em `sections.tsx`). */
function pieceShows(piece: Piece, hasPhoto: (id: number) => boolean): boolean {
  const props = piece.props
  if (piece.type === 'ColumnText') return Boolean(text(props.title) || text(props.text))
  if (piece.type === 'ColumnImage') {
    const image = props.image as { mediaId: number } | null | undefined
    return Boolean(image && hasPhoto(image.mediaId))
  }
  const button = props.button as { label?: string } | null | undefined
  return Boolean(button?.label?.trim())
}

/** Por que a seção não aparece no site, ou `null` se ela aparece. */
function hiddenReason(item: Item, hasPhoto: (id: number) => boolean): string | null {
  const photo = (ref: { mediaId: number } | null | undefined) =>
    Boolean(ref && hasPhoto(ref.mediaId))
  switch (item.type) {
    case 'Video':
      return item.props.videoId ? null : 'falta o endereço do vídeo'
    case 'Gallery':
    case 'InstagramStrip':
      return item.props.images.some(photo) ? null : 'não tem nenhuma foto'
    case 'Products':
      return item.props.items.some((product) => photo(product.image) && text(product.name))
        ? null
        : 'nenhum produto tem foto e nome'
    case 'PriceList':
      return item.props.groups.some((group) => group.items.some((entry) => text(entry.name)))
        ? null
        : 'nenhum item tem nome'
    case 'Features':
      return item.props.items.some((entry) => text(entry.title) || text(entry.text))
        ? null
        : 'os destaques estão vazios'
    case 'Testimonials':
      return item.props.items.some((entry) => text(entry.quote))
        ? null
        : 'nenhum depoimento está escrito'
    case 'Faq':
      return item.props.items.some((entry) => text(entry.question))
        ? null
        : 'nenhuma pergunta está escrita'
    case 'Announcement':
      return item.props.items.some((entry) => text(entry.text))
        ? null
        : 'nenhuma frase está escrita'
    case 'TextImage':
      return text(item.props.title) || text(item.props.text) || photo(item.props.image)
        ? null
        : 'está sem título, texto e foto'
    case 'RichText':
      return text(item.props.title) || text(item.props.body) ? null : 'está sem título e sem texto'
    case 'Columns': {
      const columns = [item.props.column1, item.props.column2, item.props.column3].slice(
        0,
        COLUMN_COUNT[item.props.layout],
      ) as Piece[][]
      return columns.some((pieces) => pieces.some((piece) => pieceShows(piece, hasPhoto)))
        ? null
        : 'está sem nenhuma peça e fica um espaço vazio'
    }
    case 'Form':
      return item.props.form ? null : 'falta escolher qual formulário, e só o título aparece'
    default:
      return null
  }
}

/** As seções da página que não vão aparecer inteiras no site, na ordem da página. */
export function hiddenSections(
  data: Pick<PuckPageData, 'content'>,
  hasPhoto: (id: number) => boolean,
): HiddenSection[] {
  return data.content.flatMap((item) => {
    // No editor, uma seção pode estar no meio de uma mudança, com algum valor ainda faltando.
    let reason: string | null = null
    try {
      reason = hiddenReason(item, hasPhoto)
    } catch {
      reason = null
    }
    return reason ? [{ id: String(item.props.id), type: item.type, reason }] : []
  })
}
