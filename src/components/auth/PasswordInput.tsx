'use client'

import React from 'react'

import { PanelIcon } from '../panel/PanelIcon'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> & {
  /** A senha está à mostra. Fica com a tela, para ela esconder de novo ao enviar. */
  shown: boolean
  onShownChange: (shown: boolean) => void
}

/**
 * Campo de senha com o botão de olho à direita, para conferir o que foi digitado. O `type` só
 * troca entre `password` e `text`, então o gerenciador de senhas do navegador continua achando o
 * campo pelo `autoComplete`.
 */
export function PasswordInput({ onShownChange, shown, ...input }: Props) {
  return (
    <div className="gp-pwinput">
      <input {...input} className="gp-input" type={shown ? 'text' : 'password'} />
      <button
        aria-controls={input.id}
        aria-label={shown ? 'Esconder senha' : 'Mostrar senha'}
        aria-pressed={shown}
        className="gp-pwinput__toggle"
        onClick={() => onShownChange(!shown)}
        type="button"
      >
        <PanelIcon name={shown ? 'eye-off' : 'eye'} size={20} />
      </button>
    </div>
  )
}
