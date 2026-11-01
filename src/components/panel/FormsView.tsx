import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { loadFormUsage } from '@/lib/formUsage'
import { PANEL_PATHS } from '@/lib/panel'

import { countMessagesByForm } from './data'
import { FormsList } from './FormsList'
import { PanelTemplate, requireUser } from './PanelTemplate'

/**
 * Tela "Formulários" (`/admin/formularios`), no lugar da lista padrão do Payload: cada formulário
 * com as páginas em que aparece, e os prontos para criar um novo. Segue o `vForms`.
 */
export async function FormsView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.forms)
  const { docs } = await payload.find({
    collection: 'forms',
    select: { title: true, fields: true },
    depth: 0,
    limit: 200,
    pagination: false,
    sort: 'title',
    overrideAccess: false,
    user,
  })
  const ids = docs.map((form) => form.id)
  const [usage, counts] = await Promise.all([
    loadFormUsage(payload, { overrideAccess: false, user }),
    countMessagesByForm(payload, user, ids),
  ])

  return (
    <PanelTemplate {...props}>
      <FormsList
        adminRoute={adminRoute}
        apiRoute={payload.config.routes.api}
        forms={docs.map((form) => ({
          id: form.id,
          title: form.title,
          questions: form.fields?.length ?? 0,
          pages: usage.get(form.id)?.map((page) => page.title) ?? [],
          messages: counts.get(form.id) ?? 0,
        }))}
      />
    </PanelTemplate>
  )
}
