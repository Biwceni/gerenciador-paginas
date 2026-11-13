'use client'

import { useGetPuck } from '@puckeditor/core'
import React, { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { PanelIcon } from '@/components/panel/PanelIcon'

import { MOBILE_WIDTH, ONE_PANEL_WIDTH, usePuck } from './puck'

/** Largura real da tela do visitante de celular, sem zoom. */
const PHONE_WIDTH = 390

/**
 * Largura em que a página é desenhada no modo Computador, como num computador comum. O Puck reduz
 * para caber no espaço da prévia, então o que quebra linha no site quebra igual aqui.
 */
const DESKTOP_WIDTH = 1280

const noSubscription = () => () => {}

/** Elemento da tela do Puck, que só existe no navegador e depois de ele desenhar. */
const useElement = (selector: string) =>
  useSyncExternalStore(
    noSubscription,
    () => document.querySelector(selector),
    () => null,
  )

/** Quanto a prévia está reduzida: o Puck escreve a escala no estilo da raiz da prévia. */
function useCanvasZoom(): number {
  const root = useElement('#puck-canvas-root') as HTMLElement | null
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!root) return () => {}
      const observer = new MutationObserver(notify)
      observer.observe(root, { attributes: true, attributeFilter: ['style'] })
      return () => observer.disconnect()
    },
    [root],
  )
  return useSyncExternalStore(
    subscribe,
    () => {
      const scale = /scale\(([\d.]+)\)/.exec(root?.style.transform ?? '')
      return scale ? Number(scale[1]) : 1
    },
    () => 1,
  )
}

/**
 * Painéis em volta da prévia. Com pouca largura, abre um painel por vez. Ao escolher uma seção, a
 * lista "Adicionar seção" recolhe para só o trilho e devolve o espaço à prévia (volta ao clicar em
 * "Adicionar seção").
 */
