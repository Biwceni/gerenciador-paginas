import type { Data } from '@puckeditor/core'

import { COLUMN_PIECES } from '@/puck/config'
import { LIMITS } from '@/puck/limits'
import { COLUMN_COUNT, COLUMN_SLOTS } from '@/puck/schema'

import { ROOT_ZONE } from './puck'

const PIECES: readonly string[] = COLUMN_PIECES
const SLOTS = COLUMN_SLOTS

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

/**
 * As Colunas passaram para um modelo com menos colunas e as que saíram tinham peças (achado 8.5):
 * elas somem da página, mas ficam guardadas. Devolve o aviso, ou `null`.
 */
export function hiddenColumnNotice(next: Data, previous: Data): string | null {
  const count = (layout: unknown) => COLUMN_COUNT[layout as keyof typeof COLUMN_COUNT] ?? 2
  for (const item of next.content) {
    if (item.type !== 'Columns') continue
    const before = previous.content.find((old) => old.props.id === item.props.id)
    if (!before) continue
    const now = count(item.props.layout)
    const was = count(before.props.layout)
    if (now >= was) continue
    const hidden = SLOTS.slice(now, was).flatMap((slot, at) => {
      const pieces: unknown = item.props[slot]
      const n = Array.isArray(pieces) ? pieces.length : 0
      return n ? [{ column: now + at + 1, n }] : []
    })
    if (!hidden.length) continue
    const total = hidden.reduce((sum, entry) => sum + entry.n, 0)
    const where = hidden.map((entry) => `Coluna ${entry.column}`).join(' e da ')
    const what =
      total === 1
        ? `A peça da ${where} fica guardada`
        : `As ${total} peças da ${where} ficam guardadas`
    return `${what}, sem aparecer na página. ${total === 1 ? 'Ela volta' : 'Elas voltam'} se você escolher um modelo com ${was} colunas de novo.`
  }
  return null
}
