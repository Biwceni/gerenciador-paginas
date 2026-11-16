'use client'

import { toast } from '@payloadcms/ui'
import { useGetPuck } from '@puckeditor/core'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

import { SECTION_LABELS } from '@/puck/config'
import { insertIndex } from '@/puck/insertPosition'
import {
  CLIPBOARD_KEY,
  packSection,
  type SectionItem,
  unpackSection,
  withNewIds,
} from '@/puck/sectionClipboard'

import { MOBILE_WIDTH, ROOT_ZONE } from './puck'
import { scrollToSection } from './insert'
import { fullZoneReason, zoneMax } from './zoneLimits'

// Copiar e colar uma seção, de uma página para outra (E1). Fica no navegador (localStorage):
// vale para este aparelho, e sobrevive a trocar de página e a fechar a aba.

const CHANGED = 'gp-secao-copiada'

const sectionName = (type: string) => (SECTION_LABELS as Record<string, string>)[type] ?? 'Seção'

function readStored(): string | null {
  try {
    return window.localStorage.getItem(CLIPBOARD_KEY)
  } catch {
    return null
  }
}

function subscribe(notify: () => void) {
  // Outra aba (outra página do editor) copiou: o "Colar" aparece aqui também.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CLIPBOARD_KEY) notify()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(CHANGED, notify)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CHANGED, notify)
  }
}

/** A seção copiada, já conferida (ou `null`). O texto guardado é a chave para não reler à toa. */
let cache: { raw: string | null; item: SectionItem | null } = { raw: null, item: null }
function snapshot(): SectionItem | null {
  const raw = readStored()
  if (raw !== cache.raw) cache = { raw, item: unpackSection(raw) }
  return cache.item
}

export function useCopiedSection(): SectionItem | null {
  return useSyncExternalStore(subscribe, snapshot, () => null)
}

/** Nome da seção copiada, para o botão de colar ("Banner"). */
export const copiedName = (item: SectionItem) => sectionName(item.type)

/** Copia a seção escolhida (só seções da página; uma peça das Colunas não). */
export function useCopySection() {
  const getPuck = useGetPuck()
  return useCallback(() => {
    const { appState, getItemBySelector } = getPuck()
    const selector = appState.ui.itemSelector
    if (!selector || (selector.zone && selector.zone !== ROOT_ZONE)) return false
    const item = getItemBySelector(selector) as SectionItem | undefined
    if (!item) return false
    try {
      window.localStorage.setItem(CLIPBOARD_KEY, packSection(item))
    } catch {
      toast.error(
        'Não deu para copiar: o navegador não deixou guardar. Tente sair do modo anônimo.',
      )
      return false
    }
    window.dispatchEvent(new Event(CHANGED))
    toast.success(
      `“${sectionName(item.type)}” copiada. Para colar em outra página, abra “Adicionar seção” lá.`,
    )
    return true
  }, [getPuck])
}

/**
 * Põe uma seção pronta (copiada ou guardada) onde a lista coloca uma seção nova: abaixo da escolhida
 * ou no fim da página. Entra com identificação nova e fica escolhida e à vista.
 */
export function useInsertSection() {
  const getPuck = useGetPuck()
  return useCallback(
    (ready: SectionItem) => {
      const { appState, dispatch } = getPuck()
      if (appState.data.content.length >= zoneMax(ROOT_ZONE)) {
        toast.info(fullZoneReason(ROOT_ZONE))
        return false
      }
      const index = insertIndex(appState.data.content, appState.ui.itemSelector)
      const item = withNewIds(ready)
      // `setData`, e não `insert`: o `insert` abriria a pergunta das Colunas novas, e aqui a seção
      // já vem pronta.
      dispatch({
        type: 'setData',
        data: (previous) => ({
          content: [
            ...previous.content.slice(0, index),
            item as (typeof previous.content)[number],
            ...previous.content.slice(index),
          ],
        }),
        recordHistory: true,
      })
      dispatch({
        type: 'setUi',
        ui: {
          itemSelector: { index, zone: ROOT_ZONE },
          ...(window.innerWidth < MOBILE_WIDTH ? { leftSideBarVisible: false } : {}),
        },
        recordHistory: false,
      })
      scrollToSection(item.props.id)
      return true
    },
    [getPuck],
  )
}

/** Cola a seção copiada (E1), como `useInsertSection`. */
export function usePasteSection() {
  const insert = useInsertSection()
  return useCallback(
    (quiet = false) => {
      const copied = snapshot()
      if (!copied) {
        if (!quiet) toast.info('Nenhuma seção copiada neste aparelho.')
        return false
      }
      return insert(copied)
    },
    [insert],
  )
}

/** Campo de texto, lista ou texto da página em edição: lá o Ctrl+C e o Ctrl+V são do texto. */
function typing(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element || typeof element.closest !== 'function') return false
  return Boolean(
    element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'),
  )
}

/** Alguma janela à vista (Publicar, Versões, a pergunta das Colunas...). */
function dialogOpen(): boolean {
  return Array.from(
    document.querySelectorAll<HTMLElement>('dialog[open], [role="dialog"], [role="alertdialog"]'),
  ).some((element) => element.getClientRects().length > 0)
}

/**
 * Ctrl+C e Ctrl+V (⌘ no Mac) com uma seção escolhida, na tela do editor e dentro da prévia. Só
 * quando nada de texto está selecionado e nenhuma janela está aberta.
 */
export function useCopyPasteKeys(doc: Document | null | undefined) {
  const copy = useCopySection()
  const paste = usePasteSection()
  const actions = useRef({ copy, paste })
  useEffect(() => {
    actions.current = { copy, paste }
  })
  useEffect(() => {
    if (!doc) return
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (key !== 'c' && key !== 'v') return
      if (event.defaultPrevented || typing(event.target)) return
      const selection = doc.getSelection()
      if (selection && !selection.isCollapsed && selection.toString().trim()) return
      if (dialogOpen()) return
      const done = key === 'c' ? actions.current.copy() : actions.current.paste(true)
      if (done) event.preventDefault()
    }
    doc.addEventListener('keydown', onKey)
    return () => doc.removeEventListener('keydown', onKey)
  }, [doc])
}
