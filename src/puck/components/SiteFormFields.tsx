'use client'

import React, { useEffect, useRef, useState } from 'react'

import { todayInBrazil } from '@/lib/events'
import {
  acceptAttribute,
  bookableDays,
  checkFile,
  dayButtonText,
  dayText,
  fileSizeText,
  type FormFieldDefinition,
  openSlots,
  timeSlots,
} from '@/lib/forms'
import { clockText } from '@/lib/units'

// D2: os campos novos do formulário do site (dia, horário, unidade e arquivo).

/** A hora de agora, só depois de abrir no navegador (a página é gerada antes), conferida a cada minuto. */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

const Legend = ({ field }: { field: FormFieldDefinition }) => (
  <legend className="site-form__legend">
    {field.label}
    {field.required ? '' : ' (opcional)'}
  </legend>
)

/** Dia: botões de 44 px, de hoje até tantos dias à frente, nos dias da semana do campo. */
export function DayField({
  field,
  value,
  onChange,
  now,
  disabled,
}: {
  field: FormFieldDefinition
  value: string
  onChange: (day: string) => void
  now: Date | null
  disabled?: boolean
}) {
  const days = now ? bookableDays(todayInBrazil(now), field.days, field.weekdays) : []
  return (
    <fieldset className="site-form__group">
      <Legend field={field} />
      {now ? (
        days.length ? (
          <div className="site-form__choices site-form__choices--days">
            {days.map((day, index) => {
              const text = dayButtonText(day)
              return (
                <label className="site-form__choice site-form__choice--day" key={day}>
                  <input
                    aria-label={dayText(day)}
                    checked={value === day}
                    disabled={disabled}
                    name={field.name}
                    onChange={() => onChange(day)}
                    required={field.required && index === 0}
                    type="radio"
                    value={day}
                  />
                  <span aria-hidden="true">
                    <small>{text.weekday}</small>
                    {text.date}
                  </span>
                </label>
              )
            })}
          </div>
        ) : (
          <p className="site-form__note">Nenhum dia disponível agora.</p>
        )
      ) : (
        <p className="site-form__note">Carregando os dias…</p>
      )}
    </fieldset>
  )
}

/**
 * Horário: botões de 44 px. Com o dia de hoje escolhido, os horários que já passaram somem; com
 * outro dia (ou sem campo de dia), aparecem todos.
 */
