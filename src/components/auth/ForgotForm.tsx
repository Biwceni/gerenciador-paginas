'use client'

import React, { useEffect, useState } from 'react'

import { WhyDisabled } from '@/components/panel/WhyDisabled'
import { emailProblem } from '@/lib/auth'

import { AuthCard, AuthError, AuthLink, FieldProblem, focusAuthTitle } from './AuthCard'
import { authRequest } from './authApi'

/** Espera entre um envio e outro do mesmo link, em segundos. */
export const RESEND_WAIT_SECONDS = 30

/**
 * Esqueci a senha (`vForgot`). A resposta é a mesma para qualquer e-mail, com ou sem conta: a tela
 * não diz quais e-mails estão cadastrados.
 */
export function ForgotForm({ apiRoute, loginHref }: { apiRoute: string; loginHref: string }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  // Depois de enviar: segundos até poder enviar de novo e o aviso "Enviamos de novo".
  const [wait, setWait] = useState(0)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (wait <= 0) return
    const timer = window.setTimeout(() => setWait((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [wait])

  // O cartão troca para "Confira seu e-mail": o foco vai para o título novo.
  useEffect(() => {
    if (sent) focusAuthTitle()
  }, [sent])

  const send = async () => {
    setBusy(true)
    setError(null)
    const result = await authRequest(apiRoute, '/forgot-password', { email: email.trim() })
    setBusy(false)
    // Só falha de conexão ou do servidor aparece: "e-mail sem conta" nunca chega aqui.
    if (!result.ok && (result.status === 0 || result.status >= 500)) {
      setError(result.message || 'Não deu para enviar agora. Tente de novo em alguns minutos.')
      return false
    }
    setWait(RESEND_WAIT_SECONDS)
    return true
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const found = emailProblem(email)
    setProblem(found)
    if (found) {
      document.getElementById('fg-email')?.focus()
      return
    }
    if (await send()) setSent(true)
  }

  const resend = async () => {
    setResent(false)
    if (await send()) setResent(true)
  }

  if (sent) {
    return (
      <AuthCard
        focusTitle
        lead={
          <>
            Se houver uma conta com <b>{email.trim()}</b>, você vai receber um link para criar uma
            senha nova. O link vale por 1 hora.
          </>
        }
        title="Confira seu e-mail"
      >
        <div className="gp-authsent">
          <AuthError text={error} />
          <p className="gp-hint">
            Não chegou em alguns minutos? Veja a caixa de spam ou envie de novo.
          </p>
          <button
            aria-describedby={wait > 0 ? 'fg-wait' : undefined}
            className="gp-btn gp-btn--lg gp-btn--block"
            disabled={busy || wait > 0}
            onClick={resend}
            type="button"
          >
            {busy ? 'Enviando…' : 'Enviar de novo'}
          </button>
          <WhyDisabled
            id="fg-wait"
            reason={!busy && wait > 0 ? `Você pode enviar de novo em ${wait} segundos.` : null}
          />
          <p aria-live="polite" className="gp-hint gp-authsent__status" role="status">
            {resent ? 'Enviamos de novo.' : ''}
          </p>
        </div>
        <AuthLink href={loginHref}>Voltar para entrar</AuthLink>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      lead="Digite seu e-mail. Vamos enviar um link para você criar uma senha nova."
      title="Esqueci minha senha"
    >
      <form className="gp-authform" noValidate onSubmit={submit}>
        <AuthError text={error} />
        <div className="gp-field">
          <label htmlFor="fg-email">E-mail</label>
          <input
            aria-describedby={problem ? 'fg-email-problem' : undefined}
            aria-invalid={Boolean(problem)}
            autoComplete="username"
            className="gp-input"
            id="fg-email"
            inputMode="email"
            onChange={(event) => {
              setEmail(event.target.value)
              setProblem(null)
            }}
            required
            type="email"
            value={email}
          />
          <FieldProblem id="fg-email-problem" text={problem} />
        </div>
        <button
          className="gp-btn gp-btn--primary gp-btn--lg gp-btn--block"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Enviando…' : 'Enviar link'}
        </button>
      </form>
      <AuthLink href={loginHref}>Voltar para entrar</AuthLink>
    </AuthCard>
  )
}
