'use client'

import React from 'react'

type Props = {
  /**
   * `publish`: telas do que o visitante vê (Configurações, Menu e rodapé), que guardam rascunho e
   * publicam. `save`: telas que só o painel usa (Formulário, Minha conta), que só salvam.
   */
  mode: 'publish' | 'save'
  state: 'saving' | 'saved' | 'error'
  /** Telas que publicam: há mudança guardada que ainda não foi ao ar. */
  pending?: boolean
  /** O que impede salvar agora (campo marcado), no lugar de "Salvando…". */
  blocked?: string | null
  /** Detalhe do erro, embaixo de "Não deu para salvar". */
  error?: string | null
  onRetry?: () => void
}

/**
 * Aviso de "salvo" igual em todas as telas, na linha do título, à direita (no celular, logo abaixo
 * do título). Os textos são os mesmos do topo do editor.
 */
export function SaveStatus({ mode, state, pending, blocked, error, onRetry }: Props) {
  const [tone, text] =
    state === 'error'
      ? (['error', 'Não deu para salvar'] as const)
      : blocked
        ? (['warn', blocked] as const)
        : state === 'saving'
          ? (['draft', 'Salvando…'] as const)
          : mode === 'save'
            ? (['ok', 'Tudo salvo'] as const)
            : pending
              ? (['warn', 'Guardado, falta publicar'] as const)
              : (['ok', 'Tudo no ar'] as const)

  return (
    <div className="gp-savestatus">
      <span aria-live="polite" className={`gp-chip gp-chip--${tone}`} role="status">
        {text}
      </span>
      {state === 'error' && (
        <>
          {error && <span className="gp-savestatus__detail">{error}</span>}
          {onRetry && (
            <button className="gp-btn gp-btn--sm" onClick={onRetry} type="button">
              Tentar de novo
            </button>
          )}
        </>
      )}
    </div>
  )
}
