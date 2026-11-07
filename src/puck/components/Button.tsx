import React from 'react'

import { SiteLink } from '@/components/site/SiteLink'

import { type ContentMetadata, getHref } from '../references'
import type { ButtonValue } from '../schema'

type Props = {
  button: ButtonValue | null
  metadata: ContentMetadata
  /** Classe a mais (ex.: `anim-part`, para o botão entrar com a animação da seção). */
  className?: string
}

/**
 * Botão de uma seção. Sem texto ou sem destino no ar (página em rascunho, WhatsApp não cadastrado),
 * não aparece: nada de link quebrado. As cores seguem o fundo da seção (veja `styles.css`).
 */
export function SectionButton({ button, metadata, className }: Props) {
  const classes = className ? `button ${className}` : 'button'
  // No editor o texto do botão é editado ali mesmo, e o clique não leva a lugar nenhum.
  if (metadata.editing) return button ? <span className={classes}>{button.label}</span> : null

  const href = button ? getHref(metadata, button.link) : null
  if (!button?.label.trim() || !href) return null

  return (
    <SiteLink className={classes} href={href}>
      {button.label}
    </SiteLink>
  )
}
