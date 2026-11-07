'use client'

import React, { useEffect, useRef } from 'react'

import { splitHighlight } from '@/lib/highlight'

const NAME = 'site-highlight'

type HighlightWindow = Window & {
  Highlight?: new (...ranges: Range[]) => Set<Range>
  CSS: { highlights?: Map<string, Set<Range>> }
}

/**
 * Só na prévia do editor: lá o título é o campo de escrever do Puck, e não dá para pôr o `<em>`
 * dentro dele. As palavras em destaque são pintadas na cor do site por cima do texto, sem mudar o
 * que se escreve (API de destaques do CSS; o itálico só aparece no site). Acompanha o que é
 * digitado no título.
 */
export function EditorHighlight({ words }: { words: string }) {
  const marker = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const title = marker.current?.closest('.hero__inner')?.querySelector('.hero__title')
    const view = title?.ownerDocument.defaultView as HighlightWindow | null | undefined
    const registry = view?.CSS.highlights
    if (!title || !view?.Highlight || !registry) return
    let highlight = registry.get(NAME)
    if (!highlight) {
      highlight = new view.Highlight()
      registry.set(NAME, highlight)
    }
    const shared = highlight
    let range: Range | null = null

    const paint = () => {
      if (range) shared.delete(range)
      range = null
      const text = title.textContent ?? ''
      const parts = splitHighlight(text, words)
      if (!parts) return
      // O campo do Puck tem um texto só dentro dele.
      const walker = title.ownerDocument.createTreeWalker(title, NodeFilter.SHOW_TEXT)
      let offset = 0
      const start = parts[0].length
      const end = start + parts[1].length
      const next = title.ownerDocument.createRange()
      let started = false
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const length = node.textContent?.length ?? 0
        if (!started && start <= offset + length) {
          next.setStart(node, start - offset)
          started = true
        }
        if (started && end <= offset + length) {
          next.setEnd(node, end - offset)
          range = next
          shared.add(next)
          return
        }
        offset += length
      }
    }

    paint()
    const observer = new MutationObserver(paint)
    observer.observe(title, { characterData: true, childList: true, subtree: true })
    return () => {
      observer.disconnect()
      if (range) shared.delete(range)
    }
  }, [words])

  return <span hidden ref={marker} />
}
