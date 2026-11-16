'use client'

import { useGetPuck } from '@puckeditor/core'
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { PanelIcon } from '@/components/panel/PanelIcon'

import { copiedName, useCopiedSection, useCopySection, usePasteSection } from './copyPaste'
import { Dialog } from './Dialog'
import { MOBILE_WIDTH, ROOT_ZONE } from './puck'
import { MOD, useSaveSelected, useSelectedActions } from './SectionActions'

// Botão direito na seção e a lista de atalhos (Elementor, E6). Só no computador: no celular nada
// muda (o toque longo continua sendo do aparelho).

const SECTION = '[data-puck-dropzone="root:default-zone"] > [data-puck-component]'

/** Campo de texto ou texto da página em edição: lá o botão direito e o "?" são do texto. */
function typing(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element || typeof element.closest !== 'function') return false
  return Boolean(
    element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'),
  )
}

const desktop = (view: Window) =>
  view.innerWidth >= MOBILE_WIDTH && !view.matchMedia('(pointer: coarse)').matches

/** Os atalhos do editor, para o menu e para a lista do "?". */
export const SHORTCUTS: { keys: string; what: string }[] = [
  { keys: `${MOD}Z`, what: 'Desfazer' },
  { keys: `${MOD}Shift+Z`, what: 'Refazer' },
  { keys: `${MOD}C`, what: 'Copiar a seção escolhida' },
  { keys: `${MOD}V`, what: 'Colar a seção copiada, abaixo da escolhida' },
  { keys: 'Delete', what: 'Remover a seção escolhida (com Desfazer)' },
  { keys: 'Esc', what: 'Fechar a janela ou o menu aberto' },
  { keys: '?', what: 'Ver esta lista de atalhos' },
]

type MenuAt = { x: number; y: number }

