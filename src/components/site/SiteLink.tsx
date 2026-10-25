import Link from 'next/link'
import React from 'react'

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  children: React.ReactNode
}

/** Página do site navega sem recarregar; link de fora abre em outra aba. */
export function SiteLink({ href, children, ...rest }: Props) {
  if (href.startsWith('/')) {
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
