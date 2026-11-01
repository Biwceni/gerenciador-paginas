import { richTextToPlain } from '../lib/richtext'
import { COLUMN_COUNT, type PageComponent } from './schema'

const MAX_ITEMS = 2

/** Os primeiros textos da lista, sem repetir: "Café especial, Entrega rápida…". */
function list(texts: (string | null | undefined)[]): string {
  const filled = [...new Set(texts.map((text) => text?.trim()).filter(Boolean))]
  const shown = filled.slice(0, MAX_ITEMS).join(', ')
  return filled.length > MAX_ITEMS ? `${shown}…` : shown
}

/** Resumo do texto de uma seção, para reconhecer ela na aba Ordem. */
export function sectionSummary(item: PageComponent): string {
  switch (item.type) {
    case 'Features':
      return list(item.props.items.map((entry) => entry.title)) || item.props.title
    case 'Testimonials':
      return list(item.props.items.map((entry) => entry.name)) || item.props.title
    case 'Faq':
      return list(item.props.items.map((entry) => entry.question)) || item.props.title
    case 'LinkList':
      return list(item.props.items.map((entry) => entry.label)) || item.props.title
    case 'Gallery': {
      const count = item.props.images.length
      return item.props.title || (count === 1 ? '1 foto' : `${count} fotos`)
    }
    case 'Columns':
      return list(
        // Só as colunas que aparecem: o modelo de duas guarda a terceira sem mostrar.
        [item.props.column1, item.props.column2, item.props.column3]
          .slice(0, COLUMN_COUNT[item.props.layout])
          .flat()
          .map((piece) => {
            if (piece.type === 'ColumnText') return piece.props.title || piece.props.text
            if (piece.type === 'ColumnImage') return piece.props.caption
            return piece.props.button?.label
          }),
      )
    case 'RichText':
      return item.props.title || richTextToPlain(item.props.body)
    case 'Hero':
    case 'TextImage':
    case 'CallToAction':
    case 'Contact':
    case 'Form':
      return item.props.title || item.props.text
    case 'Video':
      return item.props.title || item.props.caption
    case 'Privacy':
      return item.props.title
  }
}
