import type { ServerProps } from 'payload'
import React from 'react'

import { countUnreadMessages } from './data'
import { PanelTopBarLinks } from './PanelTopBarLinks'

/**
 * Barra de topo do celular e do tablet (`mobiletop` do protótipo), no lugar do topo padrão do
 * Payload: ☰ para abrir o menu, o nome do produto e atalhos para Mensagens (com o número de não
 * lidas) e para o site. No computador (a partir de 1024 px), ela some e o menu lateral fica sempre
 * aberto.
 */
export async function PanelTopBar({ payload, user }: ServerProps) {
  if (!payload || !user) return null
  return <PanelTopBarLinks unread={await countUnreadMessages(payload, user)} />
}
