'use client'

import React, { useEffect, useState } from 'react'

import { checkPanelLogin, hasPanelCookie } from '@/lib/auth'
import { editorPath } from '@/lib/editor'

type Props = {
  adminRoute: string
  apiRoute: string
  /** Página aberta. Sem ela, a barra só tem o caminho de volta ao painel. */
  pageId?: number | null
}

/**
 * Barra fina para quem está logado no painel. As páginas do site são estáticas, então o login é
 * conferido aqui no navegador, e só com o cookie de quem entrou no painel: o visitante comum não
 * faz nenhuma chamada a mais.
 */
export function PanelBar({ adminRoute, apiRoute, pageId }: Props) {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    if (!hasPanelCookie(document.cookie)) return
    let active = true
    void checkPanelLogin(apiRoute).then((result) => active && setLoggedIn(result))
    return () => {
      active = false
    }
  }, [apiRoute])

  if (!loggedIn) return null

  return (
    <nav aria-label="Atalhos do painel" className="panel-bar">
      <a href={adminRoute}>← Voltar ao painel</a>
      {pageId ? <a href={editorPath(adminRoute, pageId)}>Editar esta página</a> : null}
    </nav>
  )
}
