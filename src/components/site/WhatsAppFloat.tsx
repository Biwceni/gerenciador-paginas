import React from 'react'

import { ContactIcon } from '@/puck/components/FeatureIcon'

/**
 * Botão do WhatsApp no canto da tela: só o ícone redondo de 56 px, sempre à vista (componentes,
 * C16, achado G1). Quem decide onde ele aparece é o dono, em Configurações › Contato (W1): no
 * celular vem ligado, no computador desligado. O rodapé ganha espaço no fim para o botão não cobrir
 * nenhum link.
 */
export function WhatsAppFloat({
  href,
  phone = true,
  desktop = false,
}: {
  href: string
  phone?: boolean
  desktop?: boolean
}) {
  if (!phone && !desktop) return null
  return (
    <a
      aria-label="Falar no WhatsApp"
      className="wa-float"
      data-desktop={desktop ? '' : undefined}
      data-phone-off={phone ? undefined : ''}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <ContactIcon name="whatsapp" />
    </a>
  )
}
