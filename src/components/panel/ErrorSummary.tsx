'use client'

import React from 'react'

/**
 * Campos errados numa tela comprida (B5): diz quantos são e leva até o primeiro, com o cursor nele.
 * O primeiro é o de cima na tela (os campos errados têm `aria-invalid`).
 */
export function ErrorSummary({ count }: { count: number }) {
  if (!count) return null
  const goToFirst = () => {
    const field = document.querySelector<HTMLElement>('.gp-page [aria-invalid="true"]')
    if (!field) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    field.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' })
    field.focus({ preventScroll: true })
  }
  return (
    <p className="gp-error gp-errorsummary" role="status">
      <span>{count === 1 ? '1 campo para corrigir' : `${count} campos para corrigir`}</span>
      <button className="gp-btn gp-btn--sm" onClick={goToFirst} type="button">
        {count === 1 ? 'Ir para o campo' : 'Ir para o primeiro'}
      </button>
    </p>
  )
}
