'use client'

import { useAuth } from '@payloadcms/ui'
import { useEffect, useRef } from 'react'

import { PRODUCT_NAME } from '@/lib/site'

/**
 * O Payload dá a esta rota o título de "Sem acesso" (`error.unauthorized`); aqui a aba ganha o
 * título certo da tela.
 *
 * Faz a saída quando alguém ainda está logado ao abrir `/admin/logout-inactivity` (a tela do
 * Payload que a nossa substitui fazia o mesmo). Quando a sessão já acabou, não faz nada.
 */
export function InactivityLogout() {
  const { logOut, user } = useAuth()
  const done = useRef(false)

  useEffect(() => {
    document.title = `Você saiu por segurança | ${PRODUCT_NAME}`
  }, [])

  useEffect(() => {
    if (!user?.id || done.current) return
    done.current = true
    void logOut()
  }, [logOut, user?.id])

  return null
}
