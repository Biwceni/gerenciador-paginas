import { notFound } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { formNotifyEmail, richTextToPlain } from '@/lib/forms'
import { loadFormUsage } from '@/lib/formUsage'
import { PANEL_PATHS } from '@/lib/panel'

import { countMessagesByForm } from './data'
import { FormEditor } from './FormEditor'
import { PanelTemplate, requireUser } from './PanelTemplate'

/** Editor simples de um formulário: `/admin/formularios/<id>`. Segue o `vForms`. */
export async function FormEditView(props: AdminViewServerProps) {
  const segments = (props.params?.segments as string[] | undefined) ?? []
  const id = Number(segments[1])
  const { payload, user, adminRoute } = requireUser(props, `${PANEL_PATHS.forms}/${segments[1]}`)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const access = { overrideAccess: false, user } as const
  const [form, site, usage, counts] = await Promise.all([
    payload.findByID({ collection: 'forms', id, depth: 0, disableErrors: true, ...access }),
    payload.findGlobal({ slug: 'site', depth: 0, draft: false, ...access }),
    loadFormUsage(payload, access),
    countMessagesByForm(payload, user, [id]),
  ])
  if (!form) notFound()

  return (
    <PanelTemplate {...props}>
      <FormEditor
        adminRoute={adminRoute}
        apiRoute={payload.config.routes.api}
        form={{
          id: form.id,
          title: form.title,
          fields: form.fields ?? [],
          successMessage: richTextToPlain(form.confirmationMessage),
          notifyEmail: formNotifyEmail(form),
        }}
        messages={counts.get(form.id) ?? 0}
        pages={usage.get(form.id) ?? []}
        siteEmail={site.contact?.email ?? ''}
      />
    </PanelTemplate>
  )
}
