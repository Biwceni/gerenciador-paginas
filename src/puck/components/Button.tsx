import React from 'react'

import { SiteLink } from '@/components/site/SiteLink'

import { type ContentMetadata, getHref } from '../references'
import type { ButtonValue } from '../schema'

type Props = {
  button: ButtonValue | null
  metadata: ContentMetadata
}

/**
 * Botão de uma seção. Sem texto ou sem destino no ar (página em rascunho, WhatsApp não cadastrado),
 * não aparece: nada de link quebrado. As cores seguem o fundo da seção (veja `styles.css`).
 */
export function SectionButton({ button, metadata }: Props) {
  // No editor o texto do botão é editado ali mesmo, e o clique não leva a lugar nenhum.
  if (metadata.editing) return button ? <span className="button">{button.label}</span> : null

  const href = button ? getHref(metadata, button.link) : null
  if (!button?.label.trim() || !href) return null

  return (
    <SiteLink className="button" href={href}>
      {button.label}
    </SiteLink>
  )
}
