'use client'

import React, { useId, useState } from 'react'

import {
  CONSENT_INPUT,
  CONSENT_TEXT,
  type FormDefinition,
  type FormFieldType,
  HONEYPOT_FIELD,
  validatePhone,
} from '@/lib/forms'

import { DayField, FileField, type FileState, TimeField, UnitField, useNow } from './SiteFormFields'

type Props = {
  form: FormDefinition
  pageId?: number
  /** Frase da seção, de antes da tela de Formulários: vale se o formulário não tiver a dele. */
  successMessage: string
  /** Prévia do editor: campos desligados, nada é enviado. */
  preview?: boolean
  /** Página de privacidade no ar: o "Concordo" leva até ela. */
  privacyHref?: string | null
  /** D2: nomes das unidades das Configurações, para o campo "Unidade". */
  units?: string[]
}

type Status = { state: 'idle' | 'sending' | 'sent' } | { state: 'error'; message: string }

const INPUT_TYPES: Partial<Record<FormFieldType, string>> = { email: 'email', phone: 'tel' }

/** O navegador segura o envio enquanto o número não servir. O servidor confere de novo. */
const checkPhone = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
  const result = target.value.trim() ? validatePhone(target.value.trim()) : true
  target.setCustomValidity(result === true ? '' : result)
}

type PayloadError = { errors?: { message?: string; data?: { errors?: { message?: string }[] } }[] }

/**
 * Formulário da seção "Formulário". Envia para a coleção de mensagens do plugin, que confere tudo
 * de novo no servidor (campos, e-mail, "Concordo" e a armadilha contra robôs).
 */
export function SiteForm({
  form,
  pageId,
  successMessage,
  preview,
  privacyHref,
  units = [],
}: Props) {
  const prefix = useId()
  const [status, setStatus] = useState<Status>({ state: 'idle' })
  const now = useNow()
  // O dia escolhido (o primeiro campo de dia): o horário de hoje esconde o que já passou.
  const dayField = form.fields.find((field) => field.type === 'date')
  const [day, setDay] = useState('')
  const [files, setFiles] = useState<Record<string, FileState>>({})

  if (status.state === 'sent') {
    return (
      <p className="site-form__sent" role="status">
        {form.successMessage ||
          successMessage.trim() ||
          'Recebemos sua mensagem! Respondemos em breve.'}
      </p>
    )
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (preview) return
    for (const field of form.fields) {
      if (field.type !== 'file') continue
      const file = files[field.name]
      if (file?.state === 'sending') {
        setStatus({ state: 'error', message: 'Espere o arquivo terminar de enviar.' })
        return
      }
      if (field.required && file?.state !== 'sent') {
        setStatus({ state: 'error', message: `Envie o arquivo em “${field.label}”.` })
        return
      }
    }
    const values = new FormData(event.currentTarget)
    setStatus({ state: 'sending' })
    try {
      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: form.id,
          page: pageId,
          consent: values.get(CONSENT_INPUT) === 'on',
          submissionData: [
            ...form.fields.map((field) => ({
              field: field.name,
              value:
                field.type === 'checkbox'
                  ? String(values.get(field.name) === 'on')
                  : String(values.get(field.name) ?? ''),
            })),
            { field: HONEYPOT_FIELD, value: String(values.get(HONEYPOT_FIELD) ?? '') },
          ],
        }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as PayloadError
        const error = body.errors?.[0]
        throw new Error(error?.data?.errors?.[0]?.message || error?.message || '')
      }
      setStatus({ state: 'sent' })
    } catch (error) {
      setStatus({
        state: 'error',
        message:
          (error instanceof Error && error.message) ||
          'Não deu para enviar. Confira a internet e tente de novo.',
      })
    }
  }

  const id = (name: string) => `${prefix}-${name}`

  return (
    <form className="site-form" noValidate={false} onSubmit={submit}>
      {form.fields.map((field) =>
        field.type === 'date' ? (
          <DayField
            disabled={preview}
            field={field}
            key={field.name}
            now={now}
            onChange={field === dayField ? setDay : () => undefined}
            value={field === dayField ? day : ''}
          />
        ) : field.type === 'time' ? (
          <TimeField
            day={day}
            disabled={preview}
            field={field}
            hasDayField={Boolean(dayField)}
            key={field.name}
            now={now}
          />
        ) : field.type === 'unit' ? (
          <UnitField disabled={preview} field={field} key={field.name} units={units} />
        ) : field.type === 'file' ? (
          <FileField
            disabled={preview}
            field={field}
            formId={form.id}
            key={field.name}
            onChange={(next) => setFiles((current) => ({ ...current, [field.name]: next }))}
            state={files[field.name] ?? { state: 'empty' }}
          />
        ) : field.type === 'checkbox' ? (
          <label className="site-form__check" key={field.name}>
            <input disabled={preview} name={field.name} required={field.required} type="checkbox" />
            <span>{field.label}</span>
          </label>
        ) : (
          <div className="site-form__field" key={field.name}>
            <label htmlFor={id(field.name)}>
              {field.label}
              {field.required ? '' : ' (opcional)'}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                disabled={preview}
                id={id(field.name)}
                maxLength={5000}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
                rows={5}
              />
            ) : field.type === 'select' ? (
              <select
                defaultValue=""
                disabled={preview}
                id={id(field.name)}
                name={field.name}
                required={field.required}
              >
                <option disabled value="">
                  {field.placeholder || 'Escolha uma opção'}
                </option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                autoComplete={
                  field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : undefined
                }
                disabled={preview}
                id={id(field.name)}
                maxLength={500}
                name={field.name}
                onChange={field.type === 'phone' ? checkPhone : undefined}
                placeholder={field.placeholder}
                required={field.required}
                type={INPUT_TYPES[field.type] ?? 'text'}
              />
            )}
          </div>
        ),
      )}

      {/* Armadilha para robôs: escondida de quem enxerga e de leitores de tela. */}
      <div aria-hidden="true" className="site-form__trap">
        <label htmlFor={id(HONEYPOT_FIELD)}>Não preencha</label>
        <input
          autoComplete="off"
          id={id(HONEYPOT_FIELD)}
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          type="text"
        />
      </div>

      <label className="site-form__check">
        <input disabled={preview} name={CONSENT_INPUT} required type="checkbox" />
        <span>
          {CONSENT_TEXT}
          {privacyHref && (
            <>
              {' '}
              {preview ? (
                'Leia a política de privacidade.'
              ) : (
                // Em outra aba, para o que já foi preenchido não se perder.
                <a href={privacyHref} rel="noopener" target="_blank">
                  Leia a política de privacidade.
                </a>
              )}
            </>
          )}
        </span>
      </label>

      {status.state === 'error' && (
        <p className="site-form__error" role="alert">
          {status.message}
        </p>
      )}

      <div>
        <button
          className="button"
          disabled={status.state === 'sending'}
          type={preview ? 'button' : 'submit'}
        >
          {status.state === 'sending' ? 'Enviando…' : form.submitLabel}
        </button>
      </div>
    </form>
  )
}
