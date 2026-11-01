'use client'

import React from 'react'

import { PanelIcon } from '@/components/panel/PanelIcon'

import { useOpenSectionList } from './insert'
import { usePuck } from './puck'

/** Página sem seções, na prévia. O botão só aparece quando abrir a lista muda algo na tela. */
export function EmptyPage() {
  const empty = usePuck((s) => s.appState.data.content.length === 0)
  const listOpen = usePuck(
    (s) => s.appState.ui.leftSideBarVisible && s.appState.ui.plugin.current === 'blocks',
  )
  const open = useOpenSectionList()
  if (!empty) return null

  return (
    <div className="editor-empty">
      <h2>Página vazia</h2>
      {listOpen ? (
        <p>Escolha uma seção na lista para começar.</p>
      ) : (
        <>
          <p>Comece colocando a primeira seção.</p>
          <button
            className="button"
            onClick={(event) => {
              // A prévia do Puck tira a seleção em qualquer clique que chega até ela.
              event.stopPropagation()
              open()
            }}
            type="button"
          >
            <PanelIcon name="plus" size={16} /> Adicionar seção
          </button>
        </>
      )}
    </div>
  )
}
