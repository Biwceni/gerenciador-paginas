'use client'

import { useEffect } from 'react'

import { withWhatsAppText } from '@/lib/links'

/**
 * Todo botão de WhatsApp da página (topo, canto, seções, rodapé) abre a conversa já com a mensagem
 * das Configurações e a página de onde a pessoa veio (W2). O texto entra no toque, antes de o
 * navegador abrir o link; os produtos, que já têm a sua mensagem, ficam como estão. Sem JavaScript,
 * a conversa abre em branco, como antes.
 */
export function WhatsAppPrefill({ text }: { text: string }) {
  useEffect(() => {
    const fill = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>(
        'a[href^="https://wa.me/"]',
      )
      if (!link) return
      try {
        link.href = withWhatsAppText(link.href, text)
      } catch {
        // Endereço que não se lê como URL: segue como está.
      }
    }
    document.addEventListener('click', fill, true)
    document.addEventListener('auxclick', fill, true)
    document.addEventListener('contextmenu', fill, true)
    return () => {
      document.removeEventListener('click', fill, true)
      document.removeEventListener('auxclick', fill, true)
      document.removeEventListener('contextmenu', fill, true)
    }
  }, [text])
  return null
}
