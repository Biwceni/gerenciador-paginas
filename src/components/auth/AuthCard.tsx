import React from 'react'

import { Icon } from '@/components/admin/Icon'
import { PanelIcon } from '@/components/panel/PanelIcon'
import { LOCK_MINUTES, MAX_LOGIN_ATTEMPTS } from '@/lib/auth'
import { PRODUCT_NAME } from '@/lib/site'

/**
 * Cartão das telas de entrar, senha e primeira conta, no visual do protótipo (`authcard`): o nome
 * do produto no topo, o título e o conteúdo da tela.
 */
export function AuthCard({
  children,
  focusTitle,
  lead,
  title,
}: {
  children?: React.ReactNode
  /**
   * O cartão troca de estado na mesma tela ("Confira seu e-mail", link vencido): o título pode
   * receber o foco, para quem usa leitor de tela ouvir a mudança (`focusAuthTitle`).
   */
  focusTitle?: boolean
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
          <h1 tabIndex={focusTitle ? -1 : undefined}>{title}</h1>
          {lead && <p className="gp-muted">{lead}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

/** Põe o foco no título do cartão que acabou de trocar (precisa do `focusTitle`). */
export function focusAuthTitle() {
  document.querySelector<HTMLElement>('.gp-authcard__head h1[tabindex="-1"]')?.focus()
}

/** Link discreto no pé do cartão ("Esqueci minha senha", "Voltar para entrar"). */
export function AuthLink({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a className="gp-authcard__link" href={href}>
      {children}
    </a>
  )
}

/**
 * Caixa de erro das telas de entrar e senha: ícone de alerta e o texto, sobre o fundo de erro.
 * O aviso comum (`.gp-warnbox`, bege) fica para avisos de verdade.
 */
export function AuthError({
  field,
  id,
  text,
}: {
  field?: boolean
  id?: string
  text?: string | null
}) {
  if (!text) return null
  return (
    <p
      className={`gp-warnbox gp-warnbox--danger${field ? ' gp-warnbox--field' : ''}`}
      id={id}
      role="alert"
    >
      <PanelIcon name="alert" size={16} />
      <span>{text}</span>
    </p>
  )
}

/** Problema embaixo de um campo, na mesma caixa de erro da senha errada. */
export function FieldProblem({ id, text }: { id: string; text?: string | null }) {
  return <AuthError field id={id} text={text} />
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
export function ExpiredCard({
  focusTitle,
  forgotHref,
  loginHref,
}: {
  focusTitle?: boolean
  forgotHref: string
  loginHref: string
}) {
  return (
    <AuthCard
      focusTitle={focusTitle}
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
