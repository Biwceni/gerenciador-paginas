'use client'

import { useGetPuck } from '@puckeditor/core'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { MOBILE_WIDTH, ROOT_ZONE, usePuck } from './puck'

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

/** Lugar marcado pelo "+" entre as seções e quantas seções a página tinha naquela hora. */
type Mark = { at: number; size: number }

type InsertPoint = {
  /** Sem lugar marcado, a seção vai para o fim da página. */
  mark: Mark | null
  setMark: (mark: Mark | null) => void
}

const InsertContext = createContext<InsertPoint>({ mark: null, setMark: () => {} })

export function InsertProvider({ children }: { children: React.ReactNode }) {
  const [mark, setMark] = useState<Mark | null>(null)
  const value = useMemo(() => ({ mark, setMark }), [mark])
  return <InsertContext.Provider value={value}>{children}</InsertContext.Provider>
}

/** Abre a lista de seções, com ou sem um lugar marcado. */
export function useOpenSectionList() {
  const { setMark } = useContext(InsertContext)
  const getPuck = useGetPuck()
  return useCallback(
    (at: number | null) => {
      const { appState, dispatch } = getPuck()
      setMark(at === null ? null : { at, size: appState.data.content.length })
      dispatch({
        type: 'setUi',
        ui: { plugin: { current: 'blocks' }, leftSideBarVisible: true },
        recordHistory: false,
      })
    },
    [getPuck, setMark],
  )
}

/** Coloca uma seção no lugar marcado ou no fim da página e deixa ela escolhida e à vista. */
export function useAddSection() {
  const { mark, setMark } = useContext(InsertContext)
  const getPuck = useGetPuck()
  return useCallback(
    (componentType: string) => {
      const { appState, dispatch } = getPuck()
      const size = appState.data.content.length
      const index = mark ? Math.min(mark.at, size) : size
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
      setMark(null)
      const added = getPuck().getItemBySelector(selection)
      if (added) scrollToSection(added.props.id)
    },
    [getPuck, mark, setMark],
  )
}

/** Lugar marcado na prévia. Some ao fechar a lista ou quando a página muda de outro jeito. */
export function useInsertPoint(): number | null {
  const { mark, setMark } = useContext(InsertContext)
  const listOpen = usePuck(
    (s) => s.appState.ui.leftSideBarVisible && s.appState.ui.plugin.current === 'blocks',
  )
  const size = usePuck((s) => s.appState.data.content.length)
  const stale = mark !== null && (!listOpen || size !== mark.size)

  useEffect(() => {
    if (stale) setMark(null)
  }, [setMark, stale])

  return stale ? null : (mark?.at ?? null)
}
