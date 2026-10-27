'use client'

import { Link } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import React from 'react'

import { panelHref, type PanelPath } from '@/lib/panel'

import { PanelIcon, type PanelIconName } from './PanelIcon'

export type PanelNavLink = { href: string; label: string }

const MAIN: [PanelPath, PanelIconName, string][] = [
  ['dashboard', 'home', 'Painel'],
  ['pages', 'file', 'Páginas'],
  ['photos', 'image', 'Fotos'],
  ['menu', 'layout', 'Menu e rodapé'],
  ['messages', 'inbox', 'Mensagens'],
  ['forms', 'form', 'Formulários'],
  ['settings', 'gear', 'Configurações'],
]

type Props = {
  adminRoute: string
  advanced: PanelNavLink[]
  logoutHref: string
}

export function PanelNavLinks({ adminRoute, advanced, logoutHref }: Props) {
  const pathname = usePathname()
  const isCurrent = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <ul className="gp-nav__list">
        {MAIN.map(([path, icon, label]) => {
          const href = panelHref(adminRoute, path)
          const current = isCurrent(href, path === 'dashboard')
          return (
            <li key={path}>
              <Link
                aria-current={current ? 'page' : undefined}
                className="gp-nav__link"
                href={href}
                prefetch={false}
              >
                <PanelIcon name={icon} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="gp-nav__spacer" />
      {advanced.length > 0 && (
        <details
          className="gp-nav__advanced"
          open={advanced.some(({ href }) => isCurrent(href, false))}
        >
          <summary className="gp-nav__link">
            <PanelIcon name="tool" />
            Avançado
          </summary>
          <ul className="gp-nav__list gp-nav__list--sub">
            {advanced.map(({ href, label }) => (
              <li key={href}>
                <Link
                  aria-current={isCurrent(href, false) ? 'page' : undefined}
                  className="gp-nav__link"
                  href={href}
                  prefetch={false}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
      <ul className="gp-nav__list">
        <li>
          <a className="gp-nav__link" href="/" rel="noopener" target="_blank">
            <PanelIcon name="eye" />
            Ver meu site
          </a>
        </li>
        <li>
          <Link className="gp-nav__link" href={logoutHref} prefetch={false}>
            <PanelIcon name="out" />
            Sair
          </Link>
        </li>
      </ul>
    </>
  )
}
