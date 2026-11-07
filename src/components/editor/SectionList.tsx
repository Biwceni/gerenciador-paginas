'use client'

import { toast } from '@payloadcms/ui'
import React from 'react'

import { PanelIcon } from '@/components/panel/PanelIcon'
import { type Components, COLUMN_PIECES, PIECE_LABELS, SECTION_LABELS } from '@/puck/config'
import { insertIndex } from '@/puck/insertPosition'

import { useAddSection } from './insert'
import { usePuck } from './puck'
import { SECTION_DESCRIPTIONS, SectionThumb } from './SectionThumb'

const PIECES: readonly string[] = COLUMN_PIECES
const LABELS: Record<string, string> = { ...SECTION_LABELS, ...PIECE_LABELS }

/** Fecha o painel de baixo no celular (no computador, o botão não aparece). */
export function ClosePanel() {
  const dispatch = usePuck((s) => s.dispatch)
  return (
    <button
      aria-label="Fechar"
      className="ed-icon-btn ed-panel__close"
      onClick={() =>
        dispatch({ type: 'setUi', ui: { leftSideBarVisible: false }, recordHistory: false })
      }
      type="button"
    >
      <PanelIcon name="x" />
    </button>
  )
}

/** Painel "Adicionar seção" (override do Puck), em volta das listas de seções e de peças. */
export function EditorDrawer({ children }: { children?: React.ReactNode }) {
  // A seção que a nova vai seguir: a frase diz o que o clique vai fazer antes de clicar.
  const above = usePuck((s) => {
    const { itemSelector } = s.appState.ui
    if (!itemSelector) return null
    const { content } = s.appState.data
    return content[insertIndex(content, itemSelector) - 1]?.type ?? null
  })
  const hint = above
    ? `Clique para colocar abaixo de “${LABELS[above] ?? above}”, ou arraste até o lugar.`
    : 'Clique para colocar no fim da página, ou arraste até o lugar.'

  return (
    <div className="ed-panel">
      <ClosePanel />
      <div>
        <h3>Adicionar seção</h3>
        <p className="ed-hint">{hint}</p>
      </div>
      {children}
    </div>
  )
}

/** Uma seção da lista (override do Puck): clicar coloca na página; arrastar é com o Puck. */
export function EditorDrawerItem({ name }: { name: string; children?: React.ReactNode }) {
  const addSection = useAddSection()
  const add = () => {
    if (PIECES.includes(name)) {
      toast.info(
        'Essa peça só entra dentro de uma seção Colunas. Arraste para dentro de uma coluna.',
      )
    } else {
      addSection(name)
    }
  }

  return (
    // O botão (foco, papel e nome) é o item do Puck em volta deste, que o dnd-kit já deixa focável:
    // um segundo botão aqui dentro seria um botão dentro de outro (axe nested-interactive).
    <div
      className="ed-palitem"
      onClick={add}
      ref={(element) => {
        if (!element) return
        // O Puck desenha cada item duas vezes: a cópia de trás é só o que fica no lugar ao arrastar.
        if (element.closest('[class*="Drawer-draggableBg"]')) {
          element.setAttribute('inert', '')
          return
        }
        // Enter e espaço no item colocam a seção, como o clique (sem isto, o dnd-kit começaria a
        // arrastar pelo teclado). Escuta na captura, antes do dnd-kit, no próprio item do Puck.
        const item = element.closest<HTMLElement>('[data-puck-drawer-item]')
        if (!item) return
        const onKey = (event: KeyboardEvent) => {
          if (event.target !== item || (event.key !== 'Enter' && event.key !== ' ')) return
          event.preventDefault()
          event.stopImmediatePropagation()
          add()
        }
        item.addEventListener('keydown', onKey, { capture: true })
        return () => item.removeEventListener('keydown', onKey, { capture: true })
      }}
    >
      <SectionThumb type={name as keyof Components} />
      <span>
        <b>{LABELS[name] ?? name}</b>
        <span>{SECTION_DESCRIPTIONS[name as keyof Components]}</span>
      </span>
    </div>
  )
}
