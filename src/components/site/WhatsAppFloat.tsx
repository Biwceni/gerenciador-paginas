'use client'

import React, { useEffect, useRef, useState } from 'react'

import { ContactIcon } from '@/puck/components/FeatureIcon'

/**
 * Botão do WhatsApp que acompanha a rolagem, só no celular (site com até 760 px, `styles.css`). Sai
 * da frente quando o formulário ou a chamada para ação estão na tela, porque eles já levam ao
 * contato. Sem JavaScript, fica sempre à vista (nunca escondido esperando o script).
 */
export function WhatsAppFloat({ href }: { href: string }) {
  const link = useRef<HTMLAnchorElement>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const targets = document.querySelectorAll('main .form-section, main .cta')
    if (!targets.length || typeof IntersectionObserver === 'undefined') return
    const visible = new Set<Element>()
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target)
        else visible.delete(entry.target)
      }
      setHidden(visible.size > 0)
    })
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [])

  // Escondido, sai também da ordem do Tab e do leitor de tela.
  useEffect(() => {
    link.current?.toggleAttribute('inert', hidden)
  }, [hidden])

  return (
    <a
      aria-hidden={hidden || undefined}
      aria-label="Falar no WhatsApp"
      className="wa-float"
      data-hidden={hidden || undefined}
      href={href}
      ref={link}
      rel="noopener noreferrer"
      target="_blank"
    >
      <ContactIcon name="whatsapp" />
      <span>WhatsApp</span>
    </a>
  )
}
