'use client'

import { toast } from '@payloadcms/ui'
import { useGetPuck } from '@puckeditor/core'
import React, { useState, useSyncExternalStore } from 'react'

import { PIECE_LABELS } from '@/puck/config'
import { LIMITS } from '@/puck/limits'

import { columnTargets, type ColumnSlot, pieceIndex } from './columnTargets'
import { Dialog } from './Dialog'
import { scrollToSection, useAddSection } from './insert'
import { usePuck } from './puck'

// Pedido de "colocar esta peça": o item do catálogo pede, a pergunta abre por cima do catálogo.
let request: string | null = null
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const setRequest = (next: string | null) => {
  request = next
  listeners.forEach((listener) => listener())
}

/** Pede para colocar uma peça (Foto, Botão, Título e texto) numa coluna. */
export const requestPiece = (type: string) => setRequest(type)

const LABELS: Record<string, string> = PIECE_LABELS
const article = (type: string) => (type === 'ColumnImage' ? 'a' : 'o')
const ordinal = (n: number) => `${n}ª`
const countText = (slot: ColumnSlot) =>
  slot.full
    ? `cheia (${LIMITS.columnPieces} peças)`
    : slot.count === 0
      ? 'vazia'
      : `${slot.count} ${slot.count === 1 ? 'peça' : 'peças'}`

/**
 * "Colocar a Foto em qual coluna?" (achados 8.1 e 8.2): tocar ou clicar numa peça do catálogo
 * pergunta a coluna, com as colunas desenhadas. Funciona igual no celular, onde não dá para
 * arrastar, e no computador. O catálogo continua aberto, para colocar várias peças seguidas.
 */
export function ColumnPicker() {
  const type = useSyncExternalStore(
    subscribe,
    () => request,
    () => null,
  )
  if (!type) return null
  return <PickerDialog key={type} type={type} />
}

function PickerDialog({ type }: { type: string }) {
  const getPuck = useGetPuck()
  const addSection = useAddSection()
  const content = usePuck((s) => s.appState.data.content)
  const selector = usePuck((s) => s.appState.ui.itemSelector)
  const { sections, preferred } = columnTargets(content, selector)
  const [chosen, setChosen] = useState<string | null>(null)
  const section = sections.find((item) => item.id === (chosen ?? preferred)) ?? sections[0]
  const label = LABELS[type] ?? 'peça'
  const close = () => setRequest(null)

  const place = (slot: ColumnSlot) => {
    const { dispatch } = getPuck()
    const destinationIndex = pieceIndex(slot, selector)
    dispatch({
      type: 'insert',
      componentType: type,
      destinationIndex,
      destinationZone: slot.zone,
      recordHistory: true,
    })
    close()
    const added = getPuck().getItemBySelector({ index: destinationIndex, zone: slot.zone })
    if (added) scrollToSection(String(added.props.id))
    toast.success(`${label} colocad${article(type)} na Coluna ${slot.n}.`)
  }

  if (!section) {
    return (
      <Dialog
        footer={
          <>
            <button className="ed-btn" onClick={close} type="button">
              Cancelar
            </button>
            <button
              autoFocus
              className="ed-btn ed-btn--primary"
              // A seção nova fica escolhida, e a pergunta continua: agora com as colunas dela.
              onClick={() => addSection('Columns')}
              type="button"
            >
              Colocar uma seção Colunas
            </button>
          </>
        }
        onClose={close}
        title={`${article(type) === 'a' ? 'A' : 'O'} ${label} entra numa seção Colunas`}
      >
        <p>
          Esta página ainda não tem uma seção Colunas. Coloque uma e depois escolha em qual coluna{' '}
          {article(type)} {label} entra.
        </p>
      </Dialog>
    )
  }

  return (
    <Dialog
      footer={
        <button className="ed-btn" onClick={close} type="button">
          Cancelar
        </button>
      }
      onClose={close}
      title={`Colocar ${article(type)} ${label} em qual coluna?`}
    >
      {sections.length > 1 && (
        <fieldset className="ed-colpick__sections">
          <legend>Em qual seção Colunas</legend>
          {sections.map((item) => (
            <label key={item.id}>
              <input
                checked={item.id === section.id}
                name="ed-colpick-section"
                onChange={() => setChosen(item.id)}
                type="radio"
              />
              Colunas, {ordinal(item.index + 1)} seção da página
            </label>
          ))}
        </fieldset>
      )}
      <div className={`ed-colpick ed-colpick--${section.columns.length}`}>
        {section.columns.map((slot) => (
          <button
            aria-describedby={slot.full ? 'ed-colpick-full' : undefined}
            className="ed-colpick__col"
            disabled={slot.full}
            key={slot.zone}
            onClick={() => place(slot)}
            type="button"
          >
            <span className="ed-colpick__pieces" aria-hidden="true">
              {Array.from({ length: Math.min(slot.count, 3) }, (_, at) => (
                <span key={at} />
              ))}
            </span>
            <b>Coluna {slot.n}</b>
            <span className="ed-hint">{countText(slot)}</span>
          </button>
        ))}
      </div>
      {section.columns.some((slot) => slot.full) && (
        <p className="ed-hint" id="ed-colpick-full">
          Uma coluna cheia já tem {LIMITS.columnPieces} peças. Tire uma peça dela ou use outra
          coluna.
        </p>
      )}
    </Dialog>
  )
}
