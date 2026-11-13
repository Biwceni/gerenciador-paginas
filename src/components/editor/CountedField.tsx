'use client'

import React, {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'

import { FieldLabel } from '@puckeditor/core'

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

/** Quanto esperar a pessoa parar de digitar para levar o texto à prévia (achado 13.5). */
export const TYPING_PAUSE = 250

type Change = (value: unknown, ...rest: unknown[]) => void

/**
 * Leva o texto à prévia só quando a pessoa para de digitar (achado 13.5). Numa página grande,
 * cada letra levada na hora redesenha a página inteira, e no celular cada tecla demorava. O campo
 * mostra a letra na hora (o Puck guarda o texto no próprio campo enquanto ele tem o foco); a prévia
 * e o salvamento recebem o texto depois de uma pausa, ao sair do campo ou ao fechar a aba. Sair do
 * campo vem antes de qualquer outra escolha (outra seção, Publicar), então o texto nunca vai para
 * a seção errada.
 */
function usePausedChange(onChange: Change | undefined) {
  const pending = useRef<unknown[] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latest = useRef(onChange)
  useEffect(() => {
    latest.current = onChange
  })

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const args = pending.current
    pending.current = null
    if (args) latest.current?.(...(args as [unknown, ...unknown[]]))
  }, [])

  const deferred = useCallback<Change>(
    (...args) => {
      pending.current = args
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, TYPING_PAUSE)
    },
    [flush],
  )

  useEffect(() => {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flush)
      flush()
    }
  }, [flush])

  return { deferred, flush }
}

/** Junta as linhas: título, nome e botão são de uma linha só, mesmo quando a caixa quebra. */
const oneLine = (text: string) => text.replace(/\s*[\r\n]+\s*/g, ' ')

/**
 * Texto de uma linha do painel numa caixa que cresce (achado 11.3): o título de duas linhas fica
 * inteiro à vista, em vez de andar para o lado dentro de um campo estreito. Por baixo continua
 * sendo uma linha só: Enter não quebra, e o que se cola com quebras vira espaço. Como o campo do
 * Puck, guarda o texto enquanto tem o foco e volta a seguir a página quando o foco sai.
 */
export function GrowingText({
  id,
  label,
  name,
  onChange,
  placeholder,
  readOnly,
  value,
}: {
  id?: string
  label: string
  name: string
  onChange: Change
  placeholder?: string
  readOnly?: boolean
  value: unknown
}) {
  const outside = typeof value === 'string' ? value : ''
  const [local, setLocal] = useState(outside)
  const [focused, setFocused] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)
  if (!focused && local !== outside) setLocal(outside)

  // A altura acompanha o texto (o `field-sizing` ainda não vale em todo navegador).
  useEffect(() => {
    const area = box.current
    if (!area) return
    area.style.height = 'auto'
    area.style.height = `${area.scrollHeight}px`
  }, [local])

  return (
    <FieldLabel el="label" label={label} readOnly={readOnly}>
      <textarea
        autoComplete="off"
        className="ed-input ed-grow"
        data-line="one"
        id={id}
        name={name}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = oneLine(event.currentTarget.value)
          setLocal(next)
          onChange(next)
        }}
        onFocus={() => setFocused(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault()
        }}
        placeholder={placeholder}
        readOnly={readOnly}
        ref={box}
        rows={1}
        value={local}
      />
    </FieldLabel>
  )
}

/**
 * Campos de texto do painel (override `fieldTypes` do Puck) com o limite à vista: o campo de
 * sempre, e embaixo "32 de 60". Perto do fim o número muda de cor; passou, o campo fica marcado e
 * diz quanto encurtar. O limite vem do formato da página (`fieldLimit`).
 */
export function CountedField({
  children,
  field,
  id: fieldId,
  name,
  onChange,
  readOnly,
  value,
}: {
  children: React.ReactNode
  field?: { type?: string; label?: string; placeholder?: string }
  id?: string
  name: string
  onChange?: Change
  readOnly?: boolean
  value?: unknown
}) {
  const paused = field?.type === 'text' || field?.type === 'textarea'
  const { deferred, flush } = usePausedChange(onChange)
  // O texto que a pessoa vê no campo, antes de chegar à prévia (para o contador). Vale enquanto o
  // valor do Puck for o de quando a pessoa digitou; um Desfazer, por exemplo, troca o valor e manda.
  const [typed, setTyped] = useState<{ text: unknown; over: unknown } | null>(null)
  const onTyped = useCallback<Change>(
    (next, ...rest) => {
      setTyped({ text: next, over: value })
      deferred(next, ...rest)
    },
    [deferred, value],
  )
  const field_ =
    field?.type === 'text' ? (
      <GrowingText
        id={fieldId}
        label={field.label ?? name}
        name={name}
        onChange={onTyped}
        placeholder={field.placeholder}
        readOnly={readOnly}
        value={value}
      />
    ) : paused && isValidElement(children) ? (
      cloneElement(children as React.ReactElement<{ onChange?: Change }>, { onChange: onTyped })
    ) : (
      children
    )
  const shown = paused && typed && Object.is(typed.over, value) ? typed.text : value
  const type = usePuck((s) => s.selectedItem?.type)
  const max = fieldLimit(type, name)
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const text = typeof shown === 'string' ? shown : ''
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

  if (max === null) {
    return paused ? (
      <div onBlur={flush} style={{ display: 'contents' }}>
        {field_}
      </div>
    ) : (
      <>{children}</>
    )
  }
  const tone = over ? 'over' : length >= max * 0.9 ? 'near' : 'ok'

  return (
    <div className="ed-counted" data-tone={tone} onBlur={paused ? flush : undefined} ref={box}>
      {field_}
      <span aria-live={over ? 'polite' : 'off'} className="ed-counter" id={id}>
        {counterText(length, max)}
      </span>
    </div>
  )
}
