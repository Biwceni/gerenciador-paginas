'use client'

import { FieldLabel } from '@puckeditor/core'
import React, { useEffect, useRef, useState } from 'react'

type ObjectFieldProps = {
  children: React.ReactNode
  field: { label?: string; objectFields?: Record<string, unknown> }
  name: string
  readOnly?: boolean
  value?: unknown
  onChange?: (value: unknown) => void
}

/** O campo é um botão de seção: texto e destino. */
const isButtonField = (field: ObjectFieldProps['field']) =>
  Boolean(field.objectFields && 'label' in field.objectFields && 'link' in field.objectFields)

const emptyLabel = (value: unknown) =>
  !value || typeof value !== 'object' || !String((value as { label?: unknown }).label ?? '').trim()

/**
 * Campos agrupados do painel (override `fieldTypes.object`). O botão de seção vazio vira um convite
 * tracejado, "+ Pôr um botão (opcional)" (A5, achado ODO5): antes os dois campos vazios pareciam
 * um botão esquecido. Um toque abre os campos, com o foco no texto do botão.
 */
export function OptionalButton({ children, field, onChange, readOnly, value }: ObjectFieldProps) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const asked = useRef(false)
  const collapsed = isButtonField(field) && emptyLabel(value) && !open

  useEffect(() => {
    if (!open || !asked.current) return
    asked.current = false
    box.current?.querySelector<HTMLElement>('input, textarea')?.focus()
  }, [open])

  if (!isButtonField(field)) return <>{children}</>
  if (!collapsed) return <div ref={box}>{children}</div>

  return (
    <FieldLabel el="div" label={field.label ?? 'Botão'} readOnly={readOnly}>
      <button
        className="ed-add-optional"
        disabled={readOnly}
        onClick={() => {
          asked.current = true
          // Botão ainda sem nada guardado (o segundo botão do Banner, o do Texto com foto): vira
          // um botão vazio, para o texto digitado ter onde ficar.
          if (value == null) onChange?.({ label: '', link: null })
          setOpen(true)
        }}
        type="button"
      >
        <b>+ Pôr um botão (opcional)</b>
        <span>Sem botão, a seção fica só com o texto.</span>
      </button>
    </FieldLabel>
  )
}