function usePanelRules() {
  const getPuck = useGetPuck()
  const dispatch = usePuck((s) => s.dispatch)
  const left = usePuck((s) => s.appState.ui.leftSideBarVisible)
  const right = usePuck((s) => s.appState.ui.rightSideBarVisible)
  const plugin = usePuck((s) => s.appState.ui.plugin.current)
  const selector = usePuck((s) => s.appState.ui.itemSelector)
  const sections = usePuck((s) => s.appState.data.content.length)
  // Qual seção, e não a posição: subir ou descer a escolhida não conta como escolher outra.
  const selectedId = usePuck((s) => (s.selectedItem?.props.id as string | undefined) ?? null)
  const previous = useRef({
    left,
    right,
    selected: null as string | null,
    selectedId: null as string | null,
    sections,
  })

  useEffect(() => {
    if (window.innerWidth < ONE_PANEL_WIDTH) {
      dispatch({ type: 'setUi', ui: { leftSideBarVisible: false }, recordHistory: false })
    }
  }, [dispatch])

  // Fora do celular, a prévia começa como computador: a página desenhada com 1280 px.
  useEffect(() => {
    if (window.innerWidth < MOBILE_WIDTH) return
    const { viewports } = getPuck().appState.ui
    dispatch({
      type: 'setUi',
      ui: { viewports: { ...viewports, current: { width: DESKTOP_WIDTH, height: 'auto' } } },
      recordHistory: false,
    })
  }, [dispatch, getPuck])

  const selected = selector ? `${selector.zone}/${selector.index}` : null
  useEffect(() => {
    const before = previous.current
    previous.current = { left, right, selected, selectedId, sections }
    const width = window.innerWidth
    if (width < MOBILE_WIDTH) return
    // Com espaço para os dois painéis: escolher uma seção na página recolhe a lista de seções. A
    // seção que acabou de entrar pela lista também fica escolhida, mas aí a lista continua aberta,
    // para acrescentar outra logo abaixo.
    if (width >= ONE_PANEL_WIDTH) {
      const inserted = sections !== before.sections
      const other = selectedId !== null && selectedId !== before.selectedId
      if (other && !inserted && left && plugin === 'blocks') {
        dispatch({ type: 'setUi', ui: { leftSideBarVisible: false }, recordHistory: false })
      }
      return
    }

    let ui: { leftSideBarVisible?: boolean; rightSideBarVisible?: boolean } | null = null
    if (left && right) {
      ui = before.left ? { leftSideBarVisible: false } : { rightSideBarVisible: false }
    } else if (selected && selected !== before.selected && left && plugin === 'blocks') {
      ui = { leftSideBarVisible: false, rightSideBarVisible: true }
    }
    if (ui) dispatch({ type: 'setUi', ui, recordHistory: false })
  }, [dispatch, left, plugin, right, sections, selected, selectedId])

  // O Puck calcula a redução da prévia assim que um painel abre ou fecha, ainda no meio da animação,
  // e ela ficaria menor do que cabe. Depois da animação, pede a conta de novo (mesma largura).
  useEffect(() => {
    const timer = setTimeout(() => {
      const { viewports } = getPuck().appState.ui
      dispatch({
        type: 'setUi',
        ui: { viewports: { ...viewports, current: { ...viewports.current } } },
        recordHistory: false,
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [dispatch, getPuck, left, right])

  // A janela encolheu com os dois painéis abertos (por exemplo, encaixada na metade da tela).
  useEffect(() => {
    if (!left || !right) return
    const onResize = () => {
      const width = window.innerWidth
      if (width < MOBILE_WIDTH || width >= ONE_PANEL_WIDTH) return
      dispatch({ type: 'setUi', ui: { leftSideBarVisible: false }, recordHistory: false })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [dispatch, left, right])
}

/**
 * Computador ou celular na prévia, acima dela, e o botão das opções, na barra de ícones. O Puck não
 * tem lugar para acrescentar nessas duas áreas, então entram pelo `createPortal`.
 */
export function PreviewTools() {
  usePanelRules()
  const zoom = useCanvasZoom()
  const dispatch = usePuck((s) => s.dispatch)
  const panelsOpen = usePuck(
    (s) => s.appState.ui.leftSideBarVisible || s.appState.ui.rightSideBarVisible,
  )
  const viewports = usePuck((s) => s.appState.ui.viewports)
  const optionsOpen = usePuck((s) => s.appState.ui.rightSideBarVisible)
  const rail = useElement('.ed-root nav')
  const canvas = useElement('.ed-root [class*="PuckCanvas_"]')

  if (!rail || !canvas) return null

  const onPhone = viewports.current.width === PHONE_WIDTH
  const real = zoom >= 0.99
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
              onClick={() => showAs(DESKTOP_WIDTH)}
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
          {!onPhone && (
            // Só esconde os painéis: a partir de uns 1350 px, a página de 1280 px cabe sem reduzir. O
            // Puck não deixa travar o zoom de fora (ele recalcula a cada mudança de tamanho).
            // Com os painéis escondidos, o mesmo lugar traz "Mostrar painéis" (achado 1.5).
            <button
              className="ed-btn ed-btn--sm"
              onClick={() =>
                dispatch({
                  type: 'setUi',
                  ui: { leftSideBarVisible: !panelsOpen, rightSideBarVisible: !panelsOpen },
                  recordHistory: false,
                })
              }
              title={
                panelsOpen
                  ? 'Esconde os painéis para a prévia ficar maior'
                  : 'Mostra de novo os painéis de seções e de opções'
              }
              type="button"
            >
              {panelsOpen ? 'Esconder painéis' : 'Mostrar painéis'}
            </button>
          )}
          <span aria-live="polite">
            {onPhone
              ? 'Celular, tamanho real'
              : real
                ? 'Computador, tamanho real'
                : `Computador, reduzido para caber (${Math.round(zoom * 100)}%)`}
          </span>
        </div>,
        canvas,
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
        rail,
      )}
    </>
  )
}
