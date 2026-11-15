'use client'

import React, { useContext, useEffect, useState } from 'react'

import { previewDocument } from './insert'
import { usePuck } from './puck'
import { SitePreviewContextForOutline } from './SitePreview'

type Heading = { level: number; text: string; element: HTMLElement }

/** Os títulos da página na prévia, na ordem: só os do conteúdo (o topo e o rodapé ficam de fora). */
export function readHeadings(root: ParentNode | null | undefined): Heading[] {
  if (!root) return []
  return [...root.querySelectorAll<HTMLElement>('main h1, main h2, main h3')].map((element) => ({
    level: Number(element.tagName.slice(1)),
    text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
    element,
  }))
}

/** O que a lista de títulos avisa: nenhum título principal, ou mais de um. */
export function headingWarning(headings: { level: number }[], isHome: boolean): string | null {
  const main = headings.filter((heading) => heading.level === 1).length
  if (main > 1) return 'A página tem mais de um título principal. O Google prefere um só.'
  if (main === 0) {
    return isHome
      ? 'Sem Banner, o título principal da página inicial é o nome do site, escondido: só o Google e o leitor de tela leem.'
      : 'Falta o título principal. Comece a página com um Banner.'
  }
  return null
}

/**
 * Títulos da página (B2, PK-titulos), na aba Ordem: como o Google lê a página, do título principal
 * aos subtítulos. Em português, no lugar do analisador de títulos do Puck (que só fala inglês).
 * Clicar num título leva até ele na prévia.
 */
export function HeadingOutline() {
  const data = usePuck((s) => s.appState.data)
  const preview = useContext(SitePreviewContextForOutline)
  const [headings, setHeadings] = useState<Heading[]>([])

  // A prévia desenha depois da mudança: lê os títulos um instante depois.
  useEffect(() => {
    const timer = window.setTimeout(() => setHeadings(readHeadings(previewDocument())), 300)
    return () => window.clearTimeout(timer)
  }, [data])

  const warning = headingWarning(headings, Boolean(preview?.isHome))

  return (
    <section aria-labelledby="ed-headings-title" className="ed-headings">
      <h3 id="ed-headings-title">Títulos da página</h3>
      <p className="ed-hint">
        É assim que o Google lê a página: o título principal e os subtítulos.
      </p>
      {warning && <p className="ed-hint ed-hint--warn">{warning}</p>}
      {headings.length > 0 && (
        <ol className="ed-headings__list">
          {headings.map((heading, index) => (
            <li className={`ed-headings__item ed-headings__item--${heading.level}`} key={index}>
              <button
                className="ed-headings__button"
                onClick={() => heading.element.scrollIntoView({ block: 'center' })}
                type="button"
              >
                <span className="ed-headings__level">
                  {heading.level === 1 ? 'Principal' : `Nível ${heading.level}`}
                </span>
                <span className="ed-headings__text">{heading.text || '(sem texto)'}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
