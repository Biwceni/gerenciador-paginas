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

type InsertPoint = {
  /** Lugar marcado pelo "+" entre as seções; `null` é o fim da página. */
  at: number | null
  setAt: (at: number | null) => void
}

const InsertContext = createContext<InsertPoint>({ at: null, setAt: () => {} })

export function InsertProvider({ children }: { children: React.ReactNode }) {
  const [at, setAt] = useState<number | null>(null)
  const value = useMemo(() => ({ at, setAt }), [at])
  return <InsertContext.Provider value={value}>{children}</InsertContext.Provider>
}

/** Abre a lista de seções, com ou sem um lugar marcado. */
export function useOpenSectionList() {
  const { setAt } = useContext(InsertContext)
  const getPuck = useGetPuck()
  return useCallback(
    (at: number | null) => {
      setAt(at)
      getPuck().dispatch({
        type: 'setUi',
        ui: { plugin: { current: 'blocks' }, leftSideBarVisible: true },
        recordHistory: false,
      })
    },
    [getPuck, setAt],
  )
}

/** Coloca uma seção no lugar marcado ou no fim da página e deixa ela escolhida e à vista. */
export function useAddSection() {
  const { at, setAt } = useContext(InsertContext)
  const getPuck = useGetPuck()
  return useCallback(
    (componentType: string) => {
      const { appState, dispatch } = getPuck()
      const size = appState.data.content.length
      const index = at === null ? size : Math.min(at, size)
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
      setAt(null)
      const added = getPuck().getItemBySelector(selection)
      if (added) scrollToSection(added.props.id)
    },
    [at, getPuck, setAt],
  )
}

/** Lugar marcado na prévia. Some ao fechar a lista ou quando a página muda de outro jeito. */
export function useInsertPoint(): number | null {
  const { at, setAt } = useContext(InsertContext)
  const listOpen = usePuck(
    (s) => s.appState.ui.leftSideBarVisible && s.appState.ui.plugin.current === 'blocks',
  )
  const size = usePuck((s) => s.appState.data.content.length)
  const [sizeAtMark, setSizeAtMark] = useState(size)

  useEffect(() => {
    if (at === null) setSizeAtMark(size)
    else if (!listOpen || size !== sizeAtMark) setAt(null)
  }, [at, listOpen, setAt, size, sizeAtMark])

  return at
}
