'use client'

import React, { useState } from 'react'

import { AuthCard, ExpiredCard } from './AuthCard'
import { authRequest } from './authApi'
import { PasswordFields, passwordReady } from './PasswordFields'

type Props = {
  adminRoute: string
  apiRoute: string
  email: string
  forgotHref: string
  /** Veio do convite ("Crie sua senha") ou do esqueci a senha ("Crie uma senha nova"). */
  invite: boolean
  loginHref: string
  token: string
}

/**
 * Criar a senha pelo link do e-mail (`vReset`): uma tela só para o convite e para o esqueci a
 * senha, com títulos diferentes. Usa a API de reset do Payload, que já entra no painel.
 */
export function NewPasswordForm(props: Props) {
  const { adminRoute, apiRoute, email, forgotHref, invite, loginHref, token } = props
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!passwordReady(password, confirm)) return
    setBusy(true)
    setError(null)
    const result = await authRequest(apiRoute, '/reset-password', { token, password })
    if (result.ok) {
      window.location.assign(adminRoute)
      return
    }
    setBusy(false)
    // O link venceu ou já foi usado enquanto a tela estava aberta.
    if (result.status === 403) setExpired(true)
    else setError(result.message || 'Não deu para salvar agora. Tente de novo em alguns minutos.')
  }

  if (expired) return <ExpiredCard forgotHref={forgotHref} loginHref={loginHref} />

  return (
    <AuthCard
      lead={
        invite ? (
          <>
            Escolha a senha da conta <b>{email}</b> para entrar no painel.
          </>
        ) : (
          <>
            Para a conta <b>{email}</b>.
          </>
        )
      }
      title={invite ? 'Crie sua senha' : 'Crie uma senha nova'}
    >
      <form className="gp-authform" onSubmit={submit}>
        {error && (
          <p className="gp-warnbox" role="alert">
            {error}
          </p>
        )}
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
          {busy ? 'Salvando…' : invite ? 'Criar senha e entrar' : 'Salvar e entrar'}
        </button>
      </form>
    </AuthCard>
  )
}
