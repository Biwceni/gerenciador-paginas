'use client'

import { toast } from '@payloadcms/ui'
import { useGetPuck } from '@puckeditor/core'
import React, { useEffect, useRef, useState } from 'react'

import { PIECE_LABELS } from '@/puck/config'
import { LIMITS } from '@/puck/limits'
import { COLUMN_COUNT } from '@/puck/schema'

import { columnCount } from './columnMove'

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
/**
 * Botão que funciona também dentro de uma seção na prévia. O Puck ouve o clique na seção e para a
 * propagação antes de o React ver o evento, então o `onClick` do React nunca chega: aqui o clique é
 * ouvido no próprio botão, antes da seção, e não escolhe a seção por baixo dele.
 */
function PreviewButton({
  children,
  className,
  disabled,
  onPress,
}: {
  children: React.ReactNode
  className: string
  disabled?: boolean
  onPress: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const press = useRef(onPress)
  useEffect(() => {
    press.current = onPress
  })
  useEffect(() => {
    const button = ref.current
    if (!button) return
    const onClick = (event: MouseEvent) => {
      event.stopPropagation()
      press.current()
    }
    button.addEventListener('click', onClick)
    return () => button.removeEventListener('click', onClick)
  }, [])
  return (
    <button className={className} disabled={disabled} ref={ref} type="button">
      {children}
    </button>
  )
}

function Shortcuts({ sectionId, n, full }: { sectionId: string; n: number; full: boolean }) {
  const add = useAddPiece()
  return (
    <div aria-label={`Pôr na Coluna ${n}`} className="ed-piece-add" role="group">
      {PIECE_SHORTCUTS.map((shortcut) => (
        <PreviewButton
          className="ed-piece-add__btn"
          disabled={full}
          key={shortcut.type}
          onPress={() => add(sectionId, n, shortcut.type)}
        >
          <span aria-hidden="true">+ </span>
          {shortcut.label}
        </PreviewButton>
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

/** A seção Colunas (ou uma peça dela) está escolhida: a prévia mostra os selos e os "+" (C1). */
function useColumnsActive(sectionId: string) {
  return usePuck((s) => {
    if (s.selectedItem?.props.id === sectionId) return true
    return Boolean(s.appState.ui.itemSelector?.zone?.startsWith(`${sectionId}:`))
  })
}

/** Onde a coluna fica no computador, para o selo do celular (C5). */
function wherePlaced(n: number, total: number): string {
  if (n === 1) return 'à esquerda'
  if (n === total) return 'à direita'
  return total === 3 ? 'no meio' : `${n}ª da esquerda`
}

/**
 * Na prévia, em cima de cada coluna: "Coluna 1". No celular, onde as colunas ficam uma embaixo da
 * outra, diz também onde ela fica no computador (C1 e C5). Só com a seção escolhida.
 */
export function ColumnTag({ sectionId, n }: { sectionId: string; n: number }) {
  const active = useColumnsActive(sectionId)
  const total = usePuck((s) =>
    columnCount(s.appState.data.content.find((item) => item.props.id === sectionId)?.props.layout),
  )
  if (!active) return null
  return (
    <span className="columns__tag">
      Coluna {n}
      <span className="columns__tag-where"> · no computador, {wherePlaced(n, total)}</span>
    </span>
  )
}

/**
 * Na prévia, no fim de cada coluna: vazia, um quadro tracejado com os atalhos; com peças e a seção
 * escolhida, o botão "+ Peça nesta coluna", que abre os mesmos atalhos (C1).
 */
export function EmptyColumn({ sectionId, n }: { sectionId: string; n: number }) {
  const count = usePuck((s) => {
    const section = s.appState.data.content.find((item) => item.props.id === sectionId)
    return piecesOf(section as Piece | undefined, n).length
  })
  const active = useColumnsActive(sectionId)
  const [open, setOpen] = useState(false)
  if (count === 0) {
    return (
      <div className="columns__empty">
        <span className="columns__empty-text">Coluna {n} vazia. Ponha uma peça:</span>
        <Shortcuts full={false} n={n} sectionId={sectionId} />
      </div>
    )
  }
  if (!active || count >= LIMITS.columnPieces) return null
  if (!open) {
    return (
      <PreviewButton className="columns__add" onPress={() => setOpen(true)}>
        + Peça nesta coluna
      </PreviewButton>
    )
  }
  return (
    <div className="columns__empty columns__empty--more">
      <span className="columns__empty-text">Pôr na Coluna {n}:</span>
      <Shortcuts full={false} n={n} sectionId={sectionId} />
    </div>
  )
}
