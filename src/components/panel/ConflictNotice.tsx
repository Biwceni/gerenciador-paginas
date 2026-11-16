'use client'

import React from 'react'

type Props = {
  /** "O menu", "As configurações"… */
  what: string
  /** Recarrega a tela com a versão que está guardada agora. */
  onSeeLatest: () => void
  /** Salva o que está na tela por cima da outra versão. */
  onKeepMine: () => void
}

/**
 * Duas abas abertas (ou duas pessoas) mexendo na mesma tela (A3): antes de salvar, o painel confere
 * se a versão guardada mudou desde que a tela abriu. Se mudou, nada é salvo até a pessoa escolher.
 */
export function ConflictNotice({ what, onSeeLatest, onKeepMine }: Props) {
  return (
    <div className="gp-warnbox gp-conflict" role="alert">
      <p>
        <b>{what} mudou em outra aba ou outra pessoa mexeu.</b> Para não apagar nada, o que você
        mudou aqui ainda não foi salvo.
      </p>
      <div className="gp-actions">
        <button className="gp-btn gp-btn--sm gp-btn--primary" onClick={onSeeLatest} type="button">
          Ver a versão nova
        </button>
        <button className="gp-btn gp-btn--sm" onClick={onKeepMine} type="button">
          Manter a minha
        </button>
      </div>
    </div>
  )
}

/** Os avisos de "sair sem salvar" conferem isto antes de segurar a pessoa na tela. */
export const leaving = { on: false }

/** Recarrega sem o aviso de "sair sem salvar": a pessoa escolheu ver a outra versão. */
export function reloadWithoutWarning() {
  leaving.on = true
  window.location.reload()
}
