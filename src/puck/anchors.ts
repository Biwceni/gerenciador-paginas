import { slugify } from '../lib/slug'
import type { PuckPageData } from './schema'

// Ids fixos do site (conteúdo principal, menu do celular, rodapé): uma seção com o mesmo nome
// ganha `-2`, para o "Pular para o conteúdo" e o menu continuarem funcionando.
const RESERVED_IDS = ['conteudo', 'menu-celular', 'rodape-paginas']

/**
 * Âncora de cada seção que tem "Nome no menu": `servicos`, `perguntas-frequentes`.
 * Nomes repetidos na mesma página ganham `-2`, `-3`, na ordem em que aparecem.
 * Chave: id da seção. Serve no editor e no site.
 */
export function sectionAnchors(data: Pick<PuckPageData, 'content'>): Record<string, string> {
  const anchors: Record<string, string> = {}
  const used = new Set<string>(RESERVED_IDS)

  for (const item of data.content) {
    const label = 'menuLabel' in item.props ? item.props.menuLabel : ''
    const base = slugify(label)
    if (!base) continue
    let anchor = base
    for (let n = 2; used.has(anchor); n++) anchor = `${base}-${n}`
    used.add(anchor)
    anchors[item.props.id] = anchor
  }
  return anchors
}
