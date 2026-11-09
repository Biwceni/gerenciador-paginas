'use client'

import React, { useState } from 'react'

import { WhyDisabled } from '@/components/panel/WhyDisabled'
import { emailProblem } from '@/lib/auth'

import { AuthCard, AuthError, FieldProblem } from './AuthCard'
import { authRequest } from './authApi'
import { PasswordFields, passwordMissing, passwordReady } from './PasswordFields'

/** Aviso do campo de nome da primeira conta, ou `null`. */
export const nameProblem = (name: string) => (name.trim() ? null : 'Digite seu nome.')

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
  // Avisos embaixo do nome e do e-mail, conferidos ao enviar (como nas outras telas de entrar).
  const [problems, setProblems] = useState<{ name?: string; email?: string }>({})

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!passwordReady(password, confirm)) return
    const found = {
      name: nameProblem(name) ?? undefined,
      email: emailProblem(email) ?? undefined,
    }
    setProblems(found)
    if (found.name || found.email) {
      document.getElementById(found.name ? 'fu-name' : 'fu-email')?.focus()
      return
    }
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
      <form className="gp-authform" noValidate onSubmit={submit}>
        <AuthError text={error} />
        <div className="gp-field">
          <label htmlFor="fu-name">Seu nome</label>
          <input
            aria-describedby={problems.name ? 'fu-name-problem' : undefined}
            aria-invalid={Boolean(problems.name)}
            autoComplete="name"
            className="gp-input"
            id="fu-name"
            maxLength={80}
            onChange={(event) => {
              setName(event.target.value)
              setProblems((current) => ({ ...current, name: undefined }))
            }}
            required
            value={name}
          />
          <FieldProblem id="fu-name-problem" text={problems.name} />
        </div>
        <div className="gp-field">
          <label htmlFor="fu-email">E-mail</label>
          <input
            aria-describedby={problems.email ? 'fu-email-problem' : undefined}
            aria-invalid={Boolean(problems.email)}
            autoComplete="username"
            className="gp-input"
            id="fu-email"
            inputMode="email"
            onChange={(event) => {
              setEmail(event.target.value)
              setProblems((current) => ({ ...current, email: undefined }))
            }}
            required
            type="email"
            value={email}
          />
          <FieldProblem id="fu-email-problem" text={problems.email} />
        </div>
        <PasswordFields
          confirm={confirm}
          password={password}
          setConfirm={setConfirm}
          setPassword={setPassword}
        />
        <button
          className="gp-btn gp-btn--primary gp-btn--lg gp-btn--block"
          aria-describedby={passwordMissing(password, confirm) ? 'fu-why' : undefined}
          disabled={busy || !passwordReady(password, confirm)}
          type="submit"
        >
          {busy ? 'Criando…' : 'Criar conta e entrar'}
        </button>
        <WhyDisabled id="fu-why" reason={busy ? null : passwordMissing(password, confirm)} />
      </form>
    </AuthCard>
  )
}
