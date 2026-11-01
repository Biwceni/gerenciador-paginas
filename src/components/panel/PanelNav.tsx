import { NavWrapper } from '@payloadcms/next/client'
import type { ServerProps } from 'payload'
import React from 'react'

import { Icon } from '@/components/admin/Icon'
import { personInitials, personLabel } from '@/lib/panel'
import { PRODUCT_NAME } from '@/lib/site'

import { countUnreadMessages } from './data'
import { PanelNavLinks } from './PanelNavLinks'

/**
 * Menu lateral do painel, no lugar do menu padrão do Payload: as telas do dia a dia com nomes
 * simples. O administrador vê também "Avançado", a tela com os links para as telas padrão do
 * Payload. No pé, a pessoa que entrou, com as iniciais no lugar da foto (nenhum e-mail vai para o
 * Gravatar). Sem o botão de fechar do Payload: abaixo de 1024 px, o ☰ da barra de topo (PanelTopBar)
 * abre e fecha o menu.
 */
export async function PanelNav({ payload, user }: ServerProps) {
  if (!payload?.config || !user) return null
  const adminRoute = payload.config.routes.admin

  return (
    <NavWrapper baseClass="nav">
      <nav aria-label="Menu do painel" className="nav__wrap gp-nav">
        <div className="gp-brandmark">
          <span aria-hidden="true" className="gp-brandmark__logo">
            <Icon />
          </span>
          <span>{PRODUCT_NAME}</span>
        </div>
        <PanelNavLinks
          adminRoute={adminRoute}
          isAdmin={user.role === 'admin'}
          logoutHref={`${adminRoute}${payload.config.admin.routes.logout}`}
          unread={await countUnreadMessages(payload, user)}
        />
        <div className="gp-who">
          <i aria-hidden="true">{personInitials(user)}</i>
          <span>{personLabel(user)}</span>
        </div>
      </nav>
    </NavWrapper>
  )
}
