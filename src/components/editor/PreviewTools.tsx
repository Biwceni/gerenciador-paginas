'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { PanelIcon } from '@/components/panel/PanelIcon'

import { MOBILE_WIDTH, ONE_PANEL_WIDTH, usePuck } from './puck'

/** Largura real da tela do visitante de celular, sem zoom. */
const PHONE_WIDTH = 390

/**
 * Prévia sempre em tamanho real: em vez de encolher a página, recolhe um painel. Com pouca largura,
 * abre um painel por vez; ao escolher uma seção vendo a lista de seções, passa para as opções dela.
 */
function usePanelRules() {
  const dispatch = usePuck((s) => s.dispatch)
  const left = usePuck((s) => s.appState.ui.leftSideBarVisible)
  const right = usePuck((s) => s.appState.ui.rightSideBarVisible)
  const plugin = usePuck((s) => s.appState.ui.plugin.current)
  const selector = usePuck((s) => s.appState.ui.itemSelector)
  const previous = useRef({ left, right, selected: null as string | null })

  useEffect(() => {
    if (window.innerWidth < ONE_PANEL_WIDTH) {
      dispatch({ type: 'setUi', ui: { leftSideBarVisible: false }, recordHistory: false })
    }
  }, [dispatch])

  const selected = selector ? `${selector.zone}/${selector.index}` : null
  useEffect(() => {
    const before = previous.current
    previous.current = { left, right, selected }
    const width = window.innerWidth
    if (width < MOBILE_WIDTH || width >= ONE_PANEL_WIDTH) return

    let ui: { leftSideBarVisible?: boolean; rightSideBarVisible?: boolean } | null = null
    if (left && right) {
      ui = before.left ? { leftSideBarVisible: false } : { rightSideBarVisible: false }
    } else if (selected && selected !== before.selected && left && plugin === 'blocks') {
      ui = { leftSideBarVisible: false, rightSideBarVisible: true }
    }
    if (ui) dispatch({ type: 'setUi', ui, recordHistory: false })
  }, [dispatch, left, plugin, right, selected])
}

/**
 * Computador ou celular na prévia, acima dela, e o botão das opções, na barra de ícones. O Puck não
 * tem lugar para acrescentar nessas duas áreas, então entram pelo `createPortal`.
 */
export function PreviewTools() {
  usePanelRules()
  const dispatch = usePuck((s) => s.dispatch)
  const viewports = usePuck((s) => s.appState.ui.viewports)
  const optionsOpen = usePuck((s) => s.appState.ui.rightSideBarVisible)
  const [targets, setTargets] = useState<{ rail: Element; canvas: Element } | null>(null)

  useEffect(() => {
    const root = document.querySelector('.ed-root')
    const rail = root?.querySelector('nav')
    const canvas = root?.querySelector('[class*="PuckCanvas_"]')
    if (rail && canvas) setTargets({ rail, canvas })
  }, [])

  if (!targets) return null

  const onPhone = viewports.current.width === PHONE_WIDTH
  const showAs = (width: number | '100%') =>
    dispatch({
      type: 'setUi',
      ui: { viewports: { ...viewports, current: { width, height: 'auto' } } },
      recordHistory: false,
    })

  return (
    <>
      {createPortal(
        <div className="ed-canvasbar">
          <div aria-label="Tamanho da tela" className="ed-canvasbar__group" role="group">
            <button
              aria-label="Ver como computador"
              aria-pressed={!onPhone}
              className="ed-icon-btn ed-icon-btn--sm"
              onClick={() => showAs('100%')}
              title="Computador"
              type="button"
            >
              <PanelIcon name="desktop" />
            </button>
            <button
              aria-label="Ver como celular"
              aria-pressed={onPhone}
              className="ed-icon-btn ed-icon-btn--sm"
              onClick={() => showAs(PHONE_WIDTH)}
              title="Celular"
              type="button"
            >
              <PanelIcon name="phone" />
            </button>
          </div>
          <span>Tamanho real, sem zoom</span>
        </div>,
        targets.canvas,
      )}
      {createPortal(
        <button
          aria-pressed={optionsOpen}
          className="ed-rail-btn"
          onClick={() =>
            dispatch({
              type: 'setUi',
              ui: { rightSideBarVisible: !optionsOpen },
              recordHistory: false,
            })
          }
          title="Mostrar ou esconder as opções"
          type="button"
        >
          <PanelIcon name="sliders" size={20} />
          Opções
        </button>,
        targets.rail,
      )}
    </>
  )
}
