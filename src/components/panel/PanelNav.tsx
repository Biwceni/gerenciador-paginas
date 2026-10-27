import { NavHamburger, NavWrapper } from '@payloadcms/next/client'
import { getTranslation } from '@payloadcms/translations'
import type { ServerProps, VisibleEntities } from 'payload'
import React from 'react'

import { FALLBACK_SITE_NAME, initials } from '@/lib/site'

import { PanelNavLinks, type PanelNavLink } from './PanelNavLinks'

type Props = ServerProps & { visibleEntities?: VisibleEntities }

/**
 * Menu lateral do painel, no lugar do menu padrão do Payload: as telas do dia a dia com nomes
 * simples. O administrador vê também "Avançado", com as telas padrão do Payload.
 */
export async function PanelNav({ i18n, payload, user, visibleEntities }: Props) {
  if (!payload?.config || !user) return null
  const adminRoute = payload.config.routes.admin

  const site = await payload.findGlobal({
    slug: 'site',
    depth: 0,
    draft: false,
    overrideAccess: false,
    user,
  })
  const name = site.name || FALLBACK_SITE_NAME

  const advanced: PanelNavLink[] =
    user.role === 'admin' && visibleEntities
      ? [
          ...payload.config.collections
            .filter(({ slug }) => visibleEntities.collections.includes(slug))
            .map(({ labels, slug }) => ({
              href: `${adminRoute}/collections/${slug}`,
              label: getTranslation(labels.plural, i18n),
            })),
          ...payload.config.globals
            .filter(({ slug }) => visibleEntities.globals.includes(slug))
            .map(({ label, slug }) => ({
              href: `${adminRoute}/globals/${slug}`,
              label: getTranslation(label ?? slug, i18n),
            })),
        ]
      : []

  return (
    <NavWrapper baseClass="nav">
      <nav aria-label="Menu do painel" className="nav__wrap gp-nav">
        <div className="gp-brandmark">
          <span aria-hidden="true" className="gp-brandmark__logo">
            {initials(name)}
          </span>
          <span>
            {name}
            <small>Meu site</small>
          </span>
        </div>
        <PanelNavLinks
          adminRoute={adminRoute}
          advanced={advanced}
          logoutHref={`${adminRoute}${payload.config.admin.routes.logout}`}
        />
      </nav>
      <div className="nav__header">
        <div className="nav__header-content">
          <NavHamburger baseClass="nav" />
        </div>
      </div>
    </NavWrapper>
  )
}
