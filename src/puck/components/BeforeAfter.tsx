'use client'

import React, { useState } from 'react'

/**
 * Um par do Antes e depois (C5). As duas fotos vêm prontas do servidor. No celular (e em
 * "Deslizante" também no computador), a foto de antes fica por cima, cortada até a linha, e um
 * controle deslizante de verdade (`input type="range"`) move a linha: funciona arrastando, tocando
 * e pelas setas do teclado (5% por toque; Home e End vão às pontas). Em "Lado a lado no
 * computador", o CSS mostra as duas fotos uma ao lado da outra e esconde o controle.
 */
export function BeforeAfterPair({
  before,
  after,
  layout,
  caption,
}: {
  before: React.ReactNode
  after: React.ReactNode
  layout: 'auto' | 'slider'
  caption: string
}) {
  const [position, setPosition] = useState(50)
  const move = (next: number) => setPosition(Math.min(100, Math.max(0, next)))
  return (
    <div
      className="ba"
      data-layout={layout}
      style={{ '--pos': `${position}%` } as React.CSSProperties}
    >
      <div className="ba__side ba__side--after">
        {after}
        <span className="ba__tag ba__tag--after">Depois</span>
      </div>
      <div className="ba__side ba__side--before">
        {before}
        <span className="ba__tag ba__tag--before">Antes</span>
      </div>
      <input
        aria-label={caption ? `Comparar antes e depois: ${caption}` : 'Comparar antes e depois'}
        aria-valuetext={`${position}% da foto de antes`}
        className="ba__range"
        max={100}
        min={0}
        onChange={(event) => move(Number(event.target.value))}
        onKeyDown={(event) => {
          const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[event.key]
          if (step === undefined) return
          event.preventDefault()
          move(position + step)
        }}
        step={1}
        type="range"
        value={position}
      />
      <span aria-hidden="true" className="ba__handle">
        <span className="ba__knob">
          <svg
            fill="none"
            height="18"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="18"
          >
            <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
          </svg>
        </span>
      </span>
    </div>
  )
}
