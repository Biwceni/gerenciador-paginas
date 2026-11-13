'use client'

import React from 'react'

/**
 * Listas do painel (override `fieldTypes.array`): a lista de sempre e, no limite, o aviso de que
 * chegou ao máximo (achado 4.5). Antes o "+" só sumia, sem explicar.
 */
export function ListLimit({
  children,
  field,
  value,
}: {
  children: React.ReactNode
  field: { max?: number }
  value?: unknown
}) {
  const count = Array.isArray(value) ? value.length : 0
  const max = field.max
  if (!max || count < max) return <>{children}</>
  return (
    <div className="ed-list-limit">
      {children}
      <p className="ed-hint" role="status">
        {count} de {max}: é o máximo desta lista. Para colocar outro, tire um.
      </p>
    </div>
  )
}
