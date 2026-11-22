import React from 'react'

import { ContactIcon } from '@/puck/components/FeatureIcon'

import { SiteLink } from './SiteLink'

export type TopBar = {
  phone: { label: string; href: string } | null
  hours: string | null
  link: { label: string; href: string } | null
}

/** A linha de cima tem algo para mostrar. */
export const hasTopBar = (bar: TopBar | null | undefined): bar is TopBar =>
  Boolean(bar && (bar.phone || bar.hours || bar.link))

/**
 * Linha de cima (M1): fina, acima do topo, com o telefone, o horário e um link curto. Rola junto
 * com a página (só o topo fica preso). No celular, o horário sai para caber numa linha.
 */
export function SiteTopBarView({ bar }: { bar: TopBar }) {
  return (
    <div className="site-topbar">
      <div className="container site-topbar__inner">
        {bar.phone && (
          <SiteLink className="site-topbar__item" href={bar.phone.href}>
            <ContactIcon name="phone" />
            <span>{bar.phone.label}</span>
          </SiteLink>
        )}
        {bar.hours && (
          <p className="site-topbar__item site-topbar__hours">
            <ContactIcon name="clock" />
            <span>{bar.hours}</span>
          </p>
        )}
        {bar.link && (
          <SiteLink className="site-topbar__item site-topbar__link" href={bar.link.href}>
            {bar.link.label}
          </SiteLink>
        )}
      </div>
    </div>
  )
}
