'use client'

import Link from 'next/link'
import React, { useState } from 'react'

import { request } from '@/components/editor/api'
import type { User } from '@/payload-types'

import { PanelIcon } from './PanelIcon'

type Person = Pick<User, 'id' | 'email' | 'name' | 'role'>

type Props = {
  adminRoute: string
  apiRoute: string
  me: { id: number; role: User['role'] }
  people: Person[]
}

const ROLE_LABEL: Record<User['role'], string> = {
  admin: 'Administrador',
  editor: 'Editor',
}

/**
 * Quem pode entrar no painel. Administrador convida, muda o tipo de acesso e remove; editor só vê
 * a própria conta. As regras valem no servidor (e o site nunca fica sem administrador).
 */
export function PeopleCard({ adminRoute, apiRoute, me, people: initialPeople }: Props) {
  const [people, setPeople] = useState(initialPeople)
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const isAdmin = me.role === 'admin'

  const run = async (action: () => Promise<string>) => {
    setBusy(true)
    setMessage(null)
    try {
      setMessage({ tone: 'ok', text: await action() })
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Tente de novo.' })
    } finally {
      setBusy(false)
    }
  }

  const changeRole = (person: Person, role: User['role']) =>
    run(async () => {
      await request(apiRoute, `/users/${person.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      setPeople((current) =>
        current.map((item) => (item.id === person.id ? { ...item, role } : item)),
      )
      return `${person.name || person.email} agora é ${ROLE_LABEL[role].toLowerCase()}.`
    })

  const remove = (person: Person) =>
    run(async () => {
      await request(apiRoute, `/users/${person.id}`, { method: 'DELETE' })
      setPeople((current) => current.filter((item) => item.id !== person.id))
      setRemoving(null)
      return `${person.name || person.email} não tem mais acesso ao painel.`
    })

  return (
    <section className="gp-card">
      <div>
        <h2>Pessoas com acesso</h2>
        <p className="gp-small gp-muted">
          Administradores cuidam do site e das pessoas. Editores cuidam do site.
        </p>
      </div>

      <ul className="gp-rows">
        {people.map((person) => (
          <li className="gp-row gp-row--person" key={person.id}>
            <div>
              <div className="gp-row__title">
                {person.id === me.id ? 'Você' : person.name || person.email}
              </div>
              <div className="gp-row__sub">{person.email}</div>
            </div>
            {isAdmin && person.id !== me.id ? (
              <select
                aria-label={`Tipo de acesso de ${person.name || person.email}`}
                className="gp-input gp-input--sm"
                disabled={busy}
                onChange={(event) => changeRole(person, event.target.value as User['role'])}
                value={person.role}
              >
                <option value="admin">Administrador</option>
                <option value="editor">Editor</option>
              </select>
            ) : (
              <span className="gp-chip gp-chip--draft">{ROLE_LABEL[person.role]}</span>
            )}
            <div className="gp-row__actions">
              {person.id === me.id ? (
                <Link className="gp-btn gp-btn--sm gp-btn--ghost" href={`${adminRoute}/account`}>
                  Minha conta
                </Link>
              ) : (
                isAdmin && (
                  <button
                    aria-label={`Remover ${person.name || person.email}`}
                    className="gp-btn gp-btn--sm gp-btn--ghost gp-btn--danger"
                    disabled={busy}
                    onClick={() => setRemoving(person.id)}
                    type="button"
                  >
                    Remover
                  </button>
                )
              )}
            </div>
            {removing === person.id && (
              <div className="gp-warnbox gp-row__confirm" role="alert">
                <b>Tirar o acesso de {person.name || person.email}?</b>
                <span>A pessoa não consegue mais entrar no painel. O site não muda.</span>
                <div className="gp-actions">
                  <button
                    className="gp-btn gp-btn--sm"
                    onClick={() => setRemoving(null)}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="gp-btn gp-btn--sm gp-btn--solid-danger"
                    disabled={busy}
                    onClick={() => remove(person)}
                    type="button"
                  >
                    Remover
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {message && (
        <p className={message.tone === 'ok' ? 'gp-notice' : 'gp-error'} role="status">
          {message.text}
        </p>
      )}

      {isAdmin &&
        (inviting ? (
          <InviteForm
            apiRoute={apiRoute}
            onCancel={() => setInviting(false)}
            onInvited={(person, emailSent) => {
              setPeople((current) => [...current, person])
              setInviting(false)
              setMessage(
                emailSent
                  ? { tone: 'ok', text: `Convite enviado para ${person.email}.` }
                  : {
                      tone: 'error',
                      text: `A conta de ${person.email} foi criada, mas o e-mail não saiu. Peça para a pessoa usar "Esqueceu a senha?" na tela de entrar.`,
                    },
              )
            }}
          />
        ) : (
          <div>
            <button className="gp-btn gp-btn--sm" onClick={() => setInviting(true)} type="button">
              <PanelIcon name="plus" size={14} />
              Convidar pessoa
            </button>
          </div>
        ))}
    </section>
  )
}

function InviteForm({
  apiRoute,
  onCancel,
  onInvited,
}: {
  apiRoute: string
  onCancel: () => void
  onInvited: (person: Person, emailSent: boolean) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<User['role']>('editor')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await request<{ doc: Person; emailSent: boolean }>(apiRoute, '/users/invite', {
        method: 'POST',
        body: JSON.stringify({ name, email, role }),
      })
      onInvited(result.doc, result.emailSent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tente de novo.')
      setBusy(false)
    }
  }

  return (
    <form className="gp-invite" onSubmit={submit}>
      <div className="gp-field">
        <label htmlFor="inv-name">Nome</label>
        <input
          className="gp-input"
          id="inv-name"
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </div>
      <div className="gp-field">
        <label htmlFor="inv-email">E-mail</label>
        <input
          className="gp-input"
          id="inv-email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div className="gp-field">
        <label htmlFor="inv-role">Tipo de acesso</label>
        <select
          className="gp-input"
          id="inv-role"
          onChange={(event) => setRole(event.target.value as User['role'])}
          value={role}
        >
          <option value="editor">Editor: cuida do site</option>
          <option value="admin">Administrador: cuida do site e das pessoas</option>
        </select>
      </div>
      <span className="gp-hint">
        A pessoa recebe um e-mail com um link para criar a senha. O link vale por 7 dias.
      </span>
      {error && (
        <p className="gp-error" role="alert">
          Não deu para convidar: {error}
        </p>
      )}
      <div className="gp-actions">
        <button className="gp-btn gp-btn--sm" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button
          className="gp-btn gp-btn--sm gp-btn--primary"
          disabled={busy || !email}
          type="submit"
        >
          {busy ? 'Enviando…' : 'Enviar convite'}
        </button>
      </div>
    </form>
  )
}
