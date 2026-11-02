import Link from 'next/link'
import React from 'react'

import { editorPath } from '@/lib/editor'
import { PAGE_STATUS_LABEL, timeAgo } from '@/lib/panel'

import type { PageRow } from './data'
import { PanelIcon } from './PanelIcon'

const STATUS_CLASS = { live: 'ok', changed: 'warn', draft: 'draft' } as const

export function StatusChip({
  className = '',
  status,
}: {
  className?: string
  status: PageRow['status']
}) {
  return (
    <span className={`gp-chip gp-chip--${STATUS_CLASS[status]} ${className}`.trim()}>
      {PAGE_STATUS_LABEL[status]}
    </span>
  )
}

/** Uma página numa lista do painel: nome, endereço, quando mudou, status e ações. */
export function PageRowItem({
  adminRoute,
  archived = false,
  children,
  domain,
  page,
}: {
  adminRoute: string
  /** No grupo "Arquivadas": o selo diz "Arquivada" no lugar do status. */
  archived?: boolean
  children?: React.ReactNode
  domain: string
  page: PageRow
}) {
  // O selo aparece numa coluna própria no computador e ao lado do nome no celular (só um dos dois
  // fica visível; o outro some também para os leitores de tela).
  const chip = (place: 'inline' | 'column') =>
    archived ? (
      <span className={`gp-chip gp-chip--draft gp-row__chip--${place}`}>Arquivada</span>
    ) : (
      <StatusChip className={`gp-row__chip--${place}`} status={page.status} />
    )

  return (
    <li className="gp-row gp-row--page">
      <div>
        <div className="gp-row__title">
          {archived ? (
            page.title
          ) : (
            <Link className="gp-row__link" href={editorPath(adminRoute, page.id)}>
              {page.title}
            </Link>
          )}
          {page.home && <span className="gp-chip gp-chip--home">Página inicial</span>}
          {chip('inline')}
        </div>
        <div className="gp-row__sub">
          {/* No celular, só o caminho ("/tratamentos"). */}
          <span className="gp-row__domain">{domain}</span>
          {page.path} · editada {timeAgo(page.updatedAt)}
        </div>
      </div>
      {chip('column')}
      <div className="gp-row__actions">
        {children ?? (
          <Link className="gp-btn gp-btn--sm" href={editorPath(adminRoute, page.id)}>
            <PanelIcon name="edit" size={14} />
            Editar
          </Link>
        )}
      </div>
    </li>
  )
}
