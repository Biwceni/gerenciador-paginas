'use client'

import React, { useEffect, useId, useRef } from 'react'

import { countsVisibleLetters, fieldLimit } from '@/puck/fieldLimits'
import { visibleLength } from '@/puck/limits'

import { usePuck } from './puck'

const numbers = new Intl.NumberFormat('pt-BR')

/** Quantas letras a pessoa ainda tem, em palavras: "32 de 60". */
export function counterText(length: number, max: number): string {
  const base = `${numbers.format(length)} de ${numbers.format(max)}`
  return length > max
    ? `${base}. Passou ${numbers.format(length - max)}: encurte para salvar.`
    : base
}

/**
 * Campos de texto do painel (override `fieldTypes` do Puck) com o limite à vista: o campo de
 * sempre, e embaixo "32 de 60". Perto do fim o número muda de cor; passou, o campo fica marcado e
 * diz quanto encurtar. O limite vem do formato da página (`fieldLimit`).
 */
export function CountedField({
  children,
  name,
  value,
}: {
  children: React.ReactNode
  name: string
  value?: unknown
}) {
  const type = usePuck((s) => s.selectedItem?.type)
  const max = fieldLimit(type, name)
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const text = typeof value === 'string' ? value : ''
  const length = countsVisibleLetters(type, name) ? visibleLength(text) : text.length
  const over = max !== null && length > max

  // O campo é o do Puck: o aviso e a marcação de inválido chegam nele pelo DOM.
  useEffect(() => {
    const input = box.current?.querySelector<HTMLElement>(
      'input, textarea, [contenteditable="true"]',
    )
    if (!input || max === null) return
    input.setAttribute('aria-describedby', id)
    if (over) input.setAttribute('aria-invalid', 'true')
    else input.removeAttribute('aria-invalid')
  }, [id, max, over])

  if (max === null) return <>{children}</>
  const tone = over ? 'over' : length >= max * 0.9 ? 'near' : 'ok'

  return (
    <div className="ed-counted" data-tone={tone} ref={box}>
      {children}
      <span aria-live={over ? 'polite' : 'off'} className="ed-counter" id={id}>
        {counterText(length, max)}
      </span>
    </div>
  )
}
