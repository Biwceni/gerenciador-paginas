import type { Data } from '@puckeditor/core'

import { COLUMN_PIECES } from '@/puck/config'
import { LIMITS } from '@/puck/limits'

import { ROOT_ZONE } from './puck'

const PIECES: readonly string[] = COLUMN_PIECES
const SLOTS = ['column1', 'column2', 'column3'] as const

/** Quantos itens cabem numa área: seções na página, peças numa coluna. */
export function zoneMax(zone: string | undefined): number {
  return !zone || zone === ROOT_ZONE ? LIMITS.sections : LIMITS.columnPieces
}

/** Por que não dá para pôr mais um item na área cheia (aparece embaixo do botão desligado). */
export function fullZoneReason(zone: string | undefined): string {
  if (!zone || zone === ROOT_ZONE) {
    return `A página já tem ${LIMITS.sections} seções, o máximo. Remova uma para colocar outra.`
  }
  const column = zone.split(':')[1]?.replace('column', '') ?? ''
  return `A Coluna ${column} já tem ${LIMITS.columnPieces} peças, o máximo. Tire uma peça ou use outra coluna.`
}

/**
 * Uma mudança deixou a página fora do que dá para salvar (mais seções ou peças que o máximo, ou
 * uma peça solta fora das Colunas)? Devolve o aviso para a pessoa, ou `null` se está tudo certo.
 */
export function layoutProblem(data: Data): string | null {
  if (data.content.some((item) => PIECES.includes(item.type))) {
    return 'Essa peça só entra dentro de uma seção Colunas. Arraste para dentro de uma coluna.'
  }
  if (data.content.length > LIMITS.sections) return fullZoneReason(ROOT_ZONE)
  for (const item of data.content) {
    if (item.type !== 'Columns') continue
    for (const slot of SLOTS) {
      const pieces: unknown = item.props[slot]
      if (Array.isArray(pieces) && pieces.length > LIMITS.columnPieces) {
        return fullZoneReason(`${item.props.id}:${slot}`)
      }
    }
  }
  return null
}
