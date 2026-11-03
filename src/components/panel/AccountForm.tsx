'use client'

import { useTheme } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { passwordReady, PasswordFields } from '@/components/auth/PasswordFields'
import { request } from '@/components/editor/api'
import type { User } from '@/payload-types'

import { PanelIcon } from './PanelIcon'

type Props = {
  apiRoute: string
  user: Pick<User, 'id' | 'email' | 'role'> & { name: string }
}

type Message = { tone: 'ok' | 'error'; text: string } | null

const ROLE_TEXT: Record<User['role'], string> = {
  admin: 'Administrador: cuida do site e das pessoas com acesso.',
  editor: 'Editor: cuida do site.',
}

type ThemeChoice = 'auto' | 'light' | 'dark'

const THEMES: [ThemeChoice, string, string][] = [
  ['auto', 'Automático', 'Segue o aparelho'],
  ['light', 'Claro', 'Fundo claro'],
  ['dark', 'Escuro', 'Fundo escuro'],
]

/** Partes de Minha conta: nome, senha e tema do painel. */
export function AccountForm({ apiRoute, user }: Props) {
  return (
    <div className="gp-grid2">
      <ProfileCard apiRoute={apiRoute} user={user} />
      <div className="gp-col">
        <PasswordCard apiRoute={apiRoute} userId={user.id} />
        <ThemeCard />
      </div>
    </div>
  )
}

function Feedback({ message }: { message: Message }) {
  return (
    <p aria-live="polite" className={message?.tone === 'error' ? 'gp-error' : 'gp-hint'}>
      {message?.text}
    </p>
  )
}

function ProfileCard({ apiRoute, user }: Props) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [saved, setSaved] = useState(user.name)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const saving = name.trim() !== saved && !error

  // O nome é salvo sozinho, um segundo depois da última tecla (como o Formulário).
  useEffect(() => {
    const next = name.trim()
    if (next === saved || error) return
    const timer = setTimeout(async () => {
      try {
        await request(apiRoute, `/users/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: next }),
        })
        setSaved(next)
        router.refresh()
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Tente de novo.')
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [apiRoute, attempt, error, name, router, saved, user.id])

  return (
    <section aria-labelledby="gp-account-data" className="gp-card">
      <h2 id="gp-account-data">Seus dados</h2>
      <form className="gp-authform" onSubmit={(event) => event.preventDefault()}>
        <div className="gp-field">
          <label htmlFor="ac-name">Nome</label>
          <input
            autoComplete="name"
            className="gp-input"
            id="ac-name"
            maxLength={80}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            value={name}
          />
          <span className="gp-hint">Aparece no pé do menu do painel.</span>
        </div>
        <div className="gp-field">
          <span className="gp-label">E-mail</span>
          <span className="gp-account__value">{user.email}</span>
          <span className="gp-hint">É com ele que você entra no painel.</span>
        </div>
        <div className="gp-field">
          <span className="gp-label">Tipo de acesso</span>
          <span className="gp-account__value">{ROLE_TEXT[user.role]}</span>
          <span className="gp-hint">
            {user.role === 'admin'
              ? 'Outro administrador pode mudar o seu em Configurações, em “Pessoas com acesso”.'
              : 'Só um administrador muda o tipo de acesso.'}
          </span>
        </div>
        <Feedback
          message={
            error
              ? { tone: 'error', text: `Não deu para salvar: ${error}` }
              : { tone: 'ok', text: saving ? 'Salvando…' : 'Tudo salvo' }
          }
        />
        {error && (
          <div>
            <button
              className="gp-btn gp-btn--sm"
              onClick={() => {
                setError(null)
                setAttempt((n) => n + 1)
              }}
              type="button"
            >
              Tentar de novo
            </button>
          </div>
        )}
      </form>
    </section>
  )
}

function PasswordCard({ apiRoute, userId }: { apiRoute: string; userId: number }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message>(null)

  const close = () => {
    setOpen(false)
    setPassword('')
    setConfirm('')
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!passwordReady(password, confirm)) return
    setBusy(true)
    setMessage(null)
    try {
      await request(apiRoute, `/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      })
      close()
      setMessage({ tone: 'ok', text: 'Senha trocada. Use a senha nova da próxima vez que entrar.' })
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Tente de novo.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="gp-account-password" className="gp-card">
      <h2 id="gp-account-password">Senha</h2>
      {open ? (
        <form className="gp-authform" onSubmit={save}>
          <PasswordFields
            confirm={confirm}
            password={password}
            setConfirm={setConfirm}
            setPassword={setPassword}
          />
          <div className="gp-actions">
            <button
              className="gp-btn gp-btn--primary"
              disabled={busy || !passwordReady(password, confirm)}
              type="submit"
            >
              {busy ? 'Salvando…' : 'Salvar senha nova'}
            </button>
            <button className="gp-btn" onClick={close} type="button">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="gp-actions">
          <button
            className="gp-btn"
            onClick={() => {
              setMessage(null)
              setOpen(true)
            }}
            type="button"
          >
            <PanelIcon name="edit" size={16} />
            Mudar senha
          </button>
        </div>
      )}
      <Feedback message={message} />
    </section>
  )
}

/**
 * Tema do painel com o mecanismo do Payload: ele grava a escolha num cookie e troca o `data-theme`
 * da página, então vale em todas as telas e continua depois de sair e entrar.
 */
function ThemeCard() {
  const { autoMode, setTheme, theme } = useTheme()
  const current: ThemeChoice = autoMode ? 'auto' : theme

  return (
    <section className="gp-card">
      <fieldset className="gp-choices">
        <legend>
          <h2>Tema do painel</h2>
        </legend>
        <p className="gp-hint">O site continua com as cores dele. Muda só o painel.</p>
        <div className="gp-choices__list">
          {THEMES.map(([value, label, hint]) => (
            <label className="gp-choice" key={value}>
              <input
                checked={current === value}
                name="gp-theme"
                // O Payload aceita "auto" (volta a seguir o aparelho), mas o tipo dele não diz.
                onChange={() => setTheme(value as 'light')}
                type="radio"
                value={value}
              />
              <span>
                <b>{label}</b>
                <span className="gp-hint">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  )
}
