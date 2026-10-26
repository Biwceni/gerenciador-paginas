'use client'

import React, { useEffect, useRef } from 'react'

type Props = {
  title: string
  description?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}

/**
 * Janela por cima do editor. Não usa `<dialog>` com `showModal`, porque ele fica acima de tudo e
 * esconderia a gaveta de envio de fotos do Payload, que abre por cima desta janela.
 */
export function Dialog({ title, description, onClose, children, footer, wide }: Props) {
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
      className="ed-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        aria-labelledby="ed-dialog-title"
        aria-modal="true"
        className={`ed-dialog${wide ? ' ed-dialog--wide' : ''}`}
        ref={ref}
        role="dialog"
        tabIndex={-1}
      >
        <div className="ed-dialog__head">
          <div>
            <h2 id="ed-dialog-title">{title}</h2>
            {description && <p className="ed-muted">{description}</p>}
          </div>
          <button aria-label="Fechar" className="ed-icon-btn" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="ed-dialog__body">{children}</div>
        {footer && <div className="ed-dialog__foot">{footer}</div>}
      </div>
    </div>
  )
}
