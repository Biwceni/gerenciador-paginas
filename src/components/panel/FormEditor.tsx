'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import { editorPath } from '@/lib/editor'
import {
  type FormPage,
  formPageName,
  CONSENT_TEXT,
  EMAIL,
  FIELD_TYPE_LABELS,
  type FormFieldType,
  notifyEmailRows,
  parseWeekdays,
  plainToRichText,
  DATE_DAYS_DEFAULT,
  DATE_DAYS_MAX,
  TIME_STEPS,
  timeSlots,
} from '@/lib/forms'
import { panelHref } from '@/lib/panel'
import { PRIVACY_TEMPLATE_KEY } from '@/lib/privacy'
import type { Form } from '@/payload-types'

import { deleteForm, saveForm } from './api'
import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'
import { SaveStatus } from './SaveStatus'

type Props = {
  adminRoute: string
  apiRoute: string
  form: {
    id: number
    title: string
    fields: NonNullable<Form['fields']>
    successMessage: string
    notifyEmail: string
  }
  /** Quantas mensagens o formulário já recebeu. */
  messages: number
  /** Páginas que usam o formulário. */
  pages: FormPage[]
  /** Como está a página de privacidade do site. */
  privacy: { state: 'live' } | { state: 'draft'; pageId: number } | { state: 'none' }
  siteEmail: string
  /** D2: nomes das unidades das Configurações (o tipo "Unidade" mostra estas). */
  units: string[]
}

type RawOption = { label?: string | null; value?: string | null }

type Question = {
  id: string
  blockType: FormFieldType
  /** Vazio em pergunta nova: o servidor dá o nome técnico a partir da pergunta, uma vez só. */
  name?: string
  label: string
  required: boolean
  /** Opções da lista, uma por linha. */
  optionsText: string
  /** Valor já guardado de cada opção, para as mensagens antigas continuarem batendo. */
  optionValues: Record<string, string>
  /** O que veio de outra tela e o editor não mostra (texto de exemplo, valor inicial). */
  extra: Record<string, unknown>
  /**
   * Pergunta nova, com a pessoa ainda escrevendo. Só é salva ao sair do campo: o nome técnico nasce
   * no primeiro salvamento e nunca muda, então não pode nascer de uma pergunta pela metade.
   */
  writing?: boolean
}

type SaveState = 'saved' | 'waiting' | 'saving' | 'error'

/** Id de linha do Payload para uma pergunta nova (texto de 24 letras, como os que ele cria). */
const newRowID = () => crypto.randomUUID().replace(/-/g, '').slice(0, 24)

function toQuestion(block: NonNullable<Form['fields']>[number]): Question {
  const options = ('options' in block ? block.options : null) as RawOption[] | null | undefined
  const placeholder = 'placeholder' in block ? block.placeholder : undefined
  const defaultValue = 'defaultValue' in block ? block.defaultValue : undefined
  return {
    id: block.id ?? newRowID(),
    blockType: block.blockType as FormFieldType,
    name: block.name,
    label: block.label ?? '',
    required: Boolean(block.required),
    optionsText: (options ?? []).map((option) => option.label ?? option.value ?? '').join('\n'),
    optionValues: Object.fromEntries(
      (options ?? []).map((option) => [option.label ?? '', option.value ?? '']),
    ),
    extra: {
      placeholder,
      defaultValue,
      // D2: as opções dos tipos novos (arquivo, dia e horário) vão e voltam como estão.
      ...Object.fromEntries(
        (['accept', 'days', 'weekdays', 'from', 'to', 'step'] as const).flatMap((key) =>
          key in block ? [[key, (block as Record<string, unknown>)[key]]] : [],
        ),
      ),
    },
  }
}

const optionLines = (text: string) => [
  ...new Set(
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  ),
]

function toBlock(question: Question) {
  const { blockType, extra, id, label, name, optionValues, optionsText, required } = question
  return {
    ...extra,
    id,
    blockType,
    name,
    label: label.trim(),
    required,
    width: 100,
    ...(blockType === 'select'
      ? {
          options: optionLines(optionsText).map((line) => ({
            label: line,
            value: optionValues[line] || line,
          })),
        }
      : {}),
  }
}

