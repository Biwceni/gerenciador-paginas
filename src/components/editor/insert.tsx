'use client'

import { useGetPuck } from '@puckeditor/core'
import { useCallback } from 'react'

import { insertIndex } from '@/puck/insertPosition'

import { MOBILE_WIDTH, ROOT_ZONE } from './puck'

/** Prévia do editor (o `id` é o que o Puck dá ao iframe). */
export const previewDocument = (): Document | null =>
  document.querySelector<HTMLIFrameElement>('.ed-root iframe')?.contentDocument ?? null

/**
 * Onde rolar a prévia para mostrar `section`: centralizada quando cabe, senão pelo começo. Nos dois
 * casos sobra acima dela o espaço da barrinha (56 px; 64 px no celular), para a barra ficar no
 * espaço da seção de cima e não por cima do título (rodada 2, F2).
 */
export function sectionScrollTop(section: Element, view: Window): number {
  const box = section.getBoundingClientRect()
  const room = view.matchMedia('(max-width: 637px), (pointer: coarse)').matches ? 64 : 56
  const free = view.innerHeight - box.height
  const above = free > room * 2 ? free / 2 : room
  return Math.max(0, box.top + view.scrollY - above)
}

/** Mostra uma seção na prévia. Espera o Puck desenhar, porque a página acabou de mudar. */
export function scrollToSection(id: string) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const doc = previewDocument()
      const section = doc?.querySelector(`[data-puck-component="${CSS.escape(id)}"]`)
      const view = doc?.defaultView
      if (!section || !view) return
      view.scrollTo({ top: sectionScrollTop(section, view), behavior: 'smooth' })
    }),
  )
}

/** Abre a lista de seções. */
export function useOpenSectionList() {
  const getPuck = useGetPuck()
  return useCallback(() => {
    getPuck().dispatch({
      type: 'setUi',
      ui: { plugin: { current: 'blocks' }, leftSideBarVisible: true },
      recordHistory: false,
    })
  }, [getPuck])
}

/** Coloca uma seção abaixo da selecionada ou no fim da página e deixa ela selecionada e à vista. */
export function useAddSection() {
  const getPuck = useGetPuck()
  return useCallback(
    (componentType: string) => {
      const { appState, dispatch } = getPuck()
      const index = insertIndex(appState.data.content, appState.ui.itemSelector)
      dispatch({
        type: 'insert',
        componentType,
        destinationIndex: index,
        destinationZone: ROOT_ZONE,
        recordHistory: true,
      })
      const selection = { index, zone: ROOT_ZONE }
      dispatch({
        type: 'setUi',
        ui: {
          itemSelector: selection,
          // No celular a lista cobre a prévia: fecha para mostrar a seção nova.
          ...(window.innerWidth < MOBILE_WIDTH ? { leftSideBarVisible: false } : {}),
        },
        recordHistory: false,
      })
      const added = getPuck().getItemBySelector(selection)
      if (added) scrollToSection(added.props.id)
    },
    [getPuck],
  )
}
