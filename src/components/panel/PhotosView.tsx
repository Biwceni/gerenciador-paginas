import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { photoUsage } from '@/hooks/protectPhoto'
import { PANEL_PATHS } from '@/lib/panel'

import { PanelTemplate, requireUser } from './PanelTemplate'
import { PhotosLibrary } from './PhotosLibrary'

/** Tela "Fotos" (`/admin/fotos`): biblioteca, descrição, onde é usada e trocar. Segue o `vMedia`. */
export async function PhotosView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.photos)
  const access = { overrideAccess: false, user } as const
  const [photos, usage] = await Promise.all([
    payload.find({
      collection: 'media',
      depth: 0,
      limit: 1000,
      pagination: false,
      sort: '-createdAt',
      ...access,
    }),
    photoUsage(payload, access),
  ])

  return (
    <PanelTemplate {...props}>
      <PhotosLibrary
        adminRoute={adminRoute}
        apiRoute={payload.config.routes.api}
        photos={photos.docs}
        usage={Object.fromEntries(usage)}
      />
    </PanelTemplate>
  )
}
