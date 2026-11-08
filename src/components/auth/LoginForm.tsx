'use client'

import React, { useState } from 'react'
import { flushSync } from 'react-dom'

import {
  emailProblem,
  LOCKED_MESSAGE,
  markPanelLogin,
  passwordProblem,
  WRONG_LOGIN_MESSAGE,
} from '@/lib/auth'

import { AuthCard, AuthLink, FieldProblem, LockedCard } from './AuthCard'
import { authRequest } from './authApi'
import { PasswordInput } from './PasswordInput'

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
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  // Avisos embaixo dos campos, depois de tentar entrar.
  const [problems, setProblems] = useState<{ email?: string; password?: string }>({})

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    // Ao entrar, a senha volta a ficar escondida.
    setShown(false)
    const found = {
      email: emailProblem(email) ?? undefined,
      password: passwordProblem(password) ?? undefined,
    }
    setProblems(found)
    if (found.email || found.password) {
      document.getElementById(found.email ? 'lg-email' : 'lg-pass')?.focus()
      return
    }
    setBusy(true)
    setError(null)
    const result = await authRequest(apiRoute, '/login', { email: email.trim(), password })
    if (result.ok) {
      markPanelLogin()
      // Recarrega inteiro: o painel abre já com a sessão nova.
      window.location.assign(redirectTo)
      return
    }
    if (result.message === LOCKED_MESSAGE) {
      setBusy(false)
      setLocked(true)
      return
    }
    // Senha errada e e-mail sem conta têm a mesma resposta, sem contar tentativas. O e-mail fica,
    // a senha é apagada e o cursor vai para ela. Nos outros erros (servidor fora do ar, sem
    // internet) os dois ficam, e o foco vai para o Entrar, para tentar de novo.
    const wrong = result.status === 401
    // `flushSync`: o botão só volta a aceitar foco depois de redesenhado.
    flushSync(() => {
      setBusy(false)
      if (wrong) {
        setError(WRONG_LOGIN_MESSAGE)
        setPassword('')
      } else {
        setError(result.message || 'Não deu para entrar agora. Tente de novo em alguns minutos.')
      }
    })
    document.getElementById(wrong ? 'lg-pass' : 'lg-submit')?.focus()
  }

  if (locked) return <LockedCard forgotHref={forgotHref} loginHref={loginHref} />

  return (
    <AuthCard lead="Use o e-mail que recebeu o convite." title="Entrar no seu site">
      <form className="gp-authform" noValidate onSubmit={submit}>
        {error && (
          <p className="gp-warnbox gp-warnbox--danger" role="alert">
            {error}
          </p>
        )}
        <div className="gp-field">
          <label htmlFor="lg-email">E-mail</label>
          <input
            aria-describedby={problems.email ? 'lg-email-problem' : undefined}
            aria-invalid={Boolean(problems.email)}
            autoComplete="username"
            className="gp-input"
            id="lg-email"
            inputMode="email"
            onChange={(event) => {
              setEmail(event.target.value)
              setProblems((current) => ({ ...current, email: undefined }))
            }}
            required
            type="email"
            value={email}
          />
          <FieldProblem id="lg-email-problem" text={problems.email} />
        </div>
        <div className="gp-field">
          <label htmlFor="lg-pass">Senha</label>
          <PasswordInput
            aria-describedby={problems.password ? 'lg-pass-problem' : undefined}
            aria-invalid={Boolean(problems.password)}
            autoComplete="current-password"
            id="lg-pass"
            onChange={(event) => {
              setPassword(event.target.value)
              setProblems((current) => ({ ...current, password: undefined }))
            }}
            onShownChange={setShown}
            required
            shown={shown}
            value={password}
          />
          <FieldProblem id="lg-pass-problem" text={problems.password} />
        </div>
        <button
          className="gp-btn gp-btn--primary gp-btn--lg gp-btn--block"
          disabled={busy}
          id="lg-submit"
          type="submit"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <AuthLink href={forgotHref}>Esqueci minha senha</AuthLink>
    </AuthCard>
  )
}
