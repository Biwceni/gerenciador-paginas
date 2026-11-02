import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { AccountForm } from './AccountForm'

/**
 * Tela "Minha conta" (`/admin/account`), no lugar da do Payload: nome, e-mail, tipo de acesso,
 * senha e o tema do painel. O Payload já põe o menu lateral em volta, como no painel inicial.
 */
export function AccountView({ initPageResult }: AdminViewServerProps) {
  const { payload, user } = initPageResult.req
  if (!user) return null

  return (
    <div className="gp-page">
      <header className="gp-pagehead">
        <div>
          <h1>Minha conta</h1>
          <p>Seus dados de acesso ao painel e o jeito de ver o painel.</p>
        </div>
      </header>
      <AccountForm
        apiRoute={payload.config.routes.api}
        user={{ id: user.id, email: user.email, name: user.name ?? '', role: user.role }}
      />
    </div>
  )
}
