import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { PANEL_PATHS } from '@/lib/panel'
import { relationID } from '@/lib/relations'
import { getServerURL } from '@/lib/site'
import { DEFAULT_COLORS } from '@/lib/theme'

import { PanelTemplate, requireUser } from './PanelTemplate'
import { PeopleCard } from './PeopleCard'
import { SettingsEditor, type SettingsState } from './SettingsEditor'

/**
 * Tela "Configurações" (`/admin/configuracoes`): identidade, página inicial, cores e letras,
 * contato e Google. Segue o `vSettings` do protótipo: muda e já vale no site.
 */
export async function SettingsView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.settings)
  const access = { overrideAccess: false, user } as const
  const [site, live, photos, people] = await Promise.all([
    // O rascunho mais recente: se alguém mexeu pela tela avançada sem publicar, aparece aqui.
    payload.findGlobal({ slug: 'site', depth: 0, draft: true, ...access }),
    payload.find({
      collection: 'pages',
      where: { _status: { equals: 'published' } },
      select: { title: true },
      depth: 0,
      draft: false,
      limit: 500,
      pagination: false,
      sort: 'title',
      ...access,
    }),
    payload.find({
      collection: 'media',
      depth: 0,
      limit: 1000,
      pagination: false,
      sort: '-createdAt',
      ...access,
    }),
    // Administrador vê todas as contas; editor, só a dele (regra da coleção).
    payload.find({
      collection: 'users',
      select: { email: true, name: true, role: true },
      depth: 0,
      limit: 100,
      pagination: false,
      sort: 'email',
      ...access,
    }),
  ])

  const initial: SettingsState = {
    name: site.name ?? '',
    tagline: site.tagline ?? '',
    logo: relationID(site.logo),
    homepage: relationID(site.homepage),
    colors: { ...DEFAULT_COLORS, ...site.colors },
    fonts: { headings: site.fonts?.headings ?? '', body: site.fonts?.body ?? '' },
    contact: {
      whatsapp: site.contact?.whatsapp ?? '',
      phone: site.contact?.phone ?? '',
      email: site.contact?.email ?? '',
      address: site.contact?.address ?? '',
      hours: site.contact?.hours ?? '',
    },
    social: {
      instagram: site.social?.instagram ?? '',
      facebook: site.social?.facebook ?? '',
      youtube: site.social?.youtube ?? '',
      tiktok: site.social?.tiktok ?? '',
      linkedin: site.social?.linkedin ?? '',
    },
    seoDescription: site.seoDescription ?? '',
    shareImage: relationID(site.shareImage),
  }

  return (
    <PanelTemplate {...props}>
      <SettingsEditor
        adminRoute={adminRoute}
        apiRoute={payload.config.routes.api}
        domain={new URL(getServerURL()).host}
        fontFaces={site.fontFaces ?? null}
        initial={initial}
        livePages={live.docs.map(({ id, title }) => ({ id, title }))}
        pending={site._status === 'draft'}
        people={
          <PeopleCard
            adminRoute={adminRoute}
            apiRoute={payload.config.routes.api}
            me={{ id: user.id, role: user.role }}
            people={people.docs}
          />
        }
        photos={photos.docs}
      />
    </PanelTemplate>
  )
}
