'use client'

import React, { useState } from 'react'

import { AuthCard, AuthLink } from './AuthCard'
import { authRequest } from './authApi'

/**
 * Esqueci a senha (`vForgot`). A resposta é a mesma para qualquer e-mail, com ou sem conta: a tela
 * não diz quais e-mails estão cadastrados.
 */
export function ForgotForm({ apiRoute, loginHref }: { apiRoute: string; loginHref: string }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await authRequest(apiRoute, '/forgot-password', { email: email.trim() })
    setBusy(false)
    // Só falha de conexão ou do servidor aparece: "e-mail sem conta" nunca chega aqui.
    if (!result.ok && (result.status === 0 || result.status >= 500)) {
      setError(result.message || 'Não deu para enviar agora. Tente de novo em alguns minutos.')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthCard
        lead="Se o endereço estiver cadastrado, você vai receber um link para criar uma senha nova. O link vale por 1 hora."
        title="Confira seu e-mail"
      >
        <a className="gp-btn gp-btn--lg gp-btn--block" href={loginHref}>
          Voltar para entrar
        </a>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      lead="Digite seu e-mail. Vamos enviar um link para você."
      title="Criar uma senha nova"
    >
      <form className="gp-authform" onSubmit={submit}>
        {error && (
          <p className="gp-warnbox" role="alert">
            {error}
          </p>
        )}
        <div className="gp-field">
          <label htmlFor="fg-email">E-mail</label>
          <input
            autoComplete="username"
            className="gp-input"
            id="fg-email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <button
          className="gp-btn gp-btn--primary gp-btn--lg gp-btn--block"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Enviando…' : 'Enviar link'}
        </button>
      </form>
      <AuthLink href={loginHref}>Voltar</AuthLink>
    </AuthCard>
  )
}
