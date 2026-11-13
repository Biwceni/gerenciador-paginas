'use client'

import { useGetPuck } from '@puckeditor/core'
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { previewDocument } from './insert'
import { MOBILE_WIDTH, usePuck } from './puck'

/**
 * Retorno de uma escolha no painel (entrega 2, achados 11.1, 3.8 e 11.7). No celular, o painel
 * cobre a prévia: depois de trocar Fundo, Arrumação, Altura..., o painel desce, a prévia mostra a
 * seção mudada e uma barra diz o que mudou, com Desfazer e "Voltar às opções". No computador, a
 * prévia rola até a seção, se ela estiver fora da tela, e a seção pisca de leve.
 */

let current: { text: string; at: number; label: string; quiet: boolean } | null = null
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const set = (next: typeof current) => {
  current = next
  listeners.forEach((listener) => listener())
}

/** Esconde a barra "Ajustado" (outra ação da pessoa já tomou o lugar dela). */
export const dismissAdjusted = () => set(null)

/** A pessoa acabou de escolher `what` no painel (por exemplo, "Suave"). */
export function announceChange(what: string, options: { label?: string; quiet?: boolean } = {}) {
  set({ text: what, at: Date.now(), label: options.label ?? 'Ajustado:', quiet: !!options.quiet })
}

/** A seção ou a peça escolhida, na prévia. */
function selectedElement(id: string | undefined): HTMLElement | null {
  if (!id) return null
  return (
    previewDocument()?.querySelector<HTMLElement>(`[data-puck-component="${CSS.escape(id)}"]`) ??
    null
  )
}

/** Mostra a seção na prévia e faz ela piscar de leve, para a pessoa ver onde mudou. */
export function showInPreview(element: HTMLElement, block: ScrollLogicalPosition) {
  const reduce = element.ownerDocument.defaultView?.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
  element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block })
  if (reduce) return
  element.animate(
    [
      { boxShadow: 'inset 0 0 0 4px rgba(37, 99, 235, 0.85)' },
      { boxShadow: 'inset 0 0 0 4px rgba(37, 99, 235, 0)' },
    ],
    { duration: 1100, easing: 'ease-out' },
  )
}

const VISIBLE_FOR = 10_000

/** O elemento da seção cujo texto começa como o do campo (o depoimento, o produto). */
function findText(section: HTMLElement, text: string): HTMLElement | null {
  const wanted = text.slice(0, 40).toLowerCase()
  const walker = section.ownerDocument.createTreeWalker(section, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const own = node.textContent?.trim().toLowerCase() ?? ''
    if (own.length >= 3 && (own.startsWith(wanted) || wanted.startsWith(own))) {
      return node.parentElement
    }
  }
  return null
}

/** A barra "Ajustado: Suave · Desfazer · Voltar às opções" e o retorno no computador. */
export function AdjustedBar() {
  const getPuck = useGetPuck()
  const change = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  )
  const selectedId = usePuck((s) => s.selectedItem?.props.id as string | undefined)
  const [phone, setPhone] = useState(false)
  const shown = useRef<number | null>(null)

  useEffect(() => {
    if (!change || shown.current === change.at) return
    shown.current = change.at
    const onPhone = window.innerWidth < MOBILE_WIDTH
    setPhone(onPhone)
    if (onPhone) {
      getPuck().dispatch({ type: 'setUi', ui: { leftSideBarVisible: false }, recordHistory: false })
    }
    // Espera o painel descer e a prévia desenhar a mudança.
    const timer = setTimeout(() => {
      if (change.quiet) return
      const element = selectedElement(selectedId)
      if (!element) return
      if (onPhone) {
        showInPreview(element, 'start')
        return
      }
      const box = element.getBoundingClientRect()
      const view = element.ownerDocument.defaultView
      const outside = view && (box.bottom < 0 || box.top > view.innerHeight)
      showInPreview(element, outside ? 'center' : 'nearest')
    }, 250)
    const hide = setTimeout(() => {
      if (current?.at === change.at) dismissAdjusted()
    }, VISIBLE_FOR)
    return () => {
      clearTimeout(timer)
      clearTimeout(hide)
    }
  }, [change, getPuck, selectedId])

  // No celular, ao mexer num campo, a faixa de prévia acima do painel mostra o que está sendo
  // mexido (achados 4.2 e 6.2): o item com o mesmo texto, ou o começo da seção.
  useEffect(() => {
    let last: Element | null = null
    const onFocus = (event: FocusEvent) => {
      if (window.innerWidth >= MOBILE_WIDTH) return
      const target = event.target as HTMLElement | null
      if (!target?.closest('form[class*="_PuckFields_"]') || target === last) return
      last = target
      const section = selectedElement(selectedId)
      if (!section) return
      const typed = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      const text = (typed ? target.value : (target.textContent ?? '')).trim()
      const match = text.length >= 3 ? findText(section, text) : null
      // Abaixo da barrinha da seção, que fica presa no alto da prévia quando a seção é comprida.
      const shown = match ?? section
      const view = shown.ownerDocument.defaultView
      if (!view) return
      const top = shown.getBoundingClientRect().top + view.scrollY - (match ? 64 : 0)
      if (!match) shown.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else view.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [selectedId])

  // A pessoa voltou para o painel ou escolheu outra coisa: a barra sai.
  const panelOpen = usePuck((s) => s.appState.ui.leftSideBarVisible)
  useEffect(() => {
    if (panelOpen && phone && current && Date.now() - current.at > 600) dismissAdjusted()
  }, [panelOpen, phone])

  if (!change || !phone) return null
  return (
    <div aria-live="polite" className="ed-adjusted" role="status">
      <span className="ed-adjusted__text">
        <b>{change.label}</b> {change.text}
      </span>
      <button
        className="ed-btn ed-btn--sm"
        onClick={() => {
          getPuck().history.back()
          dismissAdjusted()
        }}
        type="button"
      >
        Desfazer
      </button>
      <button
        className="ed-btn ed-btn--sm ed-btn--primary"
        onClick={() => {
          getPuck().dispatch({
            type: 'setUi',
            ui: { plugin: { current: 'fields' }, leftSideBarVisible: true },
            recordHistory: false,
          })
          dismissAdjusted()
        }}
        type="button"
      >
        Voltar às opções
      </button>
    </div>
  )
}

/**
 * Campos de rádio e de lista do painel (override `fieldTypes`): o campo de sempre, e, quando a
 * pessoa troca a escolha, o retorno acima. Só conta a troca feita aqui, com o foco no campo: um
 * Desfazer também muda o valor, e não deve abrir a barra.
 */
export function ChoiceField({
  children,
  field,
  value,
}: {
  children: React.ReactNode
  field: { options?: { label: string; value: unknown }[] }
  value?: unknown
}) {
  const box = useRef<HTMLDivElement>(null)
  const before = useRef(value)
  useEffect(() => {
    if (Object.is(before.current, value)) return
    before.current = value
    if (!box.current?.contains(document.activeElement)) return
    const option = field.options?.find((item) => item.value === value)
    if (option) announceChange(option.label)
  }, [field.options, value])
  return <div ref={box}>{children}</div>
}
