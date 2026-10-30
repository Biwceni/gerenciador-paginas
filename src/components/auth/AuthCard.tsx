import React from 'react'

import { Icon } from '@/components/admin/Icon'
import { LOCK_MINUTES, MAX_LOGIN_ATTEMPTS } from '@/lib/auth'
import { PRODUCT_NAME } from '@/lib/site'

/**
 * Cartão das telas de entrar, senha e primeira conta, no visual do protótipo (`authcard`): o nome
 * do produto no topo, o título e o conteúdo da tela.
 */
export function AuthCard({
  children,
  lead,
  title,
}: {
  children?: React.ReactNode
  lead?: React.ReactNode
  title: string
}) {
  return (
    <div className="gp-auth">
      <div className="gp-authcard">
        <div className="gp-brandmark">
          <span aria-hidden="true" className="gp-brandmark__logo">
            <Icon />
          </span>
          <span>{PRODUCT_NAME}</span>
        </div>
        <div className="gp-authcard__head">
          <h1>{title}</h1>
          {lead && <p className="gp-muted">{lead}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

/** Link discreto no pé do cartão ("Esqueci minha senha", "Voltar para entrar"). */
export function AuthLink({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a className="gp-authcard__link" href={href}>
      {children}
    </a>
  )
}

/** Conta bloqueada depois de tentativas com a senha errada. */
export function LockedCard({ forgotHref, loginHref }: { forgotHref: string; loginHref: string }) {
  return (
    <AuthCard
      lead={`Houve ${MAX_LOGIN_ATTEMPTS} tentativas com a senha errada. Espere ${LOCK_MINUTES} minutos e tente de novo, ou crie uma senha nova agora.`}
      title={`Entrada bloqueada por ${LOCK_MINUTES} minutos`}
    >
      <a className="gp-btn gp-btn--primary gp-btn--lg gp-btn--block" href={forgotHref}>
        Criar uma senha nova
      </a>
      <AuthLink href={loginHref}>Voltar para entrar</AuthLink>
    </AuthCard>
  )
}

/** Link de senha vencido ou já usado. */
export function ExpiredCard({ forgotHref, loginHref }: { forgotHref: string; loginHref: string }) {
  return (
    <AuthCard
      lead="Por segurança, o link para criar a senha tem prazo e só funciona uma vez. Peça um novo, leva um minuto."
      title="Este link venceu"
    >
      <a className="gp-btn gp-btn--primary gp-btn--lg gp-btn--block" href={forgotHref}>
        Pedir um link novo
      </a>
      <AuthLink href={loginHref}>Voltar para entrar</AuthLink>
    </AuthCard>
  )
}
