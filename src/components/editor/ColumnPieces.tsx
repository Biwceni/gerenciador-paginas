'use client'

import { toast } from '@payloadcms/ui'
import { useGetPuck } from '@puckeditor/core'
import React from 'react'

import { PIECE_LABELS } from '@/puck/config'
import { LIMITS } from '@/puck/limits'
import { COLUMN_COUNT } from '@/puck/schema'

import { snippet } from './ItemSummary'
import { usePuck } from './puck'

// Peças das Colunas sem arrastar (componentes, C13, achados Columns-1 a 3 e PK-slot): no painel,
// a lista de peças de cada coluna com os atalhos "+ Título, + Texto, + Foto, + Botão"; na prévia,
// a coluna vazia vira um quadro tracejado com os mesmos atalhos.

type Piece = { type: string; props: Record<string, unknown> }

/** Os atalhos, na ordem em que aparecem. */
export const PIECE_SHORTCUTS = [
  { type: 'ColumnTitle', label: 'Título' },
  { type: 'ColumnText', label: 'Texto' },
  { type: 'ColumnImage', label: 'Foto' },
  { type: 'ColumnButton', label: 'Botão' },
] as const

const LABELS: Record<string, string> = PIECE_LABELS

/** O nome de uma peça na lista: o tipo e o começo do que ela diz. */
export function pieceName(piece: Piece): string {
  const props = piece.props
  const button = props.button as { label?: string } | null | undefined
  const said =
    piece.type === 'ColumnButton'
      ? button?.label
      : piece.type === 'ColumnImage'
        ? (props.caption as string | undefined)
        : (props.title as string | undefined) || (props.text as string | undefined)
  const detail = snippet(typeof said === 'string' ? said : '', 28)
  return detail ? `${LABELS[piece.type] ?? 'Peça'}: ${detail}` : (LABELS[piece.type] ?? 'Peça')
}

const piecesOf = (section: Piece | undefined, n: number): Piece[] => {
  const pieces = section?.props[`column${n}`]
  return Array.isArray(pieces) ? (pieces as Piece[]) : []
}

/** Põe uma peça no fim da coluna e deixa ela escolhida, com as opções dela abertas. */
function useAddPiece() {
  const getPuck = useGetPuck()
  return (sectionId: string, n: number, type: string) => {
    const { appState, dispatch } = getPuck()
    const section = appState.data.content.find((item) => item.props.id === sectionId)
    const count = piecesOf(section as Piece | undefined, n).length
    if (count >= LIMITS.columnPieces) {
      toast.error(`A Coluna ${n} já tem ${LIMITS.columnPieces} peças. Tire uma antes.`)
      return
    }
    const zone = `${sectionId}:column${n}`
    dispatch({
      type: 'insert',
      componentType: type,
      destinationIndex: count,
      destinationZone: zone,
      recordHistory: true,
    })
    dispatch({ type: 'setUi', ui: { itemSelector: { index: count, zone } }, recordHistory: false })
  }
}

/** "+ Título, + Texto, + Foto, + Botão" de uma coluna. */
function Shortcuts({ sectionId, n, full }: { sectionId: string; n: number; full: boolean }) {
  const add = useAddPiece()
  return (
    <div aria-label={`Pôr na Coluna ${n}`} className="ed-piece-add" role="group">
      {PIECE_SHORTCUTS.map((shortcut) => (
        <button
          className="ed-piece-add__btn"
          disabled={full}
          key={shortcut.type}
          onClick={(event) => {
            // Na prévia, o clique não escolhe a seção por baixo do botão.
            event.stopPropagation()
            add(sectionId, n, shortcut.type)
          }}
          type="button"
        >
          <span aria-hidden="true">+ </span>
          {shortcut.label}
        </button>
      ))}
    </div>
  )
}

/** Painel da seção Colunas: as peças de cada coluna e os atalhos para pôr mais. */
export function ColumnPiecesField() {
  const getPuck = useGetPuck()
  const section = usePuck((s) => s.selectedItem) as (Piece & { props: { id: string } }) | null
  if (!section || section.type !== 'Columns') return null
  const total = COLUMN_COUNT[section.props.layout as keyof typeof COLUMN_COUNT] ?? 2
  const select = (zone: string, index: number) =>
    getPuck().dispatch({ type: 'setUi', ui: { itemSelector: { index, zone } } })

  return (
    <div className="ed-pieces">
      {Array.from({ length: total }, (_, at) => {
        const n = at + 1
        const pieces = piecesOf(section, n)
        const zone = `${section.props.id}:column${n}`
        return (
          <section aria-label={`Coluna ${n}`} className="ed-pieces__column" key={n}>
            <h4 className="ed-pieces__title">
              Coluna {n}
              <span className="ed-hint">
                {pieces.length ? ` · ${pieces.length} de ${LIMITS.columnPieces}` : ' · vazia'}
              </span>
            </h4>
            {pieces.length > 0 && (
              <ol className="ed-pieces__list">
                {pieces.map((piece, index) => (
                  <li key={String(piece.props.id ?? index)}>
                    <button
                      className="ed-pieces__item"
                      onClick={() => select(zone, index)}
                      type="button"
                    >
                      {pieceName(piece)}
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <Shortcuts
              full={pieces.length >= LIMITS.columnPieces}
              n={n}
              sectionId={section.props.id}
            />
          </section>
        )
      })}
    </div>
  )
}

/** Na prévia: a coluna vazia vira um quadro tracejado com os atalhos. Com peças, nada. */
export function EmptyColumn({ sectionId, n }: { sectionId: string; n: number }) {
  const empty = usePuck((s) => {
    const section = s.appState.data.content.find((item) => item.props.id === sectionId)
    return piecesOf(section as Piece | undefined, n).length === 0
  })
  if (!empty) return null
  return (
    <div className="columns__empty">
      <span className="columns__empty-text">Coluna {n} vazia. Ponha uma peça:</span>
      <Shortcuts full={false} n={n} sectionId={sectionId} />
    </div>
  )
}
