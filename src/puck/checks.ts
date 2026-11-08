import { instagramLink } from '../lib/links'
import { INSTAGRAM_MIN_PHOTOS, type PuckPageData } from './schema'

// O que falta nas seções para irem ao ar inteiras (redesign v3, entrega 4). Vira aviso no Publicar:
// nenhum bloqueia, como as outras checagens.

export type SectionCheck = { title: string; text: string }

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

  // Produto sem foto não aparece no site.
  const productsWithoutPhoto = data.content.reduce(
    (sum, item) =>
      item.type === 'Products'
        ? sum + item.props.items.filter((product) => !withPhoto(product.image)).length
        : sum,
    0,
  )
  if (productsWithoutPhoto) {
    checks.push({
      title: plural(productsWithoutPhoto, 'Um produto está sem foto', '# produtos estão sem foto'),
      text: 'Na Vitrine de produtos, a foto é obrigatória: sem ela, o produto não aparece no site.',
    })
  }

  const instagramSections = data.content.filter((item) => item.type === 'InstagramStrip')
  const fewPhotos = instagramSections.some(
    (item) =>
      item.type === 'InstagramStrip' &&
      item.props.images.filter(withPhoto).length < INSTAGRAM_MIN_PHOTOS,
  )
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
