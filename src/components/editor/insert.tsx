'use client'

import { useGetPuck } from '@puckeditor/core'
import { useCallback } from 'react'

import { insertIndex } from '@/puck/insertPosition'

import { MOBILE_WIDTH, ROOT_ZONE } from './puck'

/** Prévia do editor (o `id` é o que o Puck dá ao iframe). */
export const previewDocument = (): Document | null =>
  document.querySelector<HTMLIFrameElement>('.ed-root iframe')?.contentDocument ?? null

/** Mostra uma seção na prévia. Espera o Puck desenhar, porque a página acabou de mudar. */
export function scrollToSection(id: string) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      previewDocument()
        ?.querySelector(`[data-puck-component="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    ),
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
