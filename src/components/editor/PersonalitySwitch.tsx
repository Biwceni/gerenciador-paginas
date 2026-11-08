'use client'

import React, { useId } from 'react'

import { type Personality, PERSONALITIES, PERSONALITY_LABELS } from '@/lib/theme'

/**
 * Atalho para a "Personalidade do site" (Sua marca) no topo do editor: troca na hora, na prévia,
 * e guarda no rascunho das configurações. O site só muda quando a pessoa publicar em Sua marca.
 */
export function PersonalitySwitch({
  className,
  disabled,
  onChange,
  value,
}: {
  className?: string
  disabled?: boolean
  onChange: (value: Personality) => void
  value: Personality
}) {
  const id = useId()
  return (
    <div className={`ed-personality${className ? ` ${className}` : ''}`}>
      <label htmlFor={id}>Personalidade</label>
      <select
        className="ed-input"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value as Personality)}
        value={value}
      >
        {PERSONALITIES.map((personality) => (
          <option key={personality} value={personality}>
            {PERSONALITY_LABELS[personality].name}
          </option>
        ))}
      </select>
    </div>
  )
}
