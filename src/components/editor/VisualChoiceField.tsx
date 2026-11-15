'use client'

import React from 'react'

import { announceChange } from './adjusted'

type Props = {
  name: string
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  options: VisualOption[]
  label?: string
  columns?: 2 | 3
  /** Miniaturas pequenas numa fileira que desliza para o lado, em vez da grade (Animação, G6). */
  strip?: boolean
}

export type VisualOption = { value: string; label: string; hint?: string; thumb: React.ReactNode }

/**
 * Escolha visual (redesign v3, entrega 5): uma miniatura de cada opção, desenhada nas cores do site,
 * em grade de duas ou três colunas, no lugar do rádio de texto. Serve ao fundo, ao lado da foto, à
 * arrumação, ao marcador, à Animação e às variações das seções. Por baixo, botões de rádio: as
 * setas do teclado trocam, e o leitor de tela lê o grupo e cada opção.
 */
export function VisualChoiceField({
  name,
  onChange,
  options,
  readOnly,
  value,
  label,
  columns = 2,
  strip = false,
}: Props) {
  const row = React.useRef<HTMLDivElement>(null)
  // Na fileira, a escolhida aparece ao abrir o painel, mesmo quando é uma das últimas.
  React.useEffect(() => {
    if (!strip || !row.current) return
    const checked = row.current.querySelector<HTMLElement>('input:checked')?.closest('label')
    if (checked) row.current.scrollLeft = checked.offsetLeft - row.current.offsetLeft - 8
    // Só ao abrir: depois, quem rola é a pessoa.
  }, [strip])
  return (
    <div
      aria-label={label}
      className={`ed-thumbs${strip ? ' ed-thumbs--strip' : columns === 3 ? ' ed-thumbs--3' : ''}`}
      ref={row}
      role="radiogroup"
    >
      {options.map((option) => (
        <label className="ed-thumb" key={option.value}>
          <input
            checked={value === option.value}
            className="ed-thumb__input"
            disabled={readOnly}
            name={name}
            onChange={() => {
              onChange(option.value)
              announceChange(option.label)
            }}
            type="radio"
            value={option.value}
          />
          {option.thumb}
          <span className="ed-thumb__text">
            <b>{option.label}</b>
            {option.hint && <span className="ed-hint">{option.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  )
}
