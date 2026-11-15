import { instagramLink } from '../lib/links'
import { pieceShows } from './hiddenSections'
import { INSTAGRAM_MIN_PHOTOS, type PuckPageData, visibleColumns } from './schema'

// O que falta nas seções para irem ao ar inteiras (redesign v3, entrega 4). Vira aviso no Publicar:
// nenhum bloqueia, como as outras checagens.

export type SectionCheck = { title: string; text: string }

/** Nomes que o editor põe nos produtos e itens novos (`editor-config.tsx`). */
const EXAMPLE_NAMES = new Set(['Nome do produto', 'Nome do item', 'Novo item'])

const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : many.replace('#', String(count))

/**
 * Avisos das seções da página. `hasPhoto`: a foto ainda existe na biblioteca. `instagram`: o
 * Instagram das Configurações, como foi digitado.
 */
export function sectionChecks(
  data: PuckPageData,
  { hasPhoto, instagram }: { hasPhoto: (id: number) => boolean; instagram?: string | null },
): SectionCheck[] {
  const checks: SectionCheck[] = []
  const withPhoto = (ref: { mediaId: number } | null | undefined) =>
    Boolean(ref && hasPhoto(ref.mediaId))

  const products = data.content.flatMap((item) =>
    item.type === 'Products' ? item.props.items : [],
  )
  const priceItems = data.content.flatMap((item) =>
    item.type === 'PriceList' ? item.props.groups.flatMap((group) => group.items) : [],
  )

  // Produto sem foto não aparece no site.
  const productsWithoutPhoto = products.filter((product) => !withPhoto(product.image)).length
  if (productsWithoutPhoto) {
    checks.push({
      title: plural(productsWithoutPhoto, 'Um produto está sem foto', '# produtos estão sem foto'),
      text: 'Na Vitrine de produtos, a foto é obrigatória: sem ela, o produto não aparece no site.',
    })
  }

  // Nem sem nome (os que não têm foto já foram contados acima).
  const productsWithoutName = products.filter(
    (product) => withPhoto(product.image) && !product.name.trim(),
  ).length
  if (productsWithoutName) {
    checks.push({
      title: plural(productsWithoutName, 'Um produto está sem nome', '# produtos estão sem nome'),
      text: 'Sem o nome, o produto não aparece no site.',
    })
  }

  // Textos que vêm prontos no editor e ninguém quer no ar: "R$ 0,00" e "Nome do produto".
  const zeroPrices = [...products, ...priceItems].filter(
    (item) => item.price.replace(/\s/g, '') === 'R$0,00',
  ).length
  if (zeroPrices) {
    checks.push({
      title: plural(
        zeroPrices,
        'Um preço ainda está como R$ 0,00',
        '# preços ainda estão como R$ 0,00',
      ),
      text: 'Os visitantes vão ver o item de graça. Escreva o preço ou deixe vazio.',
    })
  }
  const exampleNames = [...products, ...priceItems].filter((item) =>
    EXAMPLE_NAMES.has(item.name.trim()),
  ).length
  if (exampleNames) {
    checks.push({
      title: plural(
        exampleNames,
        'Um item ainda tem nome de exemplo',
        '# itens ainda têm nome de exemplo',
      ),
      text: 'Troque “Nome do produto” ou “Nome do item” pelo nome de verdade.',
    })
  }

  // Destaques com o marcador Foto: o item sem foto fica só com o texto, igual a "Nenhum" (B1,
  // achado Features-2).
  const featuresWithoutPhoto = data.content
    .flatMap((item) =>
      item.type === 'Features' && item.props.marker === 'photo' ? item.props.items : [],
    )
    .filter((item) => (item.title.trim() || item.text.trim()) && !withPhoto(item.photo)).length
  if (featuresWithoutPhoto) {
    checks.push({
      title: plural(
        featuresWithoutPhoto,
        'Um destaque está sem foto',
        '# destaques estão sem foto',
      ),
      text: 'O marcador escolhido é Foto: sem ela, o destaque fica só com o texto. Escolha a foto no item, nas opções da seção.',
    })
  }

  // Colunas com alguma coluna vazia: fica um buraco no meio da seção (B1, achado Columns-4). Todas
  // vazias já entram nas seções que não vão aparecer (hiddenSections.ts).
  const emptyColumns = data.content.reduce((count, item) => {
    if (item.type !== 'Columns') return count
    const columns = visibleColumns(item.props) as {
      type: string
      props: Record<string, unknown>
    }[][]
    const empty = columns.filter((pieces) => !pieces.some((piece) => pieceShows(piece, hasPhoto)))
    return empty.length && empty.length < columns.length ? count + empty.length : count
  }, 0)
  if (emptyColumns) {
    checks.push({
      title: plural(emptyColumns, 'Uma coluna está vazia', '# colunas estão vazias'),
      text: 'Ela deixa um espaço em branco na seção Colunas. Coloque uma peça nela ou escolha um modelo com menos colunas.',
    })
  }

  const instagramSections = data.content.filter((item) => item.type === 'InstagramStrip')
  // Sem nenhuma foto a seção nem aparece: esse aviso é o das seções escondidas (hiddenSections.ts).
  const fewPhotos = instagramSections.some((item) => {
    if (item.type !== 'InstagramStrip') return false
    const count = item.props.images.filter(withPhoto).length
    return count > 0 && count < INSTAGRAM_MIN_PHOTOS
  })
  if (fewPhotos) {
    checks.push({
      title: 'A seção Instagram tem menos de 4 fotos',
      text: 'Ela fica mais bonita com 4 a 8 fotos. Escolha nas opções da seção.',
    })
  }
  if (instagramSections.length && !instagramLink(instagram)) {
    checks.push({
      title: 'Falta o Instagram nas Configurações',
      text: 'Sem ele, a seção Instagram aparece sem o @ e sem o botão “Seguir no Instagram”.',
    })
  }

  return checks
}
