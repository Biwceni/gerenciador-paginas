import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { PANEL_PATHS } from '@/lib/panel'

import { loadInbox } from './data'
import { Inbox } from './Inbox'
import { PanelTemplate, requireUser } from './PanelTemplate'

const positiveId = (value: unknown) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * Tela "Mensagens" (`/admin/mensagens`), no lugar da lista padrão do Payload: caixa de entrada com
 * filtro por formulário (`?formulario=<id>`) e mensagem aberta (`?mensagem=<id>`). Segue o `vInbox`.
 */
export async function MessagesView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.messages)
  const { searchParams } = props
  const formId = positiveId(searchParams?.formulario)
  const inbox = await loadInbox(payload, user, {
    formId,
    openId: positiveId(searchParams?.mensagem),
  })

  return (
    <PanelTemplate {...props}>
      <Inbox
        {...inbox}
        adminRoute={adminRoute}
        apiRoute={payload.config.routes.api}
        formId={formId}
      />
    </PanelTemplate>
  )
}
