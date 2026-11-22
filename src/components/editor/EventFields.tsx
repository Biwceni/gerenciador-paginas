'use client'

import React from 'react'

import { eventDateParts, todayInBrazil } from '@/lib/events'

/**
 * Dia e horário de uma data da Agenda (B5), com os seletores do próprio aparelho (calendário e
 * relógio). Guardam no formato do site: "2026-12-14" e "19:30" (vazio: sem horário).
 */
export function EventDateField({
  value,
  onChange,
  readOnly,
  label,
}: {
  value: string | undefined
  onChange: (value: string) => void
  readOnly?: boolean
  label: string
}) {
  const parts = value ? eventDateParts(value) : null
  const past = Boolean(value && parts && value < todayInBrazil(new Date()))
  return (
    <div className="ed-event-date">
      <input
        aria-label={label}
        className="ed-input"
        disabled={readOnly}
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value ?? ''}
      />
      {parts && (
        <span className={`ed-hint${past ? ' ed-hint--warn' : ''}`}>
          {parts.full}
          {past && '. Já passou.'}
        </span>
      )}
    </div>
  )
}

export function EventTimeField({
  value,
  onChange,
  readOnly,
  label,
}: {
  value: string | undefined
  onChange: (value: string) => void
  readOnly?: boolean
  label: string
}) {
  return (
    <div className="ed-event-time">
      <input
        aria-label={label}
        className="ed-input"
        disabled={readOnly}
        onChange={(event) => onChange(event.target.value)}
        step={300}
        type="time"
        value={value ?? ''}
      />
      {value && (
        <button
          className="ed-btn ed-btn--sm ed-btn--ghost"
          disabled={readOnly}
          onClick={() => onChange('')}
          type="button"
        >
          Sem horário
        </button>
      )}
    </div>
  )
}
