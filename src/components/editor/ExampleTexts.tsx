'use client'

import React, { useId, useState } from 'react'

import type { ChromeExample } from '@/lib/examples'

/** Um texto de exemplo da página, já com o lugar em palavras. */
export type ExampleItem = {
  key: string
  place: string
  text: string
  sectionId: string
  path: (string | number)[]
}

/** Quantos aparecem antes do "Ver os outros N" (A7: com 6 ou mais, a caixa ficava enorme). */
export const EXAMPLES_SHOWN = 3

/** Texto longo na citação: a pessoa reconhece pelo começo. */
const quote = (text: string) => (text.length > 140 ? `${text.slice(0, 137).trimEnd()}…` : text)

/**
 * Os textos de exemplo para trocar (A7), no painel da direita: o texto, onde ele está e os botões
 * "Ir até o texto" e "Manter assim". Os do menu e do rodapé levam para a tela Menu e rodapé.
 */
export function ExampleTexts({
  items,
  chrome,
  chromeHref,
  onGoTo,
  onKeep,
}: {
  items: ExampleItem[]
  chrome: ChromeExample[]
  chromeHref: string
  onGoTo: (item: ExampleItem) => void
  onKeep: (item: ExampleItem) => void
}) {
  const [all, setAll] = useState(false)
  const titleId = useId()
  const total = items.length + chrome.length
  if (!total) return null
  const shown = all ? items : items.slice(0, EXAMPLES_SHOWN)
  const rest = items.length - shown.length
  const chromeShown = all ? chrome : chrome.slice(0, Math.max(0, EXAMPLES_SHOWN - shown.length))
  const hidden = rest + (chrome.length - chromeShown.length)

  return (
    <section aria-labelledby={titleId} className="ed-examples">
      <h2 className="ed-examples__title" id={titleId}>
        {total === 1 ? '1 texto de exemplo para trocar' : `${total} textos de exemplo para trocar`}
      </h2>
      <ul className="ed-examples__list">
        {shown.map((item) => (
          <li className="ed-examples__item" key={item.key}>
            <span className="ed-examples__place">{item.place}</span>
            <q className="ed-examples__quote">{quote(item.text)}</q>
            <span className="ed-examples__actions">
              <button className="ed-btn ed-btn--sm" onClick={() => onGoTo(item)} type="button">
                Ir até o texto
              </button>
              <button
                className="ed-btn ed-btn--sm ed-btn--ghost"
                onClick={() => onKeep(item)}
                title="O texto fica como está e sai deste aviso"
                type="button"
              >
                Manter assim
              </button>
            </span>
          </li>
        ))}
        {chromeShown.map((item) => (
          <li className="ed-examples__item" key={item.place}>
            <span className="ed-examples__place">{item.place}</span>
            <q className="ed-examples__quote">{quote(item.text)}</q>
            <span className="ed-examples__actions">
              <a className="ed-btn ed-btn--sm" href={chromeHref}>
                Abrir Menu e rodapé
              </a>
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button className="ed-linkbtn" onClick={() => setAll(true)} type="button">
          {hidden === 1 ? 'Ver o outro' : `Ver os outros ${hidden}`}
        </button>
      )}
    </section>
  )
}

/** Quantas vezes procurar o campo enquanto o painel da seção ainda está sendo desenhado. */
const REVEAL_TRIES = 12

/**
 * Abre o campo do texto no painel da seção (A7, "Ir até o texto"): abre o item da lista em que ele
 * está ("resposta 2" abre a pergunta 2) e põe o cursor nele. O painel aparece logo depois de
 * escolher a seção, então tenta de novo por um instante.
 */
export function revealField(path: (string | number)[], attempt = 0) {
  // O Puck desenha o painel duas vezes (computador e celular): vale o que está à vista.
  const visible = <T extends HTMLElement>(selector: string) =>
    [...document.querySelectorAll<T>(selector)].find((element) => element.offsetParent !== null)
  let name = ''
  let opened = true
  for (const step of path) {
    if (typeof step === 'number') {
      const list = visible(`.ed-list[data-name="${CSS.escape(name)}"]`)
      const summaries = [
        ...(list?.querySelectorAll<HTMLElement>('[class*="ArrayFieldItem-summary"]') ?? []),
      ].filter((summary) => summary.closest('.ed-list') === list)
      const summary = summaries[step]
      const item = summary?.closest<HTMLElement>('[class*="ArrayFieldItem_"]')
      if (!summary) opened = false
      else if (!item?.className.includes('isExpanded')) summary.click()
      name += `[${step}]`
    } else name += `${name ? '.' : ''}${step}`
  }
  const field = visible(
    `[data-name="${CSS.escape(name)}"] :is(input, textarea, [contenteditable="true"])`,
  )
  if (field && opened) {
    field.scrollIntoView({ block: 'center' })
    field.focus({ preventScroll: true })
    return
  }
  if (attempt < REVEAL_TRIES) setTimeout(() => revealField(path, attempt + 1), 80)
}
