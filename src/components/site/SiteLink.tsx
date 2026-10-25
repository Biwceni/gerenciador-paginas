import Link from 'next/link'
import React from 'react'

import { linkKind } from '@/lib/links'

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  children: React.ReactNode
}

/**
 * Página do site navega sem recarregar; link de fora abre em outra aba. Último ponto antes do
 * navegador: endereço que não é do site nem seguro (`javascript:` e parecidos) não é desenhado,
 * mesmo que algo tenha passado pelas validações do painel.
 */
export function SiteLink({ href, children, ...rest }: Props) {
  const kind = linkKind(href)
  if (!kind) return null

  if (kind === 'internal') {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    )
  }
  const opensTab = href.startsWith('http')
  return (
    <a
      href={href}
      rel={opensTab ? 'noopener noreferrer' : undefined}
      target={opensTab ? '_blank' : undefined}
      {...rest}
    >
      {children}
    </a>
  )
}
