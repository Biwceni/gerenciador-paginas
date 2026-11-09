'use client'

import { useAuth } from '@payloadcms/ui'
import { useEffect, useRef } from 'react'

/**
 * Faz a saída quando alguém ainda está logado ao abrir `/admin/logout-inactivity` (a tela do
 * Payload que a nossa substitui fazia o mesmo). Quando a sessão já acabou, não faz nada.
 */
export function InactivityLogout() {
  const { logOut, user } = useAuth()
  const done = useRef(false)

  useEffect(() => {
    if (!user?.id || done.current) return
    done.current = true
    void logOut()
  }, [logOut, user?.id])

  return null
}
