'use client'

import React, { useEffect, useId, useRef } from 'react'

type Props = {
  title: string
  description?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
  /** `alertdialog`: pede uma decisão antes de seguir (sair sem salvar, recuperar mudanças). */
  role?: 'dialog' | 'alertdialog'
}

/**
 * Janela por cima do editor. Não usa `<dialog>` com `showModal`, porque ele fica acima de tudo e
 * esconderia a gaveta de envio de fotos do Payload, que abre por cima desta janela.
 */
export function Dialog({
  title,
  description,
  onClose,
  children,
  footer,
  wide,
  role = 'dialog',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    // Uma janela pode abrir outra por cima (a biblioteca de fotos sobre Página e Google): o Esc
    // fecha só a de cima.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const overlays = document.querySelectorAll('.ed-overlay')
      if (overlays[overlays.length - 1] === ref.current?.parentElement) onClose()
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
        aria-labelledby={titleId}
        aria-modal="true"
        className={`ed-dialog${wide ? ' ed-dialog--wide' : ''}`}
        ref={ref}
        role={role}
        tabIndex={-1}
      >
        <div className="ed-dialog__head">
          <div>
            <h2 id={titleId}>{title}</h2>
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
