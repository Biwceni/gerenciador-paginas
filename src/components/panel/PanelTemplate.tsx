import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

/**
 * Telas nossas com o menu lateral e o topo do painel. O Payload só põe o modelo padrão nas telas
 * dele; as que criamos em `admin.components.views` vêm sem nada em volta.
 */
export function PanelTemplate({
  children,
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps & { children: React.ReactNode }) {
  const { locale, permissions, req, visibleEntities } = initPageResult
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      {children}
    </DefaultTemplate>
  )
}

/** Sem sessão, manda para a tela de entrar e volta para cá depois. */
export function requireUser({ initPageResult }: AdminViewServerProps, path: string) {
  const { payload, user } = initPageResult.req
  const adminRoute = payload.config.routes.admin
  if (!user) redirect(`${adminRoute}/login?redirect=${encodeURIComponent(`${adminRoute}${path}`)}`)
  return { payload, user, adminRoute }
}
