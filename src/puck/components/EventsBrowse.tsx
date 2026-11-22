'use client'

import React, { useEffect, useState } from 'react'

import { countdownText, splitEvents } from '@/lib/events'

export type EventCard = {
  /** O cartão já desenhado no servidor (data, título, local, botões). */
  node: React.ReactNode
  date: string
  time: string
  title: string
}

const order = (index: number) => ({ '--i': index }) as React.CSSProperties

/**
 * Lista da Agenda (B5). Os próximos primeiro, do mais perto para o mais longe; os que passaram saem
 * sozinhos ou vão para "Já aconteceu", fechado quando ainda há datas pela frente. A página pode ter
 * sido gerada dias antes: o servidor desenha com a hora dele (`now`) e, depois de abrir, a lista
 * confere com a hora do aparelho e volta a conferir a cada minuto (com a contagem junto).
 *
 * No editor, as datas ficam na ordem da lista do painel, com "Já passou" nas antigas.
 */
export function EventsBrowse({
  cards,
  past,
  countdown,
  now: serverNow,
  editing,
}: {
  cards: EventCard[]
  past: 'hide' | 'list'
  countdown: boolean
  now: number
  editing?: boolean
}) {
  const [now, setNow] = useState(serverNow)

  useEffect(() => {
    if (editing) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a hora do aparelho só existe no navegador
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [editing])

  const { upcoming, past: gone } = splitEvents(cards, new Date(now))

  if (editing) {
    const goneSet = new Set(gone)
    return (
      <ol className="events">
        {cards.map((card, index) => (
          <li
            className={`events__item anim-part${goneSet.has(index) ? ' events__item--past' : ''}`}
            key={index}
            style={order(index)}
          >
            {card.node}
          </li>
        ))}
      </ol>
    )
  }

  const next = upcoming[0] === undefined ? null : cards[upcoming[0]]
  const remaining = countdown && next ? countdownText(next, new Date(now)) : null
  const showPast = past === 'list' && gone.length > 0

  return (
    <>
      {remaining && next && (
        <p className="events__countdown anim-part">
          <span className="events__countdown-label">Próxima data: {next.title}</span>
          <strong className="events__countdown-time">{remaining}</strong>
        </p>
      )}
      {upcoming.length ? (
        <ol className="events">
          {upcoming.map((index, position) => (
            <li className="events__item anim-part" key={index} style={order(position)}>
              {cards[index].node}
            </li>
          ))}
        </ol>
      ) : (
        <p className="events__empty anim-part">Nenhuma data marcada agora. Volte em breve.</p>
      )}
      {showPast && (
        <details className="events__past anim-part" open={!upcoming.length || undefined}>
          <summary>
            Já aconteceu <span className="events__past-count">({gone.length})</span>
          </summary>
          <ol className="events events--past">
            {gone.map((index) => (
              <li className="events__item events__item--past" key={index}>
                {cards[index].node}
              </li>
            ))}
          </ol>
        </details>
      )}
    </>
  )
}
