'use client'

import React, { useState } from 'react'

import { Dialog } from './Dialog'
import { linksTo, menuLabel, type MenuItems, renameMenuLinks } from './menu'

type Props = {
  apiRoute: string
  pageId: number
  /** O nome de antes e o novo. */
  from: string
  to: string
  /** O menu publicado, que ainda tem o nome de antes. */
  items: MenuItems
  /** O texto que o link do menu tem hoje. */
  current: string
  onClose: () => void
  /** O menu foi trocado: avisa a pessoa (toast). */
  onRenamed: () => void
}

/**
 * Renomeou a página (A6, achado CAR4): o link do menu continuava com o nome antigo e ninguém
 * avisava. A janela mostra como o menu vai ficar e troca com um toque.
 */
export function RenameMenuDialog({
  apiRoute,
  pageId,
  from,
  to,
  items,
  current,
  onClose,
  onRenamed,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const label = menuLabel(to)

  const rename = async () => {
    setBusy(true)
    setError(null)
    try {
      await renameMenuLinks(apiRoute, items, pageId, to)
      onRenamed()
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Tente de novo.')
      setBusy(false)
    }
  }

  return (
    <Dialog
      footer={
        <>
          <button className="ed-btn" disabled={busy} onClick={onClose} type="button">
            Deixar o menu como está
          </button>
          <button className="ed-btn ed-btn--primary" disabled={busy} onClick={rename} type="button">
            {busy ? 'Trocando…' : 'Trocar no menu também'}
          </button>
        </>
      }
      onClose={onClose}
      title="Trocar também no menu?"
    >
      <p>
        Você mudou o nome de <b>{from}</b> para <b>{to}</b>. No menu do site, o link ainda diz{' '}
        {`“${current}”.`}
      </p>
      <div className="ed-menu-preview">
        <span className="ed-hint">No menu vai ficar</span>
        <ul>
          {items.map((item, index) => {
            const mine = linksTo(pageId)(item)
            return (
              <li className={mine ? 'ed-menu-preview__new' : undefined} key={item.id ?? index}>
                {mine ? label : item.label}
              </li>
            )
          })}
        </ul>
      </div>
      {to.trim().length > 30 && (
        <p className="ed-hint">No menu, o nome fica com as primeiras 30 letras.</p>
      )}
      {error && <p className="ed-hint ed-hint--warn">Não deu para trocar no menu: {error}</p>}
    </Dialog>
  )
}
