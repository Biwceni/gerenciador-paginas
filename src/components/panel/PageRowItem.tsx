import Link from 'next/link'
import React from 'react'

import { editorPath } from '@/lib/editor'
import { PAGE_STATUS_LABEL, timeAgo } from '@/lib/panel'

import type { PageRow } from './data'
import { PanelIcon } from './PanelIcon'

const STATUS_CLASS = { live: 'ok', changed: 'warn', draft: 'draft' } as const

export function StatusChip({ status }: { status: PageRow['status'] }) {
  return (
    <span className={`gp-chip gp-chip--${STATUS_CLASS[status]}`}>{PAGE_STATUS_LABEL[status]}</span>
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
  return (
    <li className="gp-row">
      <div>
        <div className="gp-row__title">
          {page.title}
          {page.home && <span className="gp-chip gp-chip--home">Página inicial</span>}
        </div>
        <div className="gp-row__sub">
          {domain}
          {page.path} · editada {timeAgo(page.updatedAt)}
        </div>
      </div>
      {archived ? (
        <span className="gp-chip gp-chip--draft">Arquivada</span>
      ) : (
        <StatusChip status={page.status} />
      )}
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
