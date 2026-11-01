'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import { editorPath } from '@/lib/editor'
import {
  CONSENT_TEXT,
  EMAIL,
  FIELD_TYPE_LABELS,
  type FormFieldType,
  notifyEmailRows,
  plainToRichText,
} from '@/lib/forms'
import { panelHref } from '@/lib/panel'
import { PRIVACY_TEMPLATE_KEY } from '@/lib/privacy'
import type { Form } from '@/payload-types'

import { deleteForm, saveForm } from './api'
import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'

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
  pages: { id: number; title: string }[]
  /** Como está a página de privacidade do site. */
  privacy: { state: 'live' } | { state: 'draft'; pageId: number } | { state: 'none' }
  siteEmail: string
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
    extra: { placeholder, defaultValue },
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

export function FormEditor({
  adminRoute,
  apiRoute,
  form,
  messages,
  pages,
  privacy,
  siteEmail,
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
  const removeQuestion = (id: string) => {
    setQuestions((list) => list.filter((question) => question.id !== id))
    changed()
  }
  const addQuestion = () => {
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
        (question.blockType === 'select' && !optionLines(question.optionsText).length),
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
    <div className="gp-page">
      <header className="gp-pagehead">
        <div>
          <Link className="gp-btn gp-btn--sm gp-btn--ghost gp-back" href={formsHref}>
            <PanelIcon name="back" size={14} />
            Formulários
          </Link>
          <h1>{title.trim() || 'Formulário'}</h1>
          <p>Mudou aqui, muda em todas as páginas que usam este formulário. Salva sozinho.</p>
        </div>
        <p aria-live="polite" className="gp-small gp-muted gp-savestate">
          {incomplete
            ? 'Falta completar o que está marcado'
            : writing
              ? 'A pergunta é salva quando você sair do campo'
              : save === 'saved'
                ? 'Tudo salvo'
                : save === 'error'
                  ? ''
                  : 'Salvando…'}
        </p>
      </header>

      {save === 'error' && (
        <p className="gp-error" role="alert">
          Não deu para salvar: {saveError}
        </p>
      )}

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
        <ul className="gp-questions">
          {questions.map((question, index) => {
            const noOptions =
              question.blockType === 'select' && !optionLines(question.optionsText).length
            return (
              <li className="gp-question" key={question.id}>
                <input
                  aria-invalid={!question.label.trim()}
                  aria-label="Pergunta"
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
                <select
                  aria-label="Tipo de resposta"
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
                    aria-label={`Subir “${question.label}”`}
                    className="gp-iconbtn"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    type="button"
                  >
                    <PanelIcon name="up" size={16} />
                  </button>
                  <button
                    aria-label={`Descer “${question.label}”`}
                    className="gp-iconbtn"
                    disabled={index === questions.length - 1}
                    onClick={() => move(index, 1)}
                    type="button"
                  >
                    <PanelIcon name="down" size={16} />
                  </button>
                  <button
                    aria-label={`Tirar “${question.label}”`}
                    className="gp-iconbtn"
                    disabled={questions.length < 2}
                    onClick={() => removeQuestion(question.id)}
                    type="button"
                  >
                    <PanelIcon name="x" size={16} />
                  </button>
                </div>
                {!question.label.trim() && (
                  <span className="gp-hint gp-hint--error gp-question__full">
                    Escreva a pergunta.
                  </span>
                )}
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
        <div>
          <button className="gp-btn gp-btn--sm" onClick={addQuestion} type="button">
            <PanelIcon name="plus" size={14} />
            Adicionar pergunta
          </button>
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
              placeholder={siteEmail || 'seu e-mail'}
              type="email"
              value={notifyEmail}
            />
            {emailInvalid ? (
              <span className="gp-hint gp-hint--error">Confira o e-mail.</span>
            ) : (
              <span className="gp-hint">
                Vazio = o e-mail das Configurações. A mensagem também fica em Mensagens.
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
                      {page.title}
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
