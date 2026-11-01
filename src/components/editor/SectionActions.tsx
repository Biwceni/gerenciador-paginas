'use client'

import { ActionBar, useGetPuck } from '@puckeditor/core'
import React, { useCallback } from 'react'

import { PanelIcon } from '@/components/panel/PanelIcon'

import { scrollToSection } from './insert'
import { ROOT_ZONE, usePuck } from './puck'

/** Muda uma seção de lugar. A escolha vai junto: o Puck guarda a posição, não a seção. */
export function useMoveSection() {
  const getPuck = useGetPuck()
  return useCallback(
    (zone: string, from: number, to: number) => {
      const { dispatch, getItemBySelector } = getPuck()
      const id = getItemBySelector({ index: from, zone })?.props.id
      dispatch({
        type: 'reorder',
        sourceIndex: from,
        destinationIndex: to,
        destinationZone: zone,
        recordHistory: false,
      })
      // Só aqui entra no Desfazer, para voltar com a escolha certa (como faz o arrastar do Puck).
      dispatch({ type: 'setUi', ui: { itemSelector: { index: to, zone } }, recordHistory: true })
      if (id) scrollToSection(id)
    },
    [getPuck],
  )
}

/** Quantos itens tem a área: a página ou uma coluna (as colunas só existem na página). */
function useZoneSize(zone: string | undefined): number {
  return usePuck((s) => {
    const { content } = s.appState.data
    if (!zone || zone === ROOT_ZONE) return content.length
    const [parentId, slot] = zone.split(':')
    const parent = content.find((item) => item.props.id === parentId)
    const items: unknown = parent?.props[slot]
    return Array.isArray(items) ? items.length : 0
  })
}

/** Subir e descer a seção escolhida, sem passar da primeira nem da última. */
function useSelectedMoves() {
  const selector = usePuck((s) => s.appState.ui.itemSelector)
  const size = useZoneSize(selector?.zone)
  const move = useMoveSection()
  const index = selector?.index ?? 0
  const zone = selector?.zone ?? ROOT_ZONE
  return {
    canGoUp: Boolean(selector) && index > 0,
    canGoDown: Boolean(selector) && index < size - 1,
    up: () => move(zone, index, index - 1),
    down: () => move(zone, index, index + 1),
  }
}

/** Barra da seção escolhida, na prévia (override do Puck). Duplicar e Remover vêm dele. */
export function EditorActionBar({
  children,
  label,
  parentAction,
}: {
  children: React.ReactNode
  label?: string
  parentAction: React.ReactNode
}) {
  const { canGoUp, canGoDown, up, down } = useSelectedMoves()
  return (
    <ActionBar>
      <ActionBar.Group>
        {parentAction}
        {label && <ActionBar.Label label={label} />}
      </ActionBar.Group>
      <ActionBar.Group>
        <ActionBar.Action disabled={!canGoUp} label="Subir" onClick={up}>
          <PanelIcon name="up" size={16} />
        </ActionBar.Action>
        <ActionBar.Action disabled={!canGoDown} label="Descer" onClick={down}>
          <PanelIcon name="down" size={16} />
        </ActionBar.Action>
        {children}
      </ActionBar.Group>
    </ActionBar>
  )
}

/** As mesmas ações no fim do painel de opções. */
export function SectionActionsPanel() {
  const dispatch = usePuck((s) => s.dispatch)
  const selector = usePuck((s) => s.appState.ui.itemSelector)
  const { canGoUp, canGoDown, up, down } = useSelectedMoves()
  if (!selector) return null

  return (
    <div className="ed-section-actions">
      <button className="ed-btn ed-btn--sm" disabled={!canGoUp} onClick={up} type="button">
        <PanelIcon name="up" size={14} /> Subir
      </button>
      <button className="ed-btn ed-btn--sm" disabled={!canGoDown} onClick={down} type="button">
        <PanelIcon name="down" size={14} /> Descer
      </button>
      <button
        className="ed-btn ed-btn--sm"
        onClick={() =>
          dispatch({
            type: 'duplicate',
            sourceIndex: selector.index,
            sourceZone: selector.zone ?? ROOT_ZONE,
          })
        }
        type="button"
      >
        <PanelIcon name="copy" size={14} /> Duplicar
      </button>
      <button
        className="ed-btn ed-btn--sm ed-btn--danger"
        onClick={() =>
          dispatch({ type: 'remove', index: selector.index, zone: selector.zone ?? ROOT_ZONE })
        }
        type="button"
      >
        <PanelIcon name="trash" size={14} /> Remover
      </button>
    </div>
  )
}
