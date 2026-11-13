import { LIMITS } from '@/puck/limits'
import { COLUMN_COUNT } from '@/puck/schema'

import { ROOT_ZONE } from './puck'

type Item = { type: string; props: Record<string, unknown> & { id: string } }

/** Uma coluna de uma seção Colunas, como aparece na pergunta "em qual coluna?". */
export type ColumnSlot = { n: 1 | 2 | 3; zone: string; count: number; full: boolean }

/** Uma seção Colunas da página, com as colunas que estão à vista no modelo escolhido. */
export type ColumnsSection = { id: string; index: number; columns: ColumnSlot[] }

/** Quantas colunas o modelo mostra: só "Três iguais" tem a terceira. */
const visibleColumns = (layout: unknown): number =>
  COLUMN_COUNT[layout as keyof typeof COLUMN_COUNT] ?? 2

const piecesIn = (item: Item, n: number): unknown[] => {
  const pieces = item.props[`column${n}`]
  return Array.isArray(pieces) ? pieces : []
}

/**
 * As seções Colunas da página e qual delas vem marcada na pergunta: a escolhida, a que tem a peça
 * escolhida, ou a primeira.
 */
export function columnTargets(
  content: readonly Item[],
  selector: { index: number; zone?: string } | null | undefined,
): { sections: ColumnsSection[]; preferred: string | null } {
  const sections: ColumnsSection[] = []
  content.forEach((item, index) => {
    if (item.type !== 'Columns') return
    const total = visibleColumns(item.props.layout)
    const columns: ColumnSlot[] = []
    for (let n = 1; n <= total; n++) {
      const count = piecesIn(item, n).length
      columns.push({
        n: n as 1 | 2 | 3,
        zone: `${item.props.id}:column${n}`,
        count,
        full: count >= LIMITS.columnPieces,
      })
    }
    sections.push({ id: item.props.id, index, columns })
  })

  let preferred: string | null = null
  if (selector) {
    if (!selector.zone || selector.zone === ROOT_ZONE) {
      const chosen = content[selector.index]
      if (chosen?.type === 'Columns') preferred = chosen.props.id
    } else {
      const parentId = selector.zone.split(':')[0]
      if (sections.some((section) => section.id === parentId)) preferred = parentId
    }
  }
  return { sections, preferred: preferred ?? sections[0]?.id ?? null }
}

/**
 * Onde a peça entra na coluna: logo abaixo da peça escolhida, se ela está nessa coluna; senão, no
 * fim da coluna.
 */
export function pieceIndex(
  slot: ColumnSlot,
  selector: { index: number; zone?: string } | null | undefined,
): number {
  if (selector?.zone === slot.zone) return Math.min(selector.index + 1, slot.count)
  return slot.count
}
