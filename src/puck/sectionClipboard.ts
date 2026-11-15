import { CONTENT_VERSION, parsePageContent } from './schema'

/** Onde fica a seção copiada (E1): no navegador, para colar em outra página do mesmo site. */
export const CLIPBOARD_KEY = 'gp:secao-copiada'

/** Seção da página, como o Puck guarda. */
export type SectionItem = { type: string; props: Record<string, unknown> & { id: string } }

type Packed = { kind: 'gp-section'; version: number; item: SectionItem }

/** O que vai para o navegador: a seção e a versão do conteúdo, para migrar quando ela mudar. */
export function packSection(item: SectionItem): string {
  const packed: Packed = { kind: 'gp-section', version: CONTENT_VERSION, item }
  return JSON.stringify(packed)
}

/**
 * A seção guardada, migrada para a versão atual e conferida como numa página salva. Qualquer coisa
 * fora do formato (texto colado de fora, versão desconhecida, campo inválido) volta `null`.
 */
export function unpackSection(raw: string | null | undefined): SectionItem | null {
  if (!raw) return null
  let packed: Partial<Packed>
  try {
    packed = JSON.parse(raw) as Partial<Packed>
  } catch {
    return null
  }
  if (packed?.kind !== 'gp-section' || typeof packed.version !== 'number' || !packed.item) {
    return null
  }
  const parsed = parsePageContent({
    version: packed.version,
    data: { root: { props: {} }, content: [packed.item] },
  })
  if (!parsed.success) return null
  const [item] = parsed.data.data.content
  return item ? (item as unknown as SectionItem) : null
}

const isPiece = (value: unknown): value is SectionItem =>
  Boolean(value) &&
  typeof value === 'object' &&
  typeof (value as SectionItem).type === 'string' &&
  Boolean((value as SectionItem).props) &&
  typeof (value as SectionItem).props.id === 'string'

/**
 * A mesma seção com identificação nova, nela e nas peças de dentro (as Colunas): duas seções com a
 * mesma identificação confundiriam a escolha e o arrastar do editor.
 */
export function withNewIds(
  item: SectionItem,
  makeId: (type: string) => string = (type) => `${type}-${crypto.randomUUID()}`,
): SectionItem {
  const props = Object.fromEntries(
    Object.entries(item.props).map(([key, value]) => [
      key,
      Array.isArray(value) && value.length > 0 && value.every(isPiece)
        ? value.map((piece) => withNewIds(piece, makeId))
        : value,
    ]),
  )
  return { type: item.type, props: { ...props, id: makeId(item.type) } }
}
