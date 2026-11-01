'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { FORM_STARTERS } from '@/lib/forms'
import { panelHref } from '@/lib/panel'

import { createFormFromStarter } from './api'
import { PanelIcon } from './PanelIcon'

export type FormRow = {
  id: number
  title: string
  questions: number
  pages: string[]
  messages: number
}

type Props = { adminRoute: string; apiRoute: string; forms: FormRow[] }

const count = (total: number, one: string, many: string) => `${total} ${total === 1 ? one : many}`

export function FormsList({ adminRoute, apiRoute, forms }: Props) {
  const router = useRouter()
  const [creating, setCreating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const formsHref = panelHref(adminRoute, 'forms')

  const create = async (key: string) => {
    setCreating(key)
    setError(null)
    try {
      const { doc } = await createFormFromStarter(apiRoute, key)
      router.push(`${formsHref}/${doc.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tente de novo.')
      setCreating(null)
    }
  }

  return (
    <div className="gp-page">
      <header className="gp-pagehead">
        <div>
          <h1>Formulários</h1>
          <p>
            As perguntas que aparecem na seção “Formulário” das páginas. As respostas chegam em
            Mensagens.
          </p>
        </div>
      </header>

      <section className="gp-card gp-card--list">
        {forms.length > 0 ? (
          <ul className="gp-rows">
            {forms.map((form) => (
              <li className="gp-row gp-row--form" key={form.id}>
                <div>
                  <div className="gp-row__title">{form.title}</div>
                  <div className="gp-row__sub">
                    {count(form.questions, 'pergunta', 'perguntas')} ·{' '}
                    {form.pages.length
                      ? `na página ${form.pages.join(', ')}`
                      : 'não está em nenhuma página'}{' '}
                    · {count(form.messages, 'resposta', 'respostas')}
                  </div>
                </div>
                <div className="gp-row__actions">
                  <Link
                    className="gp-btn gp-btn--sm gp-btn--primary"
                    href={`${formsHref}/${form.id}`}
                  >
                    <PanelIcon name="edit" size={14} />
                    Mudar perguntas
                  </Link>
                  {form.messages > 0 && (
                    <Link
                      className="gp-btn gp-btn--sm"
                      href={`${panelHref(adminRoute, 'messages')}?formulario=${form.id}`}
                    >
                      Ver respostas
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="gp-empty">Nenhum formulário ainda. Comece de um pronto, aqui embaixo.</p>
        )}
      </section>

      <section className="gp-card">
        <h2>Criar um formulário</h2>
        <p className="gp-small gp-muted">Comece de um pronto e ajuste as perguntas.</p>
        <div className="gp-formcards">
          {FORM_STARTERS.map((starter) => (
            <button
              className="gp-formcard"
              disabled={creating !== null}
              key={starter.key}
              onClick={() => create(starter.key)}
              type="button"
            >
              <b>{creating === starter.key ? 'Criando…' : starter.title}</b>
              <span className="gp-small gp-muted">
                {starter.fields.map((field) => field.label).join(', ')}
              </span>
            </button>
          ))}
        </div>
        {error && (
          <p className="gp-error" role="alert">
            Não deu certo: {error}
          </p>
        )}
      </section>
    </div>
  )
}
