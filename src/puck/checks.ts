import { instagramLink } from '../lib/links'
import { INSTAGRAM_MIN_PHOTOS, type PuckPageData } from './schema'

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
