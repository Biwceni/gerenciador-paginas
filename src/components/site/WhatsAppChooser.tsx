'use client'

import React, { useEffect, useId, useRef, useState } from 'react'

import { ContactIcon } from '@/puck/components/FeatureIcon'

type Choice = { name: string; href: string }

/**
 * D1: com mais de uma unidade com WhatsApp, o botão do canto pergunta com qual unidade falar. A
 * lista abre em cima do botão; fecha no Esc, tocando fora ou depois da escolha.
 */
export function WhatsAppChooser({
  choices,
  phone,
  desktop,
}: {
  choices: Choice[]
  phone: boolean
  desktop: boolean
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    panel.current?.querySelector('a')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <>
      <button
        aria-controls={id}
        aria-expanded={open}
        aria-label="Falar no WhatsApp: escolher a unidade"
        className="wa-float"
        data-desktop={desktop ? '' : undefined}
        data-phone-off={phone ? undefined : ''}
        onClick={() => setOpen((value) => !value)}
        ref={button}
        type="button"
      >
        <ContactIcon name="whatsapp" />
      </button>
      <div
        aria-labelledby={`${id}-title`}
        className="wa-choose"
        data-desktop={desktop ? '' : undefined}
        data-phone-off={phone ? undefined : ''}
        hidden={!open}
        id={id}
        ref={panel}
        role="dialog"
      >
        <p className="wa-choose__title" id={`${id}-title`}>
          Falar com qual unidade?
        </p>
        <ul>
          {choices.map((choice) => (
            <li key={choice.href + choice.name}>
              <a
                className="wa-choose__link"
                href={choice.href}
                onClick={() => setOpen(false)}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ContactIcon name="whatsapp" />
                {choice.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
