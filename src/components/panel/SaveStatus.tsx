'use client'

import React, { useEffect, useRef, useState } from 'react'

import { askToLogin, SESSION_BACK, SESSION_MESSAGE } from './session'

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

/** Quanto tempo o "A internet voltou" fica na frente do aviso de salvo. */
const BACK_ONLINE_MS = 6000

/**
 * Aviso de "salvo" igual em todas as telas, na linha do título, à direita (no celular, logo abaixo
 * do título). Os textos são os mesmos do topo do editor.
 *
 * Com erro, tenta de novo sozinho quando a internet volta (B1) ou quando a pessoa entra de novo
 * depois da sessão vencida (A2), sem precisar tocar em "Tentar de novo".
 */
export function SaveStatus({ mode, state, pending, blocked, error, onRetry }: Props) {
  const sessionEnded = state === 'error' && error === SESSION_MESSAGE
  const [backOnline, setBackOnline] = useState(false)
  const retryRef = useRef(onRetry)
  useEffect(() => {
    retryRef.current = onRetry
  })

  useEffect(() => {
    if (state !== 'error') return
    const onOnline = () => {
      setBackOnline(true)
      retryRef.current?.()
    }
    const onBack = () => {
      setBackOnline(false)
      retryRef.current?.()
    }
    window.addEventListener('online', onOnline)
    window.addEventListener(SESSION_BACK, onBack)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener(SESSION_BACK, onBack)
    }
  }, [state])

  useEffect(() => {
    if (!backOnline || state !== 'saved') return
    const timer = setTimeout(() => setBackOnline(false), BACK_ONLINE_MS)
    return () => clearTimeout(timer)
  }, [backOnline, state])

  const [tone, base] =
    state === 'error'
      ? (['error', sessionEnded ? 'Sua sessão terminou' : 'Não deu para salvar'] as const)
      : blocked
        ? (['warn', blocked] as const)
        : state === 'saving'
          ? (['draft', 'Salvando…'] as const)
          : mode === 'save'
            ? (['ok', 'Tudo salvo'] as const)
            : pending
              ? (['warn', 'Guardado, falta publicar'] as const)
              : (['ok', 'Tudo no ar'] as const)
  const text = backOnline && state === 'saved' ? `A internet voltou. ${base}` : base

  return (
    <div className="gp-savestatus">
      <span aria-live="polite" className={`gp-chip gp-chip--${tone}`} role="status">
        {text}
      </span>
      {state === 'error' && (
        <>
          {error && !sessionEnded && <span className="gp-savestatus__detail">{error}</span>}
          {sessionEnded ? (
            <button className="gp-btn gp-btn--sm" onClick={askToLogin} type="button">
              Entrar de novo
            </button>
          ) : (
            onRetry && (
              <button className="gp-btn gp-btn--sm" onClick={onRetry} type="button">
                Tentar de novo
              </button>
            )
          )}
        </>
      )}
    </div>
  )
}