export function TimeField({
  field,
  day,
  hasDayField,
  now,
  disabled,
}: {
  field: FormFieldDefinition
  day: string
  hasDayField: boolean
  now: Date | null
  disabled?: boolean
}) {
  const all = timeSlots(field.from, field.to, field.step)
  const slots = now ? openSlots(all, day, now) : all
  return (
    <fieldset className="site-form__group">
      <Legend field={field} />
      {hasDayField && !day && (
        <p className="site-form__note">Escolha o dia para ver os horários.</p>
      )}
      {slots.length ? (
        <div className="site-form__choices">
          {slots.map((slot, index) => (
            <label className="site-form__choice" key={slot}>
              <input
                disabled={disabled}
                name={field.name}
                required={field.required && index === 0}
                type="radio"
                value={slot}
              />
              <span>{clockText(slot)}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="site-form__note">Não há mais horários hoje. Escolha outro dia.</p>
      )}
    </fieldset>
  )
}

/** Unidade: as unidades das Configurações, em botões. Sem unidade, o campo nem aparece. */
export function UnitField({
  field,
  units,
  disabled,
}: {
  field: FormFieldDefinition
  units: string[]
  disabled?: boolean
}) {
  if (!units.length) return null
  return (
    <fieldset className="site-form__group">
      <Legend field={field} />
      <div className="site-form__choices site-form__choices--wide">
        {units.map((unit, index) => (
          <label className="site-form__choice" key={unit}>
            <input
              disabled={disabled}
              name={field.name}
              required={field.required && index === 0}
              type="radio"
              value={unit}
            />
            <span>{unit}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export type FileState =
  | { state: 'empty' }
  | { state: 'sending'; name: string; progress: number }
  | { state: 'sent'; name: string; size: number; value: string }
  | { state: 'error'; message: string }

type StartResponse = {
  id: number
  token: string
  url: string
  headers: Record<string, string>
  errors?: { message?: string }[]
}

/** Envia o arquivo direto para o armazenamento, com o andamento (0 a 100). */
function sendFile(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error()))
    xhr.onerror = () => reject(new Error())
    xhr.send(file)
  })
}

/**
 * Arquivo ou foto: o envio começa assim que a pessoa escolhe, com a barra de andamento. No
 * celular, também tem "Tirar foto" (abre a câmera). O arquivo vai para um armazenamento privado:
 * só quem está logado no painel abre.
 */
export function FileField({
  field,
  formId,
  state,
  onChange,
  disabled,
}: {
  field: FormFieldDefinition
  formId: number
  state: FileState
  onChange: (state: FileState) => void
  disabled?: boolean
}) {
  const pick = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const accept = field.accept ?? 'photo'
  const id = `arquivo-${field.name}`

  const upload = async (file: File | undefined) => {
    if (!file) return
    const check = checkFile(file, accept)
    if (check !== true) {
      onChange({ state: 'error', message: check })
      return
    }
    onChange({ state: 'sending', name: file.name, progress: 0 })
    try {
      const response = await fetch('/api/form-files/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: formId,
          field: field.name,
          name: file.name,
          type: file.type,
          size: file.size,
        }),
      })
      const body = (await response.json().catch(() => ({}))) as StartResponse
      if (!response.ok) throw new Error(body.errors?.[0]?.message || '')
      await sendFile(body.url, body.headers, file, (progress) =>
        onChange({ state: 'sending', name: file.name, progress }),
      )
      onChange({
        state: 'sent',
        name: file.name,
        size: file.size,
        value: `${body.id}.${body.token}`,
      })
    } catch (error) {
      onChange({
        state: 'error',
        message:
          (error instanceof Error && error.message) ||
          'Não deu para enviar o arquivo. Confira a internet e tente de novo.',
      })
    }
  }

  const choose = (input: HTMLInputElement | null) => {
    if (!input) return
    input.value = ''
    input.click()
  }

  return (
    <fieldset aria-describedby={`${id}-status`} className="site-form__group site-form__file">
      <Legend field={field} />
      <input
        accept={acceptAttribute(accept)}
        className="site-form__hidden-input"
        disabled={disabled}
        onChange={(event) => upload(event.target.files?.[0])}
        ref={pick}
        tabIndex={-1}
        type="file"
      />
      <input
        accept="image/*"
        capture="environment"
        className="site-form__hidden-input"
        disabled={disabled}
        onChange={(event) => upload(event.target.files?.[0])}
        ref={camera}
        tabIndex={-1}
        type="file"
      />
      {state.state === 'sent' && <input name={field.name} type="hidden" value={state.value} />}
      <div className="site-form__file-actions">
        <button
          className="site-form__file-button"
          disabled={disabled || state.state === 'sending'}
          onClick={() => choose(pick.current)}
          type="button"
        >
          {state.state === 'sent' ? 'Trocar o arquivo' : 'Escolher arquivo'}
        </button>
        <button
          className="site-form__file-button site-form__camera"
          disabled={disabled || state.state === 'sending'}
          onClick={() => choose(camera.current)}
          type="button"
        >
          Tirar foto
        </button>
      </div>
      <div aria-live="polite" className="site-form__file-status" id={`${id}-status`}>
        {state.state === 'empty' && (
          <span className="site-form__note">
            {accept === 'photo' ? 'Foto' : 'Foto, PDF ou Word'}, até{' '}
            {fileSizeText(10 * 1024 * 1024)}.
          </span>
        )}
        {state.state === 'sending' && (
          <>
            <span className="site-form__note">
              Enviando {state.name}… {state.progress}%
            </span>
            <progress
              aria-label={`Enviando ${state.name}`}
              className="site-form__progress"
              max={100}
              value={state.progress}
            />
          </>
        )}
        {state.state === 'sent' && (
          <span className="site-form__file-done">
            Enviado: {state.name} ({fileSizeText(state.size)})
            <button
              className="site-form__file-remove"
              onClick={() => onChange({ state: 'empty' })}
              type="button"
            >
              Tirar
            </button>
          </span>
        )}
        {state.state === 'error' && (
          <span className="site-form__error" role="alert">
            {state.message}
          </span>
        )}
      </div>
    </fieldset>
  )
}
