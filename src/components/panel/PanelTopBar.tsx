'use client'

import { Link, useAuth, useConfig, useNav } from '@payloadcms/ui'
import React from 'react'

import { panelHref } from '@/lib/panel'
import { PRODUCT_NAME } from '@/lib/site'

import { PanelIcon } from './PanelIcon'

/**
 * Barra de topo do celular e do tablet (`mobiletop` do protótipo), no lugar do topo padrão do
 * Payload: ☰ para abrir o menu, o nome do produto e atalhos para Mensagens e para o site. No
 * computador (a partir de 1024 px), ela some e o menu lateral fica sempre aberto.
 */
export function PanelTopBar() {
  const { user } = useAuth()
  const { config } = useConfig()
  const { navOpen, setNavOpen } = useNav()
  if (!user) return null
  const adminRoute = config.routes.admin

  return (
    <div className="gp-topbar">
      <button
        aria-expanded={navOpen}
        aria-label={navOpen ? 'Fechar o menu do painel' : 'Abrir o menu do painel'}
        className="gp-iconbtn"
        onClick={() => setNavOpen(!navOpen)}
        type="button"
      >
        <PanelIcon name={navOpen ? 'x' : 'menu'} />
      </button>
      <b className="gp-topbar__name">{PRODUCT_NAME}</b>
      <Link
        aria-label="Mensagens"
        className="gp-iconbtn"
        href={panelHref(adminRoute, 'messages')}
        prefetch={false}
      >
        <PanelIcon name="mail" />
      </Link>
      <a aria-label="Ver meu site" className="gp-iconbtn" href="/" rel="noopener" target="_blank">
        <PanelIcon name="eye" />
      </a>
    </div>
  )
}
