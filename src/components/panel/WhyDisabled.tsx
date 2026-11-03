import React from 'react'

/**
 * Botão principal desligado sempre com o motivo, numa linha curta embaixo dele ("Nada para
 * publicar", "Escolha uma opção para continuar"). O botão aponta para ela com `aria-describedby`.
 */
export function WhyDisabled({ id, reason }: { id: string; reason: string | null }) {
  if (!reason) return null
  return (
    <span className="gp-hint gp-why" id={id}>
      {reason}
    </span>
  )
}
