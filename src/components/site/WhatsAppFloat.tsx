import React from 'react'

import { ContactIcon } from '@/puck/components/FeatureIcon'

/**
 * Botão do WhatsApp no celular (site com até 760 px, `styles.css`): só o ícone redondo de 56 px no
 * canto, sempre à vista (componentes, C16, achado G1). O rodapé ganha espaço no fim para o botão
 * não cobrir nenhum link. No computador, não aparece.
 */
export function WhatsAppFloat({ href }: { href: string }) {
  return (
    <a
      aria-label="Falar no WhatsApp"
      className="wa-float"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <ContactIcon name="whatsapp" />
    </a>
  )
}
