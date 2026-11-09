'use client'

import React, { useState } from 'react'

import { passwordRules } from '@/lib/auth'

import { PanelIcon } from '../panel/PanelIcon'
import { PasswordInput } from './PasswordInput'

/** Senha nova e repetição, com as regras marcadas enquanto a pessoa digita (`pwRules`). */
export function PasswordFields({
  confirm,
  password,
  setConfirm,
  setPassword,
}: {
  confirm: string
  password: string
  setConfirm: (value: string) => void
  setPassword: (value: string) => void
}) {
  const mismatch = confirm.length > 0 && confirm !== password
  const [shownNew, setShownNew] = useState(false)
  const [shownConfirm, setShownConfirm] = useState(false)
  // Antes de digitar, as regras ficam neutras (um ponto), sem o X de errado.
  const started = password.length > 0
  return (
    <>
      <div className="gp-field">
        <label htmlFor="pw-new">Senha nova</label>
        <PasswordInput
          aria-describedby="pw-rules"
          autoComplete="new-password"
          id="pw-new"
          onChange={(event) => setPassword(event.target.value)}
          onShownChange={setShownNew}
          required
          shown={shownNew}
          value={password}
        />
        <ul className="gp-pwrules" id="pw-rules">
          {passwordRules(password).map((rule) => (
            <li className={rule.ok ? 'is-ok' : undefined} key={rule.label}>
              <PanelIcon name={rule.ok ? 'check' : started ? 'x' : 'dot'} size={14} />
              {rule.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="gp-field">
        <label htmlFor="pw-confirm">Repita a senha</label>
        <PasswordInput
          aria-describedby="pw-match"
          aria-invalid={mismatch || undefined}
          autoComplete="new-password"
          id="pw-confirm"
          onChange={(event) => setConfirm(event.target.value)}
          onShownChange={setShownConfirm}
          required
          shown={shownConfirm}
          value={confirm}
        />
        <span aria-live="polite" className="gp-hint gp-hint--error" id="pw-match">
          {mismatch ? 'As duas senhas não estão iguais.' : ''}
        </span>
      </div>
    </>
  )
}

/** As regras estão cumpridas e as duas senhas são iguais. */
export const passwordReady = (password: string, confirm: string) =>
  passwordRules(password).every((rule) => rule.ok) && password === confirm

/** O que falta para salvar a senha, embaixo do botão desligado. */
export const passwordMissing = (password: string, confirm: string): string | null =>
  // Antes de digitar, um convite neutro: "Siga as regras" soaria como erro logo ao abrir a tela.
  !password
    ? 'Crie uma senha para continuar.'
    : !passwordRules(password).every((rule) => rule.ok)
      ? 'Siga as regras da senha acima.'
      : password !== confirm
        ? 'Repita a mesma senha no segundo campo.'
        : null
