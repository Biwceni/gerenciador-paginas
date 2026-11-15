'use client'

import { useGetPuck } from '@puckeditor/core'
import React, { useState, useSyncExternalStore } from 'react'

import { COLUMN_LAYOUTS } from '@/puck/schema'

import { ChoiceThumb, type ChoiceThumbName } from './ChoiceThumbs'
import { Dialog } from './Dialog'

// "Como dividir as colunas?" (C3): toda seção Colunas nova pergunta o desenho antes, como o
// "Selecione sua estrutura" do Elementor. "Duas iguais" já vem marcada; fechar cancela.

let pending: string | null = null
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const setPending = (next: string | null) => {
  pending = next
  listeners.forEach((listener) => listener())
}

let silent = false

/** A remoção que acabou de acontecer foi o Cancelar desta janela (sem aviso de "Desfazer"). */
export const wasLayoutCancel = () => {
  const was = silent
  silent = false
  return was
}

/** Uma seção Colunas acabou de entrar na página: pergunta como dividir. */
export const askColumnsLayout = (sectionId: string) => setPending(sectionId)

const LAYOUT_LABELS: Record<(typeof COLUMN_LAYOUTS)[number], string> = {
  half: 'Duas iguais',
  thirds: 'Três iguais',
  'wide-left': 'Larga e estreita',
  'wide-right': 'Estreita e larga',
  fourths: 'Quatro iguais',
}

export function ColumnsLayoutPicker() {
  const sectionId = useSyncExternalStore(
    subscribe,
    () => pending,
    () => null,
  )
  if (!sectionId) return null
  return <LayoutDialog key={sectionId} sectionId={sectionId} />
}

function LayoutDialog({ sectionId }: { sectionId: string }) {
  const getPuck = useGetPuck()
  const [layout, setLayout] = useState<(typeof COLUMN_LAYOUTS)[number]>('half')

  const cancel = () => {
    setPending(null)
    const puck = getPuck()
    const selector = puck.getSelectorForId(sectionId)
    if (!selector) return
    // Tira a seção que acabou de entrar, sem o aviso "Seção removida": a pessoa desistiu.
    silent = true
    puck.dispatch({
      type: 'remove',
      index: selector.index,
      zone: selector.zone,
      recordHistory: false,
    })
  }

  const place = () => {
    setPending(null)
    const puck = getPuck()
    const item = puck.getItemById(sectionId)
    const selector = puck.getSelectorForId(sectionId)
    if (!item || !selector || item.props.layout === layout) return
    puck.dispatch({
      type: 'replace',
      destinationIndex: selector.index,
      destinationZone: selector.zone,
      data: { ...item, props: { ...item.props, layout } },
    })
  }

  return (
    <Dialog
      description="Escolha o desenho. Dá para trocar depois, na aba Aparência da seção."
      footer={
        <>
          <button className="ed-btn" onClick={cancel} type="button">
            Cancelar
          </button>
          <button autoFocus className="ed-btn ed-btn--primary" onClick={place} type="button">
            Colocar na página
          </button>
        </>
      }
      onClose={cancel}
      title="Como dividir as colunas?"
    >
      <div aria-label="Desenho das colunas" className="ed-thumbs ed-thumbs--3" role="radiogroup">
        {COLUMN_LAYOUTS.map((value) => (
          <label className="ed-thumb" key={value}>
            <input
              checked={layout === value}
              className="ed-thumb__input"
              name="ed-columns-layout"
              onChange={() => setLayout(value)}
              type="radio"
              value={value}
            />
            <ChoiceThumb name={`cols-${value}` as ChoiceThumbName} />
            <span className="ed-thumb__text">
              <b>{LAYOUT_LABELS[value]}</b>
            </span>
          </label>
        ))}
      </div>
    </Dialog>
  )
}
