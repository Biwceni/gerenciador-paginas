'use client'

import React, { useEffect, useRef } from 'react'

import { PanelIcon } from './PanelIcon'

type Props = {
  title: string
  onClose: () => void
  children: React.ReactNode
  /** Mais larga, para grades de fotos. */
  wide?: boolean
}

/** Janela por cima da tela, que fecha no X, no Esc ou clicando fora. Como a `Dialog` do editor. */
export function PanelDialog({ title, onClose, children, wide }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [onClose])

  return (
    <div
      className="gp-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        aria-labelledby="gp-dialog-title"
        aria-modal="true"
        className={`gp-dialog${wide ? ' gp-dialog--wide' : ''}`}
        ref={ref}
        role="dialog"
        tabIndex={-1}
      >
        <div className="gp-dialog__head">
          <h2 id="gp-dialog-title">{title}</h2>
          <button aria-label="Fechar" className="gp-iconbtn" onClick={onClose} type="button">
            <PanelIcon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
