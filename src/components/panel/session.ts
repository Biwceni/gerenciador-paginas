'use client'

import { request as baseRequest, RequestError, stillLoggedIn } from '@/components/editor/api'

// Sessão vencida no painel (A2). O servidor responde 403 "sem permissão" tanto para quem não pode
// quanto para quem não está mais logado. Antes de mostrar o erro, o painel confere a sessão: se ela
// acabou, avisa "Sua sessão terminou" e abre a entrada por cima da tela, sem perder o que mudou.

/** A sessão acabou: abre a janela de entrar (SessionGuard). */
export const SESSION_ENDED = 'gp:sessao-terminou'
/** A pessoa entrou de novo: as telas tentam salvar o que ficou esperando. */
export const SESSION_BACK = 'gp:sessao-voltou'

export const SESSION_MESSAGE = 'Sua sessão terminou. Entre de novo e o que você mudou é salvo.'

export class SessionEndedError extends RequestError {
  constructor() {
    super(SESSION_MESSAGE, 401)
  }
}

export const isSessionEnded = (error: unknown) => error instanceof SessionEndedError

/** Abre a janela de entrar de novo (o botão "Entrar de novo" dos avisos). */
export function askToLogin() {
  window.dispatchEvent(new CustomEvent(SESSION_ENDED))
}

/** O `request` do editor, mais a conferência da sessão quando o servidor recusa. */
export async function request<T>(apiRoute: string, path: string, init?: RequestInit): Promise<T> {
  try {
    return await baseRequest<T>(apiRoute, path, init)
  } catch (error) {
    if (error instanceof RequestError && (error.status === 401 || error.status === 403)) {
      const loggedIn = await stillLoggedIn(apiRoute).catch(() => true)
      if (!loggedIn) {
        askToLogin()
        throw new SessionEndedError()
      }
    }
    throw error
  }
}
