'use client'

import React, { useState } from 'react'

import { PanelIcon } from '@/components/panel/PanelIcon'
import { SECTION_LABELS } from '@/puck/config'
import type { PageComponent } from '@/puck/schema'
import { sectionSummary } from '@/puck/sectionSummary'

import { scrollToSection } from './insert'
import { MOBILE_WIDTH, ROOT_ZONE, usePuck } from './puck'
import { useMoveSection } from './SectionActions'
import { ClosePanel } from './SectionList'

const LABELS: Record<string, string> = SECTION_LABELS

/**
 * Aba Ordem (no lugar da árvore do Puck, que não mostra o texto nem as setas). Só as seções da
 * página: o que fica dentro das colunas se muda na prévia. Para arrastar a linha, o próprio
 * navegador; o celular não arrasta assim, e por isso as setas ficam sempre à vista.
 */
export function OrderPanel() {
  const content = usePuck((s) => s.appState.data.content) as PageComponent[]
  const selector = usePuck((s) => s.appState.ui.itemSelector)
  const dispatch = usePuck((s) => s.dispatch)
  const move = useMoveSection()
  const [dragged, setDragged] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const select = (index: number) => {
    dispatch({
      type: 'setUi',
      ui: {
        itemSelector: { index, zone: ROOT_ZONE },
        // No celular a lista cobre a prévia: fecha para mostrar a seção.
        ...(window.innerWidth < MOBILE_WIDTH ? { leftSideBarVisible: false } : {}),
      },
      recordHistory: false,
    })
    scrollToSection(content[index].props.id)
  }

  return (
    <div className="ed-panel ed-order">
      <ClosePanel />
      <div>
        <h3>Ordem das seções</h3>
        <p className="ed-hint">Clique para ir até a seção. Use as setas para mudar de lugar.</p>
      </div>
      {content.length === 0 ? (
        <p className="ed-hint">A página ainda não tem seções.</p>
      ) : (
        <ol className="ed-order__list">
          {content.map((item, index) => {
            const chosen = selector?.index === index && (selector.zone ?? ROOT_ZONE) === ROOT_ZONE
            const summary = sectionSummary(item)
            const classes = [
              'ed-order__item',
              chosen && 'ed-order__item--on',
              over === index && dragged !== index && 'ed-order__item--over',
            ]
            return (
              <li
                className={classes.filter(Boolean).join(' ')}
                draggable
                key={item.props.id}
                onDragEnd={() => {
                  setDragged(null)
                  setOver(null)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  setOver(index)
                }}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  setDragged(index)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (dragged !== null && dragged !== index) move(ROOT_ZONE, dragged, index)
                }}
              >
                <button
                  className="ed-order__name"
                  onClick={() => select(index)}
                  title={summary}
                  type="button"
                >
                  <PanelIcon name="grip" size={16} />
                  <span>
                    <b>{LABELS[item.type] ?? item.type}</b>
                    <span>{summary}</span>
                  </span>
                </button>
                <button
                  aria-label={`Subir ${LABELS[item.type] ?? item.type}`}
                  className="ed-icon-btn ed-icon-btn--sm"
                  disabled={index === 0}
                  onClick={() => move(ROOT_ZONE, index, index - 1)}
                  title="Subir"
                  type="button"
                >
                  <PanelIcon name="up" size={15} />
                </button>
                <button
                  aria-label={`Descer ${LABELS[item.type] ?? item.type}`}
                  className="ed-icon-btn ed-icon-btn--sm"
                  disabled={index === content.length - 1}
                  onClick={() => move(ROOT_ZONE, index, index + 1)}
                  title="Descer"
                  type="button"
                >
                  <PanelIcon name="down" size={15} />
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