export function SectionContextMenu({ doc }: { doc: Document | null }) {
  const getPuck = useGetPuck()
  const [at, setAt] = useState<MenuAt | null>(null)
  const [help, setHelp] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { canGoUp, canGoDown, canDuplicate, up, down, duplicate, remove } = useSelectedActions()
  const copy = useCopySection()
  const paste = usePasteSection()
  const copied = useCopiedSection()
  const save = useSaveSelected()

  const close = useCallback(() => setAt(null), [])

  // Botão direito numa seção da prévia: escolhe a seção e abre o menu onde o mouse está.
  useEffect(() => {
    const view = doc?.defaultView
    if (!doc || !view) return
    const onContext = (event: MouseEvent) => {
      if (!desktop(window) || typing(event.target)) return
      // O clique pode cair no contorno do Puck, que fica por cima e fora da seção: procura no ponto.
      const section =
        (event.target as Element | null)?.closest?.(SECTION) ??
        doc
          .elementsFromPoint(event.clientX, event.clientY)
          .find((element) => element.matches(SECTION))
      if (!section?.parentElement) return
      event.preventDefault()
      const siblings = Array.from(section.parentElement.children).filter((child) =>
        child.matches('[data-puck-component]'),
      )
      const index = siblings.indexOf(section)
      if (index < 0) return
      getPuck().dispatch({
        type: 'setUi',
        ui: { itemSelector: { index, zone: ROOT_ZONE } },
        recordHistory: false,
      })
      // A prévia pode estar reduzida para caber: converte o ponto do iframe para a tela.
      const frame = view.frameElement as HTMLElement | null
      const box = frame?.getBoundingClientRect()
      const scale = frame && box && frame.offsetWidth ? box.width / frame.offsetWidth : 1
      setAt({
        x: (box?.left ?? 0) + event.clientX * scale,
        y: (box?.top ?? 0) + event.clientY * scale,
      })
    }
    doc.addEventListener('contextmenu', onContext, true)
    return () => doc.removeEventListener('contextmenu', onContext, true)
  }, [doc, getPuck])

  // "?" abre a lista de atalhos, na tela do editor e dentro da prévia.
  useEffect(() => {
    const docs = [document, doc].filter(Boolean) as Document[]
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey) return
      if (typing(event.target) || !desktop(window)) return
      if (document.querySelector('.ed-overlay, .ed-visitor, .ed-brandpanel')) return
      event.preventDefault()
      setAt(null)
      setHelp(true)
    }
    docs.forEach((d) => d.addEventListener('keydown', onKey))
    return () => docs.forEach((d) => d.removeEventListener('keydown', onKey))
  }, [doc])

  // Menu aberto: foco no primeiro item, setas andam, Esc e clique fora fecham.
  useEffect(() => {
    if (!at) return
    const docs = [document, doc].filter(Boolean) as Document[]
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus()
    const onDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ??
          [],
      )
      if (!items.length) return
      event.preventDefault()
      const now = items.indexOf(document.activeElement as HTMLButtonElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      items[(now + step + items.length) % items.length]?.focus()
    }
    docs.forEach((d) => {
      d.addEventListener('pointerdown', onDown, true)
      d.addEventListener('keydown', onKey, true)
      d.addEventListener('scroll', close, true)
    })
    window.addEventListener('resize', close)
    return () => {
      docs.forEach((d) => {
        d.removeEventListener('pointerdown', onDown, true)
        d.removeEventListener('keydown', onKey, true)
        d.removeEventListener('scroll', close, true)
      })
      window.removeEventListener('resize', close)
    }
  }, [at, close, doc])

  // O menu não sai da tela: perto da borda, abre para o outro lado. Mede antes de pintar.
  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!at || !menu) return
    const box = menu.getBoundingClientRect()
    const x = Math.max(8, Math.min(at.x, window.innerWidth - box.width - 8))
    const y = Math.max(8, at.y + box.height > window.innerHeight - 8 ? at.y - box.height : at.y)
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
    menu.style.visibility = 'visible'
  }, [at])

  const run = (action: () => unknown) => () => {
    close()
    action()
  }

  return (
    <>
      {at && (
        <div
          aria-label="Ações da seção"
          className="ed-ctxmenu"
          ref={menuRef}
          role="menu"
          style={{ left: at.x, top: at.y, visibility: 'hidden' }}
        >
          <button disabled={!canGoUp} onClick={run(up)} role="menuitem" type="button">
            <PanelIcon name="up" size={16} /> <span>Subir</span>
          </button>
          <button disabled={!canGoDown} onClick={run(down)} role="menuitem" type="button">
            <PanelIcon name="down" size={16} /> <span>Descer</span>
          </button>
          <button disabled={!canDuplicate} onClick={run(duplicate)} role="menuitem" type="button">
            <PanelIcon name="copy" size={16} /> <span>Duplicar</span>
          </button>
          <hr />
          <button onClick={run(copy)} role="menuitem" type="button">
            <PanelIcon name="copy" size={16} /> <span>Copiar seção</span>
            <kbd>{MOD}C</kbd>
          </button>
          <button disabled={!copied} onClick={run(() => paste())} role="menuitem" type="button">
            <PanelIcon name="down" size={16} />
            <span>{copied ? `Colar “${copiedName(copied)}” abaixo` : 'Colar abaixo'}</span>
            <kbd>{MOD}V</kbd>
          </button>
          <button onClick={run(save)} role="menuitem" type="button">
            <PanelIcon name="layers" size={16} /> <span>Guardar em Minhas seções</span>
          </button>
          <hr />
          <button
            className="ed-ctxmenu__danger"
            onClick={run(remove)}
            role="menuitem"
            type="button"
          >
            <PanelIcon name="trash" size={16} /> <span>Remover</span>
            <kbd>Delete</kbd>
          </button>
          <hr />
          <button onClick={run(() => setHelp(true))} role="menuitem" type="button">
            <PanelIcon name="help" size={16} /> <span>Ver todos os atalhos</span>
            <kbd>?</kbd>
          </button>
        </div>
      )}
      {help && <ShortcutsDialog onClose={() => setHelp(false)} />}
    </>
  )
}

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      description="No computador. O botão direito numa seção abre as ações dela."
      onClose={onClose}
      title="Atalhos do teclado"
    >
      <dl className="ed-shortcuts">
        {SHORTCUTS.map((item) => (
          <div key={item.keys}>
            <dt>
              <kbd>{item.keys}</kbd>
            </dt>
            <dd>{item.what}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}
