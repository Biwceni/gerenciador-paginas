'use client'

import React, { useState } from 'react'

import { PanelDialog } from './PanelDialog'

type Props = {
  /** "Sua marca", "o menu e o rodapé", "as Configurações". */
  what: string
  /** O que volta a ser como está no ar, em uma frase. */
  detail: string
  disabled?: boolean
  onDiscard: () => void | Promise<void>
}

/**
 * "Descartar mudanças" com confirmação (M4): volta tudo ao que está no ar e não tem desfazer, então
 * pergunta antes, como a confirmação de excluir página. "Continuar mexendo" é o caminho seguro.
 */
export function DiscardButton({ what, detail, disabled, onDiscard }: Props) {
  const [asking, setAsking] = useState(false)
  return (
    <>
      <button className="gp-btn" disabled={disabled} onClick={() => setAsking(true)} type="button">
        Descartar mudanças
      </button>
      {asking && (
        <PanelDialog onClose={() => setAsking(false)} title={`Descartar as mudanças de ${what}?`}>
          <div className="gp-stack">
            <p>{detail} Não dá para desfazer.</p>
            <div className="gp-actions gp-actions--end">
              <button className="gp-btn" onClick={() => setAsking(false)} type="button">
                Continuar mexendo
              </button>
              <button
                className="gp-btn gp-btn--solid-danger"
                onClick={() => {
                  setAsking(false)
                  void onDiscard()
                }}
                type="button"
              >
                Descartar
              </button>
            </div>
          </div>
        </PanelDialog>
      )}
    </>
  )
}