/** Máximo de perguntas num formulário (B3): os prontos têm até 8. */
const QUESTION_LIMIT = 15

/** "fabio.ormeni@hotmail.com" vira "fabio…@hotmail.com": exemplo que não parece preenchido (B13). */
function maskEmail(email: string) {
  const [user, domain] = email.split('@')
  if (!domain) return email
  return `${user.length > 5 ? `${user.slice(0, 5)}…` : user}@${domain}`
}

export function FormEditor({
  adminRoute,
  apiRoute,
  form,
  messages,
  pages,
  privacy,
  siteEmail,
  units,
}: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(form.title)
  const [questions, setQuestions] = useState<Question[]>(() => form.fields.map(toQuestion))
  const [successMessage, setSuccessMessage] = useState(form.successMessage)
  const [notifyEmail, setNotifyEmail] = useState(form.notifyEmail)
  const [save, setSave] = useState<SaveState>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Um salvamento por vez, na ordem: duas gravações cruzadas poderiam deixar a mais velha por último.
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const pendingSave = useRef<(() => void) | null>(null)

  const formsHref = panelHref(adminRoute, 'forms')

  const changed = () => {
    setSave('waiting')
    setVersion((value) => value + 1)
  }
  const changeQuestion = (id: string, next: Partial<Question>) => {
    setQuestions((list) =>
      list.map((question) => (question.id === id ? { ...question, ...next } : question)),
    )
    changed()
  }
  const move = (index: number, by: -1 | 1) => {
    setQuestions((list) => {
      const next = [...list]
      const [item] = next.splice(index, 1)
      next.splice(index + by, 0, item)
      return next
    })
    changed()
  }
  // Pergunta que acabou de sair, com "Desfazer" (B4).
  const [removed, setRemoved] = useState<{ question: Question; index: number } | null>(null)
  useEffect(() => {
    if (!removed) return
    const timer = setTimeout(() => setRemoved(null), 8000)
    return () => clearTimeout(timer)
  }, [removed])
  const removeQuestion = (id: string) => {
    const index = questions.findIndex((question) => question.id === id)
    if (index < 0) return
    setRemoved({ question: questions[index], index })
    setQuestions((list) => list.filter((question) => question.id !== id))
    changed()
    // O foco vai para a pergunta seguinte (ou a última), não para o começo da página.
    requestAnimationFrame(() => {
      const fields = document.querySelectorAll<HTMLInputElement>('.gp-question input.gp-input')
      fields[Math.min(index, fields.length - 1)]?.focus()
    })
  }
  const undoRemove = () => {
    if (!removed) return
    setQuestions((list) => {
      const next = [...list]
      next.splice(Math.min(removed.index, next.length), 0, removed.question)
      return next.slice(0, QUESTION_LIMIT)
    })
    setRemoved(null)
    changed()
  }
  const addQuestion = () => {
    if (questions.length >= QUESTION_LIMIT) return
    setQuestions((list) => [
      ...list,
      {
        id: newRowID(),
        blockType: 'text',
        label: '',
        required: false,
        optionsText: '',
        optionValues: {},
        extra: {},
        writing: true,
      },
    ])
    changed()
  }

  const emailInvalid = notifyEmail.trim() !== '' && !EMAIL.test(notifyEmail.trim())
  const incomplete =
    !title.trim() ||
    emailInvalid ||
    !questions.length ||
    questions.some(
      (question) =>
        !question.label.trim() ||
        (question.blockType === 'select' && !optionLines(question.optionsText).length) ||
        (question.blockType === 'time' &&
          String(question.extra.to ?? '18:00') <= String(question.extra.from ?? '08:00')),
    )

  const writing = questions.some((question) => question.writing)

  // Salva sozinho, um pouco depois da última mudança, quando está tudo preenchido.
  useEffect(() => {
    pendingSave.current = null
    if (!version || incomplete || writing) return
    const run = () => {
      pendingSave.current = null
      setSave('saving')
      const data = {
        title: title.trim(),
        fields: questions.map(toBlock),
        confirmationType: 'message',
        confirmationMessage: plainToRichText(successMessage),
        emails: notifyEmailRows(notifyEmail),
      }
      queue.current = queue.current.then(async () => {
        try {
          await saveForm(apiRoute, form.id, data)
          setSave((state) => (state === 'saving' ? 'saved' : state))
          setSaveError(null)
        } catch (error) {
          setSave('error')
          setSaveError(error instanceof Error ? error.message : 'Tente de novo.')
        }
      })
    }
    pendingSave.current = run
    const timer = setTimeout(run, 1200)
    return () => clearTimeout(timer)
    // Só a contagem de mudanças dispara: o estado lido é o desta mudança.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, incomplete, writing])

  // Saiu da tela com a espera ainda correndo: grava agora, para a última mudança não se perder.
  useEffect(() => () => pendingSave.current?.(), [])

  // Aviso ao fechar a aba com mudança ainda não guardada.
  useEffect(() => {
    if (save === 'saved') return
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [save])

  const remove = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteForm(apiRoute, form.id)
      router.push(formsHref)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Tente de novo.')
      setDeleting(false)
    }
  }

  const inUse = pages.length > 0
  const blocked = inUse || messages > 0

  return (
    <div className="gp-page" role="main">
      <header className="gp-pagehead">
        <div>
          <Link className="gp-btn gp-btn--sm gp-btn--ghost gp-back" href={formsHref}>
            <PanelIcon name="back" size={14} />
            Formulários
          </Link>
          <h1>{title.trim() || 'Formulário'}</h1>
          <p>Mudou aqui, muda em todas as páginas que usam este formulário. Salva sozinho.</p>
        </div>
        <SaveStatus
          blocked={
            incomplete
              ? 'Falta completar o que está marcado'
              : writing
                ? 'A pergunta é salva quando você sair do campo'
                : null
          }
          error={saveError}
          mode="save"
          onRetry={changed}
          state={save === 'error' ? 'error' : save === 'saved' ? 'saved' : 'saving'}
        />
      </header>

      <section className="gp-card">
        <div className="gp-field">
          <label htmlFor="fm-title">Nome do formulário</label>
          <input
            aria-invalid={!title.trim()}
            className="gp-input"
            id="fm-title"
            maxLength={100}
            onChange={(event) => {
              setTitle(event.target.value)
              changed()
            }}
            value={title}
          />
          {!title.trim() && <span className="gp-hint gp-hint--error">Dê um nome.</span>}
        </div>
      </section>

      <section className="gp-card">
        <h2>Perguntas</h2>
        <p className="gp-small gp-muted">
          Escreva a pergunta como o visitante vai ler. O resto o sistema faz.
        </p>
        {/* Nomes das colunas no computador; no celular, cada campo mostra o seu. */}
        {questions.length > 0 && (
          <div aria-hidden="true" className="gp-questionhead">
            <span>Pergunta</span>
            <span>Tipo de resposta</span>
          </div>
        )}
        <ul className="gp-questions">
          {questions.map((question, index) => {
            const noOptions =
              question.blockType === 'select' && !optionLines(question.optionsText).length
            return (
              <li className="gp-question" key={question.id}>
                <div className="gp-question__field">
                  <span aria-hidden="true" className="gp-question__label">
                    Pergunta
                  </span>
                  <input
                    aria-invalid={!question.label.trim()}
                    aria-label={`Pergunta ${index + 1}`}
                    className="gp-input"
                    maxLength={200}
                    onBlur={() => {
                      if (question.writing && question.label.trim()) {
                        changeQuestion(question.id, { writing: false })
                      }
                    }}
                    onChange={(event) => changeQuestion(question.id, { label: event.target.value })}
                    placeholder="Escreva a pergunta"
                    value={question.label}
                  />
                </div>
                <div className="gp-question__field">
                  <span aria-hidden="true" className="gp-question__label">
                    Tipo de resposta
                  </span>
                  <select
                    aria-label={`Tipo de resposta da pergunta ${index + 1}`}
                    className="gp-input"
                    onChange={(event) =>
                      changeQuestion(question.id, {
                        blockType: event.target.value as FormFieldType,
                        // O que veio de outro tipo não serve neste (ex.: valor inicial da caixa).
                        extra: {},
                      })
                    }
                    value={question.blockType}
                  >
                    {Object.entries(FIELD_TYPE_LABELS).map(([type, label]) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="gp-question__moves">
                  <label className="gp-question__required">
                    <input
                      checked={question.required}
                      onChange={(event) =>
                        changeQuestion(question.id, { required: event.target.checked })
                      }
                      type="checkbox"
                    />
                    Obrigatória
                  </label>
                  <button
                    aria-label={`Subir ${question.label.trim() || `a pergunta ${index + 1}`}`}
                    className="gp-iconbtn gp-iconbtn--move"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    type="button"
                  >
                    <PanelIcon name="up" size={18} />
                  </button>
                  <button
                    aria-label={`Descer ${question.label.trim() || `a pergunta ${index + 1}`}`}
                    className="gp-iconbtn gp-iconbtn--move"
                    disabled={index === questions.length - 1}
                    onClick={() => move(index, 1)}
                    type="button"
                  >
                    <PanelIcon name="down" size={18} />
                  </button>
                  <button
                    aria-label={`Tirar ${question.label.trim() || `a pergunta ${index + 1}`} do formulário`}
                    className="gp-iconbtn gp-iconbtn--move"
                    disabled={questions.length < 2}
                    onClick={() => removeQuestion(question.id)}
                    type="button"
                  >
                    <PanelIcon name="x" size={18} />
                  </button>
                </div>
                {!question.label.trim() && (
                  <span className="gp-hint gp-hint--error gp-question__full">
                    Escreva a pergunta.
                  </span>
                )}
                <QuestionOptions
                  onChange={(extra) =>
                    changeQuestion(question.id, { extra: { ...question.extra, ...extra } })
                  }
                  question={question}
                  units={units}
                />
                {question.blockType === 'select' && (
                  <div className="gp-field gp-question__full">
                    <label htmlFor={`opts-${question.id}`}>Opções, uma por linha</label>
                    <textarea
                      aria-invalid={noOptions}
                      className="gp-input"
                      id={`opts-${question.id}`}
                      onChange={(event) =>
                        changeQuestion(question.id, { optionsText: event.target.value })
                      }
                      rows={3}
                      value={question.optionsText}
                    />
                    {noOptions && (
                      <span className="gp-hint gp-hint--error">Escreva ao menos uma opção.</span>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        {removed && (
          <p className="gp-notice gp-undo" role="status">
            <span>
              “{removed.question.label.trim() || 'Pergunta sem texto'}” saiu do formulário.
            </span>
            <button className="gp-btn gp-btn--sm" onClick={undoRemove} type="button">
              Desfazer
            </button>
          </p>
        )}
        <div className="gp-addrow">
          <button
            aria-describedby={questions.length >= QUESTION_LIMIT ? 'fm-add-why' : undefined}
            className="gp-btn gp-btn--sm"
            disabled={questions.length >= QUESTION_LIMIT}
            onClick={addQuestion}
            type="button"
          >
            <PanelIcon name="plus" size={14} />
            Adicionar pergunta
          </button>
          {questions.length >= QUESTION_LIMIT && (
            <span className="gp-hint" id="fm-add-why">
              O formulário já tem {QUESTION_LIMIT} perguntas, o máximo. Formulário comprido faz o
              visitante desistir: tire uma para colocar outra.
            </span>
          )}
        </div>
      </section>

      <div className="gp-grid2">
        <section className="gp-card">
          <h2>Depois que a pessoa envia</h2>
          <div className="gp-field">
            <label htmlFor="fm-done">Mensagem na tela</label>
            <textarea
              className="gp-input"
              id="fm-done"
              maxLength={200}
              onChange={(event) => {
                setSuccessMessage(event.target.value)
                changed()
              }}
              placeholder="Recebemos sua mensagem! Respondemos em breve."
              rows={3}
              value={successMessage}
            />
          </div>
          <div className="gp-field">
            <label htmlFor="fm-notify">Avisar neste e-mail</label>
            <input
              aria-invalid={emailInvalid}
              autoComplete="off"
              className="gp-input"
              id="fm-notify"
              onChange={(event) => {
                setNotifyEmail(event.target.value)
                changed()
              }}
              placeholder={siteEmail ? `Vazio: avisamos em ${maskEmail(siteEmail)}` : 'seu e-mail'}
              type="email"
              value={notifyEmail}
            />
            {emailInvalid ? (
              <span className="gp-hint gp-hint--error">Confira o e-mail.</span>
            ) : (
              <span className="gp-hint">
                Se ficar vazio, avisamos no e-mail das Configurações. A mensagem também fica em
                Mensagens.
              </span>
            )}
          </div>
        </section>

        <section className="gp-card">
          <h2>Privacidade</h2>
          <p className="gp-small">
            Todo formulário pede que a pessoa concorde com o uso dos dados.
          </p>
          <p className="gp-small gp-muted">A frase é: “{CONSENT_TEXT}”</p>
          {privacy.state === 'live' ? (
            <p className="gp-small gp-muted">O aviso aponta para a sua página de privacidade.</p>
          ) : privacy.state === 'draft' ? (
            <div className="gp-warnbox">
              <span>
                Sua página de privacidade ainda não está no ar. Publique para o aviso apontar para
                ela.
              </span>
              <div>
                <Link className="gp-btn gp-btn--sm" href={editorPath(adminRoute, privacy.pageId)}>
                  Abrir a página
                </Link>
              </div>
            </div>
          ) : (
            <div className="gp-warnbox">
              <span>Seu site ainda não tem página de privacidade (LGPD).</span>
              <div>
                <Link
                  className="gp-btn gp-btn--sm"
                  href={`${panelHref(adminRoute, 'newPage')}?modelo=${PRIVACY_TEMPLATE_KEY}`}
                >
                  Criar agora
                </Link>
              </div>
            </div>
          )}
          <div className="gp-field">
            <span className="gp-label">Usado em</span>
            {inUse ? (
              <ul className="gp-formpages">
                {pages.map((page) => (
                  <li key={page.id}>
                    <Link className="gp-link" href={editorPath(adminRoute, page.id)}>
                      {formPageName(page)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="gp-small gp-muted">
                Em nenhuma página. Coloque com a seção “Formulário” no editor.
              </span>
            )}
          </div>
          <div>
            <button
              className="gp-btn gp-btn--sm gp-btn--danger"
              disabled={blocked}
              onClick={() => setConfirmDelete(true)}
              type="button"
            >
              <PanelIcon name="trash" size={14} />
              Excluir formulário
            </button>
          </div>
          {inUse ? (
            <span className="gp-hint">Para excluir, tire a seção das páginas antes.</span>
          ) : messages > 0 ? (
            <span className="gp-hint">
              Para excluir, apague antes as mensagens dele, em Mensagens.
            </span>
          ) : null}
        </section>
      </div>

      {confirmDelete && (
        <PanelDialog onClose={() => setConfirmDelete(false)} title="Excluir este formulário?">
          <div className="gp-stack">
            <p>“{title}” some do painel. Não dá para desfazer.</p>
            {deleteError && (
              <p className="gp-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="gp-actions gp-actions--end">
              <button className="gp-btn" onClick={() => setConfirmDelete(false)} type="button">
                Cancelar
              </button>
              <button
                className="gp-btn gp-btn--solid-danger"
                disabled={deleting}
                onClick={remove}
                type="button"
              >
                {deleting ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </PanelDialog>
      )}
    </div>
  )
}

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/** D2: as opções dos tipos novos, embaixo da pergunta. */
function QuestionOptions({
  question,
  units,
  onChange,
}: {
  question: Question
  units: string[]
  onChange: (extra: Record<string, unknown>) => void
}) {
  const { blockType, extra, id } = question
  if (blockType === 'file') {
    return (
      <div className="gp-field gp-question__full">
        <label htmlFor={`acc-${id}`}>Aceita</label>
        <select
          className="gp-input"
          id={`acc-${id}`}
          onChange={(event) => onChange({ accept: event.target.value })}
          value={extra.accept === 'document' ? 'document' : 'photo'}
        >
          <option value="photo">Só foto</option>
          <option value="document">Foto, PDF ou Word</option>
        </select>
        <span className="gp-hint">
          Até 10 MB. No celular, o visitante também pode tirar a foto na hora. O arquivo fica
          guardado só para o painel, em Mensagens, e é apagado sozinho depois de 90 dias.
        </span>
      </div>
    )
  }
  if (blockType === 'date') {
    const days = typeof extra.days === 'number' ? extra.days : DATE_DAYS_DEFAULT
    const weekdays = parseWeekdays(typeof extra.weekdays === 'string' ? extra.weekdays : null)
    return (
      <div className="gp-question__full gp-qopts">
        <div className="gp-field">
          <label htmlFor={`days-${id}`}>Até quantos dias à frente</label>
          <input
            className="gp-input gp-input--short"
            id={`days-${id}`}
            inputMode="numeric"
            max={DATE_DAYS_MAX}
            min={1}
            onChange={(event) =>
              onChange({
                days: Math.min(Math.max(Number(event.target.value) || 1, 1), DATE_DAYS_MAX),
              })
            }
            type="number"
            value={days}
          />
        </div>
        <fieldset className="gp-qopts__days">
          <legend className="gp-label">Dias em que atende</legend>
          {WEEKDAY_NAMES.map((name, day) => (
            <label className="gp-qopts__day" key={name}>
              <input
                checked={weekdays.includes(day)}
                disabled={weekdays.length === 1 && weekdays.includes(day)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...weekdays, day]
                    : weekdays.filter((item) => item !== day)
                  onChange({ weekdays: [...new Set(next)].sort().join(',') })
                }}
                type="checkbox"
              />
              {name}
            </label>
          ))}
        </fieldset>
        <span className="gp-hint">
          O visitante escolhe o dia em botões, de hoje até {days} dias à frente.
        </span>
      </div>
    )
  }
  if (blockType === 'time') {
    const from = typeof extra.from === 'string' ? extra.from : '08:00'
    const to = typeof extra.to === 'string' ? extra.to : '18:00'
    const step = TIME_STEPS.includes(extra.step as 15) ? (extra.step as number) : 30
    return (
      <div className="gp-question__full gp-qopts">
        <div className="gp-field">
          <label htmlFor={`from-${id}`}>Primeiro horário</label>
          <input
            className="gp-input"
            id={`from-${id}`}
            onChange={(event) => event.target.value && onChange({ from: event.target.value })}
            step={900}
            type="time"
            value={from}
          />
        </div>
        <div className="gp-field">
          <label htmlFor={`to-${id}`}>Até</label>
          <input
            aria-invalid={to <= from}
            className="gp-input"
            id={`to-${id}`}
            onChange={(event) => event.target.value && onChange({ to: event.target.value })}
            step={900}
            type="time"
            value={to}
          />
        </div>
        <div className="gp-field">
          <label htmlFor={`step-${id}`}>De quanto em quanto tempo</label>
          <select
            className="gp-input"
            id={`step-${id}`}
            onChange={(event) => onChange({ step: Number(event.target.value) })}
            value={step}
          >
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={60}>1 hora</option>
          </select>
        </div>
        <span className={to <= from ? 'gp-hint gp-hint--error' : 'gp-hint'}>
          {to <= from
            ? 'O último horário precisa ser depois do primeiro.'
            : `${timeSlots(from, to, step).length} horários, em botões. Hoje, os que já passaram somem.`}
        </span>
      </div>
    )
  }
  if (blockType === 'unit') {
    return units.length ? (
      <span className="gp-hint gp-question__full">
        O visitante escolhe entre: {units.join(', ')}. As unidades ficam em Configurações › Contato.
      </span>
    ) : (
      <span className="gp-hint gp-hint--error gp-question__full">
        O site ainda não tem unidades. Cadastre em Configurações › Contato; até lá, esta pergunta
        não aparece no site.
      </span>
    )
  }
  return null
}
