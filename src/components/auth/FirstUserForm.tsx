'use client'

import React, { useState } from 'react'

import { AuthCard } from './AuthCard'
import { authRequest } from './authApi'
import { PasswordFields, passwordReady } from './PasswordFields'

/**
 * Primeira conta do site. Sem o campo "Tipo de acesso": a primeira conta sempre vira
 * administrador (gancho `firstUserIsAdmin` em `src/collections/Users.ts`).
 */
export function FirstUserForm({ adminRoute, apiRoute }: { adminRoute: string; apiRoute: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!passwordReady(password, confirm)) return
    setBusy(true)
    setError(null)
    const result = await authRequest(apiRoute, '/first-register', {
      name: name.trim(),
      email: email.trim(),
      password,
    })
    if (result.ok) {
      window.location.assign(adminRoute)
      return
    }
    setBusy(false)
    setError(result.message || 'Não deu para criar a conta agora. Tente de novo.')
  }

  return (
    <AuthCard
      lead="Esta é a primeira conta do painel. Ela cuida do site e das pessoas com acesso."
      title="Crie sua conta"
    >
      <form className="gp-authform" onSubmit={submit}>
        {error && (
          <p className="gp-warnbox" role="alert">
            {error}
          </p>
        )}
        <div className="gp-field">
          <label htmlFor="fu-name">Seu nome</label>
          <input
            autoComplete="name"
            className="gp-input"
            id="fu-name"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </div>
        <div className="gp-field">
          <label htmlFor="fu-email">E-mail</label>
          <input
            autoComplete="username"
            className="gp-input"
            id="fu-email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <PasswordFields
          confirm={confirm}
          password={password}
          setConfirm={setConfirm}
          setPassword={setPassword}
        />
        <button
          className="gp-btn gp-btn--primary gp-btn--lg gp-btn--block"
          disabled={busy || !passwordReady(password, confirm)}
          type="submit"
        >
          {busy ? 'Criando…' : 'Criar conta e entrar'}
        </button>
      </form>
    </AuthCard>
  )
}
