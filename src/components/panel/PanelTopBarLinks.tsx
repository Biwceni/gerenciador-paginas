'use client'

import { Link, useConfig, useNav } from '@payloadcms/ui'
import React from 'react'

import { panelHref } from '@/lib/panel'
import { PRODUCT_NAME } from '@/lib/site'

import { PanelIcon } from './PanelIcon'

/** A parte da barra de topo que reage ao ☰. Quem lê o número de mensagens é o `PanelTopBar`. */
export function PanelTopBarLinks({ unread }: { unread: number }) {
  const { config } = useConfig()
  const { navOpen, setNavOpen } = useNav()
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
        aria-label={
          unread ? `Mensagens: ${unread} ${unread === 1 ? 'nova' : 'novas'}` : 'Mensagens'
        }
        className="gp-iconbtn gp-topbar__mail"
        href={panelHref(adminRoute, 'messages')}
        prefetch={false}
      >
        <PanelIcon name="mail" />
        {unread > 0 && (
          <span aria-hidden="true" className="gp-count">
            {unread}
          </span>
        )}
      </Link>
      <a aria-label="Ver meu site" className="gp-iconbtn" href="/" rel="noopener" target="_blank">
        <PanelIcon name="eye" />
      </a>
    </div>
  )
}
