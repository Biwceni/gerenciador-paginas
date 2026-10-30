'use client'

import React from 'react'

import { passwordRules } from '@/lib/auth'

import { PanelIcon } from '../panel/PanelIcon'

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
  return (
    <>
      <div className="gp-field">
        <label htmlFor="pw-new">Senha nova</label>
        <input
          aria-describedby="pw-rules"
          autoComplete="new-password"
          className="gp-input"
          id="pw-new"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <ul className="gp-pwrules" id="pw-rules">
          {passwordRules(password).map((rule) => (
            <li className={rule.ok ? 'is-ok' : undefined} key={rule.label}>
              <PanelIcon name={rule.ok ? 'check' : 'x'} size={14} />
              {rule.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="gp-field">
        <label htmlFor="pw-confirm">Repita a senha</label>
        <input
          aria-describedby="pw-match"
          aria-invalid={mismatch || undefined}
          autoComplete="new-password"
          className="gp-input"
          id="pw-confirm"
          onChange={(event) => setConfirm(event.target.value)}
          required
          type="password"
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
