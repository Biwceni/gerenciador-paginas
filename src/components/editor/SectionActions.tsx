'use client'

import { ActionBar, useGetPuck } from '@puckeditor/core'
import React, { useCallback } from 'react'

import { PanelIcon } from '@/components/panel/PanelIcon'

import { scrollToSection } from './insert'
import { ROOT_ZONE, usePuck } from './puck'
import { fullZoneReason, zoneMax } from './zoneLimits'

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

/**
 * Ações da seção (ou peça) escolhida: subir e descer sem passar da primeira nem da última,
 * duplicar só enquanto a área tem espaço (100 seções na página, 6 peças na coluna) e remover.
 * São botões nossos, e não os do Puck, para o Duplicar respeitar o limite em todo lugar.
 */
function useSelectedActions() {
  const selector = usePuck((s) => s.appState.ui.itemSelector)
  const dispatch = usePuck((s) => s.dispatch)
  const size = useZoneSize(selector?.zone)
  const move = useMoveSection()
  const index = selector?.index ?? 0
  const zone = selector?.zone ?? ROOT_ZONE
  const full = size >= zoneMax(zone)
  return {
    canGoUp: Boolean(selector) && index > 0,
    canGoDown: Boolean(selector) && index < size - 1,
    canDuplicate: Boolean(selector) && !full,
    fullReason: full ? fullZoneReason(zone) : null,
    up: () => move(zone, index, index - 1),
    down: () => move(zone, index, index + 1),
    duplicate: () => {
      if (!selector || full) return
      dispatch({ type: 'duplicate', sourceIndex: index, sourceZone: zone })
    },
    remove: () => {
      if (!selector) return
      dispatch({ type: 'remove', index, zone })
    },
  }
}

/** Barra da seção escolhida, na prévia (override do Puck), com as nossas ações no lugar das dele. */
export function EditorActionBar({
  label,
  parentAction,
}: {
  children: React.ReactNode
  label?: string
  parentAction: React.ReactNode
}) {
  const { canGoUp, canGoDown, canDuplicate, fullReason, up, down, duplicate, remove } =
    useSelectedActions()
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
        <ActionBar.Action
          disabled={!canDuplicate}
          label={fullReason ? `Duplicar (${fullReason})` : 'Duplicar'}
          onClick={duplicate}
        >
          <PanelIcon name="copy" size={16} />
        </ActionBar.Action>
        <ActionBar.Action label="Remover" onClick={remove}>
          <PanelIcon name="trash" size={16} />
        </ActionBar.Action>
      </ActionBar.Group>
    </ActionBar>
  )
}

/** As mesmas ações no fim do painel de opções. */
export function SectionActionsPanel() {
  const selector = usePuck((s) => s.appState.ui.itemSelector)
  const { canGoUp, canGoDown, canDuplicate, fullReason, up, down, duplicate, remove } =
    useSelectedActions()
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
        aria-describedby={fullReason ? 'ed-full-reason' : undefined}
        className="ed-btn ed-btn--sm"
        disabled={!canDuplicate}
        onClick={duplicate}
        type="button"
      >
        <PanelIcon name="copy" size={14} /> Duplicar
      </button>
      <button className="ed-btn ed-btn--sm ed-btn--danger" onClick={remove} type="button">
        <PanelIcon name="trash" size={14} /> Remover
      </button>
      {/* O botão apagado sozinho não explica nada: o motivo fica logo embaixo. */}
      {fullReason && (
        <p className="ed-hint ed-section-actions__why" id="ed-full-reason">
          {fullReason}
        </p>
      )}
    </div>
  )
}
