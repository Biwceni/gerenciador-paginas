'use client'

import { toast } from '@payloadcms/ui'
import { useGetPuck } from '@puckeditor/core'
import { useCallback } from 'react'

import { LIMITS } from '@/puck/limits'
import { COLUMN_COUNT } from '@/puck/schema'

import { showUndo } from './undoToast'

/** A seção e a coluna de uma área de peças (`Columns-1:column2` → `Columns-1`, 2). */
export function parseColumnZone(zone: string | undefined): { sectionId: string; n: number } | null {
  const match = zone ? /^(.+):column(\d)$/.exec(zone) : null
  return match ? { sectionId: match[1], n: Number(match[2]) } : null
}

/** Quantas colunas o modelo mostra. */
export const columnCount = (layout: unknown): number =>
  COLUMN_COUNT[layout as keyof typeof COLUMN_COUNT] ?? 2

/**
 * Leva uma peça para o fim de outra coluna da mesma seção, sem arrastar (C2): no celular não dá
 * para arrastar, e no computador é mais fácil acertar com um toque. A peça continua escolhida, e
 * o aviso traz Desfazer.
 */
export function useMovePiece() {
  const getPuck = useGetPuck()
  return useCallback(
    (sectionId: string, from: number, index: number, to: number) => {
      const { appState, dispatch, history } = getPuck()
      const section = appState.data.content.find((item) => item.props.id === sectionId)
      const target: unknown = section?.props[`column${to}`]
      const count = Array.isArray(target) ? target.length : 0
      if (count >= LIMITS.columnPieces) {
        toast.error(`A Coluna ${to} já tem ${LIMITS.columnPieces} peças. Tire uma antes.`)
        return
      }
      const zone = `${sectionId}:column${to}`
      dispatch({
        type: 'move',
        sourceIndex: index,
        sourceZone: `${sectionId}:column${from}`,
        destinationIndex: count,
        destinationZone: zone,
        recordHistory: false,
      })
      // Só aqui entra no Desfazer, com a peça escolhida no lugar novo.
      dispatch({ type: 'setUi', ui: { itemSelector: { index: count, zone } }, recordHistory: true })
      showUndo(`A peça foi para a Coluna ${to}.`, () => history.back())
    },
    [getPuck],
  )
}
