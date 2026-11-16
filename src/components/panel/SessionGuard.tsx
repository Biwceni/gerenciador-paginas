'use client'

import { useAuth, useConfig } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

import { authRequest } from '@/components/auth/authApi'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { LOCKED_MESSAGE, markPanelLogin, WRONG_LOGIN_MESSAGE } from '@/lib/auth'

import { PanelDialog } from './PanelDialog'
import { SESSION_BACK, SESSION_ENDED } from './session'

/**
 * Sessão vencida no meio do trabalho (A2): em vez de "sem permissão", uma janela "Sua sessão
 * terminou" com a entrada por cima da tela. O que a pessoa mudou continua na tela; ao entrar de
 * novo, as telas que estavam esperando salvam sozinhas (SaveStatus escuta SESSION_BACK).
 */
export function SessionGuard({ children }: { children?: React.ReactNode }) {
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onEnded = () => setOpen(true)
    window.addEventListener(SESSION_ENDED, onEnded)
    return () => window.removeEventListener(SESSION_ENDED, onEnded)
  }, [])

  return (
    <>
      {children}
      {open && (
        <SessionDialog
          apiRoute={`${serverURL ?? ''}${api}`}
          email={user?.email ?? ''}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function SessionDialog({
  apiRoute,
  email: initialEmail,
  onClose,
}: {
  apiRoute: string
  email: string
  onClose: () => void
}) {
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A janela põe o foco nela mesma ao abrir; o cursor vai para a senha logo depois.
  useEffect(() => {
    const timer = setTimeout(() => document.getElementById('sg-pass')?.focus(), 0)
    return () => clearTimeout(timer)
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setShown(false)
    if (!email.trim() || !password) {
      setError('Escreva o e-mail e a senha.')
      return
    }
    setBusy(true)
    setError(null)
    const result = await authRequest(apiRoute, '/login', { email: email.trim(), password })
    setBusy(false)
    if (result.ok) {
      markPanelLogin()
      onClose()
      window.dispatchEvent(new CustomEvent(SESSION_BACK))
      return
    }
    setPassword('')
    setError(
      result.message === LOCKED_MESSAGE
        ? 'A conta ficou bloqueada por 10 minutos depois de 5 tentativas. Suas mudanças continuam aqui: espere e tente de novo.'
        : result.status === 401
          ? WRONG_LOGIN_MESSAGE
          : result.message || 'Não deu para entrar agora. Tente de novo.',
    )
  }

  return (
    <PanelDialog onClose={onClose} title="Sua sessão terminou">
      <form className="gp-authform" noValidate onSubmit={submit}>
        <p className="gp-small">
          Por segurança, o painel pede a senha de novo depois de um tempo ou quando você sai em
          outro aparelho. O que você mudou continua aqui e é salvo assim que você entrar.
        </p>
        {error && (
          <p className="gp-error" role="alert">
            {error}
          </p>
        )}
        <div className="gp-field">
          <label htmlFor="sg-email">E-mail</label>
          <input
            autoComplete="username"
            className="gp-input"
            id="sg-email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </div>
        <div className="gp-field">
          <label htmlFor="sg-pass">Senha</label>
          <PasswordInput
            autoComplete="current-password"
            id="sg-pass"
            onChange={(event) => setPassword(event.target.value)}
            onShownChange={setShown}
            shown={shown}
            value={password}
          />
        </div>
        <div className="gp-actions gp-actions--end">
          <button className="gp-btn" onClick={onClose} type="button">
            Agora não
          </button>
          <button className="gp-btn gp-btn--primary" disabled={busy} type="submit">
            {busy ? 'Entrando…' : 'Entrar de novo'}
          </button>
        </div>
      </form>
    </PanelDialog>
  )
}
