'use client'

import { Link, useNav } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'

import { clearPanelLogin, markPanelLogin } from '@/lib/auth'
import { panelHref, type PanelPath } from '@/lib/panel'

import { PanelIcon, type PanelIconName } from './PanelIcon'

export type PanelNavLink = { href: string; label: string }

const MAIN: [PanelPath, PanelIconName, string][] = [
  ['dashboard', 'home', 'Painel'],
  ['pages', 'file', 'Páginas'],
  ['photos', 'image', 'Fotos'],
  ['menu', 'layout', 'Menu e rodapé'],
  ['messages', 'mail', 'Mensagens'],
  ['forms', 'form', 'Formulários'],
  ['settings', 'gear', 'Configurações'],
]

// A partir desta largura o menu lateral fica sempre aberto (o Payload só abre acima de 1440 px).
// Abaixo dela, ele abre pelo ☰ da barra de topo (PanelTopBar). Igual ao `$desktop` do panel.scss.
const DESKTOP = '(min-width: 1024px)'

/** Mantém o menu aberto no computador, também quando o Payload tenta fechar ao carregar. */
function useOpenOnDesktop() {
  const { hydrated, navOpen, setNavOpen } = useNav()
  useEffect(() => {
    const query = window.matchMedia(DESKTOP)
    if (query.matches && !navOpen) setNavOpen(true)
    const onChange = () => query.matches && setNavOpen(true)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [hydrated, navOpen, setNavOpen])
}

type Props = {
  adminRoute: string
  advanced: PanelNavLink[]
  logoutHref: string
  /** Mensagens não lidas: o número ao lado de Mensagens. */
  unread: number
}

export function PanelNavLinks({ adminRoute, advanced, logoutHref, unread }: Props) {
  const pathname = usePathname()
  useOpenOnDesktop()
  // Quem entrou por outro caminho (primeiro usuário, senha nova, sessão de antes do cookie existir).
  useEffect(() => markPanelLogin(), [])
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
                {path === 'messages' && unread > 0 && (
                  <span className="gp-count">
                    {unread}
                    <span className="gp-sr"> não lidas</span>
                  </span>
                )}
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
          <Link
            className="gp-nav__link"
            href={logoutHref}
            onClick={() => clearPanelLogin()}
            prefetch={false}
          >
            <PanelIcon name="out" />
            Sair
          </Link>
        </li>
      </ul>
    </>
  )
}
