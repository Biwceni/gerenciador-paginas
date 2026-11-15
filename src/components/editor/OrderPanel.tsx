'use client'

import React, { useState } from 'react'

import { PanelIcon } from '@/components/panel/PanelIcon'
import { SECTION_LABELS } from '@/puck/config'
import type { PageComponent } from '@/puck/schema'
import { sectionSummary } from '@/puck/sectionSummary'

import { columnCount, useMovePiece } from './columnMove'
import { pieceName } from './ColumnPieces'
import { HeadingOutline } from './HeadingOutline'
import { scrollToSection } from './insert'
import { Tap } from './Tap'
import { MOBILE_WIDTH, ROOT_ZONE, usePuck } from './puck'
import { useMoveSection } from './SectionActions'
import { ClosePanel } from './SectionList'

const LABELS: Record<string, string> = SECTION_LABELS

/**
 * Aba Ordem (no lugar da árvore do Puck, que não mostra o texto nem as setas). As seções da página
 * e, embaixo das Colunas, as peças de cada coluna (C9). Para arrastar a linha, o próprio
 * navegador; o celular não arrasta assim, e por isso as setas ficam sempre à vista.
 */
export function OrderPanel() {
  // O Puck desenha a aba mesmo fechada: a lista só existe com ela aberta, senão cada letra digitada
  // no painel redesenharia a lista inteira das seções (achado 13.5).
  const open = usePuck(
    (s) => s.appState.ui.leftSideBarVisible && s.appState.ui.plugin.current === 'outline',
  )
  return open ? <OrderList /> : <></>
}

function OrderList() {
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
        <p className="ed-hint">
          <Tap /> para ir até a seção. Use as setas para mudar de lugar.
        </p>
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
                {item.type === 'Columns' && <ColumnTree section={item} />}
              </li>
            )
          })}
        </ol>
      )}
      {content.length > 0 && <HeadingOutline />}
    </div>
  )
}

type Piece = { type: string; props: Record<string, unknown> }

/**
 * As peças de cada coluna, embaixo da linha das Colunas (C9, como o Navegador do Elementor): tocar
 * numa peça vai até ela e abre as opções; o ⇄ leva a peça para a coluna seguinte.
 */
function ColumnTree({ section }: { section: PageComponent }) {
  const dispatch = usePuck((s) => s.dispatch)
  const movePiece = useMovePiece()
  const sectionId = String(section.props.id)
  const props = section.props as Record<string, unknown>
  const total = columnCount(props.layout)
  const select = (zone: string, index: number, id: string) => {
    dispatch({
      type: 'setUi',
      ui: {
        itemSelector: { index, zone },
        plugin: { current: 'fields' },
        ...(window.innerWidth < MOBILE_WIDTH ? { leftSideBarVisible: false } : {}),
      },
      recordHistory: false,
    })
    scrollToSection(id)
  }
  return (
    <div className="ed-order__tree">
      {Array.from({ length: total }, (_, at) => {
        const n = at + 1
        const raw = props[`column${n}`]
        const pieces = (Array.isArray(raw) ? raw : []) as Piece[]
        const next = n === total ? 1 : n + 1
        return (
          <div className="ed-order__col" key={n}>
            <b>Coluna {n}</b>
            {pieces.length === 0 && <span className="ed-hint">vazia</span>}
            {pieces.map((piece, index) => (
              <div className="ed-order__piece" key={String(piece.props.id ?? index)}>
                <button
                  className="ed-order__piece-name"
                  onClick={() =>
                    select(`${sectionId}:column${n}`, index, String(piece.props.id ?? sectionId))
                  }
                  type="button"
                >
                  {pieceName(piece)}
                </button>
                <button
                  aria-label={`Levar para a Coluna ${next}`}
                  className="ed-icon-btn ed-icon-btn--sm"
                  onClick={() => movePiece(sectionId, n, index, next)}
                  title={`Levar para a Coluna ${next}`}
                  type="button"
                >
                  <span aria-hidden="true">⇄</span>
                </button>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
