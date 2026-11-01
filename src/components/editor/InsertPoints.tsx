'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'

import { PanelIcon } from '@/components/panel/PanelIcon'

import { useInsertPoint, useOpenSectionList } from './insert'
import { usePuck } from './puck'

/**
 * "+ Adicionar seção aqui" entre as seções da prévia. Os botões ficam numa camada por cima das
 * seções, e não dentro delas: assim o clique nunca vira arraste nem escolhe a seção. As posições vêm
 * da própria prévia e são medidas de novo sempre que uma seção muda de tamanho ou de lugar.
 */
export function InsertPoints() {
  const ids = usePuck((s) => s.appState.data.content.map((item) => item.props.id).join(' '))
  const dragging = usePuck((s) => s.appState.ui.isDragging)
  const marked = useInsertPoint()
  const open = useOpenSectionList()
  const layer = useRef<HTMLDivElement>(null)
  const [tops, setTops] = useState<number[]>([])

  useLayoutEffect(() => {
    const element = layer.current
    const main = element?.parentElement
    const view = element?.ownerDocument.defaultView
    if (!element || !main || !view) return

    const sections = () =>
      ids
        .split(' ')
        .map((id) => main.querySelector(`[data-puck-component="${CSS.escape(id)}"]`))
        .filter((section) => section !== null)
    const measure = () => {
      const origin = element.getBoundingClientRect().top
      const next = sections()
        .slice(1)
        .map((section) => Math.round(section.getBoundingClientRect().top - origin))
      setTops((current) => (current.join() === next.join() ? current : next))
    }

    measure()
    // O Puck pode desenhar a ordem nova depois deste efeito.
    const frame = view.requestAnimationFrame(measure)
    const observer = new view.ResizeObserver(measure)
    observer.observe(main)
    sections().forEach((section) => observer.observe(section))
    return () => {
      view.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [ids])

  const count = ids ? ids.split(' ').length : 0
  const click = (at: number | null) => (event: React.MouseEvent) => {
    // A prévia do Puck tira a escolha da seção em qualquer clique que chega até ela.
    event.stopPropagation()
    open(at)
  }

  return (
    <>
      <div className="editor-inserts" hidden={dragging} ref={layer}>
        {tops.map((top, index) => {
          const at = index + 1
          return (
            <div
              className={`editor-insert${marked === at ? ' editor-insert--marked' : ''}`}
              key={at}
              style={{ top }}
            >
              <button
                aria-label="Adicionar seção aqui"
                onClick={click(at)}
                title="Adicionar seção aqui"
                type="button"
              >
                <PanelIcon name="plus" size={14} />
                <b>Adicionar seção aqui</b>
              </button>
            </div>
          )
        })}
      </div>

      {count === 0 ? (
        <div className="editor-empty">
          <h2>Página vazia</h2>
          <p>Comece colocando a primeira seção.</p>
          <button className="button" onClick={click(0)} type="button">
            <PanelIcon name="plus" size={16} /> Adicionar seção
          </button>
        </div>
      ) : (
        <div className="editor-add-end">
          <button hidden={dragging} onClick={click(null)} type="button">
            <PanelIcon name="plus" size={16} /> Adicionar seção no fim
          </button>
        </div>
      )}
    </>
  )
}
