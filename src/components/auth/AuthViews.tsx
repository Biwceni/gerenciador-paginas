import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { getSafeRedirect } from 'payload/shared'
import React from 'react'

import { ExpiredCard } from './AuthCard'
import { FirstUserForm } from './FirstUserForm'
import { ForgotForm } from './ForgotForm'
import { LoginForm } from './LoginForm'
import { NewPasswordForm } from './NewPasswordForm'

// Telas de entrar e senha (v2, entrega 1), no lugar das do Payload: `login`, `forgot` e
// `createFirstUser` em `admin.components.views`, e `/nova-senha/<token>` como tela nova (a
// `/reset/<token>` do Payload não pode ser trocada). As regras continuam na API do Payload.

function authRoutes({ initPageResult }: AdminViewServerProps) {
  const { config } = initPageResult.req.payload
  const admin = config.routes.admin
  return {
    admin,
    api: config.routes.api,
    login: `${admin}${config.admin.routes.login}`,
    forgot: `${admin}${config.admin.routes.forgot}`,
  }
}

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return ''
  }
}

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** `/admin/login`: quem já entrou vai direto para o painel (ou para onde ia). */
export function LoginView(props: AdminViewServerProps) {
  const routes = authRoutes(props)
  const redirectTo = getSafeRedirect({
    fallbackTo: routes.admin,
    redirectTo: param(props.searchParams?.redirect) ?? '',
  })
  if (props.initPageResult.req.user) redirect(redirectTo)
  return (
    <LoginForm
      apiRoute={routes.api}
      forgotHref={routes.forgot}
      loginHref={routes.login}
      redirectTo={redirectTo}
    />
  )
}

/** `/admin/forgot`: pede o link de senha nova por e-mail. */
export function ForgotView(props: AdminViewServerProps) {
  const routes = authRoutes(props)
  if (props.initPageResult.req.user) redirect(routes.admin)
  return <ForgotForm apiRoute={routes.api} loginHref={routes.login} />
}

/**
 * `/admin/nova-senha/<token>` (link do convite e do esqueci a senha). Confere o link antes de
 * mostrar o formulário, com a mesma busca da API de reset do Payload: vencido ou já usado mostra a
 * tela de pedir outro.
 */
export async function NewPasswordView(props: AdminViewServerProps) {
  const routes = authRoutes(props)
  const { payload } = props.initPageResult.req
  const segments = props.params?.segments
  const token = Array.isArray(segments) ? safeDecode(segments[1] ?? '') : ''
  const user = token
    ? await payload.db.findOne<{ id: number; email: string }>({
        collection: 'users',
        where: {
          resetPasswordToken: { equals: token },
          resetPasswordExpiration: { greater_than: new Date().toISOString() },
        },
      })
    : null
  if (!user) return <ExpiredCard forgotHref={routes.forgot} loginHref={routes.login} />
  return (
    <NewPasswordForm
      adminRoute={routes.admin}
      apiRoute={routes.api}
      email={user.email}
      forgotHref={routes.forgot}
      invite={param(props.searchParams?.convite) === '1'}
      loginHref={routes.login}
      token={token}
    />
  )
}

/** `/admin/create-first-user`: a primeira conta do site, que vira administrador. */
export function FirstUserView(props: AdminViewServerProps) {
  const routes = authRoutes(props)
  return <FirstUserForm adminRoute={routes.admin} apiRoute={routes.api} />
}
