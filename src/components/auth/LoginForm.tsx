'use client'

import React, { useState } from 'react'

import { LOCKED_MESSAGE, WRONG_LOGIN_MESSAGE } from '@/lib/auth'

import { AuthCard, AuthLink, LockedCard } from './AuthCard'
import { authRequest } from './authApi'

type Props = {
  apiRoute: string
  forgotHref: string
  loginHref: string
  redirectTo: string
}

/** Tela de entrar, no visual do protótipo (`vLogin`). */
export function LoginForm({ apiRoute, forgotHref, loginHref, redirectTo }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await authRequest(apiRoute, '/login', { email: email.trim(), password })
    if (result.ok) {
      // Recarrega inteiro: o painel abre já com a sessão nova.
      window.location.assign(redirectTo)
      return
    }
    setBusy(false)
    if (result.message === LOCKED_MESSAGE) setLocked(true)
    // Senha errada e e-mail sem conta têm a mesma resposta, sem contar tentativas.
    else if (result.status === 401) setError(WRONG_LOGIN_MESSAGE)
    else setError(result.message || 'Não deu para entrar agora. Tente de novo em alguns minutos.')
  }

  if (locked) return <LockedCard forgotHref={forgotHref} loginHref={loginHref} />

  return (
    <AuthCard lead="Use o e-mail que recebeu o convite." title="Entrar no seu site">
      <form className="gp-authform" onSubmit={submit}>
        {error && (
          <p className="gp-warnbox" role="alert">
            {error}
          </p>
        )}
        <div className="gp-field">
          <label htmlFor="lg-email">E-mail</label>
          <input
            autoComplete="username"
            className="gp-input"
            id="lg-email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <div className="gp-field">
          <label htmlFor="lg-pass">Senha</label>
          <input
            autoComplete="current-password"
            className="gp-input"
            id="lg-pass"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        <button
          className="gp-btn gp-btn--primary gp-btn--lg gp-btn--block"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <AuthLink href={forgotHref}>Esqueci minha senha</AuthLink>
    </AuthCard>
  )
}
